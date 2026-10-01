"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Desk() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [pub, setPub] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/enter");
        return;
      }
      setUser(data.session.user);
      let { data: p } = await supabase.from("solstice_profiles").select("*").eq("id", data.session.user.id).maybeSingle();
      if (!p) {
        const handle = (data.session.user.email || "desk").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
        const { data: made } = await supabase
          .from("solstice_profiles")
          .upsert({ id: data.session.user.id, handle, display_name: handle })
          .select()
          .single();
        p = made;
      }
      setProfile(p);
      const { data: mine } = await supabase
        .from("solstice_notes")
        .select("*")
        .eq("author_id", data.session.user.id)
        .order("created_at", { ascending: false });
      setNotes(mine || []);
    });
  }, [router]);

  async function save(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!user) return;
    const { data, error } = await supabase
      .from("solstice_notes")
      .insert({
        author_id: user.id,
        title: title.trim(),
        body: body.trim(),
        image_url: image.trim() || null,
        is_public: pub,
      })
      .select()
      .single();
    if (error) {
      setErr(error.message);
      return;
    }
    setNotes((n) => [data, ...n]);
    setTitle("");
    setBody("");
    setImage("");
    setOk(pub ? "Saved and visible on the wall." : "Saved in your drawer.");
  }

  async function toggle(note) {
    const { data, error } = await supabase
      .from("solstice_notes")
      .update({ is_public: !note.is_public, updated_at: new Date().toISOString() })
      .eq("id", note.id)
      .select()
      .single();
    if (!error && data) setNotes((ns) => ns.map((n) => (n.id === note.id ? data : n)));
  }

  async function remove(note) {
    await supabase.from("solstice_notes").delete().eq("id", note.id);
    setNotes((ns) => ns.filter((n) => n.id !== note.id));
  }

  async function leave() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!user) return <div className="wrap">Opening the drawer…</div>;

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="mark">{profile ? `@${profile.handle}` : "desk"}</div>
          <h1 className="wordmark">Your slips</h1>
        </div>
        <nav>
          <Link href="/">Front</Link>
          <Link href="/wall">Wall</Link>
          <button onClick={leave}>Leave</button>
        </nav>
      </header>

      <form className="slip" onSubmit={save} style={{ maxWidth: 640 }}>
        <input required maxLength={80} placeholder="Title of the slip" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea required maxLength={4000} placeholder="What belongs on the paper." value={body} onChange={(e) => setBody(e.target.value)} />
        <input placeholder="Optional image URL" value={image} onChange={(e) => setImage(e.target.value)} />
        <label className="row">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} />
          Mark public — it can be featured on the hour
        </label>
        <button className="primary">File the slip</button>
        {err ? <div className="err">{err}</div> : null}
        {ok ? <div className="ok">{ok}</div> : null}
      </form>

      <div className="grid">
        {notes.map((n) => (
          <article className="card" key={n.id}>
            <h3>{n.title}</h3>
            <p>{n.body}</p>
            <div className="foot">{n.is_public ? "public" : "drawer"} · {new Date(n.created_at).toLocaleString()}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="ghost" onClick={() => toggle(n)}>{n.is_public ? "Make private" : "Make public"}</button>
              <button className="ghost" onClick={() => remove(n)}>Burn</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

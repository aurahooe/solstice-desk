"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, hourKey, msUntilNextHour } from "../lib/supabase";

export default function Home() {
  const [session, setSession] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [notes, setNotes] = useState([]);
  const [now, setNow] = useState(new Date());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      const key = hourKey();
      const { data: hour } = await supabase
        .from("solstice_hours")
        .select("hour_key, caption, note_id, solstice_notes(id, title, body, image_url, created_at, author_id, solstice_profiles(handle, display_name))")
        .eq("hour_key", key)
        .maybeSingle();

      if (!hour?.note_id) {
        const { data: pubs } = await supabase
          .from("solstice_notes")
          .select("id, title, body, image_url, created_at, author_id, solstice_profiles(handle, display_name)")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(40);
        if (pubs?.length) {
          const idx = Math.abs(hash(key)) % pubs.length;
          const pick = pubs[idx];
          await supabase.from("solstice_hours").upsert({
            hour_key: key,
            note_id: pick.id,
            caption: "Chosen for this hour from the public desk.",
          });
          if (alive) setFeatured({ ...pick, caption: "Chosen for this hour from the public desk." });
        } else if (alive) setFeatured(null);
      } else if (alive) {
        setFeatured({ ...hour.solstice_notes, caption: hour.caption });
      }

      const { data: wall } = await supabase
        .from("solstice_notes")
        .select("id, title, body, image_url, created_at, solstice_profiles(handle, display_name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (alive) setNotes(wall || []);
    }
    load();
    const t = setInterval(load, 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [now.getUTCHours()]);

  useEffect(() => {
    const tick = setInterval(() => {
      const d = new Date();
      setNow(d);
      const elapsed = d.getUTCMinutes() * 60 + d.getUTCSeconds();
      setProgress((elapsed / 3600) * 100);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const clock = useMemo(() => {
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [now]);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="mark">Hourbook · EST. this desk</div>
          <h1 className="wordmark">Solstice Desk</h1>
        </div>
        <nav>
          <Link href="/wall">The wall</Link>
          {session ? <Link href="/desk">Your desk</Link> : <Link href="/enter">Enter</Link>}
        </nav>
      </header>

      <section className="hour-stage">
        <article className="featured">
          <div className="kicker">This hour</div>
          {featured ? (
            <>
              <h2>{featured.title}</h2>
              {featured.image_url ? <img className="thumb" src={featured.image_url} alt="" /> : null}
              <div className="bodycopy">{featured.body}</div>
              <div className="meta">
                {featured.solstice_profiles?.display_name || "anonymous"}
                {featured.solstice_profiles?.handle ? ` · @${featured.solstice_profiles.handle}` : ""}
                {featured.caption ? ` · ${featured.caption}` : ""}
              </div>
            </>
          ) : (
            <>
              <h2>The desk is still empty.</h2>
              <div className="bodycopy">
                Sign in, write a slip, and mark it public. On the next turn of the hour it can sit here for everyone.
              </div>
            </>
          )}
        </article>
        <aside className="side">
          <div className="mark">Local time</div>
          <div className="clock">{clock}</div>
          <div className="progress" aria-hidden>
            <i style={{ "--p": `${progress}%` }} />
          </div>
          <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            The featured slip changes at the top of every hour. Public writing is the only thing that can take the chair.
          </p>
          <p className="meta">Next rotation in {fmt(msUntilNextHour())}</p>
        </aside>
      </section>

      <section>
        <div className="mark" style={{ marginTop: 48 }}>Recently public</div>
        <div className="grid">
          {notes.map((n, i) => (
            <article className="card" key={n.id} style={{ animationDelay: `${i * 40}ms` }}>
              <h3>{n.title}</h3>
              <p>{n.body.slice(0, 160)}{n.body.length > 160 ? "…" : ""}</p>
              <div className="foot">
                {n.solstice_profiles?.handle ? `@${n.solstice_profiles.handle}` : "unsigned"} ·{" "}
                {new Date(n.created_at).toLocaleString()}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

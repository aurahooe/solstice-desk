"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Enter() {
  const router = useRouter();
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/desk");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const h = (handle || email.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24);
          await supabase.from("solstice_profiles").upsert({
            id: data.user.id,
            handle: h || `desk${data.user.id.slice(0, 6)}`,
            display_name: name || h || "unnamed",
          });
        }
        if (data.session) router.push("/desk");
        else setMsg("Check your inbox to confirm the address, then come back in.");
      }
    } catch (ex) {
      setErr(ex.message || "Could not enter.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="mark">Door</div>
          <h1 className="wordmark">Enter the desk</h1>
        </div>
        <nav>
          <Link href="/">Front</Link>
        </nav>
      </header>
      <p style={{ maxWidth: 520, lineHeight: 1.6, color: "var(--muted)" }}>
        Keep a private drawer. Mark a slip public and it can sit on the hour for anyone walking past.
      </p>
      <div className="row" style={{ marginTop: 18 }}>
        <button className="ghost" onClick={() => setMode("in")}>Sign in</button>
        <button className="ghost" onClick={() => setMode("up")}>Open a desk</button>
      </div>
      <form className="slip" onSubmit={submit} style={{ maxWidth: 420 }}>
        <input type="email" required placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required minLength={6} placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === "up" && (
          <>
            <input placeholder="handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
            <input placeholder="display name" value={name} onChange={(e) => setName(e.target.value)} />
          </>
        )}
        <button className="primary" disabled={busy}>{busy ? "Working…" : mode === "in" ? "Come in" : "Make the desk"}</button>
        {err ? <div className="err">{err}</div> : null}
        {msg ? <div className="ok">{msg}</div> : null}
      </form>
    </div>
  );
}

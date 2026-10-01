"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Wall() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    supabase
      .from("solstice_notes")
      .select("id, title, body, image_url, created_at, solstice_profiles(handle, display_name)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setNotes(data || []));
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="mark">Public paper</div>
          <h1 className="wordmark">The wall</h1>
        </div>
        <nav>
          <Link href="/">Front</Link>
          <Link href="/enter">Enter</Link>
        </nav>
      </header>
      <div className="grid">
        {notes.map((n, i) => (
          <article className="card" key={n.id} style={{ animationDelay: `${i * 30}ms` }}>
            {n.image_url ? <img className="thumb" src={n.image_url} alt="" /> : null}
            <h3>{n.title}</h3>
            <p>{n.body}</p>
            <div className="foot">
              {n.solstice_profiles?.display_name || "anonymous"}
              {n.solstice_profiles?.handle ? ` · @${n.solstice_profiles.handle}` : ""}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

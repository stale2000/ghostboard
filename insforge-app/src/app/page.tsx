"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createRoom } from "../lib/boardgame/client";

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("GhostBoard Shared Table");
  const [displayName, setDisplayName] = useState("Host");
  const [joinTarget, setJoinTarget] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRoom() {
    setError(null);
    setStatus("Creating room…");

    try {
      const identity = await createRoom({
        title: title.trim() || "GhostBoard Shared Table",
        hostName: displayName.trim() || "Host"
      });

      router.push(`/table?room=${encodeURIComponent(identity.roomId)}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "GhostBoard could not create a room.");
      setStatus(null);
    }
  }

  function handleJoinRoom() {
    setError(null);
    const value = joinTarget.trim();
    if (!value) {
      setError("Paste a room URL or room ID.");
      return;
    }

    try {
      const normalized = value.includes("room=")
        ? new URL(value, "https://ghostboard.local").searchParams.get("room") ?? value
        : value.includes("/")
          ? value.split("/").filter(Boolean).at(-1) ?? value
          : value;
      router.push(`/table?room=${encodeURIComponent(normalized)}`);
    } catch {
      setError("That room link could not be parsed.");
    }
  }

  return (
    <main
      style={{
        alignItems: "center",
        background:
          "radial-gradient(circle at top, rgba(34, 211, 238, 0.18) 0%, rgba(34, 211, 238, 0) 24%), radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.20) 0%, rgba(168, 85, 247, 0) 25%), linear-gradient(180deg, #020617 0%, #0f172a 48%, #111827 100%)",
        color: "#e2e8f0",
        display: "grid",
        minHeight: "100vh",
        padding: 24
      }}
    >
      <div style={{ display: "grid", gap: 24, maxWidth: 720, width: "100%" }}>
        <section
          style={{
            background: "rgba(15, 23, 42, 0.94)",
            border: "1px solid rgba(125, 211, 252, 0.22)",
            borderRadius: 28,
            boxShadow: "0 18px 44px rgba(2, 6, 23, 0.45)",
            padding: 24
          }}
        >
          <p style={{ color: "#7dd3fc", fontSize: 12, fontWeight: 700, letterSpacing: "0.24em", margin: 0, textTransform: "uppercase" }}>
            GhostBoard Rooms
          </p>
          <h1 style={{ fontSize: 36, marginBottom: 10, marginTop: 10 }}>Create a shared tabletop room</h1>
          <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.6 }}>
            Start a room, share its URL, and every connected browser will see synchronized image, calibration, and piece changes through boardgame.io multiplayer state.
          </p>
        </section>

        <section
          style={{
            background: "rgba(15, 23, 42, 0.94)",
            border: "1px solid rgba(125, 211, 252, 0.22)",
            borderRadius: 28,
            boxShadow: "0 18px 44px rgba(2, 6, 23, 0.45)",
            display: "grid",
            gap: 16,
            padding: 24
          }}
        >
          <h2 style={{ margin: 0 }}>Create room</h2>
          <label style={{ display: "grid", gap: 8 }}>
            <span>Room title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} style={{ borderRadius: 14, padding: 12 }} />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span>Your display name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} style={{ borderRadius: 14, padding: 12 }} />
          </label>
          <button
            onClick={() => {
              void handleCreateRoom();
            }}
            style={{ background: "linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)", border: "none", borderRadius: 14, color: "#020617", cursor: "pointer", fontSize: 16, fontWeight: 800, padding: "14px 18px" }}
            type="button"
          >
            Create and open room
          </button>
        </section>

        <section
          style={{
            background: "rgba(15, 23, 42, 0.94)",
            border: "1px solid rgba(125, 211, 252, 0.22)",
            borderRadius: 28,
            boxShadow: "0 18px 44px rgba(2, 6, 23, 0.45)",
            display: "grid",
            gap: 16,
            padding: 24
          }}
        >
          <h2 style={{ margin: 0 }}>Join room</h2>
          <label style={{ display: "grid", gap: 8 }}>
            <span>Room URL or ID</span>
            <input value={joinTarget} onChange={(event) => setJoinTarget(event.target.value)} placeholder="/table/abc123 or abc123" style={{ borderRadius: 14, padding: 12 }} />
          </label>
          <button
            onClick={handleJoinRoom}
            style={{ background: "#0f172a", border: "1px solid rgba(125, 211, 252, 0.28)", borderRadius: 14, color: "#f8fafc", cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "14px 18px" }}
            type="button"
          >
            Open shared room
          </button>
          {status ? <p style={{ color: "#a5f3fc", margin: 0 }}>{status}</p> : null}
          {error ? <p style={{ color: "#fca5a5", margin: 0 }}>{error}</p> : null}
        </section>
      </div>
    </main>
  );
}

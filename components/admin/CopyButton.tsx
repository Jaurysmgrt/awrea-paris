"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? "Copié" : label}
    </button>
  );
}

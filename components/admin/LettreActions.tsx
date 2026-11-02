"use client";
/**
 * Gestes de la lettre (Atelier › E-mails › La lettre) : un essai à votre adresse, puis l'envoi à
 * toutes les inscrites, après confirmation. Le nombre d'inscrites voyage avec l'envoi : s'il a
 * changé entre-temps, rien ne part (lib/email/lettre.ts).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

export function LettreActions({ nombre, prete }: { nombre: number; prete: boolean }) {
  const router = useRouter();
  const atelier = useAtelier();
  const [busy, setBusy] = useState<"essai" | "envoi" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const envoyer = async (action: "essai" | "envoi") => {
    if (action === "envoi" && !window.confirm(`Envoyer la lettre à ${nombre} inscrite${nombre > 1 ? "s" : ""} ? Elle ne pourra pas être rappelée.`)) return;
    setBusy(action);
    setMessage(null);
    const res = await fetch(atelier.api("/lettre"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "essai" ? { action } : { action, nombre }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    setMessage({ ok: Boolean(res?.ok), texte: res?.ok ? json.message : (json.error ?? "L’envoi n’a pas abouti.") });
    router.refresh();
  };
  return (
    <div className="lettre__actions">
      <button type="button" className="btn btn--outline" disabled={busy !== null} onClick={() => envoyer("essai")}>
        {busy === "essai" ? "Envoi de l’essai…" : "M’envoyer un essai"}
      </button>
      <button type="button" className="btn" disabled={busy !== null || !prete || !nombre} onClick={() => envoyer("envoi")}>
        {busy === "envoi" ? "Envoi en cours…" : `Envoyer à ${nombre} inscrite${nombre > 1 ? "s" : ""}`}
      </button>
      {message ? (
        <p className={message.ok ? "t-note t-left" : "field__error"} role={message.ok ? "status" : "alert"}>
          {message.texte}
        </p>
      ) : null}
    </div>
  );
}

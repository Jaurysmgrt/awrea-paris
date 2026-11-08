"use client";
/**
 * Effacer le compte d'une cliente à sa demande (RGPD) : la créatrice recopie l'adresse e-mail de la
 * cliente, puis confirme. Les commandes restent, détachées du compte. Le résultat s'affiche en mots
 * simples ; une fois le compte effacé, la page revient à la liste des clientes.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

export function EffacerCliente({ id }: { id: string }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function effacer(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("Effacer définitivement le compte de cette cliente ? Ce geste ne se défait pas.")) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(atelier.api(`/clientes/${encodeURIComponent(id)}/effacer`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setMessage({ ok: false, texte: j.error ?? "L’effacement n’a pas abouti. Merci de réessayer." });
      return;
    }
    setMessage({ ok: true, texte: "Le compte est effacé. Ses commandes restent, sans lien avec elle." });
    router.push(atelier.href("/clientes"));
  }

  return (
    <form className="stack-s" onSubmit={effacer}>
      <div className="field">
        <label className="field__label" htmlFor="effacer-email">
          Pour confirmer, recopiez son adresse e-mail
        </label>
        <input id="effacer-email" type="email" className="field__input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <button type="submit" className="btn btn--outline" disabled={busy || !email.trim()}>
          {busy ? "Un instant…" : "Effacer son compte"}
        </button>
      </div>
      <p className="t-note" role="status">
        {message?.ok ? message.texte : ""}
      </p>
      <p className="field__error" role="alert">
        {message && !message.ok ? message.texte : ""}
      </p>
    </form>
  );
}

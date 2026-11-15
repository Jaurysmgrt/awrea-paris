"use client";
/**
 * Sous l'adresse e-mail de la commande, quand l'adresse n'est pas prouvée dans ce navigateur : la
 * cliente qui a confirmé son inscription sur un autre appareil demande un lien qui y applique son
 * privilège de bienvenue (app/api/checkout/privilege/appareil). Proposé pour toute adresse, avec la
 * même réponse pour toutes : rien n'y dit si l'adresse est inscrite ou a un privilège.
 */
import { useState } from "react";

export interface PrivilegeAppareilTexts {
  question: string;
  bouton: string;
  envoi: string;
  envoye: string;
  erreur: string;
}

export function PrivilegeAppareil({ email, langue, t }: { email: string; langue: "fr" | "en"; t: PrivilegeAppareilTexts }) {
  const [etat, setEtat] = useState<{ email: string; nom: "envoi" | "envoye" | "erreur" } | null>(null);
  // une autre adresse saisie : la demande se refait
  const actuel = etat?.email === email ? etat.nom : "repos";

  async function demander() {
    if (actuel === "envoi") return;
    setEtat({ email, nom: "envoi" });
    const r = await fetch("/api/checkout/privilege/appareil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, langue }) }).catch(() => null);
    setEtat({ email, nom: r?.ok ? "envoye" : "erreur" });
  }

  return (
    <div className="stack-s">
      {actuel === "envoye" ? (
        <p className="t-note t-left" role="status">
          {t.envoye}
        </p>
      ) : (
        <>
          <p className="t-note t-left">{t.question}</p>
          <div>
            <button type="button" className="btn btn--link" onClick={() => void demander()} aria-disabled={actuel === "envoi" || undefined}>
              {actuel === "envoi" ? t.envoi : t.bouton}
            </button>
          </div>
        </>
      )}
      {actuel === "erreur" ? (
        <p className="field__error" role="alert">
          {t.erreur}
        </p>
      ) : null}
    </div>
  );
}

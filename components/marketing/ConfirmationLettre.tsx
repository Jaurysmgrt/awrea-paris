"use client";
/**
 * Page d'un lien envoyé par la Maison (/lettres/confirmation) : confirmation de l'inscription à la
 * lettre, ou privilège de bienvenue demandé sur un autre appareil. Rien ne se fait au chargement (les
 * antivirus des messageries ouvrent les liens à la place des personnes) : la personne appuie sur le
 * bouton, puis la page dit jusqu'à quand le privilège attend et où il s'applique. Textes : document
 * « privilege » (confirmation).
 */
import { useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatDate } from "@/lib/format";
import { fill } from "@/lib/edition/fill";
import { noterInscription } from "./memoire-privilege";

type Texts = typeof import("@/content/site/fr/privilege.json")["confirmation"];
type Etat = { nom: "pret" } | { nom: "attente" } | { nom: "confirmee"; expireLe: string | null } | { nom: "invalide" } | { nom: "erreur" };

export function ConfirmationLettre({ jeton, type, t }: { jeton: string; type: "lettre" | "appareil"; t: Texts }) {
  const locale = useLocale();
  const [etat, setEtat] = useState<Etat>({ nom: "pret" });
  const titre = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const appareil = type === "appareil";
  const ta = t.appareil;

  async function envoyer() {
    if (etat.nom === "attente") return;
    setEtat({ nom: "attente" });
    const res = await fetch("/api/newsletter/confirmation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton }) }).catch(() => null);
    const j: { ok?: boolean; error?: string; privilege?: { expireLe: string } | null } = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && j.ok) {
      noterInscription();
      setEtat({ nom: "confirmee", expireLe: j.privilege?.expireLe ?? null });
    } else setEtat({ nom: j.error === "invalide" ? "invalide" : "erreur" });
    requestAnimationFrame(() => titre.current?.focus());
  }

  if (etat.nom === "pret" || etat.nom === "attente")
    return (
      <div className="stack-m">
        <p className="t-lead t-left">{appareil ? ta.avant : t.avant}</p>
        <div>
          <button type="button" className="btn" onClick={() => void envoyer()} aria-disabled={etat.nom === "attente" || undefined}>
            {etat.nom === "attente" ? (appareil ? ta.attente : t.attente) : appareil ? ta.bouton : t.confirmer}
          </button>
        </div>
      </div>
    );
  if (etat.nom === "invalide") {
    const ti = appareil ? ta.invalide : t.invalide;
    return (
      <div className="stack-m" role="status">
        <h2 ref={titre} tabIndex={-1} className="t-h3">
          {ti.titre}
        </h2>
        <p className="t-body">{ti.texte}</p>
      </div>
    );
  }
  if (etat.nom === "erreur")
    return (
      <div className="stack-m">
        <p ref={titre} tabIndex={-1} className="t-body" role="alert">
          {t.erreur}
        </p>
        <div>
          <button type="button" className="btn" onClick={() => void envoyer()}>
            {t.reessayer}
          </button>
        </div>
      </div>
    );
  return (
    <div className="stack-m" role="status">
      <h2 ref={titre} tabIndex={-1} className="t-h3">
        {appareil ? ta.titre : t.titre}
      </h2>
      {etat.expireLe ? <p className="t-body">{fill(appareil ? ta.privilege : t.privilege, { date: formatDate(etat.expireLe, locale) })}</p> : null}
      {appareil ? null : <p className="t-body">{t.texte}</p>}
      <div>
        <Link href={appareil ? ta.retour.href : t.bouton.href} className="btn">
          {appareil ? ta.retour.label : t.bouton.label}
        </Link>
      </div>
    </div>
  );
}

"use client";
/**
 * Confirmation de l'inscription à la lettre, ouverte depuis l'e-mail : la page confirme d'elle-même
 * dans le navigateur (un robot qui suit les liens sans exécuter la page ne confirme rien), puis dit
 * jusqu'à quand le privilège de bienvenue attend. Textes : document « privilege » (confirmation).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatDate } from "@/lib/format";
import { fill } from "@/lib/edition/fill";
import { noterInscription } from "./memoire-privilege";

type Texts = typeof import("@/content/site/fr/privilege.json")["confirmation"];
type Etat = { nom: "attente" } | { nom: "confirmee"; expireLe: string | null } | { nom: "invalide" } | { nom: "erreur" };

export function ConfirmationLettre({ jeton, t }: { jeton: string; t: Texts }) {
  const locale = useLocale();
  const [etat, setEtat] = useState<Etat>({ nom: "attente" });
  const titre = useRef<HTMLHeadingElement>(null);
  const essai = useRef(0);

  const envoyer = useCallback(async () => {
    const res = await fetch("/api/newsletter/confirmation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton }) }).catch(() => null);
    const j: { ok?: boolean; error?: string; privilege?: { expireLe: string } | null } = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && j.ok) {
      noterInscription();
      setEtat({ nom: "confirmee", expireLe: j.privilege?.expireLe ?? null });
    } else setEtat({ nom: j.error === "invalide" ? "invalide" : "erreur" });
    requestAnimationFrame(() => titre.current?.focus());
  }, [jeton]);

  // une seule confirmation au chargement (même en double montage) ; « Réessayer » relance ensuite
  useEffect(() => {
    if (essai.current++) return;
    void envoyer();
  }, [envoyer]);

  const confirmer = () => {
    setEtat({ nom: "attente" });
    void envoyer();
  };

  if (etat.nom === "attente")
    return (
      <p className="t-lead" role="status">
        {t.attente}
      </p>
    );
  if (etat.nom === "invalide")
    return (
      <div className="stack-m" role="status">
        <h2 ref={titre} tabIndex={-1} className="t-h3">
          {t.invalide.titre}
        </h2>
        <p className="t-body">{t.invalide.texte}</p>
      </div>
    );
  if (etat.nom === "erreur")
    return (
      <div className="stack-m">
        <p ref={titre} tabIndex={-1} className="t-body" role="alert">
          {t.erreur}
        </p>
        <div>
          <button type="button" className="btn" onClick={() => void confirmer()}>
            {t.reessayer}
          </button>
        </div>
      </div>
    );
  return (
    <div className="stack-m" role="status">
      <h2 ref={titre} tabIndex={-1} className="t-h3">
        {t.titre}
      </h2>
      {etat.expireLe ? <p className="t-body">{fill(t.privilege, { date: formatDate(etat.expireLe, locale) })}</p> : null}
      <p className="t-body">{t.texte}</p>
      <div>
        <Link href={t.bouton.href} className="btn">
          {t.bouton.label}
        </Link>
      </div>
    </div>
  );
}

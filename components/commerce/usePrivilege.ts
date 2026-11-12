"use client";
/**
 * Récapitulatif de paiement : le privilège de bienvenue de l'adresse e-mail saisie (ou de la cliente
 * connectée), pour le panier en cours. Le serveur décide (app/api/checkout/privilege) et la commande
 * refait le calcul elle-même : la ligne affichée est celle qui sera réellement retirée. Une adresse
 * changée ou un panier modifié effacent aussitôt l'ancienne réponse.
 */
import { useEffect, useState } from "react";

export interface PrivilegeAffiche {
  piece: string;
  /** centimes retirés */
  montant: number;
}

const plausible = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function usePrivilege(emailConnu: string | undefined, panier: string) {
  const [saisi, setSaisi] = useState<string | null>(null);
  const [essai, setEssai] = useState(0);
  const [reponse, setReponse] = useState<{ cle: string; remise: PrivilegeAffiche | null; nonCumulable: boolean } | null>(null);
  const email = (saisi ?? emailConnu ?? "").trim().toLowerCase();
  const cle = `${email}|${panier}`;

  useEffect(() => {
    if (!panier || !plausible(email)) return;
    const ctrl = new AbortController();
    // pendant la saisie : une seule lecture, un instant après la dernière lettre
    const minuterie = window.setTimeout(() => {
      fetch("/api/checkout/privilege", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), signal: ctrl.signal })
        .then((r) => r.json())
        .then((j: { remise?: PrivilegeAffiche | null; nonCumulable?: boolean }) => setReponse({ cle: `${email}|${panier}`, remise: j.remise ?? null, nonCumulable: Boolean(j.nonCumulable) }))
        .catch(() => {});
    }, 350);
    return () => {
      window.clearTimeout(minuterie);
      ctrl.abort();
    };
  }, [email, panier, essai]);

  const actuelle = reponse?.cle === cle && plausible(email) ? reponse : null;
  return {
    remise: actuelle?.remise ?? null,
    nonCumulable: actuelle?.nonCumulable ?? false,
    /** adresse saisie (lue un instant après la dernière lettre) */
    saisir: (v: string) => setSaisi(v),
    /** la commande a refusé le privilège (déjà utilisé, engagé ailleurs) : nouvelle lecture */
    reverifier: () => setEssai((n) => n + 1),
  };
}

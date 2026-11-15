/**
 * Souvenir de la fenêtre « Profitez de votre privilège », dans le stockage local du navigateur
 * (« awrea_privilege », cookie nécessaire de content/fr/cookies.ts) : la date du dernier affichage, et
 * l'inscription faite depuis ce navigateur. Aucune adresse, aucune donnée personnelle.
 * Module pur pour la règle (testée), et deux accès au stockage qui ne lèvent jamais.
 */
export const CLE_PRIVILEGE = "awrea_privilege";
/** au plus une fois tous les 30 jours après une fermeture */
export const JOURS_ENTRE_AFFICHAGES = 30;

export interface MemoirePrivilege {
  /** dernier affichage (fermé ou laissé) */
  vu?: string;
  /** inscription faite depuis ce navigateur : la fenêtre ne revient plus */
  inscrite?: boolean;
}

/** Pages où la fenêtre ne paraît jamais : panier, paiement, compte, confirmation, suivi, lettres. */
const EXCLUES = [/^\/commande(\/|$)/, /^\/panier(\/|$)/, /^\/compte(\/|$)/, /^\/suivi(\/|$)/, /^\/lettres(\/|$)/, /^\/liste-envies(\/|$)/, /^\/avis(\/|$)/, /^\/certificat(\/|$)/];

export const pageExclue = (chemin: string) => EXCLUES.some((r) => r.test(chemin));

/** La fenêtre peut-elle paraître ? Jamais pour une inscrite, au plus une fois tous les 30 jours. */
export function peutAfficher(m: MemoirePrivilege | null, maintenant: number): boolean {
  if (!m) return true;
  if (m.inscrite) return false;
  const vu = m.vu ? Date.parse(m.vu) : NaN;
  return !Number.isFinite(vu) || maintenant - vu >= JOURS_ENTRE_AFFICHAGES * 86_400_000;
}

export function lireMemoire(): MemoirePrivilege | null {
  try {
    const raw = localStorage.getItem(CLE_PRIVILEGE);
    return raw ? (JSON.parse(raw) as MemoirePrivilege) : null;
  } catch {
    return null;
  }
}

export function ecrireMemoire(m: MemoirePrivilege) {
  try {
    localStorage.setItem(CLE_PRIVILEGE, JSON.stringify({ ...(lireMemoire() ?? {}), ...m }));
  } catch {
    /* stockage indisponible : la fenêtre pourra revenir, sans plus */
  }
}

/** Inscription faite depuis ce navigateur (fenêtre, pied de page, lien de confirmation). */
export const noterInscription = () => ecrireMemoire({ inscrite: true, vu: new Date().toISOString() });

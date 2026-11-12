/**
 * Privilège de bienvenue : son état par adresse, sous verrou (règles : lib/privilege/regles.ts).
 *
 * Stockage technique : une clé par adresse, nommée par l'empreinte de l'adresse normalisée (jamais
 * l'adresse en clair). Elle reste après un effacement de la fiche : sans donnée personnelle, elle
 * empêche seulement qu'un même privilège soit ouvert deux fois pour la même adresse.
 *
 * Chemin d'une commande : `privilegePourPanier` (récapitulatif et calcul de la commande) →
 * `reserverPrivilege` (ouverture du paiement : une seule commande à la fois, l'ancienne page de
 * paiement est fermée chez Stripe si besoin) → `consommerPrivilege` (paiement réussi, idempotent) ou
 * `libererPrivilege` (paiement expiré, refusé, page non ouverte).
 */
import "server-only";
import { createHash } from "node:crypto";
import { kv } from "@/lib/store";
import { avecVerrou } from "@/lib/store/verrou";
import { getOrder, getOrders } from "@/lib/commerce/orders";
import type { Order } from "@/lib/commerce/types";
import { estVente, normaliserEmail, noterEvenement } from "@/lib/crm";
import { commandeEncorePayable, consommer, decisionReservation, eligibilite, liberer, ouvrir, remisePrivilege, reserver, type EtatPrivilege, type LignePrivilege, type RaisonRefus, type RemisePrivilege } from "./regles";

export * from "./regles";

const empreinte = (email: string) => createHash("sha256").update(`privilege:${normaliserEmail(email)}`).digest("hex").slice(0, 40);
const cle = (email: string) => `privilege:${empreinte(email)}`;
const verrou = (email: string) => `privilege:${empreinte(email)}`;

export async function lirePrivilege(email: string): Promise<EtatPrivilege | null> {
  return kv.get<EtatPrivilege>(cle(email));
}

/** L'adresse a-t-elle déjà une commande payée (avec ou sans compte) ? */
export async function dejaCliente(email: string, sauf?: string): Promise<boolean> {
  const e = normaliserEmail(email);
  return (await getOrders()).some((o) => o.id !== sauf && estVente(o.status) && normaliserEmail(o.email) === e);
}

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/**
 * Clic dans l'e-mail de confirmation : ouvre le privilège pour 14 jours, une seule fois par adresse,
 * et seulement avant une première commande. Renvoie l'état (ouvert maintenant ou déjà) ou null.
 */
export async function ouvrirPrivilege(email: string, maintenant = new Date()): Promise<EtatPrivilege | null> {
  if (await dejaCliente(email)) return null;
  let ouvertMaintenant = false;
  const etat = await avecVerrou(verrou(email), async () => {
    const avant = await lirePrivilege(email);
    if (avant) return avant;
    const p = ouvrir(maintenant);
    await kv.set(cle(email), p);
    ouvertMaintenant = true;
    return p;
  });
  if (ouvertMaintenant) await noterEvenement(email, "privilege", `Privilège de bienvenue ouvert jusqu’au ${dateLongue(etat.expireLe)}`).catch((e) => console.error("[privilège] fiche", e));
  return etat;
}

/**
 * Remise du privilège pour ce panier et cette adresse, ou la raison de son absence. `code` : un autre
 * code est appliqué (pas de cumul).
 */
export async function privilegePourPanier(email: string, lignes: readonly LignePrivilege[], o: { code: boolean; maintenant?: Date }): Promise<{ remise: RemisePrivilege | null; raison?: RaisonRefus }> {
  const p = await lirePrivilege(email);
  if (!p) return { remise: null, raison: "aucun" };
  const ok = eligibilite(p, { maintenant: o.maintenant ?? new Date(), dejaCliente: await dejaCliente(email), code: o.code });
  if (!ok.ok) return { remise: null, raison: ok.raison };
  return { remise: remisePrivilege(lignes) };
}

export type RefusReservation = "aucun" | "utilise" | "expire" | "occupe";

/**
 * Réserve le privilège pour la commande dont le paiement s'ouvre. Si une autre commande le tient :
 * libre si elle ne peut plus payer ; si sa page de paiement est encore ouverte, `fermerAutre` la ferme
 * chez Stripe (aucun paiement ne peut plus y passer) avant de reprendre le privilège ; sinon refus.
 */
export async function reserverPrivilege(email: string, commande: string, fermerAutre: (o: Order) => Promise<boolean>, maintenant = new Date()): Promise<{ ok: true } | { ok: false; raison: RefusReservation }> {
  return avecVerrou(verrou(email), async () => {
    const p = await lirePrivilege(email);
    if (!p) return { ok: false, raison: "aucun" } as const;
    const d = decisionReservation(p, commande, maintenant);
    if (d.action === "deja") return { ok: true } as const;
    if (d.action === "refuser") return { ok: false, raison: d.raison } as const;
    if (d.action === "autre") {
      const autre = await getOrder(d.commande).catch(() => null);
      const etat = commandeEncorePayable(autre, maintenant);
      if (etat === "payee") return { ok: false, raison: "utilise" } as const;
      if (etat === "payable" && !(autre && (await Promise.race([fermerAutre(autre).catch(() => false), new Promise<boolean>((r) => setTimeout(() => r(false), 8000))])))) return { ok: false, raison: "occupe" } as const;
    }
    await kv.set(cle(email), reserver(p, commande, maintenant));
    return { ok: true } as const;
  });
}

/** Paiement expiré, refusé ou jamais ouvert : la réservation de cette commande se libère. */
export async function libererPrivilege(email: string, commande: string): Promise<void> {
  await avecVerrou(verrou(email), async () => {
    const p = await lirePrivilege(email);
    if (!p) return;
    const q = liberer(p, commande);
    if (q !== p) await kv.set(cle(email), q);
  });
}

/**
 * Paiement réussi d'une commande au privilège : il est utilisé, pour toujours. Idempotent (webhook
 * rejoué, retour de la cliente, finalisation reprise). Renvoie `conflit` si une autre commande l'avait
 * déjà utilisé : la créatrice doit le savoir.
 */
export async function consommerPrivilege(email: string, commande: string, numero: string, maintenant = new Date()): Promise<{ conflit: boolean }> {
  let change = false;
  const r = await avecVerrou(verrou(email), async () => {
    // privilège absent (stockage perdu) : il est inscrit utilisé, la remise a été accordée
    const p = (await lirePrivilege(email)) ?? ouvrir(maintenant);
    const c = consommer(p, commande, maintenant);
    if (c.change) await kv.set(cle(email), c.etat);
    change = c.change;
    return c;
  });
  if (change) await noterEvenement(email, "privilege", `Privilège de bienvenue utilisé pour la commande ${numero}`).catch((e) => console.error("[privilège] fiche", e));
  return { conflit: r.conflit };
}

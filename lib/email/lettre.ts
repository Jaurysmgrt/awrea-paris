/**
 * La lettre de la Maison, écrite et envoyée par la créatrice depuis l'Atelier › E-mails (demande du
 * 02/11 : « écrire et envoyer la lettre, voir les inscrites, voir les e-mails envoyés »).
 *
 * La lettre est le document « email-lettre » : elle s'écrit dans l'éditeur des e-mails (blocs,
 * aperçu, brouillon, publication), puis part à toutes les inscrites, chacune avec son lien de
 * désinscription (lib/email/documents.ts). Garde-fous : une lettre encore entre crochets ne part
 * pas ; une même version ne part qu'une fois ; l'envoi demande le nombre exact d'inscrites, affiché
 * sur le bouton (un clic de trop ne suffit pas). Aucun agent ne passe par ici : l'envoi à toute la
 * liste reste la décision de la créatrice (lib/agents/policy.ts).
 */
import "server-only";
import { kv } from "@/lib/store";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { emailDoc, sendDocEmail } from "@/lib/email/documents";
import { historyOf } from "@/lib/edition/store";
import { todos } from "@/lib/edition/blocks";
import type { Inscrite } from "./lettre-csv";

export { inscritesCsv, type Inscrite } from "./lettre-csv";

export const LETTRE_DOC = "email-lettre";
const ENVOIS_KEY = "lettre:envois";

export interface EnvoiLettre {
  at: string;
  sujet: string;
  nombre: number;
  versionId: string;
  by: string;
}

/** Inscrites à la lettre : la liste de la Maison, et les clientes qui l'ont acceptée dans leur compte. */
export async function inscrites(): Promise<Inscrite[]> {
  const list = (await kv.get<{ email: string; date?: string; source?: string; prenom?: string; nom?: string }[]>("newsletter:subscribers").catch(() => null)) ?? [];
  const parEmail = new Map<string, Inscrite>();
  for (const s of list) {
    const email = s.email.trim().toLowerCase();
    if (email.includes("@") && !parEmail.has(email)) parEmail.set(email, { email, date: s.date ?? null, source: s.source ?? "lettre", prenom: s.prenom, nom: s.nom });
  }
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("customers").select("email, first_name, last_name, created_at").eq("marketing_email", true).limit(20_000);
    for (const c of (data ?? []) as { email: string | null; first_name: string | null; last_name: string | null; created_at: string | null }[]) {
      const email = c.email?.trim().toLowerCase();
      if (email?.includes("@") && !parEmail.has(email)) parEmail.set(email, { email, date: c.created_at, source: "compte", prenom: c.first_name ?? undefined, nom: c.last_name ?? undefined });
    }
  }
  return [...parEmail.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export async function envoisLettre(): Promise<EnvoiLettre[]> {
  return (await kv.get<EnvoiLettre[]>(ENVOIS_KEY).catch(() => null)) ?? [];
}

/** État de la lettre publiée : prête à partir, ou pourquoi elle ne l'est pas. */
export async function etatLettre(): Promise<{ sujet: string; versionId: string; prete: boolean; raison?: string }> {
  const [doc, history, envois] = await Promise.all([emailDoc(LETTRE_DOC, "fr"), historyOf(LETTRE_DOC, "fr"), envoisLettre()]);
  const versionId = history[0]?.id ?? "v-depot";
  if (!doc) return { sujet: "", versionId, prete: false, raison: "La lettre n’existe pas encore." };
  if (todos({ sujet: doc.sujet, blocs: doc.blocs }).length) return { sujet: doc.sujet, versionId, prete: false, raison: "La lettre a encore des textes entre crochets : écrivez-la puis publiez-la." };
  if (envois.some((e) => e.versionId === versionId)) return { sujet: doc.sujet, versionId, prete: false, raison: "Cette lettre est déjà partie. Modifiez-la et publiez-la pour en envoyer une nouvelle." };
  return { sujet: doc.sujet, versionId, prete: true };
}

const prenomDe = (i: Pick<Inscrite, "prenom">) => i.prenom?.trim().split(/\s+/)[0] ?? "";

/** Un essai, à l'adresse de la créatrice connectée (même lettre, même lien de désinscription). */
export async function essaiLettre(to: string) {
  await sendDocEmail(LETTRE_DOC, to, { vars: { prenom: "" }, tag: "lettre-essai" });
}

/**
 * Envoi à toutes les inscrites. `confirme` : le nombre d'inscrites affiché sur le bouton ; s'il ne
 * correspond plus (une inscription entre-temps), rien ne part et le bouton se met à jour.
 */
export async function envoyerLettre(confirme: number, by: string): Promise<EnvoiLettre> {
  const etat = await etatLettre();
  if (!etat.prete) throw new Error(etat.raison);
  const liste = await inscrites();
  if (!liste.length) throw new Error("Personne n’est encore inscrite.");
  if (confirme !== liste.length) throw new Error(`La liste compte maintenant ${liste.length} inscrites : vérifiez puis envoyez de nouveau.`);
  // la version est réservée avant l'envoi : un second clic ne la renvoie pas
  const envoi: EnvoiLettre = { at: new Date().toISOString(), sujet: etat.sujet, nombre: 0, versionId: etat.versionId, by };
  const avant = await envoisLettre();
  await kv.set(ENVOIS_KEY, [envoi, ...avant].slice(0, 100));
  let nombre = 0;
  for (const i of liste) {
    try {
      await sendDocEmail(LETTRE_DOC, i.email, { vars: { prenom: prenomDe(i) }, tag: "lettre" });
      nombre++;
    } catch (e) {
      console.error("[lettre]", i.email.replace(/^(.).*@/, "$1…@"), e instanceof Error ? e.message : e);
    }
  }
  const fait = { ...envoi, nombre };
  await kv.set(ENVOIS_KEY, [fait, ...avant].slice(0, 100));
  return fait;
}

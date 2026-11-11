/**
 * E-mails des parcours : des e-mails de la lettre (famille « lettre »), modifiables dans l'Atelier
 * › E-mails comme tous les autres (blocs, aperçu, brouillon, publication). La famille « lettre »
 * garantit le lien de désinscription dans chaque message et l'en-tête de désinscription en un clic
 * (lib/email/documents.ts, sendDocEmail). Les e-mails de commande et de rendez-vous, strictement
 * nécessaires, ne servent jamais dans un parcours.
 *
 * Un e-mail est prêt quand il est publié et n'a plus de texte entre crochets ; sinon l'étape attend.
 */
import "server-only";
import { documentInfo, registerEmail, slugOf } from "@/lib/edition/documents";
import { draftOf, isDocId, publishedDoc, saveDraftContent } from "@/lib/edition/store";
import { newBlockId, todos } from "@/lib/edition/blocks";
import { emailDoc, emailIds, sendDocEmail } from "@/lib/email/documents";
import { LETTRE_DOC } from "@/lib/email/lettre";
import type { EmailDoc } from "@/lib/email/blocks";
import type { EmailEtat } from "./moteur";

export const PREFIXE = "email-parcours-";

export interface EmailParcours {
  id: string;
  nom: string;
  sujet: string;
  /** publié et sans texte entre crochets */
  pret: boolean;
  /** modifié, pas encore publié */
  brouillon: boolean;
  /** pourquoi il n'est pas prêt */
  raison?: string;
}

/** Seuls les e-mails de la lettre, sans autre repère que le prénom, vont dans un parcours. */
const convient = (doc: EmailDoc | null, id: string) => Boolean(doc) && doc!.famille === "lettre" && id !== LETTRE_DOC && Object.keys(doc!.variables ?? {}).every((v) => v === "prenom");

export async function emailsDesParcours(): Promise<EmailParcours[]> {
  const ids = await emailIds();
  const out = await Promise.all(
    ids.map(async ({ id, label }): Promise<EmailParcours | null> => {
      const [publie, brouillon] = await Promise.all([publishedDoc(id, "fr") as Promise<EmailDoc | null>, draftOf(id, "fr")]);
      const doc = publie ?? ((brouillon?.content as EmailDoc | undefined) ?? null);
      if (!convient(doc, id)) return null;
      const aEcrire = publie ? todos({ sujet: publie.sujet, blocs: publie.blocs }).length > 0 : true;
      const raison = !publie ? "Pas encore publié" : aEcrire ? "Textes entre crochets à écrire" : undefined;
      return { id, nom: doc!.nom || label, sujet: publie?.sujet ?? doc!.sujet, pret: !raison, brouillon: Boolean(brouillon), raison };
    }),
  );
  return out.filter((e): e is EmailParcours => e !== null).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** État des e-mails pour le moteur : prêt ou non, et l'objet publié. */
export async function etatsEmails(): Promise<Record<string, EmailEtat>> {
  return Object.fromEntries((await emailsDesParcours()).map((e) => [e.id, { pret: e.pret, sujet: e.sujet }]));
}

/** Nouvel e-mail de parcours, au format des autres : un brouillon à écrire puis publier dans l'éditeur. */
export async function creerEmail(nom: string, by: string): Promise<string> {
  const s = slugOf(nom).slice(0, 40);
  const id = `${PREFIXE}${s}`;
  if (!s || !isDocId(id)) throw new Error("Ce nom n’est pas possible. Choisissez des lettres et des chiffres.");
  if (await documentInfo(id)) throw new Error("Un e-mail porte déjà ce nom.");
  const doc: EmailDoc = {
    nom: nom.trim(),
    quand: "Envoyé dans un parcours de vente, quand le parcours est actif.",
    famille: "lettre",
    sujet: "[Écrire l’objet]",
    preheader: "[Écrire la ligne d’aperçu]",
    variables: { prenom: { description: "Le prénom de la personne, quand il est connu", exemple: "Camille" } },
    blocs: [
      { id: newBlockId(), type: "entete", fond: "noir" },
      { id: newBlockId(), type: "titre", titre: "[Écrire le titre]" },
      { id: newBlockId(), type: "texte", texte: "Bonjour {prenom},", si: "prenom" },
      { id: newBlockId(), type: "texte", texte: "Bonjour,", sauf: "prenom" },
      { id: newBlockId(), type: "texte", texte: "[Écrire le texte]" },
      { id: newBlockId(), type: "bouton", lien: { label: "Voir la collection", href: "/collections/hypnotic-lace" } },
      { id: newBlockId(), type: "signature", texte: "Avec toute notre attention,\nla Maison Awrea Paris" },
      { id: newBlockId(), type: "pied", note: "" },
    ],
  };
  await registerEmail(id, doc.nom, by);
  await saveDraftContent(id, "fr", doc, by);
  return id;
}

/** Envoi réel d'une étape : l'e-mail publié, avec le lien de désinscription. */
export async function envoyerEmailParcours(emailId: string, to: string, prenom: string | null) {
  await sendDocEmail(emailId, to, { vars: { prenom: prenom ?? "" }, tag: "parcours" });
}

/** « M'envoyer cet e-mail » : la version en cours (brouillon compris), à la seule personne connectée. */
export async function essaiEmail(emailId: string, moi: string) {
  const doc = await emailDoc(emailId, "fr", true);
  if (!convient(doc, emailId)) throw new Error("Cet e-mail ne sert pas dans un parcours.");
  await sendDocEmail(emailId, moi, { draft: true, vars: { prenom: doc!.variables.prenom?.exemple ?? "" }, tag: "parcours-essai" });
}

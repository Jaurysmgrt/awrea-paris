/**
 * POLITIQUE D'AUTONOMIE DES AGENTS — source unique.
 *
 * Règle de la maison : les agents agissent seuls sur le quotidien.
 * Seules les actions qui touchent à l'argent ou qui sont irréversibles
 * demandent une validation en un clic dans le tableau de bord Atelier.
 *
 * Modèle « sur demande » : chaque pièce est créée après la commande, sans stock. Aucune action ne
 * touche donc à un stock ni à une liste d'attente.
 *
 * Autonomies choisies par la créatrice le 02/11 (lib/agents/autonomie.ts) : prévenir une cliente
 * d'un retard, corriger le site sans en changer le sens, publier les avis vérifiés sans souci,
 * relances et mots d'accueil. Chacune se coupe dans l'Atelier › Réglages : coupée, l'action
 * redevient une proposition à valider. Ces actions ne portent aucun texte écrit par un agent : elles
 * envoient les e-mails de la Maison (modifiables dans l'Atelier › E-mails) à l'adresse lue côté
 * serveur (commande, retour, demande, fiche cliente), jamais à une adresse donnée par un agent.
 */
import type { Autonomie } from "./autonomie-regles";

export type ActionType =
  // autonomes
  | "publish_product"
  | "update_product_content"
  | "send_reply"
  | "save_reply_draft"
  | "escalate_message"
  | "flag_order"
  | "alert_atelier"
  | "publish_article"
  | "update_ai_visibility"
  | "save_content_draft"
  | "send_report"
  // autonomes dans les limites choisies par la créatrice (Réglages › Ce que les agents font seuls)
  | "notify_delay"
  | "publish_review"
  | "correct_page"
  | "send_relance"
  // validation requise
  | "refund_order"
  | "change_price"
  | "delete_product"
  | "cancel_order"
  | "send_newsletter_all"
  | "send_client_message"
  | "confirm_piece_terms";

export interface ActionPolicy {
  label: string;
  approval: boolean;
  why?: string;
}

export const POLICY: Record<ActionType, ActionPolicy> = {
  // toujours en brouillon : rien n'est en ligne avant que la créatrice ne la mette en ligne
  publish_product: { label: "Créer la fiche d’une pièce, en brouillon", approval: false },
  update_product_content: { label: "Mettre à jour textes, SEO, textes alternatifs", approval: false },
  send_reply: { label: "Répondre à une question courante", approval: false },
  save_reply_draft: { label: "Préparer un brouillon de réponse", approval: false },
  escalate_message: { label: "Escalader un message sensible à la créatrice", approval: false },
  flag_order: { label: "Signaler une commande bloquée", approval: false },
  alert_atelier: { label: "Alerter l’atelier (retard de confection, anomalie)", approval: false },
  publish_article: { label: "Publier un article du Journal", approval: false },
  update_ai_visibility: { label: "Mettre à jour llms.txt et données structurées", approval: false },
  save_content_draft: { label: "Préparer posts et newsletters", approval: false },
  send_report: { label: "Envoyer le rapport hebdomadaire", approval: false },
  notify_delay: { label: "Prévenir une cliente d’un retard de confection", approval: false },
  publish_review: { label: "Publier un avis vérifié sans souci", approval: false },
  correct_page: { label: "Corriger la typographie d’une page, ou la description d’une photo", approval: false },
  send_relance: { label: "Relance ou mot d’accueil à une cliente", approval: false },

  refund_order: { label: "Rembourser une commande", approval: true, why: "Touche à l’argent" },
  change_price: { label: "Modifier un prix", approval: true, why: "Touche à l’argent" },
  delete_product: { label: "Retirer une pièce du catalogue", approval: true, why: "Irréversible" },
  cancel_order: { label: "Annuler ou supprimer une commande", approval: true, why: "Touche à l’argent, irréversible" },
  send_newsletter_all: { label: "Envoyer une newsletter à toute la liste", approval: true, why: "Irréversible, toute la clientèle" },
  send_client_message: { label: "Envoyer à une cliente un message préparé par un agent", approval: true, why: "Irréversible, message à une cliente" },
  confirm_piece_terms: { label: "Confirmer un prix ou un délai provisoire", approval: true, why: "Touche à l’argent, engage la Maison auprès des clientes" },
};

/** Autonomie dont dépend chaque action : coupée dans les Réglages, l'action attend la créatrice. */
export const AUTONOMIE_DE: Partial<Record<ActionType, Autonomie>> = {
  notify_delay: "retards",
  correct_page: "corrections",
  publish_review: "avis",
  send_relance: "relances",
};

/** Le type d'action est-il encore connu ? (les journaux gardent d'anciennes actions de stock, retirées) */
export const isActionType = (t: string): t is ActionType => Object.prototype.hasOwnProperty.call(POLICY, t);

export const requiresApproval = (t: ActionType) => POLICY[t].approval;

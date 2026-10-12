/**
 * POLITIQUE D'AUTONOMIE DES AGENTS — source unique.
 *
 * Règle de la maison : les agents agissent seuls sur le quotidien.
 * Seules les actions qui touchent à l'argent ou qui sont irréversibles
 * demandent une validation en un clic dans le tableau de bord Atelier.
 */

export type ActionType =
  // autonomes
  | "publish_product"
  | "update_product_content"
  | "update_stock"
  | "notify_waitlist"
  | "send_reply"
  | "save_reply_draft"
  | "escalate_message"
  | "flag_order"
  | "alert_atelier"
  | "publish_article"
  | "update_ai_visibility"
  | "save_content_draft"
  | "send_report"
  // validation requise
  | "refund_order"
  | "change_price"
  | "delete_product"
  | "cancel_order"
  | "send_newsletter_all";

export interface ActionPolicy {
  label: string;
  approval: boolean;
  why?: string;
}

export const POLICY: Record<ActionType, ActionPolicy> = {
  publish_product: { label: "Publier une fiche produit", approval: false },
  update_product_content: { label: "Mettre à jour textes, SEO, textes alternatifs", approval: false },
  update_stock: { label: "Mettre à jour un stock", approval: false },
  notify_waitlist: { label: "Prévenir la liste d’attente", approval: false },
  send_reply: { label: "Répondre à une question courante", approval: false },
  save_reply_draft: { label: "Préparer un brouillon de réponse", approval: false },
  escalate_message: { label: "Escalader un message sensible à la créatrice", approval: false },
  flag_order: { label: "Signaler une commande bloquée", approval: false },
  alert_atelier: { label: "Alerter l’atelier (rupture, anomalie)", approval: false },
  publish_article: { label: "Publier un article du Journal", approval: false },
  update_ai_visibility: { label: "Mettre à jour llms.txt et données structurées", approval: false },
  save_content_draft: { label: "Préparer posts et newsletters", approval: false },
  send_report: { label: "Envoyer le rapport hebdomadaire", approval: false },

  refund_order: { label: "Rembourser une commande", approval: true, why: "Touche à l’argent" },
  change_price: { label: "Modifier un prix", approval: true, why: "Touche à l’argent" },
  delete_product: { label: "Supprimer un produit", approval: true, why: "Irréversible" },
  cancel_order: { label: "Annuler ou supprimer une commande", approval: true, why: "Touche à l’argent, irréversible" },
  send_newsletter_all: { label: "Envoyer une newsletter à toute la liste", approval: true, why: "Irréversible, toute la clientèle" },
};

export const requiresApproval = (t: ActionType) => POLICY[t].approval;

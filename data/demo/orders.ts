/**
 * Commandes de DÉMONSTRATION (compte client, agents, rapport hebdomadaire), avec les pièces de la
 * collection Hypnotic Lace. Chaque pièce est créée sur demande : les commandes passent par les
 * étapes reçue (`paid`), en confection, prête, expédiée, livrée, chacune datée (`stages`). Aucun
 * numéro d'édition. AW-1036 est en confection depuis plus longtemps que le délai annoncé : elle
 * paraît « en retard » dans l'Atelier.
 */
import type { Order } from "@/lib/commerce/types";

const d = (daysAgo: number, h = 11) => {
  const t = new Date("2026-10-16T00:00:00Z");
  t.setUTCDate(t.getUTCDate() - daysAgo);
  t.setUTCHours(h);
  return t.toISOString();
};

export const demoOrders: Order[] = [
  { id: "o-1031", number: "AW-1031", createdAt: d(40), email: "camille.demo@exemple.fr", name: "Camille D.", status: "delivered", deliveredAt: d(19), stages: { paid: d(40), in_production: d(39), ready: d(22), shipped: d(21), delivered: d(19) }, lines: [{ title: "Le body Aura", size: "S", quantity: 1, unitPrice: 7000, handle: "body-aura" }], total: 7900, shipping: { method: "Colissimo suivi", price: 900, country: "FR", tracking: "6A12345678901", carrier: "Colissimo" }, paymentMethod: "Carte bancaire" },
  { id: "o-1032", number: "AW-1032", createdAt: d(36), email: "ines.demo@exemple.fr", name: "Inès M.", status: "delivered", deliveredAt: d(10), stages: { paid: d(36), in_production: d(35), ready: d(13), shipped: d(12), delivered: d(10) }, lines: [{ title: "La robe Odessa", size: "M", quantity: 1, unitPrice: 10000, handle: "robe-odessa" }], total: 10900, shipping: { method: "Colissimo suivi", price: 900, country: "FR", tracking: "6A12345678902", carrier: "Colissimo" }, paymentMethod: "Apple Pay" },
  { id: "o-1033", number: "AW-1033", createdAt: d(30), email: "lea.demo@exemple.fr", name: "Léa B.", status: "shipped", stages: { paid: d(30), in_production: d(29), ready: d(10), shipped: d(9) }, lines: [{ title: "Le top Kira", size: "M", quantity: 1, unitPrice: 7000, handle: "top-kira" }, { title: "Le body Gaïa", size: "M", quantity: 1, unitPrice: 7500, handle: "body-gaia" }], total: 15400, shipping: { method: "Colissimo suivi", price: 900, country: "FR", tracking: "6A12345678903", carrier: "Colissimo" }, paymentMethod: "PayPal" },
  { id: "o-1034", number: "AW-1034", createdAt: d(28), email: "sofia.demo@exemple.it", name: "Sofia R.", status: "shipped", stages: { paid: d(28), in_production: d(27), ready: d(4), shipped: d(3) }, lines: [{ title: "La robe Aria", size: "S", quantity: 1, unitPrice: 20400, handle: "robe-aria" }], total: 22900, shipping: { method: "DHL Express UE", price: 2500, country: "IT", tracking: "JD014600003828301234", carrier: "DHL" }, paymentMethod: "Carte bancaire" },
  { id: "o-1035", number: "AW-1035", createdAt: d(24), email: "camille.demo@exemple.fr", name: "Camille D.", status: "ready", stages: { paid: d(24), in_production: d(23), ready: d(1) }, lines: [{ title: "La robe Sienna", size: "S", quantity: 1, unitPrice: 18000, handle: "robe-sienna" }], total: 18900, shipping: { method: "Colissimo suivi", price: 900, country: "FR" }, paymentMethod: "Paiement en 3 fois" },
  { id: "o-1036", number: "AW-1036", createdAt: d(26), email: "nora.demo@exemple.fr", name: "Nora K.", status: "in_production", stages: { paid: d(26), in_production: d(24) }, lines: [{ title: "Le top Evina", size: "S", quantity: 1, unitPrice: 6500, handle: "top-evina" }], total: 9300, shipping: { method: "Chronopost express", price: 1800, country: "FR" }, paymentMethod: "Google Pay", gift: { wrap: true, message: "Pour tes trente ans, avec tout mon amour." } },
  { id: "o-1037", number: "AW-1037", createdAt: d(6), email: "emma.demo@exemple.co.uk", name: "Emma W.", status: "blocked", stages: { paid: d(6) }, lines: [{ title: "Le body Gaïa", size: "M", quantity: 1, unitPrice: 7500, handle: "body-gaia" }], total: 12000, shipping: { method: "DHL Express International", price: 4500, country: "GB" }, paymentMethod: "Carte bancaire" },
  { id: "o-1038", number: "AW-1038", createdAt: d(4), email: "julie.demo@exemple.fr", name: "Julie P.", status: "paid", stages: { paid: d(4) }, lines: [{ title: "Le top Kira", size: "XS", quantity: 1, unitPrice: 7000, handle: "top-kira" }], total: 7900, shipping: { method: "Colissimo suivi", price: 900, country: "FR" }, paymentMethod: "Carte bancaire" },
  { id: "o-1039", number: "AW-1039", createdAt: d(33), email: "ines.demo@exemple.fr", name: "Inès M.", status: "returned", deliveredAt: d(13), stages: { paid: d(33), in_production: d(32), ready: d(16), shipped: d(15), delivered: d(13) }, lines: [{ title: "Le top Evina", size: "S", quantity: 1, unitPrice: 6500, handle: "top-evina" }], total: 7400, shipping: { method: "Colissimo suivi", price: 900, country: "FR", tracking: "6A12345678909", carrier: "Colissimo" }, paymentMethod: "Carte bancaire" },
  { id: "o-1040", number: "AW-1040", createdAt: d(2), email: "alice.demo@exemple.be", name: "Alice V.", status: "paid", stages: { paid: d(2) }, lines: [{ title: "La robe Aria", size: "M", quantity: 1, unitPrice: 20400, handle: "robe-aria" }, { title: "Le body Aura", size: "XS", quantity: 1, unitPrice: 7000, handle: "body-aura" }], total: 27400, shipping: { method: "DHL Express UE", price: 0, country: "BE" }, paymentMethod: "Paiement en 4 fois" },
];

/** Paniers abandonnés et pages vues (démonstration, pour l'agent Rapport) */
export const demoAnalytics = {
  week: "2026-10-05 → 2026-10-11",
  sessions: 3840,
  productViews: [
    { handle: "robe-aria", views: 1180 },
    { handle: "robe-odessa", views: 960 },
    { handle: "body-aura", views: 812 },
    { handle: "robe-sienna", views: 640 },
    { handle: "body-gaia", views: 455 },
    { handle: "top-kira", views: 301 },
    { handle: "top-evina", views: 276 },
  ],
  abandonedCarts: [
    { email: "m.demo@exemple.fr", value: 10000, items: ["La robe Odessa (M)"], at: d(2, 22) },
    { email: "anonyme", value: 7500, items: ["Le body Gaïa (S)"], at: d(3, 20) },
    { email: "c.demo@exemple.fr", value: 13500, items: ["Le top Kira (S)", "Le top Evina (S)"], at: d(5, 21) },
  ],
  conversionRate: 0.0078,
  topSources: [
    { source: "Instagram", share: 0.46 },
    { source: "Recherche Google", share: 0.27 },
    { source: "Accès direct", share: 0.18 },
    { source: "Assistants IA (ChatGPT, Perplexity…)", share: 0.05 },
    { source: "Autres", share: 0.04 },
  ],
};

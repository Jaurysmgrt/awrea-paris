/** Commandes de DÉMONSTRATION (pour le compte client, les agents et le rapport hebdomadaire). */
import type { Order } from "@/lib/commerce/types";

const d = (daysAgo: number, h = 11) => {
  const t = new Date("2026-10-12T00:00:00Z");
  t.setUTCDate(t.getUTCDate() - daysAgo);
  t.setUTCHours(h);
  return t.toISOString();
};

export const demoOrders: Order[] = [
  { id: "o-1031", number: "AW-1031", createdAt: d(21), email: "camille.demo@exemple.fr", name: "Camille D.", status: "delivered", lines: [{ title: "Robe Odessa", size: "S", quantity: 1, unitPrice: 69000, handle: "robe-odessa", editionLabel: "N° 1 / 5" }], total: 69000, shipping: { method: "Colissimo suivi", price: 0, country: "FR", tracking: "6A12345678901", carrier: "Colissimo" }, paymentMethod: "Carte bancaire" },
  { id: "o-1032", number: "AW-1032", createdAt: d(18), email: "ines.demo@exemple.fr", name: "Inès M.", status: "delivered", lines: [{ title: "Body Gaïa", size: "S", quantity: 1, unitPrice: 29000, handle: "body-gaia", editionLabel: "N° 3 / 8" }], total: 29000, shipping: { method: "Colissimo suivi", price: 0, country: "FR", tracking: "6A12345678902", carrier: "Colissimo" }, paymentMethod: "Apple Pay" },
  { id: "o-1033", number: "AW-1033", createdAt: d(15), email: "lea.demo@exemple.fr", name: "Léa B.", status: "delivered", lines: [{ title: "Top Kira", size: "M", quantity: 1, unitPrice: 22000, handle: "top-kira", editionLabel: "N° 5 / 10" }, { title: "Jupe Iris", size: "M", quantity: 1, unitPrice: 24000, handle: "jupe-iris", editionLabel: "N° 3 / 10" }], total: 46000, shipping: { method: "Colissimo suivi", price: 0, country: "FR", tracking: "6A12345678903", carrier: "Colissimo" }, paymentMethod: "PayPal" },
  { id: "o-1034", number: "AW-1034", createdAt: d(12), email: "sofia.demo@exemple.it", name: "Sofia R.", status: "shipped", lines: [{ title: "Body Aura", size: "XS", quantity: 1, unitPrice: 26000, handle: "body-aura", editionLabel: "N° 1 / 6" }], total: 28500, shipping: { method: "DHL Express UE", price: 2500, country: "IT", tracking: "JD014600003828301234", carrier: "DHL" }, paymentMethod: "Carte bancaire" },
  { id: "o-1035", number: "AW-1035", createdAt: d(9), email: "camille.demo@exemple.fr", name: "Camille D.", status: "in_production", lines: [{ title: "Corset Elia", size: "S", quantity: 1, unitPrice: 32000, handle: "corset-elia", editionLabel: "Sur commande" }], total: 32000, shipping: { method: "Colissimo suivi", price: 0, country: "FR" }, paymentMethod: "Paiement en 3 fois" },
  { id: "o-1036", number: "AW-1036", createdAt: d(7), email: "nora.demo@exemple.fr", name: "Nora K.", status: "paid", lines: [{ title: "Top Kira", size: "S", quantity: 1, unitPrice: 22000, handle: "top-kira", editionLabel: "N° 6 / 10" }], total: 23800, shipping: { method: "Chronopost express", price: 1800, country: "FR" }, paymentMethod: "Google Pay", gift: { wrap: true, message: "Pour tes trente ans, avec tout mon amour." } },
  { id: "o-1037", number: "AW-1037", createdAt: d(6), email: "emma.demo@exemple.co.uk", name: "Emma W.", status: "blocked", lines: [{ title: "Body Gaïa", size: "M", quantity: 1, unitPrice: 29000, handle: "body-gaia", editionLabel: "N° 4 / 8" }], total: 33500, shipping: { method: "DHL Express International", price: 4500, country: "GB" }, paymentMethod: "Carte bancaire" },
  { id: "o-1038", number: "AW-1038", createdAt: d(4), email: "julie.demo@exemple.fr", name: "Julie P.", status: "paid", lines: [{ title: "Top Kira", size: "XS", quantity: 1, unitPrice: 22000, handle: "top-kira", editionLabel: "N° 7 / 10" }], total: 23100, shipping: { method: "Colissimo suivi", price: 900, country: "FR" }, paymentMethod: "Carte bancaire" },
  { id: "o-1039", number: "AW-1039", createdAt: d(3), email: "ines.demo@exemple.fr", name: "Inès M.", status: "returned", lines: [{ title: "Jupe Iris", size: "S", quantity: 1, unitPrice: 24000, handle: "jupe-iris", editionLabel: "N° 4 / 10" }], total: 24900, shipping: { method: "Colissimo suivi", price: 900, country: "FR", tracking: "6A12345678909", carrier: "Colissimo" }, paymentMethod: "Carte bancaire" },
  { id: "o-1040", number: "AW-1040", createdAt: d(2), email: "alice.demo@exemple.be", name: "Alice V.", status: "paid", lines: [{ title: "Body Gaïa", size: "XS", quantity: 1, unitPrice: 29000, handle: "body-gaia", editionLabel: "N° 5 / 8" }, { title: "Robe Odessa", size: "M", quantity: 1, unitPrice: 69000, handle: "robe-odessa", editionLabel: "N° 2 / 5" }], total: 98000, shipping: { method: "DHL Express UE", price: 0, country: "BE" }, paymentMethod: "Paiement en 4 fois" },
];

/** Paniers abandonnés et pages vues (démonstration, pour l'agent Rapport) */
export const demoAnalytics = {
  week: "2026-10-05 → 2026-10-11",
  sessions: 3840,
  productViews: [
    { handle: "robe-odessa", views: 1260 },
    { handle: "body-gaia", views: 812 },
    { handle: "top-kira", views: 640 },
    { handle: "body-aura", views: 455 },
    { handle: "jupe-iris", views: 301 },
    { handle: "corset-elia", views: 214 },
    { handle: "etole-nyx", views: 190 },
    { handle: "robe-thais", views: 176 },
  ],
  abandonedCarts: [
    { email: "m.demo@exemple.fr", value: 69000, items: ["Robe Odessa (M)"], at: d(2, 22) },
    { email: "anonyme", value: 29000, items: ["Body Gaïa (S)"], at: d(3, 20) },
    { email: "c.demo@exemple.fr", value: 46000, items: ["Top Kira (S)", "Jupe Iris (S)"], at: d(5, 21) },
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

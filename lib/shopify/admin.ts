/**
 * Client Shopify Admin API (GraphQL) — utilisé côté serveur uniquement :
 * agents de gestion, inscriptions newsletter, réglages des pièces depuis l'Atelier (prix, délais de
 * fabrication, indicateurs « provisoire »). Aucun stock n'est suivi : chaque pièce est créée sur
 * demande (tailles en « continuer à vendre », inventaire non suivi).
 * Activé si la boutique Shopify est branchée (COMMERCE_PROVIDER) et si l'une des deux formes
 * d'accès est fournie :
 *  - application du Dev Dashboard (applications créées depuis 2026) : SHOPIFY_CLIENT_ID et
 *    SHOPIFY_CLIENT_SECRET ; le jeton, valable 24 h, est demandé puis renouvelé automatiquement
 *    (« client credentials ») ;
 *  - ancienne application personnalisée : jeton permanent SHOPIFY_ADMIN_ACCESS_TOKEN.
 * Portées nécessaires : read/write_products (dont les métachamps des pièces), read/write_inventory
 * (création des tailles sans suivi de stock), read/write_orders, read/write_customers,
 * read/write_content (articles), read_analytics, read/write_publications (Atelier › Produits :
 * une pièce remise en ligne est publiée sur les canaux de vente), read/write_files (Atelier ›
 * Produits : retirer une photo d'une pièce, écrire son texte alternatif).
 */
import { providerOf } from "@/lib/config/providers";
import { PRODUCT_METAFIELDS, type SProduct } from "./storefront";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const staticToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
const version = process.env.SHOPIFY_API_VERSION ?? "2026-07";

export const adminEnabled = providerOf("commerce") === "shopify" && Boolean(staticToken || (clientId && clientSecret));

const g = globalThis as unknown as { __awreaShopifyAdminToken?: { value: string; expires: number } };

/** Jeton d'accès Admin : permanent, ou demandé pour 24 h et gardé en mémoire jusqu'à 10 min avant son expiration. */
async function accessToken(): Promise<string> {
  if (staticToken) return staticToken;
  const cached = g.__awreaShopifyAdminToken;
  if (cached && cached.expires > Date.now() + 10 * 60_000) return cached.value;
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId!, client_secret: clientSecret! }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) throw new Error(`Shopify Admin : jeton refusé (${json.error ?? res.status})`);
  g.__awreaShopifyAdminToken = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 86_399) * 1000 };
  return json.access_token;
}

export async function admin<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!adminEnabled) throw new Error("Shopify Admin n’est pas configuré");
  const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await accessToken() },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length) throw new Error(`Shopify Admin : ${json.errors?.map((e) => e.message).join(" ; ") ?? res.status}`);
  return json.data as T;
}

/** Inscrit (ou met à jour) une cliente avec consentement marketing e-mail. */
/**
 * Inscription à la lettre dans Shopify : fiche cliente avec son consentement, et ses coordonnées
 * quand la lettre les a recueillies (téléphone au format E.164, sinon Shopify refuse la fiche).
 */
export async function subscribeNewsletter(email: string, who: { firstName?: string | null; lastName?: string | null; phone?: string | null } = {}): Promise<void> {
  if (!adminEnabled) return;
  await admin(
    `mutation Sub($input: CustomerInput!) { customerCreate(input: $input) { userErrors { field message } } }`,
    {
      input: {
        email,
        ...(who.firstName ? { firstName: who.firstName } : {}),
        ...(who.lastName ? { lastName: who.lastName } : {}),
        ...(who.phone ? { phone: who.phone } : {}),
        emailMarketingConsent: { marketingState: "SUBSCRIBED", marketingOptInLevel: "CONFIRMED_OPT_IN" },
        tags: ["newsletter", "site"],
      },
    },
  );
}

/** Désinscription : le consentement marketing de la cliente passe à « désinscrite » dans Shopify. */
export async function unsubscribeNewsletter(email: string): Promise<void> {
  if (!adminEnabled) return;
  const found = await admin<{ customers: { nodes: { id: string }[] } }>(`query Find($q: String!) { customers(first: 1, query: $q) { nodes { id } } }`, { q: `email:${JSON.stringify(email)}` });
  const id = found.customers.nodes[0]?.id;
  if (!id) return;
  await admin(
    `mutation Unsub($input: CustomerEmailMarketingConsentUpdateInput!) { customerEmailMarketingConsentUpdate(input: $input) { userErrors { field message } } }`,
    { input: { customerId: id, emailMarketingConsent: { marketingState: "UNSUBSCRIBED", marketingOptInLevel: "SINGLE_OPT_IN" } } },
  );
}

/* ------------------------------------------------------------------------
 * Opérations utilisées par les agents (mode Shopify).
 * À valider sur une boutique de développement avant la mise en production.
 * ---------------------------------------------------------------------- */

type UserErrors = { userErrors: { field?: string[] | null; message: string }[] };

function assertNoErrors(label: string, r: UserErrors | null | undefined) {
  if (r?.userErrors?.length) throw new Error(`${label} : ${r.userErrors.map((e) => e.message).join(" ; ")}`);
}

export async function productIdByHandle(handle: string): Promise<string | null> {
  const d = await admin<{ productByIdentifier: { id: string } | null }>(
    `query P($h: String!) { productByIdentifier(identifier: { handle: $h }) { id } }`,
    { h: handle },
  );
  return d.productByIdentifier?.id ?? null;
}

export interface NewShopifyProduct {
  handle: string;
  title: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  status: "ACTIVE" | "DRAFT";
  seo: { title: string; description: string };
  metafields: { key: string; type: string; value: string }[];
  images: { url: string; alt: string }[];
  /** tailles proposées : toutes se commandent, la pièce est créée sur demande */
  sizes: { size: string; sku: string }[];
  price: number; // centimes
}

/**
 * Métachamps des pièces (espace de noms `awrea`) propres au modèle « sur demande »
 * (ACTIVATION.md, étape 4.2).
 */
export const PIECE_METAFIELDS = {
  leadTimeMin: { key: "delai_min", type: "number_integer" },
  leadTimeMax: { key: "delai_max", type: "number_integer" },
  priceProvisional: { key: "prix_provisoire", type: "boolean" },
  leadTimeProvisional: { key: "delai_provisoire", type: "boolean" },
  isNew: { key: "nouveau", type: "boolean" },
  imagesProvisional: { key: "visuels_provisoires", type: "boolean" },
} as const;

export async function shopifyCreateProduct(p: NewShopifyProduct): Promise<{ id: string; handle: string }> {
  const created = await admin<{ productCreate: UserErrors & { product: { id: string; handle: string } | null } }>(
    `mutation C($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
      productCreate(product: $product, media: $media) { product { id handle } userErrors { field message } }
    }`,
    {
      product: {
        handle: p.handle,
        title: p.title,
        descriptionHtml: p.descriptionHtml,
        productType: p.productType,
        tags: p.tags,
        status: p.status,
        seo: p.seo,
        metafields: p.metafields.map((m) => ({ namespace: "awrea", ...m })),
        productOptions: [{ name: "Taille", values: p.sizes.map((s) => ({ name: s.size })) }],
      },
      media: p.images.map((i) => ({ originalSource: i.url, alt: i.alt, mediaContentType: "IMAGE" })),
    },
  );
  assertNoErrors("Création du produit", created.productCreate);
  const product = created.productCreate.product!;
  // pièce créée sur demande : inventaire non suivi et vente toujours possible, dans chaque taille
  const variants = await admin<{ productVariantsBulkCreate: UserErrors }>(
    `mutation V($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) { userErrors { field message } }
    }`,
    {
      productId: product.id,
      variants: p.sizes.map((s) => ({
        optionValues: [{ optionName: "Taille", name: s.size }],
        price: (p.price / 100).toFixed(2),
        inventoryPolicy: "CONTINUE",
        inventoryItem: { sku: s.sku, tracked: false },
      })),
    },
  );
  assertNoErrors("Création des tailles", variants.productVariantsBulkCreate);
  return product;
}

export async function shopifyUpdateProduct(handle: string, input: { title?: string; descriptionHtml?: string; seo?: { title: string; description: string }; mediaAlts?: { id: string; alt: string }[] }) {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const { mediaAlts, ...rest } = input;
  const r = await admin<{ productUpdate: UserErrors }>(
    `mutation U($product: ProductUpdateInput!) { productUpdate(product: $product) { userErrors { field message } } }`,
    { product: { id, ...rest } },
  );
  assertNoErrors("Mise à jour du produit", r.productUpdate);
  if (mediaAlts?.length) {
    const m = await admin<{ productUpdateMedia: UserErrors }>(
      `mutation M($productId: ID!, $media: [UpdateMediaInput!]!) { productUpdateMedia(productId: $productId, media: $media) { userErrors { field message } } }`,
      { productId: id, media: mediaAlts.map((a) => ({ id: a.id, alt: a.alt })) },
    );
    assertNoErrors("Textes alternatifs", m.productUpdateMedia);
  }
}

/**
 * Les tailles d'une pièce n'ont pas toutes le même prix dans Shopify : un prix unique les
 * écraserait. Le changement est refusé, la créatrice règle alors ces prix dans Shopify.
 */
export class MixedPricesError extends Error {
  readonly handle: string;
  constructor(handle: string) {
    super("Les tailles de cette pièce n’ont pas le même prix dans Shopify. Pour ne pas les écraser, modifiez ces prix directement dans Shopify.");
    this.handle = handle;
  }
}

/**
 * Prix unique pour toutes les tailles d'une pièce. Refusé (MixedPricesError) si les tailles ont
 * aujourd'hui des prix différents ; rien n'est écrit si le prix est déjà celui de chaque taille.
 */
export async function shopifySetPrice(handle: string, cents: number) {
  const d = await admin<{ productByIdentifier: { id: string; variants: { nodes: { id: string; price: string }[] } } | null }>(
    `query P($h: String!) { productByIdentifier(identifier: { handle: $h }) { id variants(first: 50) { nodes { id price } } } }`,
    { h: handle },
  );
  if (!d.productByIdentifier) throw new Error(`Produit ${handle} introuvable`);
  const variants = d.productByIdentifier.variants.nodes;
  const current = new Set(variants.map((v) => Math.round(Number(v.price) * 100)));
  if (current.size > 1) throw new MixedPricesError(handle);
  if (current.size === 1 && current.has(cents)) return;
  const r = await admin<{ productVariantsBulkUpdate: UserErrors }>(
    `mutation P($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } } }`,
    { productId: d.productByIdentifier.id, variants: variants.map((v) => ({ id: v.id, price: (cents / 100).toFixed(2) })) },
  );
  assertNoErrors("Changement de prix", r.productVariantsBulkUpdate);
}

export async function shopifyDeleteProduct(handle: string) {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const r = await admin<{ productDelete: UserErrors }>(`mutation D($id: ID!) { productDelete(input: { id: $id }) { userErrors { field message } } }`, { id });
  assertNoErrors("Suppression du produit", r.productDelete);
}

/**
 * Réglages d'une pièce depuis l'Atelier : prix (toutes les tailles), délai de fabrication et
 * indicateurs « provisoire » / « nouveau » (métachamps `awrea.*`).
 */
export async function shopifyUpdatePiece(
  handle: string,
  input: { price?: number; priceProvisional?: boolean; leadTime?: { min: number; max: number }; leadTimeProvisional?: boolean; isNew?: boolean },
) {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  if (input.price !== undefined) await shopifySetPrice(handle, input.price);
  const M = PIECE_METAFIELDS;
  const metafields = [
    ...(input.leadTime
      ? [
          { ...M.leadTimeMin, value: String(input.leadTime.min) },
          { ...M.leadTimeMax, value: String(input.leadTime.max) },
        ]
      : []),
    ...(input.priceProvisional !== undefined ? [{ ...M.priceProvisional, value: String(input.priceProvisional) }] : []),
    ...(input.leadTimeProvisional !== undefined ? [{ ...M.leadTimeProvisional, value: String(input.leadTimeProvisional) }] : []),
    ...(input.isNew !== undefined ? [{ ...M.isNew, value: String(input.isNew) }] : []),
  ];
  if (!metafields.length) return;
  const r = await admin<{ metafieldsSet: UserErrors }>(
    `mutation S($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { field message } } }`,
    { metafields: metafields.map((m) => ({ ownerId: id, namespace: "awrea", ...m })) },
  );
  assertNoErrors("Réglages de la pièce", r.metafieldsSet);
}

/** Remboursement intégral à partir du remboursement suggéré par Shopify. */
export async function shopifyRefundOrder(orderId: string, note: string) {
  const d = await admin<{
    order: {
      suggestedRefund: {
        refundLineItems: { lineItem: { id: string }; quantity: number }[];
        suggestedTransactions: { gateway: string; parentTransaction: { id: string } | null; amountSet: { shopMoney: { amount: string } } }[];
      };
    } | null;
  }>(
    `query R($id: ID!) { order(id: $id) { suggestedRefund(refundShipping: true) {
      refundLineItems { lineItem { id } quantity }
      suggestedTransactions { gateway parentTransaction { id } amountSet { shopMoney { amount } } }
    } } }`,
    { id: orderId },
  );
  if (!d.order) throw new Error("Commande introuvable");
  const s = d.order.suggestedRefund;
  const r = await admin<{ refundCreate: UserErrors }>(
    `mutation R($input: RefundInput!) { refundCreate(input: $input) { userErrors { field message } } }`,
    {
      input: {
        orderId,
        note,
        notify: true,
        shipping: { fullRefund: true },
        // aucune remise en stock : les pièces sont créées sur demande
        refundLineItems: s.refundLineItems.map((l) => ({ lineItemId: l.lineItem.id, quantity: l.quantity, restockType: "NO_RESTOCK" })),
        transactions: s.suggestedTransactions.map((t) => ({ orderId, gateway: t.gateway, kind: "REFUND", amount: t.amountSet.shopMoney.amount, parentId: t.parentTransaction?.id })),
      },
    },
  );
  assertNoErrors("Remboursement", r.refundCreate);
}

/**
 * Remboursement partiel : les pièces retournées (repérées par leur pièce et leur taille), sans la
 * livraison ; Shopify calcule la transaction à rembourser (aucune remise en stock : pièces créées
 * sur demande).
 */
export async function shopifyRefundLines(orderId: string, items: { handle: string; size: string }[], note: string) {
  const o = await admin<{ order: { lineItems: { nodes: { id: string; quantity: number; variantTitle: string | null; product: { handle: string } | null }[] } } | null }>(
    `query L($id: ID!) { order(id: $id) { lineItems(first: 50) { nodes { id quantity variantTitle product { handle } } } } }`,
    { id: orderId },
  );
  if (!o.order) throw new Error("Commande introuvable");
  const wanted = new Map<string, number>();
  for (const it of items) {
    const line = o.order.lineItems.nodes.find((l) => l.product?.handle === it.handle && (l.variantTitle ?? "TU") === it.size);
    if (!line) throw new Error(`Pièce ${it.handle} (${it.size}) introuvable dans la commande`);
    wanted.set(line.id, Math.min(line.quantity, (wanted.get(line.id) ?? 0) + 1));
  }
  const refundLineItems = [...wanted].map(([lineItemId, quantity]) => ({ lineItemId, quantity }));
  const d = await admin<{ order: { suggestedRefund: { suggestedTransactions: { gateway: string; parentTransaction: { id: string } | null; amountSet: { shopMoney: { amount: string } } }[] } } | null }>(
    `query R($id: ID!, $lines: [RefundLineItemInput!]) { order(id: $id) { suggestedRefund(refundShipping: false, refundLineItems: $lines) {
      suggestedTransactions { gateway parentTransaction { id } amountSet { shopMoney { amount } } }
    } } }`,
    { id: orderId, lines: refundLineItems },
  );
  const r = await admin<{ refundCreate: UserErrors }>(
    `mutation R($input: RefundInput!) { refundCreate(input: $input) { userErrors { field message } } }`,
    {
      input: {
        orderId,
        note,
        notify: true,
        refundLineItems: refundLineItems.map((l) => ({ ...l, restockType: "NO_RESTOCK" })),
        transactions: (d.order?.suggestedRefund.suggestedTransactions ?? []).map((t) => ({ orderId, gateway: t.gateway, kind: "REFUND", amount: t.amountSet.shopMoney.amount, parentId: t.parentTransaction?.id })),
      },
    },
  );
  assertNoErrors("Remboursement", r.refundCreate);
}

export async function shopifyCancelOrder(orderId: string, refund: boolean) {
  const r = await admin<{ orderCancel: { orderCancelUserErrors: { message: string }[] } }>(
    `mutation C($orderId: ID!, $refund: Boolean!) { orderCancel(orderId: $orderId, reason: CUSTOMER, refund: $refund, restock: false, notifyCustomer: true) { orderCancelUserErrors { message } } }`,
    { orderId, refund },
  );
  if (r.orderCancel.orderCancelUserErrors.length) throw new Error(r.orderCancel.orderCancelUserErrors.map((e) => e.message).join(" ; "));
}

export async function shopifyAbandonedCheckouts(): Promise<{ email: string; value: number; items: string[]; at: string }[]> {
  const d = await admin<{ abandonedCheckouts: { nodes: { createdAt: string; customer: { email: string | null } | null; totalPriceSet: { shopMoney: { amount: string } }; lineItems: { nodes: { title: string; quantity: number }[] } }[] } }>(
    `{ abandonedCheckouts(first: 30, reverse: true) { nodes { createdAt customer { email } totalPriceSet { shopMoney { amount } } lineItems(first: 10) { nodes { title quantity } } } } }`,
  );
  return d.abandonedCheckouts.nodes.map((n) => ({
    email: n.customer?.email ?? "anonyme",
    value: Math.round(parseFloat(n.totalPriceSet.shopMoney.amount) * 100),
    items: n.lineItems.nodes.map((l) => l.title),
    at: n.createdAt,
  }));
}

/* ------------------------------------------------------------------------
 * Catalogue de l'Atelier (refonte du 07/11) : toutes les pièces, en ligne, en brouillon ou
 * archivées (la Storefront API ne voit que les pièces en ligne), leurs textes, leur statut et leur
 * copie. Portées : read/write_products, et read/write_publications pour mettre une pièce sur les
 * canaux de vente (site compris) quand elle passe en ligne.
 * ---------------------------------------------------------------------- */

export interface AdminPiece {
  handle: string;
  title: string;
  status: string;
  productType: string;
  tags: string[];
  descriptionHtml: string;
  seo: { title: string | null; description: string | null };
  variants: { nodes: { price: string; selectedOptions: { name: string; value: string }[] }[] };
  media: { nodes: ({ id?: string; alt?: string | null; image?: { url: string; width: number; height: number } | null } | Record<string, never>)[] };
  collections: { nodes: { handle: string }[] };
  tagline?: { value: string } | null;
  leadMin?: { value: string } | null;
  leadMax?: { value: string } | null;
  priceProvisional?: { value: string } | null;
  leadProvisional?: { value: string } | null;
  isNew?: { value: string } | null;
  imagesProvisional?: { value: string } | null;
}

const ADMIN_PIECE_FIELDS = `handle title status productType tags descriptionHtml seo { title description }
  variants(first: 20) { nodes { price selectedOptions { name value } } }
  media(first: 12) { nodes { ... on MediaImage { id alt image { url width height } } } }
  collections(first: 1) { nodes { handle } }
  tagline: metafield(namespace: "awrea", key: "tagline") { value }
  leadMin: metafield(namespace: "awrea", key: "delai_min") { value }
  leadMax: metafield(namespace: "awrea", key: "delai_max") { value }
  priceProvisional: metafield(namespace: "awrea", key: "prix_provisoire") { value }
  leadProvisional: metafield(namespace: "awrea", key: "delai_provisoire") { value }
  isNew: metafield(namespace: "awrea", key: "nouveau") { value }
  imagesProvisional: metafield(namespace: "awrea", key: "visuels_provisoires") { value }`;

/** Ligne de la liste Produits : peu de champs, pour rester loin du plafond de coût d'une requête. */
export interface AdminPieceResume {
  handle: string;
  title: string;
  status: string;
  productType: string;
  featuredMedia: { alt?: string | null; image?: { url: string; width: number; height: number } | null } | null;
  priceRangeV2: { minVariantPrice: { amount: string }; maxVariantPrice: { amount: string } };
  variantsCount: { count: number } | null;
  collections: { nodes: { handle: string }[] };
  leadMin?: { value: string } | null;
  leadMax?: { value: string } | null;
  priceProvisional?: { value: string } | null;
  leadProvisional?: { value: string } | null;
}

const ADMIN_PIECE_RESUME = `handle title status productType
  featuredMedia { ... on MediaImage { alt image { url width height } } }
  priceRangeV2 { minVariantPrice { amount } maxVariantPrice { amount } }
  variantsCount { count }
  collections(first: 1) { nodes { handle } }
  leadMin: metafield(namespace: "awrea", key: "delai_min") { value }
  leadMax: metafield(namespace: "awrea", key: "delai_max") { value }
  priceProvisional: metafield(namespace: "awrea", key: "prix_provisoire") { value }
  leadProvisional: metafield(namespace: "awrea", key: "delai_provisoire") { value }`;

/**
 * Toutes les pièces de la boutique, quel que soit leur statut, page après page (25 par requête :
 * le coût d'une requête Admin est plafonné). Au-delà de 1 000 pièces, la liste s'arrête et le dit.
 */
export async function shopifyAtelierPieces(): Promise<{ pieces: AdminPieceResume[]; complet: boolean }> {
  const out: AdminPieceResume[] = [];
  let after: string | null = null;
  for (let page = 0; page < 40; page++) {
    const d: { products: { nodes: AdminPieceResume[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } = await admin(
      `query L($after: String) { products(first: 25, after: $after, sortKey: TITLE) { nodes { ${ADMIN_PIECE_RESUME} } pageInfo { hasNextPage endCursor } } }`,
      { after },
    );
    out.push(...d.products.nodes);
    if (!d.products.pageInfo.hasNextPage) return { pieces: out, complet: true };
    after = d.products.pageInfo.endCursor;
  }
  return { pieces: out, complet: false };
}

export async function shopifyAtelierPiece(handle: string): Promise<AdminPiece | null> {
  const d = await admin<{ productByIdentifier: AdminPiece | null }>(`query P($h: String!) { productByIdentifier(identifier: { handle: $h }) { ${ADMIN_PIECE_FIELDS} } }`, { h: handle });
  return d.productByIdentifier;
}

type ApercuMedia = {
  alt: string | null;
  image?: { url: string; altText: string | null; width: number; height: number } | null;
  preview?: { image: { url: string } | null } | null;
  sources?: { url: string; mimeType: string; height: number }[];
};
type ApercuProduit = Omit<SProduct, "images" | "media" | "priceRange" | "variants" | "publishedAt"> & {
  status: string;
  publishedAt: string | null;
  priceRangeV2: SProduct["priceRange"];
  media: { nodes: ApercuMedia[] };
  variants: { nodes: { id: string; sku: string | null; selectedOptions: { name: string; value: string }[] }[] };
};

/**
 * Une pièce, quel que soit son statut, sous la forme que lit le site (lib/shopify/storefront.ts,
 * mapProduct) : pour l'aperçu d'un brouillon, réservé à la créatrice connectée en mode Édition.
 * Toutes les tailles sont gardées : une pièce pas encore publiée n'est « en vente » nulle part.
 */
export async function shopifyApercuPiece(handle: string): Promise<(SProduct & { status: string }) | null> {
  const d = await admin<{ productByIdentifier: ApercuProduit | null }>(
    `query A($h: String!) { productByIdentifier(identifier: { handle: $h }) {
      id handle title description descriptionHtml productType tags publishedAt status
      seo { title description }
      collections(first: 1) { nodes { handle } }
      priceRangeV2 { minVariantPrice { amount } maxVariantPrice { amount } }
      media(first: 16) { nodes { alt ... on MediaImage { image { url altText width height } } ... on Video { preview { image { url } } sources { url mimeType height } } } }
      variants(first: 20) { nodes { id sku selectedOptions { name value } } }
      ${PRODUCT_METAFIELDS}
    } }`,
    { h: handle },
  );
  const p = d.productByIdentifier;
  if (!p) return null;
  const { priceRangeV2, media, variants, publishedAt, ...reste } = p;
  return {
    ...reste,
    publishedAt: publishedAt ?? "",
    priceRange: priceRangeV2,
    images: { nodes: media.nodes.flatMap((m) => (m.image ? [{ ...m.image, altText: m.image.altText ?? m.alt }] : [])) },
    media: { nodes: media.nodes.map((m) => (m.sources?.length ? { alt: m.alt ?? undefined, previewImage: m.preview?.image ?? undefined, sources: m.sources } : {})) },
    variants: { nodes: variants.nodes.map((v) => ({ ...v, sku: v.sku ?? "", availableForSale: true })) },
  };
}

/**
 * Photos d'une pièce. Ajout : Shopify va chercher chaque photo à son adresse publique, puis la
 * prépare (quelques secondes). Retrait et texte alternatif : fileUpdate (permission `write_files`) ;
 * photo principale : productReorderMedia, la première photo étant celle des listes.
 */
export async function shopifyAddPhotos(handle: string, photos: { url: string; alt: string }[]) {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const r = await admin<{ productUpdate: UserErrors }>(
    `mutation M($product: ProductUpdateInput!, $media: [CreateMediaInput!]) { productUpdate(product: $product, media: $media) { userErrors { field message } } }`,
    { product: { id }, media: photos.map((p) => ({ originalSource: p.url, alt: p.alt, mediaContentType: "IMAGE" })) },
  );
  assertNoErrors("Photos de la pièce", r.productUpdate);
}

export async function shopifyRemovePhoto(handle: string, mediaId: string) {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const r = await admin<{ fileUpdate: UserErrors }>(`mutation F($files: [FileUpdateInput!]!) { fileUpdate(files: $files) { userErrors { field message } } }`, {
    files: [{ id: mediaId, referencesToRemove: [id] }],
  });
  assertNoErrors("Retrait de la photo", r.fileUpdate);
}

export async function shopifyMainPhoto(handle: string, mediaId: string) {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const r = await admin<{ productReorderMedia: { mediaUserErrors: { field: string[] | null; message: string }[] } }>(
    `mutation R($id: ID!, $moves: [MoveInput!]!) { productReorderMedia(id: $id, moves: $moves) { mediaUserErrors { field message } } }`,
    { id, moves: [{ id: mediaId, newPosition: "0" }] },
  );
  assertNoErrors("Photo principale", { userErrors: r.productReorderMedia.mediaUserErrors });
}

export async function shopifyPhotoAlt(mediaId: string, alt: string) {
  const r = await admin<{ fileUpdate: UserErrors }>(`mutation F($files: [FileUpdateInput!]!) { fileUpdate(files: $files) { userErrors { field message } } }`, { files: [{ id: mediaId, alt }] });
  assertNoErrors("Texte de la photo", r.fileUpdate);
}

/** Nom, accroche, description et référencement d'une pièce. */
export async function shopifyUpdateTexts(handle: string, input: { title?: string; tagline?: string; descriptionHtml?: string; seo?: { title: string; description: string } }) {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const { tagline, ...product } = input;
  // l'accroche d'abord : une accroche vidée est retirée (Shopify refuse un métachamp vide)
  if (tagline !== undefined && tagline) {
    const r = await admin<{ metafieldsSet: UserErrors }>(`mutation S($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { field message } } }`, {
      metafields: [{ ownerId: id, namespace: "awrea", key: "tagline", type: "single_line_text_field", value: tagline }],
    });
    assertNoErrors("Accroche de la pièce", r.metafieldsSet);
  } else if (tagline !== undefined) {
    const r = await admin<{ metafieldsDelete: UserErrors }>(`mutation D($metafields: [MetafieldIdentifierInput!]!) { metafieldsDelete(metafields: $metafields) { userErrors { field message } } }`, {
      metafields: [{ ownerId: id, namespace: "awrea", key: "tagline" }],
    });
    assertNoErrors("Accroche de la pièce", r.metafieldsDelete);
  }
  if (Object.keys(product).length) {
    const r = await admin<{ productUpdate: UserErrors }>(`mutation U($product: ProductUpdateInput!) { productUpdate(product: $product) { userErrors { field message } } }`, { product: { id, ...product } });
    assertNoErrors("Textes de la pièce", r.productUpdate);
  }
}

/**
 * Canal de vente du site (publication du canal « Headless » qui sert la Storefront API) :
 * SHOPIFY_PUBLICATION_ID s'il est réglé, sinon la seule publication d'application dont le catalogue
 * s'appelle « Headless ». Jamais tous les canaux : ni le point de vente, ni Google, ni Meta.
 */
async function publicationDuSite(): Promise<string | null> {
  const fixe = process.env.SHOPIFY_PUBLICATION_ID?.trim();
  if (fixe) return fixe.startsWith("gid://") ? fixe : `gid://shopify/Publication/${fixe}`;
  const d = await admin<{ publications: { nodes: { id: string; catalog: { title: string } | null }[] } }>(`query { publications(first: 25, catalogType: APP) { nodes { id catalog { title } } } }`);
  const site = d.publications.nodes.filter((p) => /headless/i.test(p.catalog?.title ?? ""));
  return site.length === 1 ? site[0].id : null;
}

/**
 * Statut d'une pièce. Passée en ligne, elle est aussi publiée sur le canal de vente du site s'il
 * lui manque ; si ce canal n'est pas trouvé (permission des publications absente, ou plusieurs
 * canaux possibles sans SHOPIFY_PUBLICATION_ID), le statut change quand même et le résultat le dit
 * (`canaux: false`).
 */
export async function shopifySetStatus(handle: string, status: "ACTIVE" | "DRAFT" | "ARCHIVED"): Promise<{ canaux: boolean }> {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const r = await admin<{ productUpdate: UserErrors }>(`mutation U($product: ProductUpdateInput!) { productUpdate(product: $product) { userErrors { field message } } }`, { product: { id, status } });
  assertNoErrors("Statut de la pièce", r.productUpdate);
  if (status !== "ACTIVE") return { canaux: true };
  try {
    const site = await publicationDuSite();
    if (!site) return { canaux: false };
    const d = await admin<{ product: { unpublishedPublications: { nodes: { id: string }[] } } | null }>(`query U($id: ID!) { product(id: $id) { unpublishedPublications(first: 25) { nodes { id } } } }`, { id });
    if ((d.product?.unpublishedPublications.nodes ?? []).some((x) => x.id === site)) {
      const p = await admin<{ publishablePublish: UserErrors }>(`mutation P($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`, {
        id,
        input: [{ publicationId: site }],
      });
      assertNoErrors("Publication sur le canal du site", p.publishablePublish);
    }
    return { canaux: true };
  } catch (e) {
    console.error("[shopify] publication sur les canaux :", e);
    return { canaux: false };
  }
}

/** Copie d'une pièce, en brouillon, avec ses photos. */
export async function shopifyDuplicate(handle: string, newTitle: string): Promise<{ handle: string }> {
  const id = await productIdByHandle(handle);
  if (!id) throw new Error(`Produit ${handle} introuvable`);
  const r = await admin<{ productDuplicate: UserErrors & { newProduct: { handle: string } | null } }>(
    `mutation D($id: ID!, $title: String!) { productDuplicate(productId: $id, newTitle: $title, newStatus: DRAFT, includeImages: true) { newProduct { handle } userErrors { field message } } }`,
    { id, title: newTitle },
  );
  assertNoErrors("Copie de la pièce", r.productDuplicate);
  if (!r.productDuplicate.newProduct) throw new Error("Copie de la pièce : Shopify n’a pas renvoyé la nouvelle pièce.");
  return { handle: r.productDuplicate.newProduct.handle };
}

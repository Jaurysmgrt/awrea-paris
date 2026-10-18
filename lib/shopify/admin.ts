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
 * read/write_content (articles), read_analytics.
 */
import { providerOf } from "@/lib/config/providers";

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
  if (!res.ok || json.errors?.length) throw new Error(`Shopify Admin : ${json.errors?.map((e) => e.message).join(" ; ") ?? res.status}`);
  return json.data as T;
}

/** Inscrit (ou met à jour) une cliente avec consentement marketing e-mail. */
export async function subscribeNewsletter(email: string): Promise<void> {
  if (!adminEnabled) return;
  await admin(
    `mutation Sub($input: CustomerInput!) { customerCreate(input: $input) { userErrors { field message } } }`,
    { input: { email, emailMarketingConsent: { marketingState: "SUBSCRIBED", marketingOptInLevel: "CONFIRMED_OPT_IN" }, tags: ["newsletter", "site"] } },
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
  if (r?.userErrors?.length) throw new Error(`${label} : ${r.userErrors.map((e) => e.message).join(" ; ")}`);
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

export async function shopifySetPrice(handle: string, cents: number) {
  const d = await admin<{ productByIdentifier: { id: string; variants: { nodes: { id: string }[] } } | null }>(
    `query P($h: String!) { productByIdentifier(identifier: { handle: $h }) { id variants(first: 50) { nodes { id } } } }`,
    { h: handle },
  );
  if (!d.productByIdentifier) throw new Error(`Produit ${handle} introuvable`);
  const r = await admin<{ productVariantsBulkUpdate: UserErrors }>(
    `mutation P($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } } }`,
    { productId: d.productByIdentifier.id, variants: d.productByIdentifier.variants.nodes.map((v) => ({ id: v.id, price: (cents / 100).toFixed(2) })) },
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
  if (r.orderCancel.orderCancelUserErrors.length) throw new Error(r.orderCancel.orderCancelUserErrors.map((e) => e.message).join(" ; "));
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

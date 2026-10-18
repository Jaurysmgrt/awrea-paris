/**
 * Client Shopify Storefront API (GraphQL) — mode headless.
 * Activé par l'interrupteur COMMERCE_PROVIDER (lib/config/providers.ts) : dès que
 * SHOPIFY_STORE_DOMAIN et un jeton Storefront sont définis, sauf COMMERCE_PROVIDER=mock.
 * Jeton : le jeton PRIVÉ du canal Headless (SHOPIFY_STOREFRONT_PRIVATE_TOKEN, recommandé : les
 * appels partent du serveur) ou, à défaut, le jeton public (SHOPIFY_STOREFRONT_ACCESS_TOKEN).
 *
 * Modèle de la Maison : chaque pièce est créée SUR DEMANDE, sans stock. Le stock Shopify n'est donc
 * ni lu ni affiché ; chaque taille doit rester « en vente » (inventaire non suivi, ou « continuer à
 * vendre en cas de rupture de stock ») : une taille que Shopify dit indisponible est écartée.
 *
 * Métachamps attendus sur les produits (namespace `awrea`, à créer dans l'admin Shopify, avec
 * l'accès à l'API Storefront, ACTIVATION.md étape 4.2) :
 *   delai_min (integer) · delai_max (integer) : délai de fabrication en semaines
 *   prix_provisoire (boolean) · delai_provisoire (boolean) · nouveau (boolean) · visuels_provisoires (boolean)
 *   tagline (single_line_text) · materials (json : [{name, percent}]) · care (list.single_line_text)
 *   fit (multi_line_text) · model (single_line_text) · details (list.single_line_text)
 *   lining (single_line_text) · complete_the_look (list.product_reference) · detail_image (file_reference)
 *   traceability (json : {steps: [{label, place, hours?}], origins: [{material, origin}]})
 * Option de variante : « Taille ». Sans délai renseigné, le délai provisoire de la catégorie
 * s'applique (lib/commerce/availability.ts) et la pièce est signalée « délai provisoire ».
 */
import type { Cart, Category, Collection, Image, Product, Size, Variant } from "@/lib/commerce/types";
import { DEFAULT_LEAD_TIME, normalizeLeadTime } from "@/lib/commerce/availability";
import { headers } from "next/headers";
import { shop } from "@/content/settings";
import { providerOf } from "@/lib/config/providers";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const privateToken = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
const publicToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION ?? "2026-07";

export const shopifyEnabled = providerOf("commerce") === "shopify";

/** Adresse IP de la cliente (jeton privé : Shopify l'utilise pour sa protection anti-robots). */
async function buyerIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    return null; // hors requête (compilation, tâche planifiée)
  }
}

export async function storefront<T>(query: string, variables: Record<string, unknown> = {}, opts: { revalidate?: number; tags?: string[] } = {}): Promise<T> {
  if (!shopifyEnabled) throw new Error("Shopify n’est pas configuré");
  // requêtes propres à une cliente (panier) : non mises en cache, avec son adresse IP
  const ip = privateToken && opts.revalidate === 0 ? await buyerIp() : null;
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(privateToken ? { "Shopify-Storefront-Private-Token": privateToken } : { "X-Shopify-Storefront-Access-Token": publicToken! }),
      ...(ip ? { "Shopify-Storefront-Buyer-IP": ip } : {}),
    },
    body: JSON.stringify({ query, variables }),
    ...(opts.revalidate === 0 ? { cache: "no-store" as const } : { next: { revalidate: opts.revalidate ?? 300, tags: opts.tags ?? ["shopify"] } }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length) {
    throw new Error(`Shopify Storefront : ${json.errors?.map((e) => e.message).join(" ; ") ?? res.status}`);
  }
  return json.data as T;
}

const MF = `
  tagline: metafield(namespace: "awrea", key: "tagline") { value }
  leadMin: metafield(namespace: "awrea", key: "delai_min") { value }
  leadMax: metafield(namespace: "awrea", key: "delai_max") { value }
  priceProvisional: metafield(namespace: "awrea", key: "prix_provisoire") { value }
  leadProvisional: metafield(namespace: "awrea", key: "delai_provisoire") { value }
  isNew: metafield(namespace: "awrea", key: "nouveau") { value }
  imagesProvisional: metafield(namespace: "awrea", key: "visuels_provisoires") { value }
  materials: metafield(namespace: "awrea", key: "materials") { value }
  care: metafield(namespace: "awrea", key: "care") { value }
  fit: metafield(namespace: "awrea", key: "fit") { value }
  model: metafield(namespace: "awrea", key: "model") { value }
  details: metafield(namespace: "awrea", key: "details") { value }
  lining: metafield(namespace: "awrea", key: "lining") { value }
  traceability: metafield(namespace: "awrea", key: "traceability") { value }
  completeTheLook: metafield(namespace: "awrea", key: "complete_the_look") { references(first: 4) { nodes { ... on Product { handle } } } }
  detailImage: metafield(namespace: "awrea", key: "detail_image") { reference { ... on MediaImage { image { url altText width height } } } }
`;

const PRODUCT_FIELDS = `
  id handle title description descriptionHtml productType tags publishedAt
  seo { title description }
  collections(first: 1) { nodes { handle } }
  priceRange { minVariantPrice { amount } maxVariantPrice { amount } }
  images(first: 8) { nodes { url altText width height } }
  media(first: 8) { nodes { ... on Video { alt previewImage { url } sources { url mimeType height } } } }
  variants(first: 20) { nodes { id sku availableForSale selectedOptions { name value } } }
  ${MF}
`;

type SImage = { url: string; altText: string | null; width: number; height: number };
type SProduct = {
  id: string; handle: string; title: string; description: string; productType: string; tags: string[]; publishedAt: string;
  seo: { title: string | null; description: string | null };
  collections: { nodes: { handle: string }[] };
  priceRange: { minVariantPrice: { amount: string }; maxVariantPrice: { amount: string } };
  images: { nodes: SImage[] };
  media: { nodes: ({ alt?: string; previewImage?: { url: string }; sources?: { url: string; mimeType: string; height: number }[] } | Record<string, never>)[] };
  variants: { nodes: { id: string; sku: string; availableForSale: boolean; selectedOptions: { name: string; value: string }[] }[] };
  tagline?: { value: string } | null;
  leadMin?: { value: string } | null; leadMax?: { value: string } | null;
  priceProvisional?: { value: string } | null; leadProvisional?: { value: string } | null; isNew?: { value: string } | null; imagesProvisional?: { value: string } | null;
  materials?: { value: string } | null; care?: { value: string } | null; fit?: { value: string } | null;
  model?: { value: string } | null; details?: { value: string } | null; lining?: { value: string } | null; traceability?: { value: string } | null;
  completeTheLook?: { references: { nodes: { handle: string }[] } } | null;
  detailImage?: { reference: { image: SImage } | null } | null;
};

const toImage = (i: SImage, fallbackAlt: string, provisoire = false): Image => ({ src: i.url, alt: i.altText ?? fallbackAlt, width: i.width, height: i.height, ...(provisoire ? { provisoire: true } : {}) });
const cents = (amount: string) => Math.round(parseFloat(amount) * 100);
const int = (v?: { value: string } | null) => (v?.value ? parseInt(v.value, 10) : null);
const bool = (v?: { value: string } | null) => v?.value === "true";

/** Délai de fabrication d'une pièce : métachamps, ou délai provisoire de sa catégorie. */
function leadTimeOf(min: { value: string } | null | undefined, max: { value: string } | null | undefined, category: Category) {
  const fallback = DEFAULT_LEAD_TIME[category];
  const leadTime = normalizeLeadTime(int(min), int(max), fallback);
  return { leadTime, missing: !min?.value && !max?.value };
}
const list = (v?: { value: string } | null): string[] => {
  if (!v?.value) return [];
  try {
    const parsed = JSON.parse(v.value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [v.value];
  }
};

/** Métachamp de traçabilité (JSON saisi dans Shopify) ; ignoré s'il est mal formé. */
function parseTrace(value?: string): Product["trace"] {
  if (!value) return undefined;
  try {
    const t = JSON.parse(value) as { steps?: unknown; origins?: unknown };
    const steps = Array.isArray(t.steps) ? t.steps.filter((s) => s && typeof s.label === "string").map((s) => ({ label: String(s.label), place: String(s.place ?? ""), hours: Number.isFinite(Number(s.hours)) && s.hours != null ? Number(s.hours) : undefined })) : [];
    const origins = Array.isArray(t.origins) ? t.origins.filter((o) => o && typeof o.material === "string").map((o) => ({ material: String(o.material), origin: o.origin ? String(o.origin) : null })) : [];
    return steps.length || origins.length ? { steps, origins } : undefined;
  } catch {
    return undefined;
  }
}

const CATEGORY_MAP: Record<string, Category> = { robe: "robe", robes: "robe", body: "body", bodys: "body", top: "top", tops: "top", jupe: "jupe", jupes: "jupe", accessoire: "accessoire", accessoires: "accessoire" };

export function mapProduct(p: SProduct): Product {
  const provisoire = bool(p.imagesProvisional);
  const images = p.images.nodes.map((i) => toImage(i, p.title, provisoire));
  const video = p.media.nodes.find((m): m is { alt?: string; previewImage?: { url: string }; sources?: { url: string; mimeType: string; height: number }[] } => "sources" in m && Array.isArray(m.sources));
  const mp4 = video?.sources?.filter((s) => s.mimeType === "video/mp4").sort((a, b) => a.height - b.height)[0];
  const category = CATEGORY_MAP[p.productType.toLowerCase()] ?? "robe";
  const { leadTime, missing } = leadTimeOf(p.leadMin, p.leadMax, category);
  // pièce créée sur demande : le stock n'est pas lu ; une taille que Shopify refuse de vendre
  // (inventaire suivi sans « continuer à vendre ») est écartée plutôt que d'échouer au panier
  const refused = p.variants.nodes.filter((v) => !v.availableForSale);
  if (refused.length) console.warn(`[shopify] ${p.handle} : ${refused.length} taille(s) non vendable(s), activer « continuer à vendre » (ACTIVATION.md, 4.2)`);
  const variants: Variant[] = p.variants.nodes
    .filter((v) => v.availableForSale)
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      size: (v.selectedOptions.find((o) => /taille|size/i.test(o.name))?.value ?? "TU") as Size,
    }));
  let materials: Product["materials"] = [];
  try {
    materials = p.materials?.value ? JSON.parse(p.materials.value) : [];
  } catch {
    materials = [];
  }
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    tagline: p.tagline?.value ?? "",
    category,
    collection: p.collections.nodes[0]?.handle ?? "",
    price: cents(p.priceRange.minVariantPrice.amount),
    // tailles à des prix différents dans Shopify : l'Atelier ne les écrase pas par un prix unique
    ...(cents(p.priceRange.maxVariantPrice.amount) !== cents(p.priceRange.minVariantPrice.amount) ? { priceVaries: true } : {}),
    priceProvisional: bool(p.priceProvisional),
    leadTime,
    leadTimeProvisional: missing || bool(p.leadProvisional),
    isNew: bool(p.isNew) || p.tags.some((t) => t.toLowerCase() === "nouveau"),
    variants,
    images,
    detailImage: p.detailImage?.reference ? toImage(p.detailImage.reference.image, p.title, provisoire) : undefined,
    video: mp4 ? { src: mp4.url, poster: video?.previewImage?.url ?? "", alt: video?.alt ?? p.title } : undefined,
    description: p.description.split(/\n{2,}/).filter(Boolean),
    materials,
    lining: p.lining?.value,
    trace: parseTrace(p.traceability?.value),
    care: list(p.care),
    fit: p.fit?.value ?? "",
    model: p.model?.value ?? "",
    details: list(p.details),
    completeTheLook: p.completeTheLook?.references.nodes.map((n) => n.handle) ?? [],
    seo: { title: p.seo.title ?? `${p.title} | Awrea Paris`, description: p.seo.description ?? p.description.slice(0, 155) },
    tags: p.tags,
    publishedAt: p.publishedAt,
  };
}

export async function shopifyProducts(): Promise<Product[]> {
  const data = await storefront<{ products: { nodes: SProduct[] } }>(
    `query Products { products(first: 100, sortKey: CREATED_AT, reverse: true) { nodes { ${PRODUCT_FIELDS} } } }`,
    {},
    { tags: ["products"] },
  );
  return data.products.nodes.map(mapProduct);
}

export async function shopifyCollections(): Promise<Collection[]> {
  const data = await storefront<{
    collections: {
      nodes: {
        handle: string; title: string; description: string;
        image: SImage | null; seo: { title: string | null; description: string | null };
        season: { value: string } | null; current: { value: string } | null;
        products: { nodes: { handle: string; images: { nodes: SImage[] } }[] };
      }[];
    };
  }>(
    `query Collections { collections(first: 20) { nodes {
      handle title description image { url altText width height } seo { title description }
      season: metafield(namespace: "awrea", key: "season") { value }
      current: metafield(namespace: "awrea", key: "current") { value }
      products(first: 30) { nodes { handle images(first: 2) { nodes { url altText width height } } } }
    } } }`,
    {},
    { tags: ["collections"] },
  );
  return data.collections.nodes.map((c) => {
    const paragraphs = c.description.split(/\n{2,}/).filter(Boolean);
    const cover = c.image ? toImage(c.image, c.title) : toImage(c.products.nodes[0]?.images.nodes[0] ?? { url: "", altText: c.title, width: 1200, height: 1600 }, c.title);
    return {
      handle: c.handle,
      title: c.title,
      season: c.season?.value ?? "",
      current: c.current?.value === "true",
      lead: paragraphs[0] ?? "",
      intention: paragraphs.slice(1),
      cover,
      moodboard: c.products.nodes.flatMap((p) => p.images.nodes.slice(1, 2).map((i) => ({ image: toImage(i, c.title), caption: "", span: "tall" as const }))),
      products: c.products.nodes.map((p) => p.handle),
      seo: { title: c.seo.title ?? `${c.title} | Awrea Paris`, description: c.seo.description ?? c.description.slice(0, 155) },
    };
  });
}

/* ------------------------------------------------------------------ PANIER */

const CART_FIELDS = `
  id checkoutUrl totalQuantity note
  attributes { key value }
  discountCodes { code applicable }
  appliedGiftCards { lastCharacters amountUsed { amount } }
  cost { subtotalAmount { amount } totalAmount { amount } }
  discountAllocations { discountedAmount { amount } }
  lines(first: 50) { nodes {
    id quantity
    attributes { key value }
    merchandise { ... on ProductVariant {
      id
      price { amount }
      selectedOptions { name value }
      image { url altText width height }
      product { handle title productType
        leadMin: metafield(namespace: "awrea", key: "delai_min") { value }
        leadMax: metafield(namespace: "awrea", key: "delai_max") { value }
        imagesProvisional: metafield(namespace: "awrea", key: "visuels_provisoires") { value }
      }
    } }
  } }
`;

type SCart = {
  id: string; checkoutUrl: string; totalQuantity: number; note: string | null;
  attributes: { key: string; value: string }[];
  discountCodes: { code: string; applicable: boolean }[];
  appliedGiftCards: { lastCharacters: string; amountUsed: { amount: string } }[];
  cost: { subtotalAmount: { amount: string }; totalAmount: { amount: string } };
  discountAllocations: { discountedAmount: { amount: string } }[];
  lines: { nodes: {
    id: string; quantity: number;
    merchandise: {
      id: string; price: { amount: string };
      selectedOptions: { name: string; value: string }[];
      image: SImage | null;
      product: { handle: string; title: string; productType: string; leadMin: { value: string } | null; leadMax: { value: string } | null; imagesProvisional: { value: string } | null };
    };
  }[] };
};

const GIFT_WRAP_VARIANT = process.env.SHOPIFY_GIFT_WRAP_VARIANT_ID;

function mapCart(c: SCart): Cart {
  const attr = (k: string) => c.attributes.find((a) => a.key === k)?.value ?? "";
  const lines = c.lines.nodes
    .filter((l) => l.merchandise.id !== GIFT_WRAP_VARIANT)
    .map((l) => {
      const product = l.merchandise.product;
      const category = CATEGORY_MAP[product.productType.toLowerCase()] ?? "robe";
      return {
        id: l.id,
        variantId: l.merchandise.id,
        productHandle: product.handle,
        title: product.title,
        size: (l.merchandise.selectedOptions.find((o) => /taille|size/i.test(o.name))?.value ?? "TU") as Size,
        quantity: l.quantity,
        unitPrice: cents(l.merchandise.price.amount),
        image: l.merchandise.image ? toImage(l.merchandise.image, product.title, bool(product.imagesProvisional)) : { src: "", alt: "", width: 1, height: 1 },
        leadTime: leadTimeOf(product.leadMin, product.leadMax, category).leadTime,
      };
    });
  const subtotal = cents(c.cost.subtotalAmount.amount);
  const discountAmount = c.discountAllocations.reduce((s, d) => s + cents(d.discountedAmount.amount), 0);
  const code = c.discountCodes.find((d) => d.applicable)?.code;
  const giftUsed = c.appliedGiftCards.reduce((s, g) => s + cents(g.amountUsed.amount), 0);
  return {
    id: c.id,
    lines,
    subtotal,
    discount: code ? { code, amount: discountAmount, label: code } : null,
    giftCard: c.appliedGiftCards[0] ? { code: `•••• ${c.appliedGiftCards[0].lastCharacters}`, amount: giftUsed } : null,
    gift: { wrap: attr("Emballage cadeau") === "Oui", message: attr("Message cadeau"), hidePrices: attr("Prix masqués") !== "Non", deliveryDate: attr("Livraison souhaitée le") || null },
    giftWrapPrice: shop.giftWrapPrice,
    shippingEstimate: null,
    freeShippingThreshold: shop.freeShippingThreshold,
    total: cents(c.cost.totalAmount.amount),
    totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    checkoutUrl: c.checkoutUrl,
    mode: "shopify",
  };
}

export async function shopifyCartGet(id: string | null): Promise<Cart | null> {
  if (!id) return null;
  const d = await storefront<{ cart: SCart | null }>(`query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, { id }, { revalidate: 0 });
  return d.cart ? mapCart(d.cart) : null;
}

export async function shopifyCartCreate(lines: { merchandiseId: string; quantity: number }[]): Promise<Cart> {
  const d = await storefront<{ cartCreate: { cart: SCart } }>(
    `mutation Create($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    { lines },
    { revalidate: 0 },
  );
  return mapCart(d.cartCreate.cart);
}

export async function shopifyCartMutate(op: "add" | "update" | "remove" | "discount" | "giftcard" | "attributes" | "buyer", cartId: string, payload: unknown): Promise<Cart> {
  const M: Record<typeof op, string> = {
    add: `mutation M($cartId: ID!, $p: [CartLineInput!]!) { r: cartLinesAdd(cartId: $cartId, lines: $p) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    update: `mutation M($cartId: ID!, $p: [CartLineUpdateInput!]!) { r: cartLinesUpdate(cartId: $cartId, lines: $p) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    remove: `mutation M($cartId: ID!, $p: [ID!]!) { r: cartLinesRemove(cartId: $cartId, lineIds: $p) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    discount: `mutation M($cartId: ID!, $p: [String!]) { r: cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $p) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    giftcard: `mutation M($cartId: ID!, $p: [String!]!) { r: cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $p) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    attributes: `mutation M($cartId: ID!, $p: [AttributeInput!]!) { r: cartAttributesUpdate(cartId: $cartId, attributes: $p) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    buyer: `mutation M($cartId: ID!, $p: CartBuyerIdentityInput!) { r: cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $p) { cart { ${CART_FIELDS} } userErrors { message } } }`,
  };
  const d = await storefront<{ r: { cart: SCart; userErrors: { message: string }[] } }>(M[op], { cartId, p: payload }, { revalidate: 0 });
  if (d.r.userErrors?.length) throw new Error(d.r.userErrors.map((e) => e.message).join(" ; "));
  return mapCart(d.r.cart);
}

export { GIFT_WRAP_VARIANT };

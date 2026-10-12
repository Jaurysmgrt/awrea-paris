/**
 * Panier côté serveur. Même forme de données pour les deux pilotes.
 *  - démo : l'état du panier tient dans un cookie (lignes, code, carte cadeau, emballage) ;
 *  - Shopify : l'identifiant du panier Shopify est conservé en cookie, tout le reste vit chez Shopify.
 */
import { cookies } from "next/headers";
import { shop } from "@/content/settings";
import { GIFT_WRAP_VARIANT, shopifyCartCreate, shopifyCartGet, shopifyCartMutate, shopifyEnabled } from "@/lib/shopify/storefront";
import { getAllProducts } from "./index";
import { editionInfo } from "./availability";
import type { Cart, Product } from "./types";

export const CART_COOKIE = "awrea_cart";
const MAX_AGE = 60 * 60 * 24 * 30;

interface DemoState {
  l: { v: string; q: number }[];
  d: string | null;
  g: string | null;
  w: boolean;
  m: string;
}

const emptyState = (): DemoState => ({ l: [], d: null, g: null, w: false, m: "" });

export type CartAction =
  | { type: "add"; variantId: string; quantity?: number }
  | { type: "addMany"; variantIds: string[] }
  | { type: "update"; lineId: string; quantity: number }
  | { type: "remove"; lineId: string }
  | { type: "discount"; code: string }
  | { type: "giftCard"; code: string }
  | { type: "gift"; wrap: boolean; message: string }
  | { type: "clear" };

export class CartError extends Error {}

/* ------------------------------------------------------------------- DÉMO */

function findVariant(products: Product[], variantId: string) {
  for (const p of products) {
    const v = p.variants.find((x) => x.id === variantId);
    if (v) return { p, v };
  }
  return null;
}

export function computeDemoCart(state: DemoState, products: Product[]): Cart {
  const lines = state.l
    .map((l) => {
      const found = findVariant(products, l.v);
      if (!found) return null;
      const { p, v } = found;
      const ed = editionInfo(p);
      return {
        id: v.id,
        variantId: v.id,
        productHandle: p.handle,
        title: p.title,
        size: v.size,
        quantity: l.q,
        unitPrice: p.price,
        image: p.images[0],
        preorder: v.quantity < l.q,
        leadTimeWeeks: p.leadTimeWeeks,
        editionLabel: ed.unique ? "Pièce unique" : ed.complete ? "Sur commande" : ed.label,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const rule = state.d ? shop.demoDiscounts.find((d) => d.code === state.d) : undefined;
  const discountAmount = rule ? (rule.type === "percent" ? Math.round((subtotal * rule.value) / 100) : Math.min(rule.value, subtotal)) : 0;
  const wrap = state.w && lines.length > 0 ? shop.giftWrapPrice : 0;
  const afterDiscount = subtotal - discountAmount + wrap;
  const card = state.g ? shop.demoGiftCards.find((g) => g.code === state.g) : undefined;
  const giftAmount = card ? Math.min(card.balance, afterDiscount) : 0;
  const shippingEstimate = lines.length === 0 ? null : subtotal - discountAmount >= shop.freeShippingThreshold ? 0 : null;

  return {
    id: "demo",
    lines,
    subtotal,
    discount: rule ? { code: rule.code, amount: discountAmount, label: rule.label } : null,
    giftCard: card ? { code: card.code, amount: giftAmount } : null,
    gift: { wrap: state.w, message: state.m },
    giftWrapPrice: shop.giftWrapPrice,
    shippingEstimate,
    freeShippingThreshold: shop.freeShippingThreshold,
    total: Math.max(0, afterDiscount - giftAmount),
    totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    checkoutUrl: "/commande",
    mode: "demo",
  };
}

function parseState(raw: string | undefined): DemoState {
  if (!raw) return emptyState();
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as DemoState;
    return { ...emptyState(), ...s };
  } catch {
    return emptyState();
  }
}

const serialize = (s: DemoState) => Buffer.from(JSON.stringify(s), "utf8").toString("base64url");

async function demoApply(state: DemoState, action: CartAction): Promise<DemoState> {
  const products = await getAllProducts();
  const s: DemoState = { ...state, l: [...state.l] };
  const addOne = (variantId: string, qty: number) => {
    const found = findVariant(products, variantId);
    if (!found) throw new CartError("Cette pièce n’existe plus.");
    const { p, v } = found;
    if (v.quantity <= 0 && !v.preorder) throw new CartError(`${p.title} est épuisée dans cette taille.`);
    const existing = s.l.find((l) => l.v === variantId);
    const nextQty = (existing?.q ?? 0) + qty;
    const ed = editionInfo(p);
    const cap = v.preorder ? Math.max(v.quantity, Math.max(1, ed.remaining), 2) : v.quantity;
    if (nextQty > cap) throw new CartError(`Il ne reste que ${cap} pièce${cap > 1 ? "s" : ""} de ${p.title} dans cette taille.`);
    if (existing) existing.q = nextQty;
    else s.l.push({ v: variantId, q: qty });
  };
  switch (action.type) {
    case "add":
      addOne(action.variantId, action.quantity ?? 1);
      break;
    case "addMany":
      for (const id of action.variantIds) addOne(id, 1);
      break;
    case "update": {
      const line = s.l.find((l) => l.v === action.lineId);
      if (!line) break;
      if (action.quantity <= 0) s.l = s.l.filter((l) => l.v !== action.lineId);
      else {
        const delta = action.quantity - line.q;
        if (delta > 0) addOne(line.v, delta);
        else line.q = action.quantity;
      }
      break;
    }
    case "remove":
      s.l = s.l.filter((l) => l.v !== action.lineId);
      break;
    case "discount": {
      const code = action.code.trim().toUpperCase();
      if (!code) {
        s.d = null;
        break;
      }
      if (!shop.demoDiscounts.some((d) => d.code === code)) throw new CartError("Ce code n’est pas valable.");
      s.d = code;
      break;
    }
    case "giftCard": {
      const code = action.code.trim().toUpperCase();
      if (!code) {
        s.g = null;
        break;
      }
      if (!shop.demoGiftCards.some((g) => g.code === code)) throw new CartError("Cette carte cadeau n’est pas reconnue.");
      s.g = code;
      break;
    }
    case "gift":
      s.w = action.wrap;
      s.m = action.message.slice(0, 300);
      break;
    case "clear":
      return emptyState();
  }
  return s;
}

/* ---------------------------------------------------------------- SHOPIFY */

async function shopifyApply(cartId: string | null, action: CartAction): Promise<Cart> {
  if (action.type === "add" || action.type === "addMany") {
    const lines = action.type === "add" ? [{ merchandiseId: action.variantId, quantity: action.quantity ?? 1 }] : action.variantIds.map((id) => ({ merchandiseId: id, quantity: 1 }));
    if (!cartId) return shopifyCartCreate(lines);
    return shopifyCartMutate("add", cartId, lines);
  }
  if (!cartId) return shopifyCartCreate([]);
  switch (action.type) {
    case "update":
      return shopifyCartMutate("update", cartId, [{ id: action.lineId, quantity: action.quantity }]);
    case "remove":
      return shopifyCartMutate("remove", cartId, [action.lineId]);
    case "discount":
      return shopifyCartMutate("discount", cartId, action.code ? [action.code] : []);
    case "giftCard":
      return shopifyCartMutate("giftcard", cartId, action.code ? [action.code] : []);
    case "gift": {
      const cart = await shopifyCartMutate("attributes", cartId, [
        { key: "Emballage cadeau", value: action.wrap ? "Oui" : "Non" },
        { key: "Message cadeau", value: action.message.slice(0, 300) },
      ]);
      if (GIFT_WRAP_VARIANT && action.wrap && !cart.lines.some((l) => l.variantId === GIFT_WRAP_VARIANT)) {
        return shopifyCartMutate("add", cartId, [{ merchandiseId: GIFT_WRAP_VARIANT, quantity: 1 }]);
      }
      return cart;
    }
    case "clear":
      return shopifyCartCreate([]);
  }
}

/* ------------------------------------------------------------------ API */

export async function readCart(): Promise<Cart> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (shopifyEnabled) {
    const cart = await shopifyCartGet(raw ?? null).catch(() => null);
    if (cart) return cart;
  }
  return computeDemoCart(parseState(shopifyEnabled ? undefined : raw), await getAllProducts());
}

export async function applyCartAction(action: CartAction): Promise<Cart> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE };
  if (shopifyEnabled) {
    const cart = await shopifyApply(raw ?? null, action);
    jar.set(CART_COOKIE, cart.id, opts);
    return cart;
  }
  const next = await demoApply(parseState(raw), action);
  jar.set(CART_COOKIE, serialize(next), opts);
  return computeDemoCart(next, await getAllProducts());
}

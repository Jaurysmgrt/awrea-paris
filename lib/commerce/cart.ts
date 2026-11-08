/**
 * Panier côté serveur : son état tient dans un cookie (lignes, code, carte cadeau, emballage), les
 * prix et les pièces sont toujours relus dans le catalogue de la Maison.
 */
import { cookies } from "next/headers";
import { shop } from "@/content/settings";
import { legalVersions } from "@/content/legal-versions";
import { getAllProducts } from "./index";
import { longestLeadTime, MAX_PER_LINE, overLineLimit } from "./availability";
import { earliestGiftDate, latestGiftDate } from "./international";
import type { Cart, Product } from "./types";

export const CART_COOKIE = "awrea_cart";
const MAX_AGE = 60 * 60 * 24 * 30;
export { MAX_PER_LINE };
const tooMany = () => new CartError(`Pour plus de ${MAX_PER_LINE} pièces identiques, écrivez à la Maison : nous en parlerons ensemble.`);

interface DemoState {
  l: { v: string; q: number }[];
  d: string | null;
  g: string | null;
  w: boolean;
  m: string;
  /** prix masqués sur le bon de livraison */
  h?: boolean;
  /** date de livraison souhaitée */
  dd?: string | null;
}

const emptyState = (): DemoState => ({ l: [], d: null, g: null, w: false, m: "", h: true, dd: null });

export type CartAction =
  | { type: "add"; variantId: string; quantity?: number }
  | { type: "addMany"; variantIds: string[] }
  | { type: "update"; lineId: string; quantity: number }
  | { type: "remove"; lineId: string }
  | { type: "discount"; code: string }
  | { type: "giftCard"; code: string }
  | { type: "gift"; wrap: boolean; message: string; hidePrices?: boolean; deliveryDate?: string | null }
  /** passage au paiement : preuve d'acceptation des CGV, canal d'origine, e-mail de la cliente connectée */
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
      return {
        id: v.id,
        variantId: v.id,
        productHandle: p.handle,
        title: p.title,
        size: v.size,
        quantity: l.q,
        unitPrice: p.price,
        image: p.images[0],
        leadTime: p.leadTime,
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
    gift: { wrap: state.w, message: state.m, hidePrices: state.h ?? true, deliveryDate: state.dd ?? null },
    giftWrapPrice: shop.giftWrapPrice,
    shippingEstimate,
    freeShippingThreshold: shop.freeShippingThreshold,
    total: Math.max(0, afterDiscount - giftAmount),
    totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    checkoutUrl: "/commande",
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
  // chaque pièce est créée sur demande : toutes les tailles se commandent, sans stock à vérifier
  const addOne = (variantId: string, qty: number) => {
    const found = findVariant(products, variantId);
    if (!found) throw new CartError("Cette pièce n’existe plus.");
    const existing = s.l.find((l) => l.v === variantId);
    const nextQty = (existing?.q ?? 0) + qty;
    if (overLineLimit(() => existing?.q ?? 0, [{ variantId, quantity: qty }]).length) throw tooMany();
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
      if (action.hidePrices !== undefined) s.h = action.hidePrices;
      if (action.deliveryDate !== undefined) s.dd = checkGiftDate(action.deliveryDate, products, s.l);
      break;
    case "clear":
      return emptyState();
  }
  return s;
}

/** Date de livraison souhaitée : vide, ou au plus tôt après fabrication et expédition, au plus tard dans six mois. */
function checkGiftDate(date: string | null, products: Product[], lines: { v: string }[]): string | null {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CartError("Cette date n’est pas valable.");
  // la commande part quand sa dernière pièce est prête : délai maximal de la plus longue fabrication
  const weeks = longestLeadTime(lines.map((l) => findVariant(products, l.v)?.p.leadTime).filter((t) => t !== undefined))?.max ?? 0;
  if (date < earliestGiftDate(weeks)) throw new CartError(`Livraison possible à partir du ${new Date(earliestGiftDate(weeks)).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`);
  if (date > latestGiftDate()) throw new CartError("Choisissez une date dans les six prochains mois.");
  return date;
}

/* ------------------------------------------------------------------ API */

export async function readCart(): Promise<Cart> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  return computeDemoCart(parseState(raw), await getAllProducts());
}

export async function applyCartAction(action: CartAction): Promise<Cart> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE };
  const next = await demoApply(parseState(raw), action);
  jar.set(CART_COOKIE, serialize(next), opts);
  return computeDemoCart(next, await getAllProducts());
}

/**
 * Panier côté serveur : son état tient dans un cookie (lignes, code, carte cadeau, emballage), les
 * prix et les pièces sont toujours relus dans le catalogue de la Maison.
 *
 * Paiement Stripe : le panier reste intact pendant le paiement (une cliente qui renonce le retrouve),
 * et garde la commande ouverte. Dès que cette commande est payée, le panier se lit vide, même si la
 * cliente a fermé la page de Stripe avant d'en revenir : la même commande n'est jamais repassée.
 */
import { cookies } from "next/headers";
import { shop } from "@/content/settings";
import { legalVersions } from "@/content/legal-versions";
import { getAllProducts } from "./index";
import { getOrder } from "./orders";
import { boutiqueReelle } from "@/lib/config/boutique";
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
  /** commande ouverte pour ce panier (paiement Stripe en cours) */
  c?: string;
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
  // codes et cartes d'essai : démonstration seulement, jamais sur la boutique réelle
  const essai = !boutiqueReelle();
  const rule = essai && state.d ? shop.demoDiscounts.find((d) => d.code === state.d) : undefined;
  const discountAmount = rule ? (rule.type === "percent" ? Math.round((subtotal * rule.value) / 100) : Math.min(rule.value, subtotal)) : 0;
  const wrap = state.w && lines.length > 0 ? shop.giftWrapPrice : 0;
  const afterDiscount = subtotal - discountAmount + wrap;
  const card = essai && state.g ? shop.demoGiftCards.find((g) => g.code === state.g) : undefined;
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
      if (boutiqueReelle() || !shop.demoDiscounts.some((d) => d.code === code)) throw new CartError("Ce code n’est pas valable.");
      s.d = code;
      break;
    }
    case "giftCard": {
      const code = action.code.trim().toUpperCase();
      if (!code) {
        s.g = null;
        break;
      }
      if (boutiqueReelle() || !shop.demoGiftCards.some((g) => g.code === code)) throw new CartError("Cette carte cadeau n’est pas reconnue.");
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

const OPTIONS_COOKIE = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE };

/** État du panier ; vide si la commande ouverte pour lui a été payée entre-temps. */
async function etatCourant(raw: string | undefined): Promise<DemoState> {
  const state = parseState(raw);
  if (!state.c) return state;
  const o = await getOrder(state.c).catch(() => null);
  return o && o.status !== "pending" ? emptyState() : state;
}

export async function readCart(): Promise<Cart> {
  const jar = await cookies();
  return computeDemoCart(await etatCourant(jar.get(CART_COOKIE)?.value), await getAllProducts());
}

export async function applyCartAction(action: CartAction): Promise<Cart> {
  const jar = await cookies();
  const next = await demoApply(await etatCourant(jar.get(CART_COOKIE)?.value), action);
  jar.set(CART_COOKIE, serialize(next), OPTIONS_COOKIE);
  return computeDemoCart(next, await getAllProducts());
}

/** Note sur le panier la commande ouverte pour lui (route de commande, paiement Stripe). */
export async function noterCommandeOuverte(commande: string): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, serialize({ ...parseState(jar.get(CART_COOKIE)?.value), c: commande }), OPTIONS_COOKIE);
}

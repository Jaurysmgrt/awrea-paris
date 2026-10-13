/**
 * Évènements de mesure, côté navigateur. Ils ne partent que vers les outils déjà chargés,
 * c'est-à-dire acceptés par la cliente (voir components/analytics/Trackers.tsx) :
 * Plausible ou GA4 pour l'audience, Meta Pixel, TikTok et Google Ads pour la publicité.
 */
export type TrackEvent =
  | { name: "view_item"; handle: string; title: string; price: number }
  | { name: "add_to_cart"; handle: string; title: string; price: number; size: string }
  | { name: "begin_checkout"; value: number; items: number }
  | { name: "purchase"; value: number; number: string; items: number }
  | { name: "sign_up" }
  | { name: "newsletter" };

type W = Window & {
  plausible?: (event: string, opts?: { props?: Record<string, string | number>; revenue?: { currency: string; amount: number } }) => void;
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track?: (...args: unknown[]) => void };
  __awreaAds?: { googleAds?: string; googleAdsLabel?: string };
};

const euros = (cents: number) => Math.round(cents) / 100;

export function track(e: TrackEvent) {
  if (typeof window === "undefined") return;
  const w = window as W;
  const value = "value" in e ? euros(e.value) : "price" in e ? euros(e.price) : undefined;
  // audience (Plausible ou GA4)
  if (w.plausible) {
    const props: Record<string, string | number> = {};
    if ("handle" in e) props.piece = e.handle;
    if ("size" in e) props.taille = e.size;
    w.plausible(e.name, { props, revenue: e.name === "purchase" && value ? { currency: "EUR", amount: value } : undefined });
  }
  if (w.gtag) {
    const items = "handle" in e ? [{ item_id: e.handle, item_name: e.title, price: euros(e.price), item_variant: "size" in e ? e.size : undefined }] : undefined;
    w.gtag("event", e.name, { currency: "EUR", value, items, transaction_id: e.name === "purchase" ? e.number : undefined });
  }
  // publicité (Meta, Google Ads)
  if (w.fbq) {
    const map: Partial<Record<TrackEvent["name"], string>> = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", sign_up: "CompleteRegistration", newsletter: "Lead" };
    const name = map[e.name];
    if (name) w.fbq("track", name, { currency: "EUR", value, content_ids: "handle" in e ? [e.handle] : undefined, content_type: "product" });
  }
  if (w.ttq?.track) {
    const map: Partial<Record<TrackEvent["name"], string>> = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "CompletePayment", sign_up: "CompleteRegistration", newsletter: "Subscribe" };
    const name = map[e.name];
    if (name) w.ttq.track(name, { currency: "EUR", value, contents: "handle" in e ? [{ content_id: e.handle, content_type: "product", content_name: e.title }] : undefined });
  }
  if (e.name === "purchase" && w.gtag && w.__awreaAds?.googleAds && w.__awreaAds.googleAdsLabel) {
    w.gtag("event", "conversion", { send_to: `${w.__awreaAds.googleAds}/${w.__awreaAds.googleAdsLabel}`, value, currency: "EUR", transaction_id: e.number });
  }
}

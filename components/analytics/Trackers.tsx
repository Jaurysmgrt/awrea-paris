"use client";
/**
 * Outils de mesure, chargés UNIQUEMENT après accord (aucun script ni cookie avant) :
 *  - mesure d'audience : Plausible (sans cookie, hébergé dans l'UE) ou Google Analytics 4 ;
 *    Microsoft Clarity (cartes de chaleur, enregistrements de visite masqués) en complément ;
 *  - publicité : Meta Pixel (Instagram, Facebook), pixel TikTok et balise Google Ads.
 * Sans identifiant configuré, rien n'est chargé. Les pages vues suivent la navigation.
 */
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useConsent } from "@/components/consent/ConsentProvider";
import { captureSource } from "./source";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.manual.revenue.js";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_ADS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

/** File d'attente des pixels : les appels faits avant le chargement du script sont rejoués. */
type Queue = ((...args: unknown[]) => void) & { q?: unknown[] };
type TikTok = unknown[] & Record<string, unknown> & { page?: () => void; track?: (...a: unknown[]) => void };

type W = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  plausible?: ((...args: unknown[]) => void) & { q?: unknown[] };
  fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
  clarity?: Queue;
  ttq?: TikTok;
  TiktokAnalyticsObject?: string;
  __awreaAds?: { googleAds?: string; googleAdsLabel?: string };
};

function inject(src: string, attrs: Record<string, string> = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

function ensureGtag(id: string) {
  const w = window as W;
  if (!w.gtag) {
    w.dataLayer = w.dataLayer ?? [];
    w.gtag = function gtag() {
      w.dataLayer!.push(arguments);
    };
    w.gtag("js", new Date());
  }
  inject(`https://www.googletagmanager.com/gtag/js?id=${id}`);
}

export function Trackers() {
  const { has } = useConsent();
  const analytics = has("analytics");
  const advertising = has("advertising");
  const pathname = usePathname();
  const search = useSearchParams();
  const loaded = useRef({ plausible: false, ga: false, meta: false, ads: false, clarity: false, tiktok: false });

  useEffect(() => {
    const w = window as W;
    if (analytics) {
      captureSource();
      if (PLAUSIBLE_DOMAIN && !loaded.current.plausible) {
        loaded.current.plausible = true;
        w.plausible =
          w.plausible ??
          Object.assign(
            (...args: unknown[]) => {
              (w.plausible!.q = w.plausible!.q ?? []).push(args);
            },
            { q: [] as unknown[] },
          );
        inject(PLAUSIBLE_SRC, { "data-domain": PLAUSIBLE_DOMAIN, defer: "" });
      } else if (GA4_ID && !loaded.current.ga) {
        loaded.current.ga = true;
        ensureGtag(GA4_ID);
        // pages vues envoyées à la main (navigation sans rechargement)
        w.gtag!("config", GA4_ID, { send_page_view: false, anonymize_ip: true });
      }
      if (CLARITY_ID && !loaded.current.clarity) {
        loaded.current.clarity = true;
        w.clarity = w.clarity ?? Object.assign((...args: unknown[]) => void (w.clarity!.q = w.clarity!.q ?? []).push(args), { q: [] as unknown[] });
        inject(`https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`);
        // accord explicite déjà donné (exigence de Microsoft pour l'Espace économique européen)
        w.clarity("consentv2", { analytics_Storage: "granted", ad_Storage: advertising ? "granted" : "denied" });
      }
    }
    if (advertising) {
      if (META_PIXEL_ID && !loaded.current.meta) {
        loaded.current.meta = true;
        if (!w.fbq) {
          const fbq = function (...args: unknown[]) {
            if (fbq.callMethod) fbq.callMethod(...args);
            else fbq.queue!.push(args);
          } as W["fbq"] & object;
          fbq.queue = [];
          fbq.loaded = true;
          fbq.version = "2.0";
          w.fbq = fbq;
          w._fbq = fbq;
        }
        inject("https://connect.facebook.net/en_US/fbevents.js");
        w.fbq!("init", META_PIXEL_ID);
      }
      if (GOOGLE_ADS_ID && !loaded.current.ads) {
        loaded.current.ads = true;
        ensureGtag(GOOGLE_ADS_ID);
        w.gtag!("config", GOOGLE_ADS_ID);
        w.__awreaAds = { googleAds: GOOGLE_ADS_ID, googleAdsLabel: GOOGLE_ADS_LABEL };
      }
      if (TIKTOK_PIXEL_ID && !loaded.current.tiktok) {
        loaded.current.tiktok = true;
        // amorce officielle du pixel TikTok, réécrite sans script en ligne (CSP)
        const methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
        const defer = (target: Record<string, unknown> & unknown[], m: string) => {
          target[m] = (...args: unknown[]) => void target.push([m, ...args]);
        };
        const ttq = (w.ttq = w.ttq ?? ([] as unknown as TikTok));
        w.TiktokAnalyticsObject = "ttq";
        for (const m of methods) defer(ttq, m);
        const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
        const instances = ((ttq._i as Record<string, unknown[] & { _u?: string }>) ??= {});
        instances[TIKTOK_PIXEL_ID] = Object.assign([], { _u: src });
        ((ttq._t as Record<string, number>) ??= {})[TIKTOK_PIXEL_ID] = Date.now();
        ((ttq._o as Record<string, unknown>) ??= {})[TIKTOK_PIXEL_ID] = {};
        inject(`${src}?sdkid=${encodeURIComponent(TIKTOK_PIXEL_ID)}&lib=ttq`);
      }
    }
  }, [analytics, advertising]);

  // page vue à chaque navigation
  useEffect(() => {
    const w = window as W;
    const url = window.location.href;
    if (analytics && loaded.current.plausible) w.plausible?.("pageview", { u: url });
    if (analytics && loaded.current.ga && GA4_ID) w.gtag?.("event", "page_view", { page_location: url, page_title: document.title });
    if (advertising && loaded.current.meta) w.fbq?.("track", "PageView");
    if (advertising && loaded.current.tiktok) w.ttq?.page?.();
  }, [pathname, search, analytics, advertising]);

  return null;
}

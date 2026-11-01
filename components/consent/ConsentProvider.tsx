"use client";
/**
 * Consentement aux cookies (RGPD, recommandations CNIL) :
 * - aucun traceur non nécessaire avant un choix explicite ;
 * - « Refuser » aussi simple et visible qu'« Accepter », choix par catégorie ;
 * - choix mémorisé 13 mois puis redemandé, modifiable à tout moment (« Gérer mes cookies ») ;
 * - chaque choix est enregistré côté serveur comme preuve (/api/consent) ;
 * - choix obligatoire (choix de la créatrice du 01/11) : tant qu'aucun choix n'est fait, un voile
 *   couvre la page, qui ne défile plus et ne reçoit plus le clavier ; Refuser, Accepter et Choisir
 *   restent aussi simples l'un que l'autre. Les pages à lire avant de choisir (LIRE_AVANT) ne sont
 *   pas voilées.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/routing";
import {
  ALL_CHOICES,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  CONSENT_OPEN_EVENT,
  CONSENT_POLICY_VERSION,
  NO_CHOICE,
  OPTIONAL_CATEGORIES,
  encodeConsent,
  newConsentId,
  parseConsent,
  type Consent,
  type ConsentChoices,
  type OptionalCategory,
} from "@/lib/consent";
import { cookieInventory } from "@/content/fr/cookies";
import { CookieBanner } from "./CookieBanner";

/** Pages à pouvoir lire avant de choisir : jamais voilées. */
const LIRE_AVANT = new Set(["/cookies", "/confidentialite", "/mentions-legales"]);

type LenisLike = { stop: () => void; start: () => void };
const lenis = () => (window as unknown as { __lenis?: LenisLike }).__lenis;

/**
 * Le reste de la page devient inerte (ni clic, ni clavier, ni lecteur d'écran) : à chaque niveau,
 * depuis le bandeau jusqu'à <body>, les éléments voisins. Renvoie de quoi tout rétablir.
 */
function inertAround(keep: Element[]): () => void {
  const changed: Element[] = [];
  let node: Element | null = keep[0] ?? null;
  while (node && node.parentElement && node !== document.body) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (keep.some((k) => sibling === k || sibling.contains(k)) || sibling.hasAttribute("inert") || sibling.tagName === "SCRIPT") continue;
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }
    node = node.parentElement;
  }
  return () => changed.forEach((el) => el.removeAttribute("inert"));
}

type Ctx = {
  /** null tant qu'aucun choix valide n'existe */
  consent: Consent | null;
  has: (category: OptionalCategory) => boolean;
  openSettings: () => void;
};

const ConsentContext = createContext<Ctx>({ consent: null, has: () => false, openSettings: () => {} });
export const useConsent = () => useContext(ConsentContext);

/** Le cookie de consentement est la source de vérité ; la page est prévenue à chaque nouveau choix. */
const CONSENT_CHANGE_EVENT = "awrea:consent-change";
const COOKIE_RE = new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`);
const cookieSnapshot = () => document.cookie.match(COOKIE_RE)?.[1] ?? "";
const serverSnapshot = () => null;
function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
}

function readConsent(): Consent | null {
  return parseConsent(cookieSnapshot());
}

/** Efface les traceurs d'une catégorie retirée (cookies tiers sur le domaine et le domaine parent, stockage local). */
function clearCategory(category: OptionalCategory) {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  const names = document.cookie.split("; ").map((c) => c.split("=")[0]);
  for (const entry of cookieInventory.filter((e) => e.category === category)) {
    if (entry.clearPrefix) {
      for (const name of names.filter((n) => n.startsWith(entry.clearPrefix!))) {
        for (const d of domains) document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
      }
    }
    if (entry.kind !== "cookie") {
      try {
        localStorage.removeItem(entry.name);
      } catch {
        /* stockage indisponible */
      }
    }
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribeConsent, cookieSnapshot, serverSnapshot);
  const consent = useMemo(() => (raw === null ? null : parseConsent(raw)), [raw]);
  // rendu ouvert côté serveur ; le script de <head> le masque avant affichage si un choix valide existe
  const [reopened, setReopened] = useState(false);
  const [details, setDetails] = useState(false);
  const open = reopened || !consent;
  const pathname = usePathname();
  const blocking = !consent && !LIRE_AVANT.has(stripLocale(pathname));

  // choix obligatoire : la page ne défile plus et ne reçoit plus le clavier tant qu'il n'est pas fait
  useEffect(() => {
    if (!blocking) return;
    const root = document.documentElement;
    root.classList.add("consent-bloque");
    lenis()?.stop();
    const banner = document.querySelector<HTMLElement>(".consent");
    const veil = document.querySelector(".consent-veil");
    const restore = banner ? inertAround([banner, veil].filter((e): e is Element => Boolean(e))) : () => {};
    banner?.focus({ preventScroll: true });
    return () => {
      restore();
      root.classList.remove("consent-bloque");
      lenis()?.start();
    };
  }, [blocking]);

  useEffect(() => {
    // choix expiré (13 mois) ou nouvelle politique : le bandeau redevient visible
    if (!readConsent()) delete document.documentElement.dataset.consent;
    const reopen = () => {
      delete document.documentElement.dataset.consent;
      setReopened(true);
      setDetails(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  const save = useCallback(
    (choices: ConsentChoices, source: "banner" | "settings") => {
      const previous = consent;
      const next: Consent = { id: previous?.id ?? newConsentId(), date: Date.now(), policy: CONSENT_POLICY_VERSION, ...choices };
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${CONSENT_COOKIE}=${encodeConsent(next)}; Max-Age=${CONSENT_MAX_AGE_DAYS * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
      document.documentElement.dataset.consent = "set";
      window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
      setReopened(false);
      setDetails(false);
      fetch("/api/consent", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: next.id, ...choices, policy: next.policy, source, path: location.pathname }),
      }).catch(() => {});
      const withdrawn = OPTIONAL_CATEGORIES.filter((k) => previous?.[k] && !choices[k]);
      withdrawn.forEach(clearCategory);
      // des scripts tiers déjà chargés ne se déchargent pas : on recharge la page
      if (withdrawn.some((k) => k !== "personalization")) window.setTimeout(() => location.reload(), 150);
    },
    [consent],
  );

  const value = useMemo<Ctx>(
    () => ({
      consent,
      has: (k) => Boolean(consent?.[k]),
      openSettings: () => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT)),
    }),
    [consent],
  );

  return (
    <ConsentContext.Provider value={value}>
      {blocking ? <div className="consent-veil" aria-hidden="true" /> : null}
      {open ? (
        <CookieBanner
          blocking={blocking}
          details={details}
          current={consent ?? NO_CHOICE}
          onDetails={() => setDetails(true)}
          onAcceptAll={() => save(ALL_CHOICES, details ? "settings" : "banner")}
          onRefuseAll={() => save(NO_CHOICE, details ? "settings" : "banner")}
          onSave={(c) => save(c, "settings")}
        />
      ) : null}
      {children}
    </ConsentContext.Provider>
  );
}

/** Lien du pied de page : rouvre le gestionnaire de consentement. */
export function CookieSettingsButton({ className = "link link--quiet" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      Gérer mes cookies
    </button>
  );
}

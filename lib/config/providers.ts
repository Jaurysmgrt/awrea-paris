/**
 * Interrupteurs des services extérieurs.
 *
 * Chaque service a deux versions : la vraie (Shopify, Supabase, Resend…) et une simulation qui
 * fonctionne sans compte ni clé, en local. La variable `<SERVICE>_PROVIDER` choisit :
 *  - `mock` : simulation forcée, même si les clés sont présentes (démonstration, tests) ;
 *  - le nom d'un prestataire (`shopify`, `supabase`…) : appliqué seulement si toutes ses clés
 *    sont présentes ; sinon le site bascule sur la simulation, sans planter, et le signale dans
 *    les journaux du serveur et dans l'Atelier (Réglages) ;
 *  - absente : le prestataire réel dès que ses clés sont présentes, la simulation sinon.
 *
 * Seule la PRÉSENCE des clés est lue ici ; leur valeur ne sort jamais de ce module.
 * Le mode d'emploi pour brancher chaque service : ACTIVATION.md.
 */

/** Une clé, ou plusieurs noms acceptés pour la même clé (le premier présent suffit). */
type Key = string | readonly string[];

interface ProviderSpec {
  label: string;
  keys: readonly Key[];
  /** prestataire sans clé (service public gratuit) : utilisé seulement s'il est demandé explicitement */
  optIn?: boolean;
}

interface ServiceSpec {
  label: string;
  /** variable d'interrupteur */
  env: string;
  /** libellé de la simulation */
  mock: string;
  providers: Record<string, ProviderSpec>;
}

export const SERVICES = {
  commerce: {
    label: "Boutique et paiement",
    env: "COMMERCE_PROVIDER",
    mock: "Boutique de démonstration (catalogue, stocks et commandes simulés)",
    providers: { shopify: { label: "Shopify", keys: ["SHOPIFY_STORE_DOMAIN", ["SHOPIFY_STOREFRONT_PRIVATE_TOKEN", "SHOPIFY_STOREFRONT_ACCESS_TOKEN"]] } },
  },
  customers: {
    label: "Base clientes et comptes",
    env: "CUSTOMERS_PROVIDER",
    mock: "Comptes et données clientes dans le stockage local",
    providers: {
      supabase: {
        label: "Supabase",
        keys: [["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"], ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"], "SUPABASE_SERVICE_ROLE_KEY"],
      },
    },
  },
  store: {
    label: "Stockage technique",
    env: "STORE_PROVIDER",
    mock: "Fichier local (.data/store.json)",
    providers: {
      upstash: { label: "Upstash Redis", keys: [["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"], ["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"]] },
    },
  },
  email: {
    label: "E-mails transactionnels",
    env: "EMAIL_PROVIDER",
    mock: "Boîte d'envoi simulée (lisible dans l'Atelier)",
    providers: { resend: { label: "Resend", keys: ["RESEND_API_KEY"] } },
  },
  marketing: {
    label: "Lettres et scénarios e-mail",
    env: "MARKETING_PROVIDER",
    mock: "Envoi par l'outil transactionnel du site",
    providers: {
      brevo: { label: "Brevo", keys: ["BREVO_API_KEY"] },
      klaviyo: { label: "Klaviyo", keys: ["KLAVIYO_PRIVATE_KEY"] },
    },
  },
  ai: {
    label: "Intelligence artificielle (assistante, styliste, agents)",
    env: "AI_PROVIDER",
    mock: "Réponses de démonstration déterministes",
    providers: { anthropic: { label: "Claude (Anthropic)", keys: [["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"]] } },
  },
  captcha: {
    label: "Protection anti-robots des formulaires",
    env: "CAPTCHA_PROVIDER",
    mock: "Vérification ignorée (démonstration)",
    providers: { turnstile: { label: "Cloudflare Turnstile", keys: ["TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"] } },
  },
  instagram: {
    label: "Publications Instagram",
    env: "INSTAGRAM_PROVIDER",
    mock: "Sélection de photographies de la Maison",
    providers: { instagram: { label: "Instagram", keys: ["INSTAGRAM_ACCESS_TOKEN"] } },
  },
} as const satisfies Record<string, ServiceSpec>;

export type ServiceId = keyof typeof SERVICES;
export type ProviderOf<S extends ServiceId> = keyof (typeof SERVICES)[S]["providers"] | "mock";

export interface ServiceState {
  id: ServiceId;
  label: string;
  env: string;
  /** prestataire en service (`mock` = simulation) */
  provider: string;
  providerLabel: string;
  /** valeur demandée par l'interrupteur, si elle est renseignée */
  requested?: string;
  /** clés manquantes quand le prestataire demandé n'a pas pu être branché */
  missing: string[];
  /** toutes les clés de chaque prestataire réel (pour l'Atelier et ACTIVATION.md) */
  keys: Record<string, string[]>;
}

type Env = Record<string, string | undefined>;
const show = (k: Key) => (typeof k === "string" ? k : k.join(" ou "));

/** Résout un service à partir des variables d'environnement (exporté pour les tests). */
export function resolveService(id: ServiceId, env: Env = process.env): ServiceState {
  const has = (k: Key) => (typeof k === "string" ? [k] : k).some((name) => Boolean(env[name]?.trim()));
  const spec: ServiceSpec = SERVICES[id];
  const raw = env[spec.env]?.trim().toLowerCase() || undefined;
  const keys = Object.fromEntries(Object.entries(spec.providers).map(([p, s]) => [p, s.keys.map(show)]));
  const state = (provider: string, missing: string[] = []): ServiceState => ({
    id,
    label: spec.label,
    env: spec.env,
    provider,
    providerLabel: provider === "mock" ? spec.mock : spec.providers[provider].label,
    requested: raw,
    missing,
    keys,
  });
  if (raw === "mock" || raw === "simulation") return state("mock");
  if (raw && raw in spec.providers) {
    const missing = spec.providers[raw].keys.filter((k) => !has(k)).map(show);
    return missing.length ? state("mock", missing) : state(raw);
  }
  // absent (ou valeur inconnue) : le premier prestataire dont toutes les clés sont présentes
  const found = Object.entries(spec.providers).find(([, s]) => !s.optIn && s.keys.every(has));
  return state(found ? found[0] : "mock");
}

const g = globalThis as unknown as { __awreaProvidersWarned?: boolean };

function computeAll(): Record<ServiceId, ServiceState> {
  const all = Object.fromEntries((Object.keys(SERVICES) as ServiceId[]).map((id) => [id, resolveService(id)])) as Record<ServiceId, ServiceState>;
  if (!g.__awreaProvidersWarned && typeof window === "undefined") {
    g.__awreaProvidersWarned = true;
    for (const s of Object.values(all)) {
      if (s.requested && s.requested !== "mock" && s.requested !== "simulation" && !(s.requested in SERVICES[s.id].providers)) {
        console.warn(`[services] ${s.env}=${s.requested} : valeur inconnue (attendu : mock, ${Object.keys(SERVICES[s.id].providers).join(", ")}).`);
      }
      if (s.missing.length) console.warn(`[services] ${s.env}=${s.requested} demandé, mais ${s.missing.join(", ")} manque(nt) : simulation utilisée.`);
    }
  }
  return all;
}

/** État de chaque service, résolu une fois au démarrage du serveur. */
export const services: Record<ServiceId, ServiceState> = computeAll();

/** Prestataire en service (`mock` = simulation). */
export function providerOf<S extends ServiceId>(id: S): ProviderOf<S> {
  return services[id].provider as ProviderOf<S>;
}

/** Vrai si le service tourne avec son vrai prestataire. */
export const isLive = (id: ServiceId) => services[id].provider !== "mock";

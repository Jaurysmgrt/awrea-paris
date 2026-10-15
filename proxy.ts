/**
 * Proxy (Next.js 16 : remplace middleware.ts, s'exécute sur le runtime Node.js).
 *  - Pose la politique de sécurité du contenu de chaque page, avec un nonce unique (mode strict).
 *  - Refuse les requêtes d'API qui modifient des données depuis une autre origine (CSRF).
 *  - Ouvre l'Atelier (tableau de bord, éditeur, et leur API) seulement par son adresse secrète
 *    (ADMIN_PATH, lib/admin/path.ts), réécrite vers les routes internes /gestion et /api/gestion ;
 *    ces routes internes répondent 404 au public, comme toute adresse inconnue. Pages et API de
 *    l'Atelier : aucune indexation, aucun cache partagé, aucun référent transmis.
 *  - Rafraîchit la session Supabase des clientes sur l'espace compte (/compte, /api/account),
 *    comme le recommande @supabase/ssr.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/auth/admin";
import { contentSecurityPolicy, cspEnabled, cspMode, newNonce } from "@/lib/security/headers";
import { countRefusal } from "@/lib/security/rate-limit";
import { providerOf } from "@/lib/config/providers";
import { atelierBase, isInternalAtelierPath, toInternal } from "@/lib/admin/path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

/** Une page HTML demandée par le navigateur (et non une donnée de navigation interne ou un préchargement). */
function isDocument(request: NextRequest): boolean {
  if (!["GET", "HEAD"].includes(request.method)) return false;
  if (request.nextUrl.pathname.startsWith("/api/")) return false;
  const h = request.headers;
  if (h.get("rsc") || h.get("next-router-prefetch") || h.get("purpose") === "prefetch") return false;
  return h.get("sec-fetch-dest") === "document" || (h.get("accept") ?? "").includes("text/html");
}

/** Laisse passer la requête, en transmettant le nonce à Next.js (qui l'applique à ses scripts). */
function forward(request: NextRequest, nonce: string | null) {
  if (!nonce) return NextResponse.next({ request });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return NextResponse.next({ request: { headers } });
}

async function refreshCustomerSession(request: NextRequest, nonce: string | null) {
  let response = forward(request, nonce);
  if (providerOf("customers") !== "supabase" || !supabaseUrl || !supabaseAnonKey) return response;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = forward(request, nonce);
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // getUser() valide le jeton auprès de Supabase et le renouvelle si besoin
  await supabase.auth.getUser();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

/** Réponse identique à une adresse inconnue : rien ne révèle que l'Atelier existe. */
function notFound(request: NextRequest, nonce: string | null) {
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const url = request.nextUrl.clone();
  url.pathname = "/__introuvable";
  url.search = "";
  return rewrite(request, url, nonce);
}

function rewrite(request: NextRequest, url: URL, nonce: string | null) {
  if (!nonce) return NextResponse.rewrite(url, { request });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return NextResponse.rewrite(url, { request: { headers } });
}

/** Pages de l'Atelier ouvertes sans session : connexion et lien « ce n'était pas moi ». */
const OPEN_PAGES = ["/connexion", "/revoquer"];

async function protectAtelier(request: NextRequest, base: string, nonce: string | null) {
  const target = toInternal(request.nextUrl.pathname, base)!;
  const open = target.api ? target.rest.startsWith("/api/login") : OPEN_PAGES.includes(target.rest);
  let response: NextResponse;
  if (open || (await isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
    const url = request.nextUrl.clone();
    url.pathname = target.internal;
    response = rewrite(request, url, nonce);
  } else if (target.api) {
    response = NextResponse.json({ error: "Introuvable" }, { status: 404 });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `${base}/connexion`;
    url.search = "";
    if (target.rest !== "/") url.searchParams.set("suite", target.rest);
    response = NextResponse.redirect(url);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

/**
 * Protection CSRF en profondeur : une requête qui modifie des données (POST, PUT, PATCH, DELETE)
 * et qui annonce une origine différente du site est refusée. Les cookies de session sont déjà
 * en SameSite (Lax ou Strict) ; les appels de serveur à serveur (webhooks signés, tâches
 * planifiées) n'ont pas d'origine navigateur et sont authentifiés autrement.
 */
function foreignOrigin(request: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false; // appel sans navigateur (aucun cookie de victime possible)
  if (origin === "null") return true; // cadre isolé ou fichier local : jamais légitime ici
  try {
    const host = new URL(origin).host;
    return host !== request.nextUrl.host && host !== request.headers.get("x-forwarded-host");
  } catch {
    return true;
  }
}

/**
 * Aperçu de l'éditeur : la page (brouillon compris) s'affiche dans un cadre de l'éditeur, sur le
 * site lui-même, pour la créatrice connectée en mode Édition seulement. Partout ailleurs, aucune
 * intégration dans un cadre n'est permise.
 */
async function isEditorPreview(request: NextRequest): Promise<boolean> {
  if (request.nextUrl.searchParams.get("apercu") !== "1") return false;
  if (!request.cookies.get("__prerender_bypass")) return false;
  return isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/") && !pathname.startsWith("/api/cron/") && foreignOrigin(request)) {
    await countRefusal("csrf");
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  const nonce = cspEnabled && cspMode === "strict" && isDocument(request) ? newNonce() : null;

  const base = atelierBase();
  let response: NextResponse;
  if (base && toInternal(pathname, base)) response = await protectAtelier(request, base, nonce);
  else if (isInternalAtelierPath(pathname)) response = notFound(request, nonce);
  else if (pathname.startsWith("/compte") || pathname.startsWith("/api/account")) response = await refreshCustomerSession(request, nonce);
  else response = forward(request, nonce);

  if (isDocument(request) && (await isEditorPreview(request))) {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    if (cspEnabled) response.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce ?? undefined, { selfFrame: true }));
    return response;
  }
  if (nonce) response.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return response;
}

export const config = {
  // tout sauf les fichiers statiques (scripts compilés, images, vidéos, icônes, fichiers publics)
  matcher: ["/((?!_next/static|_next/image|media/|brand/|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest|llms).*)"],
};

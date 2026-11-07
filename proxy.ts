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
 *  - Langues (lib/i18n/routing.ts) : /en/… est réécrit vers la même page, et la langue est
 *    transmise aux pages dans l'en-tête interne LOCALE_HEADER (posé sur chaque requête : une
 *    valeur envoyée par le navigateur est écrasée). L'Atelier, l'API et les fichiers (plan du site,
 *    llms.txt, images) n'existent qu'en un exemplaire : sous /en, ils répondent 404 comme toute
 *    adresse inconnue.
 *  - Première arrivée (pas encore de cookie de langue) : une visiteuse dont le navigateur préfère
 *    l'anglais, arrivée sur une adresse française, est menée à la même page sous /en. Ensuite la
 *    langue de chaque page est retenue (LOCALE_COOKIE) : le sélecteur FR · EN garde la main.
 *  - Site privé (SITE_PRIVE=1, lib/security/private-site.ts) : sans session de l'Atelier ni accès
 *    donné par le lien privé (SITE_PRIVE_CLE), toute page du site montre la page d'attente et toute
 *    API répond 404 (sauf webhooks et tâches planifiées) ; aucune réponse n'est indexée.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/auth/admin";
import { contentSecurityPolicy, cspEnabled, cspMode, newNonce } from "@/lib/security/headers";
import { countRefusal } from "@/lib/security/rate-limit";
import { providerOf } from "@/lib/config/providers";
import { atelierBase, isInternalAtelierPath, toInternal } from "@/lib/admin/path";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALE_HEADER, isLocalizable, localizePath, preferredLocale, splitLocale, type Locale } from "@/lib/i18n/routing";
import { PREVIEW_COOKIE, PREVIEW_MAX_AGE, PREVIEW_PARAM, PRIVATE_PAGE, isPreviewKey, isPreviewToken, openWhilePrivate, previewToken, sitePrive } from "@/lib/security/private-site";

const secureCookie = process.env.NODE_ENV === "production";

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

/** En-têtes transmis à la page : le nonce (que Next.js applique à ses scripts) et la langue. */
function upstreamHeaders(request: NextRequest, nonce: string | null, locale: Locale): Headers {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  if (nonce) {
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  }
  return headers;
}

/**
 * Laisse passer la requête, en transmettant le nonce et la langue à Next.js ; `target` : la page
 * servie à la place (version anglaise, réécrite vers le même chemin sans /en).
 */
function forward(request: NextRequest, nonce: string | null, locale: Locale = DEFAULT_LOCALE, target?: URL) {
  const headers = upstreamHeaders(request, nonce, locale);
  return target ? NextResponse.rewrite(target, { request: { headers } }) : NextResponse.next({ request: { headers } });
}

async function refreshCustomerSession(request: NextRequest, nonce: string | null, locale: Locale, target?: URL) {
  let response = forward(request, nonce, locale, target);
  if (providerOf("customers") !== "supabase" || !supabaseUrl || !supabaseAnonKey) return response;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = forward(request, nonce, locale, target);
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
function notFound(request: NextRequest, nonce: string | null, locale: Locale = DEFAULT_LOCALE) {
  if (splitLocale(request.nextUrl.pathname).path.startsWith("/api/")) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const url = request.nextUrl.clone();
  url.pathname = "/__introuvable";
  url.search = "";
  return rewrite(request, url, nonce, locale);
}

function rewrite(request: NextRequest, url: URL, nonce: string | null, locale: Locale = DEFAULT_LOCALE) {
  return NextResponse.rewrite(url, { request: { headers: upstreamHeaders(request, nonce, locale) } });
}

/** Site privé, visiteuse sans session de l'Atelier : la page d'attente, ou 404 pour une API. */
function privateGate(request: NextRequest, path: string, nonce: string | null, locale: Locale) {
  let response: NextResponse;
  if (path.startsWith("/api/")) response = NextResponse.json({ error: "Introuvable" }, { status: 404 });
  else {
    const url = request.nextUrl.clone();
    url.pathname = PRIVATE_PAGE;
    url.search = "";
    response = rewrite(request, url, nonce, locale);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Lien privé : la clé ouvre le site dans ce navigateur (cookie signé), puis disparaît de l'adresse,
 * de l'historique et des référents. Une clé fausse ne donne rien : la page d'attente reste.
 */
function grantPreview(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.searchParams.delete(PREVIEW_PARAM);
  const response = NextResponse.redirect(url);
  const token = isPreviewKey(request.nextUrl.searchParams.get(PREVIEW_PARAM)) ? previewToken() : null;
  if (token) response.cookies.set(PREVIEW_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: PREVIEW_MAX_AGE });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

/** Accès au site privé : session de l'Atelier, ou accès donné par le lien privé. */
async function canSeePrivateSite(request: NextRequest): Promise<boolean> {
  if (isPreviewToken(request.cookies.get(PREVIEW_COOKIE)?.value)) return true;
  return isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
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
 * Mode Édition de la créatrice connectée : la page peut afficher son propre aperçu dans un cadre
 * du site, et être affichée dans ce cadre. Partout ailleurs, aucun cadre n'est permis.
 */
async function isEditorSession(request: NextRequest): Promise<boolean> {
  if (!request.cookies.get("__prerender_bypass")) return false;
  return isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const base = atelierBase();
  // l'API de l'Atelier vit sous son adresse secrète (réécrite ensuite vers /api/gestion) : elle a
  // droit au même contrôle d'origine que /api/…, en plus de son cookie SameSite=Strict
  const publicApi = pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/") && !pathname.startsWith("/api/cron/");
  const atelierWrite = Boolean(base && (pathname === base || pathname.startsWith(`${base}/`)));
  if ((publicApi || atelierWrite) && foreignOrigin(request)) {
    await countRefusal("csrf");
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  const nonce = cspEnabled && cspMode === "strict" && isDocument(request) ? newNonce() : null;

  // version anglaise : la même page, servie sous /en (l'Atelier et l'API n'en ont pas)
  const { locale, path } = splitLocale(pathname);
  const translated = locale !== DEFAULT_LOCALE;
  let target: URL | undefined;
  if (translated) {
    target = request.nextUrl.clone();
    target.pathname = path;
  }
  const atelier = Boolean(base && toInternal(pathname, base)) || isInternalAtelierPath(pathname);
  if (sitePrive() && !atelier && request.nextUrl.searchParams.has(PREVIEW_PARAM)) return grantPreview(request);

  // pages publiques : la langue du navigateur à la première arrivée, puis celle de chaque page
  const publicPage = isDocument(request) && !atelier && isLocalizable(path);
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
  if (publicPage && !remembered && !translated) {
    const wanted = preferredLocale(request.headers.get("accept-language"));
    if (wanted && wanted !== locale) {
      const url = request.nextUrl.clone();
      url.pathname = localizePath(path, wanted);
      const redirect = NextResponse.redirect(url, 307);
      redirect.cookies.set(LOCALE_COOKIE, wanted, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: LOCALE_COOKIE_MAX_AGE });
      redirect.headers.set("Cache-Control", "private, no-store");
      redirect.headers.set("Vary", "Accept-Language, Cookie");
      return redirect;
    }
  }

  let response: NextResponse;
  if (translated && (!isLocalizable(path) || isInternalAtelierPath(path) || (base && toInternal(path, base)))) response = notFound(request, nonce, locale);
  else if (base && toInternal(pathname, base)) response = await protectAtelier(request, base, nonce);
  else if (isInternalAtelierPath(pathname)) response = notFound(request, nonce);
  else if (sitePrive() && !openWhilePrivate(path) && !(await canSeePrivateSite(request))) response = privateGate(request, path, nonce, locale);
  else if (path.startsWith("/compte") || pathname.startsWith("/api/account")) response = await refreshCustomerSession(request, nonce, locale, target);
  else response = forward(request, nonce, locale, target);

  if (publicPage && remembered !== locale) response.cookies.set(LOCALE_COOKIE, locale, { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: LOCALE_COOKIE_MAX_AGE });

  // site privé : aucune réponse n'est indexée, même pour la créatrice connectée
  if (sitePrive()) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (isDocument(request) && (await isEditorSession(request))) {
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
  matcher: ["/((?!_next/static|_next/image|media/|brand/|icons/|fonts/|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|robots.txt|sitemap.xml|manifest.webmanifest|llms).*)"],
};

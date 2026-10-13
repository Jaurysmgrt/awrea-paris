/**
 * Proxy (Next.js 16 : remplace middleware.ts, s'exécute sur le runtime Node.js).
 *  - Pose la politique de sécurité du contenu de chaque page, avec un nonce unique (mode strict).
 *  - Refuse les requêtes d'API qui modifient des données depuis une autre origine (CSRF).
 *  - Protège le tableau de bord Atelier (/gestion) et son API (/api/gestion).
 *  - Rafraîchit la session Supabase des clientes sur l'espace compte (/compte, /api/account),
 *    comme le recommande @supabase/ssr.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/auth/admin";
import { contentSecurityPolicy, cspEnabled, cspMode, newNonce } from "@/lib/security/headers";
import { countRefusal } from "@/lib/security/rate-limit";

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
  if (!supabaseUrl || !supabaseAnonKey) return response;
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

async function protectAtelier(request: NextRequest, nonce: string | null) {
  const { pathname } = request.nextUrl;
  if (pathname === "/gestion/connexion" || pathname.startsWith("/api/gestion/login")) return forward(request, nonce);
  if (await isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    const res = forward(request, nonce);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const url = request.nextUrl.clone();
  url.pathname = "/gestion/connexion";
  url.searchParams.set("suite", pathname);
  return NextResponse.redirect(url);
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/") && !pathname.startsWith("/api/cron/") && foreignOrigin(request)) {
    await countRefusal("csrf");
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  const nonce = cspEnabled && cspMode === "strict" && isDocument(request) ? newNonce() : null;

  let response: NextResponse;
  if (pathname.startsWith("/gestion") || pathname.startsWith("/api/gestion")) response = await protectAtelier(request, nonce);
  else if (pathname.startsWith("/compte") || pathname.startsWith("/api/account")) response = await refreshCustomerSession(request, nonce);
  else response = forward(request, nonce);

  if (nonce) response.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return response;
}

export const config = {
  // tout sauf les fichiers statiques (scripts compilés, images, vidéos, icônes, fichiers publics)
  matcher: ["/((?!_next/static|_next/image|media/|brand/|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest|llms).*)"],
};

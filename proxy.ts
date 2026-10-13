/**
 * Proxy (Next.js 16 : remplace middleware.ts, s'exécute sur le runtime Node.js).
 *  - Protège le tableau de bord Atelier (/gestion) et son API (/api/gestion).
 *  - Rafraîchit la session Supabase des clientes sur l'espace compte (/compte, /api/account),
 *    comme le recommande @supabase/ssr ; le reste du site reste statique et rapide.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/auth/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

async function refreshCustomerSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseUrl || !supabaseAnonKey) return response;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // getUser() valide le jeton auprès de Supabase et le renouvelle si besoin
  await supabase.auth.getUser();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function protectAtelier(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/gestion/connexion" || pathname.startsWith("/api/gestion/login")) return NextResponse.next();
  if (isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    const res = NextResponse.next();
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
    return new URL(origin).host !== request.nextUrl.host && new URL(origin).host !== request.headers.get("x-forwarded-host");
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/") && !pathname.startsWith("/api/cron/") && foreignOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }
  if (pathname.startsWith("/gestion") || pathname.startsWith("/api/gestion")) return protectAtelier(request);
  if (pathname.startsWith("/compte") || pathname.startsWith("/api/account")) return refreshCustomerSession(request);
  return NextResponse.next();
}

export const config = {
  matcher: ["/gestion/:path*", "/api/:path*", "/compte/:path*"],
};

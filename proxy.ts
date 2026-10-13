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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/gestion") || pathname.startsWith("/api/gestion")) return protectAtelier(request);
  return refreshCustomerSession(request);
}

export const config = {
  matcher: ["/gestion/:path*", "/api/gestion/:path*", "/compte/:path*", "/api/account/:path*"],
};

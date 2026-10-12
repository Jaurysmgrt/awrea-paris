/**
 * Protège le tableau de bord Atelier (/gestion) et son API (/api/gestion).
 * Next.js 16 : ce fichier remplace middleware.ts et s'exécute sur le runtime Node.js.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/auth/admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/gestion/connexion" || pathname === "/api/gestion/login") return NextResponse.next();
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

export const config = {
  matcher: ["/gestion/:path*", "/api/gestion/:path*"],
};

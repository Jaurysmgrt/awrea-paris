import { isAdmin } from "@/lib/auth/admin";
import { inscrites, inscritesCsv } from "@/lib/email/lettre";

/** Atelier › E-mails › Inscrites : le tableur des inscrites, à ouvrir dans Excel ou Numbers. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Non autorisé", { status: 401 });
  const jour = new Date().toISOString().slice(0, 10);
  return new Response(inscritesCsv(await inscrites()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscrites-awrea-${jour}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

import { requireCustomer } from "@/lib/auth/require-customer";
import { exportData } from "@/lib/customers";
import { ficheBrute } from "@/lib/crm";

/** RGPD — droit d'accès et à la portabilité : toutes les données du compte, en JSON. */
export async function GET() {
  const { session, error } = await requireCustomer();
  if (error) return error;
  // avec ce que le CRM garde pour son adresse : inscription à la lettre, preuve du consentement, historique
  const data = { ...(await exportData(session)), lettre: await ficheBrute(session.email) };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="awrea-paris-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

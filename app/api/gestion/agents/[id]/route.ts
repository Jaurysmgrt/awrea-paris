import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { agentInfo, runAgent } from "@/lib/agents/registry";
import { fluxDePassage, veutSuivre } from "@/lib/agents/progress";

export const maxDuration = 300;

/**
 * Lance un agent depuis l'Atelier. Quand l'Atelier suit le passage (Accept: application/x-ndjson),
 * ses étapes arrivent au fil de l'eau, puis le résultat ; sinon, le résultat seul.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const origin = new URL(req.url).origin;
  if (veutSuivre(req)) {
    const nom = agentInfo(id)?.name ?? "L’agent";
    return fluxDePassage(`${nom} se met au travail.`, async () => ({ run: await runAgent(id, { origin, trigger: "manuel" }) }));
  }
  try {
    const run = await runAgent(id, { origin, trigger: "manuel" });
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

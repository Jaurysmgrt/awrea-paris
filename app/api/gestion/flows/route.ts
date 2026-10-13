import { NextResponse } from "next/server";
import { runDailyFlows } from "@/lib/marketing/flows";
import { logAction } from "@/lib/agents/log";
import { isAdmin } from "@/lib/auth/admin";

/** Lance les envois automatiques du jour (aussi exécuté chaque matin par la tâche planifiée). */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const report = await runDailyFlows();
  const total = Object.values(report).reduce((a, b) => a + b, 0);
  await logAction({ agent: "contenu", kind: "e-mails", status: "done", summary: `E-mails automatiques : ${total} envoi(s)`, detail: JSON.stringify(report) }).catch(() => {});
  return NextResponse.json({ ok: true, report });
}

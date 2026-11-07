/** Atelier : gestes sur un retour (colis reçu, remboursement, échange, refus). */
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { z } from "zod";
import { exchangeReturn, receiveReturn, refundReturn, refuseReturn } from "@/lib/returns-flow";
import { formatPrice } from "@/lib/format";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("recu") }),
  z.object({ action: z.literal("rembourser") }),
  z.object({ action: z.literal("echanger") }),
  z.object({ action: z.literal("refuser"), reason: z.string().trim().min(5).max(400) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // l'adresse secrète ne suffit pas : la session est revérifiée ici (SECURITE.md, défense en profondeur)
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  const id = (await params).id;
  try {
    const a = parsed.data;
    if (a.action === "recu") await receiveReturn(id);
    else if (a.action === "echanger") await exchangeReturn(id);
    else if (a.action === "refuser") await refuseReturn(id, a.reason);
    else {
      const { amount } = await refundReturn(id);
      return NextResponse.json({ ok: true, message: `${formatPrice(amount)} remboursés, avoir envoyé à la cliente.` });
    }
    return NextResponse.json({ ok: true, message: "C’est fait." });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Action impossible." }, { status: 409 });
  }
}

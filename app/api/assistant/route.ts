import { z } from "zod";
import { aiEnabled } from "@/lib/ai/client";
import { recordExchange, runClaudeAssistant, runDemoAssistant, type StreamEvent } from "@/lib/ai/assistant";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(24)
    .refine((m) => m[m.length - 1].role === "user", "Le dernier message doit venir de la cliente."),
  page: z.string().max(200).optional(),
});

// limitation simple par adresse IP (mémoire du serveur)
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return Response.json({ error: "Vous avez envoyé beaucoup de messages en peu de temps. Merci de patienter quelques minutes, ou d’écrire à l’atelier." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Message invalide." }, { status: 400 });
  const { messages, page } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      const send = (e: StreamEvent) => {
        if (e.type === "text") answer += e.text;
        if (e.type === "reset") answer = "";
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      };
      try {
        const ctx = aiEnabled ? await runClaudeAssistant(messages, page, send) : await runDemoAssistant(messages, send);
        if (ctx.pieces.size) send({ type: "pieces", items: [...ctx.pieces.values()].slice(0, 3) });
        if (ctx.handoff) send({ type: "handoff", email: ctx.handoff.email });
        send({ type: "done" });
        await recordExchange(messages[messages.length - 1].content, answer, page).catch(() => {});
      } catch (err) {
        console.error("[assistant]", err);
        const message =
          err instanceof Anthropic.RateLimitError
            ? "L’assistante est très sollicitée en ce moment. Merci de réessayer dans un instant."
            : "Je rencontre une difficulté technique. Vous pouvez réessayer, ou écrire directement à l’atelier depuis la page Contact.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Assistant-Mode": aiEnabled ? "claude" : "demo" },
  });
}

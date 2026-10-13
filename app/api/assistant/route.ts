import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
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

// limitation par adresse IP, partagée entre les instances (lib/security/rate-limit.ts)
export async function POST(req: Request) {
  const limited = await rateLimit(req, "assistant", { limit: 30, windowSeconds: 600 }, "Vous avez envoyé beaucoup de messages en peu de temps. Merci de patienter quelques minutes, ou d’écrire à l’atelier.");
  if (limited) return limited;
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

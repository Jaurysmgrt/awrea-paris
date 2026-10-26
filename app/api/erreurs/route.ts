import { NextResponse } from "next/server";
import { z } from "zod";
import { reportError } from "@/lib/errors/report";
import { rateLimit } from "@/lib/security/rate-limit";

const Body = z.object({ message: z.string().max(500), stack: z.string().max(2000).optional(), path: z.string().max(300).optional() });

/** Erreurs du navigateur (components/analytics/ErrorReporter.tsx), limitées pour ne rien inonder. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "erreurs", { limit: 20, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  await reportError({ source: "navigateur", ...parsed.data });
  return new NextResponse(null, { status: 204 });
}

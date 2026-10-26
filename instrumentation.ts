/**
 * Erreurs du serveur (rendu, routes, actions, proxy) : signalées au suivi des erreurs
 * (lib/errors/report.ts), sur le runtime Node.js seulement.
 */
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("@/lib/errors/report");
  const e = err as Error & { digest?: string };
  await reportError({ source: "serveur", message: e?.message ?? String(err), stack: e?.stack, digest: e?.digest, path: request.path, route: context.routePath, kind: context.routeType });
};

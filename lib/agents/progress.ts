/**
 * Suivi en direct d'un passage lancé depuis l'Atelier (retour de la créatrice du 01/11 : « quand je
 * les lance, il se passe rien, on les voit pas travailler »). Pendant le passage, chaque action
 * inscrite au journal (logAction) et chaque étape annoncée (annoncer) sont transmises à celui qui
 * suit le passage : la route de lancement les envoie au fil de l'eau à l'Atelier, qui les affiche.
 * Hors d'un passage suivi (tâche planifiée), annoncer ne fait rien.
 */
import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ActionStatus } from "./log";

export interface Etape {
  texte: string;
  statut: ActionStatus | "en-cours";
  at: string;
}

const suivi = new AsyncLocalStorage<(e: Etape) => void>();

/** Exécute un passage en transmettant chacune de ses étapes à `onEtape`. */
export function suivre<T>(onEtape: (e: Etape) => void, fn: () => Promise<T>): Promise<T> {
  return suivi.run(onEtape, fn);
}

/** Annonce une étape du passage en cours (rien hors d'un passage suivi). */
export function annoncer(texte: string, statut: Etape["statut"] = "en-cours") {
  suivi.getStore()?.({ texte, statut, at: new Date().toISOString() });
}

/**
 * Réponse au fil de l'eau (une ligne JSON par évènement) : « etape » pour chaque étape, puis « fin »
 * avec le résultat, ou « erreur ». Le navigateur lit les lignes à mesure qu'elles arrivent.
 */
export function fluxDePassage(debut: string, fn: () => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(o)}\n`));
      send({ type: "etape", etape: { texte: debut, statut: "en-cours", at: new Date().toISOString() } });
      try {
        const resultat = await suivre((etape) => send({ type: "etape", etape }), fn);
        send({ type: "fin", resultat });
      } catch (e) {
        send({ type: "erreur", message: e instanceof Error ? e.message : String(e) });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}

/** L'Atelier demande-t-il à suivre le passage au fil de l'eau ? */
export const veutSuivre = (req: Request) => (req.headers.get("accept") ?? "").includes("application/x-ndjson");

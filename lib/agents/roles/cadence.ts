/** Cadence des rôles, à l'heure de Paris. Module pur. */
import type { Cadence } from "@/lib/agents/roles/types";

/** Jour de la semaine et du mois à Paris. */
function parisDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", day: "numeric" }).formatToParts(now);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
  return { weekday: wd, day: Number(parts.find((p) => p.type === "day")?.value) };
}

export function isDue(c: Cadence, now: Date): boolean {
  const { weekday, day } = parisDay(now);
  return c.kind === "quotidien" || (c.kind === "hebdomadaire" && c.jour === weekday) || (c.kind === "mensuel" && c.jour === day);
}

/**
 * Rôles de la création : avant-premières et confection. Ils regardent les avant-premières à venir
 * et les pièces à confectionner, et préviennent avant que le temps ne manque. Chaque pièce étant
 * créée sur demande par des artisans français, aucune avant-première ne connaît de quantité : seule
 * la date d'accès change (lib/drops.ts).
 */
import { listDrops, dropSignups } from "@/lib/drops";
import { getOrders } from "@/lib/commerce/orders";
import { getProductsByHandles } from "@/lib/commerce";
import { withStages } from "@/lib/store/order-stages";
import { confectionAlerts } from "@/lib/agents/confection";
import type { Finding, RoleOutcome } from "./types";

const DAY = 86_400_000;
const fmt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(new Date(iso));
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export async function runDrops(now = new Date()): Promise<RoleOutcome> {
  const drops = await listDrops();
  const findings: Finding[] = [];
  let soon = 0;
  for (const d of drops) {
    const until = (new Date(d.earlyAccessAt).getTime() - now.getTime()) / DAY;
    if (until < 0 || until > 7) continue;
    soon++;
    const signups = await dropSignups(d.slug).catch(() => []);
    findings.push({ gravite: "info", titre: `L’avant-première « ${d.title} » ouvre aux inscrites le ${fmt(d.earlyAccessAt)}`, detail: `${plural(signups.length, "inscrite", "inscrites")}, ${plural(d.products.length, "pièce", "pièces")}.`, lien: "/drops", cible: d.slug });
    if (!d.products.length) findings.push({ gravite: "urgent", titre: `« ${d.title} » n’a encore aucune pièce`, lien: "/drops", cible: `${d.slug}:pieces` });
    if (new Date(d.publicAt) < new Date(d.earlyAccessAt)) findings.push({ gravite: "urgent", titre: `« ${d.title} » s’ouvre à toutes avant les inscrites`, detail: "Les deux dates sont à revoir.", lien: "/drops", cible: `${d.slug}:dates` });
    if (d.privateSale && !d.passwordHash) findings.push({ gravite: "urgent", titre: `Présentation privée « ${d.title} » sans mot de passe`, lien: "/drops", cible: `${d.slug}:mdp` });
  }
  return { resume: soon ? `${plural(soon, "avant-première", "avant-premières")} dans les sept jours.` : "Aucune avant-première dans les sept prochains jours.", findings };
}

/**
 * Pièces à confectionner (toutes créées sur demande) : la date de fin annoncée découle du délai
 * annoncé à la commande, compté depuis sa réception (lib/customers/order-timeline.ts).
 */
export async function runProduction(now = new Date()): Promise<RoleOutcome> {
  const orders = (await withStages(await getOrders())).filter((o) => o.status === "paid" || o.status === "in_production");
  const handles = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.handle)))];
  const products = await getProductsByHandles(handles, { includeUpcoming: true }).catch(() => []);
  const toMake = orders.reduce((n, o) => n + o.lines.reduce((m, l) => m + l.quantity, 0), 0);
  const findings: Finding[] = confectionAlerts(orders, products, now).map((a) => ({
    gravite: a.kind === "en-retard" ? "urgent" : "attention",
    titre: `${a.pieces.join(", ")} (commande ${a.number})`,
    detail:
      a.kind === "en-retard"
        ? `Fin de confection annoncée le ${fmt(a.due)}, ${plural(-a.daysLeft, "jour", "jours")} de retard.`
        : a.kind === "proche"
          ? `Fin de confection annoncée le ${fmt(a.due)}, dans ${plural(a.daysLeft, "jour", "jours")}${a.started ? "." : ", et la confection n’a pas commencé."}`
          : `Reçue depuis ${plural(a.sinceReceived, "jour", "jours")}, pas encore en confection.`,
    lien: `/commandes/${a.number}`,
    cible: `${a.number}:${a.kind}`,
  }));
  return { resume: toMake ? `${plural(toMake, "pièce à confectionner", "pièces à confectionner")}, ${findings.length} à surveiller.` : "Aucune pièce à confectionner.", findings };
}

/**
 * Rôles de la création : drops et production. Ils regardent les séries à venir et les pièces à
 * coudre, et préviennent avant que le temps ne manque.
 */
import { listDrops, dropSignups } from "@/lib/drops";
import { getOrders } from "@/lib/commerce/orders";
import { getProductsByHandles } from "@/lib/commerce";
import type { Finding, RoleOutcome } from "./types";

const DAY = 86_400_000;
const fmt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(new Date(iso));

export async function runDrops(now = new Date()): Promise<RoleOutcome> {
  const drops = await listDrops();
  const findings: Finding[] = [];
  for (const d of drops) {
    const until = (new Date(d.earlyAccessAt).getTime() - now.getTime()) / DAY;
    if (until < 0 || until > 7) continue;
    const signups = await dropSignups(d.slug).catch(() => []);
    findings.push({ gravite: "info", titre: `« ${d.title} » ouvre aux inscrites le ${fmt(d.earlyAccessAt)}`, detail: `${signups.length} inscrite${signups.length > 1 ? "s" : ""}, ${d.products.length} pièce${d.products.length > 1 ? "s" : ""}.`, lien: "/drops", cible: d.slug });
    if (!d.products.length) findings.push({ gravite: "urgent", titre: `« ${d.title} » n’a encore aucune pièce`, lien: "/drops", cible: `${d.slug}:pieces` });
    if (new Date(d.publicAt) < new Date(d.earlyAccessAt)) findings.push({ gravite: "urgent", titre: `« ${d.title} » ouvre au public avant les inscrites`, detail: "Les deux dates sont à revoir.", lien: "/drops", cible: `${d.slug}:dates` });
    if (d.privateSale && !d.passwordHash) findings.push({ gravite: "urgent", titre: `Vente privée « ${d.title} » sans mot de passe`, lien: "/drops", cible: `${d.slug}:mdp` });
  }
  return { resume: findings.length ? `${findings.filter((f) => f.gravite === "info").length} série${findings.length > 1 ? "s" : ""} dans les sept jours.` : "Aucune série dans les sept prochains jours.", findings };
}

/** Pièces commandées (toutes créées sur demande) : la date promise est la commande plus le délai de fabrication le plus long. */
export async function runProduction(now = new Date()): Promise<RoleOutcome> {
  const orders = (await getOrders()).filter((o) => o.status === "paid" || o.status === "in_production");
  const handles = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.handle)))];
  const products = new Map((await getProductsByHandles(handles, { includeUpcoming: true }).catch(() => [])).map((p) => [p.handle, p]));
  const findings: Finding[] = [];
  let toMake = 0;
  for (const o of orders) {
    for (const l of o.lines) {
      const p = products.get(l.handle);
      if (!p) continue;
      toMake++;
      const due = new Date(new Date(o.createdAt).getTime() + p.leadTime.max * 7 * DAY);
      const left = Math.ceil((due.getTime() - now.getTime()) / DAY);
      if (left <= 7) findings.push({ gravite: left < 0 ? "urgent" : "attention", titre: `${l.title}, taille ${l.size} (commande ${o.number})`, detail: left < 0 ? `Promise pour le ${fmt(due.toISOString())}, en retard de ${-left} jour${-left > 1 ? "s" : ""}.` : `Promise pour le ${fmt(due.toISOString())}, dans ${left} jour${left > 1 ? "s" : ""}.`, lien: `/commandes/${o.number}`, cible: `${o.number}:${l.handle}:${l.size}` });
    }
  }
  return { resume: toMake ? `${toMake} pièce${toMake > 1 ? "s" : ""} à coudre sur commande, ${findings.length} à surveiller.` : "Aucune pièce à coudre sur commande.", findings };
}

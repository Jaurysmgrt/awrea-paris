/**
 * Anti-fraude et comptabilité. L'anti-fraude met de côté une commande inhabituelle (elle reste
 * intacte, la créatrice décide) ; la comptabilité vérifie la suite des factures et suit le seuil
 * européen des ventes à distance (10 000 € par an, au-delà duquel la TVA du pays de la cliente
 * s'applique, déclarée par le guichet unique OSS).
 */
import { formatPrice } from "@/lib/format";
import { getOrders } from "@/lib/commerce/orders";
import { listInvoices } from "@/lib/invoices";
import { getLog } from "@/lib/agents/log";
import { perform } from "@/lib/agents/perform";
import { OSS_THRESHOLD, suspicion, zoneOf } from "@/lib/agents/roles/regles";
import type { Finding, RoleOutcome } from "./types";

const HOUR = 3_600_000;

export async function runAntiFraude(now = new Date()): Promise<RoleOutcome> {
  const [orders, log] = await Promise.all([getOrders(), getLog(500)]);
  const recent = orders.filter((o) => (o.status === "paid" || o.status === "pending") && now.getTime() - new Date(o.createdAt).getTime() < 72 * HOUR);
  const findings: Finding[] = [];
  for (const o of recent) {
    const reasons = suspicion(o, orders);
    if (!reasons.length) continue;
    const already = log.some((a) => a.kind === "flag_order" && a.summary.includes(o.number));
    findings.push({ gravite: "attention", titre: `Commande ${o.number} à regarder avant l’envoi`, detail: reasons.join(" ; "), lien: `/commandes/${o.number}`, cible: o.number });
    if (!already) await perform("anti-fraude", "flag_order", { orderId: o.id, reason: `À vérifier avant l’envoi : ${reasons.join(" ; ")}.` }, { summary: `Commande ${o.number} mise de côté pour vérification`, rationale: reasons.join(" ; ") });
  }
  return { resume: findings.length ? `${findings.length} commande${findings.length > 1 ? "s" : ""} mise${findings.length > 1 ? "s" : ""} de côté pour vérification.` : `${recent.length} commande${recent.length > 1 ? "s" : ""} récente${recent.length > 1 ? "s" : ""}, rien d’inhabituel.`, findings };
}

export async function runComptabilite(now = new Date()): Promise<RoleOutcome> {
  const year = now.getUTCFullYear();
  const [orders, invoices] = await Promise.all([getOrders(), listInvoices()]);
  const findings: Finding[] = [];
  // ventes à distance vers les autres pays de l'Union depuis le 1er janvier
  const eu = orders.filter((o) => o.createdAt.startsWith(String(year)) && zoneOf(o.shipping.country) === "EU" && o.status !== "refunded").reduce((s, o) => s + o.total, 0);
  const share = eu / OSS_THRESHOLD;
  if (share >= 1) findings.push({ gravite: "urgent", titre: `Seuil européen dépassé, ${formatPrice(eu)} de ventes à distance cette année`, detail: "La TVA du pays de chaque cliente s’applique désormais : inscription au guichet unique OSS à faire avec votre comptable.", lien: "/factures", cible: `oss:${year}` });
  else if (share >= 0.8) findings.push({ gravite: "attention", titre: `Seuil européen bientôt atteint, ${formatPrice(eu)} sur ${formatPrice(OSS_THRESHOLD)}`, detail: "À en parler avec votre comptable avant de le dépasser.", lien: "/factures", cible: `oss:${year}` });
  // suite des numéros de factures de l'année, sans trou
  for (const kind of ["facture", "avoir"] as const) {
    const nums = invoices.filter((i) => i.kind === kind && i.issuedAt.startsWith(String(year))).map((i) => Number(i.number.split("-").pop())).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    const holes = nums.filter((n, i) => i > 0 && n !== nums[i - 1] + 1);
    if (holes.length) findings.push({ gravite: "urgent", titre: `Numérotation des ${kind}s interrompue`, detail: `Après le numéro ${nums[nums.indexOf(holes[0]) - 1]}, la suite reprend à ${holes[0]}. Une facture ne se supprime jamais : une erreur se corrige par un avoir.`, lien: "/factures", cible: `${kind}:${year}` });
  }
  return { resume: `Ventes à distance dans l’Union cette année : ${formatPrice(eu)} (${Math.round(share * 100)} % du seuil). ${invoices.length} facture${invoices.length > 1 ? "s" : ""} et avoir${invoices.length > 1 ? "s" : ""} au registre.`, findings };
}

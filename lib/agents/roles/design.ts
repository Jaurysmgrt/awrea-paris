/**
 * Rôle « Design » : chaque matin, il relit les pages du site comme une directrice artistique
 * exigeante (demande de la créatrice du 01/11 : « un agent de design qui regarde tous les jours s'il
 * n'y a pas des problèmes, une récurrence, qui fait l'analyse lui-même, qui a un esprit critique »).
 *
 * Il charge chaque page comme une visiteuse, relève ce qui cloche (lib/design/controle.ts), vérifie
 * que les photos s'affichent, retient ce qui revient d'un jour à l'autre (trois jours d'affilée : la
 * remarque monte d'un cran) et finit par dire par quoi commencer. Il ne modifie rien : il prévient.
 * Le Contrôle relit ensuite son passage, comme pour tous les rôles.
 */
import { kv } from "@/lib/store";
import { getProducts, getCurrentCollection } from "@/lib/commerce";
import { annoncer } from "@/lib/agents/progress";
import { analyserPage, photosInternes, prioriser, recurrence, type Remarque, type Suivi } from "@/lib/design/controle";
import { PREVIEW_COOKIE, previewToken, sitePrive } from "@/lib/security/private-site";
import type { Finding, RoleContext, RoleOutcome } from "./types";

const SUIVI_KEY = "roles:design:suivi";
const MAX_PHOTOS = 40;

/** Adresse du site à relire : celle d'où part le passage, sinon celle de la configuration. */
export function adresseDuSite(ctx: RoleContext): string | null {
  if (ctx.origin) return ctx.origin.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

/** Pages relues, avec le nom que la créatrice leur donne. */
async function pagesARelire(): Promise<{ path: string; nom: string; fiche?: boolean }[]> {
  const [pieces, collection] = await Promise.all([getProducts({}, "fr").catch(() => []), getCurrentCollection().catch(() => null)]);
  return [
    { path: "/", nom: "l’accueil" },
    { path: "/boutique", nom: "la boutique" },
    ...(collection ? [{ path: `/collections/${collection.handle}`, nom: `la collection ${collection.title}` }] : []),
    ...pieces.slice(0, 4).map((p) => ({ path: `/boutique/${p.handle}`, nom: `la fiche « ${p.title} »`, fiche: true })),
    { path: "/la-maison", nom: "La Maison" },
    { path: "/sur-commande", nom: "la page Sur commande" },
    { path: "/guide-des-tailles", nom: "le guide des tailles" },
    { path: "/contact", nom: "la page Contact" },
    { path: "/en", nom: "l’accueil en anglais" },
  ];
}

const versFinding = (r: Remarque): Finding => ({ gravite: r.gravite, titre: `${r.titre} (${r.page})`, detail: r.detail, cible: r.cible });

export async function runDesign(now: Date, ctx: RoleContext = {}): Promise<RoleOutcome> {
  const origine = adresseDuSite(ctx);
  if (!origine) return { resume: "Adresse du site inconnue : les pages n’ont pas pu être relues.", findings: [{ gravite: "info", titre: "Renseignez NEXT_PUBLIC_SITE_URL pour que le rôle Design relise le site", cible: "adresse" }] };

  // site privé : il entre comme la créatrice avec son lien privé, s'il existe
  const headers: Record<string, string> = { "User-Agent": "AwreaDesign/1.0" };
  if (sitePrive()) {
    const jeton = previewToken();
    if (!jeton) return { resume: "Site privé sans lien privé : les pages n’ont pas pu être relues.", findings: [] };
    headers.Cookie = `${PREVIEW_COOKIE}=${jeton}`;
  }

  const pages = await pagesARelire();
  const remarques: Remarque[] = [];
  const photos = new Map<string, string>();
  for (const p of pages) {
    annoncer(`Relit ${p.nom}.`);
    let res: Response | null = null;
    try {
      res = await fetch(origine + p.path, { headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(20_000) });
    } catch {
      res = null;
    }
    if (!res || res.status >= 400) {
      remarques.push({ gravite: "urgent", titre: "La page ne s’affiche pas", detail: res ? `Le site répond ${res.status}.` : "Le site ne répond pas.", page: p.path, cible: `${p.path}#statut` });
      continue;
    }
    if (res.status >= 300) continue; // redirection (langue, page privée) : rien à juger ici
    const html = await res.text();
    remarques.push(...analyserPage(p.path, html, { fiche: p.fiche }));
    for (const src of photosInternes(html)) if (!photos.has(src)) photos.set(src, p.path);
  }

  annoncer("Vérifie que les photos s’affichent.");
  for (const [src, page] of [...photos].slice(0, MAX_PHOTOS)) {
    const ok = await fetch(origine + src, { method: "HEAD", headers, cache: "no-store", signal: AbortSignal.timeout(15_000) })
      .then((r) => r.ok)
      .catch(() => false);
    if (!ok) remarques.push({ gravite: "urgent", titre: "Une photo ne s’affiche pas", detail: src, page, cible: `photo:${src}` });
  }

  annoncer("Compare avec les jours précédents.");
  const jour = now.toISOString().slice(0, 10);
  const avant = (await kv.get<Record<string, Suivi>>(SUIVI_KEY).catch(() => null)) ?? {};
  const { suivi, remarques: suivies } = recurrence(avant, remarques, jour);
  await kv.set(SUIVI_KEY, suivi);
  const ordre = prioriser(suivies, suivi);

  if (!ordre.length) return { resume: `Rien ne cloche sur les ${pages.length} pages relues et leurs ${photos.size} photos.`, findings: [] };
  const reviennent = ordre.filter((r) => (suivi[r.cible]?.jours ?? 1) >= 3).length;
  const premier = ordre[0];
  const resume = [
    `${ordre.length} remarque${ordre.length > 1 ? "s" : ""} sur ${pages.length} pages relues`,
    reviennent ? `, dont ${reviennent} qui revien${reviennent > 1 ? "nent" : "t"} depuis trois jours ou plus` : "",
    `. À regarder d’abord : ${premier.titre.toLowerCase()} (${premier.page}).`,
  ].join("");
  return { resume, findings: ordre.slice(0, 12).map(versFinding) };
}

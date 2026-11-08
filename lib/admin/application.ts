/**
 * Application privée de l'Atelier (PWA installée sur l'iPhone ou l'Android de la créatrice) : tout ce
 * qui ne dépend ni du serveur ni du navigateur, pour être testé seul (tests/unit/atelier-application).
 *
 * - Le manifeste vit sous l'adresse secrète de l'Atelier et sa portée s'y limite : le site public
 *   garde le sien (app/manifest.webmanifest), sans rien qui mène à l'Atelier.
 * - Le service worker ne garde aucune donnée : ni page de l'Atelier, ni réponse d'API. Il ne met de
 *   côté que deux polices et le logo, publics, pour la page « Hors ligne », et sert les notifications.
 * - Une notification s'affiche sur l'écran verrouillé : elle ne porte jamais le nom, l'adresse ou le
 *   téléphone d'une cliente, seulement un numéro de commande, un montant ou une consigne.
 * - Le serveur n'envoie une notification qu'aux services des navigateurs (Apple, Google, Mozilla,
 *   Microsoft) : aucune autre adresse, fournie par un appareil, ne reçoit de requête.
 */

/** Ce qui peut prévenir la créatrice, réglable appareil par appareil (page « Application »). */
export const NOTIFICATIONS = {
  commande: { titre: "Nouvelle commande", aide: "Une cliente vient de commander." },
  intervention: { titre: "Intervention requise", aide: "Commande à vérifier, retour demandé, message qu’un agent vous laisse." },
  validation: { titre: "Approbation demandée", aide: "Un agent propose une action qui attend votre accord." },
  anomalie: { titre: "Anomalie détectée", aide: "Confection en retard, paiement en attente." },
  taches: { titre: "Passage des agents terminé", aide: "Chaque agent a fini son tour planifié, avec ce qui reste à valider. Non coché d’emblée." },
  erreur: { titre: "Erreur", aide: "Une tâche ou un service n’a pas abouti." },
  securite: { titre: "Alerte de sécurité", aide: "Connexion à l’Atelier, Face ID ajouté, compte bloqué." },
} as const;
export type TypeNotification = keyof typeof NOTIFICATIONS;
export const TYPES_NOTIFICATION = Object.keys(NOTIFICATIONS) as TypeNotification[];

export type NotificationAtelier = {
  type: TypeNotification;
  titre: string;
  texte: string;
  /** page de l'Atelier à ouvrir, relative à son adresse (« /commandes/AW-1043 ») */
  chemin?: string;
  /** même étiquette : la nouvelle notification remplace l'ancienne au lieu de s'empiler */
  etiquette?: string;
};

export const TITRE_MAX = 60;
export const TEXTE_MAX = 140;

const ADRESSE = /[^\s@<>()[\]",;:]+@[^\s@<>()[\]",;:]+\.[a-z]{2,}/gi;
const TELEPHONE = /(?:\+|00)?\d(?:[\s.-]?\d){8,}/g;
const CONTROLE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;

/** Texte sûr pour un écran verrouillé : ni adresse e-mail, ni téléphone, ni caractère de contrôle. */
export function texteDiscret(texte: string, max: number): string {
  const propre = texte.replace(CONTROLE, " ").replace(ADRESSE, "une cliente").replace(TELEPHONE, "…").replace(/\s+/g, " ").trim();
  return propre.length > max ? `${propre.slice(0, max - 1).trimEnd()}…` : propre;
}

/** Une page de l'Atelier, jamais une autre adresse : tout chemin douteux ramène à l'accueil. */
export function cheminSur(chemin: string | undefined): string {
  if (!chemin || !chemin.startsWith("/") || chemin.startsWith("//") || /[\\\s]|%2f|%5c|:/i.test(chemin) || chemin.includes("..")) return "/";
  return chemin.slice(0, 200);
}

/** Contenu chiffré envoyé à l'appareil (lu par le service worker, `push`). */
export function contenuNotification(n: NotificationAtelier, base: string): string {
  return JSON.stringify({
    title: texteDiscret(n.titre, TITRE_MAX) || NOTIFICATIONS[n.type].titre,
    body: texteDiscret(n.texte, TEXTE_MAX),
    url: `${base}${cheminSur(n.chemin)}`,
    tag: n.etiquette ? n.etiquette.replace(/[^\w-]/g, "").slice(0, 64) : undefined,
    type: n.type,
  });
}

/** Services de notification des navigateurs : les seuls hôtes auxquels le serveur envoie. */
const HOTES = ["fcm.googleapis.com", "web.push.apple.com", "updates.push.services.mozilla.com"];
const SUFFIXES = [".push.apple.com", ".notify.windows.com"];

export function serviceAutorise(endpoint: string): boolean {
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  return HOTES.includes(h) || SUFFIXES.some((s) => h.endsWith(s) && h.length > s.length);
}

/** Nom lisible de l'appareil, tiré de son navigateur (« iPhone », « Android », « Mac »…). */
export function nomAppareil(userAgent: string): string {
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "Ordinateur Windows";
  if (/Linux/i.test(userAgent)) return "Ordinateur";
  return "Appareil";
}

type Couleurs = { fond: string; theme: string };

/** Manifeste de l'application : nom, icônes, portée limitée à l'adresse secrète de l'Atelier. */
export function manifesteAtelier(base: string, couleurs: Couleurs) {
  const racine = `${base}/`;
  return {
    id: racine,
    name: "Atelier Awrea Paris",
    short_name: "Atelier",
    description: "L’Atelier d’Awrea Paris, réservé à la Maison.",
    lang: "fr",
    dir: "ltr",
    start_url: racine,
    scope: racine,
    display: "standalone",
    background_color: couleurs.fond,
    theme_color: couleurs.theme,
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Commandes", url: `${base}/commandes` },
      { name: "À valider", url: `${base}/validations` },
      { name: "Clientes", url: `${base}/clientes` },
    ],
  };
}

/** Fichiers publics gardés pour la page « Hors ligne » (aucune donnée de l'Atelier). */
export const FICHIERS_HORS_LIGNE = ["/fonts/cormorant-garamond-latin-400.woff2", "/fonts/fraunces-120pt-light-latin.woff2", "/brand/awrea-logo.png", "/brand/awrea-logo-blanc.png"];

/** Version du service worker : la changer remplace l'ancien et vide ses fichiers gardés. */
export const VERSION_SW = "1";

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Page affichée quand le réseau manque : elle le dit, et ne montre aucune donnée. */
export function pageHorsLigne(couleurs: { clair: string; sombre: string; doux: string }): string {
  const [cormorant, fraunces, logo, logoBlanc] = FICHIERS_HORS_LIGNE;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex"><title>Hors ligne · Atelier</title><style>
@font-face{font-family:"Cormorant Garamond";src:url(${cormorant}) format("woff2");font-weight:400}
@font-face{font-family:"Fraunces";src:url(${fraunces}) format("woff2");font-weight:300}
:root{color-scheme:light dark;--fond:${couleurs.clair};--texte:${couleurs.sombre};--doux:${couleurs.doux}}
@media (prefers-color-scheme:dark){:root{--fond:${couleurs.sombre};--texte:${couleurs.clair}}.logo--clair{display:none}.logo--sombre{display:block}}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:48px 24px calc(48px + env(safe-area-inset-bottom));background:var(--fond);color:var(--texte);font:400 20px/32px "Cormorant Garamond",Georgia,serif;font-synthesis:none}
main{max-width:32rem;display:grid;gap:24px;text-align:left}h1{margin:0;font:300 32px/40px Fraunces,Georgia,serif}p{margin:0}
.logo{height:32px;width:auto}.logo--sombre{display:none}
a{justify-self:start;display:inline-flex;align-items:center;min-height:48px;padding:0 32px;border-radius:999px;background:var(--texte);color:var(--fond);text-decoration:none}
a:focus-visible{outline:2px solid var(--texte);outline-offset:4px}
</style></head><body><main><img class="logo logo--clair" src="${logo}" alt="Awrea Paris"><img class="logo logo--sombre" src="${logoBlanc}" alt="Awrea Paris"><h1>${echapper("Pas de réseau")}</h1><p>${echapper("L’Atelier a besoin d’internet pour vous montrer vos commandes à jour. Rien n’est gardé sur cet appareil, par sécurité.")}</p><a href="">${echapper("Réessayer")}</a></main></body></html>`;
}

/**
 * Script du service worker, servi sous l'adresse de l'Atelier (portée limitée à celle-ci).
 * Navigation : toujours le réseau ; sans réseau, la page « Hors ligne ». Aucune autre requête n'est
 * interceptée, et aucune réponse n'est gardée.
 */
export function scriptServiceWorker(base: string, api: string, horsLigne: string): string {
  const cfg = JSON.stringify({ portee: `${base}/`, api, cache: `atelier-statique-v${VERSION_SW}`, fichiers: FICHIERS_HORS_LIGNE, page: horsLigne, icone: "/icons/icon-192.png" });
  return `"use strict";
const CFG = ${cfg};
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CFG.cache).then((c) => c.addAll(CFG.fichiers)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const nom of await caches.keys()) if (nom.startsWith("atelier-") && nom !== CFG.cache) await caches.delete(nom);
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});
const horsLigne = () => new Response(CFG.page, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && CFG.fichiers.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((r) => r || fetch(req)));
    return;
  }
  if (req.mode !== "navigate" || url.origin !== self.location.origin || !url.pathname.startsWith(CFG.portee.slice(0, -1))) return;
  event.respondWith((async () => {
    try {
      const avance = await event.preloadResponse;
      if (avance) return avance;
      return await fetch(req);
    } catch {
      return horsLigne();
    }
  })());
});
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch {}
  const url = typeof d.url === "string" && d.url.startsWith(CFG.portee) ? d.url : CFG.portee;
  const titre = typeof d.title === "string" && d.title ? d.title.slice(0, 80) : "Atelier";
  const options = { body: typeof d.body === "string" ? d.body.slice(0, 200) : "", icon: CFG.icone, badge: CFG.icone, lang: "fr", data: { url } };
  if (typeof d.tag === "string" && d.tag) options.tag = d.tag;
  event.waitUntil(self.registration.showNotification(titre, options));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = new URL((event.notification.data && event.notification.data.url) || CFG.portee, self.location.origin);
  if (cible.origin !== self.location.origin || !cible.pathname.startsWith(CFG.portee)) return;
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const f of fenetres) {
      if (new URL(f.url).pathname.startsWith(CFG.portee)) {
        await f.focus();
        if ("navigate" in f) await f.navigate(cible.href).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(cible.href);
  })());
});
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    const ancien = event.oldSubscription;
    if (!ancien || !ancien.options) return;
    const nouveau = await self.registration.pushManager.subscribe(ancien.options);
    await fetch(CFG.api + "/application/appareils", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ancien: ancien.endpoint, abonnement: nouveau.toJSON() }) });
  })().catch(() => {}));
});
`;
}

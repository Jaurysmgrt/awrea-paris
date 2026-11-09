/**
 * Application privée de l'Atelier (lib/admin/application.ts, lib/admin/push-envoi.ts) : manifeste
 * limité à l'adresse secrète, service worker qui ne garde aucune donnée, notifications discrètes sur
 * l'écran verrouillé, envoi seulement vers les services de notification des navigateurs (faux
 * service local : aucune requête ne part).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import webpush from "web-push";
import { cheminSur, contenuNotification, manifesteAtelier, nomAppareil, pageHorsLigne, scriptServiceWorker, serviceAutorise, texteDiscret, TEXTE_MAX, TYPES_NOTIFICATION, NOTIFICATIONS } from "@/lib/admin/application";
import { envoyerA, type Abonnement } from "@/lib/admin/push-envoi";

const BASE = "/prive-abc123";

test("notification discrète : ni adresse e-mail, ni téléphone, ni caractère de contrôle, longueur bornée", () => {
  const t = texteDiscret("Écrire à margaux.e@exemple.fr ou au 06 12 34 56 78‮ pour AW-1043", TEXTE_MAX);
  assert.doesNotMatch(t, /@|06 12|‮/);
  assert.match(t, /AW-1043/);
  assert.ok(texteDiscret("x".repeat(500), TEXTE_MAX).length <= TEXTE_MAX);
});

test("lien d'une notification : toujours une page de l'Atelier", () => {
  assert.equal(cheminSur("/commandes/AW-1043"), "/commandes/AW-1043");
  for (const douteux of ["//exemple.fr", "https://exemple.fr", "/../connexion", "/%2f%2fexemple.fr", "/a\\b", "javascript:alert(1)", undefined, ""]) assert.equal(cheminSur(douteux), "/", String(douteux));
  const c = JSON.parse(contenuNotification({ type: "commande", titre: "Nouvelle commande", texte: "Commande AW-1043", chemin: "//ailleurs.fr", etiquette: "commande-AW 1043<x>" }, BASE));
  assert.equal(c.url, `${BASE}/`);
  assert.equal(c.tag, "commande-AW1043x");
  // titre vide : celui du type
  assert.equal(JSON.parse(contenuNotification({ type: "securite", titre: "", texte: "" }, BASE)).title, NOTIFICATIONS.securite.titre);
});

test("envoi : seulement vers les services de notification des navigateurs", () => {
  for (const ok of ["https://fcm.googleapis.com/fcm/send/abc", "https://web.push.apple.com/QGx", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://db5p.notify.windows.com/w/?token=x"]) assert.ok(serviceAutorise(ok), ok);
  for (const non of ["http://fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x", "https://evil.com/fcm.googleapis.com", "https://push.apple.com.evil.com/x", "https://user:pw@fcm.googleapis.com/x", "https://127.0.0.1/x", "https://localhost/x", "pas une adresse"]) assert.ok(!serviceAutorise(non), non);
});

test("manifeste : portée limitée à l'adresse secrète de l'Atelier", () => {
  const m = manifesteAtelier(BASE, { fond: "#F7F6F3", theme: "#F7F6F3" });
  assert.equal(m.scope, `${BASE}/`);
  assert.equal(m.start_url, `${BASE}/`);
  assert.equal(m.id, `${BASE}/`);
  assert.equal(m.display, "standalone");
  assert.ok(m.shortcuts.every((s) => s.url.startsWith(`${BASE}/`)));
  assert.ok(m.icons.some((i) => i.purpose === "maskable"));
});

test("service worker : aucune réponse gardée, navigation limitée à l'Atelier, page hors ligne sans donnée", () => {
  const page = pageHorsLigne({ clair: "#F7F6F3", sombre: "#0A0A0A", doux: "#6B665F" });
  assert.match(page, /Pas de réseau/);
  assert.match(page, /noindex/);
  assert.doesNotMatch(page, /<script/i);
  const sw = scriptServiceWorker(BASE, `${BASE}/api`, page);
  assert.match(sw, new RegExp(`"portee":"${BASE}/"`));
  // seules des polices et le logo, publics, sont mis de côté : jamais une page ni une réponse d'API
  assert.doesNotMatch(sw, /cache\.put|\.put\(/);
  assert.match(sw, /req\.mode !== "navigate"/);
  // un clic sur une notification n'ouvre qu'une page de l'Atelier
  assert.match(sw, /cible\.origin !== self\.location\.origin \|\| !cible\.pathname\.startsWith\(CFG\.portee\)/);
});

test("nom de l'appareil, lisible et sans détail", () => {
  assert.equal(nomAppareil("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "iPhone");
  assert.equal(nomAppareil("Mozilla/5.0 (Linux; Android 15; Pixel 9)"), "Android");
  assert.equal(nomAppareil("Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)"), "Mac");
  assert.equal(nomAppareil(""), "Appareil");
});

function abonnement(endpoint: string): Abonnement {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { endpoint, keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
}

test("envoi : contenu chiffré et signé, appareil disparu oublié, erreur passagère gardée", async () => {
  const cles = webpush.generateVAPIDKeys();
  const vapid = { subject: "mailto:contact@awreaparis.com", publicKey: cles.publicKey, privateKey: cles.privateKey };
  const recues: { url: string; init: RequestInit }[] = [];
  const reponse = (status: number) => (async (url: string | URL | Request, init?: RequestInit) => {
    recues.push({ url: String(url), init: init ?? {} });
    return new Response(null, { status });
  }) as typeof fetch;
  const a = abonnement("https://fcm.googleapis.com/fcm/send/appareil-1");
  const n = { type: "commande" as const, titre: "Nouvelle commande", texte: "Commande AW-1043, 239,00 €" };

  assert.equal(await envoyerA(a, n, { base: BASE, vapid, fetch: reponse(201) }), "envoye");
  const h = recues[0].init.headers as Record<string, string>;
  assert.equal(recues[0].url, a.endpoint);
  assert.equal(recues[0].init.redirect, "error", "aucune redirection suivie");
  assert.match(h.Authorization ?? h.authorization, /^vapid t=/);
  assert.equal(h["Content-Encoding"] ?? h["content-encoding"], "aes128gcm");
  assert.equal(h.Urgency ?? h.urgency, "high");
  // le contenu part chiffré : le numéro de commande n'apparaît pas en clair
  assert.ok(!Buffer.from(recues[0].init.body as Uint8Array).toString("latin1").includes("AW-1043"));

  assert.equal(await envoyerA(a, n, { base: BASE, vapid, fetch: reponse(410) }), "oublier");
  assert.equal(await envoyerA(a, n, { base: BASE, vapid, fetch: reponse(404) }), "oublier");
  assert.equal(await envoyerA(a, n, { base: BASE, vapid, fetch: reponse(429) }), "echec");
  assert.equal(await envoyerA(a, n, { base: BASE, vapid, fetch: reponse(503) }), "echec");
  const panne = (async () => {
    throw new Error("réseau");
  }) as typeof fetch;
  assert.equal(await envoyerA(a, n, { base: BASE, vapid, fetch: panne }), "echec");

  // un service inconnu ne reçoit rien, des clés illisibles non plus
  const avant = recues.length;
  assert.equal(await envoyerA(abonnement("https://evil.example/push"), n, { base: BASE, vapid, fetch: reponse(201) }), "oublier");
  assert.equal(await envoyerA({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "faux", auth: "faux" } }, n, { base: BASE, vapid, fetch: reponse(201) }), "oublier");
  assert.equal(recues.length, avant);
});

test("types de notification : tous décrits, en mots simples", () => {
  for (const t of TYPES_NOTIFICATION) {
    assert.ok(NOTIFICATIONS[t].titre.length > 3);
    assert.ok(NOTIFICATIONS[t].aide.length > 10);
  }
});

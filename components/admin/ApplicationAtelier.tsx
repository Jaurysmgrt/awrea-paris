"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useAtelier } from "./AtelierContext";
import { EVENEMENT_INVITE } from "./AppAtelier";

/**
 * Page « Application » de l'Atelier : installer l'application sur cet appareil, y recevoir les
 * notifications et choisir lesquelles, voir et retirer les appareils prévenus. Rien n'est simulé :
 * sans les clés VAPID, sans prise en charge du navigateur ou sans autorisation, la page dit pourquoi
 * et comment y remédier.
 */
type Types = Record<string, { titre: string; aide: string }>;
type Appareil = { id: string; nom: string; types: string[]; ajouteLe: string; dernierEnvoi?: string; dernierEchec?: string; finPoint: string };
type Etat = { config: { actif: boolean; clePublique: string | null }; types: Types; appareils: Appareil[] };

type Plateforme = "serveur" | "ios" | "android" | "ordinateur";
type Environnement = { plateforme: Plateforme; installee: boolean; push: boolean; permission: NotificationPermission | "absente" };

function lireEnvironnement(): string {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const plateforme: Plateforme = ios ? "ios" : /Android/.test(ua) ? "android" : "ordinateur";
  const installee = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const push = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;
  const permission = "Notification" in window ? Notification.permission : "absente";
  return JSON.stringify({ plateforme, installee, push, permission });
}
const SERVEUR = JSON.stringify({ plateforme: "serveur", installee: false, push: false, permission: "absente" });
const aucunAbonnement = () => () => {};

function versOctets(base64: string): Uint8Array<ArrayBuffer> {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(b);
  const sortie = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) sortie[i] = brut.charCodeAt(i);
  return sortie;
}

const date = (iso?: string) => (iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso)) : "");

function Installation({ env }: { env: Environnement }) {
  const [invite, setInvite] = useState(() => (typeof window === "undefined" ? null : (window.__atelierInvite ?? null)));
  useEffect(() => {
    const maj = () => setInvite(window.__atelierInvite ?? null);
    window.addEventListener(EVENEMENT_INVITE, maj);
    return () => window.removeEventListener(EVENEMENT_INVITE, maj);
  }, []);

  if (env.plateforme === "serveur") return <div aria-hidden="true"><span className="skeleton skeleton--line" /><span className="skeleton skeleton--line skeleton--short" /></div>;
  if (env.installee) return <p className="t-body">L’Atelier est installé sur cet appareil : vous l’ouvrez depuis son icône, comme une application.</p>;

  const ios = (
    <ol className="application-etapes">
      <li>Ouvrez cette page dans Safari.</li>
      <li>Touchez le bouton Partager, le carré d’où sort une flèche.</li>
      <li>Choisissez « Sur l’écran d’accueil », puis « Ajouter ».</li>
      <li>Ouvrez l’Atelier depuis sa nouvelle icône et connectez-vous une fois, avec Face ID si vous l’avez réglé.</li>
    </ol>
  );
  const android = (
    <ol className="application-etapes">
      <li>Ouvrez cette page dans Chrome.</li>
      <li>Touchez le menu, les trois points en haut à droite.</li>
      <li>Choisissez « Installer l’application » (ou « Ajouter à l’écran d’accueil »), puis confirmez.</li>
      <li>Ouvrez l’Atelier depuis sa nouvelle icône et connectez-vous une fois.</li>
    </ol>
  );
  const ordinateur = (
    <ol className="application-etapes">
      <li>Dans Chrome ou Edge, cliquez sur l’icône d’installation au bout de la barre d’adresse.</li>
      <li>Dans Safari sur Mac, choisissez Fichier, puis « Ajouter au Dock ».</li>
    </ol>
  );
  const principal = env.plateforme === "ios" ? ios : env.plateforme === "android" ? android : ordinateur;

  return (
    <div className="stack-s">
      {invite ? (
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await invite.prompt();
            await invite.userChoice.catch(() => null);
            window.__atelierInvite = null;
            setInvite(null);
          }}
        >
          Installer l’application
        </button>
      ) : null}
      {principal}
      <details className="application-autres">
        <summary>Sur un autre appareil</summary>
        <div className="stack-s">
          {env.plateforme !== "ios" ? (
            <>
              <p className="t-label">iPhone et iPad</p>
              {ios}
            </>
          ) : null}
          {env.plateforme !== "android" ? (
            <>
              <p className="t-label">Android</p>
              {android}
            </>
          ) : null}
          {env.plateforme !== "ordinateur" ? (
            <>
              <p className="t-label">Ordinateur</p>
              {ordinateur}
            </>
          ) : null}
        </div>
      </details>
    </div>
  );
}

export function ApplicationAtelier() {
  const atelier = useAtelier();
  const env = JSON.parse(useSyncExternalStore(aucunAbonnement, lireEnvironnement, () => SERVEUR)) as Environnement;
  const [etat, setEtat] = useState<Etat | null>(null);
  const [ici, setIci] = useState<string | null | undefined>(undefined);
  const [message, setMessage] = useState<{ texte: string; erreur?: boolean } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const route = atelier.api("/application/appareils");

  const charger = useCallback(async () => {
    const r = await fetch(route, { cache: "no-store" });
    if (!r.ok) throw new Error("lecture");
    setEtat((await r.json()) as Etat);
  }, [route]);

  useEffect(() => {
    let vivant = true;
    (async () => {
      await charger().catch(() => vivant && setMessage({ texte: "La liste des appareils n’a pas pu se charger. Rechargez la page.", erreur: true }));
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return vivant && setIci(null);
      const reg = await navigator.serviceWorker.getRegistration(`${atelier.base}/`).catch(() => undefined);
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      if (vivant) setIci(sub?.endpoint ?? null);
    })();
    return () => {
      vivant = false;
    };
  }, [charger, atelier.base]);

  const appel = async (methode: string, corps: unknown, url = route) => {
    const r = await fetch(url, { method: methode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!r.ok) throw new Error(d.error ?? "La demande n’a pas abouti. Réessayez.");
    return d;
  };

  const geste = async (fn: () => Promise<string | void>) => {
    setOccupe(true);
    setMessage(null);
    try {
      const texte = await fn();
      if (texte) setMessage({ texte });
    } catch (e) {
      setMessage({ texte: e instanceof Error ? e.message : "La demande n’a pas abouti. Réessayez.", erreur: true });
    } finally {
      setOccupe(false);
    }
  };

  const activer = () =>
    geste(async () => {
      if (!etat?.config.clePublique) throw new Error("Les notifications ne sont pas encore branchées.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Les notifications n’ont pas été autorisées sur cet appareil. Vous pourrez les autoriser plus tard dans les réglages du téléphone.");
      const reg = (await navigator.serviceWorker.getRegistration(`${atelier.base}/`)) ?? (await navigator.serviceWorker.register(`${atelier.base}/sw.js`, { scope: `${atelier.base}/`, updateViaCache: "none" }));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(etat.config.clePublique) }));
      await appel("POST", { abonnement: sub.toJSON() });
      setIci(sub.endpoint);
      await charger();
      return "Cet appareil reçoit désormais les notifications de l’Atelier.";
    });

  const couper = (a: Appareil) =>
    geste(async () => {
      if (a.finPoint === ici) {
        const reg = await navigator.serviceWorker.getRegistration(`${atelier.base}/`);
        await (await reg?.pushManager.getSubscription())?.unsubscribe();
        setIci(null);
      }
      await appel("DELETE", { id: a.id });
      await charger();
      return a.finPoint === ici ? "Cet appareil ne reçoit plus les notifications." : `${a.nom} ne reçoit plus les notifications.`;
    });

  const basculer = (a: Appareil, type: string, coche: boolean) =>
    geste(async () => {
      await appel("PATCH", { id: a.id, types: coche ? [...a.types, type] : a.types.filter((t) => t !== type) });
      await charger();
      return "Réglage enregistré.";
    });

  const essai = (a: Appareil) => geste(async () => (await appel("POST", { id: a.id }, atelier.api("/application/essai"))).message);

  const moi = etat?.appareils.find((a) => a.finPoint === ici) ?? null;
  const autres = etat?.appareils.filter((a) => a !== moi) ?? [];

  const notifications = () => {
    if (!etat || ici === undefined) return <div aria-hidden="true"><span className="skeleton skeleton--line" /><span className="skeleton skeleton--line skeleton--short" /></div>;
    if (!etat.config.actif)
      return (
        <p className="t-body">
          Les notifications ne sont pas encore branchées : il faut ajouter deux clés dans Vercel, VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY. La marche à suivre est dans ACTIVATION.md, section « Application de l’Atelier ».
        </p>
      );
    if (!env.push)
      return env.plateforme === "ios" && !env.installee ? (
        <p className="t-body">Sur iPhone et iPad, les notifications arrivent seulement dans l’application installée (iOS 16.4 ou plus récent). Installez l’Atelier ci-dessus, puis revenez sur cette page depuis son icône.</p>
      ) : (
        <p className="t-body">Ce navigateur ne reçoit pas les notifications. Ouvrez l’Atelier dans Safari, Chrome, Edge ou Firefox, à jour.</p>
      );
    if (env.permission === "denied" && !moi)
      return <p className="t-body">Les notifications sont refusées pour l’Atelier sur cet appareil. Autorisez-les dans les réglages du téléphone ou du navigateur, puis rechargez cette page.</p>;
    if (!moi)
      return (
        <div className="stack-s">
          <p className="t-body">Cet appareil ne reçoit pas encore les notifications. Vous choisirez ensuite ce qui vous prévient.</p>
          <button type="button" className="btn" onClick={activer} disabled={occupe}>
            Recevoir les notifications ici
          </button>
        </div>
      );
    return (
      <div className="stack-m">
        <p className="t-body">Cet appareil ({moi.nom}) reçoit les notifications.</p>
        <fieldset className="application-types" disabled={occupe}>
          <legend className="t-label">Ce qui vous prévient sur cet appareil</legend>
          {Object.entries(etat.types).map(([type, t]) => (
            <label key={type} className="application-type">
              <input type="checkbox" checked={moi.types.includes(type)} onChange={(e) => basculer(moi, type, e.currentTarget.checked)} />
              <span>
                <span className="application-type__titre">{t.titre}</span>
                <span className="application-type__aide">{t.aide}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="admin-actions">
          <button type="button" className="btn btn--outline" onClick={() => essai(moi)} disabled={occupe}>
            Envoyer une notification d’essai
          </button>
          <button type="button" className="btn btn--link" onClick={() => couper(moi)} disabled={occupe}>
            Ne plus rien recevoir ici
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="panel stack-m" aria-labelledby="installer-title">
        <h2 id="installer-title" className="t-h3">
          Installer l’application
        </h2>
        <Installation env={env} />
      </section>

      <section className="panel stack-m" aria-labelledby="notifications-title" aria-busy={!etat || ici === undefined}>
        <h2 id="notifications-title" className="t-h3">
          Notifications
        </h2>
        {notifications()}
        {message ? (
          <p role={message.erreur ? "alert" : "status"} className={message.erreur ? "field__error" : "t-note"}>
            {message.texte}
          </p>
        ) : null}
      </section>

      {autres.length ? (
        <section className="panel stack-m" aria-labelledby="appareils-title">
          <h2 id="appareils-title" className="t-h3">
            Autres appareils prévenus
          </h2>
          <ul className="application-appareils">
            {autres.map((a) => (
              <li key={a.id}>
                <span>
                  <span className="application-type__titre">{a.nom}</span>
                  <span className="application-type__aide">
                    Ajouté le {date(a.ajouteLe)}
                    {a.dernierEnvoi ? `, dernière notification le ${date(a.dernierEnvoi)}` : ""}
                  </span>
                </span>
                <button type="button" className="btn btn--link" onClick={() => couper(a)} disabled={occupe}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

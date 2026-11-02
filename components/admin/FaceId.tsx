"use client";
/**
 * Face ID ou l'empreinte pour entrer dans l'Atelier (clés d'accès, lib/auth/passkeys.ts) : la
 * détection de l'appareil, l'ajout de cet appareil, et la liste des appareils dans les Réglages.
 */
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useAtelier } from "./AtelierContext";

const rien = () => () => {};

/** L'appareil sait-il utiliser Face ID, l'empreinte ou son code ? (faux au rendu serveur) */
export function useFaceIdPossible(): boolean {
  return useSyncExternalStore(rien, () => browserSupportsWebAuthn(), () => false);
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  return { ok: Boolean(res?.ok), json };
}

const ANNULE = "Face ID a été annulé. Réessayez, ou entrez avec votre adresse et votre mot de passe.";

/** Connexion : renvoie null si l'Atelier est ouvert, sinon le message à afficher. */
export async function entrerAvecFaceId(api: (p: string) => string): Promise<string | null> {
  const o = await post(api("/login/passkey/options"), {});
  if (!o.ok) return o.json.error ?? "Face ID n’est pas disponible pour le moment.";
  let reponse: unknown;
  try {
    reponse = await startAuthentication({ optionsJSON: o.json });
  } catch {
    return ANNULE;
  }
  const v = await post(api("/login/passkey"), reponse);
  return v.ok ? null : (v.json.error ?? "Face ID n’a pas pu vous reconnaître.");
}

/** Ajout de cet appareil (session ouverte) : renvoie null si c'est fait, sinon le message. */
export async function ajouterCetAppareil(api: (p: string) => string): Promise<string | null> {
  const o = await post(api("/securite/passkey/options"), {});
  if (!o.ok) return o.json.error ?? "L’ajout n’a pas pu commencer.";
  let reponse: unknown;
  try {
    reponse = await startRegistration({ optionsJSON: o.json });
  } catch (e) {
    return e instanceof Error && e.name === "InvalidStateError" ? "Cet appareil ouvre déjà l’Atelier avec Face ID." : "L’ajout a été annulé.";
  }
  const v = await post(api("/securite/passkey"), reponse);
  return v.ok ? null : (v.json.error ?? "La clé n’a pas pu être enregistrée.");
}

const date = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

/** Réglages › Sécurité : les appareils qui ouvrent l'Atelier avec Face ID, en ajouter, en retirer. */
export function FaceIdManager({ cles }: { cles: { id: string; label: string; createdAt: string; lastUsedAt?: string }[] }) {
  const atelier = useAtelier();
  const router = useRouter();
  const possible = useFaceIdPossible();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  return (
    <div className="stack-m">
      {cles.length ? (
        <ul className="faceid-cles">
          {cles.map((c) => (
            <li key={c.id} className="faceid-cle">
              <span className="t-body t-left">{c.label}</span>
              <span className="t-note t-left">
                Ajouté le {date(c.createdAt)}
                {c.lastUsedAt ? ` · dernière entrée le ${date(c.lastUsedAt)}` : ""}
              </span>
              <button
                type="button"
                className="btn btn--link"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm(`Retirer Face ID pour « ${c.label} » ? Cet appareil devra de nouveau entrer avec le mot de passe et le code.`)) return;
                  setBusy(true);
                  const r = await post(atelier.api("/securite/passkey/retirer"), { id: c.id });
                  setBusy(false);
                  setMessage(r.ok ? { ok: true, texte: "Retiré." } : { ok: false, texte: r.json.error ?? "Le retrait n’a pas abouti." });
                  router.refresh();
                }}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-note t-left">Aucun appareil pour l’instant : vous entrez avec votre mot de passe et le code de l’application.</p>
      )}
      {possible ? (
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage(null);
            const erreur = await ajouterCetAppareil(atelier.api);
            setBusy(false);
            setMessage(erreur ? { ok: false, texte: erreur } : { ok: true, texte: "C’est fait : la prochaine fois, entrez avec Face ID." });
            router.refresh();
          }}
        >
          {busy ? "Un instant…" : "Ajouter Face ID sur cet appareil"}
        </button>
      ) : (
        <p className="t-note t-left">Ce navigateur ne sait pas utiliser Face ID ou l’empreinte : ouvrez l’Atelier dans Safari ou Chrome, sur votre téléphone ou votre ordinateur.</p>
      )}
      {message ? (
        <p className={message.ok ? "t-note t-left" : "field__error"} role={message.ok ? "status" : "alert"}>
          {message.texte}
        </p>
      ) : null}
    </div>
  );
}

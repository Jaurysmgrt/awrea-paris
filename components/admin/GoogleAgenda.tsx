"use client";
/**
 * Google Agenda dans l'Atelier (lib/google-agenda) : le bouton qui ouvre l'autorisation chez Google,
 * et la page de retour qui termine la connexion.
 *
 * Retour de Google : le cookie de session de l'Atelier (SameSite=Strict) n'accompagne pas une
 * arrivée depuis un autre site. La page se recharge donc une fois depuis elle-même, ce qui le fait
 * revenir, puis demande à la route de l'Atelier, session ouverte, de terminer la connexion.
 */
import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { useAtelier } from "./AtelierContext";

const AUTORISATION = "https://accounts.google.com/";

/** « Connecter Google Agenda » : prépare la connexion côté serveur, puis ouvre la page de Google. */
export function ConnecterGoogleAgenda({ label }: { label: string }) {
  const { api } = useAtelier();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="action-button">
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const res = await fetch(api("/agenda-google"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connecter" }) }).catch(() => null);
          const json = res ? await res.json().catch(() => ({})) : {};
          if (res?.ok && typeof json.url === "string" && json.url.startsWith(AUTORISATION)) {
            window.location.assign(json.url);
            return;
          }
          setBusy(false);
          setError(json.error ?? "La connexion n’a pas pu commencer. Réessayez dans un instant.");
        }}
      >
        {busy ? "Ouverture de Google…" : label}
      </button>
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** Fin de la connexion, sur la page où Google renvoie la créatrice. */
export function RetourGoogleAgenda({ code, state, erreur, session, relance }: { code: string; state: string; erreur: string; session: boolean; relance: boolean }) {
  const { api, href } = useAtelier();
  const envoye = useRef(false);
  const [reponse, setReponse] = useState<{ ok: boolean; message: string } | null>(null);
  const valable = Boolean(code && state && !erreur);

  useEffect(() => {
    if (!valable) return;
    if (!session) {
      // arrivée depuis Google : un rechargement depuis la page ramène la session de l'Atelier
      if (!relance) {
        const url = new URL(window.location.href);
        url.searchParams.set("relance", "1");
        window.location.replace(url.toString());
      }
      return;
    }
    if (envoye.current) return;
    envoye.current = true;
    (async () => {
      const res = await fetch(api("/agenda-google"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "terminer", code, state }) }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok) {
        setReponse({ ok: true, message: json.message ?? "Google Agenda est connecté." });
        // le code ne reste pas dans l'historique du navigateur
        window.location.replace(`${href("/rendez-vous")}?google=connecte`);
      } else setReponse({ ok: false, message: json.error ?? "La connexion n’a pas abouti. Recommencez depuis Rendez-vous." });
    })();
  }, [valable, session, relance, api, href, code, state]);

  let message: string;
  if (erreur === "access_denied") message = "Connexion annulée chez Google : rien n’a changé.";
  else if (erreur) message = "Google n’a pas donné l’accès : rien n’a changé. Vous pouvez recommencer depuis Rendez-vous.";
  else if (!valable) message = "Cette adresse ne vient pas de Google : rien n’a changé.";
  else if (!session && relance) message = "Votre session de l’Atelier est fermée. Connectez-vous, puis recommencez depuis Rendez-vous.";
  else if (reponse) message = reponse.message;
  else message = "Connexion à Google Agenda en cours…";

  const fini = !valable || (!session && relance) || (reponse && !reponse.ok);
  return (
    <div className="stack">
      <p className={reponse && !reponse.ok ? "field__error" : "t-body"} role={reponse && !reponse.ok ? "alert" : "status"}>
        {message}
      </p>
      {fini ? (
        <p>
          <Link href={!session && relance ? `${href("/connexion")}?suite=${encodeURIComponent("/rendez-vous")}` : href("/rendez-vous")} className="btn btn--outline">
            {!session && relance ? "Se connecter à l’Atelier" : "Revenir aux rendez-vous"}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

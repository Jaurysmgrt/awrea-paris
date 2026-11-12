"use client";
/**
 * Gestes de l'onglet E-mails › Parcours : créer un brouillon depuis un modèle, régler le plafond,
 * lancer un passage, donner ou retirer l'accord aux envois réels, créer un e-mail de parcours.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

type Retour = { ok: boolean; texte: string };

function useGeste() {
  const atelier = useAtelier();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const envoyer = async (corps: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    setBusy(true);
    setRetour(null);
    const res = await fetch(atelier.api("/parcours"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) }).catch(() => null);
    const json = (res ? await res.json().catch(() => ({})) : {}) as Record<string, unknown>;
    setBusy(false);
    setRetour({ ok: Boolean(res?.ok), texte: res?.ok ? String(json.message ?? "") : String(json.error ?? "Le geste n’a pas abouti.") });
    if (res?.ok) router.refresh();
    return res?.ok ? json : null;
  };
  return { atelier, router, busy, retour, envoyer };
}

function Retour({ retour }: { retour: Retour | null }) {
  if (!retour?.texte) return null;
  return (
    <p className={retour.ok ? "t-note t-left" : "field__error"} role={retour.ok ? "status" : "alert"}>
      {retour.texte}
    </p>
  );
}

export function CreerDepuisModele({ modele, nom }: { modele: string; nom: string }) {
  const { atelier, router, busy, retour, envoyer } = useGeste();
  return (
    <div className="parcours-geste">
      <button
        type="button"
        className="btn btn--outline"
        disabled={busy}
        aria-label={`Créer le brouillon « ${nom} »`}
        onClick={async () => {
          const r = await envoyer({ action: "creer", modele });
          if (r?.id) router.push(atelier.href(`/e-mails/parcours/${String(r.id)}`));
        }}
      >
        {busy ? "Création…" : "Créer ce brouillon"}
      </button>
      <Retour retour={retour} />
    </div>
  );
}

export function PlafondForm({ jours, min, max }: { jours: number; min: number; max: number }) {
  const { busy, retour, envoyer } = useGeste();
  const [v, setV] = useState(jours);
  return (
    <form
      className="parcours-geste"
      onSubmit={(e) => {
        e.preventDefault();
        void envoyer({ action: "reglages", plafondJours: v });
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor="parcours-plafond">
          Un e-mail marketing au plus tous les
        </label>
        <div className="parcours-ligne">
          <input id="parcours-plafond" className="field__input parcours-nombre" type="number" inputMode="numeric" min={min} max={max} required value={v} onChange={(e) => setV(Number(e.target.value))} />
          <span>jours, par personne</span>
        </div>
        <p className="field__hint">Tous parcours confondus, la lettre et les e-mails automatiques compris.</p>
      </div>
      <div>
        <button type="submit" className="btn btn--outline" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer le réglage"}
        </button>
      </div>
      <Retour retour={retour} />
    </form>
  );
}

export function LancerPassage() {
  const { busy, retour, envoyer } = useGeste();
  return (
    <div className="parcours-geste">
      <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void envoyer({ action: "lancer" })}>
        {busy ? "Passage en cours…" : "Lancer un passage maintenant"}
      </button>
      <Retour retour={retour} />
    </div>
  );
}

/**
 * Accord de la créatrice aux envois réels (seconde clé). Allumer demande une confirmation qui
 * rappelle les parcours actifs ; couper est immédiat.
 */
export function AccordEnvoisReels({ actif, parcoursActifs, variable }: { actif: boolean; parcoursActifs: string[]; variable: boolean }) {
  const { busy, retour, envoyer } = useGeste();
  return (
    <div className="parcours-geste">
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        className="switch"
        disabled={busy}
        onClick={async () => {
          if (actif) return void envoyer({ action: "envois-reels", actif: false });
          const liste = parcoursActifs.length ? `Parcours actifs : ${parcoursActifs.join(", ")}.` : "Aucun parcours n’est actif pour l’instant.";
          const suite = variable ? "Les e-mails partiront pour de vrai dès le prochain passage." : "Ils partiront quand la Maison aura posé PARCOURS_ENVOIS_REELS dans Vercel.";
          if (!window.confirm(`Autoriser les envois réels des parcours ? ${liste} ${suite}`)) return;
          await envoyer({ action: "envois-reels", actif: true, confirme: true });
        }}
      >
        <span className="switch__track" aria-hidden="true" />
        <span className="switch__label">{actif ? "Envois réels autorisés" : "Autoriser les envois réels"}</span>
      </button>
      <Retour retour={retour} />
    </div>
  );
}

export function NouvelEmail() {
  const { atelier, router, busy, retour, envoyer } = useGeste();
  const [nom, setNom] = useState("");
  return (
    <form
      className="parcours-geste"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await envoyer({ action: "email", nom });
        if (r?.id) router.push(atelier.href(`/e-mails/${String(r.id)}`));
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor="parcours-email-nom">
          Nom du nouvel e-mail
        </label>
        <input id="parcours-email-nom" className="field__input" required minLength={2} maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>
      <div>
        <button type="submit" className="btn btn--outline" disabled={busy}>
          {busy ? "Création…" : "Créer l’e-mail"}
        </button>
      </div>
      <Retour retour={retour} />
    </form>
  );
}

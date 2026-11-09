"use client";
/**
 * Les personnes de l'Atelier (Réglages), demande de la créatrice du 09/11 : ajouter une personne,
 * lui donner un nouveau code d'invitation, la retirer. Réservé à la propriétaire ; chaque geste
 * redemande son code à six chiffres (app/api/gestion/personnes/route.ts). Le code d'invitation
 * s'affiche une seule fois, avec le message tout prêt à envoyer à la personne.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtelier } from "./AtelierContext";

type Invitation = { email: string; invitation: string; expire: string; adresse: string };

const date = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));

async function envoyer(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  return { ok: Boolean(res?.ok), json };
}

function ChampCode({ id }: { id: string }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        Votre code à six chiffres
      </label>
      <input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} required className="field__input" />
      <p className="field__hint">Celui de votre application d’authentification, demandé à chaque ajout ou retrait.</p>
    </div>
  );
}

/** Ce qu'il faut donner à la personne : l'adresse de l'Atelier et son code, une seule fois. */
function CarteInvitation({ inv }: { inv: Invitation }) {
  const [copie, setCopie] = useState(false);
  const message = `Bonjour, voici votre accès à l’Atelier d’Awrea Paris.\n1. Ouvrez cette adresse : ${inv.adresse}\n2. Écrivez votre adresse e-mail (${inv.email}) et, dans « Mot de passe », ce code d’invitation : ${inv.invitation}\n3. Choisissez votre mot de passe, installez votre code à six chiffres, puis ajoutez Face ID ou votre empreinte.\nLe code ne sert qu’une fois, jusqu’au ${date(inv.expire)}.`;
  return (
    <div className="invitation stack-s" role="status">
      <p className="t-label">Invitation pour {inv.email}</p>
      <p className="t-note t-left">À lui donner de vive voix ou par message. Ce code ne sera plus affiché ; il ne sert qu’une fois, jusqu’au {date(inv.expire)}.</p>
      <dl className="invitation__infos">
        <dt className="t-note">Adresse de l’Atelier</dt>
        <dd className="lien-prive">{inv.adresse}</dd>
        <dt className="t-note">Code d’invitation (à écrire dans « Mot de passe »)</dt>
        <dd className="lien-prive invitation__code">{inv.invitation}</dd>
      </dl>
      <button
        type="button"
        className="btn btn--outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(message);
            setCopie(true);
          } catch {
            setCopie(false);
          }
        }}
      >
        {copie ? "Message copié" : "Copier le message à envoyer"}
      </button>
    </div>
  );
}

/** Ajouter une personne : son adresse e-mail et votre code. */
export function AjouterPersonne() {
  const { api } = useAtelier();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inv, setInv] = useState<Invitation | null>(null);
  return (
    <div className="stack-m">
      <form
        className="stack-m admin-login__form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          setBusy(true);
          setError("");
          const { ok, json } = await envoyer(api("/personnes"), { action: "ajouter", email: f.get("email"), code: f.get("code") });
          setBusy(false);
          if (!ok) return setError(json.error ?? "L’ajout n’a pas abouti.");
          form.reset();
          setInv(json as Invitation);
          router.refresh();
        }}
      >
        <h3 className="t-label">Ajouter une personne</h3>
        <div className="field">
          <label htmlFor="personne-email" className="field__label">
            Son adresse e-mail
          </label>
          <input id="personne-email" name="email" type="email" required autoComplete="off" className="field__input" />
        </div>
        <ChampCode id="personne-code" />
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Ajout…" : "Ajouter cette personne"}
        </button>
      </form>
      {inv ? <CarteInvitation inv={inv} /> : null}
    </div>
  );
}

/** Nouveau code d'invitation, ou retrait, d'une personne ajoutée : votre code avant le geste. */
export function GestePersonne({ email, action }: { email: string; action: "nouveau-code" | "retirer" }) {
  const { api } = useAtelier();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inv, setInv] = useState<Invitation | null>(null);
  const libelle = action === "retirer" ? "Retirer" : "Nouveau code d’invitation";
  const id = `geste-${action}-${email.replace(/[^a-z0-9]/gi, "-")}`;
  if (inv) return <CarteInvitation inv={inv} />;
  if (!ouvert)
    return (
      <button type="button" className="btn btn--link" onClick={() => setOuvert(true)}>
        {libelle}
      </button>
    );
  return (
    <form
      className="stack-s"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const { ok, json } = await envoyer(api("/personnes"), { action, email, code: new FormData(e.currentTarget).get("code") });
        setBusy(false);
        if (!ok) return setError(json.error ?? "Le geste n’a pas abouti.");
        if (action === "nouveau-code") setInv(json as Invitation);
        router.refresh();
      }}
    >
      <p className="t-note t-left">
        {action === "retirer"
          ? `${email} ne pourra plus entrer : ses sessions, son mot de passe, son code, son Face ID et les notifications de ses appareils seront supprimés.`
          : `L’accès actuel de ${email} ne servira plus : elle entrera de nouveau avec le code d’invitation, puis refera son mot de passe et son code.`}
      </p>
      <ChampCode id={id} />
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      <span className="proposal__actions">
        <button type="submit" className="btn btn--outline" disabled={busy}>
          {busy ? "Un instant…" : action === "retirer" ? "Retirer cette personne" : "Donner un nouveau code"}
        </button>
        <button type="button" className="btn btn--link" onClick={() => setOuvert(false)} disabled={busy}>
          Annuler
        </button>
      </span>
    </form>
  );
}

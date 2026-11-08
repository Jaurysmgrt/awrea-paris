"use client";
/**
 * Nouvelle pièce, en quatre étapes courtes : les photos, la pièce (nom, catégorie, collection,
 * tailles), le prix et le délai, puis les notes de la créatrice. L'agent Catalogue rédige la fiche à
 * partir des photos et des notes, sans rien inventer ; la pièce naît toujours en brouillon et sa
 * fiche s'ouvre aussitôt : la créatrice relit, regarde l'aperçu, puis la met en ligne.
 * Chaque pièce est créée sur demande, sans stock : toutes les tailles cochées se commandent.
 */
import Link from "@/components/ui/Link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAtelier } from "./AtelierContext";
import { DEFAULT_LEAD_TIME, LEAD_TIME_BOUNDS } from "@/lib/commerce/availability";
import type { LeadTime } from "@/lib/commerce/types";

type Photo = { id: string; url: string; name: string };
type Categorie = "" | "robe" | "body" | "top" | "jupe" | "accessoire";
const TAILLES = ["XS", "S", "M", "L", "XL", "TU"] as const;
const ETAPES = ["Les photos", "La pièce", "Prix et délai", "Vos notes"] as const;
const PHOTOS_MAX = 8;
const DELAIS = DEFAULT_LEAD_TIME as Record<string, LeadTime>;

/** Photo réduite dans le navigateur (1 600 px au plus) avant l'envoi. */
async function reduire(file: File): Promise<{ data: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  return { data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], width, height };
}

export function NouvellePiece({ collections }: { collections: { handle: string; title: string }[] }) {
  const atelier = useAtelier();
  const router = useRouter();
  const titre = useRef<HTMLHeadingElement>(null);
  const [etape, setEtape] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<Categorie>("");
  const [collection, setCollection] = useState(collections[0]?.handle ?? "");
  const [tailles, setTailles] = useState<Record<string, boolean>>(Object.fromEntries(TAILLES.map((t) => [t, t !== "XL" && t !== "TU"])));
  const [prix, setPrix] = useState("");
  const [prixProvisoire, setPrixProvisoire] = useState(false);
  const [delai, setDelai] = useState<LeadTime>(DELAIS.robe);
  const [delaiProvisoire, setDelaiProvisoire] = useState(true);
  const [notes, setNotes] = useState("");
  const [etat, setEtat] = useState<"idle" | "busy" | "attente" | "error">("idle");
  const [message, setMessage] = useState("");
  const [erreurEtape, setErreurEtape] = useState("");
  const premierRendu = useRef(true);

  // à chaque étape, le titre prend le focus : un lecteur d'écran annonce où l'on se trouve
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    titre.current?.focus();
  }, [etape]);

  async function ajouterPhotos(files: FileList | null) {
    if (!files?.length) return;
    setEnvoi(true);
    setErreurEtape("");
    let refusees = 0;
    for (const file of Array.from(files).slice(0, PHOTOS_MAX - photos.length)) {
      try {
        const { data, width, height } = await reduire(file);
        const res = await fetch(atelier.api("/media"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, mediaType: "image/jpeg", data, width, height }) });
        const j = await res.json();
        if (res.ok) setPhotos((p) => [...p, { id: j.id, url: j.url, name: file.name }]);
        else refusees++;
      } catch {
        refusees++;
      }
    }
    setEnvoi(false);
    if (refusees) setErreurEtape(refusees > 1 ? `${refusees} photos n’ont pas pu être préparées. Essayez une autre photo.` : "Une photo n’a pas pu être préparée. Essayez une autre photo.");
  }

  const premiere = (id: string) => setPhotos((p) => [...p.filter((x) => x.id === id), ...p.filter((x) => x.id !== id)]);
  const taillesChoisies = TAILLES.filter((t) => tailles[t]);
  const prixEuros = Number(prix.replace(",", "."));

  /** Ce qui manque pour passer à l'étape suivante, en mots simples. */
  function manque(): string {
    if (etape === 0) return photos.length ? "" : "Ajoutez au moins une photo de la pièce.";
    if (etape === 1) return taillesChoisies.length ? "" : "Cochez au moins une taille.";
    if (etape === 2) {
      if (!(prixEuros > 0)) return "Indiquez le prix de la pièce.";
      if (delai.min > delai.max) return "Le délai au plus tôt dépasse le délai au plus tard.";
    }
    return "";
  }

  function suivant() {
    const m = manque();
    setErreurEtape(m);
    if (!m) setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  }

  async function creer() {
    const m = manque();
    setErreurEtape(m);
    if (m) return;
    setEtat("busy");
    setMessage("");
    const res = await fetch(atelier.api("/catalogue"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        name: nom.trim() || undefined,
        category: categorie || undefined,
        collection: collection || undefined,
        priceEuros: prixEuros,
        priceProvisional: prixProvisoire,
        leadTime: delai,
        leadTimeProvisional: delaiProvisoire,
        sizes: taillesChoisies,
        mediaIds: photos.map((p) => p.id),
      }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && j.handle) {
      router.push(atelier.href(`/catalogue/${j.handle}`));
      return;
    }
    if (res?.ok && j.run?.proposed) {
      setEtat("attente");
      setMessage(String(j.run.summary ?? ""));
      return;
    }
    setEtat("error");
    setMessage(j.error ?? (j.run?.errors?.length ? `La fiche n’a pas pu être créée : ${j.run.errors.join(" ; ")}` : "La fiche n’a pas pu être créée. Merci de réessayer."));
  }

  return (
    <div className="nouvelle-piece stack-l">
      <ol className="nouvelle-etapes" aria-label="Étapes">
        {ETAPES.map((nomEtape, i) => (
          <li key={nomEtape} aria-current={i === etape ? "step" : undefined} data-faite={i < etape || undefined}>
            <span className="nouvelle-etapes__num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="nouvelle-etapes__nom">{nomEtape}</span>
          </li>
        ))}
      </ol>

      <div className="stack-m">
        <h2 id="etape-titre" className="t-h3" tabIndex={-1} ref={titre}>
          <span className="sr-only">
            Étape {etape + 1} sur {ETAPES.length}&nbsp;:{" "}
          </span>
          {ETAPES[etape]}
        </h2>

        {etape === 0 ? (
          <div className="field stack-s">
            <p className="field__hint">Jusqu’à {PHOTOS_MAX} photos. La première est celle que l’on voit dans les listes.</p>
            {photos.length < PHOTOS_MAX ? (
              <label className="dropzone">
                <input type="file" accept="image/*" multiple onChange={(e) => ajouterPhotos(e.target.files)} />
                <span className="t-body">{envoi ? "Préparation des photos…" : "Choisir ou déposer les photos"}</span>
              </label>
            ) : null}
            {photos.length ? (
              <ul className="thumbs">
                {photos.map((p, i) => (
                  <li key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Photo ${i + 1}`} width={80} height={120} />
                    {i === 0 ? (
                      <span className="t-note">Principale</span>
                    ) : (
                      <button type="button" className="link link--quiet" onClick={() => premiere(p.id)}>
                        Mettre en premier
                      </button>
                    )}
                    <button type="button" className="link link--quiet" onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))}>
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {etape === 1 ? (
          <div className="stack-m">
            <div className="form__row form__row--3">
              <div className="field">
                <label className="field__label" htmlFor="np-nom">
                  Nom (facultatif)
                </label>
                <input id="np-nom" className="field__input" value={nom} maxLength={80} placeholder="La robe Odessa" onChange={(e) => setNom(e.target.value)} />
                <span className="field__hint">Sans nom, l’agent en propose un.</span>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="np-cat">
                  Catégorie
                </label>
                <select
                  id="np-cat"
                  className="field__input"
                  value={categorie}
                  onChange={(e) => {
                    const c = e.target.value as Categorie;
                    setCategorie(c);
                    setDelai(DELAIS[c] ?? DELAIS.robe);
                  }}
                >
                  <option value="">D’après les photos</option>
                  <option value="robe">Robe</option>
                  <option value="body">Body</option>
                  <option value="top">Top</option>
                  <option value="jupe">Jupe</option>
                  <option value="accessoire">Accessoire</option>
                </select>
              </div>
              {collections.length ? (
                <div className="field">
                  <label className="field__label" htmlFor="np-col">
                    Collection
                  </label>
                  <select id="np-col" className="field__input" value={collection} onChange={(e) => setCollection(e.target.value)}>
                    {collections.map((c) => (
                      <option key={c.handle} value={c.handle}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            <fieldset className="field">
              <legend className="field__label">Tailles proposées</legend>
              <p className="field__hint">La pièce est créée sur demande : chaque taille cochée se commande toujours, sans stock.</p>
              <div className="size-picker__options">
                {TAILLES.map((t) => (
                  <label key={t} className="check">
                    <input type="checkbox" checked={tailles[t]} onChange={(e) => setTailles((x) => ({ ...x, [t]: e.target.checked }))} />
                    <span>{t === "TU" ? "Taille unique" : t}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {etape === 2 ? (
          <div className="form__row form__row--3">
            <div className="field">
              <label className="field__label" htmlFor="np-prix">
                Prix (€)
              </label>
              <input id="np-prix" type="number" min={1} step={0.01} inputMode="decimal" className="field__input" value={prix} onChange={(e) => setPrix(e.target.value)} />
              <label className="check t-note">
                <input type="checkbox" checked={prixProvisoire} onChange={(e) => setPrixProvisoire(e.target.checked)} />
                <span>Prix provisoire, à confirmer</span>
              </label>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="np-min">
                Délai au plus tôt (semaines)
              </label>
              <input id="np-min" type="number" min={LEAD_TIME_BOUNDS.min} max={LEAD_TIME_BOUNDS.max} className="field__input" value={delai.min} onChange={(e) => setDelai((d) => ({ ...d, min: Number(e.target.value) }))} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="np-max">
                Délai au plus tard (semaines)
              </label>
              <input id="np-max" type="number" min={LEAD_TIME_BOUNDS.min} max={LEAD_TIME_BOUNDS.max} className="field__input" value={delai.max} onChange={(e) => setDelai((d) => ({ ...d, max: Number(e.target.value) }))} />
              <label className="check t-note">
                <input type="checkbox" checked={delaiProvisoire} onChange={(e) => setDelaiProvisoire(e.target.checked)} />
                <span>Délai provisoire, à confirmer</span>
              </label>
            </div>
          </div>
        ) : null}

        {etape === 3 ? (
          <div className="field">
            <label className="field__label" htmlFor="np-notes">
              Vos notes
            </label>
            <textarea id="np-notes" className="field__input" rows={5} maxLength={4000} value={notes} placeholder="Dentelle noire, drapé noué sur le buste, manches longues…" onChange={(e) => setNotes(e.target.value)} />
            <span className="field__hint">La fiche est rédigée d’après vos photos et vos notes, rien de plus : la matière, la composition et l’entretien restent à compléter s’ils ne sont pas écrits ici. La pièce est créée en brouillon ; vous la relisez avant de la mettre en ligne.</span>
          </div>
        ) : null}
      </div>

      <div className="nouvelle-piece__actions">
        {etape > 0 ? (
          <button type="button" className="btn btn--outline" disabled={etat === "busy"} onClick={() => (setErreurEtape(""), setEtape((e) => e - 1))}>
            Retour
          </button>
        ) : null}
        {etape < ETAPES.length - 1 ? (
          <button type="button" className="btn" disabled={envoi} onClick={suivant}>
            Continuer
          </button>
        ) : (
          <button type="button" className="btn" disabled={etat === "busy" || etat === "attente" || envoi} onClick={creer}>
            {etat === "busy" ? "L’agent rédige la fiche…" : "Créer la pièce en brouillon"}
          </button>
        )}
      </div>

      {/* zones d'annonce présentes dès le départ : les lecteurs d'écran lisent ce qui s'y inscrit */}
      <p className="t-note" role="status">
        {etat === "attente" ? (
          <>
            {message}{" "}
            <Link href={atelier.href("/validations")} className="text-link">
              Ouvrir À valider
            </Link>
          </>
        ) : etat === "busy" ? (
          "L’agent rédige la fiche à partir de vos photos et de vos notes. Cela prend souvent moins d’une minute."
        ) : (
          ""
        )}
      </p>
      <p className="field__error" role="alert">
        {erreurEtape || (etat === "error" ? message : "")}
      </p>
    </div>
  );
}

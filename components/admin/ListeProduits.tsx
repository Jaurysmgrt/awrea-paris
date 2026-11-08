"use client";
/**
 * Liste des produits de l'Atelier (refonte du 07/11) : une recherche par nom, quatre filtres (toutes,
 * en ligne, brouillons, archivées) et une ligne par pièce qui ouvre sa fiche. Les données arrivent
 * prêtes du serveur (app/gestion/catalogue/page.tsx) ; le filtre se fait sur place, sans rechargement.
 */
import { useId, useState } from "react";
import Link from "@/components/ui/Link";
import { useAtelier } from "./AtelierContext";
import { LIBELLE_STATUT, STATUTS, type StatutPiece } from "@/lib/commerce/statut-pieces";

export interface LigneProduit {
  handle: string;
  title: string;
  image: string | null;
  prix: string;
  statut: StatutPiece;
  /** ce qui reste à faire sur la pièce, en mots simples (prix à confirmer, aucune taille…) */
  notes: string[];
  collection: string;
}

// en ligne : le cas courant, discret ; un brouillon se remarque ; une archive s'efface
const CLASSE_STATUT: Record<StatutPiece, string> = { "en-ligne": "status", brouillon: "status status--pending", archivee: "status status--info" };
const FILTRES: { id: StatutPiece | "toutes"; label: string }[] = [{ id: "toutes", label: "Toutes" }, ...STATUTS.map((s) => ({ id: s, label: s === "en-ligne" ? "En ligne" : s === "brouillon" ? "Brouillons" : "Archivées" }))];

export function ListeProduits({ pieces }: { pieces: LigneProduit[] }) {
  const atelier = useAtelier();
  const id = useId();
  const [filtre, setFiltre] = useState<StatutPiece | "toutes">("toutes");
  const [cherche, setCherche] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const visibles = pieces.filter((p) => (filtre === "toutes" || p.statut === filtre) && (!cherche.trim() || norm(p.title).includes(norm(cherche.trim()))));
  const nombre = (f: StatutPiece | "toutes") => (f === "toutes" ? pieces.length : pieces.filter((p) => p.statut === f).length);

  return (
    <div className="stack-m">
      <div className="produits__outils">
        <div className="field produits__recherche">
          <label className="field__label" htmlFor={`${id}-cherche`}>
            Chercher une pièce
          </label>
          <input id={`${id}-cherche`} type="search" className="field__input" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="La robe Odessa" autoComplete="off" />
        </div>
        <div className="produits__filtres" role="group" aria-label="Afficher">
          {FILTRES.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)}>
              {f.label} ({nombre(f.id)})
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status">
        {`${visibles.length} pièce${visibles.length > 1 ? "s" : ""} affichée${visibles.length > 1 ? "s" : ""}`}
      </p>
      {visibles.length ? (
        <ul className="produits" aria-label={`${visibles.length} pièce${visibles.length > 1 ? "s" : ""}`}>
          {visibles.map((p) => (
            <li key={p.handle}>
              <Link href={atelier.href(`/catalogue/${p.handle}`)} className="produits__ligne">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" width={48} height={64} className="produits__photo" loading="lazy" />
                ) : (
                  <span className="produits__photo produits__photo--vide" aria-hidden="true" />
                )}
                <span className="produits__nom">
                  <span className="liste-simple__titre">{p.title}</span>
                  <span className="t-note">{[p.collection, ...p.notes].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="produits__prix">{p.prix}</span>
                <span className={CLASSE_STATUT[p.statut]}>{LIBELLE_STATUT[p.statut]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-note">{cherche.trim() ? `Aucune pièce ne s’appelle « ${cherche.trim()} ».` : filtre === "toutes" ? "Aucune pièce pour l’instant. Ajoutez la première." : "Aucune pièce ici pour l’instant."}</p>
      )}
    </div>
  );
}

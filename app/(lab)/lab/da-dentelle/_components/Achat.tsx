"use client";
/**
 * L'achat, simple et évident (logique de components/commerce/ProductForm, mise en page propre) :
 *  - la taille se choisit par ses mesures réelles (guide des tailles intégré, sans fenêtre) et
 *    chaque taille dit son état à l'atelier : prête, ou façonnée sur commande, avec son délai ;
 *  - un seul bouton, « Ajouter au panier » ou « Précommander » ;
 *  - une barre d'achat reste à portée tant que le bouton principal n'est pas à l'écran.
 */
import Link from "@/components/ui/Link";
import { useEffect, useId, useRef, useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { editionInfo, variantAvailability } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/components/commerce/CartProvider";
import { WishlistButton } from "@/components/commerce/WishlistButton";
import s from "../da-dentelle.module.css";

export type MesuresTaille = { variantId: string; fr: string; poitrine: string; taille: string; hanches: string };

const cm = (v: string) => v.replace(/\s*cm$/, "");

export function Achat({ product, mesures, delaiExpedition }: { product: Product; mesures: MesuresTaille[]; delaiExpedition: string }) {
  const { dispatch, busy } = useCart();
  const nom = useId();
  const [choix, setChoix] = useState<Variant | null>(product.variants.length === 1 ? product.variants[0] : null);
  const [rappel, setRappel] = useState(false);
  const [barre, setBarre] = useState(false);
  const actions = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLFieldSetElement>(null);
  const ed = editionInfo(product);
  const etat = choix ? variantAvailability(product, choix) : null;
  const semaines = product.leadTimeWeeks ?? 4;

  // la barre d'achat paraît une fois le bouton principal dépassé (au chargement, rien ne recouvre
  // la page) ; calculée au défilement, elle suit aussi les sauts (ancre, retour en haut)
  useEffect(() => {
    const el = actions.current;
    if (!el) return;
    let frame = 0;
    const mesure = () => {
      frame = 0;
      setBarre(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(mesure);
    };
    mesure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const dispo = (v: Variant) => {
    const a = variantAvailability(product, v);
    if (a === "preorder") return "Sur commande";
    if (a === "soldout") return "Épuisée";
    if (a === "low") return "Une pièce prête";
    return "Prête à partir";
  };
  const surCommande = product.variants.some((v) => variantAvailability(product, v) === "preorder");

  const statut = choix && etat
    ? etat === "preorder"
      ? `Taille ${choix.size} sur commande : façonnée pour vous en ${semaines} semaines, puis expédiée.`
      : etat === "soldout"
        ? `La taille ${choix.size} est épuisée.`
        : `Taille ${choix.size} prête, expédiée sous ${delaiExpedition}.`
    : rappel
      ? "Merci de choisir une taille."
      : "Choisissez votre taille d’après vos mesures.";

  const ajouter = async () => {
    if (!choix) {
      setRappel(true);
      champ.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      champ.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      return;
    }
    await dispatch({ type: "add", variantId: choix.id }, { openAfter: true, announce: `${product.title}, taille ${choix.size}, ajoutée au panier` });
  };

  const epuisee = etat === "soldout";
  const libelle = !choix ? "Ajouter au panier" : etat === "preorder" ? "Précommander" : "Ajouter au panier";

  return (
    <>
      <fieldset ref={champ} className={s.mesures}>
        <legend className="t-label">Votre taille · mesures du corps en centimètres</legend>
        <div className={`${s.mesuresTete} t-label`} aria-hidden="true">
          <span className={`${s.mesureCellule} ${s.mesurePoitrine}`}>Poitrine</span>
          <span className={`${s.mesureCellule} ${s.mesureTour}`}>Taille</span>
          <span className={`${s.mesureCellule} ${s.mesureHanches}`}>Hanches</span>
        </div>
        {product.variants.map((v) => {
          const m = mesures.find((x) => x.variantId === v.id);
          const choisie = choix?.id === v.id;
          return (
            <label key={v.id} className={s.mesure} data-choisie={choisie} data-epuisee={variantAvailability(product, v) === "soldout"}>
              <input
                type="radio"
                name={nom}
                value={v.id}
                checked={choisie}
                onChange={() => {
                  setChoix(v);
                  setRappel(false);
                }}
              />
              <span className={`${s.mesureCellule} ${s.mesureTaille}`}>
                <b>{v.size === "TU" ? "Unique" : v.size}</b>
                {m ? <span className="t-note">{m.fr}</span> : null}
              </span>
              {m ? (
                <>
                  <span className={`${s.mesureCellule} ${s.mesurePoitrine}`} aria-hidden="true">{cm(m.poitrine)}</span>
                  <span className={`${s.mesureCellule} ${s.mesureTour}`} aria-hidden="true">{cm(m.taille)}</span>
                  <span className={`${s.mesureCellule} ${s.mesureHanches}`} aria-hidden="true">{cm(m.hanches)}</span>
                  <span className="sr-only">
                    , taille française {m.fr} : tour de poitrine {m.poitrine}, tour de taille {m.taille}, tour de hanches {m.hanches}
                  </span>
                </>
              ) : null}
              <span className={`${s.mesureCellule} ${s.mesureEtat} t-note`}>{dispo(v)}</span>
            </label>
          );
        })}
      </fieldset>
      {surCommande ? (
        <p className={`t-note ${s.mesuresNote} ${s.sansJustif}`}>
          Sur commande : la pièce est façonnée pour vous en {semaines} semaines, puis expédiée.
        </p>
      ) : null}
      <div ref={actions} className={s.achatActions}>
        {epuisee ? (
          <Link href={`/boutique/${product.handle}#liste-attente`} className="btn btn--block">
            Être prévenue
          </Link>
        ) : (
          <button type="button" className="btn btn--solid btn--block" onClick={ajouter} disabled={busy}>
            {libelle}
          </button>
        )}
        <WishlistButton handle={product.handle} title={product.title} />
      </div>
      <p className={`t-note ${s.achatStatut}`} aria-live="polite">
        {statut}
      </p>
      <p className="t-note">{product.fit}</p>
      <p className="t-note">
        Un doute ? <Link href="/contact#rendez-vous" className="text-link">Demander conseil à l’atelier</Link> ou essayer la pièce sur rendez-vous.
      </p>

      {/* barre d'achat : visible quand le bouton principal n'est pas à l'écran */}
      <div className={s.barre} data-visible={barre} data-theme="ivory">
        <div className={`container ${s.barreGrille}`}>
          <p className={`${s.barrePiece} ${s.sansJustif}`}>
            <span className={s.barreNom}>{product.title}</span>
            <span className="t-note">
              {ed.unique ? "Pièce unique" : `N° ${ed.complete ? ed.total : ed.nextNumber} / ${ed.total}`} · {formatPrice(product.price)}
            </span>
          </p>
          <div className={s.barreActions}>
            <span className={`t-label ${s.barreTaille}`}>{choix ? `Taille ${choix.size}` : "Taille à choisir"}</span>
            {/* btn--block : le bouton de la barre reste immobile (seul l'appel principal est magnétique) */}
            <button type="button" className={`btn btn--solid btn--block ${s.barreBouton}`} onClick={ajouter} disabled={busy || epuisee} tabIndex={barre ? 0 : -1}>
              {choix ? libelle : "Choisir ma taille"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

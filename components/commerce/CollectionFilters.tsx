"use client";
/**
 * Filtres d'une liste de pièces (maquette PAGE PRODUIT) : la colonne « Filtrer par », ses groupes
 * Catégorie, Prix, Taille et Collection séparés de filets fins, « + » fermé et « − » ouvert.
 *
 * Accessibilité : chaque groupe est un vrai groupe de boutons radio (fieldset et légende), le choix
 * est annoncé par le lecteur d'écran, le nombre de pièces trouvées l'est poliment (role="status").
 * Les filtres vivent dans l'adresse : chaque choix remplace l'adresse sans faire défiler la page, et
 * le serveur rend la liste filtrée (une sélection se partage). Sans JavaScript, le formulaire
 * s'envoie avec son bouton. Sous 1024 px, la colonne devient un panneau qu'ouvre le bouton
 * « Filtrer », en tête de liste.
 *
 * Aucun texte ici : libellés transmis par la page (document « boutique », filtres).
 */
import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocalize } from "@/components/providers/LocaleProvider";
import Link from "@/components/ui/Link";
import { fill } from "@/lib/edition/fill";
import type { FilterGroup } from "./piece-filters";
import s from "./CollectionFilters.module.css";

export interface FilterTexts {
  titre: string;
  bouton: string;
  boutonActifs: string;
  fermer: string;
  effacer: string;
  appliquer: string;
  resultats: { aucune: string; une: string; plusieurs: string };
}

type Values = Record<string, string>;

export function CollectionFilters({ action, groups, count, texts, children }: { action: string; groups: FilterGroup[]; count: number; texts: FilterTexts; children: ReactNode }) {
  const router = useRouter();
  const localize = useLocalize();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const panelId = `${uid}-filtres`;
  const titleId = `${uid}-titre`;

  // choix affichés tout de suite, en attendant la liste filtrée ; recalés sur la page reçue
  const confirmed: Values = Object.fromEntries(groups.map((g) => [g.key, g.value]));
  const confirmedKey = JSON.stringify(confirmed);
  const [chosen, setChosen] = useState<Values>(confirmed);
  const [seen, setSeen] = useState(confirmedKey);
  if (seen !== confirmedKey) {
    setSeen(confirmedKey);
    setChosen(confirmed);
  }

  // un choix qui porte sa propre adresse (une autre collection) n'est pas un filtre de la page
  const own = (g: FilterGroup, v: string) => g.options.find((o) => o.value === v)?.href;
  const active = groups.filter((g) => g.value && !own(g, g.value)).length;

  const destination = (next: Values) => {
    let path = action;
    const q = new URLSearchParams();
    for (const g of groups) {
      const v = next[g.key] ?? "";
      const href = own(g, v);
      if (href) path = href;
      else if (v) q.set(g.key, v);
    }
    const qs = q.toString();
    return { path, url: qs ? `${path}?${qs}` : path };
  };

  const pick = (key: string, value: string) => {
    const next = { ...chosen, [key]: value };
    setChosen(next);
    const { path, url } = destination(next);
    startTransition(() => {
      if (path === action) router.replace(localize(url), { scroll: false });
      else router.push(localize(url));
    });
  };

  const found = count === 0 ? texts.resultats.aucune : count === 1 ? texts.resultats.une : fill(texts.resultats.plusieurs, { n: count });

  return (
    <div className={s.listing}>
      <div className={s.bar}>
        <button ref={toggleRef} type="button" className={`btn btn--outline ${s.toggle}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
          {active ? fill(texts.boutonActifs, { n: active }) : texts.bouton}
        </button>
        <p role="status" className={`t-note t-left ${s.count}`}>
          {found}
        </p>
        {active ? (
          <Link href={action} scroll={false} replace className={`link link--quiet ${s.clear}`}>
            {texts.effacer}
          </Link>
        ) : null}
      </div>

      <form id={panelId} className={s.panel} data-open={open} action={localize(action)} method="get" aria-labelledby={titleId} onSubmit={(e) => e.preventDefault()}>
        <h2 id={titleId} className={s.title}>
          {texts.titre}
        </h2>
        {groups.map((g, i) => {
          const current = g.options.find((o) => o.value === (chosen[g.key] ?? ""));
          return (
            <details key={g.key} className={`disclosure ${s.group}`} open={i === 0 || Boolean(g.value && !own(g, g.value))}>
              <summary>
                <span className={s.summary}>
                  {g.label}
                  {current && current.value && !current.href ? <span className={s.picked}>{current.label}</span> : null}
                </span>
              </summary>
              <fieldset className={`disclosure__body ${s.fieldset}`}>
                <legend className="sr-only">{g.label}</legend>
                {g.options.map((o) => (
                  <label key={o.value || "tout"} className={s.option}>
                    <input type="radio" className="sr-only" name={g.key} value={o.value} checked={(chosen[g.key] ?? "") === o.value} onChange={() => pick(g.key, o.value)} />
                    <span className={s.optionLabel}>{o.label}</span>
                  </label>
                ))}
              </fieldset>
            </details>
          );
        })}
        <noscript>
          <button type="submit" className={`btn ${s.submit}`}>
            {texts.appliquer}
          </button>
        </noscript>
        <button
          type="button"
          className={`btn btn--block ${s.close}`}
          onClick={() => {
            setOpen(false);
            toggleRef.current?.focus();
          }}
        >
          {texts.fermer}
        </button>
      </form>

      <div className={s.results} aria-busy={pending || undefined}>
        {children}
      </div>
    </div>
  );
}

/**
 * Frise d'une commande créée sur demande : « Commande reçue », « En confection », « Prête »,
 * « Expédiée », « Livrée », avec la date de chaque étape franchie, puis le délai de confection et
 * la fin de confection prévue (ou la situation qui suspend la commande).
 *
 * Partagée par le compte cliente, la page de suivi, la confirmation de commande et l'Atelier.
 * Composant sans état ni effet : utilisable côté serveur comme dans un composant du navigateur.
 * Accessible : liste ordonnée, étape en cours marquée aria-current="step" et annoncée en toutes
 * lettres, état de chaque étape lu par les lecteurs d'écran. Textes : document « suivi-commande »
 * (clé `frise`).
 */
import { fill } from "@/lib/edition/fill";
import { formatDate } from "@/lib/format";
import type { OrderTimeline } from "@/lib/customers/order-timeline";
import type { Locale } from "@/lib/i18n/routing";
import styles from "./OrderStages.module.css";

export type SuiviTexts = typeof import("@/content/site/fr/suivi-commande.json");
export type OrderStagesTexts = SuiviTexts["frise"];

/** Phrases sous la frise : situation particulière, ou délai et fin de confection prévue. */
export function stageNotes(timeline: OrderTimeline, t: OrderStagesTexts, delai?: string | null, locale: Locale = "fr"): string[] {
  if (timeline.situation) return [t.situations[timeline.situation]];
  if (!timeline.estimate) return [];
  if (timeline.late) return [t.retard];
  const { from, to } = timeline.estimate;
  const sameDay = formatDate(from, locale) === formatDate(to, locale);
  return [
    ...(delai ? [fill(t.delai, { delai })] : []),
    sameDay ? fill(t.estimationJour, { fin: formatDate(to, locale) }) : fill(t.estimation, { debut: formatDate(from, locale), fin: formatDate(to, locale) }),
  ];
}

/** `locale` : langue des dates (celle de la page ; le français par défaut). */
export function OrderStages({ timeline, t, delai, label, className, locale = "fr" }: { timeline: OrderTimeline; t: OrderStagesTexts; delai?: string | null; label?: string; className?: string; locale?: Locale }) {
  const notes = stageNotes(timeline, t, delai, locale);
  const stateText = { done: t.franchie, current: t.enCours, todo: t.aVenir } as const;
  return (
    <div className={[styles.stages, className].filter(Boolean).join(" ")}>
      <ol className={styles.list} aria-label={label ?? t.titre}>
        {timeline.steps.map((s) => (
          <li key={s.stage} className={styles.step} data-state={s.state} aria-current={s.state === "current" ? "step" : undefined}>
            <span className={styles.mark} aria-hidden="true" />
            <span className={styles.label}>{t.etapes[s.stage]}</span>
            {s.at ? (
              <time className={styles.date} dateTime={s.at}>
                {formatDate(s.at, locale)}
              </time>
            ) : null}
            <span className="sr-only">, {stateText[s.state]}</span>
          </li>
        ))}
      </ol>
      {notes.length ? (
        <div className={styles.notes}>
          {notes.map((n) => (
            <p key={n} className="t-note">
              {n}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

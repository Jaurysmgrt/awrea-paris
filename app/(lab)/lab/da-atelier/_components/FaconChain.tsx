/**
 * Le temps de façon en cotes enchaînées, comme sur un plan : chaque étape mesure sa durée réelle
 * (fiche de traçabilité de la pièce), la cote totale court dessous. La dernière étape, sans
 * durée, se clôt par le numéro. Horizontal sur grand écran, vertical sur téléphone (la hauteur de
 * chaque étape suit ses heures).
 */
import type { CSSProperties } from "react";
import type { Trace } from "@/lib/commerce/types";
import { Cote } from "./Traits";
import { fr } from "./typo";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

export function FaconChain({ trace }: { trace: Trace }) {
  const timed = trace.steps.filter((s) => s.hours);
  const untimed = trace.steps.filter((s) => !s.hours);
  const total = timed.reduce((n, s) => n + (s.hours ?? 0), 0);
  if (!timed.length) return null;
  return (
    <div className={styles.chain}>
      <ol className={styles.chainSteps} style={{ "--cols": timed.map((s) => `${s.hours}fr`).join(" ") } as CSSProperties}>
        {timed.map((s) => (
          <li key={s.label} className={styles.chainStep} style={{ "--h": s.hours } as CSSProperties}>
            <span className={styles.chainLabel}>{fr(s.label)}</span>
            <span className={styles.chainLine} aria-hidden="true" />
            <span className={styles.chainHours}>{fr(`${s.hours} h`)}</span>
          </li>
        ))}
      </ol>
      <div className={styles.chainTotal}>
        <Cote>
          <span className="sr-only">{`${commun.signes.enTout} `}</span>
          {fr(`${total} h`)}
          <span className="sr-only">{` ${commun.signes.aLaMain}`}</span>
        </Cote>
      </div>
      {untimed.length ? (
        <ul className={styles.chainEnd}>
          {untimed.map((s) => (
            <li key={s.label}>
              <span className={styles.chainMark} aria-hidden="true">
                N°
              </span>
              <span>{fr(s.label)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

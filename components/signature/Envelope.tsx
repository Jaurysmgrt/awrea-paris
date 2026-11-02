/**
 * SIGNATURE 8 — L'enveloppe.
 * À la confirmation de commande, une enveloppe blanc cassé au cachet noir « AW », déjà ouverte : la
 * lettre de remerciement est posée devant. Elle ne s'anime plus (animations au strict minimum,
 * choix de la créatrice du 01/11).
 */
import { Logo } from "@/components/brand/Logo";

export function Envelope({ greeting, note, signature, reference }: { greeting: string; note: string; signature: string; reference?: string }) {
  return (
    <div className="envelope" data-state="open" aria-hidden="true">
      <div className="envelope__body">
        <div className="envelope__back" />
        <div className="envelope__letter">
          <p className="envelope__greeting">{greeting}</p>
          <p className="envelope__note">{note}</p>
          {reference ? <p className="envelope__ref">{reference}</p> : null}
          <p className="envelope__sign">{signature}</p>
        </div>
        <div className="envelope__front">
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="envelope__lines">
            <path d="M0 0 L150 104 L300 0" vectorEffect="non-scaling-stroke" />
            <path d="M0 200 L120 92 M300 200 L180 92" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="envelope__flap" />
        <div className="envelope__seal">
          <Logo variant="monogram" className="envelope__seal-logo" />
        </div>
      </div>
    </div>
  );
}

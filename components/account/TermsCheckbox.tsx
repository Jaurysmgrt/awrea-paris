import { Fragment } from "react";
import Link from "@/components/ui/Link";

/** Phrase d'acceptation tirée d'un document de contenu : « … les {conditions} … la {confidentialite}. » */
export interface TermsTexte {
  phrase: string;
  conditions: string;
  confidentialite: string;
}

/**
 * Case d'acceptation des conditions (création de compte : CGU ; commande : CGV). `texte` : la phrase
 * du document de contenu de la page (commande : document « commerce », traduit sous /en) ; sans
 * lui, la phrase française de l'espace cliente. `invalid` et `describedBy` : case oubliée, reliée à
 * son message (useChampsManquants).
 */
export function TermsCheckbox({
  kind,
  checked,
  onChange,
  name = "terms",
  newTab = false,
  texte,
  invalid,
  describedBy,
}: {
  kind: "cgu" | "cgv";
  checked: boolean;
  onChange: (v: boolean) => void;
  name?: string;
  newTab?: boolean;
  texte?: TermsTexte;
  invalid?: boolean;
  describedBy?: string;
}) {
  const tab = newTab ? { target: "_blank", rel: "noopener" } : {};
  const liens = { conditions: kind === "cgu" ? "/cgu" : "/cgv", confidentialite: "/confidentialite" } as const;
  return (
    <label className="check t-note">
      <input type="checkbox" name={name} required checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={invalid || undefined} aria-describedby={describedBy} />
      {texte ? (
        <span>
          {texte.phrase.split(/(\{conditions\}|\{confidentialite\})/).map((part, i) => {
            const cle = part === "{conditions}" ? "conditions" : part === "{confidentialite}" ? "confidentialite" : null;
            return cle ? (
              <Link key={i} href={liens[cle]} className="text-link" {...tab}>
                {texte[cle]}
              </Link>
            ) : (
              <Fragment key={i}>{part}</Fragment>
            );
          })}
        </span>
      ) : kind === "cgu" ? (
        <span>
          J’accepte les{" "}
          <Link href="/cgu" className="text-link" {...tab}>
            conditions générales d’utilisation
          </Link>{" "}
          et j’ai pris connaissance de la{" "}
          <Link href="/confidentialite" className="text-link" {...tab}>
            politique de confidentialité
          </Link>
          .
        </span>
      ) : (
        <span>
          J’ai lu et j’accepte les{" "}
          <Link href="/cgv" className="text-link" {...tab}>
            conditions générales de vente
          </Link>
          , y compris les conditions de rétractation (les pièces réalisées sur mesure en sont exclues), et j’ai pris connaissance de la{" "}
          <Link href="/confidentialite" className="text-link" {...tab}>
            politique de confidentialité
          </Link>
          .
        </span>
      )}
    </label>
  );
}

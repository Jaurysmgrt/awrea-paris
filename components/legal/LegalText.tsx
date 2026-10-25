/**
 * Texte juridique enrichi : {{champ}} (information de l'entreprise ou repère « À COMPLÉTER »),
 * [libellé](/chemin) (lien) et **mise en valeur**.
 */
import { Fragment } from "react";
import Link from "@/components/ui/Link";
import { legalFields, type LegalFieldKey } from "@/content/legal/fields";

const TOKEN = /(\{\{[a-zA-Z]+\}\}|\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g;
/** adresses web et e-mails écrits en clair dans les textes officiels */
const ADDRESS = /(https?:\/\/[^\s,;)]+[^\s,;.)]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/**
 * Une adresse web ou e-mail ne se coupe pas d'elle-même : sur téléphone, elle dépassait de la
 * colonne. On la laisse se couper après une barre oblique ou un arobase, et avant un point, sans
 * trait d'union ajouté.
 */
function Breakable({ text }: { text: string }) {
  return (
    <>
      {text.split(ADDRESS).map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const pieces = part.split(/(?<=[/@])|(?=\.)/);
        return (
          <span key={i} className="adresse-web">
            {pieces.map((p, k) => (
              <Fragment key={k}>
                {k > 0 ? <wbr /> : null}
                {p}
              </Fragment>
            ))}
          </span>
        );
      })}
    </>
  );
}

export function Todo({ field }: { field: LegalFieldKey }) {
  return (
    <mark className="todo" title={legalFields[field].label}>
      [À COMPLÉTER : {legalFields[field].short}]
    </mark>
  );
}

export function LegalText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, i) => {
        const field = part.match(/^\{\{([a-zA-Z]+)\}\}$/)?.[1] as LegalFieldKey | undefined;
        if (field && field in legalFields) {
          const value = legalFields[field].value;
          return value ? <Fragment key={i}>{value}</Fragment> : <Todo key={i} field={field} />;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link) {
          return (
            <Link key={i} href={link[2]} className="text-link">
              {link[1]}
            </Link>
          );
        }
        const strong = part.match(/^\*\*([^*]+)\*\*$/);
        if (strong) return <strong key={i}>{strong[1]}</strong>;
        return <Breakable key={i} text={part} />;
      })}
    </>
  );
}

export { legalPlain } from "@/lib/legal/plain";

import Link from "@/components/ui/Link";
import { Icon, isIconName } from "@/components/ui/Icon";
import { fill } from "@/lib/edition/fill";
import { delaiText, type CatalogueTexts } from "@/lib/commerce/texts";
import { modesDeLivraison } from "@/lib/commerce/delais-livraison";
import type { Product } from "@/lib/commerce/types";
import { delaiDeFamille, type FamilleDelai } from "@/components/home/delais";
import { shop } from "@/content/settings";
import s from "./sur-commande.module.css";

/**
 * « Le temps de la création » (cahier de la créatrice du 23/11) : trois temps bien séparés, pour ne
 * jamais laisser croire que le délai de confection est le délai total.
 * 1. La confection : par famille de pièces, lue dans le catalogue (le délai exact est sur chaque fiche).
 * 2. La préparation et l'expédition : aucune durée n'est fixée ; ce qui est sûr est dit (une commande
 *    part en une seule fois, l'e-mail de suivi dès l'expédition).
 * 3. La livraison : selon le mode, délais lus dans les réglages de la boutique (content/settings.ts).
 * Puis l'enveloppe prévue par les conditions générales de vente, avec leur lien. Tout est centré,
 * comme le voulait le brief du 09/11 ; trois colonnes à filets dès la tablette, empilées sur téléphone.
 */
type Textes = typeof import("@/content/site/fr/sur-commande.json")["delais"];

const FAMILLES: FamilleDelai[] = ["hauts", "robes"];

export function Delais({ t, catalogue, pieces }: { t: Textes; catalogue: CatalogueTexts; pieces: Pick<Product, "category" | "leadTime">[] }) {
  const modes = modesDeLivraison(shop.shippingRates, t.livraison.modes as Record<string, string>, t.livraison.delai);
  const icone = (name: string) => (isIconName(name) ? <Icon name={name} className="icone icone--l" /> : null);
  return (
    <>
      <div className={s.temps}>
        <div className={s.phase}>
          {icone(t.confection.icon)}
          <h3 className="t-label">
            {t.confection.titre}
          </h3>
          <dl className={s.familles}>
            {FAMILLES.map((f) => (
              <div key={f} className={s.famille}>
                <dt className="t-note">{t.groupes[f]}</dt>
                <dd className="t-h3">{fill(t.valeur, { delai: delaiText(catalogue, delaiDeFamille(pieces, f)) })}</dd>
              </div>
            ))}
          </dl>
          <p className="t-note t-center">{t.confection.note}</p>
        </div>

        <div className={s.phase}>
          {icone(t.expedition.icon)}
          <h3 className="t-label">
            {t.expedition.titre}
          </h3>
          <p className="t-note t-center">{t.expedition.texte}</p>
        </div>

        <div className={s.phase}>
          {icone(t.livraison.icon)}
          <h3 className="t-label">
            {t.livraison.titre}
          </h3>
          <p className="t-note t-center">{t.livraison.texte}</p>
          <dl className={s.modes} data-livraison>
            {modes.map((m) => (
              <div key={m.id} className={s.mode}>
                <dt>{m.nom}</dt>
                <dd>{m.delai}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className={`t-note t-center ${s.fin}`}>
        {t.fin.avant}
        <Link href={t.fin.lien.href} className="text-link">
          {t.fin.lien.label}
        </Link>
        {t.fin.apres}
      </p>
    </>
  );
}

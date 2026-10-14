/**
 * La page d'un drop : la série, son compte à rebours, l'inscription à l'accès anticipé ou le mot de
 * passe de la vente privée, et ses pièces (dont l'achat s'ouvre selon l'accès de la visiteuse).
 */
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { SplitTitle } from "@/components/ui/SplitTitle";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Countdown } from "./Countdown";
import { DropSignupForm } from "./DropSignupForm";
import { PrivateSaleForm } from "./PrivateSaleForm";
import { dropPhase, readDropAccess, type Drop } from "@/lib/drops";
import { getProductsByHandles } from "@/lib/commerce";

export async function DropView({ drop, notice }: { drop: Drop; notice?: string | null }) {
  const [access, products] = await Promise.all([readDropAccess(), getProductsByHandles(drop.products, { includeUpcoming: true })]);
  const phase = dropPhase(drop);
  const mine = access[drop.slug];
  const open = phase === "ouvert" || (drop.privateSale ? mine === "prive" : phase === "anticipe" && Boolean(mine));
  return (
    <>
      <Section theme="ivory" as="header" className="page-header drop-head">
        <div className="container page-head">
          <p className="eyebrow">{drop.privateSale ? "Vente privée" : phase === "ouvert" ? "Nouvelle série" : "Bientôt"}</p>
          <SplitTitle text={drop.title} className="t-giant" />
          <p className="t-lead page-head__lead">{drop.teaser}</p>
          {notice ? (
            <p className="t-note t-left" role="status">
              {notice}
            </p>
          ) : null}
        </div>
      </Section>

      <Section theme="paper" className="section drop-panel" labelledBy="drop-acces">
        <div className="container grid-12 drop-panel__grid">
          {drop.image ? (
            <div className="drop-panel__media">
              <Media image={{ src: drop.image, alt: drop.title, width: 1200, height: 1500 }} ratio="look" sizes="(min-width: 64rem) 40vw, 100vw" priority />
            </div>
          ) : null}
          <div className="drop-panel__text stack-l">
            <h2 id="drop-acces" className="t-h3">
              {open ? "Votre accès est ouvert" : drop.privateSale ? "Entrer dans la vente privée" : "Réserver votre accès anticipé"}
            </h2>
            {phase === "ouvert" ? null : drop.privateSale ? (
              <>
                <Countdown target={drop.publicAt} label="Ouverture à toutes dans" />
                {open ? null : <PrivateSaleForm slug={drop.slug} />}
              </>
            ) : (
              <>
                <Countdown target={phase === "bientot" ? drop.earlyAccessAt : drop.publicAt} label={phase === "bientot" ? "Ouverture aux inscrites dans" : "Ouverture à toutes dans"} />
                {open ? (
                  <p className="t-body">Les pièces ci-dessous vous sont ouvertes avant tout le monde, depuis ce navigateur.</p>
                ) : (
                  <>
                    <p className="t-body">
                      Les inscrites découvrent la série quelques heures avant l’ouverture à toutes et peuvent l’acheter en premier. Un lien personnel vous est envoyé par e-mail : il ouvre votre accès.
                    </p>
                    <DropSignupForm slug={drop.slug} />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Section>

      {products.length ? (
        <Section theme="ivory" className="section" labelledBy="drop-pieces">
          <div className="container stack-l">
            <h2 id="drop-pieces" className="t-h2">
              {products.length > 1 ? `${products.length} pièces` : "Une pièce"}
            </h2>
            <ul className="shop-grid">
              {products.map((p) => (
                <li key={p.handle}>
                  <ProductCard product={p} sizes="(min-width: 64rem) 33vw, (min-width: 48rem) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
    </>
  );
}

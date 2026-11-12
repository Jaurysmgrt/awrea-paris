import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { atelierHref } from "@/lib/admin/path";
import { ParcoursEditor } from "@/components/admin/ParcoursEditor";
import { JournalParcours } from "@/components/admin/JournalParcours";
import { apercuEntrees, modeActuel, statsParcours } from "@/lib/marketing/parcours";
import { lireContacts } from "@/lib/marketing/parcours/contacts";
import { emailsDesParcours } from "@/lib/marketing/parcours/emails";
import { lireJournal, unParcours } from "@/lib/marketing/parcours/stockage";
import { STATUTS, type Definition, type Statut } from "@/lib/marketing/parcours/types";

const STATUT_CLASSE: Record<Statut, string> = { brouillon: "status status--info", actif: "status status--done", pause: "status status--proposed" };

/** E-mails › Parcours › un parcours : ses chiffres, son éditeur et son journal. */
export default async function ParcoursEditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^p-[a-z0-9]{4,30}$/.test(id)) notFound();
  const p = await unParcours(id);
  if (!p) notFound();
  const [emails, contacts, mode, journal] = await Promise.all([
    emailsDesParcours(),
    lireContacts().catch((e: Error) => {
      console.error("[parcours] contacts", e);
      return null;
    }),
    modeActuel(),
    lireJournal(1000),
  ]);
  const [stats, entreraient] = contacts ? await Promise.all([statsParcours(p, contacts), p.statut === "actif" ? Promise.resolve(null) : apercuEntrees(p, contacts).catch(() => null)]) : [null, null];
  const s = stats?.[mode];
  const lignes = journal.filter((l) => l.parcours === p.id && l.mode === mode).slice(0, 100);
  const definition: Definition = { nom: p.nom, declencheur: p.declencheur, fenetreJours: p.fenetreJours, entree: p.entree, etapes: p.etapes, objectif: p.objectif, sortieSiConditions: p.sortieSiConditions, exclusions: p.exclusions };

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <p className="t-label">
          <Link href={atelierHref("/e-mails/parcours")} className="btn btn--link">
            Parcours
          </Link>
        </p>
        <h1 className="t-h1">{p.nom}</h1>
        <p>
          <span className={STATUT_CLASSE[p.statut]}>{STATUTS[p.statut]}</span> <span className="t-note">{mode === "reel" ? "Envois réels" : "En simulation"}</span>
        </p>
      </header>

      <section className="panel stack-m" aria-labelledby="chiffres-titre">
        <h2 id="chiffres-titre" className="t-h3">
          Chiffres
        </h2>
        <div className="kpis">
          <div>
            <span className="t-label">Entrées</span>
            <span className="kpis__value">{s?.entrees ?? 0}</span>
          </div>
          <div>
            <span className="t-label">{mode === "reel" ? "E-mails envoyés" : "E-mails simulés"}</span>
            <span className="kpis__value">{s?.messages ?? 0}</span>
          </div>
          <div>
            <span className="t-label">Achats ensuite</span>
            <span className="kpis__value">{s?.conversions ?? 0}</span>
          </div>
          <div>
            <span className="t-label">Clics et ouvertures</span>
            <span className="kpis__value kpis__value--small">Non mesuré</span>
          </div>
        </div>
        {entreraient !== null ? (
          <p className="t-note t-left">
            Activé aujourd’hui, {entreraient} personne{entreraient > 1 ? "s" : ""} entrerai{entreraient > 1 ? "ent" : "t"}.
          </p>
        ) : null}
        {!contacts ? <p className="field__error">Les contacts n’ont pas pu être lus : les chiffres reviendront au prochain chargement.</p> : null}
      </section>

      <ParcoursEditor id={p.id} statut={p.statut} initial={definition} emails={emails.map((e) => ({ id: e.id, nom: e.nom, pret: e.pret, raison: e.raison }))} />

      <JournalParcours titre="Journal du parcours" lignes={lignes} vide={mode === "reel" ? "Rien n’est encore parti." : "Rien encore en simulation."} />
    </div>
  );
}

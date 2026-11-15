/**
 * Fiche d'une cliente dans l'Atelier (lot 3) : coordonnées, catégorie d'activité, total de ses
 * achats, ses commandes, vos notes internes, et ses droits RGPD (remettre ses données, effacer son
 * compte à sa demande). Données lues côté serveur, jamais exposées hors de l'Atelier.
 * CRM (cahier du 10/11) : la même fiche sert aux inscrites sans commande ; statut de la lettre et
 * preuve du consentement, désinscription (jamais d'inscription par l'atelier), coordonnées à
 * corriger, et son histoire (inscription, confirmation, désinscription, commandes, rendez-vous).
 */
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { getOrders, statusLabel } from "@/lib/commerce/orders";
import { profilPourAtelier } from "@/lib/customers";
import { categorieActivite, LIBELLE_CATEGORIE } from "@/lib/admin/clientes";
import { NOTE_CLIENTE_MAX, notesCliente, trouverCliente } from "@/lib/admin/clientes-suivi";
import { formatPrice } from "@/lib/format";
import { atelierApi, atelierHref } from "@/lib/admin/path";
import { When } from "@/components/admin/Status";
import { NotesInternes } from "@/components/admin/NotesInternes";
import { EffacerCliente } from "@/components/admin/EffacerCliente";
import { DesinscrireFiche, ModifierFiche } from "@/components/admin/FicheCrm";
import { ficheDetaillee, libelleLettre, libelleSource } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  let id: string;
  try {
    id = decodeURIComponent((await params).id);
  } catch {
    notFound();
  }
  const c = await trouverCliente(id);
  if (!c) notFound();
  // une base qui ne répond pas n'est jamais prise pour une cliente sans compte
  const [profil, toutes, notes, detail] = await Promise.all([profilPourAtelier(c.id).catch(() => undefined), getOrders(), notesCliente(c.id), ficheDetaillee(c.id)]);
  const histoire = detail?.historique ?? [];
  const l = c.lettre;
  const email = c.email.trim().toLowerCase();
  const commandes = toutes.filter((o) => o.email.trim().toLowerCase() === email).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const nom = [c.firstName, c.lastName].filter(Boolean).join(" ") || "Nom inconnu";
  const categorie = categorieActivite(c, new Date());

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <p className="t-note">
          <Link href={atelierHref("/clientes")} className="text-link">
            Clientes
          </Link>
        </p>
        <h1 className="t-h1">{nom}</h1>
        <p>
          <span className="status status--info">{LIBELLE_CATEGORIE[categorie]}</span>
          {c.segment === "vip" ? <> <span className="status status--done">VIP</span></> : null}
        </p>
      </header>

      <section className="panel" aria-labelledby="coordonnees-title">
        <h2 id="coordonnees-title" className="t-h3">
          Coordonnées et préférences
        </h2>
        <dl className="admin-facts">
          <div>
            <dt className="t-label">Adresse e-mail</dt>
            <dd>{c.email}</dd>
          </div>
          {c.telephone ? (
            <div>
              <dt className="t-label">Téléphone</dt>
              <dd>{c.telephone}</dd>
            </div>
          ) : null}
          <div>
            <dt className="t-label">Fiche</dt>
            <dd>
              depuis le <When iso={c.createdAt} />
            </dd>
          </div>
          <div>
            <dt className="t-label">Compte</dt>
            <dd>{profil === undefined ? "la base clientes ne répond pas : réessayez dans un instant" : profil ? <>créé le <When iso={profil.createdAt} /></> : !c.ordersCount ? "aucun" : "aucun : elle a commandé sans créer de compte"}</dd>
          </div>
          <div>
            <dt className="t-label">Lettre</dt>
            <dd>
              {libelleLettre(l)}
              {l.depuis ? (
                <>
                  {" "}
                  depuis le <When iso={l.depuis} />
                </>
              ) : null}
              {l.source ? ` · ${libelleSource(l.source).toLowerCase()}` : ""}
            </dd>
          </div>
          <div>
            <dt className="t-label">Cercle</dt>
            <dd>{c.cercleMember ? "membre" : "non"}</dd>
          </div>
          <div>
            <dt className="t-label">Achats</dt>
            <dd>
              {c.ordersCount} commande{c.ordersCount > 1 ? "s" : ""} payée{c.ordersCount > 1 ? "s" : ""} · {formatPrice(c.totalSpent)}
              {c.lastOrderAt ? (
                <>
                  {" "}
                  · dernière le <When iso={c.lastOrderAt} />
                </>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel stack-m" aria-labelledby="lettre-title">
        <h2 id="lettre-title" className="t-h3">
          Lettre de la Maison
        </h2>
        <p className="t-body">
          {l.statut === "abonnee"
            ? "Elle reçoit la lettre et les e-mails de la Maison."
            : l.statut === "desinscrite"
              ? "Désinscrite : elle ne reçoit plus rien de la Maison, hors ses commandes."
              : "Elle ne reçoit pas la lettre."}
          {l.attente ? (
            <>
              {" "}
              Inscription demandée le <When iso={l.attente.le} /> ({libelleSource(l.attente.source).toLowerCase()}) : elle n’a pas encore cliqué sur le lien de confirmation.
            </>
          ) : null}
        </p>
        {l.preuve ? (
          <dl className="admin-facts">
            <div>
              <dt className="t-label">Case cochée</dt>
              <dd>« {l.preuve.texte} »</dd>
            </div>
            <div>
              <dt className="t-label">Le</dt>
              <dd>
                <When iso={l.preuve.le} /> · {libelleSource(l.preuve.source).toLowerCase()}
              </dd>
            </div>
            {l.preuve.confirmeLe ? (
              <div>
                <dt className="t-label">Confirmée le</dt>
                <dd>
                  <When iso={l.preuve.confirmeLe} />
                </dd>
              </div>
            ) : null}
          </dl>
        ) : l.statut === "abonnee" ? (
          <p className="t-note">Inscrite avant la confirmation par e-mail : la case cochée n’a pas été gardée.</p>
        ) : null}
        {l.statut === "abonnee" || l.attente ? <DesinscrireFiche id={c.id} /> : null}
        <p className="t-note">L’atelier peut désinscrire, jamais inscrire : seule la personne s’inscrit elle-même.</p>
      </section>

      <section className="panel stack-m" aria-labelledby="modifier-title">
        <h2 id="modifier-title" className="t-h3">
          Corriger la fiche
        </h2>
        <ModifierFiche id={c.id} prenom={c.firstName ?? ""} nom={c.lastName ?? ""} telephone={c.telephone ?? ""} />
      </section>

      <section className="panel stack-m" aria-labelledby="commandes-title">
        <h2 id="commandes-title" className="t-h3">
          Ses commandes ({commandes.length})
        </h2>
        {commandes.length ? (
          <ul className="commande-notes">
            {commandes.map((o) => (
              <li key={o.id}>
                <p className="t-body">
                  <Link href={atelierHref(`/commandes/${encodeURIComponent(o.number)}`)} className="text-link">
                    {o.number}
                  </Link>{" "}
                  · {statusLabel[o.status]} · {formatPrice(o.total)}
                </p>
                <p className="t-note">
                  <When iso={o.createdAt} /> · {o.lines.map((l) => `${l.title} (${l.size})`).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Aucune commande pour l’instant.</p>
        )}
      </section>

      <section className="panel stack-m" aria-labelledby="histoire-title">
        <h2 id="histoire-title" className="t-h3">
          Son histoire ({histoire.length})
        </h2>
        {histoire.length ? (
          <ul className="commande-notes">
            {histoire.map((m, i) => (
              <li key={`${m.at}-${i}`}>
                <p className="t-body">{m.texte}</p>
                <p className="t-note">
                  <When iso={m.at} />
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Rien pour l’instant.</p>
        )}
      </section>

      <section className="panel stack-m" aria-labelledby="notes-title">
        <h2 id="notes-title" className="t-h3">
          Notes internes ({notes.length})
        </h2>
        {notes.length ? (
          <ul className="commande-notes">
            {notes.map((n) => (
              <li key={n.at}>
                <p className="t-body">{n.texte}</p>
                <p className="t-note">
                  <When iso={n.at} /> · {n.par}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Aucune note pour l’instant.</p>
        )}
        <NotesInternes chemin={`/clientes/${encodeURIComponent(c.id)}/notes`} max={NOTE_CLIENTE_MAX} exemple="Préfère être appelée le matin, tour de taille à reprendre…" />
      </section>

      <section className="panel stack-m" aria-labelledby="rgpd-title">
        <h2 id="rgpd-title" className="t-h3">
          Ses données personnelles
        </h2>
        <p className="t-note">À utiliser quand la cliente vous le demande. Elle peut aussi le faire elle-même depuis son compte.</p>
        <p>
          <a href={atelierApi(`/clientes/${encodeURIComponent(c.id)}/donnees`)} className="btn btn--outline">
            Télécharger ses données
          </a>
        </p>
        {profil ? (
          <>
            <p className="t-note">
              L’effacement retire son compte, ses adresses, ses envies, sa navigation, son inscription à la lettre et vos notes sur elle. Ses commandes et leurs factures restent, détachées
              de son compte, dix ans durant (obligation comptable).
            </p>
            <EffacerCliente id={c.id} />
          </>
        ) : profil === null && c.donneesLettre ? (
          <>
            <p className="t-note">
              Sans compte, l’effacement retire sa fiche de la lettre (inscription, preuve du consentement, coordonnées, historique) et vos notes sur elle. Ses commandes restent pour la
              comptabilité, dix ans durant.
            </p>
            <EffacerCliente id={c.id} />
          </>
        ) : profil === undefined ? (
          <p className="t-note">La base clientes ne répond pas : l’effacement sera possible dès son retour.</p>
        ) : (
          <p className="t-note">Sans compte, il n’y a rien à effacer : ses commandes restent pour la comptabilité, dix ans durant.</p>
        )}
      </section>
    </div>
  );
}

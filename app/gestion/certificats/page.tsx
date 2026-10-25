import Link from "@/components/ui/Link";
import { creationText, listCertificates } from "@/lib/certificates";
import { formatDate } from "@/lib/format";
import { atelierHref } from "@/lib/admin/path";

/**
 * Certificats émis : un par pièce commandée, avec son numéro de création unique (numéro d'ordre de
 * la Maison, « Création n° 0001 »). L'atelier y imprime le certificat papier (avec le code de
 * rattachement) et l'étiquette à QR code, corrige la date de confection et écrit son mot.
 */
export default async function CertificatsPage({ searchParams }: { searchParams: Promise<{ commande?: string }> }) {
  const { commande } = await searchParams;
  const certificates = await listCertificates({ order: commande || undefined });
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Certificats</h1>
        <p className="t-lead">
          Chaque pièce vendue reçoit un certificat numérique. Imprimez-le avec son étiquette avant l’envoi : le QR code mène à sa page, le code permet à la propriétaire de le rattacher à son compte.
        </p>
        {commande ? (
          <p className="t-note">
            Commande {commande} · <Link href={atelierHref("/certificats")} className="text-link">voir tous les certificats</Link>
          </p>
        ) : null}
      </header>
      <section className="panel" aria-labelledby="certificates-title">
        <h2 id="certificates-title" className="t-h3">
          {certificates.length ? `${certificates.length} certificat${certificates.length > 1 ? "s" : ""}` : "Aucun certificat pour le moment"}
        </h2>
        {certificates.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Pièce</th>
                  <th scope="col">Création</th>
                  <th scope="col">Commande</th>
                  <th scope="col">Confectionnée le</th>
                  <th scope="col">Compte</th>
                  <th scope="col">Impression</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.serial}>
                    <th scope="row">{c.serial}</th>
                    <td>
                      {c.productTitle}
                      {c.size ? ` (${c.size})` : ""}
                    </td>
                    <td>{c.creationNumber ? `n° ${creationText(c.creationNumber)}` : "Aucun numéro"}</td>
                    <td>{c.orderNumber ?? "Aucune"}</td>
                    <td>{formatDate(c.madeOn)}</td>
                    <td>{c.customerId || c.claimedAt ? "Rattaché" : c.ownerEmailHash ? "Acheteuse" : "Aucun"}</td>
                    <td>
                      <Link href={atelierHref(`/certificats/${c.serial}`)} className="text-link">
                        Préparer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="t-note">Les certificats apparaissent ici dès la première commande.</p>
        )}
      </section>
    </div>
  );
}

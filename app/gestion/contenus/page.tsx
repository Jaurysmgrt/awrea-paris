import { kv } from "@/lib/store";
import { imageAt } from "@/lib/media";
import { ActionButton } from "@/components/admin/ActionButton";
import { CopyButton } from "@/components/admin/CopyButton";
import { When } from "@/components/admin/Status";
import { atelierApi } from "@/lib/admin/path";

type Draft = { id: string; date: string; status: "draft" | "published" | "archived"; kind: "instagram" | "newsletter"; title: string; body: string; hashtags?: string[]; image?: string; subject?: string; preheader?: string };

export default async function ContenusPage() {
  const drafts = (await kv.list<Draft>("content:drafts", 200)).filter((d) => d.status !== "archived");
  const posts = drafts.filter((d) => d.kind === "instagram");
  const letters = drafts.filter((d) => d.kind === "newsletter");
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Contenus</h1>
        <p className="t-lead">L’agent Contenu prépare chaque semaine trois posts Instagram et une lettre. L’envoi de la lettre à toute la liste vous est proposé dans les Validations.</p>
        <ActionButton endpoint={atelierApi("/agents/contenu")} label="Préparer de nouveaux contenus" busyLabel="L’agent écrit…" />
      </header>
      <section className="panel" aria-labelledby="ig-title">
        <h2 id="ig-title" className="t-h3">Instagram</h2>
        {posts.length ? (
          <ul className="posts">
            {posts.map((p) => {
              const text = `${p.body}\n\n${(p.hashtags ?? []).map((h) => `#${h}`).join(" ")}`;
              return (
                <li key={p.id} className="post" data-status={p.status}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageAt(p.image, 480)} alt="" width={480} height={600} className="post__img" />
                  ) : null}
                  <div className="post__body stack">
                    <p className="t-label t-soft">{p.status === "published" ? "Publié" : "Prêt à publier"} · <When iso={p.date} /></p>
                    <h3 className="t-h4">{p.title}</h3>
                    <p className="t-body post__caption">{p.body}</p>
                    <p className="t-note t-left">{(p.hashtags ?? []).map((h) => `#${h}`).join(" ")}</p>
                    <div className="proposal__actions">
                      <CopyButton text={text} label="Copier la légende" />
                      {p.status !== "published" ? <ActionButton endpoint={atelierApi(`/contenus/${p.id}`)} body={{ status: "published" }} label="Marquer publié" variant="quiet" /> : null}
                      <ActionButton endpoint={atelierApi(`/contenus/${p.id}`)} body={{ status: "archived" }} label="Archiver" variant="quiet" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="t-note">Aucun post préparé.</p>
        )}
      </section>
      <section className="panel" aria-labelledby="nl-title">
        <h2 id="nl-title" className="t-h3">Lettres</h2>
        {letters.length ? (
          <div className="stack-l">
            {letters.map((l) => (
              <article key={l.id} className="letter-draft stack">
                <p className="t-label t-soft"><When iso={l.date} /></p>
                <h3 className="t-h4">{l.subject ?? l.title}</h3>
                {l.preheader ? <p className="t-note">{l.preheader}</p> : null}
                <div className="prose">{l.body.split(/\n{2,}/).map((t, i) => <p key={i}>{t}</p>)}</div>
                <div className="proposal__actions">
                  <CopyButton text={l.body} label="Copier le texte" />
                  <ActionButton endpoint={atelierApi(`/contenus/${l.id}`)} body={{ status: "archived" }} label="Archiver" variant="quiet" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="t-note">Aucune lettre préparée.</p>
        )}
      </section>
    </div>
  );
}

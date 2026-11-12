"use client";
/**
 * Éditeur d'un parcours de vente (Atelier › E-mails › Parcours) : ce qui le déclenche, qui peut
 * entrer, les étapes dans l'ordre (un e-mail, un délai, une condition), les sorties et les
 * exclusions. Modifiable en brouillon ou en pause seulement ; « M'envoyer cet e-mail » n'écrit qu'à
 * la personne connectée.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/Link";
import { useAtelier } from "./AtelierContext";
import { CRITERES, DECLENCHEURS, EXCLUSIONS, type CritereId, type DeclencheurId, type Definition, type Etape, type ExclusionId, type Statut } from "@/lib/marketing/parcours/types";

export type EmailChoix = { id: string; nom: string; pret: boolean; raison?: string };
type Retour = { ok: boolean; texte: string };

const nouvelleEtape = (type: Etape["type"], email?: string): Etape => {
  const id = `${type[0]}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  if (type === "email") return { id, type, email: email ?? "" };
  if (type === "attente") return { id, type, duree: 3, unite: "jours" };
  return { id, type, critere: "sans-commande" };
};
const NOMS: Record<Etape["type"], string> = { email: "Envoyer un e-mail", attente: "Attendre", condition: "Vérifier" };

export function ParcoursEditor({ id, statut, initial, emails }: { id: string; statut: Statut; initial: Definition; emails: EmailChoix[] }) {
  const atelier = useAtelier();
  const router = useRouter();
  const [def, setDef] = useState<Definition>(initial);
  const [enregistre, setEnregistre] = useState(JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [essai, setEssai] = useState<Record<string, Retour>>({});
  const actif = statut === "actif";
  const modifie = JSON.stringify(def) !== enregistre;
  const parId = useMemo(() => Object.fromEntries(emails.map((e) => [e.id, e])), [emails]);

  const set = (patch: Partial<Definition>) => setDef((d) => ({ ...d, ...patch }));
  const setEtape = (i: number, e: Etape) => set({ etapes: def.etapes.map((x, j) => (j === i ? e : x)) });
  const deplacer = (i: number, j: number) => {
    const etapes = [...def.etapes];
    const [x] = etapes.splice(i, 1);
    etapes.splice(j, 0, x);
    set({ etapes });
  };
  const basculer = <T extends string>(liste: T[], v: T, on: boolean) => (on ? [...new Set([...liste, v])] : liste.filter((x) => x !== v));

  const appel = async (corps: Record<string, unknown>, method = "POST") => {
    const res = await fetch(atelier.api(`/parcours/${id}`), { method, headers: { "Content-Type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(corps) }).catch(() => null);
    const json = (res ? await res.json().catch(() => ({})) : {}) as { message?: string; error?: string };
    return { ok: Boolean(res?.ok), texte: res?.ok ? (json.message ?? "") : (json.error ?? "Le geste n’a pas abouti.") };
  };
  const enregistrer = async (): Promise<boolean> => {
    setBusy(true);
    setRetour(null);
    const r = await appel({ action: "enregistrer", definition: def });
    setBusy(false);
    setRetour(r);
    if (r.ok) {
      setEnregistre(JSON.stringify(def));
      router.refresh();
    }
    return r.ok;
  };
  const changerStatut = async (s: "actif" | "pause") => {
    if (s === "actif" && modifie && !(await enregistrer())) return;
    setBusy(true);
    const r = await appel({ action: "statut", statut: s });
    setBusy(false);
    setRetour(r);
    if (r.ok) router.refresh();
  };
  const retirer = async () => {
    if (!window.confirm(`Retirer le parcours « ${def.nom} » ? Ce qu’il a déjà fait reste au journal.`)) return;
    setBusy(true);
    const r = await appel({}, "DELETE");
    setBusy(false);
    if (r.ok) router.push(atelier.href("/e-mails/parcours"));
    else setRetour(r);
  };
  const essayer = async (etape: string, email: string) => {
    setEssai((x) => ({ ...x, [etape]: { ok: true, texte: "Envoi de l’essai…" } }));
    const r = await appel({ action: "essai", email });
    setEssai((x) => ({ ...x, [etape]: r }));
  };

  return (
    <div className="stack-l">
      {actif ? <p className="t-note t-left">Ce parcours est actif. Mettez-le en pause pour le modifier.</p> : null}
      <form
        className="stack-l"
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
      >
        <fieldset className="parcours-editeur stack-l" disabled={actif || busy}>
          <section className="panel stack-m" aria-labelledby="pe-depart">
            <h2 id="pe-depart" className="t-h3">
              Départ
            </h2>
            <div className="field">
              <label className="field__label" htmlFor="pe-nom">
                Nom du parcours
              </label>
              <input id="pe-nom" className="field__input" required minLength={2} maxLength={80} value={def.nom} onChange={(e) => set({ nom: e.target.value })} />
            </div>
            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="pe-declencheur">
                  Ce qui la fait entrer
                </label>
                <select id="pe-declencheur" className="field__input" value={def.declencheur} onChange={(e) => set({ declencheur: e.target.value as DeclencheurId })} aria-describedby="pe-declencheur-aide">
                  {(Object.keys(DECLENCHEURS) as DeclencheurId[]).map((d) => (
                    <option key={d} value={d}>
                      {DECLENCHEURS[d].label}
                    </option>
                  ))}
                </select>
                <p id="pe-declencheur-aide" className="field__hint">
                  {DECLENCHEURS[def.declencheur].aide}
                </p>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="pe-fenetre">
                  Depuis moins de
                </label>
                <div className="parcours-ligne">
                  <input id="pe-fenetre" className="field__input parcours-nombre" type="number" inputMode="numeric" min={1} max={90} required value={def.fenetreJours} onChange={(e) => set({ fenetreJours: Number(e.target.value) })} />
                  <span>jours</span>
                </div>
              </div>
            </div>
            <fieldset className="stack-s">
              <legend className="field__label">Qui peut entrer</legend>
              <p className="field__hint">Seulement les personnes qui ont accepté les e-mails de la Maison. Une seule fois par parcours.</p>
              {(Object.keys(CRITERES) as CritereId[]).map((c) => (
                <label key={c} className="check">
                  <input type="checkbox" checked={def.entree.includes(c)} onChange={(e) => set({ entree: basculer(def.entree, c, e.target.checked) })} />
                  <span>{CRITERES[c]}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="stack-s">
              <legend className="field__label">Ne pas faire entrer</legend>
              {(Object.keys(EXCLUSIONS) as ExclusionId[]).map((x) => (
                <label key={x} className="check">
                  <input type="checkbox" checked={def.exclusions.includes(x)} onChange={(e) => set({ exclusions: basculer(def.exclusions, x, e.target.checked) })} />
                  <span>{EXCLUSIONS[x]}</span>
                </label>
              ))}
            </fieldset>
          </section>

          <section className="panel stack-m" aria-labelledby="pe-etapes">
            <h2 id="pe-etapes" className="t-h3">
              Étapes
            </h2>
            <ol className="parcours-etapes">
              {def.etapes.map((e, i) => {
                const choix = e.type === "email" ? parId[e.email] : undefined;
                return (
                  <li key={e.id} className="parcours-etape stack-s" aria-label={`Étape ${i + 1}`}>
                    <p className="t-label">
                      {i + 1}. {NOMS[e.type]}
                    </p>
                    {e.type === "email" ? (
                      <>
                        <div className="field">
                          <label className="field__label" htmlFor={`${e.id}-email`}>
                            E-mail
                          </label>
                          <select id={`${e.id}-email`} className="field__input" required value={e.email} onChange={(ev) => setEtape(i, { ...e, email: ev.target.value })}>
                            <option value="">Choisir un e-mail</option>
                            {emails.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.pret ? m.nom : `${m.nom} (à finir)`}
                              </option>
                            ))}
                          </select>
                          {choix && !choix.pret ? <p className="field__hint">{choix.raison} : l’étape attendra.</p> : null}
                        </div>
                        {e.email ? (
                          <div className="parcours-ligne">
                            <Link className="btn btn--link" href={atelier.href(`/e-mails/${e.email}`)}>
                              Modifier l’e-mail
                            </Link>
                            <button type="button" className="btn btn--link" onClick={() => void essayer(e.id, e.email)}>
                              M’envoyer cet e-mail
                            </button>
                          </div>
                        ) : null}
                        {essai[e.id] ? (
                          <p className={essai[e.id].ok ? "t-note t-left" : "field__error"} role={essai[e.id].ok ? "status" : "alert"}>
                            {essai[e.id].texte}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {e.type === "attente" ? (
                      <div className="parcours-ligne">
                        <label className="sr-only" htmlFor={`${e.id}-duree`}>
                          Durée
                        </label>
                        <input id={`${e.id}-duree`} className="field__input parcours-nombre" type="number" inputMode="numeric" min={1} max={365} required value={e.duree} onChange={(ev) => setEtape(i, { ...e, duree: Number(ev.target.value) })} />
                        <label className="sr-only" htmlFor={`${e.id}-unite`}>
                          Unité
                        </label>
                        <select id={`${e.id}-unite`} className="field__input parcours-unite" value={e.unite} onChange={(ev) => setEtape(i, { ...e, unite: ev.target.value as "heures" | "jours" })}>
                          <option value="jours">jours</option>
                          <option value="heures">heures</option>
                        </select>
                      </div>
                    ) : null}
                    {e.type === "condition" ? (
                      <div className="field">
                        <label className="field__label" htmlFor={`${e.id}-critere`}>
                          Elle continue si
                        </label>
                        <select id={`${e.id}-critere`} className="field__input" value={e.critere} onChange={(ev) => setEtape(i, { ...e, critere: ev.target.value as CritereId })}>
                          {(Object.keys(CRITERES) as CritereId[]).map((c) => (
                            <option key={c} value={c}>
                              {CRITERES[c]}
                            </option>
                          ))}
                        </select>
                        <p className="field__hint">Sinon, elle sort du parcours.</p>
                      </div>
                    ) : null}
                    <div className="parcours-ligne">
                      <button type="button" className="btn btn--link" disabled={i === 0} onClick={() => deplacer(i, i - 1)}>
                        Monter
                      </button>
                      <button type="button" className="btn btn--link" disabled={i === def.etapes.length - 1} onClick={() => deplacer(i, i + 1)}>
                        Descendre
                      </button>
                      <button type="button" className="btn btn--link" disabled={def.etapes.length === 1} onClick={() => set({ etapes: def.etapes.filter((_, j) => j !== i) })}>
                        Retirer l’étape
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="parcours-ligne">
              <button type="button" className="btn btn--outline" onClick={() => set({ etapes: [...def.etapes, nouvelleEtape("email", emails[0]?.id)] })}>
                Ajouter un e-mail
              </button>
              <button type="button" className="btn btn--outline" onClick={() => set({ etapes: [...def.etapes, nouvelleEtape("attente")] })}>
                Ajouter un délai
              </button>
              <button type="button" className="btn btn--outline" onClick={() => set({ etapes: [...def.etapes, nouvelleEtape("condition")] })}>
                Ajouter une condition
              </button>
            </div>
            <p className="field__hint">Les e-mails partent chaque matin. Un délai en heures part au passage suivant.</p>
          </section>

          <section className="panel stack-m" aria-labelledby="pe-sortie">
            <h2 id="pe-sortie" className="t-h3">
              Sortie
            </h2>
            <p className="t-note t-left">Si elle se désinscrit, elle sort aussitôt. Toujours.</p>
            <label className="check">
              <input type="checkbox" checked={def.objectif === "achat"} onChange={(e) => set({ objectif: e.target.checked ? "achat" : "aucun" })} />
              <span>Dès qu’elle achète (objectif atteint)</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={def.sortieSiConditions} onChange={(e) => set({ sortieSiConditions: e.target.checked })} />
              <span>Dès qu’elle ne remplit plus les conditions d’entrée</span>
            </label>
          </section>
        </fieldset>

        <div className="parcours-ligne">
          {!actif ? (
            <button type="submit" className="btn" disabled={busy || !modifie}>
              {busy ? "Enregistrement…" : modifie ? "Enregistrer" : "Enregistré"}
            </button>
          ) : null}
          {actif ? (
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void changerStatut("pause")}>
              Mettre en pause
            </button>
          ) : (
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void changerStatut("actif")}>
              Activer
            </button>
          )}
          {!actif ? (
            <button type="button" className="btn btn--link" disabled={busy} onClick={() => void retirer()}>
              Retirer le parcours
            </button>
          ) : null}
        </div>
        {retour?.texte ? (
          <p className={retour.ok ? "t-note t-left" : "field__error"} role={retour.ok ? "status" : "alert"}>
            {retour.texte}
          </p>
        ) : null}
      </form>
    </div>
  );
}

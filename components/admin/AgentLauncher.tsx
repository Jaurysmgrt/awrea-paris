"use client";
/**
 * Lancer un agent ou un rôle et le voir travailler (retour de la créatrice du 01/11 : « quand je les
 * lance, il se passe rien, on les voit pas travailler »). Le passage arrive au fil de l'eau (une
 * ligne JSON par étape, lib/agents/progress.ts) : un fil discret court sous le nom de l'agent, le
 * temps passé s'égrène, chaque étape s'inscrit à son tour, puis le compte rendu s'affiche (ce qui a
 * été fait, ce qui vous attend, les relevés), avec un lien vers « À valider » quand il vous propose
 * quelque chose. Les étapes très rapides sont montrées l'une après l'autre, à un rythme lisible ;
 * en animations apaisées, tout s'affiche d'un coup et le fil ne bouge pas.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prefersReducedMotion } from "@/lib/motion";
import { useAtelier } from "./AtelierContext";

type Statut = "done" | "proposed" | "approved" | "rejected" | "failed" | "info" | "en-cours";
interface Etape {
  texte: string;
  statut: Statut;
}
interface Releve {
  gravite: "info" | "attention" | "urgent";
  titre: string;
  detail?: string;
}
interface Resultat {
  run?: { summary: string; done: number; proposed: number; failed: number; errors: string[] };
  report?: { resume: string; findings: Releve[]; controle: Releve[]; actions: { done: number; proposed: number; failed: number }; erreurs: string[] };
}

const RYTHME_MS = 450;
const GRAVITE = { urgent: "Urgent", attention: "À regarder", info: "Pour information" } as const;
const PASTILLE = { urgent: "failed", attention: "proposed", info: "info" } as const;
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export function AgentLauncher({ endpoint, nom, label = "Lancer maintenant", variant = "default" }: { endpoint: string; nom: string; label?: string; variant?: "default" | "quiet" }) {
  const router = useRouter();
  const atelier = useAtelier();
  const [etat, setEtat] = useState<"repos" | "travail" | "fini" | "erreur">("repos");
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState("");
  const [secondes, setSecondes] = useState(0);
  const file = useRef<Etape[]>([]);
  const fin = useRef<{ resultat?: Resultat; erreur?: string } | null>(null);
  const debut = useRef(0);

  // le temps passé, à la seconde, tant que l'agent travaille
  useEffect(() => {
    if (etat !== "travail") return;
    const t = window.setInterval(() => setSecondes(Math.round((Date.now() - debut.current) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [etat]);

  // les étapes reçues s'inscrivent l'une après l'autre ; le compte rendu vient quand tout est montré
  useEffect(() => {
    if (etat !== "travail") return;
    const calme = prefersReducedMotion();
    const t = window.setInterval(
      () => {
        const n = calme ? file.current.length : Math.min(1, file.current.length);
        if (n) setEtapes((e) => [...e, ...file.current.splice(0, n)]);
        else if (fin.current) {
          window.clearInterval(t);
          setSecondes(Math.max(1, Math.round((Date.now() - debut.current) / 1000)));
          if (fin.current.erreur) {
            setErreur(fin.current.erreur);
            setEtat("erreur");
          } else {
            setResultat(fin.current.resultat ?? null);
            setEtat("fini");
          }
          router.refresh();
        }
      },
      calme ? 50 : RYTHME_MS,
    );
    return () => window.clearInterval(t);
  }, [etat, router]);

  async function lancer() {
    file.current = [];
    fin.current = null;
    debut.current = Date.now();
    setEtapes([]);
    setResultat(null);
    setErreur("");
    setSecondes(0);
    setEtat("travail");
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: "{}" }).catch(() => null);
    if (!res?.ok || !res.body) {
      const json = res ? await res.json().catch(() => ({})) : {};
      fin.current = { erreur: json.error ?? "Le passage n’a pas pu démarrer." };
      return;
    }
    const lecteur = res.body.getReader();
    const decodeur = new TextDecoder();
    let reste = "";
    for (;;) {
      const { value, done } = await lecteur.read().catch(() => ({ value: undefined, done: true }));
      if (value) reste += decodeur.decode(value, { stream: true });
      const lignes = reste.split("\n");
      reste = lignes.pop() ?? "";
      for (const ligne of lignes) {
        if (!ligne.trim()) continue;
        const ev = JSON.parse(ligne) as { type: string; etape?: Etape; resultat?: Resultat; message?: string };
        if (ev.type === "etape" && ev.etape) file.current.push(ev.etape);
        else if (ev.type === "fin") fin.current = { resultat: ev.resultat };
        else if (ev.type === "erreur") fin.current = { erreur: ev.message ?? "Le passage s’est arrêté sur une erreur." };
      }
      if (done) break;
    }
    if (!fin.current) fin.current = { erreur: "Le passage s’est interrompu avant la fin." };
  }

  const run = resultat?.run;
  const report = resultat?.report;
  const actions = run ? { done: run.done, proposed: run.proposed, failed: run.failed } : report?.actions;
  const resume = run?.summary ?? report?.resume;
  const releves = report ? [...report.findings, ...report.controle.map((c) => ({ ...c, detail: ["relevé du Contrôle", c.detail].filter(Boolean).join(" · ") }))] : [];

  return (
    <div className="agent-run-wrap">
      <button type="button" className={variant === "quiet" ? "btn btn--link" : "btn"} onClick={lancer} disabled={etat === "travail"}>
        {etat === "travail" ? `${nom} travaille…` : etat === "repos" ? label : "Relancer"}
      </button>
      {etat !== "repos" ? (
        <div className="agent-run" data-etat={etat}>
          <p className="agent-run__head" aria-live="polite">
            {etat === "travail" ? (
              <>
                <span className="agent-run__signe" aria-hidden="true" />
                {nom} travaille · {secondes} s
              </>
            ) : etat === "fini" ? (
              `Terminé en ${secondes} s.`
            ) : (
              "Le passage s’est arrêté."
            )}
          </p>
          {etat === "travail" ? <div className="agent-run__fil" aria-hidden="true" /> : null}
          {etapes.length ? (
            <ol className="agent-run__etapes" aria-label={`Étapes de ${nom}`}>
              {etapes.map((e, i) => (
                // seule la dernière étape annoncée est encore en cours ; les précédentes sont faites
                <li key={i} className="agent-run__etape" data-statut={e.statut === "en-cours" && (i < etapes.length - 1 || etat !== "travail") ? "done" : e.statut}>
                  {e.texte}
                </li>
              ))}
            </ol>
          ) : null}
          {etat === "fini" ? (
            <div className="agent-run__fin stack-s">
              {resume ? <p className="t-body t-left">{resume}</p> : null}
              {actions ? (
                <p className="t-note t-left">
                  {pluriel(actions.done, "action faite", "actions faites")} · {pluriel(actions.proposed, "proposition", "propositions")} pour vous
                  {actions.failed ? ` · ${pluriel(actions.failed, "échec", "échecs")}` : ""}
                  {actions.proposed ? (
                    <>
                      {" · "}
                      <a href={atelier.href("/validations")} className="link">
                        Voir ce qui attend votre accord
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
              {releves.length ? (
                <ul className="stack-s">
                  {releves.map((f, k) => (
                    <li key={k} className="t-note t-left">
                      <span className={`status status--${PASTILLE[f.gravite]}`}>{GRAVITE[f.gravite]}</span> {f.titre}
                      {f.detail ? <span className="t-soft"> · {f.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {etat === "erreur" ? (
            <p className="field__error" role="alert">
              {erreur}
            </p>
          ) : null}
          {etat !== "travail" ? (
            <button type="button" className="btn btn--link agent-run__fermer" onClick={() => setEtat("repos")}>
              Fermer
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

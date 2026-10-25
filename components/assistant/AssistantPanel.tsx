"use client";
/**
 * Fenêtre de l'assistante clientes (chargée à la première ouverture, voir AssistantLauncher.tsx).
 * Une pièce, sa taille, son délai de fabrication, la livraison, les retours, l'étape d'une commande,
 * et la transmission à la créatrice quand une personne est préférable.
 * Textes : documents de contenu « assistante » et « catalogue » (carte d'une pièce, délai).
 */
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useTexts } from "@/components/content/Texts";
import { imageAt } from "@/lib/media";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";
import type { LeadTime } from "@/lib/commerce/types";
import type { AssistantTexts } from "./AssistantLauncher";

/** Carte d'une pièce envoyée par le serveur (lib/ai/assistant-tools.ts, PieceCard). */
type Piece = { handle: string; title: string; price: string; image: string; leadTime?: LeadTime; provisoire?: boolean };
type Msg = { role: "user" | "assistant"; content: string; pieces?: Piece[]; handoff?: string; error?: boolean };

const STORAGE = "awrea_assistant";

/** Texte avec liens Markdown [libellé](url) uniquement. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (!m) {
          return (
            <Fragment key={i}>
              {part.split("\n").map((line, j, arr) => (
                <Fragment key={j}>
                  {line}
                  {j < arr.length - 1 ? <br /> : null}
                </Fragment>
              ))}
            </Fragment>
          );
        }
        const [, label, href] = m;
        if (href.startsWith("/") && !href.startsWith("//")) {
          return (
            <Link key={i} href={href} className="text-link">
              {label}
            </Link>
          );
        }
        if (/^https:\/\//.test(href)) {
          return (
            <a key={i} href={href} className="text-link" target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          );
        }
        return <Fragment key={i}>{label}</Fragment>;
      })}
    </>
  );
}

/** la conversation de l'onglet en cours est retrouvée telle quelle (panneau chargé côté navigateur seulement) */
function restoreMessages(): Msg[] {
  try {
    const saved = typeof window === "undefined" ? null : sessionStorage.getItem(STORAGE);
    return saved ? (JSON.parse(saved) as Msg[]) : [];
  } catch {
    return [];
  }
}

export default function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTexts<AssistantTexts>("assistante");
  const catalogue = useTexts<CatalogueTexts>("catalogue");
  const pathname = usePathname();
  const [messages, setMessages] = useState<Msg[]>(restoreMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tools = t.outils as Record<string, string>;

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(messages.slice(-30)));
    } catch {
      /* stockage indisponible */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, status]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      const history: Msg[] = [...messages.filter((m) => !m.error), { role: "user", content }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setBusy(true);
      setStatus("");
      const update = (fn: (m: Msg) => Msg) => setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 2000) })), page: pathname }),
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          update((m) => ({ ...m, content: j.error ?? t.erreurs.indisponible, error: true }));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const e = JSON.parse(line);
            if (e.type === "text") {
              setStatus("");
              update((m) => ({ ...m, content: m.content + e.text }));
            } else if (e.type === "tool") setStatus(tools[e.name] ?? t.outils.attente);
            else if (e.type === "reset") update((m) => ({ ...m, content: "" }));
            else if (e.type === "pieces") update((m) => ({ ...m, pieces: e.items }));
            else if (e.type === "handoff") update((m) => ({ ...m, handoff: e.email }));
            else if (e.type === "error") update((m) => ({ ...m, content: m.content || e.message, error: !m.content }));
          }
        }
      } catch {
        update((m) => ({ ...m, content: m.content || t.erreurs.connexion, error: !m.content }));
      } finally {
        setBusy(false);
        setStatus("");
      }
    },
    [busy, messages, pathname, t, tools],
  );

  return (
    <>
      <section id="assistant-panel" className="assistant scene" data-theme="ivory" data-open={open} role="dialog" aria-modal="false" aria-labelledby="assistant-title" hidden={!open}>
        <header className="assistant__head">
          <div>
            <h2 id="assistant-title" className="t-h4">
              {t.titre}
            </h2>
            <p className="t-label t-soft">{t.sousTitre}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.fermer}>
            <Icon name="close" />
          </button>
        </header>

        <ol ref={listRef} className="assistant__log" role="log" aria-live="polite" aria-relevant="additions text">
          <li className="assistant__msg assistant__msg--assistant">
            <p className="assistant__bubble">{t.accueil}</p>
          </li>
          {messages.map((m, i) => (
            <li key={i} className={`assistant__msg assistant__msg--${m.role}`} data-error={m.error}>
              <span className="sr-only">{m.role === "user" ? t.vous : t.assistante} </span>
              {m.content ? (
                <p className="assistant__bubble">
                  <RichText text={m.content} />
                </p>
              ) : busy && i === messages.length - 1 ? (
                <p className="assistant__bubble assistant__typing" aria-label={t.ecrit}>
                  <span />
                  <span />
                  <span />
                </p>
              ) : null}
              {m.pieces?.length ? (
                <ul className="assistant__pieces">
                  {m.pieces.map((p) => (
                    <li key={p.handle}>
                      <Link href={`/boutique/${p.handle}`} className="assistant__piece">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageAt(p.image, 480)} alt="" width={48} height={72} loading="lazy" />
                        <span>
                          <span className="t-h4">{p.title}</span>
                          <span className="t-label t-soft">{p.price}</span>
                          {p.leadTime ? <span className="t-note">{fill(catalogue.surDemande.carte, { delai: delaiText(catalogue, p.leadTime) })}</span> : null}
                          {p.provisoire ? <span className="t-note t-soft">{catalogue.visuelProvisoire}</span> : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {m.handoff ? <p className="t-note assistant__handoff">{fill(t.transmis, { email: m.handoff })}</p> : null}
            </li>
          ))}
          {status ? (
            <li className="assistant__status t-note" aria-live="polite">
              {status}
            </li>
          ) : null}
        </ol>

        {messages.length === 0 ? (
          <ul className="assistant__suggestions" aria-label={t.suggestionsLabel}>
            {t.suggestions.map((s) => (
              <li key={s}>
                <button type="button" className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <form
          className="assistant__form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="assistant-input" className="sr-only">
            {t.champ}
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            className="field__input assistant__input"
            rows={1}
            maxLength={2000}
            value={input}
            placeholder={t.placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button type="submit" className="btn btn--solid assistant__send" disabled={busy || !input.trim()}>
            {t.envoyer}
          </button>
        </form>
        <p className="assistant__foot t-note">
          {t.pied}{" "}
          <Link href="/contact" className="text-link">
            {t.ecrire}
          </Link>
        </p>
      </section>
    </>
  );
}

/**
 * Rendu d'un e-mail composé de blocs (lib/email/blocks.ts) en HTML compatible avec les messageries :
 * tableaux, styles en ligne, repli des polices, bouton « à toute épreuve » pour Outlook, mode sombre
 * (Apple Mail, Outlook.com, iOS), version texte. Le même rendu sert à l'envoi, à l'aperçu de
 * l'éditeur (simulation de Gmail, Apple Mail, Outlook, téléphone, clair et sombre) et à l'export
 * vers Brevo, Klaviyo ou les notifications Shopify (repères convertis dans leur syntaxe).
 *
 * Module pur : aucune lecture de fichier ni de stockage (le serveur fournit le contexte).
 */
import { palette, fontStacks } from "@/styles/tokens";
import type { Img, Lien } from "@/lib/edition/blocks";
import { blockShown, type EmailBlock, type EmailDoc } from "@/lib/email/blocks";

export interface EmailItem {
  title: string;
  meta?: string;
  /** prix déjà mis en forme (« 420 € ») */
  price?: string;
  image?: string;
}

/** Textes communs à tous les e-mails (document « email-commun »), modifiables une fois pour toutes. */
export interface EmailCommon {
  devise: string;
  lignePied: string;
  desinscription: string;
  mentions: string;
  /** lien sous une pièce présentée dans un e-mail */
  voirPiece: string;
  /** dernière ligne du détail de commande (export vers un service d'envoi) */
  total: string;
}

export interface EmailContext {
  /** adresse du site, pour rendre les liens et les images absolus */
  site: string;
  commun: EmailCommon;
  instagram?: string;
  vars?: Record<string, string>;
  items?: EmailItem[];
  totals?: { label: string; value: string }[];
  products?: Record<string, { title: string; price?: string; image?: string; href: string; alt?: string }>;
  /** lien de désinscription (lettres) */
  unsubscribe?: string;
  /** aperçu : simulation d'une messagerie */
  client?: "apple" | "gmail" | "outlook";
  /** aperçu : thème sombre forcé */
  dark?: boolean;
  /** export : syntaxe des repères pour un service d'envoi */
  syntax?: "brevo" | "klaviyo" | "shopify";
  /** lien d'un e-mail vers l'Atelier (« atelier:/retours ») */
  atelierHref?: (path: string) => string;
}

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

// ------------------------------------------------------------------ couleurs

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => toHex(hex(a).map((v, i) => v * (1 - t) + hex(b)[i] * t));

const light = { page: palette.pearl, card: palette.ivory, ink: palette.ink, soft: palette.taupeDeep, line: palette.pearl, band: palette.ink, onBand: palette.ivory, btn: palette.ink, onBtn: palette.ivory };
const night = mix(palette.ink, palette.ivory, 0.06);
const dark = { page: palette.ink, card: night, ink: palette.ivory, soft: palette.taupe, line: mix(night, palette.ivory, 0.24), band: palette.ink, onBand: palette.ivory, btn: palette.ivory, onBtn: palette.ink };

// ------------------------------------------------------------------ outils

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isTodoText = (s: string) => /^\[[^\]]+\]$/.test(s.trim());

/** Repère {nom} → valeur (envoi) ou syntaxe du service (export). */
function placeholder(name: string, ctx: EmailContext): string {
  switch (ctx.syntax) {
    case "brevo":
      return name === "prenom" ? "{{ contact.PRENOM }}" : `{{ params.${name} }}`;
    case "klaviyo":
      return name === "prenom" ? "{{ first_name|default:'' }}" : `{{ event.${name} }}`;
    case "shopify":
      return ({ prenom: "{{ customer.first_name }}", commande: "{{ order.name }}", suivi: "{{ fulfillment.tracking_url }}" } as Record<string, string>)[name] ?? `{{ ${name} }}`;
    default:
      return ctx.vars?.[name] ?? "";
  }
}

/** Texte d'un champ : repères remplacés, échappé pour le HTML (les repères d'export ne sont pas échappés). */
function fill(s: string, ctx: EmailContext, html = true): string {
  const parts = s.split(/(\{[a-zA-Z]\w*\})/g);
  return parts
    .map((p) => {
      const m = p.match(/^\{([a-zA-Z]\w*)\}$/);
      if (m) return ctx.syntax ? placeholder(m[1], ctx) : html ? esc(placeholder(m[1], ctx)) : placeholder(m[1], ctx);
      return html ? esc(p) : p;
    })
    .join("");
}

function href(link: string, ctx: EmailContext): string {
  if (/^(https?:|mailto:)/.test(link)) return link;
  if (link.startsWith("atelier:") && ctx.atelierHref) return `${ctx.site}${ctx.atelierHref(link.slice(8) || "/")}`;
  return `${ctx.site}${link.startsWith("/") ? "" : "/"}${link}`;
}

const imageUrl = (src: string, ctx: EmailContext, width = 1200) => {
  if (!src) return "";
  const s = /\.(webp|jpe?g|png|gif)$/i.test(src) || src.startsWith("http") ? src : `${src}${width <= 480 ? "-480" : ""}.webp`;
  return s.startsWith("http") ? s : `${ctx.site}${s}`;
};

// ------------------------------------------------------------------ styles

function fonts(ctx: EmailContext) {
  // Gmail et Outlook ignorent les polices du site : les replis sont choisis pour garder la même allure
  if (ctx.client === "outlook") return { display: "Georgia, 'Times New Roman', serif", sans: "Arial, Helvetica, sans-serif" };
  return fontStacks;
}

function head(ctx: EmailContext, title: string) {
  const fontFace =
    ctx.client === "gmail" || ctx.client === "outlook"
      ? ""
      : `@font-face{font-family:'Instrument Serif';font-weight:400;font-style:normal;src:url('${ctx.site}/fonts/instrument-serif-latin-400-normal.woff2') format('woff2');}
@font-face{font-family:'Inter Tight';font-weight:100 900;font-style:normal;src:url('${ctx.site}/fonts/inter-tight-latin-wght-normal.woff2') format('woff2');}`;
  const darkRules = `.e-page{background:${dark.page}!important}.e-card{background:${dark.card}!important}.e-ink{color:${dark.ink}!important}.e-soft{color:${dark.soft}!important}.e-line{border-color:${dark.line}!important}.e-btn{background:${dark.btn}!important;border-color:${dark.btn}!important}.e-btn a{color:${dark.onBtn}!important}.e-ink a{color:${dark.ink}!important}`;
  const prefix = (sel: string) => darkRules.replace(/\.e-/g, `${sel} .e-`);
  // le thème sombre forcé de l'aperçu reprend exactement les règles du mode sombre
  const forced = ctx.dark && ctx.client !== "gmail" ? `<style>${darkRules}</style>` : "";
  const media = ctx.client === "outlook" || ctx.client === "gmail" ? "" : `@media (prefers-color-scheme:dark){${darkRules}}`;
  return `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>${fontFace}
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;-webkit-text-size-adjust:100%;text-size-adjust:100%}
table{border-collapse:collapse}img{border:0;display:block;height:auto;line-height:100%;outline:none;text-decoration:none}
a{text-decoration:underline;text-underline-offset:3px}
@media (max-width:620px){.e-pad{padding-left:24px!important;padding-right:24px!important}.e-title{font-size:28px!important;line-height:32px!important}}
${media}
${prefix("[data-ogsc]")}
</style>${forced}</head>`;
}

// ------------------------------------------------------------------ blocs

function blockHtml(b: EmailBlock, ctx: EmailContext, unsubscribe: string): string {
  const f = fonts(ctx);
  const c = light;
  const caps = `font-family :${f.sans} ;font-weight:400;font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase ;`;
  const body = `font-family :${f.sans} ;font-weight:300;font-size:15px;line-height:24px;color :${c.ink} ;`;
  const row = (inner: string, pad = "0 48px 32px") => `<tr><td class="e-pad" style="padding:${pad};">${inner}</td></tr>`;
  switch (b.type) {
    case "entete": {
      const ink = b.fond !== "clair";
      const bg = ink ? c.band : c.card;
      const fg = ink ? c.onBand : c.ink;
      return `<tr><td align="center" class="${ink ? "" : "e-card"}" style="background:${bg};padding:40px 24px 32px;" bgcolor="${bg}">
<div class="${ink ? "" : "e-ink"}" style="font-family:${f.display};font-size:40px;line-height:40px;color:${fg};letter-spacing:-1px;">AW</div>
<div class="${ink ? "" : "e-ink"}" style="${caps}letter-spacing:6px;color:${fg};padding-top:8px;padding-left:6px;">PARIS</div>
</td></tr>${row("", "48px 48px 0")}`;
    }
    case "titre":
      return row(`<h1 class="e-ink e-title" style="margin:0;font-family:${f.display};font-weight:400;font-size:32px;line-height:40px;color:${c.ink};text-align:center;">${fill(String(b.titre ?? ""), ctx)}</h1>`);
    case "texte": {
      // les repères sont remplis avant le découpage : une réponse de plusieurs paragraphes les garde
      const raw = ctx.syntax ? String(b.texte ?? "") : fill(String(b.texte ?? ""), ctx, false);
      return row(
        raw
          .split(/\n{2,}/)
          .filter((p) => p.trim())
          .map((p, i, all) => `<p class="e-ink" lang="fr" style="margin:0 0 ${i === all.length - 1 ? 0 : 24}px;${body}">${(ctx.syntax ? fill(p.trim(), ctx) : esc(p.trim())).replace(/\n/g, "<br>")}</p>`)
          .join(""),
      );
    }
    case "image": {
      const img = b.image as Img | undefined;
      if (!img?.src) return "";
      const tag = `<img src="${esc(imageUrl(img.src, ctx))}" width="504" alt="${esc(img.alt ?? "")}" style="width:100%;max-width:504px;height:auto;">`;
      const link = b.lien as Lien | null;
      return row(link?.href ? `<a href="${esc(href(link.href, ctx))}">${tag}</a>` : tag);
    }
    case "produit": {
      const handle = Array.isArray(b.pieces) ? String(b.pieces[0] ?? "") : "";
      const p = handle ? ctx.products?.[handle] : undefined;
      if (!p) return "";
      return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${p.image ? `<td width="168" style="padding-right:24px;vertical-align:top;"><a href="${esc(href(p.href, ctx))}"><img src="${esc(imageUrl(p.image, ctx, 480))}" width="168" alt="${esc(p.alt ?? p.title)}" style="width:168px;"></a></td>` : ""}
<td style="vertical-align:middle;"><div class="e-ink" style="font-family:${f.display};font-size:24px;line-height:32px;color:${c.ink};">${esc(p.title)}</div>
${p.price ? `<div class="e-soft" style="${body}color:${c.soft};padding-top:8px;">${esc(p.price)}</div>` : ""}
<div style="padding-top:16px;"><a class="e-ink" href="${esc(href(p.href, ctx))}" style="${caps}color:${c.ink};">${esc(ctx.commun.voirPiece)}</a></div></td></tr></table>`);
    }
    case "bouton": {
      const l = b.lien as Lien | null;
      if (!l?.label) return "";
      return row(
        `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td class="e-btn" bgcolor="${c.btn}" style="background:${c.btn};border:1px solid ${c.btn};padding:16px 32px;"><a href="${esc(href(l.href, ctx))}" style="${caps}color:${c.onBtn};text-decoration:none;display:inline-block;">${fill(l.label, ctx)}</a></td></tr></table>`,
        "8px 48px 40px",
      );
    }
    case "commande": {
      if (ctx.syntax) return row(orderLoop(ctx, caps, body));
      const items = (ctx.items ?? [])
        .map(
          (it) => `<tr>${it.image ? `<td width="88" style="padding:16px 16px 16px 0;vertical-align:top;"><img src="${esc(imageUrl(it.image, ctx, 480))}" width="72" alt="" style="width:72px;"></td>` : ""}
<td class="e-line" style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${c.line};"><div class="e-ink" style="font-family:${f.display};font-size:20px;line-height:24px;color:${c.ink};">${esc(it.title)}</div>${it.meta ? `<div class="e-soft" style="${caps}color:${c.soft};padding-top:8px;">${esc(it.meta)}</div>` : ""}</td>
<td align="right" class="e-line e-ink" style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${c.line};${body}white-space:nowrap;">${esc(it.price ?? "")}</td></tr>`,
        )
        .join("");
      const totals = (ctx.totals ?? [])
        .map((t, i, all) => {
          const last = i === all.length - 1 ? `border-top:1px solid ${c.ink} ;padding-top:16px ;` : "";
          return `<tr><td class="e-ink" style="padding:8px 0;${caps}color:${c.ink};${last}">${esc(t.label)}</td><td align="right" class="e-ink" style="padding:8px 0;${body}${last}">${esc(t.value)}</td></tr>`;
        })
        .join("");
      if (!items && !totals) return "";
      return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}${totals}</table>`);
    }
    case "separateur":
      return row(`<div class="e-line" style="border-top:1px solid ${c.line};font-size:0;line-height:0;">&nbsp;</div>`);
    case "signature":
      return row(`<p class="e-ink" style="margin:0;font-family:${f.display};font-size:20px;line-height:32px;color:${c.ink};">${fill(String(b.texte ?? ""), ctx).replace(/\n/g, "<br>")}</p>`, "8px 48px 40px");
    case "pied": {
      const k = ctx.commun;
      const site = ctx.site.replace(/^https?:\/\//, "");
      const note = String(b.note ?? "").trim();
      return `<tr><td align="center" style="background:${c.band};padding:32px 24px;" bgcolor="${c.band}">
<div style="font-family:${f.display};font-size:24px;line-height:32px;color:${c.onBand};">${esc(k.devise)}</div>
<div style="${caps}color:${c.onBand};padding-top:8px;">${esc(k.lignePied)}${ctx.instagram ? ` · <a href="${esc(ctx.instagram)}" style="color:${c.onBand};">Instagram</a>` : ""} · <a href="${esc(ctx.site)}" style="color:${c.onBand};">${esc(site)}</a></div>
${note ? `<div style="font-family:${f.sans};font-weight:300;font-size:12px;line-height:16px;color:${palette.taupe};padding-top:16px;">${fill(note, ctx).replace(/\n/g, "<br>")}</div>` : ""}
${k.mentions ? `<div style="font-family:${f.sans};font-weight:300;font-size:12px;line-height:16px;color:${palette.taupe};padding-top:16px;">${esc(k.mentions)}</div>` : ""}
${unsubscribe ? `<div style="padding-top:16px;"><a href="${unsubscribe}" style="font-family:${f.sans};font-weight:300;font-size:12px;line-height:16px;color:${palette.taupe};">${esc(k.desinscription)}</a></div>` : ""}
</td></tr>`;
    }
    default:
      return "";
  }
}

/** Détail de commande pour un service d'envoi : boucle dans la syntaxe du service. */
function orderLoop(ctx: EmailContext, caps: string, body: string): string {
  const c = light;
  const line = (title: string, meta: string, price: string) =>
    `<tr><td class="e-line" style="padding:16px 0;border-bottom:1px solid ${c.line};"><div class="e-ink" style="font-family:${fonts(ctx).display};font-size:20px;line-height:24px;color:${c.ink};">${title}</div><div class="e-soft" style="${caps}color:${c.soft};padding-top:8px;">${meta}</div></td><td align="right" class="e-line e-ink" style="padding:16px 0;border-bottom:1px solid ${c.line};${body}">${price}</td></tr>`;
  if (ctx.syntax === "shopify")
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{% for line in line_items %}${line("{{ line.title }}", "{{ line.variant.title }}", "{{ line.final_line_price | money }}")}{% endfor %}
<tr><td style="padding:16px 0 0;${caps}">${esc(ctx.commun.total)}</td><td align="right" style="padding:16px 0 0;${body}">{{ total_price | money }}</td></tr></table>`;
  const root = ctx.syntax === "brevo" ? "params" : "event";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{% for item in ${root}.items %}${line("{{ item.title }}", "{{ item.meta }}", "{{ item.price }}")}{% endfor %}</table>`;
}

// ------------------------------------------------------------------ e-mail complet

export function renderEmail(doc: EmailDoc, ctx: EmailContext): RenderedEmail {
  const subject = fill(doc.sujet, ctx, false);
  const preheader = fill(doc.preheader, ctx, false);
  const unsubscribe = doc.famille === "lettre" ? (ctx.syntax === "brevo" ? "{{ unsubscribe }}" : ctx.syntax === "klaviyo" ? "{% unsubscribe_url %}" : ctx.unsubscribe ? esc(ctx.unsubscribe) : "") : "";
  // un texte encore à écrire ([…]) n'apparaît jamais dans un e-mail
  const blocks = doc.blocs.filter((b) => !Object.values(b).some((v) => typeof v === "string" && isTodoText(v)) && (ctx.syntax ? true : blockShown(b, ctx.vars)));
  const rows = blocks.map((b) => blockHtml(b, ctx, unsubscribe)).join("\n");
  const c = light;
  const spacer = "&#847;&zwnj;&nbsp ;".repeat(40);
  const gmailDark = ctx.client === "gmail" && ctx.dark ? ` style="filter:invert(1) hue-rotate(180deg);"` : "";
  const html = `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"${gmailDark}>
${head(ctx, subject)}
<body class="e-page" style="margin:0;padding:0;background:${c.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}${spacer}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-page" style="background:${c.page};" bgcolor="${c.page}"><tr><td align="center" style="padding:32px 8px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-card" style="width:100%;max-width:600px;background:${c.card};" bgcolor="${c.card}">
${rows}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
${gmailDark ? `<style>img{filter:invert(1) hue-rotate(180deg)}</style>` : ""}
</body></html>`;
  return { subject, preheader, html, text: textOf(blocks, ctx, unsubscribe) };
}

/** Version texte : les mêmes mots, sans mise en forme (lue par certaines messageries et lecteurs). */
function textOf(blocks: EmailBlock[], ctx: EmailContext, unsubscribe: string): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "titre") out.push(fill(String(b.titre ?? ""), ctx, false).toUpperCase(), "");
    if (b.type === "texte") out.push(...fill(String(b.texte ?? ""), ctx, false).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), "");
    if (b.type === "bouton" && (b.lien as Lien | null)?.label) out.push(`${fill((b.lien as Lien).label, ctx, false)} : ${href((b.lien as Lien).href, ctx)}`, "");
    if (b.type === "produit") {
      const p = ctx.products?.[String((b.pieces as string[] | undefined)?.[0] ?? "")];
      if (p) out.push(`${p.title}${p.price ? `, ${p.price}` : ""} : ${href(p.href, ctx)}`, "");
    }
    if (b.type === "commande" && !ctx.syntax) {
      for (const i of ctx.items ?? []) out.push(`${i.title}${i.meta ? `, ${i.meta}` : ""}${i.price ? ` : ${i.price}` : ""}`);
      for (const t of ctx.totals ?? []) out.push(`${t.label} : ${t.value}`);
      out.push("");
    }
    if (b.type === "signature") out.push(fill(String(b.texte ?? ""), ctx, false), "");
    if (b.type === "pied") {
      out.push(ctx.commun.devise, `${ctx.commun.lignePied} · ${ctx.site.replace(/^https?:\/\//, "")}`);
      if (String(b.note ?? "").trim()) out.push(fill(String(b.note), ctx, false));
      if (ctx.commun.mentions) out.push(ctx.commun.mentions);
      if (unsubscribe) out.push(`${ctx.commun.desinscription} : ${unsubscribe}`);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

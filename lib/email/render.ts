/**
 * Rendu d'un e-mail composé de blocs (lib/email/blocks.ts) en HTML compatible avec les messageries :
 * tableaux, styles en ligne, logo officiel en image (public/brand), polices officielles (Fraunces
 * italique pour les titres, jamais sous 24 px ; Cormorant Garamond pour le texte ; servies par
 * /fonts) avec repli sur Georgia, bouton en pilule « à toute épreuve » pour Outlook, mode sombre
 * (Apple Mail, Outlook.com, iOS), version texte. Le même rendu sert à l'envoi, à l'aperçu de
 * l'éditeur (simulation de Gmail, Apple Mail, Outlook, téléphone, clair et sombre) et à l'export
 * vers Brevo ou Klaviyo (repères convertis dans leur syntaxe).
 *
 * Module pur : aucune lecture de fichier ni de stockage (le serveur fournit le contexte).
 */
import { palette, fontStacks } from "@/styles/tokens";
import type { Img, Lien } from "@/lib/edition/blocks";
import { blockShown, emailBlockDef, LIEN_TEXTE, styleOf, type Alignement, type EmailBlock, type EmailDoc, type Police, type Taille } from "@/lib/email/blocks";

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
  syntax?: "brevo" | "klaviyo";
  /** lien d'un e-mail vers l'Atelier (« atelier:/retours ») */
  atelierHref?: (path: string) => string;
  /**
   * adresse des photos, du logo et des polices (par défaut celle du site) ; l'aperçu de l'Atelier
   * les sert depuis sa propre adresse (« » : chemins relatifs), seule permise dans son cadre
   */
  assets?: string;
  /**
   * aperçu de l'éditeur : chaque bloc porte son identifiant (pour le choisir d'un clic), et les blocs
   * encore à écrire ou sans photo paraissent avec leur repère. Jamais dans un e-mail envoyé.
   */
  marks?: boolean;
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
  return s.startsWith("http") ? s : `${ctx.assets ?? ctx.site}${s}`;
};

// ------------------------------------------------------------------ styles

function fonts(ctx: EmailContext) {
  // Gmail et Outlook ignorent les polices du site : Georgia, serif garde l'allure d'un texte composé
  if (ctx.client === "outlook") return { display: "Georgia, serif", text: "Georgia, serif" };
  return fontStacks;
}

/** Titres : l'italique de la police officielle (Fraunces 72pt Italic), repris par Georgia en repli. */
// ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
const italic = "font-style:italic;";

/** Aperçu de l'éditeur : le bloc survolé et le bloc choisi se voient d'un filet. */
const marksCss = `tbody[data-bloc]{cursor:pointer}tbody[data-bloc]:hover>tr>td{box-shadow:inset 0 0 0 1px ${palette.taupe}}tbody[data-choisi]>tr>td,tbody[data-choisi]:hover>tr>td{box-shadow:inset 0 0 0 2px ${palette.taupeDeep}}tbody[data-a-ecrire] :is(p,h1){color:${palette.taupeDeep}!important}`;

function head(ctx: EmailContext, title: string) {
  const fontFace =
    ctx.client === "gmail" || ctx.client === "outlook"
      ? ""
      : `@font-face{font-family:'Fraunces';font-weight:400;font-style:italic;src:url('${ctx.assets ?? ctx.site}/fonts/fraunces-72pt-italic-latin.woff2') format('woff2');}
@font-face{font-family:'Fraunces';font-weight:300;font-style:normal;src:url('${ctx.assets ?? ctx.site}/fonts/fraunces-120pt-light-latin.woff2') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-weight:400;font-style:normal;src:url('${ctx.assets ?? ctx.site}/fonts/cormorant-garamond-latin-400.woff2') format('woff2');}`;
  const darkRules = `.e-page{background:${dark.page}!important}.e-card{background:${dark.card}!important}.e-ink{color:${dark.ink}!important}.e-soft{color:${dark.soft}!important}.e-line{border-color:${dark.line}!important}.e-btn{background:${dark.btn}!important;border-color:${dark.btn}!important}.e-btn a{color:${dark.onBtn}!important}.e-ink a{color:${dark.ink}!important}.e-logo-day{display:none!important}.e-logo-night{display:block!important;max-height:none!important;overflow:visible!important}`;
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
@media (max-width:620px){.e-pad{padding-left:24px!important;padding-right:24px!important}.e-title{font-size:32px!important;line-height:40px!important}.e-col{display:block!important;width:100%!important;max-width:100%!important;padding:0 0 24px!important}.e-col-last{padding-bottom:0!important}.e-col img{width:100%!important;max-width:100%!important}}
${media}
${prefix("[data-ogsc]")}
${ctx.marks ? marksCss : ""}
</style>${forced}</head>`;
}

// ------------------------------------------------------------------ mise en forme

const CSS_ALIGN: Record<Alignement, "left" | "center" | "right"> = { gauche: "left", centre: "center", droite: "right" };

/** Tailles prévues, en pixels (taille, interlignage) : Cormorant jamais sous 16 px. */
const TAILLES_PX: Record<"titre" | "texte" | "signature", Record<Taille, [number, number]>> = {
  titre: { petite: [28, 36], normale: [40, 48], grande: [48, 56] },
  texte: { petite: [16, 24], normale: [20, 32], grande: [24, 36] },
  signature: { petite: [20, 32], normale: [24, 32], grande: [28, 36] },
};

/** Style en ligne d'un texte : une des trois polices de la Maison, une taille prévue. */
function typo(ctx: EmailContext, police: Police, size: [number, number], color: string): string {
  const f = fonts(ctx);
  const family = police === "texte" ? f.text : f.display;
  // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
  const face = police === "italique" ? "font-style:italic;font-weight:400;" : police === "droite" ? "font-style:normal;font-weight:300;" : "font-style:normal;font-weight:400;";
  // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
  return `font-family:${family};${face}font-size:${size[0]}px;line-height:${size[1]}px;color:${color};`;
}

/** Morceau de texte : repères remplacés puis échappé (ou repères du service, à l'export). */
const textPart = (s: string, ctx: EmailContext) => (ctx.syntax ? fill(s, ctx) : esc(fill(s, ctx, false)));

/**
 * Paragraphes d'un texte, avec ses liens « [mots](adresse) ». Les liens sont repérés dans le texte
 * écrit par la Maison, avant le remplacement des repères : une valeur venue d'une cliente (un
 * prénom…) ne devient jamais un lien. Les repères sont remplis avant le découpage : une réponse de
 * plusieurs paragraphes les garde.
 */
function paragraphs(template: string, ctx: EmailContext, style: string, align: string): string {
  let html = "";
  let last = 0;
  for (const m of template.matchAll(LIEN_TEXTE)) {
    html += textPart(template.slice(last, m.index), ctx);
    html += `<a href="${esc(href(m[2], ctx))}" style="color:inherit;">${textPart(m[1], ctx)}</a>`;
    last = (m.index ?? 0) + m[0].length;
  }
  html += textPart(template.slice(last), ctx);
  return html
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i, all) => `<p class="e-ink" lang="fr" style="margin:0 0 ${i === all.length - 1 ? 0 : 24}px;${style}text-align:${align};">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Emplacement d'une photo encore à choisir (aperçu de l'éditeur seulement). */
const photoVide = (w: number, label: string) =>
  `<div style="width:100%;max-width:${w}px;aspect-ratio:4/5;background:${palette.pearl};color:${palette.taupeDeep};font-family:${fontStacks.text};font-size:16px;line-height:24px;display:flex;align-items:center;justify-content:center;text-align:center;">${esc(label)}</div>`;

/**
 * Photo d'un bloc à une largeur donnée. Dans l'aperçu de l'éditeur, elle dit quel champ elle remplit
 * (« image » ou « image2 ») : une photo glissée dessus prend sa place.
 */
function photo(img: Img | undefined, w: number, ctx: EmailContext, champ: "image" | "image2" = "image", link?: Lien | null): string {
  const mark = ctx.marks ? ` data-champ="${champ}"` : "";
  if (!img?.src) return ctx.marks ? photoVide(w, "Glissez une photographie ici").replace("<div ", `<div${mark} `) : "";
  const tag = `<img${mark} src="${esc(imageUrl(img.src, ctx, w <= 240 ? 480 : 1200))}" width="${w}" alt="${esc(img.alt ?? "")}" style="width:100%;max-width:${w}px;height:auto;">`;
  return link?.href ? `<a href="${esc(href(link.href, ctx))}">${tag}</a>` : tag;
}

// ------------------------------------------------------------------ blocs

function blockHtml(b: EmailBlock, ctx: EmailContext, unsubscribe: string): string {
  const f = fonts(ctx);
  const c = light;
  // Cormorant Garamond a un petit œil : texte à 20 px sur 32 px, capitales et notes jamais sous 16 px
  // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
  const caps = `font-family:${f.text};font-weight:400;font-size:16px;line-height:24px;letter-spacing:1px;text-transform:uppercase;`;
  // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
  const body = `font-family:${f.text};font-weight:400;font-size:20px;line-height:32px;color:${c.ink};`;
  const row = (inner: string, pad = "0 48px 32px") => `<tr><td class="e-pad" style="padding:${pad};">${inner}</td></tr>`;
  // réglages du bloc (sinon son allure d'origine) : espaces au-dessus et au-dessous, alignement
  const st = styleOf(b);
  const pad = `${st.avant ?? 0}px 48px ${st.apres ?? 32}px`;
  const align = CSS_ALIGN[st.align ?? "gauche"];
  switch (b.type) {
    case "entete": {
      // logo officiel en image (jamais imité par une police) : blanc cassé sur la bande noire, noir
      // sur fond clair, et sa version blanc cassé quand la messagerie passe en mode sombre ; le
      // texte alternatif « Awrea Paris » s'affiche si les images sont bloquées
      const ink = b.fond !== "clair";
      const bg = ink ? c.band : c.card;
      const fg = ink ? c.onBand : c.ink;
      const logo = (file: string, cls: string, alt: string) =>
        `<img class="${cls}" src="${ctx.assets ?? ctx.site}/brand/${file}" width="160" alt="Awrea Paris" style="display:block;margin:0 auto;width:160px;height:auto;border:0;font-family:${f.text};font-size:20px;line-height:32px;color:${alt};">`;
      const art = ink
        ? logo("awrea-logo-blanc.png", "", fg)
        : `${logo("awrea-logo.png", "e-logo-day", fg)}<!--[if !mso]><!--><div class="e-logo-night" style="display:none;max-height:0;overflow:hidden;">${logo("awrea-logo-blanc.png", "", c.onBand)}</div><!--<![endif]-->`;
      return `<tr><td align="center" class="${ink ? "" : "e-card"}" style="background:${bg};padding:40px 24px 32px;" bgcolor="${bg}">
${art}
</td></tr>${row("", "48px 48px 0")}`;
    }
    case "titre": {
      const size = TAILLES_PX.titre[st.taille ?? "normale"];
      return row(`<h1 class="e-ink${size[0] > 32 ? " e-title" : ""}" style="margin:0;${typo(ctx, st.police ?? "italique", size, c.ink)}text-align:${align};">${fill(String(b.titre ?? ""), ctx)}</h1>`, pad);
    }
    case "texte":
      return row(paragraphs(String(b.texte ?? ""), ctx, typo(ctx, st.police ?? "texte", TAILLES_PX.texte[st.taille ?? "normale"], c.ink), align), pad);
    case "image": {
      // largeur réglable (de 30 à 100 % de l'e-mail) et alignement : un tableau aligné, compris par Outlook
      const pct = st.largeur ?? 100;
      const w = Math.round((504 * pct) / 100);
      const inner = photo(b.image as Img | undefined, w, ctx, "image", b.lien as Lien | null);
      if (!inner) return "";
      return row(`<table role="presentation" align="${align}" width="${w}" cellpadding="0" cellspacing="0" style="width:${pct}%;max-width:${w}px;"><tr><td>${inner}</td></tr></table>`, pad);
    }
    case "photo-texte": {
      // deux colonnes ; sur téléphone, la photo d'abord puis le texte (« dir » inverse l'ordre affiché
      // sur ordinateur quand la photo est à droite, sans changer l'ordre de lecture)
      const img = photo(b.image as Img | undefined, 228, ctx);
      const texte = paragraphs(String(b.texte ?? ""), ctx, typo(ctx, st.police ?? "texte", TAILLES_PX.texte[st.taille ?? "normale"], c.ink), "left");
      const right = st.cote === "droite";
      const cell = (inner: string, side: "photo" | "texte", last: boolean) =>
        `<td class="e-col${last ? " e-col-last" : ""}" dir="ltr" width="${side === "photo" ? 228 : 252}" style="width:${side === "photo" ? 228 : 252}px;vertical-align:middle;padding:0 ${side === "photo" && !right ? 24 : 0}px 0 ${side === "photo" && right ? 24 : 0}px;">${inner}</td>`;
      return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${right ? "rtl" : "ltr"}"><tr>${cell(img, "photo", false)}${cell(texte, "texte", true)}</tr></table>`, pad);
    }
    case "deux-photos": {
      const one = photo(b.image as Img | undefined, 244, ctx);
      const two = photo(b.image2 as Img | undefined, 244, ctx, "image2");
      if (!one && !two) return "";
      return row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="e-col" width="244" style="width:244px;vertical-align:top;padding-right:16px;">${one}</td><td class="e-col e-col-last" width="244" style="width:244px;vertical-align:top;">${two}</td></tr></table>`,
        pad,
      );
    }
    case "espace":
      return `<tr><td style="height:${st.hauteur ?? 32}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
    case "produit": {
      const handle = Array.isArray(b.pieces) ? String(b.pieces[0] ?? "") : "";
      const p = handle ? ctx.products?.[handle] : undefined;
      if (!p) return "";
      return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${p.image ? `<td width="168" style="padding-right:24px;vertical-align:top;"><a href="${esc(href(p.href, ctx))}"><img src="${esc(imageUrl(p.image, ctx, 480))}" width="168" alt="${esc(p.alt ?? p.title)}" style="width:168px;"></a></td>` : ""}
<td style="vertical-align:middle;"><div class="e-ink" style="font-family:${f.display};${italic}font-size:24px;line-height:32px;color:${c.ink};">${esc(p.title)}</div>
${p.price ? `<div class="e-soft" style="${body}color:${c.soft};padding-top:8px;">${esc(p.price)}</div>` : ""}
<div style="padding-top:16px;"><a class="e-ink" href="${esc(href(p.href, ctx))}" style="${caps}color:${c.ink};">${esc(ctx.commun.voirPiece)}</a></div></td></tr></table>`, pad);
    }
    case "bouton": {
      const l = b.lien as Lien | null;
      if (!l?.label) return "";
      if (st.style === "contour")
        // bouton au filet : le filet sur le lien lui-même (une cellule de tableau le garderait carré)
        return row(
          `<table role="presentation" cellpadding="0" cellspacing="0" align="${align}"><tr><td style="border-radius:999px;"><a class="e-ink e-line" href="${esc(href(l.href, ctx))}" style="${body}color:${c.ink};letter-spacing:0.4px;text-decoration:none;display:inline-block;padding:7px 31px;border:1px solid ${c.ink};border-radius:999px;">${fill(l.label, ctx)}</a></td></tr></table>`,
          pad,
        );
      return row(
        // bouton des maquettes : noir plein en pilule, texte en bas de casse comme sur le site ; pas de
        // bordure (une cellule de tableau fusionné la garderait carrée) ; Outlook pour Windows ignore
        // l'arrondi : le bouton y reste un rectangle noir lisible
        `<table role="presentation" cellpadding="0" cellspacing="0" align="${align}"><tr><td class="e-btn" bgcolor="${c.btn}" style="background:${c.btn};border-radius:999px;padding:8px 32px;"><a href="${esc(href(l.href, ctx))}" style="${body}color:${c.onBtn};letter-spacing:0.4px;text-decoration:none;display:inline-block;border-radius:999px;">${fill(l.label, ctx)}</a></td></tr></table>`,
        pad,
      );
    }
    case "commande": {
      if (ctx.syntax) return row(orderLoop(ctx, caps, body), pad);
      const items = (ctx.items ?? [])
        .map(
          (it) => `<tr>${it.image ? `<td width="88" style="padding:16px 16px 16px 0;vertical-align:top;"><img src="${esc(imageUrl(it.image, ctx, 480))}" width="72" alt="" style="width:72px;"></td>` : ""}
<td class="e-line" style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${c.line};"><div class="e-ink" style="${body}">${esc(it.title)}</div>${it.meta ? `<div class="e-soft" style="${caps}color:${c.soft};padding-top:8px;">${esc(it.meta)}</div>` : ""}</td>
<td align="right" class="e-line e-ink" style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${c.line};${body}white-space:nowrap;font-variant-numeric:lining-nums;">${esc(it.price ?? "")}</td></tr>`,
        )
        .join("");
      const totals = (ctx.totals ?? [])
        .map((t, i, all) => {
          // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
          const last = i === all.length - 1 ? `border-top:1px solid ${c.ink};padding-top:16px;` : "";
          return `<tr><td class="e-ink" style="padding:8px 0;${caps}color:${c.ink};${last}">${esc(t.label)}</td><td align="right" class="e-ink" style="padding:8px 0;${body}${last}">${esc(t.value)}</td></tr>`;
        })
        .join("");
      if (!items && !totals) return "";
      return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}${totals}</table>`, pad);
    }
    case "separateur":
      return row(`<div class="e-line" style="border-top:1px solid ${c.line};font-size:0;line-height:0;">&nbsp;</div>`, pad);
    case "signature":
      return row(`<p class="e-ink" style="margin:0;${typo(ctx, st.police ?? "italique", TAILLES_PX.signature[st.taille ?? "normale"], c.ink)}text-align:${align};">${fill(String(b.texte ?? ""), ctx).replace(/\n/g, "<br>")}</p>`, pad);
    case "pied": {
      const k = ctx.commun;
      const site = ctx.site.replace(/^https?:\/\//, "");
      const note = String(b.note ?? "").trim();
      return `<tr><td align="center" style="background:${c.band};padding:32px 24px;" bgcolor="${c.band}">
<div style="font-family:${f.display};${italic}font-size:24px;line-height:32px;color:${c.onBand};">${esc(k.devise)}</div>
<div style="${caps}color:${c.onBand};padding-top:8px;">${esc(k.lignePied)}${ctx.instagram ? ` · <a href="${esc(ctx.instagram)}" style="color:${c.onBand};">Instagram</a>` : ""} · <a href="${esc(ctx.site)}" style="color:${c.onBand};">${esc(site)}</a></div>
${note ? `<div style="font-family:${f.text};font-weight:400;font-size:16px;line-height:24px;color:${palette.taupe};padding-top:16px;">${fill(note, ctx).replace(/\n/g, "<br>")}</div>` : ""}
${k.mentions ? `<div style="font-family:${f.text};font-weight:400;font-size:16px;line-height:24px;color:${palette.taupe};padding-top:16px;">${esc(k.mentions)}</div>` : ""}
${unsubscribe ? `<div style="padding-top:16px;"><a href="${unsubscribe}" style="font-family:${f.text};font-weight:400;font-size:16px;line-height:24px;color:${palette.taupe};">${esc(k.desinscription)}</a></div>` : ""}
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
    `<tr><td class="e-line" style="padding:16px 0;border-bottom:1px solid ${c.line};"><div class="e-ink" style="${body}">${title}</div><div class="e-soft" style="${caps}color:${c.soft};padding-top:8px;">${meta}</div></td><td align="right" class="e-line e-ink" style="padding:16px 0;border-bottom:1px solid ${c.line};${body}">${price}</td></tr>`;
  const root = ctx.syntax === "brevo" ? "params" : "event";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{% for item in ${root}.items %}${line("{{ item.title }}", "{{ item.meta }}", "{{ item.price }}")}{% endfor %}</table>`;
}

// ------------------------------------------------------------------ e-mail complet

export function renderEmail(doc: EmailDoc, ctx: EmailContext): RenderedEmail {
  const subject = fill(doc.sujet, ctx, false);
  const preheader = fill(doc.preheader, ctx, false);
  const unsubscribe = doc.famille === "lettre" ? (ctx.syntax === "brevo" ? "{{ unsubscribe }}" : ctx.syntax === "klaviyo" ? "{% unsubscribe_url %}" : ctx.unsubscribe ? esc(ctx.unsubscribe) : "") : "";
  // un texte encore à écrire ([…]) n'apparaît jamais dans un e-mail
  const todo = (b: EmailBlock) => Object.values(b).some((v) => typeof v === "string" && isTodoText(v));
  // l'aperçu de l'éditeur montre aussi les blocs encore à écrire, avec leur repère, pour qu'un bloc
  // ajouté se voie tout de suite ; un e-mail envoyé ne les contient jamais
  const shown = (b: EmailBlock) => (ctx.syntax ? true : blockShown(b, ctx.vars));
  const blocks = doc.blocs.filter((b) => (ctx.marks || !todo(b)) && shown(b));
  const rows = blocks
    .map((b) => {
      const html = blockHtml(b, ctx, unsubscribe);
      if (!ctx.marks) return html;
      // bloc encore vide (pièce ou bouton à choisir…) : un emplacement, pour le voir et le choisir
      const vide = `<tr><td class="e-pad" style="padding:8px 48px 24px;"><div style="border:1px dashed ${palette.taupe};padding:16px;text-align:center;font-family:${fontStacks.text};font-size:16px;line-height:24px;color:${palette.taupeDeep};">${esc(emailBlockDef(b.type)?.label ?? b.type)} à compléter</div></td></tr>`;
      return `<tbody data-bloc="${esc(b.id)}"${todo(b) ? " data-a-ecrire" : ""}>${html || vide}</tbody>`;
    })
    .join("\n");
  const c = light;
  // ecriture-ok : entités HTML du remplissage de l'aperçu (jamais d'espace avant « ; »)
  const spacer = "&#847;&zwnj;&nbsp;".repeat(40);
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
  return { subject, preheader, html, text: textOf(blocks.filter((b) => !todo(b)), ctx, unsubscribe) };
}

/** Version texte : les mêmes mots, sans mise en forme (lue par certaines messageries et lecteurs). */
function textOf(blocks: EmailBlock[], ctx: EmailContext, unsubscribe: string): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "titre") out.push(fill(String(b.titre ?? ""), ctx, false).toUpperCase(), "");
    if (b.type === "texte" || b.type === "photo-texte") {
      // un lien s'écrit « mots : adresse » ; les repères sont remplis après, comme dans le HTML
      const raw = String(b.texte ?? "").replace(LIEN_TEXTE, (_, label: string, url: string) => `${label} : ${href(url, ctx)}`);
      out.push(...fill(raw, ctx, false).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), "");
    }
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

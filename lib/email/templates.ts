/**
 * Gabarits d'e-mails Awrea Paris, dans la direction artistique du site : blanc cassé, noir, gris
 * pierre et taupe, aucune dorure dans l'interface ; logo officiel en image (public/brand, blanc cassé
 * sur la bande noire) ; polices officielles, Fraunces italique pour les titres (jamais sous 24 px)
 * et Cormorant Garamond pour le texte (servies par /fonts, repli sur Georgia) ; bouton noir en
 * pilule ; espacements multiples de 8 px. Tableaux et styles en ligne pour la
 * compatibilité des messageries. Les mêmes gabarits servent de modèle aux notifications Shopify
 * (voir docs/shopify-emails.md).
 */
import { identity } from "@/content/brand/identity";
import { palette, fontStacks } from "@/styles/tokens";
import { absolute } from "@/lib/seo/metadata";
import { atelierHref } from "@/lib/admin/path";

/** Adresse complète d'un lien d'e-mail ; « atelier:/retours » mène à l'adresse secrète de l'Atelier. */
const linkOf = (href: string) => (href.startsWith("http") ? href : href.startsWith("atelier:") ? absolute(atelierHref(href.slice(8) || "/")) : absolute(href));
import { formatPrice } from "@/lib/format";

export interface EmailBlockItem {
  title: string;
  meta?: string;
  price?: number;
  image?: string;
}

export interface BrandEmailInput {
  preheader: string;
  title: string;
  paragraphs: string[];
  items?: EmailBlockItem[];
  totals?: { label: string; value: string }[];
  cta?: { label: string; href: string };
  signature?: string;
  footnote?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function brandEmail(input: BrandEmailInput): { html: string; text: string } {
  const { ink, ivory, pearl, taupe, taupeDeep } = palette;
  // Cormorant Garamond a un petit œil : texte à 20 px sur 32 px, capitales et notes jamais sous 16 px
  // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
  const caps = `font-family:${fontStacks.text};font-weight:400;font-size:16px;line-height:24px;letter-spacing:1px;text-transform:uppercase;`;
  // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
  const display = `font-family:${fontStacks.display};font-style:italic;font-weight:400;`;
  const p = (t: string) =>
    `<p lang="fr" style="margin:0 0 32px;font-family:${fontStacks.text};font-weight:400;font-size:20px;line-height:32px;color:${ink};text-align:justify;hyphens:auto;-webkit-hyphens:auto;">${esc(t)}</p>`;
  const items = (input.items ?? [])
    .map(
      (it) => `<tr>
  ${it.image ? `<td width="88" style="padding:16px 16px 16px 0;vertical-align:top;"><img src="${esc(absolute(it.image))}" width="72" alt="" style="display:block;width:72px;height:auto;border:0;"></td>` : ""}
  <td style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${pearl};">
    <div style="font-family:${fontStacks.text};font-weight:400;font-size:20px;line-height:32px;color:${ink};">${esc(it.title)}</div>
    ${it.meta ? `<div style="${caps}color:${taupeDeep};padding-top:8px;">${esc(it.meta)}</div>` : ""}
  </td>
  <td align="right" style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${pearl};font-family:${fontStacks.text};font-weight:400;font-size:20px;line-height:32px;color:${ink};white-space:nowrap;font-variant-numeric:lining-nums;">${it.price != null ? formatPrice(it.price) : ""}</td>
</tr>`,
    )
    .join("");
  const totals = (input.totals ?? [])
    .map(
      (t, i, arr) =>
        // ecriture-ok : style CSS en ligne, jamais d'espace avant « : » ni « ; »
        `<tr><td style="padding:8px 0;${caps}color:${ink};${i === arr.length - 1 ? `border-top:1px solid ${ink};padding-top:16px;` : ""}">${esc(t.label)}</td><td align="right" style="padding:8px 0;font-family:${fontStacks.text};font-weight:400;font-size:20px;line-height:24px;color:${ink};${i === arr.length - 1 ? `border-top:1px solid ${ink};padding-top:16px;` : ""}">${esc(t.value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(input.title)}</title>
<style>@font-face{font-family:'Fraunces';font-weight:400;font-style:italic;src:url('${absolute("/fonts/fraunces-72pt-italic-latin.woff2")}') format('woff2');}
@font-face{font-family:'Cormorant Garamond';font-weight:400;font-style:normal;src:url('${absolute("/fonts/cormorant-garamond-latin-400.woff2")}') format('woff2');}</style></head>
<body style="margin:0;padding:0;background:${pearl};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${pearl};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${ivory};">
  <tr><td align="center" style="background:${ink};padding:40px 24px 32px;">
    <img src="${absolute("/brand/awrea-logo-blanc.png")}" width="160" alt="Awrea Paris" style="display:block;margin:0 auto;width:160px;height:auto;border:0;color:${ivory};">
  </td></tr>
  <tr><td style="padding:48px 40px 0;">
    <h1 style="margin:0 0 32px;${display}font-size:40px;line-height:48px;color:${ink};text-align:center;">${esc(input.title)}</h1>
    ${input.paragraphs.map(p).join("")}
  </td></tr>
  ${items ? `<tr><td style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>` : ""}
  ${totals ? `<tr><td style="padding:16px 40px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totals}</table></td></tr>` : ""}
  ${
    input.cta
      ? `<tr><td align="center" style="padding:32px 40px 8px;"><a href="${esc(linkOf(input.cta.href))}" style="display:inline-block;padding:8px 32px;border:1px solid ${ink};border-radius:999px;background:${ink};color:${ivory};font-family:${fontStacks.text};font-weight:400;font-size:20px;line-height:32px;text-decoration:none;">${esc(input.cta.label)}</a></td></tr>`
      : ""
  }
  <tr><td style="padding:32px 40px 40px;">
    ${input.signature ? `<p style="margin:0;${display}font-size:24px;line-height:32px;color:${ink};white-space:pre-line;">${esc(input.signature)}</p>` : ""}
  </td></tr>
  <tr><td align="center" style="background:${ink};padding:32px 24px;">
    <div style="${display}font-size:24px;line-height:32px;color:${ivory};">${esc(identity.tagline.replace(".", ""))}</div>
    <div style="${caps}color:${ivory};padding-top:8px;">Pièces créées sur demande par des artisans français · <a href="${identity.social.instagram}" style="color:${ivory};">Instagram</a> · <a href="${identity.url}" style="color:${ivory};">${identity.url.replace(/^https?:\/\//, "")}</a></div>
    ${input.footnote ? `<div style="font-family:${fontStacks.text};font-weight:400;font-size:16px;line-height:24px;color:${taupe};padding-top:16px;">${esc(input.footnote)}</div>` : ""}
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    input.title.toUpperCase(),
    "",
    ...input.paragraphs,
    ...(input.items ?? []).map((i) => `${i.title}${i.meta ? ` (${i.meta})` : ""}${i.price != null ? ` : ${formatPrice(i.price)}` : ""}`),
    ...(input.totals ?? []).map((t) => `${t.label} : ${t.value}`),
    input.cta ? `\n${input.cta.label} : ${linkOf(input.cta.href)}` : "",
    "",
    input.signature ?? "",
    "",
    `${identity.name}. ${identity.tagline}`,
  ].join("\n");

  return { html, text };
}

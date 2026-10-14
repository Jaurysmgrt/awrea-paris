/**
 * Gabarits d'e-mails Awrea Paris, dans la direction artistique du site : blanc cassé, noir, gris
 * pierre et taupe, aucun doré ; Instrument Serif pour les titres, Inter Tight pour le texte (avec
 * replis système) ; espacements multiples de 8 px. Tableaux et styles en ligne pour la
 * compatibilité des messageries. Les mêmes gabarits servent de modèle aux notifications Shopify
 * (voir docs/shopify-emails.md).
 */
import { identity } from "@/content/brand/identity";
import { palette, fontStacks } from "@/styles/tokens";
import { absolute } from "@/lib/seo/metadata";
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
  const caps = `font-family :${fontStacks.sans} ;font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase ;`;
  const p = (t: string) =>
    `<p lang="fr" style="margin:0 0 24px;font-family:${fontStacks.sans};font-weight:300;font-size:15px;line-height:24px;color:${ink};text-align:justify;hyphens:auto;-webkit-hyphens:auto;">${esc(t)}</p>`;
  const items = (input.items ?? [])
    .map(
      (it) => `<tr>
  ${it.image ? `<td width="88" style="padding:16px 16px 16px 0;vertical-align:top;"><img src="${esc(absolute(it.image))}" width="72" alt="" style="display:block;width:72px;height:auto;border:0;"></td>` : ""}
  <td style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${pearl};">
    <div style="font-family:${fontStacks.display};font-size:20px;line-height:24px;color:${ink};">${esc(it.title)}</div>
    ${it.meta ? `<div style="${caps}color:${taupeDeep};padding-top:8px;">${esc(it.meta)}</div>` : ""}
  </td>
  <td align="right" style="padding:16px 0;vertical-align:top;border-bottom:1px solid ${pearl};font-family:${fontStacks.sans};font-weight:300;font-size:13px;line-height:24px;color:${ink};white-space:nowrap;">${it.price != null ? formatPrice(it.price) : ""}</td>
</tr>`,
    )
    .join("");
  const totals = (input.totals ?? [])
    .map(
      (t, i, arr) =>
        `<tr><td style="padding:8px 0;${caps}color:${ink};${i === arr.length - 1 ? `border-top:1px solid ${ink} ;padding-top:16px ;` : ""}">${esc(t.label)}</td><td align="right" style="padding:8px 0;font-family:${fontStacks.sans};font-weight:300;font-size:13px;line-height:16px;color:${ink};${i === arr.length - 1 ? `border-top:1px solid ${ink} ;padding-top:16px ;` : ""}">${esc(t.value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(input.title)}</title></head>
<body style="margin:0;padding:0;background:${pearl};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${pearl};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${ivory};">
  <tr><td align="center" style="background:${ink};padding:40px 24px 32px;">
    <div style="font-family:${fontStacks.display};font-size:40px;line-height:40px;color:${ivory};letter-spacing:-1px;">AW</div>
    <div style="${caps}letter-spacing:6px;color:${ivory};padding-top:8px;padding-left:6px;">PARIS</div>
  </td></tr>
  <tr><td style="padding:48px 40px 0;">
    <h1 style="margin:0 0 32px;font-family:${fontStacks.display};font-weight:400;font-size:32px;line-height:40px;color:${ink};text-align:center;">${esc(input.title)}</h1>
    ${input.paragraphs.map(p).join("")}
  </td></tr>
  ${items ? `<tr><td style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>` : ""}
  ${totals ? `<tr><td style="padding:16px 40px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totals}</table></td></tr>` : ""}
  ${
    input.cta
      ? `<tr><td align="center" style="padding:32px 40px 8px;"><a href="${esc(input.cta.href.startsWith("http") ? input.cta.href : absolute(input.cta.href))}" style="display:inline-block;padding:16px 32px;border:1px solid ${ink};background:${ink};color:${ivory};${caps}text-decoration:none;">${esc(input.cta.label)}</a></td></tr>`
      : ""
  }
  <tr><td style="padding:32px 40px 40px;">
    ${input.signature ? `<p style="margin:0;font-family:${fontStacks.display};font-size:20px;line-height:32px;color:${ink};white-space:pre-line;">${esc(input.signature)}</p>` : ""}
  </td></tr>
  <tr><td align="center" style="background:${ink};padding:32px 24px;">
    <div style="font-family:${fontStacks.display};font-size:24px;line-height:32px;color:${ivory};">${esc(identity.tagline.replace(".", ""))}</div>
    <div style="${caps}color:${ivory};padding-top:8px;">Fait main à Paris · <a href="${identity.social.instagram}" style="color:${ivory};">Instagram</a> · <a href="${identity.url}" style="color:${ivory};">${identity.url.replace(/^https?:\/\//, "")}</a></div>
    ${input.footnote ? `<div style="font-family:${fontStacks.sans};font-weight:300;font-size:12px;line-height:16px;color:${taupe};padding-top:16px;">${esc(input.footnote)}</div>` : ""}
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    input.title.toUpperCase(),
    "",
    ...input.paragraphs,
    ...(input.items ?? []).map((i) => `— ${i.title}${i.meta ? ` (${i.meta})` : ""}${i.price != null ? ` : ${formatPrice(i.price)}` : ""}`),
    ...(input.totals ?? []).map((t) => `${t.label} : ${t.value}`),
    input.cta ? `\n${input.cta.label} : ${input.cta.href.startsWith("http") ? input.cta.href : absolute(input.cta.href)}` : "",
    "",
    input.signature ?? "",
    "",
    `${identity.name} — ${identity.tagline}`,
  ].join("\n");

  return { html, text };
}

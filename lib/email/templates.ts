/**
 * Gabarits d'e-mails Awrea Paris : ivoire, noir, un fil d'or, Bodoni et Cormorant (avec replis système).
 * Tableaux et styles en ligne pour la compatibilité des messageries.
 * Les mêmes gabarits servent de modèle aux notifications Shopify (voir docs/shopify-emails.md).
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
  const { ink, ivory, pearl, gold } = palette;
  const p = (t: string) =>
    `<p style="margin:0 0 16px;font-family:${fontStacks.serif};font-style:italic;font-size:18px;line-height:1.6;color:${ink};text-align:justify;">${esc(t)}</p>`;
  const items = (input.items ?? [])
    .map(
      (it) => `<tr>
  ${it.image ? `<td width="88" style="padding:12px 16px 12px 0;vertical-align:top;"><img src="${esc(absolute(it.image))}" width="72" alt="" style="display:block;width:72px;height:auto;border:0;"></td>` : ""}
  <td style="padding:12px 0;vertical-align:top;border-bottom:1px solid ${pearl};">
    <div style="font-family:${fontStacks.display};font-size:18px;color:${ink};">${esc(it.title)}</div>
    ${it.meta ? `<div style="font-family:${fontStacks.sans};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${ink};opacity:.7;padding-top:4px;">${esc(it.meta)}</div>` : ""}
  </td>
  <td align="right" style="padding:12px 0;vertical-align:top;border-bottom:1px solid ${pearl};font-family:${fontStacks.sans};font-size:13px;letter-spacing:2px;color:${ink};white-space:nowrap;">${it.price != null ? formatPrice(it.price) : ""}</td>
</tr>`,
    )
    .join("");
  const totals = (input.totals ?? [])
    .map(
      (t, i, arr) =>
        `<tr><td style="padding:4px 0;font-family:${fontStacks.sans};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${ink};${i === arr.length - 1 ? `border-top:1px solid ${ink};padding-top:10px;` : ""}">${esc(t.label)}</td><td align="right" style="padding:4px 0;font-family:${fontStacks.sans};font-size:13px;letter-spacing:2px;color:${ink};${i === arr.length - 1 ? `border-top:1px solid ${ink};padding-top:10px;` : ""}">${esc(t.value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(input.title)}</title></head>
<body style="margin:0;padding:0;background:${pearl};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${pearl};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${ivory};">
  <tr><td align="center" style="background:${ink};padding:36px 24px 28px;">
    <div style="font-family:${fontStacks.display};font-size:40px;line-height:1;color:${ivory};letter-spacing:-1px;">AW</div>
    <div style="font-family:${fontStacks.sans};font-size:10px;letter-spacing:7px;color:${ivory};padding-top:8px;padding-left:7px;">PARIS</div>
    <div style="width:48px;height:1px;background:${gold};margin:18px auto 0;font-size:0;line-height:0;">&nbsp;</div>
  </td></tr>
  <tr><td style="padding:44px 40px 12px;">
    <h1 style="margin:0 0 24px;font-family:${fontStacks.display};font-weight:400;font-size:30px;line-height:1.2;color:${ink};text-align:center;">${esc(input.title)}</h1>
    ${input.paragraphs.map(p).join("")}
  </td></tr>
  ${items ? `<tr><td style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>` : ""}
  ${totals ? `<tr><td style="padding:16px 40px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totals}</table></td></tr>` : ""}
  ${
    input.cta
      ? `<tr><td align="center" style="padding:32px 40px 8px;"><a href="${esc(input.cta.href.startsWith("http") ? input.cta.href : absolute(input.cta.href))}" style="display:inline-block;padding:14px 32px;border:1px solid ${ink};background:${ink};color:${ivory};font-family:${fontStacks.sans};font-size:11px;letter-spacing:4px;text-transform:uppercase;text-decoration:none;">${esc(input.cta.label)}</a></td></tr>`
      : ""
  }
  <tr><td style="padding:32px 40px 40px;">
    ${input.signature ? `<p style="margin:0;font-family:${fontStacks.script};font-size:28px;line-height:1.3;color:${ink};white-space:pre-line;">${esc(input.signature)}</p>` : ""}
  </td></tr>
  <tr><td align="center" style="background:${ink};padding:24px;">
    <div style="font-family:${fontStacks.script};font-size:22px;color:${gold};">${esc(identity.tagline.replace(".", ""))}</div>
    <div style="font-family:${fontStacks.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${ivory};padding-top:10px;">Fait main à Paris · <a href="${identity.social.instagram}" style="color:${ivory};">Instagram</a> · <a href="${identity.url}" style="color:${ivory};">${identity.url.replace(/^https?:\/\//, "")}</a></div>
    ${input.footnote ? `<div style="font-family:${fontStacks.serif};font-style:italic;font-size:12px;color:${ivory};opacity:.7;padding-top:12px;">${esc(input.footnote)}</div>` : ""}
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

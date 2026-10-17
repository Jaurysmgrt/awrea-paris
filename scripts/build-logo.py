#!/usr/bin/env python3
"""
Logo provisoire d'Awrea Paris, vectorisé à partir des polices du site (styles/fonts) :
« AW » en Instrument Serif (fin, fort contraste) et « PARIS » en Inter Tight, capitales très
espacées. Les lettres deviennent des tracés : le dessin est identique partout, même là où les
polices ne sont pas chargées (favicon, e-mails, kit presse).

Sorties :
  public/brand/logo.svg, monogram.svg            (masques CSS : prennent la couleur du texte)
  public/brand/logo-noir.svg, logo-blanc.svg      (fichiers à transmettre : presse, réseaux)
  public/brand/monogramme-noir.svg, monogramme-blanc.svg
  app/icon.svg                                    (favicon : AW blanc cassé sur noir)
  content/brand/logo-paths.ts                     (tracés pour les composants : logo, chargement)

Usage : python3 scripts/build-logo.py   (dépendances : pip install fonttools brotli uharfbuzz)
À remplacer par les fichiers officiels dès qu'ils sont fournis (public/brand/README.md).
"""
from io import BytesIO
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
INK, IVORY = "#0A0A0A", "#F7F6F3"


def load(name):
    font = TTFont(ROOT / "styles" / "fonts" / name)
    font.flavor = None  # WOFF2 → OpenType brut pour HarfBuzz
    data = BytesIO()
    font.save(data)
    return font, data.getvalue()


def shape(font, data, text, tracking=0.0, location=None):
    """Glyphes positionnés (crénage de la police compris), en unités de la police, ligne de base y = 0."""
    hbfont = hb.Font(hb.Face(data))
    if location:
        hbfont.set_variations(location)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": False})
    order = font.getGlyphOrder()
    glyphset = font.getGlyphSet(location=location) if location else font.getGlyphSet()
    upem = font["head"].unitsPerEm
    x, placed = 0.0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        placed.append((order[info.codepoint], x + pos.x_offset, pos.y_offset))
        x += pos.x_advance + tracking * upem
    return glyphset, placed


def outline(glyphset, placed, scale, dx, dy):
    """Tracé SVG (y vers le bas) et boîte englobante après transformation."""
    svg, bounds = SVGPathPen(glyphset, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip(".")), BoundsPen(glyphset)
    for name, gx, gy in placed:
        t = (scale, 0, 0, -scale, dx + gx * scale, dy - gy * scale)
        glyphset[name].draw(TransformPen(svg, t))
        glyphset[name].draw(TransformPen(bounds, t))
    return svg.getCommands(), bounds.bounds


def ink_box(glyphset, placed):
    pen = BoundsPen(glyphset)
    for name, gx, gy in placed:
        glyphset[name].draw(TransformPen(pen, (1, 0, 0, 1, gx, gy)))
    return pen.bounds  # xmin, ymin, xmax, ymax (y vers le haut)


serif, serif_data = load("instrument-serif-latin-400-normal.woff2")
sans, sans_data = load("inter-tight-latin-wght-normal.woff2")

# --- « AW » : hauteur de capitale = 100 unités du dessin
aw_set, aw = shape(serif, serif_data, "AW", tracking=-0.015)
ax0, ay0, ax1, ay1 = ink_box(aw_set, aw)
aw_scale = 100 / (ay1 - max(ay0, 0))
aw_w = (ax1 - ax0) * aw_scale

# --- « PARIS » : capitales de 13 unités (13 % de « AW »), interlettrage de 0,62 em, graisse 400
P_CAP, TRACK = 13, 0.62
pa_set, pa = shape(sans, sans_data, "PARIS", tracking=TRACK, location={"wght": 400})
px0, py0, px1, py1 = ink_box(pa_set, pa)
pa_scale = P_CAP / (py1 - max(py0, 0))
pa_w = (px1 - px0) * pa_scale
GAP = 30  # du pied de « AW » au sommet de « PARIS »
PAD = 12

# Logo complet : les deux lignes centrées sur leur encre (sans l'interlettrage final)
W = max(aw_w, pa_w) + 2 * PAD
aw_dx = (W - aw_w) / 2 - ax0 * aw_scale
aw_base = PAD + 100
logo_aw, _ = outline(aw_set, aw, aw_scale, aw_dx, aw_base)
pa_dx = (W - pa_w) / 2 - px0 * pa_scale
pa_base = aw_base + GAP + P_CAP
logo_pa, _ = outline(pa_set, pa, pa_scale, pa_dx, pa_base)
H = pa_base + PAD
logo_box = f"0 0 {W:.0f} {H:.0f}"

# Monogramme seul, dans un carré
M = 100 + 2 * 22
mono_w = max(aw_w + 2 * 16, M)
mono_aw, _ = outline(aw_set, aw, aw_scale, (mono_w - aw_w) / 2 - ax0 * aw_scale, 22 + 100)
mono_box = f"0 0 {mono_w:.0f} {M:.0f}"

# Favicon : 64 × 64, monogramme blanc cassé sur noir, capitales de 30 px
fav_scale = aw_scale * 0.3
fav_w = aw_w * 0.3
fav_aw, _ = outline(aw_set, aw, fav_scale, (64 - fav_w) / 2 - ax0 * fav_scale, 32 + 15)


def svg(box, paths, color, title, background=None):
    bg = f'<rect width="100%" height="100%" fill="{background}"/>' if background else ""
    body = "".join(f'<path d="{d}"/>' for d in paths)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{bg}<g fill=\"{color}\">{body}</g></svg>\n"
    )


brand = ROOT / "public" / "brand"
brand.mkdir(parents=True, exist_ok=True)
files = {
    "logo.svg": svg(logo_box, [logo_aw, logo_pa], INK, "Awrea Paris"),
    "logo-noir.svg": svg(logo_box, [logo_aw, logo_pa], INK, "Awrea Paris"),
    "logo-blanc.svg": svg(logo_box, [logo_aw, logo_pa], IVORY, "Awrea Paris"),
    "monogram.svg": svg(mono_box, [mono_aw], INK, "Awrea Paris"),
    "monogramme-noir.svg": svg(mono_box, [mono_aw], INK, "Awrea Paris"),
    "monogramme-blanc.svg": svg(mono_box, [mono_aw], IVORY, "Awrea Paris"),
}
for name, content in files.items():
    (brand / name).write_text(content)
(ROOT / "app" / "icon.svg").write_text(svg("0 0 64 64", [fav_aw], IVORY, "Awrea Paris", background=INK))

ts = f'''/**
 * Tracés du logo provisoire (générés par scripts/build-logo.py à partir des polices du site :
 * ne pas modifier à la main). Utilisés par components/brand/Logo.tsx et par les animations du
 * monogramme (le trait se dessine le long de ces tracés).
 */
export const logoPaths = {{
  viewBox: "{logo_box}",
  aw: "{logo_aw}",
  paris: "{logo_pa}",
}} as const;

export const monogramPaths = {{
  viewBox: "{mono_box}",
  aw: "{mono_aw}",
}} as const;
'''
(ROOT / "content" / "brand" / "logo-paths.ts").write_text(ts)
print(f"logo {logo_box} · monogramme {mono_box} · {len(files)} fichiers + favicon + tracés")

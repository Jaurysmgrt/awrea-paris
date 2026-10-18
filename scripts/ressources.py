#!/usr/bin/env python3
"""
Ressources officielles d'Awrea Paris (dossier ressources-awrea/, copie du Google Drive de la Maison).

Prépare pour le site, sans jamais modifier les originaux :
  - polices : POLICE TITRES (Fraunces 72pt Italic) et POLICE TEXTES (Cormorant Garamond) en WOFF2,
    réduites aux alphabets latins (français, anglais, langues européennes), fonctionnalités
    OpenType conservées (crénage, ligatures, chiffres elzéviriens, petites capitales)
    → styles/fonts/
  - POLICE LOGO (Croisan, licence « Personal Use ») : convertie à part, hors du site et hors de Git,
    tant que la licence commerciale n'est pas achetée (RESSOURCES.md) → ressources-awrea/TYPO/web/
  - logo et monogramme : fichiers officiels, fond blanc rendu transparent (déliés intacts), plus
    les icônes de l'onglet et de l'écran d'accueil tirées du monogramme
    → public/brand/awrea-logo.png, awrea-monogramme.png, awrea-aw.png ; app/icon.png, app/apple-icon.png
    (un tracé vectoriel automatique déformait les déliés : le SVG reste à fournir par la Maison)
  - photos provisoires (PHOTOS IA EN ATTENDANT) et portrait de la créatrice : recadrées en 2:3,
    filigranes de l'outil de génération écartés par le recadrage, déclinées en 480, 960 et 1600 px
    (WebP) → public/media/img/<nom>(-480|-960).webp, suivant lib/media.ts

Relancer après avoir remplacé un fichier de ressources-awrea/ : `npm run ressources`.
"""
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "ressources-awrea"
FONTS_OUT = ROOT / "styles" / "fonts"
BRAND_OUT = ROOT / "public" / "brand"
IMG_OUT = ROOT / "public" / "media" / "img"
LOCAL_ONLY = RES / "TYPO" / "web"
PUBLIC_FONTS = ROOT / "public" / "fonts"
PDF_FONTS = ROOT / "assets" / "pdf"

# --------------------------------------------------------------------------- polices
# Latin de base, Latin-1, Latin étendu A, ponctuation générale, euro, signes utiles.
UNICODES = (
    "U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+0300-0301,U+0303,U+0308,U+0327,U+2000-206F,U+2070-209F,U+20AC,U+2116,U+2122,"
    "U+2190-2193,U+2212,U+2215,U+2260,U+2264-2265,U+FEFF,U+FFFD"
)
FEATURES = ["kern", "liga", "clig", "calt", "dlig", "onum", "lnum", "pnum", "tnum", "smcp", "c2sc", "case", "ordn", "sups", "frac", "ss01", "ss02", "locl", "mark", "mkmk", "ccmp"]


def woff2(src: Path, dest: Path, unicodes: str | None = UNICODES) -> None:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = FEATURES
    opts.name_IDs = ["*"]  # garder copyright et licence dans le fichier
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    font = TTFont(src)
    sub = subset.Subsetter(opts)
    if unicodes:
        sub.populate(unicodes=subset.parse_unicodes(unicodes))
    else:
        sub.populate(unicodes=list(font.getBestCmap().keys()))
    sub.subset(font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(dest)
    print(f"  {dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} Ko")


def fonts() -> None:
    print("Polices")
    woff2(RES / "TYPO" / "POLICE TITRES.ttf", FONTS_OUT / "fraunces-72pt-italic-latin.woff2")
    woff2(RES / "TYPO" / "POLICE TEXTES.ttf", FONTS_OUT / "cormorant-garamond-latin-400.woff2")
    # mêmes fichiers pour les e-mails (URL publique) et TTF complets pour les factures et étiquettes PDF
    PUBLIC_FONTS.mkdir(parents=True, exist_ok=True)
    PDF_FONTS.mkdir(parents=True, exist_ok=True)
    for f in FONTS_OUT.glob("*"):
        if f.name.startswith(("fraunces-", "cormorant-", "OFL-fraunces", "OFL-cormorant")):
            shutil.copyfile(f, PUBLIC_FONTS / f.name)
    shutil.copyfile(RES / "TYPO" / "POLICE TITRES.ttf", PDF_FONTS / "Fraunces72pt-Italic.ttf")
    shutil.copyfile(RES / "TYPO" / "POLICE TEXTES.ttf", PDF_FONTS / "CormorantGaramond-Regular.ttf")
    for lic in ("OFL-fraunces.txt", "OFL-cormorant-garamond.txt"):
        shutil.copyfile(FONTS_OUT / lic, PDF_FONTS / lic)
    print("  public/fonts et assets/pdf à jour")
    logo = RES / "TYPO" / "POLICE LOGO.otf"
    if logo.exists():
        woff2(logo, LOCAL_ONLY / "croisan.woff2", unicodes=None)


# --------------------------------------------------------------------------- logo
def transparent(src: Path, dest: Path, box: tuple[int, int, int, int] | None = None, color: tuple[int, int, int] = (10, 10, 10)) -> Image.Image:
    """Fichier officiel, fond blanc rendu transparent : l'opacité vient de la luminance (déliés
    intacts, anticrénelage d'origine), le dessin prend la couleur du texte (masque CSS)."""
    im = Image.open(src).convert("L")
    if box:
        im = im.crop(box)
    ink = ImageOps.invert(im)
    bbox = ink.point(lambda v: 255 if v > 12 else 0).getbbox() or (0, 0, *im.size)
    m = 6
    x0, y0, x1, y1 = max(bbox[0] - m, 0), max(bbox[1] - m, 0), min(bbox[2] + m, im.size[0]), min(bbox[3] + m, im.size[1])
    alpha = ink.crop((x0, y0, x1, y1)).point(lambda v: 0 if v < 6 else min(255, round(v * 1.04)))
    png = Image.new("RGBA", alpha.size, (*color, 0))
    png.putalpha(alpha)
    dest.parent.mkdir(parents=True, exist_ok=True)
    png.save(dest, optimize=True)
    print(f"  {dest.relative_to(ROOT)}  {png.size[0]}×{png.size[1]}, {dest.stat().st_size // 1024} Ko")
    return png


def icons(mono: Image.Image) -> None:
    """Icônes de l'onglet et de l'écran d'accueil : le monogramme AW seul, centré."""
    app = ROOT / "app"
    for size, name, pad, bg in ((32, "icon.png", 0.08, None), (180, "apple-icon.png", 0.16, (247, 246, 243, 255))):
        side = max(mono.size)
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(mono, ((side - mono.size[0]) // 2, (side - mono.size[1]) // 2), mono)
        inner = round(size * (1 - 2 * pad))
        glyph = canvas.resize((inner, inner), Image.LANCZOS)
        out = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
        out.paste(glyph, ((size - inner) // 2, (size - inner) // 2), glyph)
        out.save(app / name, optimize=True)
        print(f"  app/{name}  {size}×{size}")


def logos() -> None:
    print("Logo")
    transparent(RES / "LOGO" / "LOGO ENTIER.png", BRAND_OUT / "awrea-logo.png")
    # version blanc cassé pour les fonds noirs des e-mails (les messageries ignorent les masques CSS)
    transparent(RES / "LOGO" / "LOGO ENTIER.png", BRAND_OUT / "awrea-logo-blanc.png", color=(247, 246, 243))
    transparent(RES / "LOGO" / "LOGO MINI.png", BRAND_OUT / "awrea-monogramme.png")
    # monogramme sans « PARIS » (le dessin AW occupe le haut du fichier) pour les petites tailles
    aw = transparent(RES / "LOGO" / "LOGO MINI.png", BRAND_OUT / "awrea-aw.png", box=(0, 0, 564, 400))
    icons(aw)


# --------------------------------------------------------------------------- photos
# (fichier source, nom publié, boîte de travail (x0, y0, x1, y1) hors filigranes ou None,
#  centre vertical relatif du recadrage 2:3, zoom)
PHOTOS = [
    ("PHOTOS IA EN ATTENDANT/BODY AURA.png", "aura-1", None, 0.42, 1.0),
    ("PHOTOS IA EN ATTENDANT/BODY AURA.png", "aura-detail", None, 0.5, 1.55),
    ("PHOTOS IA EN ATTENDANT/ROBE ODESSA.png", "odessa-1", None, 0.42, 1.0),
    ("PHOTOS IA EN ATTENDANT/ROBE ODESSA.png", "odessa-detail", None, 0.48, 1.55),
    ("PHOTOS IA EN ATTENDANT/ROBE ARIA.jpg", "aria-1", (110, 100, 1440, 2440), 0.42, 1.0),
    ("PHOTOS IA EN ATTENDANT/ROBE ARIA.jpg", "aria-detail", (110, 100, 1440, 2440), 0.33, 1.4),
    ("PHOTOS IA EN ATTENDANT/ROBE SIENNA.png", "sienna-1", None, 0.42, 1.0),
    ("PHOTOS IA EN ATTENDANT/ROBE SIENNA.png", "sienna-detail", None, 0.36, 1.55),
    ("PHOTOS IA EN ATTENDANT/BODY GAÏA.png", "gaia-1", (110, 100, 1760, 2340), 0.5, 1.0),
    ("PHOTOS IA EN ATTENDANT/BODY GAÏA.png", "gaia-detail", (110, 100, 1760, 2340), 0.5, 1.45),
    ("PHOTOS IA EN ATTENDANT/TOP EVINA.png", "evina-1", None, 0.5, 1.0),
    ("PHOTOS IA EN ATTENDANT/TOP KIRA.jpg", "kira-1", None, 0.5, 1.0),
    ("PHOTO À PROPOS.png", "creatrice-portrait", None, 0.5, 1.0),
]
# visuel de la maquette FORMULAIRE CONTACT (sacs à l'effigie de la Maison), découpé dans la maquette
CONTACT = ("DA PRÉSENTATION/FORMULAIRE CONTACT.png", "contact-sacs", (16, 188, 1420, 1140))
WIDTHS = (480, 960)
FULL = 1600


def crop_23(im: Image.Image, cy: float, zoom: float, cx: float = 0.5) -> Image.Image:
    w, h = im.size
    ratio = 2 / 3
    if w / h > ratio:
        ch = h / zoom
        cw = ch * ratio
    else:
        cw = w / zoom
        ch = cw / ratio
    x = min(max(cx * w - cw / 2, 0), w - cw)
    y = min(max(cy * h - ch / 2, 0), h - ch)
    return im.crop((round(x), round(y), round(x + cw), round(y + ch)))


def publish(im: Image.Image, name: str, quality: int = 80) -> None:
    IMG_OUT.mkdir(parents=True, exist_ok=True)
    w, h = im.size
    for target in WIDTHS:
        im.resize((target, round(h * target / w)), Image.LANCZOS).save(IMG_OUT / f"{name}-{target}.webp", "WEBP", quality=quality, method=6)
    full = min(FULL, w)
    big = im if full == w else im.resize((full, round(h * full / w)), Image.LANCZOS)
    big.save(IMG_OUT / f"{name}.webp", "WEBP", quality=quality, method=6)
    print(f"  /media/img/{name}  {big.size[0]}×{big.size[1]}" + ("  (agrandie)" if w < 960 else ""))


def photos() -> None:
    print("Photos")
    for src, name, box, cy, zoom in PHOTOS:
        im = Image.open(RES / src).convert("RGB")
        if box:
            im = im.crop(box)
        publish(crop_23(im, cy, zoom), name)
    src, name, box = CONTACT
    publish(Image.open(RES / src).convert("RGB").crop(box), name)


if __name__ == "__main__":
    steps = {"polices": fonts, "logo": logos, "photos": photos}
    for key in sys.argv[1:] or steps:
        steps[key]()

#!/usr/bin/env python3
"""
Pipeline média AWREA PARIS.

Génère dans public/media/ :
  - photos provisoires étalonnées en duotone noir #0B0B0B / ivoire #F4F1EB (WebP, plusieurs largeurs)
  - texture dentelle procédurale raccordable (pour la lumière dorée et la révélation)
  - texture papier (sections « lettre manuscrite »)
  - vidéos de démonstration (hero desktop/mobile, fiches produit, atelier) + images de remplacement

Remplacer les fichiers de media-src/ par les vrais visuels puis relancer : `npm run media`.
"""
import math
import os
import random
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "media-src" / "placeholders"
OUT = ROOT / "public" / "media"
TMP = ROOT / ".media-tmp"

INK = (11, 11, 11)
IVORY = (244, 241, 235)
PEARL = (217, 214, 208)

WIDTHS = [480, 960, 1600]


def duotone(img: Image.Image, dark=INK, light=IVORY, contrast=1.08) -> Image.Image:
    g = ImageOps.grayscale(img)
    g = ImageOps.autocontrast(g, cutoff=0.6)
    if contrast != 1:
        g = g.point(lambda v: max(0, min(255, int((v - 128) * contrast + 128))))
    return ImageOps.colorize(g, black=dark, white=light, mid=None)


def save_responsive(img: Image.Image, name: str, quality=78):
    """Enregistre <name>-<w>.webp pour chaque largeur + <name>.webp (largeur max)."""
    w, h = img.size
    for target in WIDTHS:
        if target > w and target != WIDTHS[0]:
            continue
        tw = min(target, w)
        th = round(h * tw / w)
        img.resize((tw, th), Image.LANCZOS).save(OUT / "img" / f"{name}-{target}.webp", "WEBP", quality=quality, method=6)
    img.save(OUT / "img" / f"{name}.webp", "WEBP", quality=quality, method=6)


def crop_ratio(img: Image.Image, ratio: float, cx=0.5, cy=0.5, zoom=1.0) -> Image.Image:
    """Recadre au ratio largeur/hauteur donné autour d'un centre relatif, avec zoom optionnel."""
    w, h = img.size
    if w / h > ratio:
        ch = h / zoom
        cw = ch * ratio
    else:
        cw = w / zoom
        ch = cw / ratio
    x = min(max(cx * w - cw / 2, 0), w - cw)
    y = min(max(cy * h - ch / 2, 0), h - ch)
    return img.crop((int(x), int(y), int(x + cw), int(y + ch)))


# ---------------------------------------------------------------- photos
# (source, nom, ratio, cx, cy, zoom, miroir)
PHOTOS = [
    ("gown-lace-back", "odessa-1", 2 / 3, 0.5, 0.5, 1.0, False),
    ("gown-lace-back", "odessa-2", 2 / 3, 0.5, 0.42, 1.9, False),
    ("gown-lace-back", "odessa-detail", 2 / 3, 0.52, 0.38, 3.2, False),
    ("mini-black-satin", "gaia-1", 2 / 3, 0.5, 0.5, 1.0, False),
    ("mini-black-satin", "gaia-2", 2 / 3, 0.48, 0.48, 1.8, True),
    ("mini-black-satin", "gaia-detail", 2 / 3, 0.45, 0.5, 3.0, False),
    ("portrait-satin", "aura-1", 2 / 3, 0.5, 0.5, 1.0, False),
    ("portrait-satin", "aura-2", 2 / 3, 0.62, 0.55, 1.7, True),
    ("portrait-satin", "aura-detail", 2 / 3, 0.66, 0.42, 3.0, False),
    ("dress-asymmetric", "kira-1", 2 / 3, 0.5, 0.5, 1.0, False),
    ("dress-asymmetric", "kira-2", 2 / 3, 0.52, 0.35, 1.8, True),
    ("dress-asymmetric", "kira-detail", 2 / 3, 0.5, 0.35, 3.0, False),
    ("gown-back-white", "thais-1", 2 / 3, 0.5, 0.5, 1.0, False),
    ("gown-back-white", "thais-2", 2 / 3, 0.45, 0.35, 1.7, True),
    ("gown-back-white", "thais-detail", 2 / 3, 0.42, 0.62, 2.6, False),
    ("dress-asymmetric", "nyx-1", 2 / 3, 0.5, 0.62, 1.35, True),
    ("dress-asymmetric", "nyx-2", 2 / 3, 0.5, 0.7, 2.0, False),
    ("mini-black-satin", "elia-1", 2 / 3, 0.55, 0.42, 1.4, False),
    ("mini-black-satin", "elia-2", 2 / 3, 0.52, 0.45, 2.2, True),
    ("portrait-satin", "iris-1", 2 / 3, 0.4, 0.62, 1.3, False),
    ("portrait-satin", "iris-2", 2 / 3, 0.35, 0.7, 2.1, True),
    # looks & éditorial
    ("gown-lace-back", "look-1", 4 / 5, 0.5, 0.5, 1.0, False),
    ("mini-black-satin", "look-2", 4 / 5, 0.5, 0.5, 1.0, False),
    ("dress-asymmetric", "look-3", 4 / 5, 0.5, 0.5, 1.0, False),
    ("gown-back-white", "editorial-1", 16 / 9, 0.5, 0.35, 1.0, False),
    ("gown-lace-back", "editorial-2", 16 / 9, 0.5, 0.35, 1.0, False),
    ("portrait-satin", "editorial-3", 16 / 9, 0.5, 0.3, 1.0, False),
    ("gown-lace-back", "collection-lace", 3 / 4, 0.5, 0.45, 1.25, False),
    ("gown-back-white", "collection-drape", 3 / 4, 0.5, 0.45, 1.2, False),
    ("portrait-satin", "creatrice", 4 / 5, 0.5, 0.35, 1.15, False),
    # atelier
    ("atelier-measure", "atelier-1", 3 / 2, 0.5, 0.5, 1.0, False),
    ("atelier-lace-scissors", "atelier-2", 3 / 2, 0.5, 0.5, 1.0, False),
    ("atelier-needle", "atelier-3", 3 / 2, 0.5, 0.5, 1.0, False),
    ("atelier-hands", "atelier-4", 3 / 2, 0.5, 0.5, 1.0, False),
    ("atelier-lace-scissors", "atelier-5", 4 / 5, 0.55, 0.5, 1.2, False),
    ("atelier-needle", "atelier-6", 4 / 5, 0.62, 0.55, 1.1, False),
]


def build_photos():
    (OUT / "img").mkdir(parents=True, exist_ok=True)
    cache = {}
    for src, name, ratio, cx, cy, zoom, mirror in PHOTOS:
        if src not in cache:
            cache[src] = duotone(Image.open(SRC / f"{src}.jpg").convert("RGB"))
        im = crop_ratio(cache[src], ratio, cx, cy, zoom)
        if mirror:
            im = ImageOps.mirror(im)
        # le détail sert à la loupe : on le garde grand
        if im.width < 1200:
            im = im.resize((1200, round(1200 / ratio)), Image.LANCZOS)
        save_responsive(im, name)
    # l'image de partage par défaut est app/opengraph-image.png (scripts/ressources.py, étape « partage »)


# ---------------------------------------------------------------- dentelle
def ellipse_poly(cx, cy, rx, ry, angle, n=40):
    pts = []
    ca, sa = math.cos(angle), math.sin(angle)
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def build_textures():
    (OUT / "texture").mkdir(parents=True, exist_ok=True)
    # plus de dentelle dessinée sur les fonds noirs (cahier des modifications du 27/10) : la vraie
    # dentelle vit dans les photos des pièces

    # papier : grain fin + fibres, ton ivoire (sections « lettre »)
    random.seed(3)
    W = 768
    paper = Image.new("L", (W, W), 0)
    px = paper.load()
    for y in range(W):
        for x in range(W):
            px[x, y] = random.randint(0, 255)
    paper = paper.filter(ImageFilter.GaussianBlur(0.8))
    fib = Image.new("L", (W, W), 128)
    fd = ImageDraw.Draw(fib)
    for _ in range(900):
        x, y = random.random() * W, random.random() * W
        a = random.random() * math.pi
        ln = random.uniform(6, 28)
        fd.line([(x, y), (x + math.cos(a) * ln, y + math.sin(a) * ln)], fill=random.choice([110, 150]), width=1)
    fib = fib.filter(ImageFilter.GaussianBlur(0.6))
    mix = Image.blend(paper, fib, 0.5)
    mix = mix.point(lambda v: int(128 + (v - 128) * 0.22))
    paper_rgb = ImageOps.colorize(mix, black=(225, 220, 210), white=(250, 248, 243), mid=IVORY)
    paper_rgb.save(OUT / "texture" / "paper.webp", "WEBP", quality=80)


# ---------------------------------------------------------------- vidéos
def ffmpeg(*args):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *args]
    subprocess.run(cmd, check=True)


def kenburns(src_img: Path, out: Path, w: int, h: int, seconds: float, z0=1.0, z1=1.12, px=0.5, py=0.5, fps=25, crf=30):
    frames = int(seconds * fps)
    # sur-échantillonnage x2 pour un zoom sans saccade
    zexpr = f"{z0}+({z1}-{z0})*on/{frames}"
    vf = (
        f"scale={w * 2}:{h * 2}:force_original_aspect_ratio=increase,crop={w * 2}:{h * 2},"
        f"zoompan=z='{zexpr}':x='(iw-iw/zoom)*{px}':y='(ih-ih/zoom)*{py}':d={frames}:s={w}x{h}:fps={fps},"
        f"format=yuv420p"
    )
    ffmpeg("-loop", "1", "-i", str(src_img), "-vf", vf, "-t", str(seconds), "-an",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-movflags", "+faststart", "-pix_fmt", "yuv420p", str(out))


def concat_xfade(parts, out: Path, seg: float, fade=1.2, crf=30):
    inputs = []
    for p in parts:
        inputs += ["-i", str(p)]
    flt = []
    last = "[0:v]"
    offset = seg - fade
    for i in range(1, len(parts)):
        lab = f"[v{i}]"
        flt.append(f"{last}[{i}:v]xfade=transition=fade:duration={fade}:offset={offset:.2f}{lab}")
        last = lab
        offset += seg - fade
    ffmpeg(*inputs, "-filter_complex", ";".join(flt), "-map", last, "-an", "-c:v", "libx264", "-preset", "slow",
           "-crf", str(crf), "-movflags", "+faststart", "-pix_fmt", "yuv420p", str(out))


def poster(video: Path, out: Path, t=0.5):
    tmp = out.with_suffix(".png")
    ffmpeg("-ss", str(t), "-i", str(video), "-frames:v", "1", str(tmp))
    Image.open(tmp).save(out, "WEBP", quality=72)
    tmp.unlink()


def build_videos():
    if not shutil.which("ffmpeg"):
        print("ffmpeg absent : vidéos ignorées")
        return
    (OUT / "video").mkdir(parents=True, exist_ok=True)
    TMP.mkdir(exist_ok=True)
    img = OUT / "img"

    # hero : 3 plans, 14 s, boucle
    for variant, (w, h, crf) in {"desktop": (1280, 720, 31), "mobile": (540, 960, 32)}.items():
        parts = []
        for i, (name, py) in enumerate([("editorial-2", 0.3), ("editorial-1", 0.35), ("editorial-3", 0.3)]):
            src = img / f"{name}.webp" if variant == "desktop" else img / f"{['odessa-1', 'thais-1', 'aura-1'][i]}.webp"
            p = TMP / f"hero-{variant}-{i}.mp4"
            kenburns(src, p, w, h, 5.6, 1.0, 1.1, 0.5, py, crf=crf)
            parts.append(p)
        out = OUT / "video" / f"hero-{variant}.mp4"
        concat_xfade(parts, out, 5.6, 1.4, crf=crf)
        poster(out, OUT / "video" / f"hero-{variant}.webp", 0.2)

    # fiches produit : mouvement lent sur le détail de la dentelle
    for slug in ["odessa", "gaia", "aura", "kira", "thais", "nyx", "elia", "iris"]:
        src = img / f"{slug}-detail.webp" if (img / f"{slug}-detail.webp").exists() else img / f"{slug}-2.webp"
        out = OUT / "video" / f"product-{slug}.mp4"
        kenburns(src, out, 540, 810, 6, 1.0, 1.18, 0.5, 0.4, crf=31)
        poster(out, OUT / "video" / f"product-{slug}.webp", 0.1)

    # atelier
    for i in range(1, 5):
        out = OUT / "video" / f"atelier-{i}.mp4"
        kenburns(img / f"atelier-{i}.webp", out, 960, 640, 7, 1.0, 1.14, 0.5, 0.5, crf=31)
        poster(out, OUT / "video" / f"atelier-{i}.webp", 0.1)

    shutil.rmtree(TMP, ignore_errors=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_photos()
    print("photos ok")
    build_textures()
    print("textures ok")
    build_videos()
    print("vidéos ok")

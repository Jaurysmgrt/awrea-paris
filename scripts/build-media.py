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
GOLD = (184, 149, 90)

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
    # Open Graph 1200x630
    og = crop_ratio(cache["gown-lace-back"], 1200 / 630, 0.5, 0.32, 1.0).resize((1200, 630), Image.LANCZOS)
    og.save(OUT / "img" / "og-default.jpg", "JPEG", quality=82)


# ---------------------------------------------------------------- dentelle
def ellipse_poly(cx, cy, rx, ry, angle, n=40):
    pts = []
    ca, sa = math.cos(angle), math.sin(angle)
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def draw_lace(size=512, scale=2, color=(255, 255, 255), seed=7):
    """Tuile raccordable : tulle hexagonal + rosaces + rinceaux feuillus. Alpha = fil."""
    random.seed(seed)
    S = size * scale
    img = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(img)
    lw = max(1, int(1.1 * scale))

    def tiled(fn):
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                fn(ox, oy)

    # tulle hexagonal
    cell = 18 * scale
    hgt = cell * math.sqrt(3) / 2
    rows = int(S / hgt) + 2
    cols = int(S / cell) + 2

    def tulle(ox, oy):
        for r in range(-1, rows):
            for c in range(-1, cols):
                x = c * cell + (cell / 2 if r % 2 else 0) + ox
                y = r * hgt + oy
                hexagon = [(x + cell / 2 * math.cos(math.pi / 3 * k + math.pi / 6),
                            y + cell / 2 * math.sin(math.pi / 3 * k + math.pi / 6)) for k in range(7)]
                d.line(hexagon, fill=70, width=max(1, scale // 2))

    tulle(0, 0)

    def rosette(cx, cy, r, petals, ox, oy):
        cx += ox
        cy += oy
        # coeur
        d.ellipse((cx - r * 0.22, cy - r * 0.22, cx + r * 0.22, cy + r * 0.22), outline=255, width=lw * 2)
        d.ellipse((cx - r * 0.1, cy - r * 0.1, cx + r * 0.1, cy + r * 0.1), fill=230)
        # pétales doubles
        for k in range(petals):
            a = 2 * math.pi * k / petals
            px, py = cx + math.cos(a) * r * 0.55, cy + math.sin(a) * r * 0.55
            d.polygon(ellipse_poly(px, py, r * 0.33, r * 0.16, a), outline=255, width=lw * 2)
            d.line([(cx + math.cos(a) * r * 0.26, cy + math.sin(a) * r * 0.26),
                    (cx + math.cos(a) * r * 0.82, cy + math.sin(a) * r * 0.82)], fill=200, width=lw)
            # hachures du pétale (effet brodé)
            for j in range(1, 4):
                t = 0.35 + j * 0.12
                qx, qy = cx + math.cos(a) * r * t, cy + math.sin(a) * r * t
                nx, ny = -math.sin(a) * r * 0.08, math.cos(a) * r * 0.08
                d.line([(qx - nx, qy - ny), (qx + nx, qy + ny)], fill=170, width=lw)
        # couronne de picots
        for k in range(petals * 3):
            a = 2 * math.pi * k / (petals * 3) + math.pi / (petals * 3)
            px, py = cx + math.cos(a) * r * 1.0, cy + math.sin(a) * r * 1.0
            pr = r * 0.035
            d.ellipse((px - pr, py - pr, px + pr, py + pr), fill=230)
        d.ellipse((cx - r * 0.92, cy - r * 0.92, cx + r * 0.92, cy + r * 0.92), outline=150, width=lw)

    def sprig(x0, y0, x1, y1, bend, ox, oy):
        pts = []
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        nx, ny = -(y1 - y0), (x1 - x0)
        ln = math.hypot(nx, ny) or 1
        cxp, cyp = mx + nx / ln * bend, my + ny / ln * bend
        for i in range(41):
            t = i / 40
            x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cxp + t * t * x1
            y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cyp + t * t * y1
            pts.append((x + ox, y + oy))
        d.line(pts, fill=230, width=lw * 2)
        for i in range(4, 38, 5):
            (xa, ya), (xb, yb) = pts[i], pts[i + 1]
            a = math.atan2(yb - ya, xb - xa)
            side = 1 if (i // 5) % 2 else -1
            la = a + side * 0.9
            lx, ly = xa + math.cos(la) * 11 * scale, ya + math.sin(la) * 11 * scale
            d.polygon(ellipse_poly(lx, ly, 9 * scale, 3.6 * scale, la), outline=255, width=lw)

    R = S * 0.17
    elements = [
        lambda ox, oy: rosette(0, 0, R, 8, ox, oy),
        lambda ox, oy: rosette(S / 2, S / 2, R * 1.08, 10, ox, oy),
        lambda ox, oy: rosette(S / 2, 0, R * 0.5, 6, ox, oy),
        lambda ox, oy: rosette(0, S / 2, R * 0.5, 6, ox, oy),
        lambda ox, oy: sprig(R * 0.9, R * 0.6, S / 2 - R * 0.9, S / 2 - R * 0.6, S * 0.06, ox, oy),
        lambda ox, oy: sprig(S - R * 0.9, R * 0.6, S / 2 + R * 0.9, S / 2 - R * 0.6, -S * 0.06, ox, oy),
        lambda ox, oy: sprig(R * 0.9, S - R * 0.6, S / 2 - R * 0.9, S / 2 + R * 0.6, -S * 0.06, ox, oy),
        lambda ox, oy: sprig(S - R * 0.9, S - R * 0.6, S / 2 + R * 0.9, S / 2 + R * 0.6, S * 0.06, ox, oy),
    ]
    for el in elements:
        tiled(el)

    img = img.filter(ImageFilter.GaussianBlur(scale * 0.35)).resize((size, size), Image.LANCZOS)
    rgba = Image.new("RGBA", (size, size), color + (0,))
    rgba.putalpha(img)
    return rgba


def build_textures():
    (OUT / "texture").mkdir(parents=True, exist_ok=True)
    # dentelle dorée révélée par la lumière (sections noires)
    # alpha_quality réduit : la couche alpha pèse l'essentiel du fichier, sans perte visible
    draw_lace(512, color=GOLD).save(OUT / "texture" / "lace-gold.webp", "WEBP", quality=80, method=6, alpha_quality=60)
    # voile de la vidéo d'accueil : noir profond, ajouré là où passent les fils de la dentelle
    threads = draw_lace(512, scale=2, color=INK).getchannel("A")
    veil = Image.new("RGBA", threads.size, INK + (255,))
    veil.putalpha(ImageOps.invert(threads))
    veil.save(OUT / "texture" / "lace-veil.webp", "WEBP", quality=80, method=6, alpha_quality=55)

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

#!/usr/bin/env python3
"""Genera favicon.ico y PNGs desde favicon.png (32x32) y logogoogle.png."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
FAVICON_SRC = ROOT / "favicon.png"
LOGO_GOOGLE_SRC = ROOT / "logogoogle.png"


def resize_square(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


def to_square_rgba(im: Image.Image, bg=(10, 10, 10, 255)) -> Image.Image:
    w, h = im.size
    if w == h:
        return im.convert("RGBA")
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), bg)
    canvas.paste(im.convert("RGBA"), ((side - w) // 2, (side - h) // 2), im.convert("RGBA"))
    return canvas


def build_ico_and_pngs(source: Image.Image) -> None:
    """Genera .ico y PNGs reduciendo desde la imagen más grande (más nítido)."""
    source = to_square_rgba(source.convert("RGBA"))
    resize_square(source, 16).save(ROOT / "favicon-16x16.png", optimize=True)
    resize_square(source, 32).save(ROOT / "favicon-32x32.png", optimize=True)
    resize_square(source, 48).save(ROOT / "favicon-48x48.png", optimize=True)

    ico_sizes = [16, 32, 48]
    ico_images = [resize_square(source, s) for s in ico_sizes]
    ico_images[0].save(
        ROOT / "favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
        append_images=ico_images[1:],
    )
    print("OK favicon.ico + favicon-16/32/48.png")


def build_from_logogoogle() -> None:
    logo = to_square_rgba(Image.open(LOGO_GOOGLE_SRC))
    resize_square(logo, 180).save(ROOT / "apple-touch-icon.png", optimize=True)
    resize_square(logo, 192).save(ROOT / "android-chrome-192x192.png", optimize=True)
    resize_square(logo, 512).save(ROOT / "android-chrome-512x512.png", optimize=True)
    print("OK apple-touch-icon + android-chrome 192/512")


def main() -> None:
    if LOGO_GOOGLE_SRC.exists():
        logo = Image.open(LOGO_GOOGLE_SRC)
        build_ico_and_pngs(logo)
        build_from_logogoogle()
    elif FAVICON_SRC.exists():
        img = Image.open(FAVICON_SRC)
        print(f"Aviso: solo {FAVICON_SRC.name} ({img.size[0]}x{img.size[1]}). Mejor usar logogoogle.png.")
        build_ico_and_pngs(img)
    else:
        raise SystemExit(f"Colocá {LOGO_GOOGLE_SRC.name} o {FAVICON_SRC.name} en: {ROOT}")


if __name__ == "__main__":
    main()

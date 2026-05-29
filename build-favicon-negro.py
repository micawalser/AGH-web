#!/usr/bin/env python3
"""
Genera solo el favicon de pestaña desde logofaviconnegro.png:
  - favicon-32x32.png (principal para la pestaña)
  - favicon-48x48.png (Google / pantallas retina)
  - favicon.ico (solo capas 32 y 48 px, sin 16)

Uso: colocá logofaviconnegro.png en la raíz del proyecto y ejecutá:
  python build-favicon-negro.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "logofaviconnegro.png"


def to_square_rgba(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    if w == h:
        return im
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return canvas


def resize(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Falta {SOURCE.name} en:\n  {ROOT}")

    source = to_square_rgba(Image.open(SOURCE))
    print(f"Origen: {SOURCE.name} ({source.size[0]}x{source.size[1]} px)")

    resize(source, 32).save(ROOT / "favicon-32x32.png", optimize=True)
    resize(source, 48).save(ROOT / "favicon-48x48.png", optimize=True)

    # Sin capa 16px: en pestaña se ve borroso; el navegador usa 32 o 48.
    ico_sizes = [32, 48]
    frames = [resize(source, s) for s in ico_sizes]
    frames[0].save(
        ROOT / "favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
        append_images=frames[1:],
    )

    old16 = ROOT / "favicon-16x16.png"
    if old16.exists():
        old16.unlink()
        print("Eliminado: favicon-16x16.png (ya no se usa)")

    print("Generado:")
    for name in ("favicon-32x32.png", "favicon-48x48.png", "favicon.ico"):
        path = ROOT / name
        print(f"  {name} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

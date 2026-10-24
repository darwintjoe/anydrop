#!/usr/bin/env python3
"""Generate PWA icons for AnyDrop (same art as the extension: emerald + paper plane).
Outputs to public/pwa/:
  icon-192.png / icon-512.png       regular "any" icons (rounded square, transparent)
  icon-maskable-512.png             maskable (full-bleed emerald, art inside 80% safe zone)
  apple-touch-icon.png              180x180 full-bleed, opaque
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path('/home/z/my-project')
OUT = ROOT / 'public' / 'pwa'

EMERALD = (5, 150, 105, 255)      # #059669
WHITE = (255, 255, 255, 255)
WING = (236, 253, 245, 255)       # emerald-50


def draw_plane(img: Image.Image, scale: float = 0.866) -> None:
    """Draw the Lucide 'send' paper plane centered on img (24-grid geometry)."""
    S = img.size[0]
    d = ImageDraw.Draw(img)
    s = S / 24 * scale
    # center the 2..22 x-range of the 24 grid
    span = 20 * s
    off_x = (S - span) / 2 - 2 * s
    off_y = (S - span) / 2 - 2 * s

    def pt(x, y):
        return (off_x + x * s, off_y + y * s)

    plane = [pt(22, 2), pt(15, 22), pt(11, 13), pt(2, 9)]
    d.polygon([plane[0], plane[1], plane[2]], fill=WHITE)
    d.polygon([plane[0], plane[2], plane[3]], fill=WING)
    d.line([plane[0], plane[2]], fill=EMERALD, width=max(2, round(S * 0.012)), joint='curve')


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    # --- Regular icons: rounded emerald square + plane (transparent corners) ---
    S = 512
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=round(S * 5.5 / 24), fill=EMERALD)
    draw_plane(img)
    img.resize((512, 512), Image.LANCZOS).save(OUT / 'icon-512.png')
    img.resize((192, 192), Image.LANCZOS).save(OUT / 'icon-192.png')

    # --- Maskable: full-bleed emerald, plane inside the 80% safe zone ---
    mask = Image.new('RGBA', (S, S), EMERALD)
    draw_plane(mask, scale=0.62)
    mask.convert('RGB').resize((512, 512), Image.LANCZOS).save(OUT / 'icon-maskable-512.png')

    # --- Apple touch icon: opaque, full-bleed, 180x180 ---
    apple = Image.new('RGBA', (S, S), EMERALD)
    draw_plane(apple, scale=0.66)
    apple.convert('RGB').resize((180, 180), Image.LANCZOS).save(OUT / 'apple-touch-icon.png')

    for f in sorted(OUT.iterdir()):
        print(f.name, f.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()

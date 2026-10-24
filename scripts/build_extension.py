#!/usr/bin/env python3
"""Build the AnyDrop Chrome extension:
1. Generate toolbar/store icons (emerald rounded square + white paper plane).
2. Optionally inject a default server URL (env DEFAULT_SERVER_URL).
3. Zip the extension -> public/anydrop-extension.zip + download/anydrop-extension.zip
"""
import os
import shutil
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent  # repo root, works on any checkout
EXT = ROOT / 'extension'
ICONS = EXT / 'icons'
BUILD_TMP = ROOT / 'scripts' / 'tmp-build'

SIZES = [16, 32, 48, 128]


def make_icons():
    ICONS.mkdir(parents=True, exist_ok=True)
    # Draw at 512 then downscale for crisp edges
    S = 512
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    emerald = (5, 150, 105, 255)  # #059669
    white = (255, 255, 255, 255)

    # Rounded square background (rx = 5.5/24 of the size)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=round(S * 5.5 / 24), fill=emerald)

    # Lucide "send" geometry mapped from 24-grid: scale ~0.866, offset ~1.6
    scale = S / 24 * 0.866
    off = S / 24 * 1.6

    def pt(x, y):
        return (off + x * scale, off + y * scale)

    plane = [pt(22, 2), pt(15, 22), pt(11, 13), pt(2, 9)]
    # Soft fold shadow: slightly darker fill on the lower wing
    d.polygon([plane[0], plane[1], plane[2]], fill=white)
    d.polygon([plane[0], plane[2], plane[3]], fill=(236, 253, 245, 255))  # emerald-50 wing

    # Fold line
    d.line([plane[0], plane[2]], fill=emerald, width=round(S * 0.012), joint='curve')

    for size in SIZES:
        resized = img.resize((size, size), Image.LANCZOS)
        resized.save(ICONS / f'icon{size}.png')
    print('icons ->', ', '.join(f'icon{s}.png' for s in SIZES))


def inject_default_server():
    """If DEFAULT_SERVER_URL env var is set, prefill it in popup.js."""
    default_url = os.environ.get('DEFAULT_SERVER_URL', '').strip()
    popup = EXT / 'popup.js'
    src = popup.read_text()
    # Remove any previous injection
    marker_start = '// === injected default server (build-time) ==='
    if marker_start in src:
        src = src.split(marker_start)[0] + src.split(marker_start)[2] if src.count(marker_start) > 1 else src
        src = src.replace(marker_start, '')
    header = ''
    if default_url:
        safe = default_url.replace('\\', '').replace('"', '')
        header = (
            f'{marker_start}\n'
            f'const DEFAULT_SERVER_URL = "{safe}";\n'
            f'// === end injection ===\n'
        )
        # Prefill input at boot
        src = src.replace(
            "  if (stored.serverUrl) els.serverUrl.value = stored.serverUrl;",
            "  if (stored.serverUrl) els.serverUrl.value = stored.serverUrl;\n"
            "  else if (typeof DEFAULT_SERVER_URL === 'string' && DEFAULT_SERVER_URL) els.serverUrl.value = DEFAULT_SERVER_URL;",
        )
    popup.write_text(header + src)
    print('default server:', default_url or '(none — user must paste)')


def write_readme():
    (EXT / 'HOW-TO-INSTALL.txt').write_text(
        """AnyDrop — the Edge Drop successor for Chrome
=============================================

INSTALL (2 minutes)
 1. Unzip this folder anywhere you like (keep it — Chrome loads it from here).
 2. Open  chrome://extensions  in Chrome.
 3. Turn on "Developer mode" (toggle, top right).
 4. Click "Load unpacked" and select the unzipped folder (anydrop-extension).
 5. Click the AnyDrop icon in the toolbar.

PAIR WITH YOUR PHONE
 1. In the popup: make sure the Server URL matches your AnyDrop website
    (open the site, click "this site" in the pairing panel to copy it).
 2. Click "Create room" -> a QR appears.
 3. Scan the QR with your phone camera -> the AnyDrop web app opens, paired.
    No camera on this machine? Click "Scan to connect" on the device that HAS
    a camera and point it at the QR shown on the other screen — the server
    and room fill in automatically.
 4. Drop text, links, files and photos in either direction.

TIPS
 * Right-click any selected text on a page -> "Drop selection to AnyDrop".
 * The toolbar badge shows how many drops your phone sent since you looked.
 * Drops auto-delete after 24 hours. Anyone with the room code can read the room.
"""
    )


def build_zip():
    public_zip = ROOT / 'public' / 'anydrop-extension.zip'
    download_zip = ROOT / 'download' / 'anydrop-extension.zip'
    public_zip.parent.mkdir(parents=True, exist_ok=True)
    download_zip.parent.mkdir(parents=True, exist_ok=True)

    if BUILD_TMP.exists():
        shutil.rmtree(BUILD_TMP)
    BUILD_TMP.mkdir(parents=True)
    staging = BUILD_TMP / 'anydrop-extension'
    shutil.copytree(EXT, staging)

    for target in (public_zip, download_zip):
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as zf:
            for f in sorted(staging.rglob('*')):
                if f.is_file():
                    zf.write(f, f.relative_to(BUILD_TMP))
    shutil.rmtree(BUILD_TMP)
    print('zip ->', public_zip)
    print('zip ->', download_zip)


if __name__ == '__main__':
    make_icons()
    inject_default_server()
    write_readme()
    build_zip()
    print('done')

#!/usr/bin/env python3
"""Build testable copies of the extension UI:
- popup-test.html: popup.html + chrome.* stub + clipboard stub (paired room preloaded)
- scan-test.html:  scan.html  + chrome.* stub + FAKE CAMERA (canvas.captureStream
                   of a real QR PNG) so the jsQR decode loop runs without hardware.
Output: scripts/popup-test/
"""
from pathlib import Path
import shutil
import subprocess

ROOT = Path('/home/z/my-project')
EXT = ROOT / 'extension'
OUT = ROOT / 'scripts' / 'popup-test'

SERVER = 'http://127.0.0.1:81'
ROOM = 'KVC97K'


def qr_data_url(text: str) -> str:
    """Generate a QR PNG data URL using the project's `qrcode` npm package."""
    script = (
        "const q=require('qrcode');"
        f"q.toDataURL({text!r},{{width:320,margin:1}}).then(d=>console.log(d));"
    )
    out = subprocess.run(['node', '-e', script], capture_output=True, text=True, check=True, cwd=ROOT)
    return out.stdout.strip()


STUB = f"""<script>
// chrome.* stub so the extension UI runs in a plain browser against the live API
const STORE = {{ serverUrl: '{SERVER}', roomCode: '{ROOM}', lastSeenAt: new Date().toISOString() }};
window.__TEST = {{ STORE, tabsOpened: [] }};
window.chrome = {{
  storage: {{
    local: {{
      get: async (keys) => Object.fromEntries(keys.map((k) => [k, STORE[k]])),
      set: async (patch) => Object.assign(STORE, patch),
    }},
  }},
  action: {{ setBadgeText: async () => {{}} }},
  runtime: {{ getURL: (p) => p }},
  tabs: {{
    query: async () => [{{ url: '{SERVER}/', title: 'AnyDrop' }}],
    create: async (args) => {{ window.__TEST.tabsOpened.push(args && args.url); }},
  }},
  contextMenus: {{ create: () => {{}} }},
  alarms: {{ create: () => {{}} }},
}};
// clipboard stub: allow clipboard-image writes in the test browser
navigator.clipboard.write = async (items) => {{ window.__TEST.clipboardWrites = (window.__TEST.clipboardWrites || 0) + 1; }};
</script>
<script src="popup.js"></script>
"""


def build_popup_test():
    html = (EXT / 'popup.html').read_text()
    html = html.replace('<script src="popup.js"></script>', STUB)
    (OUT / 'popup-test.html').write_text(html)
    print('popup harness ->', OUT / 'popup-test.html')


SCAN_STUB = f"""<script>
// chrome.* stub + fake camera for the scan-to-connect tab
const STORE = {{}}; // start EMPTY: the scan must fill serverUrl AND roomCode
window.__TEST = {{ STORE, closed: false }};
window.chrome = {{
  storage: {{ local: {{ get: async (k)=>({{}}), set: async (patch) => Object.assign(STORE, patch) }} }},
  action: {{ setBadgeText: async () => {{}} }},
}};
window.close = () => {{ window.__TEST.closed = true; }};

// Fake camera: getUserMedia resolves only once the QR canvas stream exists.
let cameraResolve;
const cameraReady = new Promise((r) => (cameraResolve = r));
navigator.mediaDevices.getUserMedia = async () => cameraReady;

(async () => {{
  const dataUrl = {qr_data_url(f'{SERVER}/?room={ROOM}')!r};
  const img = new Image();
  await new Promise((res, rej) => {{ img.onload = res; img.onerror = rej; img.src = dataUrl; }});
  const c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 160, 80, 320, 320);
  cameraResolve(c.captureStream(15));
  window.__TEST.cameraReady = true;
}})();
</script>
<script src="scan.js"></script>
"""


def build_scan_test():
    html = (EXT / 'scan.html').read_text()
    # delay scan.js until the fake camera is ready: swap the script tag for our stub
    html = html.replace('<script src="scan.js"></script>', SCAN_STUB)
    (OUT / 'scan-test.html').write_text(html)
    print('scan harness ->', OUT / 'scan-test.html')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for f in EXT.glob('*'):
        if f.is_file():
            shutil.copy(f, OUT / f.name)
    if (EXT / 'icons').exists():
        shutil.copytree(EXT / 'icons', OUT / 'icons', dirs_exist_ok=True)
    build_popup_test()
    build_scan_test()


if __name__ == '__main__':
    main()

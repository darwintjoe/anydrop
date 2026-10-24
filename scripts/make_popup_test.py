#!/usr/bin/env python3
"""Build a testable copy of the extension popup:
popup.html + a chrome.* stub (storage/action/tabs) preloaded with a real room,
so the popup runs in a plain browser against the live API via the gateway.
Output: scripts/popup-test/popup-test.html (references ../extension assets).
"""
from pathlib import Path
import shutil

ROOT = Path('/home/z/my-project')
EXT = ROOT / 'extension'
OUT = ROOT / 'scripts' / 'popup-test'

SERVER = 'http://127.0.0.1:81'
ROOM = 'KVC97K'

STUB = f"""<script>
// chrome.* stub so popup.js runs in a plain browser against the live API
const STORE = {{ serverUrl: '{SERVER}', roomCode: '{ROOM}', lastSeenAt: new Date().toISOString() }};
window.chrome = {{
  storage: {{
    local: {{
      get: async (keys) => Object.fromEntries(keys.map((k) => [k, STORE[k]])),
      set: async (patch) => Object.assign(STORE, patch),
    }},
  }},
  action: {{ setBadgeText: async () => {{}} }},
  tabs: {{
    query: async () => [{{ url: '{SERVER}/', title: 'AnyDrop' }}],
    create: async (args) => {{ window.open('{SERVER}/', '_blank'); }},
  }},
  contextMenus: {{ create: () => {{}} }},
  alarms: {{ create: () => {{}} }},
}};
window.__TEST = {{ STORE }};
</script>
<script src="popup.js"></script>
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # copy assets so relative paths work
    for f in EXT.glob('*'):
        if f.is_file():
            shutil.copy(f, OUT / f.name)
    for d in ('icons',):
        if (EXT / d).exists():
            shutil.copytree(EXT / d, OUT / d, dirs_exist_ok=True)

    html = (EXT / 'popup.html').read_text()
    html = html.replace('<script src="popup.js"></script>', STUB)
    (OUT / 'popup-test.html').write_text(html)
    print('harness ->', OUT / 'popup-test.html')


if __name__ == '__main__':
    main()

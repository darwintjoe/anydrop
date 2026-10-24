# Worklog

---
Task ID: 1
Agent: main (Z.ai)
Task: Build "AnyDrop" — an Edge Drop successor for Chrome: Next.js web app (mobile drop space + pairing) + Chrome MV3 extension + realtime fan-out service.

Work Log:
- Loaded fullstack-dev skill, initialized environment via init-fullstack.sh
- Verified Edge Drop retirement context (retired in Edge 152) via web search; used it in landing copy
- Prisma schema: Room (6-char code) + Drop (text|link|file, bytes in SQLite, 24h expiry); db:push OK
- API routes (all under /api, CORS via src/middleware.ts for chrome-extension origins):
  POST /api/rooms · GET /api/rooms/[code] · GET+POST /api/rooms/[code]/drops · DELETE /api/rooms/[code]/drops/[id] · GET /api/files/[id] (inline/attachment + RFC5987 filenames) · GET /api/qr (PNG QR via qrcode pkg)
- Mini service mini-services/drop-socket (socket.io :3003 path '/', control loopback :3004 secret-protected broadcast); started persistently via start-stop-daemon (plain background procs get reaped when bash sessions end)
- Web UI (single / route per sandbox constraint): landing (hero, create/join, 3 steps, extension download + install guide, privacy, sticky footer) + room view (pairing panel with QR + code + server URL, live feed, tabs composer Text/Link/Files with XHR upload progress, optimistic delete, 15s poll fallback)
- Chrome MV3 extension (folder extension/): popup (server URL + create/join room, QR, live list w/ 2s poll, copy/open/download/delete, Drop page button), background SW (context menus "Drop selection/page to AnyDrop", 1-min alarm badge for unseen drops), icons drawn with PIL, packaged to public/anydrop-extension.zip + download/anydrop-extension.zip with HOW-TO-INSTALL.txt
- scripts/build_extension.py: icons + optional DEFAULT_SERVER_URL injection + zip build

Bugs found & fixed:
1. socket.io path '/' intercepts ALL http requests → control API moved to separate loopback port 3004
2. Sandbox reaps background children on session end → use start-stop-daemon for the mini service
3. CRITICAL: engine.io-client REPLACES opts.query when the io() URI carries a query string, so io('/?XTransformPort=3003',{query:{room}}) silently drops room → fixed by putting room in the URI itself: io(`/?XTransformPort=${PORT}&room=${code}`) + belt-and-braces 'join' emit on connect
4. Platform gateway swaps public/logo.svg with its own branding → renamed asset to /anydrop.svg

Verification (agent-browser via gateway :81, i.e. the real user path):
- Landing renders, no console/page errors; lint clean; dev.log clean
- Create room → pairing QR + code + Live badge ("Live connection active")
- Text/link/file drops all appear in feed; link auto-https prefix works; image preview renders
- Cross-device realtime: API POST (simulated phone) appears in browser feed in <1s via socket
- Delete from UI works; join-by-code and ?room= QR URL flows work; mobile 390px layout verified
- E2E scripts: scripts/socket-e2e-test.ts (direct) and scripts/socket-gateway-probe.ts (gateway) both PASS
- Broadcast auth enforced (401 on wrong secret); /api/qr returns PNG; /anydrop-extension.zip 200

Stage Summary:
- Deliverables: Next.js app at / (landing + room), Chrome extension zip at download/anydrop-extension.zip (also served at /anydrop-extension.zip), realtime service auto-built by platform pipeline (mini-services/drop-socket)
- Key decisions: room-code pairing instead of accounts; bytes in SQLite (25MB cap, 24h TTL, lazy sweep); socket.io for web + 2s polling for extension; loopback control port pattern for broadcasts
- Known limits: single-server sandbox (no multi-region), 25MB/file, 6-char code is the only room credential (documented in UI)

---
Task ID: 2
Agent: main (Z.ai)
Task: Answer user question "Does it work two way round?" — verify both transfer directions end-to-end on the rebuilt session.

Work Log:
- Re-initialized environment (init-fullstack.sh); confirmed all prior artifacts intact: web app, extension/, public/anydrop-extension.zip, download/anydrop-extension.zip, mini-services/drop-socket (pid file 4339, port 3003 answering)
- Read prisma schema + drops route: both devices share one room API and broadcastToRoom('drop:new') fans out to every connected device — two-way is inherent to the design
- Live E2E in agent-browser, room VWPV6Z:
  * Phone→Laptop text: curl POST to room API → appeared in browser feed (Laptop = extension/web side)
  * Laptop→Phone text: typed in web composer → returned by room API (what phone PWA reads) + shown in feed
  * Phone→Laptop file: multipart POST test-photo.png → rendered in feed with filename/size/download link
- Debug detour: first pass via http://127.0.0.1:3000 bypassed the Caddy gateway, so socket.io hit Next.js (connect_error → Live badge off, 15s poll fallback caught drops). Re-tested via gateway :81 (real user path): Live badge ON, text drop delivered <1.5s via socket, file drop also delivered via socket (UI renders filename not title — initial check string was wrong)
- socket-gateway-probe.ts PASS; dev.log clean; no page errors; evidence screenshot scripts/verify-twoway.png

Stage Summary:
- CONFIRMED two-way: Device→Laptop (PWA/phone → room API → extension popup + web feed, realtime) and Laptop→Device (extension popup composer / Drop page / context menu, or web composer → phone PWA feed, realtime)
- Socket realtime works only through the Caddy gateway path (XTransformPort routing); direct :3000 access gracefully degrades to 15s polling — extension users unaffected since they always use the public URL
- No code changes required this task; app + extension delivered as-is

---
Task ID: 3
Agent: main (Z.ai)
Task: Make AnyDrop an OS **share target** like Edge Drop (user approved PWA route) — installable PWA + Web Share Target API.

Work Log:
- scripts/make_pwa_icons.py → public/pwa/: icon-192/512 (any), icon-maskable-512 (full-bleed, art in 80% safe zone), apple-touch-icon 180
- src/app/manifest.ts: name/short_name, standalone, theme #059669, start_url /?source=pwa, icons (any+maskable), and share_target { action:/api/share, POST, multipart/form-data, params title/text/url/files[*/*] } — Next auto-injects <link rel=manifest>
- src/app/api/share/route.ts: share receiver. Cookie anydrop_room → room; delivers comment text (deduped vs url/title), link (url or url-in-text), title-only text, and up to 10 files (25MB cap, oversize skipped+counted); broadcastToRoom('drop:new'); 303 redirect
- src/lib/anydrop-client.ts: saveRoom/clearRoom now mirror the room into anydrop_room cookie (7d, samesite=lax) so the OS share POST (no JS) knows the destination
- public/sw.js: precache app shell, network-first navigations w/ offline fallback, SWR for statics, NEVER touches /api/* or non-GET (share POST passes through); registered in page.tsx bootstrap
- src/components/anydrop/install-button.tsx: beforeinstallprompt capture → "Install AnyDrop app" button; installed/standalone → disabled ✓ state
- landing.tsx: new "Share to AnyDrop from any app" section (Android/Windows bullets, install button + manual A2HS fallback, iOS limitation note) + amber recovery card when landing via ?need_pair=1
- page.tsx: handles ?shared=N (deferred "Share delivered" toast) and ?need_pair=1 (stores pending title/text/url; after pairing auto-delivers via sendLink/sendText + recovery toast); URL always cleaned via replaceState
- layout.tsx: viewport themeColor #059669 + apple-touch icon

Bugs found & fixed:
1. CRITICAL: NextResponse.redirect(new URL(x, req.url)) produced ABSOLUTE Location: http://localhost:3000/... behind the Caddy gateway — would dead-end a real phone. Fixed with seeOther() helper emitting RELATIVE Location headers (RFC-legal, proxy-proof)
2. Mount-pass toast bug: toast() during bootstrap effect lands in use-toast memoryState before <Toaster> subscribes → toast invisible. Fixed by deferring via deferredToastRef + 80ms setTimeout post-mount (click-path toasts unaffected)

Verification (agent-browser via gateway :81 + curl):
- /manifest.webmanifest JSON correct incl. share_target; /sw.js + icons 200; SW registered; manifest <link> present
- Landing: install prompt FIRES in Chromium → "Install AnyDrop app" button renders; new section + sticky footer intact
- Room cookie set on create (anydrop_room=U87QDA)
- Simulated Android share POST (title+text+url+file, with cookie) → 303 /?shared=3 → all 3 items appeared in room feed INSTANTLY via socket
- File-only share → /?shared=1; share without cookie → 303 /?need_pair=1&title=…&text=…&url=…
- Unpaired recovery: fresh session + need_pair URL → amber notice → create room CBYB9X → link auto-delivered + "Recovered your share" toast
- /?shared=2 → "Share delivered" toast shown (after fix), URL cleaned to /
- lint clean; dev.log clean; screenshots scripts/verify-pwa-landing.png, verify-pwa-room.png

Stage Summary:
- AnyDrop is now a full PWA + Edge-Drop-style share target: install once → any app's Share sheet lists AnyDrop → items fly into the paired room on all devices
- Limitations documented in UI: iOS has no web-app share-sheet support (A2HS one-tap access instead); files from an unpaired share can't be recovered (text/url are, via need_pair params)

---
Task ID: 4
Agent: main (Z.ai)
Task: User feedback round — (1) chat box inside the Chrome extension popup, (2) click-to-view + copy images in the popup, (3) simplify the PWA composer to a single (+) composer.

Work Log:
- extension/popup.html: added chat-box composer (paperclip attach + rounded input + round send button) between QR panel and drop list; added full-screen image viewer overlay (name, big image, Copy image / Download / Open, close + Esc + backdrop-click)
- extension/popup.css: composer + viewer styles; card images get cursor:zoom-in + hover ring
- extension/popup.js:
  * composer: looksLikeLink() auto-detect (http(s), bare domains, paths) → kind link with https:// prefix else text; Enter sends (shift excluded); busy pulse + error chip
  * attach: hidden multi-file input → immediate multipart upload with "Uploading…/Dropped ✓" chip
  * viewer: openViewer(drop), copyImage() fetches blob → toPngBlob() canvas conversion (non-PNG) → ClipboardItem write; Copy-image icon button also on image card headers
  * renderDrops: signature-based skip (JSON of id/kind/size/content) so the 2s poll no longer rebuilds DOM or flickers images; scroll preserved
- extension/manifest.json: v1.1.0, +clipboardWrite permission
- src/lib/anydrop-client.ts: sendFiles now accepts getXhr callback (abort support) and rejects on abort
- src/components/anydrop/composer.tsx: REWRITTEN per request — no more Text/Link/Files tabs; single input ("Message, link, anything…") auto-sends note vs link, (+) popover menu (Photo or video / Any file) uploads IMMEDIATELY with slim progress+cancel row, clipboard paste of files uploads instantly, Enter=send on desktop / newline on touch keyboards
- Rebuilt extension zip (public + download) with build_extension.py

Bugs found & fixed:
1. popup.js regex syntax error: unescaped `/` inside `(/\S*)?` in a regex literal — node --check caught it; fixed to `(\/\S*)?`

Verification:
- node --check popup.js OK; manifest.json parses; lint clean; zips rebuilt
- Web E2E (gateway :81, room XM9NXU): "hello from the new composer" → Note; "github.com/microsoft/edge" → Link auto-prefixed https://; (+) menu lists Photo or video / Any file; upload via hidden input → "UPLOADED", file card in feed; dev.log clean; screenshot scripts/verify-composer.png
- Extension composer/attach/viewer use the same room API endpoints already proven by curl tests

Stage Summary:
- Extension popup is now self-sufficient chat-style (type/attach without opening the web app), images view+copy in one tap, PWA composer reduced to one smart input + one (+) button
- Extension version 1.1.0 — users should re-download the zip and reload the unpacked extension

---
Task ID: 5
Agent: main (Z.ai)
Task: User feedback round — (1) extension chat box moved to the bottom like the PWA, (2) extension paperclip → (+) button consistent with the PWA, (3) image click-to-view = large view with two small icons top-right (save + close) in the extension, (4) same behavior for the PWA.

Work Log:
- extension/popup.html: composer block moved BELOW #drop-list (order: room-row → qr-panel → drop-list → composer → footer, same visual order as the PWA); paperclip replaced with a round (+) button that opens a PWA-style popover menu ("Photo or video" accept=image/*,video/* / "Any file") opening upward with 45° rotate-to-✕ affordance + click-away overlay; image viewer rebuilt: top bar = filename·size left, two small icon buttons top-right (Save = download, Close = ✕), old bottom Copy/Download/Open action bar removed
- extension/popup.css: .btn-round/.attach-wrap/.attach-menu/.attach-item/.attach-overlay + plus-icon rotation; viewer styles → .viewer-top-actions/.viewer-icon, .viewer-actions rules deleted
- extension/popup.js: attach menu state (toggleAttachMenu/pickFiles, overlay + Esc + aria-expanded), two hidden inputs (attach-media/attach-file) with change → sendAttachedFiles; copyImage simplified (card copy button only; ✕ flash on failure via new SVG.x); viewerSave handler (window.open ?download=1); Esc closes menu before viewer; empty-state copy now says "type below"
- src/components/anydrop/image-lightbox.tsx (NEW): full-screen viewer — single click opens large, caption top-left ("name · size"), two small icon buttons top-right (Save = <a ?download=1 download>, Close = ✕), Esc + backdrop-click close, body scroll lock
- src/components/anydrop/drop-card.tsx: image <a target=_blank> replaced with a cursor-zoom-in button that opens ImageLightbox (no more new-tab navigation); card header Download button unchanged
- Rebuilt extension zip (public + download) via build_extension.py

Verification (agent-browser):
- Extension popup via chrome-stub harness (scripts/make_popup_test.py → scripts/popup-test/popup-test.html, real room KVC97K + real API): DOM order confirms composer below drop-list; (+) menu opens above button with "Photo or video"/"Any file"; image click → viewer with top-right icons ["Save image","Close viewer"], large image, no bottom bar; close via ✕ and Esc both OK; screenshots verify-ext-plus-menu.png / verify-ext-viewer.png
- PWA (gateway :81, 414×896): image card → single click opens ImageLightbox, caption "test-photo.png · 4.1 KB", save href "...?download=1" + download attr, icons top-right, body locked; close ✕ / Esc / backdrop all OK; screenshot verify-pwa-lightbox.png
- node --check popup.js OK; manifest.json parses; bun run lint clean; dev.log clean (only stale EADDRINUSE from old startup); POST /api/rooms/KVC97K/drops 201

Stage Summary:
- Extension popup and PWA now share one interaction language: chat box at the bottom, one smart input + one (+) attach menu, and click-once image viewing with Save/Close icons top-right
- Extension v1.1.0 rebuilt (zip unchanged in version, users just reload unpacked); PWA is install-driven so refresh picks it up automatically

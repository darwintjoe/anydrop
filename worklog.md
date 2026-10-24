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

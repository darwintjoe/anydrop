# AnyDrop

[![CI](https://github.com/darwintjoe/anydrop/actions/workflows/ci.yml/badge.svg)](https://github.com/darwintjoe/anydrop/actions/workflows/ci.yml)
![Extension](https://img.shields.io/badge/Chrome%20extension-MV3%20v1.2.0-059669)
![PWA](https://img.shields.io/badge/PWA-installable%20share%20target-059669)

**AnyDrop is an open replacement for Edge Drop** — Microsoft retired the Drop feature from Edge in version 152, so this project brings it back as something you can self-host: a fast, private way to move **text, links, files and images** between your phone and your computer, with no accounts and no cloud middleman you don't control.

Pair any two devices with a **6-character room code** (or by scanning a QR code) and everything you drop lands on the other device **instantly** over a realtime socket connection — with a 15-second polling fallback when WebSockets aren't available.

## Features

- **Two-way transfer** — phone ⇄ laptop, web app ⇄ Chrome extension, anything ⇄ anything
- **Realtime delivery** — items broadcast over socket.io the moment they're sent
- **Room pairing** — 6-character code, QR code, or true **scan-to-connect** using the camera (both in the web app and in the extension)
- **Smart composer** — one input that auto-detects links (adds `https://`), a **(+)** button for photos/videos or any file, clipboard-paste uploads, live upload progress with cancel
- **PWA share target** — install the web app once, then share text/links/files to AnyDrop directly from any app's Share sheet (Android/Windows)
- **Image viewer** — click an image to view it full-size, with **Save · Copy · Close** actions and toast feedback on both platforms
- **Chrome extension niceties** — chat-style popup composer, right-click *"Drop selection/page to AnyDrop"* context menus, unread-drop badge
- **Zero accounts** — the room code is the only credential; drops auto-expire after **24 hours**; files capped at **25 MB**

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────┐
│  Chrome extension   │        │   Next.js web app (PWA)      │
│  (MV3 popup + SW)   │        │   landing · room · composer  │
└─────────┬───────────┘        │   share-target receiver      │
          │  REST + 2s poll    └──────────────┬───────────────┘
          │                                   │ REST + socket.io client
          ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API routes (/api)                   │
│   rooms · drops · files (inline/attachment) · QR · share        │
├─────────────────────────────────────────────────────────────────┤
│              SQLite via Prisma (Room + Drop models)             │
└─────────────────────────────────────────────────────────────────┘
          ▲
          │ broadcastToRoom("drop:new")
┌─────────┴───────────┐
│  socket.io service  │   mini-services/drop-socket (port 3003)
└─────────────────────┘
```

| Piece | Where | What it does |
|---|---|---|
| Web app (PWA) | `src/` | Landing + room view, composer, image lightbox, QR scanner, Web Share Target receiver (`/api/share`), service worker |
| API routes | `src/app/api/` | Room create/join, drop CRUD, file upload/download, QR PNG generation, OS share receiver |
| Socket service | `mini-services/drop-socket/` | socket.io server that fans out `drop:new` events to every device in a room |
| Chrome extension | `extension/` | MV3 popup (pairing, QR, scan-to-connect, live feed, chat composer, image viewer), background service worker (context menus + badge) |
| Build scripts | `scripts/` | Extension packaging (`build_extension.py`), PWA icon generation, browser-harness tests |

## Run it yourself

**Prerequisites:** [Bun](https://bun.sh) (or Node 20+), Python 3 + Pillow only if you want to rebuild the extension zip.

```bash
# 1. Web app
bun install
echo 'DATABASE_URL="file:./db/custom.db"' > .env
bun run db:push        # create SQLite schema
bun run dev            # http://localhost:3000

# 2. Realtime service (separate terminal)
cd mini-services/drop-socket
bun install
bun run index.ts       # socket.io on :3003
```

Put both behind one reverse proxy (e.g. Caddy/nginx) so the app and the socket share an origin — the frontend connects to the socket through the same public URL.

### Install the Chrome extension

1. Grab `anydrop-extension.zip` from the [latest release](https://github.com/darwintjoe/anydrop/releases) (or build it: `python3 scripts/build_extension.py`), then unzip it.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select the unzipped folder.
3. Click the AnyDrop icon, set your server URL, then **Create room** / **Join** / **Scan to connect**.
4. Optional: right-click any selection or page → **Drop selection to AnyDrop**.

### Prefill your server URL in the extension

```bash
DEFAULT_SERVER_URL=https://your-anydrop-host.example python3 scripts/build_extension.py
```

This repacks the zip with the server URL already filled in — installers only need to pair a room.

## API at a glance

| Endpoint | Purpose |
|---|---|
| `POST /api/rooms` | Create a room, returns the 6-char code |
| `GET /api/rooms/{code}` | Room + drops (polling fallback) |
| `POST /api/rooms/{code}/drops` | Drop text / link / multipart file |
| `DELETE /api/rooms/{code}/drops/{id}` | Delete a drop |
| `GET /api/files/{id}` | Stream a file (`?download=1` forces attachment) |
| `GET /api/qr?code=…` | PNG QR code pointing at the join URL |
| `POST /api/share` | Web Share Target receiver (multipart from the OS share sheet) |

## Privacy & limits

- **The room code is the only credential.** Anyone who knows it can read the room — treat it like a password and share it over a channel you trust.
- Files are capped at **25 MB** and every drop expires after **24 hours** (lazy sweep on access).
- No accounts, no analytics, no third-party services. Everything lives in your SQLite file.
- iOS supports the web app (Add to Home Screen) but not the OS share sheet — that's a platform limitation.

## Releasing

CI (`.github/workflows/ci.yml`) lints and builds the web app, syntax-checks and packages the extension, and — on a `v*` tag — attaches the freshly built `anydrop-extension.zip` to a GitHub release automatically. To cut a release:

```bash
git tag -a v1.2.1 -m "AnyDrop v1.2.1"
git push origin v1.2.1
```

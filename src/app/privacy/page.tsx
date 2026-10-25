import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — AnyDrop",
  description:
    "No accounts, no analytics, no tracking. Drops auto-delete after 24 hours and camera scanning never leaves your device.",
  icons: { icon: "/anydrop.svg" },
};

const css = `
.pp{
  --emerald:#059669; --emerald-dark:#047857; --emerald-ink:#064e3b;
  --emerald-soft:#ecfdf5; --emerald-softer:#f0fdf4;
  --ink:#0f172a; --body:#334155; --muted:#64748b; --faint:#94a3b8;
  --line:#e2e8f0; --card:#ffffff; --bg:#f8fafc;
  min-height:100vh; display:flex; flex-direction:column;
  background:var(--bg); color:var(--body);
  font:16px/1.7 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
}
.pp a{text-decoration:none}
.pp-wrap{max-width:760px; margin:0 auto; padding:34px 20px 20px; width:100%}
.pp-topbar{position:sticky; top:0; z-index:10; background:rgba(255,255,255,.92); backdrop-filter:blur(8px); border-bottom:1px solid var(--line)}
.pp-topbar-inner{max-width:760px; margin:0 auto; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px}
.pp-brand{display:flex; align-items:center; gap:10px; color:var(--ink); font-weight:700}
.pp-brand .pp-mark{width:30px; height:30px; border-radius:9px; background:var(--emerald); display:grid; place-items:center; flex:none}
.pp-brand .pp-mark svg{width:17px; height:17px; stroke:#fff}
.pp-brand small{display:block; font-weight:500; font-size:12px; color:var(--muted); line-height:1.1}
.pp-back{flex:none; font-size:14px; font-weight:600; color:var(--emerald-dark); background:var(--emerald-soft); border:1px solid #a7f3d0; padding:8px 14px; border-radius:999px}
.pp-back:hover{background:#d1fae5}
.pp h1{font-size:clamp(26px,5vw,34px); line-height:1.2; color:var(--ink); margin:0 0 6px; letter-spacing:-.02em}
.pp-meta{color:var(--muted); font-size:14px; margin:0 0 26px}
.pp-meta a,.pp-content a{color:var(--emerald-dark); font-weight:600}
.pp-meta a:hover,.pp-content a:hover{text-decoration:underline}
.pp h2{font-size:19px; color:var(--ink); margin:34px 0 10px; letter-spacing:-.01em; display:flex; align-items:center; gap:9px}
.pp h2 .pp-dot{width:8px; height:8px; border-radius:3px; background:var(--emerald); flex:none}
.pp p{margin:10px 0}
.pp ul,.pp ol{margin:10px 0; padding-left:22px}
.pp li{margin:7px 0}
.pp strong{color:var(--ink)}
.pp code{background:#f1f5f9; border:1px solid var(--line); border-radius:6px; padding:1px 6px; font-size:.88em; color:var(--emerald-ink)}
.pp-card{background:var(--card); border:1px solid var(--line); border-radius:16px; padding:22px 24px; margin:14px 0}
.pp-tldr{background:var(--emerald-softer); border-color:#a7f3d0}
.pp-tldr h2{margin-top:0}
.pp-tldr ul{margin-bottom:0}
.pp-footer{border-top:1px solid var(--line); background:#fff; margin-top:40px}
.pp-foot-inner{max-width:760px; margin:0 auto; padding:20px; display:flex; flex-wrap:wrap; gap:6px 18px; align-items:center; justify-content:space-between; color:var(--faint); font-size:13px}
.pp-foot-inner a{color:var(--muted); font-weight:600}
.pp-foot-inner a:hover{color:var(--emerald-dark)}
.pp-foot-brand{display:flex; align-items:center; gap:8px; color:var(--muted); font-weight:600}
.pp-foot-brand img{width:18px; height:18px}
@media (max-width:480px){ .pp-topbar-inner{flex-wrap:wrap} }
`;

function Mark() {
  return (
    <span className="pp-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 15 22 11 13 2 9Z" />
        <path d="M22 2 11 13" />
      </svg>
    </span>
  );
}

export default function PrivacyPage() {
  return (
    <div className="pp">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="pp-topbar">
        <div className="pp-topbar-inner">
          <a className="pp-brand" href="/">
            <Mark />
            <span>
              AnyDrop
              <small>Privacy Policy</small>
            </span>
          </a>
          <a className="pp-back" href="/">
            Back to AnyDrop
          </a>
        </div>
      </header>

      <main className="pp-wrap pp-content">
        <h1>Privacy Policy</h1>
        <p className="pp-meta">
          Last updated: <strong>October 25, 2026</strong> · Applies to the AnyDrop web app at{" "}
          <a href="/">anydrop.space-z.ai</a>, the AnyDrop Chrome extension, and the realtime service that powers
          them.
        </p>

        <div className="pp-card pp-tldr">
          <h2>
            <span className="pp-dot" />
            The short version
          </h2>
          <ul>
            <li>
              <strong>No accounts.</strong> No name, no email, no password — a 6-character room code is the only
              credential.
            </li>
            <li>
              <strong>No analytics, no trackers, no ads.</strong> Nothing is profiled, sold, or shared with third
              parties.
            </li>
            <li>
              <strong>Drops auto-delete after 24 hours</strong> — and you can delete any drop yourself in one
              click.
            </li>
            <li>
              <strong>Camera scanning stays on your device.</strong> QR frames are decoded locally and never
              uploaded.
            </li>
            <li>
              <strong>
                Full control is one <code>git clone</code> away
              </strong>{" "}
              — AnyDrop is open source and self-hostable.
            </li>
          </ul>
        </div>

        <h2>
          <span className="pp-dot" />
          1. What AnyDrop is
        </h2>
        <p>
          AnyDrop is a tool for moving text, links, files, and photos between <strong>your own devices</strong> —
          typically a phone and a Chrome desktop browser — the way Edge Drop does, but open and cross-platform.
          Devices meet in a &ldquo;room&rdquo; identified by a 6-character code (typed manually, or shared via QR
          code), and anything dropped into the room appears on the other paired devices in real time. This policy
          explains exactly what data touches the server, how long it stays there, and what never leaves your
          devices.
        </p>

        <h2>
          <span className="pp-dot" />
          2. What is stored on the server, and for how long
        </h2>
        <p>
          To move something from device A to device B, the content has to exist somewhere both can reach. That
          somewhere is the AnyDrop server, and it keeps three kinds of data:
        </p>
        <ul>
          <li>
            <strong>Drops</strong> — the text, links, and uploaded files or images you send (files up to
            25&nbsp;MB). These are stored in a plain database on the server purely so your other device can fetch
            them. The 24-hour clock runs <strong>per drop, from the moment that individual drop was sent</strong>{" "}
            — not from when the room was created, and not at a fixed midnight. When a drop&apos;s 24 hours are up,
            the server physically deletes its row from the database the next time the room is touched; because
            paired devices poll every few seconds, that deletion lands within seconds of the deadline. Deleting a
            drop in the UI removes it immediately for everyone in the room.
          </li>
          <li>
            <strong>Room codes</strong> — the 6-character identifiers of created rooms. A room code exists only
            so your devices can find each other; it is not connected to any name, email, device fingerprint, or
            account. A room with no activity for <strong>7 days</strong> is deleted entirely, along with anything
            still inside it.
          </li>
          <li>
            <strong>Nothing else.</strong> There are no user profiles, no logs tied to identity, no email
            addresses, and no analytics events on the server.
          </li>
        </ul>
        <p>
          QR codes you see in the interface are generated on the fly from the server address and/or room code by
          a rendering endpoint. The endpoint draws an image from the text you ask it to encode and keeps no
          record of it.
        </p>

        <h2>
          <span className="pp-dot" />
          3. What we never collect
        </h2>
        <p>
          AnyDrop has no sign-up, so there is nothing to sign up <em>with</em>: we never ask for or store names,
          email addresses, phone numbers, or payment details. The site embeds no analytics scripts, no
          advertising networks, no social-media widgets, and no third-party fonts or trackers of any kind. We do
          not build profiles, we do not fingerprint devices, and there is no data to sell because none of this is
          collected in the first place.
        </p>

        <h2>
          <span className="pp-dot" />
          4. Data kept on your own devices
        </h2>
        <p>
          A small amount of pairing state lives locally, so you don&apos;t have to re-type the room code every
          time:
        </p>
        <ul>
          <li>
            <strong>Web app (browser):</strong> your room code is kept in the browser&apos;s local storage and in
            a first-party cookie, both scoped to the AnyDrop site only. They hold nothing but the code and your
            server address. Clearing the site&apos;s data — or using the <em>Leave room</em> button — erases
            them completely.
          </li>
          <li>
            <strong>Chrome extension:</strong> the server URL, room code, and a counter of unseen drops are
            stored in the extension&apos;s own local storage. Removing the extension removes all of it.
          </li>
          <li>
            <strong>Clipboard:</strong> the &ldquo;copy image&rdquo; action writes a dropped image to your
            clipboard using standard browser APIs. That is a local operation between the page and your clipboard;
            the image is not sent anywhere new.
          </li>
        </ul>

        <h2>
          <span className="pp-dot" />
          5. Camera use (Scan to connect)
        </h2>
        <p>
          The &ldquo;Scan to connect&rdquo; feature asks for camera permission only when you open the scanner,
          and only to read a QR code. Decoding happens <strong>entirely on your device</strong> — the video
          frames are processed in the browser or extension itself and are never recorded, uploaded, or stored
          anywhere. When you close the scanner the camera is released immediately. AnyDrop never sees what your
          camera sees.
        </p>

        <h2>
          <span className="pp-dot" />
          6. The Chrome extension
        </h2>
        <p>
          The extension talks to the same server as the web app and to your browser only. Its right-click
          &ldquo;Drop selection to AnyDrop&rdquo; action sends the text you explicitly selected to your paired
          room — exactly as if you had pasted it into the popup yourself. It does not read pages in the
          background, does not watch your browsing, and requests only the minimal permissions it needs (storage,
          context menus, and opening its own scanner tab).
        </p>

        <h2>
          <span className="pp-dot" />
          7. Who can see a room — honest security notes
        </h2>
        <p>
          A room is protected by its code alone:{" "}
          <strong>
            anyone who has the 6-character code can open the room and read what is in it
          </strong>{" "}
          from any device. There is no second factor. So treat a room code like the key to a shared mailbox
          between your own devices:
        </p>
        <ul>
          <li>Share codes and QRs only over channels you trust, and create a fresh room when in doubt.</li>
          <li>
            Don&apos;t drop passwords, recovery codes, or anything you wouldn&apos;t hand to a stranger holding
            the code.
          </li>
          <li>
            Prefer the HTTPS address (<code>https://anydrop.space-z.ai</code>) so pairing traffic is encrypted.
          </li>
          <li>
            Deleted drops are gone from the server, but a device may still show content it already received —
            deleting also helps there, since the room view refreshes.
          </li>
        </ul>

        <h2>
          <span className="pp-dot" />
          8. Self-hosting: the strongest privacy option
        </h2>
        <p>
          The entire project — web app, Chrome extension, and realtime service — is{" "}
          <a
            href="https://github.com/darwintjoe/anydrop"
            style={{ color: "var(--emerald-dark)", fontWeight: 600 }}
          >
            open source on GitHub
          </a>
          . You can run your own copy on your own machine or server, at which point{" "}
          <strong>every drop, room code, and byte flows only through infrastructure you control</strong> and this
          policy simply describes software you can audit line by line. The published instance at{" "}
          <a href="/" style={{ color: "var(--emerald-dark)", fontWeight: 600 }}>
            anydrop.space-z.ai
          </a>{" "}
          runs exactly that same public code.
        </p>

        <h2>
          <span className="pp-dot" />
          9. Your controls
        </h2>
        <ul>
          <li>
            <strong>Delete a drop instantly</strong> — the trash icon removes it for the whole room, not just for
            you.
          </li>
          <li>
            <strong>Let it expire</strong> — do nothing and every drop is erased automatically after 24 hours.
          </li>
          <li>
            <strong>Leave a room</strong> — the Leave room button clears your pairing state in the web app.
          </li>
          <li>
            <strong>Wipe local state</strong> — clear the site&apos;s data in your browser, or uninstall the
            extension, and nothing pairing-related remains on that device.
          </li>
        </ul>

        <h2>
          <span className="pp-dot" />
          10. Children&apos;s privacy
        </h2>
        <p>
          AnyDrop is a general-purpose utility and is not directed at children. Because there are no accounts, we
          collect no age information and hold no personal data that could identify anyone, of any age. Parents
          who prefer their children not use the service can simply not share a room code with them.
        </p>

        <h2>
          <span className="pp-dot" />
          11. Changes to this policy
        </h2>
        <p>
          If the service changes in ways that affect this policy, the updated version will be posted on this page
          with a new &ldquo;last updated&rdquo; date. Material changes — anything beyond clarifications — will
          also be announced in the project&apos;s GitHub repository, so self-hosters and privacy-minded readers
          can review the relevant commits rather than take our word for it.
        </p>

        <h2>
          <span className="pp-dot" />
          12. Contact
        </h2>
        <p>
          Questions, data concerns, or a bug report about privacy behavior? Open an issue at{" "}
          <a
            href="https://github.com/darwintjoe/anydrop/issues"
            style={{ color: "var(--emerald-dark)", fontWeight: 600 }}
          >
            github.com/darwintjoe/anydrop/issues
          </a>{" "}
          — it&apos;s the fastest way to reach the maintainer, and the discussion stays public and auditable.
        </p>
      </main>

      <footer className="pp-footer">
        <div className="pp-foot-inner">
          <span className="pp-foot-brand">
            <img src="/anydrop.svg" alt="" />
            AnyDrop — Edge Drop lives on, now in Chrome.
          </span>
          <span>
            <a href="/">anydrop.space-z.ai</a> ·{" "}
            <a href="https://github.com/darwintjoe/anydrop">GitHub</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

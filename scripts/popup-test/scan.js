// AnyDrop scan-to-connect tab:
// decodes a room QR (encoded as https://<server>/?room=CODE), saves the server
// URL + room code into extension storage, then closes the tab.
// Decoding uses the bundled jsQR (window.jsQR from jsQR.js).

const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

const els = {
  video: document.getElementById('video'),
  canvas: document.getElementById('canvas'),
  status: document.getElementById('scan-status'),
  cancel: document.getElementById('scan-cancel'),
};

let stream = null;
let timer = null;
let done = false;

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle('error', isError);
}

function parseRoomQr(text) {
  const t = (text || '').trim();
  if (CODE_RE.test(t.toUpperCase())) return { code: t.toUpperCase(), serverUrl: null };
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const code = (u.searchParams.get('room') || '').toUpperCase();
      if (CODE_RE.test(code)) return { code, serverUrl: u.origin };
    } catch (e) {
      /* not a URL we can use */
    }
  }
  return null;
}

function stopCamera() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    stream = null;
  }
}

async function finish(rawText) {
  if (done) return;
  done = true;
  stopCamera();
  try { navigator.vibrate && navigator.vibrate(60); } catch (e) {}

  const parsed = parseRoomQr(rawText);
  if (!parsed) {
    setStatus('That QR is not an AnyDrop room code. Scan the QR shown by the AnyDrop web app or extension popup.', true);
    return;
  }

  const patch = { roomCode: parsed.code, lastSeenAt: new Date().toISOString() };
  if (parsed.serverUrl) patch.serverUrl = parsed.serverUrl.replace(/\/+$/, '');
  await chrome.storage.local.set(patch);
  try { chrome.action.setBadgeText({ text: '' }); } catch (e) {}

  setStatus(`Paired with room ${parsed.code} ✓ Opening AnyDrop…`);
  setTimeout(() => {
    try { window.close(); } catch (e) { /* tab stayed open — the banner says it worked */ }
  }, 1400);
}

function tick() {
  if (done) return;
  const video = els.video;
  if (video.readyState >= 2 && video.videoWidth > 0) {
    const scale = Math.min(1, 480 / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    els.canvas.width = w;
    els.canvas.height = h;
    const ctx = els.canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    let found = null;
    try {
      found = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
    } catch (e) {
      found = null;
    }
    if (found && found.data) {
      finish(found.data);
      return;
    }
  }
  timer = setTimeout(tick, 150);
}

async function start() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('This browser window cannot access the camera.', true);
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    els.video.srcObject = stream;
    await els.video.play();
    setStatus('Looking for an AnyDrop QR code…');
    tick();
  } catch (e) {
    setStatus(`Camera unavailable: ${e.message || e.name}. Allow camera access and reload this tab.`, true);
  }
}

els.cancel.addEventListener('click', () => {
  stopCamera();
  try { window.close(); } catch (e) { history.back(); }
});

window.addEventListener('beforeunload', stopCamera);

start();

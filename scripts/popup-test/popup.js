// AnyDrop popup logic

const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

const els = {
  setup: document.getElementById('setup'),
  main: document.getElementById('main'),
  live: document.getElementById('live-badge'),
  serverUrl: document.getElementById('server-url'),
  createRoom: document.getElementById('create-room'),
  joinCode: document.getElementById('join-code'),
  joinRoom: document.getElementById('join-room'),
  setupError: document.getElementById('setup-error'),
  roomCode: document.getElementById('room-code'),
  copyCode: document.getElementById('copy-code'),
  toggleQr: document.getElementById('toggle-qr'),
  qrPanel: document.getElementById('qr-panel'),
  qrImg: document.getElementById('qr-img'),
  dropPage: document.getElementById('drop-page'),
  composerInput: document.getElementById('composer-input'),
  composerSend: document.getElementById('composer-send'),
  attachBtn: document.getElementById('attach-btn'),
  attachMenu: document.getElementById('attach-menu'),
  attachOverlay: document.getElementById('attach-overlay'),
  attachMediaItem: document.getElementById('attach-media-item'),
  attachFileItem: document.getElementById('attach-file-item'),
  attachMedia: document.getElementById('attach-media'),
  attachFile: document.getElementById('attach-file'),
  dropList: document.getElementById('drop-list'),
  viewer: document.getElementById('viewer'),
  viewerImg: document.getElementById('viewer-img'),
  viewerName: document.getElementById('viewer-name'),
  viewerClose: document.getElementById('viewer-close'),
  viewerSave: document.getElementById('viewer-save'),
  viewerCopy: document.getElementById('viewer-copy'),
  scanConnect: document.getElementById('scan-connect'),
  openWeb: document.getElementById('open-web'),
  leaveRoom: document.getElementById('leave-room'),
};

let settings = { serverUrl: null, roomCode: null, lastSeenAt: null };
let pollTimer = null;
let online = true;
let lastRenderSig = null;

const api = (path, options) =>
  fetch(`${settings.serverUrl.replace(/\/+$/, '')}${path}`, options).then(async (res) => {
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
    return body;
  });

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString();
}

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const SVG = {
  copy: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  image: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  open: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  download: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  file: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
};

function show(view) {
  els.setup.classList.toggle('hidden', view !== 'setup');
  els.main.classList.toggle('hidden', view !== 'main');
  els.live.classList.toggle('hidden', view !== 'main' || !online);
}

function showSetupError(message) {
  els.setupError.textContent = message;
  els.setupError.classList.remove('hidden');
}

async function saveSettings(patch) {
  settings = { ...settings, ...patch };
  await chrome.storage.local.set(patch);
}

function enterMain() {
  els.roomCode.textContent = settings.roomCode;
  els.serverUrl.value = settings.serverUrl;
  els.qrImg.src = `${settings.serverUrl.replace(/\/+$/, '')}/api/qr?text=${encodeURIComponent(
    settings.serverUrl.replace(/\/+$/, '') + '/?room=' + settings.roomCode
  )}&size=220`;
  els.openWeb.href = settings.serverUrl;
  show('main');
  pollNow();
  clearInterval(pollTimer);
  pollTimer = setInterval(pollNow, 2000);
}

async function markSeen(latestIso) {
  if (!latestIso) return;
  await saveSettings({ lastSeenAt: latestIso });
  chrome.action.setBadgeText({ text: '' });
}

async function pollNow() {
  if (!settings.serverUrl || !settings.roomCode) return;
  try {
    const data = await api(`/api/rooms/${settings.roomCode}/drops`);
    online = true;
    els.live.classList.remove('hidden');
    renderDrops(data.drops);
    const latest = data.drops.length ? data.drops[0].createdAt : null;
    await markSeen(latest);
  } catch (e) {
    online = false;
    els.live.classList.add('hidden');
    els.dropList.innerHTML = `<div class="offline">Can't reach the server — check the URL in settings.<br>${e.message}</div>`;
  }
}

function renderDrops(drops) {
  // Skip identical payloads so the 2s poll doesn't re-render (and flicker) images.
  const sig = JSON.stringify(drops.map((d) => [d.id, d.kind, d.size, d.content]));
  if (sig === lastRenderSig) return;
  lastRenderSig = sig;

  if (!drops.length) {
    els.dropList.innerHTML = `<div class="empty"><strong>Nothing dropped yet</strong><br>Send something from your phone, or type below.</div>`;
    return;
  }
  els.dropList.innerHTML = '';
  for (const d of drops) {
    const card = document.createElement('div');
    card.className = 'card';

    const head = document.createElement('div');
    head.className = 'card-head';
    const kindLabel = { text: 'Note', link: 'Link', file: 'File' }[d.kind] || d.kind;
    head.innerHTML = `
      <span class="kind-badge kind-${d.kind}">${kindLabel}</span>
      <span class="card-time">${timeAgo(d.createdAt)}</span>
      <span class="card-actions"></span>`;
    const actions = head.querySelector('.card-actions');

    if (d.kind === 'text' && d.content) {
      const btn = mkIconBtn(SVG.copy, 'Copy text');
      btn.onclick = async () => {
        await navigator.clipboard.writeText(d.content);
        btn.innerHTML = SVG.check;
        setTimeout(() => (btn.innerHTML = SVG.copy), 1200);
      };
      actions.appendChild(btn);
    }
    if (d.kind === 'file' && d.downloadUrl) {
      const isImg = (d.mimetype || '').startsWith('image/');
      if (isImg) {
        const copyImg = mkIconBtn(SVG.image, 'Copy image');
        copyImg.onclick = () => copyImage(d, copyImg);
        actions.appendChild(copyImg);
      }
      const btn = mkIconBtn(SVG.download, 'Download');
      btn.onclick = () => {
        window.open(abs(d.downloadUrl) + '?download=1', '_blank');
      };
      actions.appendChild(btn);
    }
    const del = mkIconBtn(SVG.trash, 'Delete', true);
    del.onclick = async () => {
      try {
        await api(`/api/rooms/${settings.roomCode}/drops/${d.id}`, { method: 'DELETE' });
        card.remove();
      } catch (e) {
        card.remove();
      }
    };
    actions.appendChild(del);

    const body = document.createElement('div');
    if (d.kind === 'text') {
      body.className = 'card-body';
      body.textContent = d.content || '';
    } else if (d.kind === 'link') {
      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = d.title || d.content;
      const url = document.createElement('div');
      url.className = 'card-url';
      url.textContent = d.content;
      const open = mkIconBtn(SVG.open, 'Open link');
      open.onclick = () => chrome.tabs.create({ url: d.content });
      actions.prepend(open);
      body.appendChild(title);
      body.appendChild(url);
    } else if (d.kind === 'file') {
      const isImg = (d.mimetype || '').startsWith('image/');
      if (isImg) {
        const img = document.createElement('img');
        img.className = 'card-img';
        img.src = abs(d.downloadUrl);
        img.loading = 'lazy';
        img.alt = d.filename || 'Dropped image';
        img.title = 'Click to view';
        img.onclick = () => openViewer(d);
        body.appendChild(img);
      } else {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `<span class="file-thumb">${SVG.file}</span><span class="file-meta"><span class="file-name"></span><br><span class="file-size"></span></span>`;
        row.querySelector('.file-name').textContent = d.filename || 'file';
        row.querySelector('.file-size').textContent = `${formatSize(d.size)}${d.mimetype ? ' · ' + d.mimetype : ''}`;
        body.appendChild(row);
      }
    }

    card.appendChild(head);
    card.appendChild(body);
    els.dropList.appendChild(card);
  }
}

function abs(path) {
  return `${settings.serverUrl.replace(/\/+$/, '')}${path}`;
}

// ---------- (+) attach menu (consistent with the PWA) ----------
function attachMenuOpen() {
  return !els.attachMenu.classList.contains('hidden');
}

function toggleAttachMenu(force) {
  const open = force !== undefined ? force : !attachMenuOpen();
  els.attachMenu.classList.toggle('hidden', !open);
  els.attachOverlay.classList.toggle('hidden', !open);
  els.attachBtn.classList.toggle('open', open);
  els.attachBtn.setAttribute('aria-expanded', String(open));
}

function pickFiles(input) {
  toggleAttachMenu(false);
  input.click();
}

// ---------- chat-box composer ----------
function looksLikeLink(content) {
  return /^https?:\/\//i.test(content) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(content);
}

async function sendFromComposer() {
  const raw = els.composerInput.value.trim();
  if (!raw || els.composerSend.disabled) return;
  els.composerSend.disabled = true;
  els.composerSend.classList.add('busy');
  try {
    if (looksLikeLink(raw)) {
      const content = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      await api(`/api/rooms/${settings.roomCode}/drops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'link', content }),
      });
    } else {
      await api(`/api/rooms/${settings.roomCode}/drops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'text', content: raw }),
      });
    }
    els.composerInput.value = '';
    pollNow();
  } catch (e) {
    flashComposerError(e.message);
  } finally {
    els.composerSend.classList.remove('busy');
    els.composerSend.disabled = !els.composerInput.value.trim();
  }
}

function flashComposerError(message) {
  const chip = document.createElement('div');
  chip.className = 'attach-chip';
  chip.style.color = '#dc2626';
  chip.style.borderColor = '#fecaca';
  chip.textContent = `Failed: ${message}`;
  els.composerInput.closest('.composer').appendChild(chip);
  setTimeout(() => chip.remove(), 2600);
}

async function sendAttachedFiles(files) {
  if (!files.length) return;
  const chip = document.createElement('div');
  chip.className = 'attach-chip';
  chip.textContent = files.length === 1 ? `Uploading ${files[0].name}…` : `Uploading ${files.length} files…`;
  els.composerInput.closest('.composer').appendChild(chip);
  els.attachBtn.disabled = true;
  toggleAttachMenu(false);
  try {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    await api(`/api/rooms/${settings.roomCode}/drops`, { method: 'POST', body: form });
    chip.textContent = 'Dropped ✓';
    setTimeout(() => chip.remove(), 1200);
    pollNow();
  } catch (e) {
    chip.remove();
    flashComposerError(e.message);
  } finally {
    els.attachBtn.disabled = false;
  }
}

// ---------- image viewer ----------
let viewerDrop = null;

function openViewer(drop) {
  viewerDrop = drop;
  els.viewerImg.src = abs(drop.downloadUrl);
  els.viewerName.textContent = `${drop.filename || 'image'} · ${formatSize(drop.size)}`;
  els.viewer.classList.remove('hidden');
}

function closeViewer() {
  els.viewer.classList.add('hidden');
  els.viewerImg.src = '';
  viewerDrop = null;
}

async function toPngBlob(blob) {
  if (blob.type === 'image/png') return blob;
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d').drawImage(bmp, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas encode failed'))), 'image/png')
  );
}

async function copyImageToClipboard(drop) {
  try {
    const res = await fetch(abs(drop.downloadUrl));
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
    const png = await toPngBlob(await res.blob());
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    return true;
  } catch (e) {
    return false;
  }
}

async function copyImage(drop, btn) {
  const original = btn.innerHTML;
  const ok = await copyImageToClipboard(drop);
  btn.innerHTML = ok ? SVG.check : SVG.x;
  showPopupToast(ok ? 'Image copied to clipboard' : 'Copy failed — try Save instead');
  setTimeout(() => (btn.innerHTML = original), 1200);
}

// ---------- popup toast ----------
let toastTimer = null;
function showPopupToast(message) {
  let el = document.getElementById('popup-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'popup-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

function mkIconBtn(svg, label, danger = false) {
  const b = document.createElement('button');
  b.className = `icon-btn${danger ? ' danger' : ''}`;
  b.title = label;
  b.setAttribute('aria-label', label);
  b.innerHTML = svg;
  return b;
}

// ---------- events ----------
els.createRoom.addEventListener('click', async () => {
  const url = els.serverUrl.value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(url)) return showSetupError('Server URL must start with http:// or https://');
  els.createRoom.disabled = true;
  els.setupError.classList.add('hidden');
  try {
    await saveSettings({ serverUrl: url });
    const room = await api('/api/rooms', { method: 'POST' });
    await saveSettings({ roomCode: room.code, lastSeenAt: new Date().toISOString() });
    enterMain();
  } catch (e) {
    showSetupError(e.message);
  } finally {
    els.createRoom.disabled = false;
  }
});

els.joinRoom.addEventListener('click', async () => {
  const url = els.serverUrl.value.trim().replace(/\/+$/, '');
  const code = els.joinCode.value.trim().toUpperCase();
  if (!/^https?:\/\//.test(url)) return showSetupError('Server URL must start with http:// or https://');
  if (!CODE_RE.test(code)) return showSetupError('Room codes are 6 characters, like 7KPQ4M.');
  els.joinRoom.disabled = true;
  els.setupError.classList.add('hidden');
  try {
    await saveSettings({ serverUrl: url });
    await api(`/api/rooms/${code}`); // validate
    await saveSettings({ roomCode: code, lastSeenAt: new Date().toISOString() });
    enterMain();
  } catch (e) {
    showSetupError(e.message);
  } finally {
    els.joinRoom.disabled = false;
  }
});

els.joinCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.joinRoom.click();
});

els.serverUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.createRoom.click();
});

els.copyCode.addEventListener('click', async () => {
  await navigator.clipboard.writeText(settings.roomCode || '');
  const label = els.copyCode.querySelector('.code-label');
  label.textContent = 'COPIED';
  setTimeout(() => (label.textContent = 'ROOM'), 1200);
});

els.toggleQr.addEventListener('click', () => {
  els.qrPanel.classList.toggle('hidden');
});

els.dropPage.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;
  els.dropPage.disabled = true;
  try {
    await api(`/api/rooms/${settings.roomCode}/drops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'link', content: tab.url, title: tab.title || null }),
    });
    els.dropPage.textContent = 'Dropped ✓';
    setTimeout(() => {
      els.dropPage.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Drop page';
      els.dropPage.disabled = false;
    }, 1400);
  } catch (e) {
    els.dropPage.textContent = 'Failed ✕';
    setTimeout(() => {
      els.dropPage.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Drop page';
      els.dropPage.disabled = false;
    }, 1400);
  }
});

els.composerInput.addEventListener('input', () => {
  els.composerSend.disabled = !els.composerInput.value.trim() || els.composerSend.classList.contains('busy');
});

els.composerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendFromComposer();
  }
});

els.composerSend.addEventListener('click', sendFromComposer);

els.attachBtn.addEventListener('click', () => toggleAttachMenu());

els.attachOverlay.addEventListener('click', () => toggleAttachMenu(false));

els.attachMediaItem.addEventListener('click', () => pickFiles(els.attachMedia));

els.attachFileItem.addEventListener('click', () => pickFiles(els.attachFile));

for (const input of [els.attachMedia, els.attachFile]) {
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    input.value = ''; // allow re-picking the same file
    sendAttachedFiles(files);
  });
}

els.viewerClose.addEventListener('click', closeViewer);

els.viewer.addEventListener('click', (e) => {
  if (e.target === els.viewer) closeViewer(); // click on the dark backdrop
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!els.viewer.classList.contains('hidden')) closeViewer();
  else if (attachMenuOpen()) toggleAttachMenu(false);
});

els.viewerSave.addEventListener('click', () => {
  if (viewerDrop) window.open(abs(viewerDrop.downloadUrl) + '?download=1', '_blank');
});

els.viewerCopy.addEventListener('click', async () => {
  if (!viewerDrop || els.viewerCopy.disabled) return;
  els.viewerCopy.disabled = true;
  const ok = await copyImageToClipboard(viewerDrop);
  els.viewerCopy.disabled = false;
  els.viewerCopy.innerHTML = ok ? SVG.check : SVG.x;
  showPopupToast(ok ? 'Image copied to clipboard' : 'Copy failed — try Save instead');
  setTimeout(() => (els.viewerCopy.innerHTML = SVG.copy), 1500);
});

els.scanConnect.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('scan.html') });
});

els.leaveRoom.addEventListener('click', async () => {
  clearInterval(pollTimer);
  await saveSettings({ roomCode: null, lastSeenAt: null });
  chrome.action.setBadgeText({ text: '' });
  show('setup');
});

// ---------- boot ----------
(async function init() {
  const stored = await chrome.storage.local.get(['serverUrl', 'roomCode', 'lastSeenAt']);
  settings = stored;
  if (stored.serverUrl) els.serverUrl.value = stored.serverUrl;
  if (stored.serverUrl && stored.roomCode && CODE_RE.test(stored.roomCode)) {
    enterMain();
    setTimeout(() => els.composerInput.focus(), 50);
  } else {
    show('setup');
  }
})();

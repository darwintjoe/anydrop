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
  dropList: document.getElementById('drop-list'),
  openWeb: document.getElementById('open-web'),
  leaveRoom: document.getElementById('leave-room'),
};

let settings = { serverUrl: null, roomCode: null, lastSeenAt: null };
let pollTimer = null;
let online = true;

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
  check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  open: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  download: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
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
  if (!drops.length) {
    els.dropList.innerHTML = `<div class="empty"><strong>Nothing dropped yet</strong><br>Send something from your phone, or hit “Drop page”.</div>`;
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
  } else {
    show('setup');
  }
})();

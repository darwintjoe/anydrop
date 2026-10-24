// AnyDrop background service worker
// - context menus: "Drop selection / page to AnyDrop"
// - alarm: refresh the toolbar badge with the number of unseen drops

const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

function api(settings, path, options) {
  return fetch(`${settings.serverUrl.replace(/\/+$/, '')}${path}`, options).then(async (res) => {
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
    return body;
  });
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['serverUrl', 'roomCode', 'lastSeenAt'], resolve);
  });
}

async function dropToApi(settings, payload) {
  return api(settings, `/api/rooms/${settings.roomCode}/drops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function flashBadge(text) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#059669' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1800);
}

async function updateBadge() {
  const settings = await getSettings();
  if (!settings.serverUrl || !settings.roomCode || !CODE_RE.test(settings.roomCode)) return;
  try {
    const data = await api(settings, `/api/rooms/${settings.roomCode}/drops`);
    const unseen = data.drops.filter(
      (d) => !settings.lastSeenAt || new Date(d.createdAt) > new Date(settings.lastSeenAt)
    );
    if (unseen.length > 0) {
      await chrome.action.setBadgeBackgroundColor({ color: '#059669' });
      await chrome.action.setBadgeText({ text: unseen.length > 99 ? '99+' : String(unseen.length) });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch {
    // server unreachable — leave badge as-is
  }
}

// ---------- install ----------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'anydrop-selection',
    title: 'Drop selection to AnyDrop',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'anydrop-page',
    title: 'Drop this page to AnyDrop',
    contexts: ['page'],
  });
  chrome.alarms.create('anydrop-badge', { periodInMinutes: 1 });
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('anydrop-badge', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'anydrop-badge') updateBadge();
});

// ---------- context menu actions ----------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await getSettings();
  if (!settings.serverUrl || !settings.roomCode || !CODE_RE.test(settings.roomCode)) {
    // Not paired yet — open the popup flow via the extension page
    await flashBadge('!');
    if (tab && tab.windowId != null) chrome.action.openPopup?.();
    return;
  }
  try {
    if (info.menuItemId === 'anydrop-selection' && info.selectionText) {
      await dropToApi(settings, { kind: 'text', content: info.selectionText });
    } else if (info.menuItemId === 'anydrop-page' && tab) {
      await dropToApi(settings, { kind: 'link', content: tab.url, title: tab.title || null });
    } else {
      return;
    }
    const settings2 = await getSettings();
    await chrome.storage.local.set({ lastSeenAt: new Date().toISOString() });
    await flashBadge('+1');
    updateBadge();
  } catch (e) {
    await flashBadge('x');
  }
});

// Keep the badge fresh when storage changes (e.g. popup marks everything as seen)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lastSeenAt) updateBadge();
});

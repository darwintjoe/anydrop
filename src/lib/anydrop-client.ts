'use client';

// Client-side helpers for the AnyDrop web app.

export type PublicDrop = {
  id: string;
  kind: 'text' | 'link' | 'file';
  content: string | null;
  title: string | null;
  filename: string | null;
  mimetype: string | null;
  size: number | null;
  createdAt: string;
  expiresAt: string;
  downloadUrl: string | null;
};

export const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
const STORAGE_KEY = 'anydrop.room';

// Mirror the paired room into a cookie so the OS share-target POST (/api/share)
// knows where to deliver shares even though it never touches this JS.
function setRoomCookie(code: string | null) {
  try {
    if (code) {
      document.cookie = `anydrop_room=${code}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
    } else {
      document.cookie = 'anydrop_room=; path=/; max-age=0; samesite=lax';
    }
  } catch {}
}

export function saveRoom(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  setRoomCookie(code);
}
export function loadRoom(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
export function clearRoom() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  setRoomCookie(null);
}

async function handle<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {}
  if (!res.ok) {
    const message =
      (body as { error?: string })?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function createRoom(): Promise<{ code: string }> {
  return handle(await fetch('/api/rooms', { method: 'POST' }));
}

export async function getRoom(code: string): Promise<{ code: string; dropCount: number }> {
  return handle(await fetch(`/api/rooms/${code}`));
}

export async function listDrops(code: string): Promise<PublicDrop[]> {
  const data = await handle<{ drops: PublicDrop[] }>(await fetch(`/api/rooms/${code}/drops`));
  return data.drops;
}

export async function sendText(code: string, content: string): Promise<PublicDrop[]> {
  const data = await handle<{ drops: PublicDrop[] }>(
    await fetch(`/api/rooms/${code}/drops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'text', content }),
    })
  );
  return data.drops;
}

export async function sendLink(code: string, content: string, title?: string): Promise<PublicDrop[]> {
  const data = await handle<{ drops: PublicDrop[] }>(
    await fetch(`/api/rooms/${code}/drops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'link', content, title }),
    })
  );
  return data.drops;
}

/** XHR-based upload so we can show a progress bar (fetch cannot report upload progress).
 *  Pass `getXhr` to receive the XMLHttpRequest handle (used to cancel uploads). */
export function sendFiles(
  code: string,
  files: File[],
  onProgress?: (pct: number) => void,
  getXhr?: (xhr: XMLHttpRequest) => void
): Promise<PublicDrop[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    const xhr = new XMLHttpRequest();
    if (getXhr) getXhr(xhr);
    xhr.open('POST', `/api/rooms/${code}/drops`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((body as { drops: PublicDrop[] }).drops);
      } else {
        reject(new Error((body as { error?: string })?.error || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(form);
  });
}

export async function deleteDrop(code: string, id: string): Promise<void> {
  await handle(await fetch(`/api/rooms/${code}/drops/${id}`, { method: 'DELETE' }));
}

// ---------- formatting ----------
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function isImage(mimetype: string | null): boolean {
  return !!mimetype && mimetype.startsWith('image/');
}

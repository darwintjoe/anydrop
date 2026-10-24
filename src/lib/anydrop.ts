import type { Drop } from '@prisma/client';

// ---------- Room code ----------
// Unambiguous alphabet (no 0/O/1/I/L) so codes are easy to type on a phone.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 6;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(code: string | undefined | null): boolean {
  if (!code) return false;
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code);
}

// ---------- Expiry ----------
export const DROP_TTL_MS = 24 * 60 * 60 * 1000; // drops live for 24 hours (like Edge Drop)
export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000; // unused rooms are garbage collected after 7 days
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file
export const MAX_FILES_PER_REQUEST = 10;
export const MAX_DROP_LIST = 100;

export function dropExpiry(): Date {
  return new Date(Date.now() + DROP_TTL_MS);
}

/** Lazy garbage collection: remove expired drops + stale rooms. Cheap enough to run per request. */
export async function sweepExpired(db: {
  drop: { deleteMany: (args: { where: { expiresAt: { lt: Date } } }) => unknown };
  room: { deleteMany: (args: { where: { lastActiveAt: { lt: Date } } }) => unknown };
}) {
  const now = new Date();
  await Promise.all([
    db.drop.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.room.deleteMany({ where: { lastActiveAt: { lt: new Date(now.getTime() - ROOM_TTL_MS) } } }),
  ]);
}

// ---------- Serialization ----------
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

export function toPublicDrop(drop: Drop): PublicDrop {
  return {
    id: drop.id,
    kind: drop.kind as PublicDrop['kind'],
    content: drop.content,
    title: drop.title,
    filename: drop.filename,
    mimetype: drop.mimetype,
    size: drop.size,
    createdAt: drop.createdAt.toISOString(),
    expiresAt: drop.expiresAt.toISOString(),
    downloadUrl: drop.kind === 'file' ? `/api/files/${drop.id}` : null,
  };
}

// ---------- Realtime fan-out ----------
// The Next.js API notifies the socket.io mini service (loopback only, secret-protected)
// so that every device in the room gets instant updates.
export const INTERNAL_SECRET = 'anydrop-internal-7f3a9c';
export const SOCKET_SERVICE_URL = 'http://127.0.0.1:3004/internal/broadcast';

export async function broadcastToRoom(room: string, event: string, payload: unknown) {
  try {
    await fetch(SOCKET_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-anydrop-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ room, event, payload }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Fire-and-forget: clients also poll, so a missed broadcast is harmless.
  }
}

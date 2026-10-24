import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  isValidRoomCode,
  sweepExpired,
  dropExpiry,
  toPublicDrop,
  broadcastToRoom,
  MAX_FILE_BYTES,
  MAX_FILES_PER_REQUEST,
} from '@/lib/anydrop';

export const dynamic = 'force-dynamic';

/** 303 with a RELATIVE Location — survives any proxy/host (absolute req.url breaks behind gateways). */
function seeOther(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

/**
 * POST /api/share — Web Share Target receiver (see src/app/manifest.ts).
 *
 * When AnyDrop is installed as a PWA, the OS share sheet POSTs here with
 * multipart/form-data fields: title, text, url and files[].
 *
 * Flow:
 *  - Room cookie present  → items are delivered into the room (like any other drop),
 *                           then the browser is redirected to /?shared=N.
 *  - No room paired       → redirect to /?need_pair=1&title=…&text=…&url=… so the
 *                           landing page can recover the share after pairing.
 *                           (Files cannot survive this round-trip — the user is told.)
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return seeOther('/?need_pair=1');
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return seeOther('/?need_pair=1');
  }

  const title = ((form.get('title') as string | null) || '').trim().slice(0, 300) || null;
  const text = ((form.get('text') as string | null) || '').trim();
  const url = ((form.get('url') as string | null) || '').trim();
  const files = form
    .getAll('files')
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!text && !url && !title && files.length === 0) {
    return seeOther('/?shared=0');
  }

  // ---------- Resolve the paired room ----------
  const cookieCode = req.cookies.get('anydrop_room')?.value || null;
  const room =
    cookieCode && isValidRoomCode(cookieCode)
      ? await db.room.findUnique({ where: { code: cookieCode } })
      : null;

  if (!room) {
    // Nothing paired on this device. Keep text/url in the URL so pairing can recover them.
    const params = new URLSearchParams();
    params.set('need_pair', '1');
    if (title) params.set('title', title);
    if (text) params.set('text', text.slice(0, 2000));
    if (url) params.set('url', url.slice(0, 2000));
    return seeOther(`/?${params.toString()}`);
  }

  await sweepExpired(db);
  const created: ReturnType<typeof toPublicDrop>[] = [];
  let skipped = 0;

  // ---------- Comment text (only when it adds something beyond the URL/title) ----------
  const textIsDuplicate =
    !text || text === url || text === title || (url !== '' && text.length <= 1);
  if (text && !textIsDuplicate) {
    const drop = await db.drop.create({
      data: { roomId: room.id, kind: 'text', content: text.slice(0, 100_000), expiresAt: dropExpiry() },
    });
    created.push(toPublicDrop(drop));
  }

  // ---------- URL / page link ----------
  let linkUrl = '';
  if (/^https?:\/\//i.test(url)) linkUrl = url;
  else if (/^https?:\/\//i.test(text)) linkUrl = text;
  if (linkUrl) {
    const drop = await db.drop.create({
      data: { roomId: room.id, kind: 'link', content: linkUrl.slice(0, 2000), title, expiresAt: dropExpiry() },
    });
    created.push(toPublicDrop(drop));
  }

  // ---------- Title-only share (e.g. some apps only fill the title field) ----------
  if (!linkUrl && !text && title && files.length === 0) {
    const drop = await db.drop.create({
      data: { roomId: room.id, kind: 'text', content: title, expiresAt: dropExpiry() },
    });
    created.push(toPublicDrop(drop));
  }

  // ---------- Files ----------
  if (files.length > MAX_FILES_PER_REQUEST) skipped += files.length - MAX_FILES_PER_REQUEST;
  for (const file of files.slice(0, MAX_FILES_PER_REQUEST)) {
    if (file.size > MAX_FILE_BYTES) {
      skipped += 1;
      continue;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const drop = await db.drop.create({
      data: {
        roomId: room.id,
        kind: 'file',
        title,
        filename: file.name || 'shared-file',
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
        data: bytes,
        expiresAt: dropExpiry(),
      },
    });
    created.push(toPublicDrop(drop));
  }

  // ---------- Fan out + return to the app ----------
  if (created.length > 0) {
    await db.room.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } });
    await broadcastToRoom(room.code, 'drop:new', { drops: created });
  }

  const params = new URLSearchParams();
  params.set('shared', String(created.length));
  if (skipped > 0) params.set('skipped', String(skipped));
  return seeOther(`/?${params.toString()}`);
}

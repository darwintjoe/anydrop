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
  MAX_DROP_LIST,
} from '@/lib/anydrop';

export const dynamic = 'force-dynamic';

/** GET /api/rooms/[code]/drops — latest drops in the room (newest first, capped). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
  }

  await sweepExpired(db);

  const room = await db.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const drops = await db.drop.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: 'desc' },
    take: MAX_DROP_LIST,
  });

  // Touch the room so it is not garbage collected while in use.
  await db.room.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } });

  return NextResponse.json({ drops: drops.map(toPublicDrop), serverTime: new Date().toISOString() });
}

/** POST /api/rooms/[code]/drops — drop text/links (JSON) or files (multipart). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
  }

  const room = await db.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: 'Room not found — it may have expired, create a new one' }, { status: 404 });
  }

  const contentType = req.headers.get('content-type') || '';
  const created = [];

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    const title = (form.get('title') as string | null)?.slice(0, 300) || null;

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files received' }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `Max ${MAX_FILES_PER_REQUEST} files per drop` }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB — the limit is 25 MB per file` },
          { status: 413 }
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const drop = await db.drop.create({
        data: {
          roomId: room.id,
          kind: 'file',
          title,
          filename: file.name || 'file',
          mimetype: file.type || 'application/octet-stream',
          size: file.size,
          data: bytes,
          expiresAt: dropExpiry(),
        },
      });
      created.push(toPublicDrop(drop));
    }
  } else {
    // JSON body: text note or link
    let body: { kind?: string; content?: string; title?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const kind = body.kind === 'link' ? 'link' : 'text';
    const content = (body.content || '').trim();
    const title = (body.title || '').trim().slice(0, 300) || null;

    if (!content) {
      return NextResponse.json({ error: 'Content is empty' }, { status: 400 });
    }
    if (content.length > 100_000) {
      return NextResponse.json({ error: 'Text is too long (100k characters max)' }, { status: 413 });
    }

    if (kind === 'link' && !/^https?:\/\//i.test(content)) {
      return NextResponse.json({ error: 'Links must start with http:// or https://' }, { status: 400 });
    }

    const drop = await db.drop.create({
      data: {
        roomId: room.id,
        kind,
        content,
        title,
        expiresAt: dropExpiry(),
      },
    });
    created.push(toPublicDrop(drop));
  }

  // Touch room activity + fan out to every connected device in the room.
  await db.room.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } });
  await broadcastToRoom(code, 'drop:new', { drops: created });

  return NextResponse.json({ drops: created }, { status: 201 });
}

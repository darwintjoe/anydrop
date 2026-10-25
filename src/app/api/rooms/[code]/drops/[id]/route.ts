import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidRoomCode, broadcastToRoom } from '@/lib/anydrop';

export const dynamic = 'force-dynamic';

/** DELETE /api/rooms/[code]/drops/[id] — remove a single drop. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ code: string; id: string }> }) {
  const { code, id } = await params;

  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
  }

  const room = await db.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const existing = await db.drop.findFirst({ where: { id, roomId: room.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Drop not found' }, { status: 404 });
  }

  await db.drop.delete({ where: { id } });
  await broadcastToRoom(code, 'drop:deleted', { id });

  return NextResponse.json({ ok: true });
}

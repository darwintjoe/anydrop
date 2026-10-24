import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidRoomCode } from '@/lib/anydrop';

export const dynamic = 'force-dynamic';

/** GET /api/rooms/[code] — validate a room code (used by the extension when pairing). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
  }

  const room = await db.room.findUnique({
    where: { code },
    include: { _count: { select: { drops: true } } },
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found — check the code or create a new room' }, { status: 404 });
  }

  return NextResponse.json({
    code: room.code,
    createdAt: room.createdAt.toISOString(),
    dropCount: room._count.drops,
  });
}

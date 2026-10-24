import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateRoomCode, sweepExpired } from '@/lib/anydrop';

export const dynamic = 'force-dynamic';

/** POST /api/rooms — create a new Drop Room and return its pairing code. */
export async function POST(_req: NextRequest) {
  await sweepExpired(db);

  // Retry a few times in the (unlikely) event of a code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const exists = await db.room.findUnique({ where: { code } });
    if (exists) continue;
    const room = await db.room.create({ data: { code } });
    return NextResponse.json({ code: room.code, id: room.id, createdAt: room.createdAt.toISOString() }, { status: 201 });
  }
  return NextResponse.json({ error: 'Could not allocate a room code, please retry' }, { status: 500 });
}

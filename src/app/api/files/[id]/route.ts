import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/files/[id] — stream a dropped file.
 * Images / video / audio / PDFs render inline (used by the feed preview);
 * everything else downloads. Add ?download=1 to force a download.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const drop = await db.drop.findUnique({ where: { id } });
  if (!drop || drop.kind !== 'file' || !drop.data) {
    return NextResponse.json({ error: 'File not found or expired' }, { status: 404 });
  }

  const forceDownload = req.nextUrl.searchParams.get('download') === '1';
  const mimetype = drop.mimetype || 'application/octet-stream';
  const inlineTypes = ['image/', 'video/', 'audio/', 'text/plain', 'application/pdf'];
  const disposition = forceDownload || !inlineTypes.some((t) => mimetype.startsWith(t)) ? 'attachment' : 'inline';

  // RFC 5987: encode non-ASCII filenames safely for all browsers.
  const asciiName = (drop.filename || 'file').replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
  const utf8Name = encodeURIComponent(drop.filename || 'file');

  return new Response(new Uint8Array(drop.data), {
    status: 200,
    headers: {
      'Content-Type': mimetype,
      'Content-Length': String(drop.size ?? drop.data.length),
      'Content-Disposition': `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

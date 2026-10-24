import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr?text=...&size=... — render a QR code as PNG.
 * Used by the web app and the extension popup to pair phones by camera scan.
 */
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text');
  const size = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('size') || '240', 10) || 240, 80), 1024);

  if (!text || text.length > 1024) {
    return NextResponse.json({ error: 'Missing or too-long "text" parameter' }, { status: 400 });
  }

  const png = await QRCode.toBuffer(text, {
    type: 'png',
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

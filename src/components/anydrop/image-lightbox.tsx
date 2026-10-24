'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d')?.drawImage(bmp, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas encode failed'))), 'image/png')
  );
}

/**
 * Full-screen image viewer, consistent with the extension popup:
 *  - click the image once → view it large here
 *  - three small icon buttons top-right: Save (download), Copy (clipboard, with a toast), Close (✕)
 *  - Esc or clicking the dark backdrop also closes
 */
export default function ImageLightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [onClose]);

  const copyImage = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const png = await toPngBlob(await res.blob());
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast({ title: 'Image copied to clipboard' });
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: 'Copy failed', description: 'Your browser blocked clipboard access — use Save instead.', variant: 'destructive' });
    } finally {
      setCopying(false);
    }
  };

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
    >
      {/* Top bar: caption left · save + copy + close icons right */}
      <div className="flex items-center gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{caption || 'Image'}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={`${src}?download=1`}
            download
            onClick={(e) => e.stopPropagation()}
            title="Save image"
            aria-label="Save image"
            className={iconBtn}
          >
            <Download className="h-[18px] w-[18px]" />
          </a>
          <button
            type="button"
            onClick={copyImage}
            disabled={copying}
            title="Copy image"
            aria-label="Copy image"
            className={iconBtn}
          >
            {copying ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : copied ? (
              <Check className="h-[18px] w-[18px] text-emerald-400" />
            ) : (
              <Copy className="h-[18px] w-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close viewer"
            className={iconBtn}
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Large stage */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <img
          src={src}
          alt={caption || 'Dropped image'}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

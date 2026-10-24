'use client';

import { useEffect } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Full-screen image viewer, consistent with the extension popup:
 *  - click the image once → view it large here
 *  - two small icon buttons top-right: Save (download) and Close (✕)
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
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
    >
      {/* Top bar: caption left · save + close icons right */}
      <div className="flex items-center gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{caption || 'Image'}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={`${src}?download=1`}
            download
            onClick={(e) => e.stopPropagation()}
            title="Save image"
            aria-label="Save image"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
          >
            <Download className="h-[18px] w-[18px]" />
          </a>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close viewer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
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

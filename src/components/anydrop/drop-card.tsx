'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  File as FileIcon,
  ImageIcon,
  Link2,
  Trash2,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ImageLightbox from '@/components/anydrop/image-lightbox';
import { PublicDrop, formatSize, isImage, timeAgo } from '@/lib/anydrop-client';

export default function DropCard({
  drop,
  onDelete,
}: {
  drop: PublicDrop;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const kindMeta = {
    text: { icon: Type, label: 'Note', tint: 'bg-teal-100 text-teal-700' },
    link: { icon: Link2, label: 'Link', tint: 'bg-amber-100 text-amber-700' },
    file: { icon: FileIcon, label: 'File', tint: 'bg-emerald-100 text-emerald-700' },
  }[drop.kind];

  const Icon = drop.kind === 'file' && isImage(drop.mimetype) ? ImageIcon : kindMeta.icon;

  return (
    <>
    <article
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      aria-label={`${kindMeta.label} dropped ${timeAgo(drop.createdAt)}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${kindMeta.tint}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold text-slate-500">{kindMeta.label}</span>
        <span className="text-xs text-slate-400">· {timeAgo(drop.createdAt)}</span>
        <div className="ml-auto flex items-center gap-1">
          {drop.kind === 'text' && drop.content && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copy(drop.content!)} aria-label="Copy text">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          {drop.kind === 'file' && drop.downloadUrl && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Download file">
              <a href={`${drop.downloadUrl}?download=1`} download={drop.filename || 'file'}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600"
            onClick={() => onDelete(drop.id)}
            aria-label="Delete drop"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {drop.kind === 'text' && drop.content && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-800 leading-relaxed max-h-64 overflow-y-auto anydrop-scroll">
          {drop.content}
        </p>
      )}

      {drop.kind === 'link' && drop.content && (
        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
          {drop.title && <p className="text-sm font-medium text-slate-800 break-words">{drop.title}</p>}
          <p className="text-xs text-emerald-700 break-all mt-0.5">{drop.content}</p>
          <div className="mt-2.5 flex gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-xs bg-white">
              <a href={drop.content} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => copy(drop.content!)}>
              <Copy className="h-3.5 w-3.5" /> Copy URL
            </Button>
          </div>
        </div>
      )}

      {drop.kind === 'file' && (
        <div className="mt-3">
          {isImage(drop.mimetype) && drop.downloadUrl ? (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="block cursor-zoom-in"
              aria-label={`View ${drop.filename || 'image'} large`}
              title="Click to view"
            >
              <img
                src={drop.downloadUrl}
                alt={drop.filename || 'Dropped image'}
                className="max-h-56 rounded-xl border border-slate-100 object-cover w-auto max-w-full transition-opacity hover:opacity-90"
                loading="lazy"
              />
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
              <span className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <FileIcon className="h-5 w-5 text-slate-500" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{drop.filename}</p>
                <p className="text-xs text-slate-400">
                  {formatSize(drop.size)} {drop.mimetype ? `· ${drop.mimetype}` : ''}
                </p>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400 truncate">
            {drop.filename} · {formatSize(drop.size)}
          </p>
        </div>
      )}
    </article>

    {/* Click-once large view with Save / Close icons top-right (same as the extension) */}
    {viewerOpen && drop.downloadUrl && (
      <ImageLightbox
        src={drop.downloadUrl}
        caption={`${drop.filename || 'image'} · ${formatSize(drop.size)}`}
        onClose={() => setViewerOpen(false)}
      />
    )}
    </>
  );
}

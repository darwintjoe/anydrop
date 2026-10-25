'use client';

import { useRef, useState } from 'react';
import { File as FileIcon, ImagePlus, Loader2, Plus, Send, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { sendFiles, sendLink, sendText, formatSize } from '@/lib/anydrop-client';

/**
 * Chat-style composer, Edge Drop simple:
 *  - one input — typing a message sends a note, typing/pasting a URL sends a link
 *  - one (+) button — pick photos/videos or any file, they upload immediately
 *  - pasting an image/file from the clipboard uploads it right away
 *  - Enter makes a new line (matches the extension); send via the button or Ctrl/Cmd+Enter
 */
export default function Composer({ code }: { code: string }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // "name" | "N files"
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const looksLikeLink = (content: string) =>
    /^https?:\/\//i.test(content) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(content.trim());

  const sendComposer = async () => {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true);
    try {
      // Only auto-detect links for single-line messages; anything with a
      // line break is treated as a text note (same rule as the extension).
      if (!raw.includes('\n') && looksLikeLink(raw)) {
        const content = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        await sendLink(code, content);
      } else {
        await sendText(code, raw);
      }
      setText('');
    } catch (e) {
      toast({ title: 'Could not send', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || uploading) return;
    const label = files.length === 1 ? files[0].name : `${files.length} files`;
    setUploading(label);
    setProgress(0);
    try {
      await sendFiles(code, files, setProgress, (xhr) => (xhrRef.current = xhr));
      toast({
        title: 'Dropped ✓',
        description: `${label} ${files.length === 1 ? 'is' : 'are'} on the other device.`,
      });
    } catch {
      // cancelled or failed — stay quiet for cancel, surface for failure via progress reset
    } finally {
      xhrRef.current = null;
      setUploading(null);
      setProgress(0);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-t-3xl border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-4px_24px_rgba(15,23,42,0.06)] safe-bottom">
      <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 pt-2.5 pb-2">
        {/* Active upload: slim progress row with cancel */}
        {uploading && (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
            {progress > 0 && progress < 100 ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />
            ) : (
              <ImagePlus className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-emerald-900 truncate">{uploading}</span>
                <span className="text-[11px] text-emerald-700 shrink-0">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1 mt-1" aria-label="Upload progress" />
            </div>
            <button
              type="button"
              onClick={() => xhrRef.current?.abort()}
              className="text-emerald-700 hover:text-red-500 shrink-0"
              aria-label="Cancel upload"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* (+) attach menu */}
          <div className="relative shrink-0">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={!!uploading}
              className="h-11 w-11 rounded-full border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
              aria-label="Attach photos or files"
              aria-expanded={menuOpen}
            >
              <Plus className={`h-5 w-5 transition-transform ${menuOpen ? 'rotate-45' : ''}`} />
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div
                  role="menu"
                  aria-label="Attachment options"
                  className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      mediaInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 text-left"
                  >
                    <ImagePlus className="h-4 w-4" /> Photo or video
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 text-left"
                  >
                    <FileIcon className="h-4 w-4" /> Any file
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Single smart input: text → note, URL → link */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter inserts a newline (multiline composer). Send via the
              // button or Ctrl/Cmd+Enter — same interaction language as the
              // extension popup.
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendComposer();
              }
            }}
            onPaste={(e) => {
              const pasted = Array.from(e.clipboardData?.files || []);
              if (pasted.length > 0) {
                e.preventDefault();
                uploadFiles(pasted);
              }
            }}
            placeholder="Message, link, anything…"
            title="Enter for a new line · Ctrl+Enter to send"
            className="min-h-11 max-h-32 resize-none rounded-2xl"
            rows={1}
            aria-label="Message, link or paste to drop"
          />

          <Button
            onClick={sendComposer}
            disabled={busy || !text.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700"
            aria-label="Send"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* hidden pickers: gallery-friendly media input + universal file input */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => uploadFiles(Array.from(e.target.files || []))}
        className="sr-only"
        aria-label="Pick photos or videos to drop"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => uploadFiles(Array.from(e.target.files || []))}
        className="sr-only"
        aria-label="Pick any files to drop"
      />
    </div>
  );
}

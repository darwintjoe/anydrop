'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, Paperclip, Send, Type, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { sendFiles, sendLink, sendText, formatSize } from '@/lib/anydrop-client';

export default function Composer({ code }: { code: string }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendTextNote = async () => {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await sendText(code, content);
      setText('');
    } catch (e) {
      toast({ title: 'Could not send', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const sendLinkItem = async () => {
    let content = url.trim();
    if (!content || busy) return;
    // Bare domains get an https:// prefix for convenience
    if (!/^https?:\/\//i.test(content) && /^[\w-]+(\.[\w-]+)+/.test(content)) {
      content = `https://${content}`;
    }
    setBusy(true);
    try {
      await sendLink(code, content);
      setUrl('');
    } catch (e) {
      toast({ title: 'Could not send link', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const sendFileItems = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setProgress(0);
    try {
      await sendFiles(code, files, setProgress);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      toast({ title: 'Upload failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="rounded-t-3xl border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-4px_24px_rgba(15,23,42,0.06)] safe-bottom">
      <Tabs defaultValue="text" className="max-w-3xl mx-auto w-full px-4 pt-3">
        <TabsList className="grid grid-cols-3 w-full mb-2.5">
          <TabsTrigger value="text" className="gap-1.5">
            <Type className="h-4 w-4" /> Text
          </TabsTrigger>
          <TabsTrigger value="link" className="gap-1.5">
            <Link2 className="h-4 w-4" /> Link
          </TabsTrigger>
          <TabsTrigger value="file" className="gap-1.5">
            <Paperclip className="h-4 w-4" /> Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-0">
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendTextNote();
              }}
              placeholder="Paste or type anything — it lands on your other device instantly…"
              className="min-h-11 max-h-32 resize-none"
              rows={1}
              aria-label="Text to drop"
            />
            <Button
              onClick={sendTextNote}
              disabled={busy || !text.trim()}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700"
              aria-label="Send text"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="link" className="mt-0">
          <div className="flex items-center gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendLinkItem()}
              placeholder="https://…"
              inputMode="url"
              aria-label="URL to drop"
              className="h-11"
            />
            <Button
              onClick={sendLinkItem}
              disabled={busy || !url.trim()}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700"
              aria-label="Send link"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="file" className="mt-0 pb-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="sr-only"
            id="anydrop-file-input"
            aria-label="Choose files to drop"
          />
          {files.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors flex flex-col items-center justify-center gap-1 text-slate-500"
              aria-label="Pick files to drop"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <ImagePlus className="h-4 w-4" /> Tap to pick files or photos
              </span>
              <span className="text-xs text-slate-400">Up to 25 MB per file · 10 files at once</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="max-h-24 overflow-y-auto anydrop-scroll space-y-1.5">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                    <span className="text-xs text-slate-700 truncate flex-1">{f.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{formatSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-500"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {busy && progress > 0 && <Progress value={progress} className="h-1.5" aria-label="Upload progress" />}
              <div className="flex gap-2">
                <Button
                  onClick={sendFileItems}
                  disabled={busy}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  {busy ? `Uploading ${progress}%` : `Drop ${files.length} file${files.length > 1 ? 's' : ''}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={busy}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

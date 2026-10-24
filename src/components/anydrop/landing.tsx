'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Chrome,
  Copy,
  CornerDownLeft,
  Loader2,
  LogIn,
  QrCode,
  ScanLine,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CODE_RE, createRoom, getRoom } from '@/lib/anydrop-client';
import InstallButton from '@/components/anydrop/install-button';

// Leftovers from a share made before this device was paired (?need_pair=1 redirect).
type ShareNotice = { title?: string; text?: string; url?: string } | null;

export default function Landing({
  onEnter,
  shareNotice,
}: {
  onEnter: (code: string) => void;
  shareNotice?: ShareNotice;
}) {
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { code } = await createRoom();
      onEnter(code);
    } catch (e) {
      toast({ title: 'Could not create a room', description: (e as Error).message, variant: 'destructive' });
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!CODE_RE.test(code)) {
      toast({ title: 'That code does not look right', description: 'A room code is 6 characters, like 7KPQ4M.' });
      return;
    }
    setJoining(true);
    try {
      await getRoom(code);
      onEnter(code);
    } catch (e) {
      toast({ title: 'Room not found', description: (e as Error).message, variant: 'destructive' });
      setJoining(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col bg-white text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            { }
            <img src="/anydrop.svg" alt="AnyDrop logo" className="h-7 w-7" />
            <span className="font-semibold tracking-tight">AnyDrop</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a href="#extension" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">
              Chrome extension
            </a>
            <a href="#how" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">
              How it works
            </a>
            <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              New Drop Room
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-teal-50/50 to-white" aria-hidden="true" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-12 sm:pt-20 sm:pb-16 text-center">
            <Badge variant="outline" className="mb-5 border-emerald-200 bg-white text-emerald-700 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Microsoft retired Edge Drop in Edge 152 — this is its successor, built for Chrome
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              Send anything from your phone
              <br className="hidden sm:block" />{' '}
              to <span className="text-emerald-600">Chrome</span> on your laptop
            </h1>
            <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
              Text, links, files and photos — paired between devices with a 6-character code or a QR scan.
              No account, no cable, no app store. Drops auto-delete after 24 hours.
            </p>

            {/* CTA */}
            <div className="mt-8 max-w-xl mx-auto flex flex-col sm:flex-row items-stretch gap-2.5">
              <Button
                onClick={handleCreate}
                disabled={creating}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Copy className="h-5 w-5" />}
                Create a Drop Room
              </Button>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="ENTER CODE"
                  maxLength={6}
                  aria-label="Room code"
                  className="text-center font-mono tracking-[0.3em] uppercase sm:w-40"
                />
                <Button variant="outline" size="lg" onClick={handleJoin} disabled={joining} aria-label="Join room">
                  {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  Join
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Anyone with the room code can see this room — share it only with your own devices.
            </p>
          </div>
        </section>

        {/* Device flow */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-2 mb-4">
          <div className="flex items-center justify-center gap-3 sm:gap-6 text-slate-500">
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="h-8 w-8" />
              <span className="text-xs font-medium">Phone</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-500">
              <Wifi className="h-5 w-5" />
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Chrome className="h-8 w-8" />
              <span className="text-xs font-medium">Chrome</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 rotate-180">
              <Wifi className="h-5 w-5" />
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="h-8 w-8" />
              <span className="text-xs font-medium">Any device</span>
            </div>
          </div>
        </section>

        {/* Share made before pairing — offer to recover it */}
        {shareNotice && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 mb-4">
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">You shared something to AnyDrop before pairing this device</p>
                <p className="mt-1 leading-relaxed">
                  {shareNotice.url || shareNotice.text
                    ? 'Create or join a room below and we will deliver it automatically to your other devices.'
                    : 'Create or join a room below, then share again.'}{' '}
                  Files from an unpaired share cannot be kept — share them again once you are paired.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section id="how" className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-2xl font-bold tracking-tight text-center">Three steps, ten seconds</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Send,
                step: '1',
                title: 'Create a room',
                body: 'Click "New Drop Room" here, or hit "Create room" in the Chrome extension popup. You get a 6-character code like 7KPQ4M.',
              },
              {
                icon: ScanLine,
                step: '2',
                title: 'Pair your phone',
                body: 'Scan the QR with your phone camera — it opens this site with the room pre-loaded. No QR? Just type the code in the join field above.',
              },
              {
                icon: QrCode,
                step: '3',
                title: 'Drop anything',
                body: 'Paste text, links or pick files and photos on the phone; right-click any selection in Chrome to drop it. Everything appears on every paired device instantly.',
              },
            ].map((s) => (
              <Card key={s.step} className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">STEP {s.step}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Share sheet / PWA */}
        <section id="share" className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 sm:p-10">
            <div className="grid gap-8 sm:grid-cols-2 items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Share2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                  Share to AnyDrop from any app
                </h2>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  Install AnyDrop as an app and it joins your phone&apos;s <strong>share sheet</strong> — exactly
                  how Edge Drop worked. In any app, tap <em>Share</em> → <em>AnyDrop</em>, and the link, text,
                  photo or file flies straight to your room and appears on your laptop.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <CornerDownLeft className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    Android: share from Chrome, Gmail, Photos, YouTube, WhatsApp — any app with a Share button
                  </li>
                  <li className="flex gap-2">
                    <CornerDownLeft className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    Windows: install the app in Chrome and AnyDrop appears in the Windows share dialog too
                  </li>
                  <li className="flex gap-2">
                    <CornerDownLeft className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    Up to 10 files per share (25 MB each), delivered instantly — no re-pairing needed
                  </li>
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <InstallButton />
                  <span className="text-xs text-slate-500">
                    No button? Chrome menu <strong>⋮</strong> → <strong>Add to Home screen</strong> → Install
                  </span>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-sm">How sharing feels</h3>
                <ol className="mt-3 space-y-2.5 text-sm text-slate-700 list-decimal list-inside">
                  <li>
                    Install the app once (button on the left, or Chrome menu → <strong>Add to Home screen</strong>)
                  </li>
                  <li>
                    Open the app and pair your room — the QR code or your 6-character code
                  </li>
                  <li>
                    In any app: tap <strong>Share</strong> → <strong>AnyDrop</strong> → done. It lands on your laptop instantly.
                  </li>
                </ol>
                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  iPhone note: iOS does not let web apps into the share sheet yet. Use <strong>Add to Home
                  Screen</strong> for one-tap access and drop from inside AnyDrop instead.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Extension */}
        <section id="extension" className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 sm:p-10">
            <div className="grid gap-8 sm:grid-cols-2 items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">The Chrome extension</h2>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  Install the AnyDrop extension in Chrome on your laptop and the Drop Room lives right in your
                  toolbar. Drop the current page, drop selected text with a right-click, and get a badge whenever
                  your phone sends something new.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <CornerDownLeft className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    Popup shows the live feed — open links, copy text, download files
                  </li>
                  <li className="flex gap-2">
                    <CornerDownLeft className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    Right-click any selection → "Drop selection to AnyDrop"
                  </li>
                  <li className="flex gap-2">
                    <CornerDownLeft className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    Toolbar badge counts new drops from your phone
                  </li>
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                    <a href="/anydrop-extension.zip" download>
                      <Chrome className="h-4 w-4" />
                      Download extension (.zip)
                    </a>
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-sm">Install in Chrome</h3>
                <ol className="mt-3 space-y-2.5 text-sm text-slate-700 list-decimal list-inside">
                  <li>
                    Download the zip and <strong>unzip</strong> it (folder: <code className="text-xs bg-slate-100 rounded px-1">anydrop-extension</code>)
                  </li>
                  <li>
                    Open <code className="text-xs bg-slate-100 rounded px-1">chrome://extensions</code> in Chrome
                  </li>
                  <li>
                    Enable <strong>Developer mode</strong> (top-right toggle)
                  </li>
                  <li>
                    Click <strong>Load unpacked</strong> and pick the unzipped folder
                  </li>
                  <li>
                    Click the AnyDrop icon → <strong>Create room</strong> → scan the QR with your phone. Done.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Private by design.</strong> Rooms are keyed only by their
              6-character code — there is no sign-up, and nothing is linked to an identity. Drops live for 24
              hours and are then deleted automatically, and you can delete any drop instantly. Think of a room
              code as a one-time shared mailbox between your own devices.
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-100 bg-white safe-bottom">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            { }
            <img src="/anydrop.svg" alt="" className="h-5 w-5" aria-hidden="true" />
            AnyDrop — Edge Drop lives on, now in Chrome.
          </div>
          <p className="text-xs text-slate-400">Drops expire after 24 h · No account · Built with Next.js</p>
        </div>
      </footer>
    </div>
  );
}

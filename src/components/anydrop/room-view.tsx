'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import {
  ArrowLeft,
  Copy,
  Loader2,
  LogOut,
  QrCode,
  RadioTower,
  RefreshCw,
  ScanLine,
  Send,
  Smartphone,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import DropCard from '@/components/anydrop/drop-card';
import Composer from '@/components/anydrop/composer';
import QrScanner from '@/components/anydrop/qr-scanner';
import {
  PublicDrop,
  deleteDrop as apiDeleteDrop,
  getRoom,
  listDrops,
  parseRoomQr,
} from '@/lib/anydrop-client';

const SOCKET_PORT = 3003; // reached via /?XTransformPort=3003 through the gateway

export default function RoomView({
  code,
  onLeave,
  onSwitchRoom,
}: {
  code: string;
  onLeave: () => void;
  onSwitchRoom?: (code: string) => void;
}) {
  const { toast } = useToast();
  const [drops, setDrops] = useState<PublicDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const dropsRef = useRef<PublicDrop[]>([]);
  dropsRef.current = drops;

  useEffect(() => {
    setOrigin(window.location.origin);
    // Auto-open the pairing QR on large screens (that's the laptop that needs to pair a phone),
    // keep it closed on phones to save space.
    setShowQr(window.innerWidth >= 768);
  }, []);

  // Merge helper: add/replace by id, newest first.
  const mergeDrops = useCallback((incoming: PublicDrop[]) => {
    setDrops((prev) => {
      const map = new Map(prev.map((d) => [d.id, d]));
      for (const d of incoming) map.set(d.id, d);
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const fresh = await listDrops(code);
      mergeDrops(fresh);
    } catch {
      // network hiccup — the next tick will retry
    } finally {
      setLoading(false);
    }
  }, [code, mergeDrops]);

  // Initial load + polling safety net (in case the socket gateway is unreachable)
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Realtime via socket.io
  useEffect(() => {
    // NOTE: the room code must live in the URI query — engine.io REPLACES opts.query
    // when the URI already carries one, so `io('/?...&room=CODE')` is the safe pattern.
    const socket = io(`/?XTransformPort=${SOCKET_PORT}&room=${code}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setLive(true);
      // Belt and braces: also join explicitly in case the handshake query was lost.
      socket.emit('join', { room: code });
    });
    socket.on('disconnect', () => setLive(false));
    socket.on('connect_error', () => setLive(false));
    socket.on('room:joined', () => setLive(true));
    socket.on('drop:new', (payload: { drops: PublicDrop[] }) => {
      if (payload?.drops?.length) mergeDrops(payload.drops);
    });
    socket.on('drop:deleted', (payload: { id: string }) => {
      setDrops((prev) => prev.filter((d) => d.id !== payload?.id));
    });

    return () => {
      socket.disconnect();
    };
  }, [code, mergeDrops]);

  const handleDelete = async (id: string) => {
    // optimistic removal
    setDrops((prev) => prev.filter((d) => d.id !== id));
    try {
      await apiDeleteDrop(code, id);
      toast({ title: 'Drop deleted' });
    } catch (e) {
      toast({ title: 'Could not delete', description: (e as Error).message, variant: 'destructive' });
      refresh();
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Room code copied' });
    } catch {}
  };

  const copyServerUrl = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      toast({ title: 'Server URL copied', description: 'Paste it into the AnyDrop extension settings.' });
    } catch {}
  };

  const handleScanned = async (raw: string) => {
    setScannerOpen(false);
    const parsed = parseRoomQr(raw);
    if (!parsed) {
      toast({
        title: 'Not an AnyDrop QR code',
        description: 'Point the camera at the QR shown in the room pairing panel or the extension popup.',
        variant: 'destructive',
      });
      return;
    }
    if (parsed.origin && parsed.origin !== window.location.origin) {
      // The QR belongs to a different AnyDrop server — go there directly.
      window.location.href = parsed.url!;
      return;
    }
    if (parsed.code === code) {
      toast({ title: 'Already in this room' });
      return;
    }
    try {
      await getRoom(parsed.code);
      onSwitchRoom?.(parsed.code);
      toast({ title: `Switched to room ${parsed.code}` });
    } catch (e) {
      toast({ title: 'Room not found', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const roomUrl = origin ? `${origin}/?room=${code}` : '';

  return (
    <div className="h-svh flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onLeave} aria-label="Leave room">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={copyCode}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50 transition-colors"
              aria-label="Copy room code"
              title="Click to copy the room code"
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-400 hidden sm:inline">Room</span>
              <span className="font-mono font-semibold tracking-widest text-sm">{code}</span>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <Badge
              variant={live ? 'default' : 'secondary'}
              className={`gap-1.5 ${live ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
              title={live ? 'Live connection active' : 'Reconnecting…'}
            >
              {live ? <RadioTower className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
              {live ? 'Live' : '…'}
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={refresh}
              aria-label="Refresh drops"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant={showQr ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowQr((v) => !v)}
              aria-label="Toggle pairing QR"
              title="Pair your phone"
            >
              <QrCode className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onLeave} aria-label="Leave room" title="Leave room">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Pairing panel */}
      {showQr && (
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-4">
            {roomUrl && (
               
              <img
                src={`/api/qr?text=${encodeURIComponent(roomUrl)}&size=180`}
                alt={`QR code linking to room ${code}`}
                className="h-[136px] w-[136px] rounded-xl border-4 border-white shadow-sm bg-white"
              />
            )}
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold flex items-center justify-center sm:justify-start gap-2 text-slate-800">
                <Smartphone className="h-4 w-4 text-emerald-600" /> Pair your phone
              </p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Scan the QR with your phone camera, or open{' '}
                <button onClick={copyServerUrl} className="underline decoration-dotted underline-offset-2 font-medium" title="Copy URL">
                  this site
                </button>{' '}
                and type the code{' '}
                <button onClick={copyCode} className="font-mono font-semibold tracking-widest underline decoration-dotted underline-offset-2">
                  {code}
                </button>
                .
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                Chrome extension? Click the AnyDrop icon → paste this site&apos;s address as the server → enter the code.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScannerOpen(true)}
                className="mt-3 bg-white"
                aria-label="Scan a room QR code to connect"
              >
                <ScanLine className="h-4 w-4" />
                Scan to connect
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 self-start sm:self-center shrink-0"
              onClick={() => setShowQr(false)}
              aria-label="Hide pairing panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto anydrop-scroll" aria-label="Dropped items feed">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading drops" />
            </div>
          ) : drops.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Send className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium">Nothing dropped yet</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Send a note, link, file or photo from the composer below — or from the phone you paired. It shows
                up here instantly.
              </p>
            </div>
          ) : (
            drops.map((drop) => <DropCard key={drop.id} drop={drop} onDelete={handleDelete} />)
          )}
        </div>
      </div>

      {/* Composer */}
      <Composer code={code} />

      {/* In-app QR scanner for pairing another screen's code */}
      {scannerOpen && (
        <QrScanner onClose={() => setScannerOpen(false)} onScan={handleScanned} />
      )}
    </div>
  );
}

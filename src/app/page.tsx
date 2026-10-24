'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Landing from '@/components/anydrop/landing';
import RoomView from '@/components/anydrop/room-view';
import { CODE_RE, loadRoom, clearRoom, saveRoom, sendText, sendLink } from '@/lib/anydrop-client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// What the OS share sheet left behind when no room was paired yet
// (set by /api/share via the ?need_pair=1 redirect).
type PendingShare = { title?: string; text?: string; url?: string };

export default function Page() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [shareNotice, setShareNotice] = useState<PendingShare | null>(null);
  const pendingRef = useRef<PendingShare | null>(null);
  const deferredToastRef = useRef<{ title: string; description: string; variant?: 'destructive' } | null>(null);
  const { toast } = useToast();

  // Bootstrap: ?room=CODE (from QR scan) wins, otherwise restore last room.
  // Also handles returns from the OS share target (?shared=N / ?need_pair=1).
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    let code: string | null = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      const urlRoom = sp.get('room')?.toUpperCase();
      const shared = sp.get('shared');
      const skipped = sp.get('skipped');
      const needPair = sp.get('need_pair') === '1';
      const pending: PendingShare = {
        title: sp.get('title') || undefined,
        text: sp.get('text') || undefined,
        url: sp.get('url') || undefined,
      };
      const hasPending = !!(pending.title || pending.text || pending.url);

      if (urlRoom && CODE_RE.test(urlRoom)) {
        saveRoom(urlRoom);
        code = urlRoom;
      } else {
        const stored = loadRoom();
        if (stored && CODE_RE.test(stored)) code = stored;
      }

      if (shared !== null) {
        const n = parseInt(shared, 10) || 0;
        const parts = [`Dropped ${n} item${n === 1 ? '' : 's'} into room ${code || '…'}.`];
        if (skipped) parts.push(`${skipped} item(s) were skipped (over 25 MB or more than 10 files).`);
        // Defer: toasts dispatched during the mount pass land in the toast store before
        // <Toaster> subscribes and would never render. A macrotask is safely post-mount.
        deferredToastRef.current = { title: 'Share delivered', description: parts.join(' ') };
      }

      if (needPair && !code) {
        // Arrived from a share made before this device was paired.
        if (hasPending) {
          pendingRef.current = pending;
          setShareNotice(pending);
        } else {
          setShareNotice({});
        }
      }

      if (urlRoom || shared !== null || needPair || hasPending) {
        history.replaceState({}, '', '/');
      }
    } finally {
      if (code) setRoomCode(code);
      setReady(true);
    }
  }, []);

  // Flush any deferred toast once the app (and <Toaster>) is fully mounted.
  useEffect(() => {
    const t = setTimeout(() => {
      const info = deferredToastRef.current;
      if (info) {
        deferredToastRef.current = null;
        toast(info);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [ready, toast]);

  const enterRoom = useCallback(
    (code: string) => {
      saveRoom(code);
      setRoomCode(code);

      // If the user shared something before pairing, deliver it now.
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = null;
        setShareNotice(null);
        const { url, text, title } = pending;
        (async () => {
          try {
            if (url && /^https?:\/\//i.test(url)) {
              await sendLink(code, url, title || undefined);
            } else if (text) {
              await sendText(code, title ? `${title}\n${text}` : text);
            } else if (title) {
              await sendText(code, title);
            }
            toast({
              title: 'Recovered your share',
              description: `Delivered to room ${code}. It is already visible on your other devices.`,
            });
          } catch (e) {
            toast({
              title: 'Could not deliver the shared item',
              description: (e as Error).message,
              variant: 'destructive',
            });
          }
        })();
      }
    },
    [toast]
  );

  const leaveRoom = useCallback(() => {
    clearRoom();
    setRoomCode(null);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" aria-label="Loading AnyDrop" />
      </div>
    );
  }

  return roomCode ? (
    <RoomView code={roomCode} onLeave={leaveRoom} onSwitchRoom={enterRoom} />
  ) : (
    <Landing onEnter={enterRoom} shareNotice={shareNotice} />
  );
}

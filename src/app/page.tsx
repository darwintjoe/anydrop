'use client';

import { useCallback, useEffect, useState } from 'react';
import Landing from '@/components/anydrop/landing';
import RoomView from '@/components/anydrop/room-view';
import { CODE_RE, loadRoom, clearRoom, saveRoom } from '@/lib/anydrop-client';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Bootstrap: ?room=CODE (from QR scan) wins, otherwise restore last room.
  useEffect(() => {
    try {
      const urlRoom = new URLSearchParams(window.location.search).get('room')?.toUpperCase();
      if (urlRoom && CODE_RE.test(urlRoom)) {
        saveRoom(urlRoom);
        history.replaceState({}, '', '/');
        setRoomCode(urlRoom);
      } else {
        const stored = loadRoom();
        if (stored && CODE_RE.test(stored)) setRoomCode(stored);
      }
    } finally {
      setReady(true);
    }
  }, []);

  const enterRoom = useCallback((code: string) => {
    saveRoom(code);
    setRoomCode(code);
  }, []);

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
    <RoomView code={roomCode} onLeave={leaveRoom} />
  ) : (
    <Landing onEnter={enterRoom} />
  );
}

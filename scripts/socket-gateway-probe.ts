// Probe: connect via Caddy gateway (same as the web app) and test room join + delivery
import { io } from 'socket.io-client';

const ROOM = process.argv[2] || 'U347UX';

// EXACTLY like the web app (room code must be IN the URI — engine.io replaces opts.query)
const socket = io(`http://localhost:81/?XTransformPort=3003&room=${ROOM}`, {
  transports: ['websocket', 'polling'],
  timeout: 8000,
});

socket.on('connect', () => {
  console.log('connected:', socket.id);
  console.log('handshake url query sent: room=' + ROOM);
});
socket.on('room:joined', (d) => {
  console.log('room:joined ->', JSON.stringify(d));
  // Now ask control server for a broadcast and see if it arrives
  setTimeout(async () => {
    const res = await fetch('http://127.0.0.1:3004/internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-anydrop-secret': 'anydrop-internal-7f3a9c' },
      body: JSON.stringify({ room: ROOM, event: 'probe:ping', payload: { hello: 1 } }),
    });
    console.log('broadcast result:', await res.text());
  }, 300);
});
socket.on('probe:ping', (d) => {
  console.log('PASS: probe:ping received:', JSON.stringify(d));
  process.exit(0);
});
socket.on('connect_error', (e) => {
  console.error('connect_error:', e.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('FAIL: timeout — room join or delivery did not happen');
  process.exit(1);
}, 8000);

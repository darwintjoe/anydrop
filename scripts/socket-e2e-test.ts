// E2E realtime test: socket client joins room -> API creates drop -> client receives drop:new
import { io } from 'socket.io-client';

const ROOM = process.argv[2];
if (!ROOM) {
  console.error('usage: bun socket-e2e-test.ts <ROOM>');
  process.exit(1);
}

const socket = io('http://127.0.0.1:3003', {
  query: { room: ROOM },
  transports: ['websocket'],
  timeout: 8000,
});

const timeout = setTimeout(() => {
  console.error('FAIL: no drop:new received within 8s');
  process.exit(1);
}, 8000);

socket.on('connect', async () => {
  console.log('connected, socket id:', socket.id);
  socket.emit('join', { room: ROOM });

  // Wait a beat for room:joined, then create a drop via the Next.js API
  setTimeout(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:3000/api/rooms/${ROOM}/drops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'text', content: 'Realtime chain test ' + Date.now() }),
      });
      console.log('drop created via API:', res.status);
    } catch (e) {
      console.error('API call failed:', e.message);
      process.exit(1);
    }
  }, 500);
});

socket.on('room:joined', (data) => console.log('room:joined', JSON.stringify(data)));

socket.on('drop:new', (payload) => {
  const drop = payload?.drops?.[0];
  if (drop && drop.kind === 'text' && drop.content.startsWith('Realtime chain test')) {
    clearTimeout(timeout);
    console.log('PASS: received drop:new ->', drop.content);
    socket.disconnect();
    process.exit(0);
  }
});

socket.on('connect_error', (e) => {
  console.error('connect_error:', e.message);
  process.exit(1);
});

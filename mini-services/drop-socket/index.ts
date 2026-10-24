import { createServer } from 'http';
import { Server } from 'socket.io';

/**
 * AnyDrop realtime fan-out service.
 *
 * - Socket server: port 3003, path '/' (Caddy forwards /?XTransformPort=3003 here).
 *   Web clients connect with: io('/?XTransformPort=3003', { query: { room: CODE } })
 * - Control server: port 3004 (loopback only, never exposed by the gateway).
 *   The Next.js API POSTs /internal/broadcast here (secret-protected) after each
 *   mutation so every device in the room receives instant updates.
 *   (A separate port is required because socket.io with path '/' intercepts ALL
 *   plain-HTTP requests on 3003.)
 */

const SOCKET_PORT = 3003;
const CONTROL_PORT = 3004;
const INTERNAL_SECRET = 'anydrop-internal-7f3a9c';
const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

// Debug: track active sockets and their handshake queries (via GET /debug on control port)
const activeSockets = new Map<string, { room: string | null; query: Record<string, unknown> }>();

const io = new Server(createServer(), {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
});

io.on('connection', (socket) => {
  // Join the room passed in the handshake query (?room=CODE)
  const query = socket.handshake.query;
  const room = Array.isArray(query.room) ? query.room[0] : query.room;
  activeSockets.set(socket.id, { room: room ?? null, query: query as Record<string, unknown> });

  socket.on('disconnect', () => activeSockets.delete(socket.id));

  if (room && CODE_RE.test(room)) {
    socket.join(room);
    console.log(`[join] socket=${socket.id} room=${room}`);
    socket.emit('room:joined', { room });
  } else {
    console.log(`[join] socket=${socket.id} no valid room in handshake — waiting for 'join' event`);
  }

  // Allow joining after connect too (e.g. user typed a code in the UI)
  socket.on('join', (data: { room?: string }) => {
    const target = data?.room;
    if (target && CODE_RE.test(target)) {
      // Leave previous anydrop rooms to avoid cross-talk
      for (const r of socket.rooms) {
        if (r !== socket.id && CODE_RE.test(r)) socket.leave(r);
      }
      socket.join(target);
      socket.emit('room:joined', { room: target });
      console.log(`[join] socket=${socket.id} switched to room=${target}`);
    } else {
      socket.emit('room:error', { error: 'Invalid room code format' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[leave] socket=${socket.id}`);
  });
});

// ---- Control server (loopback only) ----
const controlServer = createServer((req, res) => {
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  if (req.method === 'POST' && req.url === '/internal/broadcast') {
    if (req.headers['x-anydrop-secret'] !== INTERNAL_SECRET) {
      return json(401, { error: 'Unauthorized' });
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) req.destroy(); // 1 MB guard
    });
    req.on('end', () => {
      try {
        const { room, event, payload } = JSON.parse(body);
        if (typeof room !== 'string' || typeof event !== 'string') {
          return json(400, { error: 'room and event are required' });
        }
        const receivers = io.sockets.adapter.rooms.get(room)?.size ?? 0;
        io.to(room).emit(event, payload);
        console.log(`[broadcast] room=${room} event=${event} receivers=${receivers}`);
        json(200, { ok: true, receivers });
      } catch {
        json(400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (req.url === '/health') {
    return json(200, { ok: true, sockets: io.engine.clientsCount });
  }

  if (req.url === '/debug') {
    return json(200, { sockets: Array.from(activeSockets.entries()) });
  }

  json(404, { error: 'Not found' });
});

io.listen(SOCKET_PORT);
controlServer.listen(CONTROL_PORT, '127.0.0.1', () => {
  console.log(`AnyDrop socket service: sockets on :${SOCKET_PORT}, control on :${CONTROL_PORT}`);
});

process.on('SIGTERM', () => {
  io.close();
  controlServer.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  io.close();
  controlServer.close(() => process.exit(0));
});

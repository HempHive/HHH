import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 8080;
const TTL_MS = 60 * 60 * 1000; // 60 minutes

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(morgan('tiny'));

// In-memory per-room storage with TTL, suitable for ephemeral Railway dynos
// rooms: Map<roomId, Array<{ id, text, ts, readBy: Set<string> }>>
const rooms = new Map();

function gcRoom(roomId) {
  const list = rooms.get(roomId) || [];
  const now = Date.now();
  const fresh = list.filter(m => (now - m.ts) < TTL_MS && !m.expired);
  rooms.set(roomId, fresh);
}

function ensureRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, []);
}

// Helpers
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 2000);
}

// Routes
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Fetch messages, optionally since a timestamp
app.get('/messages', (req, res) => {
  const roomId = (req.query.room || 'public').toString();
  const since = Number(req.query.since) || 0;
  gcRoom(roomId);
  const list = rooms.get(roomId) || [];
  const filtered = since > 0 ? list.filter(m => m.ts > since) : list;
  res.json({
    messages: filtered.map(m => ({ id: m.id, text: m.text, ts: m.ts })),
    now: Date.now(),
    ttlMs: TTL_MS
  });
});

// Post a message
app.post('/messages', (req, res) => {
  const roomId = (req.query.room || 'public').toString();
  ensureRoom(roomId);
  const text = sanitizeText(req.body && req.body.text);
  if (!text) return res.status(400).json({ error: 'text required' });
  const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, ts: Date.now(), readBy: new Set() };
  rooms.get(roomId).push(msg);
  gcRoom(roomId);
  res.status(201).json({ id: msg.id, ts: msg.ts });
});

// Mark as read for a given user/session
app.post('/read', (req, res) => {
  const roomId = (req.query.room || 'public').toString();
  const reader = sanitizeText(req.body && req.body.reader) || 'anon';
  gcRoom(roomId);
  const list = rooms.get(roomId) || [];
  list.forEach(m => { m.readBy.add(reader); });
  res.json({ ok: true });
});

// Optionally purge unread messages older than TTL or all if not read within TTL
// A background GC interval to keep memory in check
setInterval(() => {
  const now = Date.now();
  for (const [roomId, list] of rooms) {
    const fresh = list.filter(m => (now - m.ts) < TTL_MS);
    rooms.set(roomId, fresh);
  }
}, 60 * 1000);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Chat API listening on ${PORT}`);
});



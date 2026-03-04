import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { spawn, exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());
app.use(express.static('public'));

const sessions = new Map();

function safeShell(cmd) {
  const blocked = [/\brm\s+-rf\b/i, /\bmkfs\b/i, /:\(\)\{:\|:&\};:/, /\bshutdown\b/i, /\breboot\b/i];
  if (blocked.some((re) => re.test(cmd))) return false;
  return true;
}

async function runQuick(cmd) {
  try {
    const { stdout, stderr } = await exec(cmd, { timeout: 10000 });
    return { ok: true, stdout, stderr };
  } catch (e) {
    return { ok: false, stdout: e.stdout || '', stderr: e.stderr || e.message };
  }
}

app.get('/api/dashboard', async (_req, res) => {
  const [gateway, claw, uptime] = await Promise.all([
    runQuick('openclaw gateway status'),
    runQuick('openclaw status'),
    runQuick('uptime')
  ]);
  res.json({ gateway, claw, uptime, at: new Date().toISOString() });
});

app.get('/api/sessions', async (_req, res) => {
  const out = await runQuick('openclaw sessions list --limit 20');
  res.json(out);
});

wss.on('connection', (ws) => {
  let current = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', data: 'invalid json' }));
      return;
    }

    if (msg.type === 'run') {
      if (!msg.command || typeof msg.command !== 'string') {
        ws.send(JSON.stringify({ type: 'error', data: 'missing command' }));
        return;
      }
      if (!safeShell(msg.command)) {
        ws.send(JSON.stringify({ type: 'error', data: 'blocked by safety policy' }));
        return;
      }

      if (current) {
        current.kill('SIGTERM');
        current = null;
      }

      const child = spawn('bash', ['-lc', msg.command], {
        cwd: process.cwd(),
        env: process.env
      });
      current = child;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessions.set(id, { cmd: msg.command, startedAt: Date.now() });
      ws.send(JSON.stringify({ type: 'start', data: { id, command: msg.command } }));

      child.stdout.on('data', (d) => ws.send(JSON.stringify({ type: 'stdout', data: d.toString() })));
      child.stderr.on('data', (d) => ws.send(JSON.stringify({ type: 'stderr', data: d.toString() })));
      child.on('close', (code) => {
        ws.send(JSON.stringify({ type: 'exit', data: { code } }));
        current = null;
      });
    }

    if (msg.type === 'stop' && current) {
      current.kill('SIGTERM');
    }
  });

  ws.on('close', () => {
    if (current) current.kill('SIGTERM');
  });
});

const PORT = process.env.PORT || 4173;
server.listen(PORT, () => {
  console.log(`OpenClaw UI running: http://localhost:${PORT}`);
});

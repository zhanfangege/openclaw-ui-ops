import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import pty from 'node-pty';

const exec = promisify(execCb);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const UI_TOKEN = process.env.UI_TOKEN || '';
const AUDIT_PATH = path.join(process.cwd(), 'audit.log');

app.use(express.json());
app.use(express.static('public'));

function authed(req) {
  if (!UI_TOKEN) return true;
  return req.header('x-ui-token') === UI_TOKEN;
}

function audit(event, payload = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...payload });
  fs.appendFile(AUDIT_PATH, `${line}\n`, () => {});
}

function safeShell(cmd) {
  const blocked = [
    /\brm\s+-rf\b/i,
    /\bmkfs\b/i,
    /:\(\)\{:\|:&\};:/,
    /\bshutdown\b/i,
    /\breboot\b/i,
    /\bdd\s+if=/i
  ];
  return !blocked.some((re) => re.test(cmd));
}

async function runQuick(cmd) {
  try {
    const { stdout, stderr } = await exec(cmd, { timeout: 12000 });
    return { ok: true, stdout, stderr };
  } catch (e) {
    return { ok: false, stdout: e.stdout || '', stderr: e.stderr || e.message };
  }
}

app.use((req, res, next) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  next();
});

app.get('/api/dashboard', async (_req, res) => {
  const [gateway, claw, uptime] = await Promise.all([
    runQuick('openclaw gateway status'),
    runQuick('openclaw status'),
    runQuick('uptime')
  ]);
  res.json({ gateway, claw, uptime, at: new Date().toISOString() });
});

app.get('/api/sessions', async (_req, res) => {
  const data = await runQuick('openclaw sessions list --limit 30');
  res.json(data);
});

app.get('/api/subagents', async (_req, res) => {
  const data = await runQuick('openclaw subagents list --recent-minutes 120');
  res.json(data);
});

app.get('/api/audit', async (_req, res) => {
  try {
    const txt = await fs.promises.readFile(AUDIT_PATH, 'utf8');
    const lines = txt.trim().split('\n').slice(-200);
    res.json({ ok: true, lines });
  } catch {
    res.json({ ok: true, lines: [] });
  }
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || '';
  if (UI_TOKEN && token !== UI_TOKEN) {
    ws.send(JSON.stringify({ type: 'error', data: 'unauthorized' }));
    ws.close();
    return;
  }

  let current = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', data: 'invalid json' }));
      return;
    }

    if (msg.type === 'pty-start') {
      const command = msg.command?.trim();
      if (!command) return ws.send(JSON.stringify({ type: 'error', data: 'missing command' }));
      if (!safeShell(command)) return ws.send(JSON.stringify({ type: 'error', data: 'blocked by safety policy' }));

      if (current) {
        current.kill();
        current = null;
      }

      current = pty.spawn('bash', ['-lc', command], {
        name: 'xterm-color',
        cols: 120,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
      });

      audit('command_start', { command, ip: req.socket.remoteAddress || '' });
      ws.send(JSON.stringify({ type: 'start', data: { command } }));

      current.onData((data) => ws.send(JSON.stringify({ type: 'stdout', data })));
      current.onExit(({ exitCode }) => {
        audit('command_exit', { command, exitCode });
        ws.send(JSON.stringify({ type: 'exit', data: { code: exitCode } }));
        current = null;
      });
    }

    if (msg.type === 'pty-input' && current) current.write(msg.data || '');
    if (msg.type === 'pty-resize' && current) current.resize(msg.cols || 120, msg.rows || 30);
    if (msg.type === 'pty-stop' && current) {
      audit('command_stop', {});
      current.kill();
      current = null;
    }
  });

  ws.on('close', () => {
    if (current) current.kill();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`OpenClaw UI running: http://${HOST}:${PORT}`);
  if (UI_TOKEN) console.log('UI_TOKEN auth enabled');
});

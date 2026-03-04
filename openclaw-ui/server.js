import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import pty from 'node-pty';

const app = express();

const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const UI_TOKEN = process.env.UI_TOKEN || '';
const AUDIT_PATH = path.join(process.cwd(), 'audit.log');
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '';

const QUICK_COMMANDS = {
  'gateway-status': { label: 'Gateway 状态', command: 'openclaw gateway status', group: 'Gateway' },
  'gateway-start': { label: 'Gateway 启动', command: 'openclaw gateway start', group: 'Gateway' },
  'gateway-stop': { label: 'Gateway 停止', command: 'openclaw gateway stop', group: 'Gateway' },
  'gateway-restart': { label: 'Gateway 重启', command: 'openclaw gateway restart', group: 'Gateway' },
  'openclaw-status': { label: 'OpenClaw 状态', command: 'openclaw status', group: 'OpenClaw' },
  'sessions-list': { label: 'Sessions 列表', command: 'openclaw sessions list --limit 30', group: 'OpenClaw' },
  'subagents-list': { label: 'Subagents 列表', command: 'openclaw subagents list --recent-minutes 120', group: 'OpenClaw' },
  'doctor': { label: 'OpenClaw Doctor', command: 'openclaw doctor', group: '诊断' }
};

const server = SSL_KEY_PATH && SSL_CERT_PATH
  ? createHttpsServer({
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    }, app)
  : createHttpServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

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

app.use((req, res, next) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  next();
});

app.get('/api/quick-commands', (_req, res) => {
  res.json({ ok: true, commands: QUICK_COMMANDS });
});

app.get('/api/dashboard', async (_req, res) => {
  const command = (key) => QUICK_COMMANDS[key].command;
  const run = (cmd) => new Promise((resolve) => {
    const p = pty.spawn('bash', ['-lc', cmd], { name: 'xterm-color', cols: 120, rows: 30, cwd: process.cwd(), env: process.env });
    let out = '';
    p.onData((d) => { out += d; });
    p.onExit(({ exitCode }) => resolve({ ok: exitCode === 0, output: out, exitCode }));
  });

  const [gateway, claw, uptime] = await Promise.all([
    run(command('gateway-status')),
    run(command('openclaw-status')),
    run('uptime')
  ]);
  res.json({ gateway, claw, uptime, at: new Date().toISOString() });
});

app.get('/api/sessions', async (_req, res) => {
  const cmd = QUICK_COMMANDS['sessions-list'].command;
  const p = pty.spawn('bash', ['-lc', cmd], { name: 'xterm-color', cols: 120, rows: 30, cwd: process.cwd(), env: process.env });
  let out = '';
  p.onData((d) => { out += d; });
  p.onExit(({ exitCode }) => res.json({ ok: exitCode === 0, output: out, exitCode }));
});

app.get('/api/subagents', async (_req, res) => {
  const cmd = QUICK_COMMANDS['subagents-list'].command;
  const p = pty.spawn('bash', ['-lc', cmd], { name: 'xterm-color', cols: 120, rows: 30, cwd: process.cwd(), env: process.env });
  let out = '';
  p.onData((d) => { out += d; });
  p.onExit(({ exitCode }) => res.json({ ok: exitCode === 0, output: out, exitCode }));
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

    if (msg.type === 'quick-run') {
      const key = msg.key;
      const item = QUICK_COMMANDS[key];
      if (!item) return ws.send(JSON.stringify({ type: 'error', data: 'unknown command key' }));

      if (current) {
        current.kill();
        current = null;
      }

      const command = item.command;
      current = pty.spawn('bash', ['-lc', command], {
        name: 'xterm-color',
        cols: 120,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
      });

      audit('command_start', { key, command, ip: req.socket.remoteAddress || '' });
      ws.send(JSON.stringify({ type: 'start', data: { command, key, label: item.label } }));

      current.onData((data) => ws.send(JSON.stringify({ type: 'stdout', data })));
      current.onExit(({ exitCode }) => {
        audit('command_exit', { key, command, exitCode });
        ws.send(JSON.stringify({ type: 'exit', data: { code: exitCode } }));
        current = null;
      });
    }

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
  const proto = SSL_KEY_PATH && SSL_CERT_PATH ? 'https' : 'http';
  console.log(`OpenClaw UI running: ${proto}://${HOST}:${PORT}`);
  if (UI_TOKEN) console.log('UI_TOKEN auth enabled');
});

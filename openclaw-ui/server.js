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
const CMD_TIMEOUT_MS = Number(process.env.CMD_TIMEOUT_MS || 20000);
const CMD_MAX_OUTPUT = Number(process.env.CMD_MAX_OUTPUT || 512000);

const QUICK_COMMANDS = {
  'gateway-status': { label: 'Gateway 状态', command: 'openclaw gateway status', group: 'Gateway' },
  'gateway-start': { label: 'Gateway 启动', command: 'openclaw gateway start', group: 'Gateway' },
  'gateway-stop': { label: 'Gateway 停止', command: 'openclaw gateway stop', group: 'Gateway' },
  'gateway-restart': { label: 'Gateway 重启', command: 'openclaw gateway restart', group: 'Gateway' },
  'openclaw-status': { label: 'OpenClaw 状态', command: 'openclaw status', group: 'OpenClaw' },
  'sessions-list': { label: 'Sessions 列表', command: 'openclaw sessions list --limit 30', group: 'OpenClaw' },
  'subagents-list': { label: 'Subagents 列表', command: 'openclaw subagents list --recent-minutes 120', group: 'OpenClaw' },
  'doctor': { label: 'Doctor 诊断', command: 'openclaw doctor', group: '诊断' },
  'check-update': {
    label: '检查更新',
    command: "bash -lc 'openclaw update --check 2>/dev/null || openclaw upgrade --check 2>/dev/null || (echo update-check-not-supported; openclaw --version)'",
    group: '维护'
  },
  'run-update': {
    label: '执行更新',
    command: "bash -lc 'openclaw update -y 2>/dev/null || openclaw upgrade -y 2>/dev/null || echo update-not-supported-in-this-build'",
    group: '维护'
  }
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

function runCommand(command) {
  return new Promise((resolve) => {
    const p = pty.spawn('bash', ['-lc', command], {
      name: 'xterm-color', cols: 120, rows: 30, cwd: process.cwd(), env: process.env
    });

    let out = '';
    let settled = false;

    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      try { p.kill(); } catch {}
      done({ ok: false, output: out, exitCode: 124, timedOut: true });
    }, CMD_TIMEOUT_MS);

    p.onData((d) => {
      if (out.length < CMD_MAX_OUTPUT) {
        out += d;
        if (out.length > CMD_MAX_OUTPUT) out = out.slice(0, CMD_MAX_OUTPUT);
      }
    });

    p.onExit(({ exitCode }) => {
      done({ ok: exitCode === 0, output: out, exitCode, timedOut: false });
    });
  });
}

function stripAnsi(text = '') {
  const safe = typeof text === 'string' ? text : String(text ?? '');
  return safe.replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '');
}

function countDataRows(text = '') {
  const lines = stripAnsi(text).split('\n').map((x) => x.trim()).filter(Boolean);
  return lines.filter((line) => (
    !/^[-─|+]+$/.test(line)
    && !/^(id|name|status|session|subagent)\b/i.test(line)
  )).length;
}

const apiCache = {
  board: { ts: 0, ttl: 8000, data: null, promise: null },
  alerts: { ts: 0, ttl: 8000, data: null, promise: null }
};

async function withCache(key, producer) {
  const c = apiCache[key];
  const now = Date.now();
  if (c.data && now - c.ts < c.ttl) return c.data;
  if (c.promise) return c.promise;
  c.promise = Promise.resolve().then(producer).then((data) => {
    c.data = data;
    c.ts = Date.now();
    c.promise = null;
    return data;
  }).catch((e) => {
    c.promise = null;
    throw e;
  });
  return c.promise;
}

app.use((req, res, next) => {
  if (!authed(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  next();
});

app.get('/api/quick-commands', (_req, res) => {
  res.json({ ok: true, commands: QUICK_COMMANDS });
});

app.get('/api/board', async (_req, res) => {
  try {
    const data = await withCache('board', async () => {
    const [ver, node, gateway, sessions, subagents, uptime, mem, status, ctx] = await Promise.all([
      runCommand('openclaw --version || openclaw version || echo unknown'),
      runCommand('node -v'),
      runCommand('openclaw gateway status | head -n 30'),
      runCommand('openclaw sessions list --limit 100 || openclaw sessions list'),
      runCommand('openclaw subagents list --recent-minutes 120 || openclaw agents list'),
      runCommand('uptime'),
      runCommand("free -m 2>/dev/null | awk 'NR==2{printf \"%s/%s MB\",$3,$2}' || echo n/a"),
      runCommand('openclaw status | head -n 220'),
      runCommand("bash -lc \"openclaw status --all 2>/dev/null | grep -Eo '[0-9]+(\\.[0-9]+)?[kmg]?/[0-9]+(\\.[0-9]+)?[kmg]? \\\\([^)]*%\\\\)' | head -n1 || true\"")
    ]);

    const sessionsText = stripAnsi(sessions.output);
    const subagentsText = stripAnsi(subagents.output);
    const gatewayText = stripAnsi(gateway.output);
    const statusText = stripAnsi(status.output);

    const ctxText = stripAnsi(ctx.output || '').trim();
    const ctxMatch = statusText.match(/(\d+(?:\.\d+)?[kmg]?\s*\/\s*\d+(?:\.\d+)?[kmg]?\s*\([^\)]*%\))/i)
      || statusText.match(/(\d+(?:\.\d+)?[kmg]?\s*\/\s*\d+(?:\.\d+)?[kmg]?)/i);
    const contextUsage = ctxText || (ctxMatch ? ctxMatch[1].replace(/\s+/g, ' ').trim() : 'n/a');

    const directLine = statusText.split('\n').find((line) => line.includes('agent:main:main')) || '';
    const directCells = directLine.split('│').map((x) => x.trim()).filter(Boolean);
    const currentModel = directCells[3] || ((statusText.match(/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:@-]+/) || [])[0] || 'n/a');
    const sessionKind = directCells[1] || 'direct';
    const cacheRate = ((directCells[4] || '').match(/🗄️\s*\d+%\s*cached/i) || ['n/a'])[0].replace(/\s+/g, ' ');

    const activeSessions = countDataRows(sessionsText);
    const activeSubagents = countDataRows(subagentsText);
    const gatewayUp = /running|online|active|ok/i.test(gatewayText);
    const doctorFlag = /error|failed|critical/i.test(gatewayText) ? 'WARN' : 'OK';

    return {
      ok: true,
      kpi: {
        openclawVersion: stripAnsi(ver.output).trim().split('\n').slice(-1)[0] || 'unknown',
        nodeVersion: stripAnsi(node.output).trim(),
        gatewayStatus: gatewayUp ? 'ONLINE' : 'CHECK',
        sessionsApprox: activeSessions,
        subagentsApprox: activeSubagents,
        uptime: stripAnsi(uptime.output).trim(),
        memory: stripAnsi(mem.output).trim(),
        contextUsage,
        currentModel,
        cacheRate,
        sessionKind,
        health: doctorFlag
      },
      panorama: {
        gateway: gatewayText || 'No gateway status output',
        sessions: sessionsText || 'No sessions running',
        subagents: subagentsText || 'No subagents running',
        status: statusText || 'No openclaw status output'
      }
    };
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || 'board_failed' });
  }
});

app.get('/api/dashboard', async (_req, res) => {
  const [gateway, claw, uptime] = await Promise.all([
    runCommand(QUICK_COMMANDS['gateway-status'].command),
    runCommand(QUICK_COMMANDS['openclaw-status'].command),
    runCommand('uptime')
  ]);
  res.json({ gateway, claw, uptime, at: new Date().toISOString() });
});

app.get('/api/sessions', async (_req, res) => {
  res.json(await runCommand(QUICK_COMMANDS['sessions-list'].command));
});

app.get('/api/subagents', async (_req, res) => {
  res.json(await runCommand(QUICK_COMMANDS['subagents-list'].command));
});

app.get('/api/audit', async (_req, res) => {
  try {
    const txt = await fs.promises.readFile(AUDIT_PATH, 'utf8');
    const lines = txt.trim().split('\n').slice(-120);
    res.json({ ok: true, lines });
  } catch {
    res.json({ ok: true, lines: [] });
  }
});

app.get('/api/metrics', async (_req, res) => {
  try {
    const txt = await fs.promises.readFile(AUDIT_PATH, 'utf8');
    const rows = txt.trim().split('\n').map((x) => {
      try { return JSON.parse(x); } catch { return null; }
    }).filter(Boolean).filter((x) => x.event === 'command_exit').slice(-300);

    const byCommand = new Map();
    const byExit = new Map();

    rows.forEach((r) => {
      const key = r.key || r.command || 'unknown';
      const cur = byCommand.get(key) || { key, count: 0, ok: 0, fail: 0, totalMs: 0, maxMs: 0 };
      const ms = Number(r.durationMs || 0);
      const code = Number(r.exitCode || 0);
      cur.count += 1;
      cur.totalMs += ms;
      cur.maxMs = Math.max(cur.maxMs, ms);
      if (code === 0) cur.ok += 1; else cur.fail += 1;
      byCommand.set(key, cur);

      byExit.set(code, (byExit.get(code) || 0) + 1);
    });

    const commandStats = [...byCommand.values()]
      .map((x) => ({
        ...x,
        avgMs: x.count ? Math.round(x.totalMs / x.count) : 0,
        successRate: x.count ? Math.round((x.ok / x.count) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const slowTop = [...commandStats].sort((a, b) => b.avgMs - a.avgMs).slice(0, 8);
    const errorBreakdown = [...byExit.entries()]
      .map(([exitCode, count]) => ({ exitCode: Number(exitCode), count }))
      .sort((a, b) => b.count - a.count);

    res.json({ ok: true, total: rows.length, commandStats, slowTop, errorBreakdown });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || 'metrics_failed' });
  }
});

app.get('/api/alerts', async (req, res) => {
  const loadWarnRaw = Number(req.query.loadWarn || 8);
  const memWarnRaw = Number(req.query.memWarn || 85);
  const loadWarn = Number.isFinite(loadWarnRaw) ? Math.min(Math.max(loadWarnRaw, 0.1), 100) : 8;
  const memWarn = Number.isFinite(memWarnRaw) ? Math.min(Math.max(memWarnRaw, 1), 100) : 85;
  const cacheKey = `alerts:${loadWarn}:${memWarn}`;
  if (!apiCache[cacheKey]) apiCache[cacheKey] = { ts: 0, ttl: 8000, data: null, promise: null };

  try {
    const data = await withCache(cacheKey, async () => {
    const [gateway, uptime, mem] = await Promise.all([
      runCommand('openclaw gateway status | head -n 20'),
      runCommand('uptime'),
      runCommand("free -m 2>/dev/null | awk 'NR==2{printf \"%s/%s MB\",$3,$2}' || echo n/a")
    ]);

    const gatewayText = stripAnsi(gateway.output);
    const uptimeText = stripAnsi(uptime.output);
    const memText = stripAnsi(mem.output);

    const alerts = [];
    const loadMatch = uptimeText.match(/load average:\s*([0-9.]+)/i);
    const load1 = loadMatch ? Number(loadMatch[1]) : 0;
    const memMatch = memText.match(/(\d+)\/(\d+)\s*MB/i);
    const memPct = memMatch ? (Number(memMatch[1]) / Number(memMatch[2])) * 100 : 0;

    const gatewayUp = /running|online|active|ok/i.test(gatewayText);
    if (!gatewayUp) alerts.push({ level: 'critical', message: 'Gateway 非 ONLINE' });
    if (load1 >= loadWarn) alerts.push({ level: 'warning', message: `系统负载偏高 (${load1.toFixed(2)} >= ${loadWarn})` });
    if (memPct >= memWarn) alerts.push({ level: 'warning', message: `内存占用偏高 (${memPct.toFixed(0)}% >= ${memWarn}%)` });

    if (!alerts.length) alerts.push({ level: 'ok', message: '系统状态正常' });

    let successRate = 100;
    try {
      const txt = await fs.promises.readFile(AUDIT_PATH, 'utf8');
      const rows = txt.trim().split('\n').map((x) => JSON.parse(x)).filter((x) => x.event === 'command_exit').slice(-50);
      if (rows.length) {
        const ok = rows.filter((x) => Number(x.exitCode) === 0).length;
        successRate = Math.round((ok / rows.length) * 100);
      }
    } catch {}

    return { ok: true, alerts, successRate, load1, memPct: Number.isFinite(memPct) ? Math.round(memPct) : 0, thresholds: { loadWarn, memWarn } };
  });

    res.json(data);
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || 'alerts_failed' });
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
      const item = QUICK_COMMANDS[msg.key];
      if (!item) return ws.send(JSON.stringify({ type: 'error', data: 'unknown command key' }));
      if (current) { current.kill(); current = null; }

      const startedAt = Date.now();
      current = pty.spawn('bash', ['-lc', item.command], {
        name: 'xterm-color', cols: 120, rows: 30, cwd: process.cwd(), env: process.env
      });

      audit('command_start', { key: msg.key, command: item.command, ip: req.socket.remoteAddress || '' });
      ws.send(JSON.stringify({ type: 'start', data: { command: item.command, key: msg.key, label: item.label, mode: 'quick' } }));

      current.onData((data) => ws.send(JSON.stringify({ type: 'stdout', data })));
      current.onExit(({ exitCode }) => {
        const durationMs = Date.now() - startedAt;
        audit('command_exit', { key: msg.key, command: item.command, exitCode, durationMs });
        ws.send(JSON.stringify({ type: 'exit', data: { code: exitCode, durationMs } }));
        current = null;
      });
    }

    if (msg.type === 'pty-start-shell') {
      if (current) { current.kill(); current = null; }
      const startedAt = Date.now();
      current = pty.spawn('bash', ['-l'], {
        name: 'xterm-color', cols: 120, rows: 30, cwd: process.cwd(), env: process.env
      });
      audit('shell_start', { ip: req.socket.remoteAddress || '' });
      ws.send(JSON.stringify({ type: 'start', data: { mode: 'shell' } }));
      current.onData((data) => ws.send(JSON.stringify({ type: 'stdout', data })));
      current.onExit(({ exitCode }) => {
        const durationMs = Date.now() - startedAt;
        audit('shell_exit', { exitCode, durationMs });
        ws.send(JSON.stringify({ type: 'exit', data: { code: exitCode, durationMs } }));
        current = null;
      });
    }

    if (msg.type === 'pty-input' && current && typeof msg.data === 'string') {
      current.write(msg.data);
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

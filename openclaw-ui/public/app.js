const $ = (id) => document.getElementById(id);
const tokenEl = $('token');
const autoRefreshEl = $('autoRefresh');
const refreshIntervalEl = $('refreshInterval');
const smartRefreshEl = $('smartRefresh');
const quickWrap = $('quickCommands');
const modelCurrentEl = $('model-current');
const modelContextEl = $('model-context');
const modelCacheEl = $('model-cache');
const modelSessionKindEl = $('model-session-kind');
const trendCanvas = $('trendCanvas');
const boardTimeEl = $('boardTime');
const alertsEl = $('alerts');
const successRateEl = $('successRate');
const loadWarnEl = $('loadWarn');
const memWarnEl = $('memWarn');
const saveThresholdsEl = $('saveThresholds');
const historyBodyEl = $('historyBody');
const historyCountEl = $('historyCount');
const historyAvgEl = $('historyAvg');
const historyTimeoutEl = $('historyTimeout');
const historyOnlyFailEl = $('historyOnlyFail');
const historyOnlySlowEl = $('historyOnlySlow');
const cmdStatsBodyEl = $('cmdStatsBody');
const slowTopBodyEl = $('slowTopBody');
const errBreakdownBodyEl = $('errBreakdownBody');
const term = new window.Terminal({ convertEol: true, cursorBlink: true, disableStdin: false, scrollback: 3000, theme: { background: '#050a15' } });
term.open($('terminal'));

let ws;
let commands = {};
let refreshTimer = null;
let running = false;
let interactiveShell = false;
const trend = [];

function authHeaders() {
  const token = tokenEl.value.trim();
  return token ? { 'x-ui-token': token } : {};
}

term.onData((data) => {
  if (!interactiveShell) return;
  ws?.send(JSON.stringify({ type: 'pty-input', data }));
});

async function loadJson(path) {
  const r = await fetch(path, { headers: authHeaders() });
  return r.json();
}

function getThresholds() {
  const loadWarn = Number(loadWarnEl.value || 8);
  const memWarn = Number(memWarnEl.value || 85);
  return { loadWarn, memWarn };
}

function alertsPath() {
  const { loadWarn, memWarn } = getThresholds();
  return `/api/alerts?loadWarn=${encodeURIComponent(loadWarn)}&memWarn=${encodeURIComponent(memWarn)}`;
}

function setBusy(busy) {
  running = busy;
  [...quickWrap.querySelectorAll('button')].forEach((b) => {
    b.disabled = busy;
    b.classList.toggle('busy', busy);
  });
  startAutoRefresh();
}

function applyKpiClass(id, mode) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('ok', 'warn', 'bad');
  el.classList.add(mode);
}

function renderTrend() {
  const ctx = trendCanvas.getContext('2d');
  const w = trendCanvas.width = trendCanvas.clientWidth;
  const h = trendCanvas.height = 44;
  ctx.clearRect(0, 0, w, h);

  if (trend.length < 2) return;
  const max = Math.max(...trend, 1);
  ctx.strokeStyle = '#35f2ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  trend.forEach((v, i) => {
    const x = (i / (trend.length - 1)) * (w - 8) + 4;
    const y = h - ((v / max) * (h - 10)) - 5;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderQuickCommands() {
  quickWrap.innerHTML = '';
  Object.entries(commands).forEach(([key, item]) => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.textContent = item.label;
    btn.title = item.command;
    btn.onclick = () => {
      if (running) return;
      ws?.send(JSON.stringify({ type: 'quick-run', key }));
    };
    quickWrap.appendChild(btn);
  });
}

function setKpi(id, value) { const el = $(id); if (el) el.textContent = value || '-'; }

function parseModelDetails(statusText = '', fallbackContext = 'n/a') {
  const lines = String(statusText).split('\n');
  const direct = lines.find((l) => /agent:main:main/.test(l)) || '';
  const cells = direct.split('│').map((x) => x.trim()).filter(Boolean);
  const model = cells[3] || ((statusText.match(/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:@-]+/) || [])[0] || 'n/a');
  const tokens = cells[4] || fallbackContext || 'n/a';
  const cache = (tokens.match(/🗄️\s*\d+%\s*cached/i) || ['n/a'])[0].replace(/\s+/g, ' ');
  const kind = cells[1] || 'direct';
  return { model, tokens, cache, kind, raw: lines.slice(0, 20).join('\n') };
}

function setAndScroll(id, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = String(text || '');
  el.scrollTop = el.scrollHeight;
}

function msLabel(ms) {
  const n = Number(ms || 0);
  if (!Number.isFinite(n) || n <= 0) return '-';
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

function safeParseJsonLine(line) {
  try { return JSON.parse(line); } catch { return null; }
}

function renderHistory(lines = []) {
  if (!historyBodyEl) return;

  const rows = lines
    .map(safeParseJsonLine)
    .filter(Boolean)
    .filter((x) => x.event === 'command_exit')
    .slice(-80)
    .reverse();

  const onlyFail = !!historyOnlyFailEl?.checked;
  const onlySlow = !!historyOnlySlowEl?.checked;
  const filtered = rows.filter((r) => {
    if (onlyFail && Number(r.exitCode) === 0) return false;
    if (onlySlow && Number(r.durationMs || 0) < 5000) return false;
    return true;
  });

  const avgMs = filtered.length
    ? Math.round(filtered.reduce((s, r) => s + Number(r.durationMs || 0), 0) / filtered.length)
    : 0;
  const timeoutCount = filtered.filter((r) => Number(r.exitCode) === 124).length;

  historyCountEl.textContent = String(filtered.length);
  historyAvgEl.textContent = msLabel(avgMs);
  historyTimeoutEl.textContent = String(timeoutCount);

  historyBodyEl.innerHTML = '';
  filtered.slice(0, 40).forEach((r) => {
    const tr = document.createElement('tr');
    const ts = new Date(r.ts || Date.now()).toLocaleTimeString();
    const cmd = String(r.command || r.key || '-').slice(0, 84);
    const ok = Number(r.exitCode) === 0;
    tr.innerHTML = `<td>${ts}</td><td title="${cmd.replace(/"/g, '&quot;')}">${cmd}</td><td class="${ok ? 'ok' : 'bad'}">${ok ? 'OK' : `ERR(${r.exitCode})`}</td><td>${msLabel(r.durationMs)}</td>`;
    historyBodyEl.appendChild(tr);
  });
}

function renderMetrics(metrics = {}) {
  if (!cmdStatsBodyEl || !slowTopBodyEl || !errBreakdownBodyEl) return;

  cmdStatsBodyEl.innerHTML = '';
  slowTopBodyEl.innerHTML = '';
  errBreakdownBodyEl.innerHTML = '';

  (metrics.commandStats || []).slice(0, 10).forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.key}</td><td>${r.successRate}%</td><td>${msLabel(r.avgMs)}</td><td>${r.count}</td>`;
    cmdStatsBodyEl.appendChild(tr);
  });

  (metrics.slowTop || []).slice(0, 8).forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.key}</td><td>${msLabel(r.avgMs)}</td><td>${msLabel(r.maxMs)}</td>`;
    slowTopBodyEl.appendChild(tr);
  });

  (metrics.errorBreakdown || []).slice(0, 8).forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.exitCode}</td><td>${r.count}</td>`;
    errBreakdownBodyEl.appendChild(tr);
  });
}

async function loadAll() {
  const [quick, board, alerts, audit, metrics] = await Promise.all([
    loadJson('/api/quick-commands'),
    loadJson('/api/board'),
    loadJson(alertsPath()),
    loadJson('/api/audit'),
    loadJson('/api/metrics')
  ]);

  commands = quick.commands || {};
  renderQuickCommands();

  setAndScroll('gateway', (board.panorama?.gateway || 'No gateway status output').trim());
  setAndScroll('claw', (board.panorama?.status || 'No openclaw status output').trim());
  setAndScroll('sessions', (board.panorama?.sessions || 'No sessions running').trim());
  setAndScroll('subagents', (board.panorama?.subagents || 'No subagents running').trim());

  const modelInfo = parseModelDetails(board.panorama?.status || '', board.kpi?.contextUsage || 'n/a');
  modelCurrentEl.textContent = board.kpi?.currentModel || modelInfo.model;
  modelContextEl.textContent = board.kpi?.contextUsage || modelInfo.tokens;
  modelCacheEl.textContent = board.kpi?.cacheRate || modelInfo.cache;
  modelSessionKindEl.textContent = board.kpi?.sessionKind || modelInfo.kind;

  setKpi('kpi-openclaw', board.kpi?.openclawVersion);
  setKpi('kpi-node', board.kpi?.nodeVersion);
  setKpi('kpi-gateway', board.kpi?.gatewayStatus);
  setKpi('kpi-sessions', board.kpi?.sessionsApprox);
  setKpi('kpi-subagents', board.kpi?.subagentsApprox);
  setKpi('kpi-uptime', board.kpi?.uptime?.slice(0, 24));
  setKpi('kpi-context', board.kpi?.contextUsage);
  setKpi('kpi-memory', board.kpi?.memory);
  setKpi('kpi-health', board.kpi?.health);

  applyKpiClass('kpi-card-gateway', board.kpi?.gatewayStatus === 'ONLINE' ? 'ok' : 'bad');
  applyKpiClass('kpi-card-sessions', Number(board.kpi?.sessionsApprox) > 0 ? 'ok' : 'warn');
  applyKpiClass('kpi-card-subagents', Number(board.kpi?.subagentsApprox) > 0 ? 'ok' : 'warn');
  applyKpiClass('kpi-card-health', board.kpi?.health === 'OK' ? 'ok' : 'warn');
  applyKpiClass('kpi-card-openclaw', 'ok');
  applyKpiClass('kpi-card-node', 'ok');
  applyKpiClass('kpi-card-uptime', 'ok');
  applyKpiClass('kpi-card-context', board.kpi?.contextUsage && board.kpi?.contextUsage !== 'n/a' ? 'ok' : 'warn');
  applyKpiClass('kpi-card-memory', 'ok');

  const activity = Number(board.kpi?.sessionsApprox || 0) + Number(board.kpi?.subagentsApprox || 0);
  trend.push(activity);
  if (trend.length > 40) trend.shift();
  renderTrend();

  alertsEl.innerHTML = '';
  (alerts.alerts || []).forEach((a) => {
    const chip = document.createElement('span');
    chip.className = `alert-chip ${a.level || 'ok'}`;
    chip.textContent = a.message;
    alertsEl.appendChild(chip);
  });
  successRateEl.textContent = `${alerts.successRate ?? 100}%`;
  renderHistory(audit.lines || []);
  renderMetrics(metrics || {});

  boardTimeEl.textContent = new Date().toLocaleTimeString();
}

function syncRefreshUi() {
  refreshIntervalEl.disabled = smartRefreshEl.checked;
}

function currentRefreshSec() {
  if (smartRefreshEl.checked) return running ? 10 : 60;
  return Number(refreshIntervalEl.value || 10);
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (!autoRefreshEl.checked) return;
  const sec = currentRefreshSec();
  refreshTimer = setInterval(() => {
    loadAll().catch(() => {});
  }, sec * 1000);
}

function connectWs() {
  if (ws) ws.close();
  const token = encodeURIComponent(tokenEl.value.trim());
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${token}`);
  ws.onopen = () => term.writeln('\x1b[32m[ws connected]\x1b[0m');
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'stdout') {
      term.write(msg.data);
      term.scrollToBottom();
    }
    if (msg.type === 'start') {
      interactiveShell = msg.data?.mode === 'shell';
      setBusy(true);
      if (interactiveShell) {
        term.writeln(`\r\n\x1b[36m[interactive shell connected]\x1b[0m`);
      } else {
        term.writeln(`\r\n\x1b[36m$ ${msg.data.command}\x1b[0m`);
      }
      term.scrollToBottom();
    }
    if (msg.type === 'exit') {
      interactiveShell = false;
      setBusy(false);
      term.writeln(`\r\n\x1b[33m[exit ${msg.data.code}]\x1b[0m`);
      term.scrollToBottom();
      loadAll().catch(() => {});
    }
    if (msg.type === 'error') {
      setBusy(false);
      term.writeln(`\r\n\x1b[31m[error] ${msg.data}\x1b[0m`);
      term.scrollToBottom();
    }
  };
}

$('refresh').onclick = async () => { connectWs(); await loadAll(); };
$('startShell').onclick = () => {
  if (running) return;
  ws?.send(JSON.stringify({ type: 'pty-start-shell' }));
};
$('sendCtrlC').onclick = () => {
  ws?.send(JSON.stringify({ type: 'pty-input', data: '\u0003' }));
};
$('stop').onclick = () => ws?.send(JSON.stringify({ type: 'pty-stop' }));
autoRefreshEl.onchange = () => startAutoRefresh();
smartRefreshEl.onchange = () => {
  localStorage.setItem('smart-refresh-enabled', smartRefreshEl.checked ? '1' : '0');
  syncRefreshUi();
  startAutoRefresh();
};
refreshIntervalEl.onchange = () => {
  localStorage.setItem('refresh-interval-sec', String(refreshIntervalEl.value || '10'));
  startAutoRefresh();
};

saveThresholdsEl.onclick = async () => {
  localStorage.setItem('alert-thresholds', JSON.stringify(getThresholds()));
  await loadAll();
};

historyOnlyFailEl.onchange = () => {
  localStorage.setItem('history-only-fail', historyOnlyFailEl.checked ? '1' : '0');
  loadAll().catch(() => {});
};
historyOnlySlowEl.onchange = () => {
  localStorage.setItem('history-only-slow', historyOnlySlowEl.checked ? '1' : '0');
  loadAll().catch(() => {});
};

try {
  const saved = JSON.parse(localStorage.getItem('alert-thresholds') || '{}');
  if (saved.loadWarn) loadWarnEl.value = saved.loadWarn;
  if (saved.memWarn) memWarnEl.value = saved.memWarn;
} catch {}

try {
  const sec = localStorage.getItem('refresh-interval-sec');
  if (sec && ['10', '30', '60'].includes(sec)) refreshIntervalEl.value = sec;
} catch {}

try {
  const smart = localStorage.getItem('smart-refresh-enabled');
  if (smart === '0') smartRefreshEl.checked = false;
} catch {}

try {
  historyOnlyFailEl.checked = localStorage.getItem('history-only-fail') === '1';
  historyOnlySlowEl.checked = localStorage.getItem('history-only-slow') === '1';
} catch {}

connectWs();
loadAll();
syncRefreshUi();
startAutoRefresh();
window.addEventListener('resize', renderTrend);

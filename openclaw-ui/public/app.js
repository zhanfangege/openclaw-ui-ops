const $ = (id) => document.getElementById(id);
const tokenEl = $('token');
const autoRefreshEl = $('autoRefresh');
const quickWrap = $('quickCommands');
const trendCanvas = $('trendCanvas');
const boardTimeEl = $('boardTime');
const alertsEl = $('alerts');
const successRateEl = $('successRate');
const term = new window.Terminal({ convertEol: true, cursorBlink: true, disableStdin: true, theme: { background: '#050a15' } });
term.open($('terminal'));

let ws;
let commands = {};
let refreshTimer = null;
let running = false;
const trend = [];

function authHeaders() {
  const token = tokenEl.value.trim();
  return token ? { 'x-ui-token': token } : {};
}

async function loadJson(path) {
  const r = await fetch(path, { headers: authHeaders() });
  return r.json();
}

function setBusy(busy) {
  running = busy;
  [...quickWrap.querySelectorAll('button')].forEach((b) => {
    b.disabled = busy;
    b.classList.toggle('busy', busy);
  });
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

async function loadAll() {
  const [dash, sessions, subagents, quick, board, alerts] = await Promise.all([
    loadJson('/api/dashboard'),
    loadJson('/api/sessions'),
    loadJson('/api/subagents'),
    loadJson('/api/quick-commands'),
    loadJson('/api/board'),
    loadJson('/api/alerts')
  ]);

  commands = quick.commands || {};
  renderQuickCommands();

  $('gateway').textContent = `${dash.gateway?.ok ? '✅' : '❌'}\n${(board.panorama?.gateway || dash.gateway?.output || '').trim()}`;
  $('claw').textContent = `${dash.claw?.ok ? '✅' : '❌'}\n${dash.claw?.output || ''}`;
  $('sessions').textContent = (board.panorama?.sessions || sessions.output || 'No sessions running').trim();
  $('subagents').textContent = (board.panorama?.subagents || subagents.output || 'No subagents running').trim();

  setKpi('kpi-openclaw', board.kpi?.openclawVersion);
  setKpi('kpi-node', board.kpi?.nodeVersion);
  setKpi('kpi-gateway', board.kpi?.gatewayStatus);
  setKpi('kpi-sessions', board.kpi?.sessionsApprox);
  setKpi('kpi-subagents', board.kpi?.subagentsApprox);
  setKpi('kpi-uptime', board.kpi?.uptime?.slice(0, 24));
  setKpi('kpi-memory', board.kpi?.memory);
  setKpi('kpi-health', board.kpi?.health);

  applyKpiClass('kpi-card-gateway', board.kpi?.gatewayStatus === 'ONLINE' ? 'ok' : 'bad');
  applyKpiClass('kpi-card-sessions', Number(board.kpi?.sessionsApprox) > 0 ? 'ok' : 'warn');
  applyKpiClass('kpi-card-subagents', Number(board.kpi?.subagentsApprox) > 0 ? 'ok' : 'warn');
  applyKpiClass('kpi-card-health', board.kpi?.health === 'OK' ? 'ok' : 'warn');
  applyKpiClass('kpi-card-openclaw', 'ok');
  applyKpiClass('kpi-card-node', 'ok');
  applyKpiClass('kpi-card-uptime', 'ok');
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

  boardTimeEl.textContent = new Date().toLocaleTimeString();
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (!autoRefreshEl.checked) return;
  refreshTimer = setInterval(() => {
    if (!running) loadAll().catch(() => {});
  }, 10000);
}

function connectWs() {
  if (ws) ws.close();
  const token = encodeURIComponent(tokenEl.value.trim());
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${token}`);
  ws.onopen = () => term.writeln('\x1b[32m[ws connected]\x1b[0m');
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'stdout') term.write(msg.data);
    if (msg.type === 'start') {
      setBusy(true);
      term.writeln(`\r\n\x1b[36m$ ${msg.data.command}\x1b[0m`);
    }
    if (msg.type === 'exit') {
      setBusy(false);
      term.writeln(`\r\n\x1b[33m[exit ${msg.data.code}]\x1b[0m`);
      loadAll().catch(() => {});
    }
    if (msg.type === 'error') {
      setBusy(false);
      term.writeln(`\r\n\x1b[31m[error] ${msg.data}\x1b[0m`);
    }
  };
}

$('refresh').onclick = async () => { connectWs(); await loadAll(); };
$('stop').onclick = () => ws?.send(JSON.stringify({ type: 'pty-stop' }));
autoRefreshEl.onchange = () => startAutoRefresh();

connectWs();
loadAll();
startAutoRefresh();
window.addEventListener('resize', renderTrend);

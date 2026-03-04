const $ = (id) => document.getElementById(id);
const tokenEl = $('token');
const quickWrap = $('quickCommands');
const term = new window.Terminal({ convertEol: true, cursorBlink: true, disableStdin: true, theme: { background: '#050a15' } });
term.open($('terminal'));

let ws;
let commands = {};

function authHeaders() {
  const token = tokenEl.value.trim();
  return token ? { 'x-ui-token': token } : {};
}

async function loadJson(path) {
  const r = await fetch(path, { headers: authHeaders() });
  return r.json();
}

function renderQuickCommands() {
  quickWrap.innerHTML = '';
  Object.entries(commands).forEach(([key, item]) => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.textContent = item.label;
    btn.title = item.command;
    btn.onclick = () => ws?.send(JSON.stringify({ type: 'quick-run', key }));
    quickWrap.appendChild(btn);
  });
}

async function loadAll() {
  const [dash, sessions, subagents, audit, quick] = await Promise.all([
    loadJson('/api/dashboard'),
    loadJson('/api/sessions'),
    loadJson('/api/subagents'),
    loadJson('/api/audit'),
    loadJson('/api/quick-commands')
  ]);

  commands = quick.commands || {};
  renderQuickCommands();

  $('gateway').textContent = `${dash.gateway?.ok ? '✅' : '❌'}\n${dash.gateway?.output || ''}`;
  $('claw').textContent = `${dash.claw?.ok ? '✅' : '❌'}\n${dash.claw?.output || ''}`;
  $('uptime').textContent = dash.uptime?.output || '';
  $('sessions').textContent = sessions.output || '';
  $('subagents').textContent = subagents.output || '';
  $('audit').textContent = (audit.lines || []).join('\n');
}

function connectWs() {
  if (ws) ws.close();
  const token = encodeURIComponent(tokenEl.value.trim());
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${token}`);
  ws.onopen = () => term.writeln('\x1b[32m[ws connected]\x1b[0m');
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'stdout') term.write(msg.data);
    if (msg.type === 'start') term.writeln(`\r\n\x1b[36m$ ${msg.data.command}\x1b[0m`);
    if (msg.type === 'exit') term.writeln(`\r\n\x1b[33m[exit ${msg.data.code}]\x1b[0m`);
    if (msg.type === 'error') term.writeln(`\r\n\x1b[31m[error] ${msg.data}\x1b[0m`);
  };
}

$('refresh').onclick = async () => {
  connectWs();
  await loadAll();
};

$('stop').onclick = () => ws?.send(JSON.stringify({ type: 'pty-stop' }));

connectWs();
loadAll();

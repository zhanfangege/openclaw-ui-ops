const $ = (id) => document.getElementById(id);
const tokenEl = $('token');
const term = new window.Terminal({ convertEol: true, cursorBlink: true, theme: { background: '#050a15' } });
term.open($('terminal'));

let ws;

function authHeaders() {
  const token = tokenEl.value.trim();
  return token ? { 'x-ui-token': token } : {};
}

async function loadJson(path) {
  const r = await fetch(path, { headers: authHeaders() });
  return r.json();
}

async function loadAll() {
  const [dash, sessions, subagents, audit] = await Promise.all([
    loadJson('/api/dashboard'),
    loadJson('/api/sessions'),
    loadJson('/api/subagents'),
    loadJson('/api/audit')
  ]);

  $('gateway').textContent = `${dash.gateway?.ok ? '✅' : '❌'}\n${dash.gateway?.stdout || dash.gateway?.stderr || ''}`;
  $('claw').textContent = `${dash.claw?.ok ? '✅' : '❌'}\n${dash.claw?.stdout || dash.claw?.stderr || ''}`;
  $('uptime').textContent = dash.uptime?.stdout || dash.uptime?.stderr || '';
  $('sessions').textContent = sessions.stdout || sessions.stderr || JSON.stringify(sessions, null, 2);
  $('subagents').textContent = subagents.stdout || subagents.stderr || JSON.stringify(subagents, null, 2);
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

$('run').onclick = () => {
  const command = $('cmd').value.trim();
  if (!command || !ws) return;
  ws.send(JSON.stringify({ type: 'pty-start', command }));
};
$('stop').onclick = () => ws?.send(JSON.stringify({ type: 'pty-stop' }));

term.onData((data) => ws?.send(JSON.stringify({ type: 'pty-input', data })));
window.addEventListener('resize', () => {
  ws?.send(JSON.stringify({ type: 'pty-resize', cols: 120, rows: 30 }));
});

connectWs();
loadAll();

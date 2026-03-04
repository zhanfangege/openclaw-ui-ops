const $ = (id) => document.getElementById(id);
const gatewayEl = $('gateway');
const clawEl = $('claw');
const uptimeEl = $('uptime');
const termEl = $('terminal');

async function loadDashboard() {
  const res = await fetch('/api/dashboard');
  const data = await res.json();
  gatewayEl.textContent = `${data.gateway.ok ? '✅' : '❌'}\n${data.gateway.stdout || data.gateway.stderr}`;
  clawEl.textContent = `${data.claw.ok ? '✅' : '❌'}\n${data.claw.stdout || data.claw.stderr}`;
  uptimeEl.textContent = `${data.uptime.stdout || data.uptime.stderr}`;
}

$('refresh').onclick = loadDashboard;

const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);

function append(line) {
  termEl.textContent += line;
  termEl.scrollTop = termEl.scrollHeight;
}

ws.onopen = () => append('> terminal connected\n');
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'start') append(`\n$ ${msg.data.command}\n`);
  if (msg.type === 'stdout') append(msg.data);
  if (msg.type === 'stderr') append(msg.data);
  if (msg.type === 'exit') append(`\n[exit ${msg.data.code}]\n`);
  if (msg.type === 'error') append(`\n[error] ${msg.data}\n`);
};

$('run').onclick = () => {
  const command = $('cmd').value.trim();
  if (!command) return;
  ws.send(JSON.stringify({ type: 'run', command }));
};

$('stop').onclick = () => ws.send(JSON.stringify({ type: 'stop' }));

loadDashboard();

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const lessonsFile = path.join(root, 'memory', 'lessons.jsonl');
if (!fs.existsSync(lessonsFile)) {
  console.log('No lessons.jsonl found.');
  process.exit(0);
}

const now = Date.now();
const weekMs = 7 * 24 * 3600 * 1000;
const lines = fs.readFileSync(lessonsFile, 'utf8').split('\n').filter(Boolean);
const rows = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const recent = rows.filter((r) => {
  const t = new Date(r.ts || 0).getTime();
  return Number.isFinite(t) && (now - t <= weekMs);
});

const total = recent.length;
const success = recent.filter((r) => String(r.result).toLowerCase() === 'success').length;
const fail = total - success;
const byErr = {};
for (const r of recent) {
  const k = r.error_type || 'none';
  byErr[k] = (byErr[k] || 0) + 1;
}

console.log('=== Weekly KPI ===');
console.log(`Tasks: ${total}`);
console.log(`Success: ${success}`);
console.log(`Fail: ${fail}`);
console.log(`Success rate: ${total ? Math.round((success/total)*100) : 0}%`);
console.log('Error distribution:', byErr);

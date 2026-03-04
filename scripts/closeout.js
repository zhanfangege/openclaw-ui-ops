#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function arg(name, def = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] || '') : def;
}

const now = new Date();
const ts = now.toISOString();
const day = ts.slice(0, 10);
const root = process.cwd();
const memoryDir = path.join(root, 'memory');
const dayFile = path.join(memoryDir, `${day}.md`);
const lessonsFile = path.join(memoryDir, 'lessons.jsonl');

if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });
if (!fs.existsSync(dayFile)) fs.writeFileSync(dayFile, `# ${day}\n\n`);
if (!fs.existsSync(lessonsFile)) fs.writeFileSync(lessonsFile, '');

const entry = {
  ts,
  task_type: arg('taskType', 'other'),
  context: arg('context', ''),
  result: arg('result', 'success'),
  error_type: arg('errorType', 'none'),
  fix: arg('fix', ''),
  reuse_condition: arg('reuse', ''),
  confidence: Number(arg('confidence', '0.8'))
};

fs.appendFileSync(lessonsFile, `${JSON.stringify(entry)}\n`);

const md = [
  `- Task: ${arg('task', '(unspecified task)')}`,
  `- Decision: ${arg('decision', '(not provided)')}`,
  `- Current status: ${arg('status', entry.result)}`,
  `- Next step: ${arg('next', '(none)')}`,
  `- Blockers: ${arg('blockers', '无。')}`,
  ''
].join('\n');

fs.appendFileSync(dayFile, md);
console.log(`[closeout] updated ${lessonsFile} and ${dayFile}`);

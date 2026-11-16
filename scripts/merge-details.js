const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'source', 'terms.json');
const buildScript = path.join(repoRoot, 'scripts', 'build-data.js');

function fail(message) {
  console.error('merge-details: ' + message);
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  fail('用法: node scripts/merge-details.js <details.json>\n输入格式：{"术语":"详解"}、[{"term":"术语","detail":"详解"}]，或 App 导出的备份 JSON');
}
if (!fs.existsSync(inputPath)) fail('找不到输入文件 ' + inputPath);

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
  fail('输入文件不是合法 JSON：' + e.message);
}

let entries;
if (input && input.data && input.data.overrides && typeof input.data.overrides === 'object') {
  entries = Object.keys(input.data.overrides)
    .filter((term) => Object.prototype.hasOwnProperty.call(input.data.overrides[term] || {}, 'detail'))
    .map((term) => ({ term: term.trim(), detail: String(input.data.overrides[term].detail == null ? '' : input.data.overrides[term].detail) }));
} else if (Array.isArray(input)) {
  entries = input.map((item) => ({
    term: item && String(item.term == null ? '' : item.term).trim(),
    detail: item && item.detail != null ? String(item.detail) : ''
  }));
} else if (input && typeof input === 'object') {
  entries = Object.keys(input).map((term) => ({ term: term.trim(), detail: String(input[term] == null ? '' : input[term]) }));
} else {
  fail('输入格式必须是对象或数组');
}
if (!entries.length) fail('输入为空');

let source;
try {
  source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
} catch (e) {
  fail('源数据不是合法 JSON：' + e.message);
}
if (!Array.isArray(source)) fail('源数据必须是数组');

const byTerm = new Map(source.map((card) => [card.term, card]));
const missing = [];
let updated = 0;
entries.forEach((entry) => {
  if (!entry.term) return;
  const card = byTerm.get(entry.term);
  if (!card) { missing.push(entry.term); return; }
  const detail = entry.detail.trim();
  if ((card.detail || '') !== detail) {
    card.detail = detail;
    updated++;
  }
});
if (missing.length) {
  fail('以下术语在源数据中不存在：' + missing.join('、'));
}

fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + '\n', 'utf8');
console.log('merge-details: 更新 ' + updated + ' 条详解');

execFileSync(process.execPath, [buildScript], { stdio: 'inherit' });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'source', 'terms.json');
const outDir = path.join(repoRoot, 'www', 'data');
const cardsOut = path.join(outDir, 'cards.json');
const indexOut = path.join(outDir, 'index.json');
const detailsDir = path.join(outDir, 'details');

function normalizeTerm(value) {
  return String(value == null ? '' : value).toLowerCase().replace(/[\s_\-·:：()（）]/g, '');
}

function fail(message) {
  console.error('build-data: ' + message);
  process.exit(1);
}

function readSource() {
  if (!fs.existsSync(sourcePath)) fail('找不到源文件 ' + sourcePath);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  } catch (e) {
    fail('源文件不是合法 JSON：' + e.message);
  }
  if (!Array.isArray(raw)) fail('源文件必须是卡片数组');
  if (!raw.length) fail('源文件为空');
  return raw;
}

function cleanCard(card, index) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    fail('第 ' + (index + 1) + ' 项不是对象');
  }
  const term = String(card.term == null ? '' : card.term).trim();
  const category = String(card.category == null ? '' : card.category).trim();
  const def = String(card.def == null ? '' : card.def).trim();
  if (!term) fail('第 ' + (index + 1) + ' 项缺少 term');
  if (!category) fail('术语「' + term + '」缺少 category');
  if (!def) fail('术语「' + term + '」缺少 def');
  return {
    term: term,
    category: category,
    def: def,
    code: card.code ? String(card.code).trim() : '',
    literal: card.literal ? String(card.literal).trim() : '',
    phonetic: card.phonetic ? String(card.phonetic).trim() : '',
    detail: card.detail ? String(card.detail).trim() : ''
  };
}

function main() {
  const raw = readSource();
  const seen = new Map();
  const cards = raw.map((item, index) => {
    const card = cleanCard(item, index);
    const key = normalizeTerm(card.term);
    if (!key) fail('术语「' + card.term + '」规范化后为空');
    if (seen.has(key)) {
      fail('术语重复：「' + card.term + '」与第 ' + (seen.get(key) + 1) + ' 项「' + raw[seen.get(key)].term + '」');
    }
    seen.set(key, index);
    return card;
  });

  const categoryOrder = [];
  const byCategory = new Map();
  cards.forEach((card) => {
    if (!byCategory.has(card.category)) {
      byCategory.set(card.category, []);
      categoryOrder.push(card.category);
    }
    byCategory.get(card.category).push(card);
  });

  fs.rmSync(detailsDir, { recursive: true, force: true });
  fs.mkdirSync(detailsDir, { recursive: true });

  const metadata = [];
  const categoryIndex = [];
  categoryOrder.forEach((category, i) => {
    const list = byCategory.get(category);
    const detailMap = {};
    list.forEach((card) => {
      metadata.push({
        term: card.term,
        category: card.category,
        def: card.def,
        code: card.code,
        literal: card.literal,
        phonetic: card.phonetic,
        hasDetail: !!card.detail
      });
      if (card.detail) detailMap[card.term] = card.detail;
    });
    let detailFile = null;
    if (Object.keys(detailMap).length) {
      const name = 'details/' + String(i + 1).padStart(2, '0') + '.json';
      fs.writeFileSync(path.join(outDir, name), JSON.stringify(detailMap) + '\n', 'utf8');
      detailFile = name;
    }
    categoryIndex.push({ name: category, count: list.length, detailFile: detailFile });
  });

  const version = crypto.createHash('sha1').update(JSON.stringify(cards)).digest('hex').slice(0, 12);
  const index = {
    app: 'java-suji-data',
    version: version,
    total: metadata.length,
    cardsFile: 'cards.json',
    categories: categoryIndex
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(cardsOut, JSON.stringify(metadata) + '\n', 'utf8');
  fs.writeFileSync(indexOut, JSON.stringify(index, null, 2) + '\n', 'utf8');

  const detailCount = metadata.filter((c) => c.hasDetail).length;
  console.log('build-data: ' + metadata.length + ' 张卡片，' + categoryIndex.length + ' 个分类，' + detailCount + ' 张有详解');
  console.log('build-data: version ' + version);
  console.log('build-data: 输出 ' + path.relative(repoRoot, outDir));
}

main();

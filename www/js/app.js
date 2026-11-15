(function () {
  const CUSTOM_KEY = 'java-suji-custom';
  const DELETED_KEY = 'java-suji-deleted';
  const OVERRIDES_KEY = 'java-suji-overrides';
  const AI_KEY = 'java-suji-deepseek-key';
  const AI_HISTORY = 'java-suji-ai-history';
  const MODEL_KEY = 'java-suji-model';
  const ENGINE_KEY = 'java-suji-tts-engine';
  const CUSTOM_API_KEY = 'java-suji-custom-api';
  const PRESET_MODELS = ['deepseek-flash', 'deepseek-v4-pro'];
  const AI_ADD_SYSTEM = '你是 Java 术语卡片生成助手，根据用户描述生成学习卡片。必须只输出一个 JSON 数组，不要输出任何其他文字、解释或 markdown 代码块标记。数组每项格式：{"term":"术语名","category":"分类名","def":"一句话中文解释","code":"代码示例","literal":"字面义","phonetic":"音标"}。term 和 def 必填，code、literal、phonetic 可选，没有就省略该字段。def 用中文、准确简洁，code 给简短 Java 示例。分类名尽量复用常见分类（如 集合框架、并发与多线程、JVM 与内存、Spring 核心、数据库与 SQL 等）。';

  const $ = (sel) => document.querySelector(sel);

  // ---------- 数据 ----------
  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; }
    catch { return []; }
  }
  function saveCustom(list) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); }

  function getDeleted() {
    try { return JSON.parse(localStorage.getItem(DELETED_KEY)) || []; }
    catch { return []; }
  }
  function saveDeleted(list) { localStorage.setItem(DELETED_KEY, JSON.stringify(list)); }

  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {}; }
    catch { return {}; }
  }
  function saveOverrides(o) { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); }

  function allCards() {
    const deleted = new Set(getDeleted());
    const overrides = getOverrides();
    const builtin = window.JAVA_TERMS
      .filter((c) => !deleted.has(c.term))
      .map((c) => ({ ...c, ...(overrides[c.term] || {}), isCustom: false }));
    const custom = loadCustom().map((c) => ({ ...c, isCustom: true }));
    return builtin.concat(custom).map((c, i) => ({
      ...c,
      key: c.category + '|' + c.term + '|' + i
    }));
  }

  function deleteCard(card) {
    if (card.isCustom) {
      saveCustom(loadCustom().filter((x) => !(x.term === card.term && x.category === card.category)));
    } else {
      const deleted = getDeleted();
      if (!deleted.includes(card.term)) deleted.push(card.term);
      saveDeleted(deleted);
    }
  }

  function updateCard(card, patch) {
    if (card.isCustom) {
      saveCustom(loadCustom().map((x) =>
        (x.term === card.term && x.category === card.category) ? { ...x, ...patch } : x));
    } else {
      const o = getOverrides();
      o[card.term] = { ...(o[card.term] || {}), ...patch };
      saveOverrides(o);
    }
  }

  function categories() {
    const set = new Set(allCards().map((c) => c.category));
    return Array.from(set);
  }

  function exportData() {
    const data = {
      app: 'java-suji',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        custom: loadCustom(),
        deleted: getDeleted(),
        overrides: getOverrides()
      }
    };
    const json = JSON.stringify(data, null, 2);
    const filename = 'shibei-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    if (window.AndroidNative && typeof window.AndroidNative.exportData === 'function') {
      window.AndroidNative.exportData(json, filename);
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        const d = (obj && obj.data) || obj;
        if (d.custom) saveCustom(d.custom);
        if (d.deleted) saveDeleted(d.deleted);
        if (d.overrides) saveOverrides(d.overrides);
        refreshCategorySelects();
        updateProgressText();
        renderList();
        buildStudy($('#studyCategory').value);
        alert('导入成功');
      } catch (e) {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
  }

  // ---------- 学习（浏览） ----------
  let studyCards = [];
  let studyIndex = 0;
  let studyFlipped = false;
  let currentStudyCard = null;

  function buildStudy(category, startKey) {
    studyCards = allCards().filter((c) => !category || c.category === category);
    if (startKey) {
      const idx = studyCards.findIndex((c) => c.key === startKey);
      studyIndex = idx >= 0 ? idx : 0;
    } else {
      studyIndex = 0;
    }
    studyFlipped = false;
    renderStudy();
  }

  function renderStudy() {
    const cardEl = $('#card');
    if (studyCards.length === 0) {
      currentStudyCard = null;
      $('#studyEmpty').hidden = false;
      cardEl.style.visibility = 'hidden';
      $('.swipe-hint').style.visibility = 'hidden';
      $('#studyPos').textContent = '0 / 0';
      return;
    }
    if (studyIndex >= studyCards.length) studyIndex = 0;
    $('#studyEmpty').hidden = true;
    cardEl.style.visibility = 'visible';
    $('.swipe-hint').style.visibility = 'visible';
    cardEl.classList.toggle('flipped', studyFlipped);

    const c = studyCards[studyIndex];
    currentStudyCard = c;
    $('#cardTag').textContent = c.category;
    $('#cardTerm').textContent = c.term;
    $('#cardPhonetic').textContent = c.phonetic || '';
    $('#cardPhonetic').style.display = c.phonetic ? '' : 'none';
    $('#cardTagBack').textContent = c.category;
    $('#cardTermBack').textContent = c.term;
    $('#cardLiteral').textContent = c.literal || '';
    $('#cardLiteral').style.display = c.literal ? '' : 'none';
    $('#cardDef').textContent = c.def;
    $('#cardCode').textContent = c.code || '';

    $('#studyPos').textContent = (studyIndex + 1) + ' / ' + studyCards.length;
  }

  function nextCard() {
    if (studyCards.length === 0) return;
    studyIndex = (studyIndex + 1) % studyCards.length;
    renderStudy();
  }

  function prevCard() {
    if (studyCards.length === 0) return;
    studyIndex = (studyIndex - 1 + studyCards.length) % studyCards.length;
    renderStudy();
  }

  function speakTextForTerm(term) {
    let t = term.replace(/^@/, '').replace(/[-_]/g, ' ').trim();
    if (/[\u4e00-\u9fff]/.test(t)) return t;
    if (/^[A-Z][A-Z0-9]*$/.test(t)) return t.split('').join(' ');
    t = t.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
         .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return t;
  }

  function speakTerm(text) {
    const toSay = speakTextForTerm(text);
    const zh = /[\u4e00-\u9fff]/.test(toSay);
    if (window.AndroidNative && typeof window.AndroidNative.speak === 'function') {
      const r = window.AndroidNative.speak(toSay, zh ? 'zh' : 'en');
      if (r && r !== 'ok') {
        if (r === 'no_engine') {
          if (confirm('未检测到语音引擎，是否去下载 Google 文字转语音？')) {
            window.AndroidNative.openTtsDownload();
          }
        } else {
          alert('TTS 状态：' + r);
        }
      }
      return;
    }
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(toSay);
    u.lang = zh ? 'zh-CN' : 'en-US';
    const voices = synth.getVoices();
    const match = voices.find((v) => v.lang === u.lang) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(zh ? 'zh' : 'en'));
    if (match) u.voice = match;
    u.rate = 0.9;
    synth.speak(u);
  }

  function openSheet() {
    const body = $('#sheetBody');
    body.innerHTML = '';
    studyCards.forEach((c, i) => {
      const item = document.createElement('div');
      item.className = 'sheet-item' + (i === studyIndex ? ' current' : '');
      item.innerHTML = '<span class="sheet-term">' + c.term + '</span>' +
        (c.phonetic ? '<span class="sheet-phonetic">' + c.phonetic + '</span>' : '') +
        '<span class="sheet-pos">' + (i + 1) + '</span>';
      item.addEventListener('click', () => {
        studyIndex = i;
        closeSheet();
        renderStudy();
      });
      body.appendChild(item);
    });
    $('#sheetBackdrop').classList.add('open');
  }

  function closeSheet() {
    $('#sheetBackdrop').classList.remove('open');
  }

  function openDetail() {
    const c = studyCards[studyIndex];
    if (!c) return;
    $('#detailTag').textContent = c.category;
    $('#detailTerm').textContent = c.term;
    $('#detailPhonetic').textContent = c.phonetic || '';
    $('#detailPhonetic').style.display = c.phonetic ? '' : 'none';
    $('#detailLiteral').textContent = c.literal || '';
    $('#detailLiteral').style.display = c.literal ? '' : 'none';
    $('#detailDef').textContent = c.def;
    $('#detailCode').textContent = c.code || '';
    $('#detailCode').style.display = c.code ? '' : 'none';
    $('#detailBackdrop').classList.add('open');
  }

  function closeDetail() {
    $('#detailBackdrop').classList.remove('open');
  }

  // ---------- 设置 ----------
  let settingsTimer = null;
  function showSettingsBtn() {
    $('#settingsBtn').classList.add('settings-show');
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(() => {
      $('#settingsBtn').classList.remove('settings-show');
    }, 5000);
  }

  function openSettings() {
    loadEngineList();
    loadCustomApi();
    $('#settingsDialog').hidden = false;
    $('#settingsBtn').classList.remove('settings-show');
  }

  function closeSettings() {
    $('#settingsDialog').hidden = true;
  }

  function modelOpt(value, text) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  }

  function fillModelSelect(models, current) {
    const sel = $('#customModelSelect');
    sel.innerHTML = '';
    sel.appendChild(modelOpt('__manual__', '手动输入...'));
    models.forEach((m) => sel.appendChild(modelOpt(m, m)));
    if (current && current !== '__manual__') {
      if (!models.includes(current)) sel.appendChild(modelOpt(current, current));
      sel.value = current;
      $('#customModelInput').hidden = true;
    } else {
      sel.value = '__manual__';
      $('#customModelInput').hidden = false;
      $('#customModelInput').value = (current && current !== '__manual__') ? current : '';
    }
  }

  function getCustomModel() {
    const sel = $('#customModelSelect');
    return sel.value === '__manual__' ? $('#customModelInput').value.trim() : sel.value;
  }

  async function fetchModels() {
    const baseUrl = $('#customBaseUrl').value.trim();
    const apiKey = $('#customApiKey').value.trim();
    if (!baseUrl || !apiKey) { alert('请先填写 Base URL 和 API Key'); return; }
    const url = baseUrl.replace(/\/+$/, '') + '/models';
    try {
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + apiKey } });
      const data = await res.json();
      const models = (data.data || []).map((m) => m.id).filter(Boolean);
      if (models.length === 0) { alert('未获取到模型列表'); return; }
      fillModelSelect(models, getCustomModel());
      alert('已获取 ' + models.length + ' 个模型');
    } catch (e) {
      alert('获取模型失败：' + e.message);
    }
  }

  function loadCustomApi() {
    const c = localStorage.getItem(CUSTOM_API_KEY);
    let model = '';
    if (c) {
      try {
        const obj = JSON.parse(c);
        $('#customBaseUrl').value = obj.baseUrl || '';
        $('#customApiKey').value = obj.apiKey || '';
        model = obj.model || '';
      } catch (e) {}
    } else {
      $('#customBaseUrl').value = '';
      $('#customApiKey').value = '';
    }
    fillModelSelect([], model);
  }

  function loadEngineList() {
    const sel = $('#ttsEngineSelect');
    const saved = localStorage.getItem(ENGINE_KEY) || 'default';
    sel.innerHTML = '';
    const opts = [['default', '默认引擎']];
    if (window.AndroidNative && window.AndroidNative.getEnginesList) {
      try {
        const list = window.AndroidNative.getEnginesList();
        list.split('\n').forEach((line) => {
          const parts = line.split('|');
          if (parts.length === 2 && parts[0]) {
            opts.push([parts[0], parts[1]]);
          }
        });
      } catch (e) {}
    }
    opts.forEach((arr) => {
      const o = document.createElement('option');
      o.value = arr[0];
      o.textContent = arr[1];
      sel.appendChild(o);
    });
    sel.value = saved;
  }

  // ---------- AI 助手 ----------
  let aiHistory = [];

  function loadAiHistory() {
    try { aiHistory = JSON.parse(localStorage.getItem(AI_HISTORY)) || []; }
    catch { aiHistory = []; }
  }
  function saveAiHistory() { localStorage.setItem(AI_HISTORY, JSON.stringify(aiHistory)); }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    const codeBlocks = [];
    html = html.replace(/```[^\n]*\n?([\s\S]*?)```/g, (m, code) => {
      const i = codeBlocks.length;
      codeBlocks.push(code.trim());
      return '@@CB' + i + '@@';
    });
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?:^\|.+\|\s*$\n?)+/gm, (match) => {
      const lines = match.trim().split('\n');
      if (lines.length < 2) return match;
      const parseRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      let out = '<table class="md-table"><thead><tr>';
      parseRow(lines[0]).forEach((c) => { out += '<th>' + c + '</th>'; });
      out += '</tr></thead><tbody>';
      for (let i = 1; i < lines.length; i++) {
        if (/^\|[\s:\-|]+\|$/.test(lines[i])) continue;
        out += '<tr>';
        parseRow(lines[i]).forEach((c) => { out += '<td>' + c + '</td>'; });
        out += '</tr>';
      }
      out += '</tbody></table>';
      return out;
    });
    html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^[-*] (.*)$/gm, '• $1');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/@@CB(\d+)@@/g, (m, i) => '<pre class="md-code">' + codeBlocks[Number(i)] + '</pre>');
    return html;
  }

  function renderAiMessages() {
    const box = $('#aiMessages');
    box.innerHTML = '';
    const visible = aiHistory.filter((m) => {
      if (m.role === 'system') return false;
      if (m.role === 'assistant' && parseToolCall(m.content)) return false;
      return true;
    });
    if (visible.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ai-empty';
      empty.textContent = '还没有对话，输入问题开始提问';
      box.appendChild(empty);
      return;
    }
    visible.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'ai-msg ' + m.role;
      if (m.role === 'assistant') {
        div.innerHTML = renderMarkdown(m.content);
      } else {
        div.textContent = m.content;
      }
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  }

  function clearAiHistory() {
    aiHistory = [];
    localStorage.removeItem(AI_HISTORY);
    renderAiMessages();
  }

  function openAi() {
    loadAiHistory();
    renderAiMessages();
    fillAiModel();
    $('#aiBackdrop').classList.add('open');
    $('#fabAi').classList.add('open');
  }

  function closeAi() {
    $('#aiBackdrop').classList.remove('open');
    $('#fabAi').classList.remove('open');
  }

  function openAiKey() {
    const key = localStorage.getItem(AI_KEY);
    const status = $('#aiKeyStatus');
    const delBtn = $('#aiKeyDelete');
    if (key) {
      status.textContent = '已保存 Key：' + key.slice(0, 6) + '…' + key.slice(-4);
      status.hidden = false;
      delBtn.hidden = false;
    } else {
      status.hidden = true;
      delBtn.hidden = true;
    }
    $('#aiKeyDialog').hidden = false;
  }
  function closeAiKey() { $('#aiKeyDialog').hidden = true; }

  function getModel() { return localStorage.getItem(MODEL_KEY) || 'deepseek-flash'; }

  function getApiConfig() {
    const custom = localStorage.getItem(CUSTOM_API_KEY);
    if (custom) {
      try {
        const c = JSON.parse(custom);
        if (c.baseUrl && c.apiKey && c.model) {
          return { baseUrl: c.baseUrl, apiKey: c.apiKey, model: c.model };
        }
      } catch (e) {}
    }
    return { baseUrl: 'https://api.deepseek.com', apiKey: localStorage.getItem(AI_KEY) || '', model: getModel() };
  }

  function fillAiModel() {
    const sel = $('#aiModel');
    const cur = getModel();
    const list = Array.from(new Set(PRESET_MODELS.concat([cur])));
    sel.innerHTML = '';
    list.forEach((m) => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m;
      sel.appendChild(o);
    });
    sel.value = cur;
  }

  function buildAiSystemPrompt() {
    let p = '你是 Java 学习助手，用简洁准确的中文解释 Java/后端相关概念，必要时附代码示例。';
    if (currentStudyCard) {
      p += '\n\n【当前卡片（用户此刻正在学习，以此为准）】术语「' + currentStudyCard.term + '」（分类：' + currentStudyCard.category + '），解释：「' + currentStudyCard.def + '」' +
        (currentStudyCard.code ? '，代码示例：「' + currentStudyCard.code + '」' : '') +
        '。即使用户在之前的对话里提过别的卡片，现在提到「当前卡片」「这张卡」「这个/它」时，一律指上面这张卡。';
    }
    const cats = categories();
    if (cats.length) {
      p += '\n\n卡片库现有分类（用户说的「列表」「分类」指的就是这些）：' + cats.join('、') + '。';
    }
    p += '\n\n【可用工具】当用户要求执行操作时，只输出一个 JSON 对象（不要任何其他文字，也不要先用文字回答）：' +
      '\n- 列出卡片：{"action":"list_cards"}（列出全部）或 {"action":"list_cards","category":"分类名"}（列出某分类）' +
      '\n- 查询卡片：{"action":"search_card","query":"用户完整查询意图"}' +
      '\n- 添加卡片：{"action":"add_card","term":"术语","def":"解释","category":"分类","code":"代码","literal":"字面义","phonetic":"音标"}' +
      '\n- 删除卡片：{"action":"delete_card","term":"术语"}（单个）；{"action":"delete_card","terms":["术语1","术语2"]}（批量）；{"action":"delete_card","category":"分类名"}（整个分类）；{"action":"delete_card","categories":["分类1","分类2"]}（多个分类）；{"action":"delete_card"}（全部）' +
      '\n- 修改卡片：{"action":"rebuild_card","term":"术语","instruction":"修改要求"}（也可用 terms / category / categories 批量）' +
      '\n若用户只是提问、没有要求操作，就正常用文字回答。';
    return p;
  }

  async function callAi(messages) {
    const cfg = getApiConfig();
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model, messages: messages, stream: false })
    });
    const data = await res.json();
    if (!(data.choices && data.choices[0] && data.choices[0].message)) {
      throw new Error((data.error && data.error.message) || '未知错误');
    }
    return data.choices[0].message.content;
  }

  function extractJsonObjects(text) {
    const objs = [];
    let i = 0;
    const n = text.length;
    while (i < n) {
      while (i < n && text[i] !== '{') i++;
      if (i >= n) break;
      let depth = 0;
      let inStr = false;
      let escape = false;
      const start = i;
      for (; i < n; i++) {
        const ch = text[i];
        if (inStr) {
          if (escape) escape = false;
          else if (ch === '\\') escape = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') { inStr = true; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try { objs.push(JSON.parse(text.slice(start, i + 1))); } catch (e) {}
            i++;
            break;
          }
        }
      }
    }
    return objs;
  }

  function parseToolCalls(content) {
    return extractJsonObjects(content).filter((o) => o && o.action);
  }

  function parseToolCall(content) {
    const calls = parseToolCalls(content);
    return calls.length >= 1 ? calls[0] : null;
  }

  function extractJsonObject(text) {
    let t = text.trim();
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) t = m[1].trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) t = t.slice(start, end + 1);
    return t;
  }

  async function generateRebuild(card, instruction) {
    const sys = '你是 Java 术语卡片编辑。根据用户的修改要求，输出一个 JSON 对象，只包含需要修改的字段（可能是其中一个或几个），字段名：category（分类）、def（解释）、code（代码示例）、literal（字面义）、phonetic（音标）。只输出 JSON，不要其他文字。';
    const userContent = JSON.stringify({
      卡片: { term: card.term, category: card.category, def: card.def, code: card.code || '', literal: card.literal || '', phonetic: card.phonetic || '' },
      用户要求: instruction || '重新改写解释，使其更通俗准确'
    });
    const content = await callAi([
      { role: 'system', content: sys },
      { role: 'user', content: userContent }
    ]);
    let obj;
    try { obj = JSON.parse(extractJsonObject(content)); } catch (e) { return null; }
    if (!obj) return null;
    const patch = {};
    if (obj.category !== undefined) patch.category = String(obj.category).trim();
    if (obj.def !== undefined) patch.def = String(obj.def).trim();
    if (obj.code !== undefined) patch.code = String(obj.code).trim();
    if (obj.literal !== undefined) patch.literal = String(obj.literal).trim();
    if (obj.phonetic !== undefined) patch.phonetic = String(obj.phonetic).trim();
    if (Object.keys(patch).length === 0) return null;
    return patch;
  }

  function resolveTargets(tool) {
    if (tool.categories && tool.categories.length) {
      const cats = tool.categories.map((c) => String(c).trim());
      return allCards().filter((c) => cats.some((cat) => c.category === cat || c.category.includes(cat) || cat.includes(c.category)));
    }
    if (tool.category) {
      const cat = String(tool.category).trim();
      let r = allCards().filter((c) => c.category === cat);
      if (r.length === 0) r = allCards().filter((c) => c.category.includes(cat) || cat.includes(c.category));
      return r;
    }
    const terms = (tool.terms && tool.terms.length) ? tool.terms : (tool.term ? [tool.term] : []);
    if (terms.length > 0) {
      const found = [];
      terms.forEach((t) => {
        const c = allCards().find((x) => x.term.toLowerCase() === String(t).toLowerCase());
        if (c && !found.some((f) => f.term === c.term)) found.push(c);
      });
      return found;
    }
    return allCards();
  }

  async function executeTool(tool) {
    const action = tool.action;

    if (action === 'list_cards') {
      let cards = allCards();
      if (tool.category) {
        const cat = String(tool.category).trim();
        cards = allCards().filter((c) => c.category === cat || c.category.includes(cat) || cat.includes(c.category));
      }
      if (cards.length === 0) return '卡片库是空的';
      return '共 ' + cards.length + ' 张卡片：\n' + cards.map((c) => '[' + c.term + ']（' + c.category + '）').join('\n');
    }

    if (action === 'search_card') {
      const q = String(tool.query || '').trim();
      if (!q) return '查询为空';
      const cards = allCards();
      const lib = cards.map((c) => '[' + c.term + ']（' + c.category + '）' + (c.def || '').slice(0, 60)).join('\n');
      const subSys = '你是卡片检索助手。根据用户查询，从下面的卡片库中找出相关卡片。注意：只能从下面列出的卡片里选，绝不能添加或编造库里不存在的卡片。返回 JSON 数组，每项 {"term":"术语","category":"分类","def":"解释"}，最多 10 条，没有则返回 []。只输出 JSON，不要其他文字。\n卡片库：\n' + lib;
      const content = await callAi([
        { role: 'system', content: subSys },
        { role: 'user', content: q }
      ]);
      let arr;
      try { arr = JSON.parse(extractJson(content)); } catch (e) { return '查询失败（检索未返回有效结果）'; }
      if (!Array.isArray(arr) || arr.length === 0) return '未找到相关卡片';
      const found = [];
      arr.forEach((c) => {
        if (!c || !c.term) return;
        const real = cards.find((x) => x.term.toLowerCase() === String(c.term).toLowerCase());
        if (real && !found.some((f) => f.term === real.term)) found.push(real);
      });
      if (found.length === 0) return '未找到相关卡片';
      return '找到 ' + found.length + ' 张相关卡片：\n' +
        found.map((c, i) => (i + 1) + '. [' + c.term + ']（' + c.category + '）' + c.def).join('\n');
    }

    if (action === 'delete_card') {
      const found = resolveTargets(tool);
      if (found.length === 0) return '未找到要删除的卡片';
      if (!confirm('确定删除以下 ' + found.length + ' 张卡片？\n' + found.slice(0, 20).map((c) => '· ' + c.term).join('\n') + (found.length > 20 ? '\n…' : ''))) return '用户取消了删除';
      found.forEach((c) => deleteCard(c));
      refreshCategorySelects();
      updateProgressText();
      studyCards = studyCards.filter((c) => !found.some((f) => f.term === c.term));
      if (studyIndex >= studyCards.length) studyIndex = Math.max(0, studyCards.length - 1);
      renderStudy();
      renderList();
      return '已删除 ' + found.length + ' 张卡片';
    }

    if (action === 'rebuild_card') {
      const targets = resolveTargets(tool);
      if (targets.length === 0) return '未找到要修改的卡片';
      if (!confirm('将修改 ' + targets.length + ' 张卡片：\n' + targets.slice(0, 20).map((c) => '· ' + c.term).join('\n') + (targets.length > 20 ? '\n…' : '') + '\n\n要求：' + (tool.instruction || '重写解释'))) return '用户取消了修改';
      let ok = 0;
      for (const c of targets) {
        const patch = await generateRebuild(c, tool.instruction);
        if (patch) { updateCard(c, patch); ok++; }
      }
      refreshCategorySelects();
      updateProgressText();
      const curCat = $('#studyCategory').value;
      const curTerm = currentStudyCard ? currentStudyCard.term : null;
      studyCards = allCards().filter((c) => !curCat || c.category === curCat);
      if (curTerm) {
        const idx = studyCards.findIndex((c) => c.term === curTerm);
        if (idx >= 0) studyIndex = idx;
      }
      renderStudy();
      renderList();
      return '已修改 ' + ok + ' 张卡片';
    }

    return '未知工具：' + action;
  }

  async function askAi(question) {
    if (!question.trim()) return;
    const key = localStorage.getItem(AI_KEY);
    if (!key) { openAiKey(); return; }

    aiHistory.push({ role: 'user', content: question.trim() });
    saveAiHistory();
    renderAiMessages();

    const box = $('#aiMessages');
    const pending = document.createElement('div');
    pending.className = 'ai-msg assistant';
    pending.textContent = '思考中…';
    box.appendChild(pending);
    box.scrollTop = box.scrollHeight;

    try {
      let content = await callAi([{ role: 'system', content: buildAiSystemPrompt() }, ...aiHistory]);

      for (let round = 0; round < 4; round++) {
        const calls = parseToolCalls(content);
        if (calls.length === 0) break;
        const results = [];

        const adds = calls.filter((t) => t.action === 'add_card');
        const others = calls.filter((t) => t.action !== 'add_card');

        if (adds.length > 0) {
          const valid = adds.map((t) => validateCards([{
            term: t.term, category: t.category, def: t.def, code: t.code, literal: t.literal, phonetic: t.phonetic
          }])[0]).filter(Boolean);
          if (valid.length === 0) {
            results.push('添加失败：缺少 term 或 def');
          } else if (confirm('将添加 ' + valid.length + ' 张卡片：\n' + valid.map((c) => '· ' + c.term + '（' + c.category + '）').join('\n'))) {
            saveCustom(loadCustom().concat(valid));
            refreshCategorySelects();
            updateProgressText();
            results.push('已添加 ' + valid.length + ' 张卡片');
          } else {
            results.push('用户取消了添加');
          }
        }

        for (const tool of others) {
          results.push(await executeTool(tool));
        }

        aiHistory.push({ role: 'assistant', content: content });
        aiHistory.push({ role: 'system', content: '[工具执行结果] ' + results.join('；') });
        content = await callAi([{ role: 'system', content: buildAiSystemPrompt() }, ...aiHistory]);
      }

      pending.remove();
      aiHistory.push({ role: 'assistant', content: content });
      saveAiHistory();
      renderAiMessages();
    } catch (e) {
      pending.remove();
      aiHistory.push({ role: 'assistant', content: '请求出错：' + e.message + '\n（若为跨域 CORS 错误，需加后端代理）' });
      saveAiHistory();
      renderAiMessages();
    }
  }

  // ---------- AI 添加卡片 ----------
  function extractJson(text) {
    let t = text.trim();
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) t = m[1].trim();
    const start = t.indexOf('[');
    const end = t.lastIndexOf(']');
    if (start >= 0 && end > start) t = t.slice(start, end + 1);
    return t;
  }

  function validateCards(arr) {
    const out = [];
    (Array.isArray(arr) ? arr : []).forEach((c) => {
      if (!c || typeof c !== 'object') return;
      if (!c.term || !c.def) return;
      out.push({
        term: String(c.term).trim(),
        category: String(c.category || '自定义').trim(),
        def: String(c.def).trim(),
        code: c.code ? String(c.code).trim() : '',
        literal: c.literal ? String(c.literal).trim() : '',
        phonetic: c.phonetic ? String(c.phonetic).trim() : ''
      });
    });
    return out;
  }

  function refreshCategorySelects() {
    fillCategorySelect($('#studyCategory'), true);
    fillCategorySelect($('#listCategory'), true);
  }

  function addCardsToStore(cards, clearAfter) {
    if (cards.length === 0) return;
    saveCustom(loadCustom().concat(cards));
    refreshCategorySelects();
    alert('已添加 ' + cards.length + ' 张卡片');
    if (clearAfter) $('#aiAddResult').innerHTML = '';
  }

  function renderAiAddResult(cards) {
    const box = $('#aiAddResult');
    box.innerHTML = '';
    if (cards.length === 0) {
      box.innerHTML = '<div class="empty">AI 没有生成有效卡片，请换一种描述重试</div>';
      return;
    }
    const toolbar = document.createElement('div');
    toolbar.className = 'ai-add-toolbar';
    toolbar.innerHTML = '<label class="ai-add-selectall"><input type="checkbox" id="aiAddSelectAll" checked> 全选</label>' +
      '<button class="btn btn-primary btn-sm" id="aiAddBatch">批量添加所选</button>';
    box.appendChild(toolbar);

    const list = document.createElement('div');
    list.className = 'ai-add-list';
    cards.forEach((c, i) => {
      const item = document.createElement('div');
      item.className = 'ai-add-item';
      item.innerHTML =
        '<div class="ai-add-item-top">' +
          '<input type="checkbox" class="ai-add-check" data-i="' + i + '" checked>' +
          '<span class="li-tag">' + c.category + '</span>' +
          '<button class="ai-add-one" data-i="' + i + '">单个添加</button>' +
        '</div>' +
        '<div class="ai-add-term">' + c.term + '</div>' +
        (c.phonetic ? '<div class="ai-add-phonetic">' + c.phonetic + '</div>' : '') +
        (c.literal ? '<div class="ai-add-literal">' + c.literal + '</div>' : '') +
        '<div class="ai-add-def">' + c.def + '</div>' +
        (c.code ? '<pre class="card-code">' + c.code + '</pre>' : '');
      list.appendChild(item);
    });
    box.appendChild(list);

    $('#aiAddSelectAll').addEventListener('change', (e) => {
      document.querySelectorAll('.ai-add-check').forEach((cb) => { cb.checked = e.target.checked; });
    });
    $('#aiAddBatch').addEventListener('click', () => {
      const checked = cards.filter((_, i) => {
        const cb = document.querySelector('.ai-add-check[data-i="' + i + '"]');
        return cb && cb.checked;
      });
      addCardsToStore(checked, true);
    });
    document.querySelectorAll('.ai-add-one').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        addCardsToStore([cards[i]]);
      });
    });
  }

  async function generateCards(desc) {
    if (!desc.trim()) return;
    const key = localStorage.getItem(AI_KEY);
    if (!key) { openAiKey(); return; }

    const btn = $('#aiAddGenerate');
    const box = $('#aiAddResult');
    btn.disabled = true;
    btn.textContent = '生成中…';
    box.innerHTML = '<div class="empty">AI 生成中，请稍候…</div>';

    const existingTerms = allCards().map((c) => c.term).join('、');
    const systemMsg = AI_ADD_SYSTEM + ' 以下是已有术语，请勿生成与它们重复或语义相同的卡片：' + existingTerms;

    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({
          model: getModel(),
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: desc.trim() }
          ],
          stream: false
        })
      });
      const data = await res.json();
      const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) {
        box.innerHTML = '<div class="empty">生成失败：' + ((data.error && data.error.message) || '未知错误') + '</div>';
        return;
      }
      let arr;
      try {
        arr = JSON.parse(extractJson(content));
      } catch (e) {
        box.innerHTML = '<div class="empty">AI 返回内容无法解析为 JSON，请重试</div>';
        return;
      }
      const valid = validateCards(arr);
      renderAiAddResult(valid);
    } catch (e) {
      box.innerHTML = '<div class="empty">请求出错：' + e.message + '</div>';
    } finally {
      btn.disabled = false;
      btn.textContent = '生成卡片';
    }
  }

  // ---------- 列表 ----------
  function renderList() {
    const cat = $('#listCategory').value;
    const kw = ($('#listSearch').value || '').toLowerCase();
    const list = allCards()
      .filter((c) => !cat || c.category === cat)
      .filter((c) => !kw || c.term.toLowerCase().includes(kw) || c.def.toLowerCase().includes(kw));

    const box = $('#cardList');
    box.innerHTML = '';
    list.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.innerHTML =
        '<div class="li-top"><span class="li-tag">' + c.category + '</span>' +
        '<span class="li-term">' + c.term + '</span>' +
        (c.phonetic ? '<span class="li-phonetic">' + c.phonetic + '</span>' : '') +
        '<button class="li-delete">删除</button></div>' +
        (c.literal ? '<div class="li-literal">' + c.literal + '</div>' : '') +
        '<div class="li-def">' + c.def + '</div>' +
        (c.code ? '<pre class="card-code">' + c.code + '</pre>' : '');
      item.addEventListener('click', () => enterStudy(c));
      item.querySelector('.li-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('确定删除「' + c.term + '」？')) {
          const curCat = $('#listCategory').value;
          deleteCard(c);
          fillCategorySelect($('#listCategory'), true);
          $('#listCategory').value = curCat;
          renderList();
          updateProgressText();
        }
      });
      box.appendChild(item);
    });
    if (list.length === 0) {
      box.innerHTML = '<div class="empty">没有匹配的卡片</div>';
    }
  }

  function enterStudy(card) {
    $('#studyCategory').value = card.category;
    switchView('study');
    buildStudy(card.category, card.key);
  }

  // ---------- 统计 ----------
  function updateProgressText() {
    const cards = allCards();
    $('#progressText').textContent = '共 ' + cards.length + ' 张卡片';
  }

  // ---------- 视图切换 ----------
  function switchView(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    $('#view-' + name).classList.add('active');

    if (name === 'study') buildStudy($('#studyCategory').value);
    else if (name === 'list') renderList();
    updateProgressText();
  }

  // ---------- 分类下拉 ----------
  function fillCategorySelect(sel, withAll) {
    const cats = categories();
    sel.innerHTML = '';
    if (withAll) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '全部';
      sel.appendChild(opt);
    }
    cats.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  // ---------- 事件 ----------
  function bind() {
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => switchView(t.dataset.view));
    });

    $('#studyCategory').addEventListener('change', () => buildStudy($('#studyCategory').value));
    $('#listCategory').addEventListener('change', renderList);
    $('#listSearch').addEventListener('input', renderList);

    // 导出 / 导入
    $('#exportBtn').addEventListener('click', exportData);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importData(e.target.files[0]);
        e.target.value = '';
      }
    });

    // 卡片点击翻转（桌面鼠标 + 移动端 tap）
    $('#card').addEventListener('click', () => {
      studyFlipped = !studyFlipped;
      $('#card').classList.toggle('flipped', studyFlipped);
    });

    // 发音按钮
    $('#speakBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!window.AndroidNative && !('speechSynthesis' in window)) {
        alert('当前环境不支持朗读');
        return;
      }
      if (studyCards[studyIndex]) speakTerm(studyCards[studyIndex].term);
    });

    // 卡片详情
    $('#openDetailBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      openDetail();
    });
    $('#detailClose').addEventListener('click', closeDetail);
    $('#detailBackdrop').addEventListener('click', (e) => {
      if (e.target === $('#detailBackdrop')) closeDetail();
    });
    $('#detailSpeak').addEventListener('click', (e) => {
      e.stopPropagation();
      if (studyCards[studyIndex]) speakTerm(studyCards[studyIndex].term);
    });

    // 设置
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#settingsClose').addEventListener('click', closeSettings);
    $('#ttsEngineSelect').addEventListener('change', () => {
      const pkg = $('#ttsEngineSelect').value;
      localStorage.setItem(ENGINE_KEY, pkg);
      if (window.AndroidNative && window.AndroidNative.setEngine) {
        window.AndroidNative.setEngine(pkg);
      }
    });
    $('#customSaveBtn').addEventListener('click', () => {
      const baseUrl = $('#customBaseUrl').value.trim();
      const apiKey = $('#customApiKey').value.trim();
      const model = getCustomModel();
      if (!baseUrl || !apiKey || !model) {
        alert('请填写 Base URL、API Key 和模型名');
        return;
      }
      localStorage.setItem(CUSTOM_API_KEY, JSON.stringify({ baseUrl: baseUrl, apiKey: apiKey, model: model }));
      clearAiHistory();
      closeSettings();
      alert('已保存自定义模型');
    });
    $('#fetchModelsBtn').addEventListener('click', fetchModels);
    $('#customModelSelect').addEventListener('change', () => {
      $('#customModelInput').hidden = ($('#customModelSelect').value !== '__manual__');
    });
    $('#customClearBtn').addEventListener('click', () => {
      localStorage.removeItem(CUSTOM_API_KEY);
      clearAiHistory();
      loadCustomApi();
      alert('已清除自定义模型，回到 DeepSeek');
    });
    $('#view-study').addEventListener('click', (e) => {
      if (e.target === $('#view-study') || e.target.classList.contains('swipe-hint')) {
        showSettingsBtn();
      }
    });

    // 弹出列表
    $('#openSheetBtn').addEventListener('click', openSheet);
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#sheetBackdrop').addEventListener('click', (e) => {
      if (e.target === $('#sheetBackdrop')) closeSheet();
    });

    // AI 助手
    $('#fabAi').addEventListener('click', () => {
      if ($('#aiBackdrop').classList.contains('open')) closeAi();
      else openAi();
    });
    $('#aiClose').addEventListener('click', closeAi);
    $('#aiBackdrop').addEventListener('click', (e) => {
      if (e.target === $('#aiBackdrop')) closeAi();
    });
    $('#aiKeyBtn').addEventListener('click', openAiKey);
    $('#aiClearBtn').addEventListener('click', () => {
      if (aiHistory.length === 0) return;
      if (confirm('确定清空所有对话记录？')) clearAiHistory();
    });
    $('#aiKeyCancel').addEventListener('click', closeAiKey);
    $('#aiKeyDelete').addEventListener('click', () => {
      localStorage.removeItem(AI_KEY);
      $('#aiKeyInput').value = '';
      openAiKey();
    });
    $('#aiKeySave').addEventListener('click', () => {
      const k = $('#aiKeyInput').value.trim();
      if (k) localStorage.setItem(AI_KEY, k);
      $('#aiKeyInput').value = '';
      closeAiKey();
    });
    $('#aiModel').addEventListener('change', () => {
      localStorage.setItem(MODEL_KEY, $('#aiModel').value);
      clearAiHistory();
    });
    $('#aiSend').addEventListener('click', () => {
      const v = $('#aiInput').value;
      $('#aiInput').value = '';
      askAi(v);
    });
    $('#aiInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = $('#aiInput').value;
        $('#aiInput').value = '';
        askAi(v);
      }
    });

    // 左右滑动切换
    let startX = 0, startY = 0;
    const card = $('#card');
    card.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) nextCard();
        else prevCard();
      }
    }, { passive: true });

    // 键盘方向键（桌面）
    document.addEventListener('keydown', (e) => {
      if ($('#view-study').classList.contains('active')) {
        if (e.key === 'ArrowRight') nextCard();
        else if (e.key === 'ArrowLeft') prevCard();
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); studyFlipped = !studyFlipped; $('#card').classList.toggle('flipped', studyFlipped); }
      }
    });

    // AI 添加
    $('#aiAddGenerate').addEventListener('click', () => {
      generateCards($('#aiAddInput').value);
    });
  }

  // ---------- 初始化 ----------
  function init() {
    fillCategorySelect($('#studyCategory'), true);
    fillCategorySelect($('#listCategory'), true);
    bind();
    switchView('study');
    fillAiModel();

    if (window.AndroidNative && window.AndroidNative.getStatusBarHeight) {
      const h = parseInt(window.AndroidNative.getStatusBarHeight(), 10);
      if (h > 0) document.body.style.paddingTop = h + 'px';
    }

    const savedEngine = localStorage.getItem(ENGINE_KEY);
    if (savedEngine && savedEngine !== 'default' && window.AndroidNative && window.AndroidNative.setEngine) {
      window.AndroidNative.setEngine(savedEngine);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

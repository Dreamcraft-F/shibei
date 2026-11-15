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
  const AI_ADD_SYSTEM = '你是 Java 术语卡片生成助手，根据用户描述生成学习卡片。必须只输出一个 JSON 数组，不要输出任何其他文字、解释或 markdown 代码块标记。数组每项格式：{"term":"术语名","category":"分类名","def":"一句话中文解释","code":"代码示例","literal":"字面义","phonetic":"音标","detail":"详细讲解"}。term 和 def 必填，code、literal、phonetic、detail 可选，没有就省略该字段。detail 是给用户的深入详细讲解，默认不要生成，只有用户明确要求详细讲解时才生成。def 用中文、准确简洁，code 给简短 Java 示例。分类名尽量复用常见分类（如 集合框架、并发与多线程、JVM 与内存、Spring 核心、数据库与 SQL 等）。';

  const $ = (sel) => document.querySelector(sel);

  // ---------- 数据 ----------
  // 所有写操作后清空缓存；读操作只解析一次 localStorage。
  let cardsCache = null;

  function invalidateCards() { cardsCache = null; }

  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; }
    catch { return []; }
  }
  function saveCustom(list) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); invalidateCards(); }

  function getDeleted() {
    try { return JSON.parse(localStorage.getItem(DELETED_KEY)) || []; }
    catch { return []; }
  }
  function saveDeleted(list) { localStorage.setItem(DELETED_KEY, JSON.stringify(list)); invalidateCards(); }

  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {}; }
    catch { return {}; }
  }
  function saveOverrides(o) { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); invalidateCards(); }

  function allCards() {
    if (cardsCache) return cardsCache;
    const deleted = new Set(getDeleted());
    const overrides = getOverrides();
    const builtin = window.JAVA_TERMS
      .filter((c) => !deleted.has(c.term))
      .map((c) => ({ ...c, ...(overrides[c.term] || {}), isCustom: false }));
    const custom = loadCustom().map((c) => ({ ...c, isCustom: true }));
    cardsCache = builtin.concat(custom).map((c, i) => ({
      ...c,
      key: c.category + '|' + c.term + '|' + i
    }));
    return cardsCache;
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
        refreshAfterDataChange();
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
  let suppressFlipAnim = false;
  let pendingStudy = null;

  function buildStudy(category, startKey, flip) {
    studyCards = allCards().filter((c) => !category || c.category === category);
    if (startKey) {
      const idx = studyCards.findIndex((c) => c.key === startKey);
      studyIndex = idx >= 0 ? idx : 0;
    } else {
      studyIndex = 0;
    }
    studyFlipped = !!flip;
    suppressFlipAnim = true;
    renderStudy();
  }

  function renderStudy() {
    const cardEl = $('#card');
    if (studyCards.length === 0) {
      currentStudyCard = null;
      suppressFlipAnim = false;
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

    if (suppressFlipAnim) cardEl.classList.add('no-flip-anim');
    cardEl.classList.toggle('flipped', studyFlipped);
    if (suppressFlipAnim) {
      void cardEl.offsetWidth;
      cardEl.classList.remove('no-flip-anim');
      suppressFlipAnim = false;
    }

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
      item.innerHTML = '<span class="sheet-term">' + escapeHtml(c.term) + '</span>' +
        (c.phonetic ? '<span class="sheet-phonetic">' + escapeHtml(c.phonetic) + '</span>' : '') +
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

  let detailTerm = null;

  function openDetail() {
    const c = studyCards[studyIndex];
    if (!c) return;
    detailTerm = c.term;
    $('#detailTag').textContent = c.category;
    $('#detailTerm').textContent = c.term;
    $('#detailPhonetic').textContent = c.phonetic || '';
    $('#detailPhonetic').style.display = c.phonetic ? '' : 'none';
    $('#detailLiteral').textContent = c.literal || '';
    $('#detailLiteral').style.display = c.literal ? '' : 'none';
    $('#detailDef').textContent = c.def;
    $('#detailCode').textContent = c.code || '';
    $('#detailCode').style.display = c.code ? '' : 'none';
    $('#detailDetail').innerHTML = c.detail ? renderMarkdown(c.detail) : '';
    $('#detailDetail').style.display = c.detail ? '' : 'none';
    $('#detailDetailTitle').style.display = c.detail ? '' : 'none';
    $('#detailBackdrop').classList.add('open');
  }

  function closeDetail() {
    detailTerm = null;
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
    if (current) {
      sel.appendChild(modelOpt(current, current + '（当前）'));
    } else {
      sel.appendChild(modelOpt('', '点击获取模型...'));
    }
    models.forEach((m) => {
      if (m !== current) sel.appendChild(modelOpt(m, m));
    });
    sel.value = current || '';
  }

  function getCustomModel() {
    return $('#customModelSelect').value;
  }

  let modelsFetchedFor = '';
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
      modelsFetchedFor = baseUrl + '|' + apiKey;
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
    modelsFetchedFor = '';
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
      if (m.hidden) return false;
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

  function getCustomApiConfig() {
    const custom = localStorage.getItem(CUSTOM_API_KEY);
    if (custom) {
      try {
        const c = JSON.parse(custom);
        if (c.baseUrl && c.apiKey && c.model) return c;
      } catch (e) {}
    }
    return null;
  }

  function getApiConfig() {
    const cur = getModel();
    const custom = getCustomApiConfig();
    if (custom && custom.model === cur) {
      return { baseUrl: custom.baseUrl, apiKey: custom.apiKey, model: custom.model };
    }
    return { baseUrl: 'https://api.deepseek.com', apiKey: localStorage.getItem(AI_KEY) || '', model: cur };
  }

  function fillAiModel() {
    const sel = $('#aiModel');
    const cur = getModel();
    const custom = getCustomApiConfig();
    const list = Array.from(new Set(PRESET_MODELS.concat([cur], custom && custom.model ? [custom.model] : [])));
    sel.innerHTML = '';
    list.forEach((m) => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = (custom && custom.model === m) ? (m + '（自定义）') : m;
      sel.appendChild(o);
    });
    sel.value = cur;
  }

  function buildAiSystemPrompt() {
    let p = '你是「拾贝」Java 术语卡片 App 的 AI 助手，用简洁准确的中文回答 Java/后端问题。';
    const all = allCards();
    const cats = categories();
    p += '\n\n【卡片库状态】现有 ' + all.length + ' 张卡片，分类：' + (cats.length ? cats.join('、') : '无') + '。';
    if (currentStudyCard) {
      p += '\n\n【当前卡片（用户此刻正在学习，以此为准）】术语「' + currentStudyCard.term + '」（分类：' + currentStudyCard.category + '），解释：「' + currentStudyCard.def + '」' +
        (currentStudyCard.code ? '，代码示例：「' + currentStudyCard.code + '」' : '');
      if (currentStudyCard.detail) {
        p += '。该卡片有「详细讲解」，摘要：「' + currentStudyCard.detail.slice(0, 200) + (currentStudyCard.detail.length > 200 ? '…' : '') + '」（完整内容可用 get_card 获取）';
      } else {
        p += '。该卡片暂无「详细讲解」。';
      }
      p += '即使用户在之前的对话里提过别的卡片，现在提到「当前卡片」「这张卡」「这个/它」时，一律指上面这张卡。';
    }
    p += '\n\n【工具协议】需要读写卡片或操作界面时，直接输出 1 个或多个 JSON 对象（可每行一个），不要用 markdown 代码块，也不要在同一轮先解释再做。每个对象的 action 必须是下列之一：' +
      '\n- 统计：{"action":"get_stats"}' +
      '\n- 分类：{"action":"list_categories"}' +
      '\n- 列卡片：{"action":"list_cards","category":"可选","keyword":"可选","limit":50,"offset":0}' +
      '\n- 列全部术语名（轻量，适合先了解库里有啥）：{"action":"list_terms","category":"可选","keyword":"可选"}' +
      '\n- 搜索（本地模糊匹配术语/解释/分类）：{"action":"search_cards","query":"关键词","limit":10}' +
      '\n- 读单卡完整内容：{"action":"get_card","term":"术语"}' +
      '\n- 读当前卡：{"action":"get_current_card"}' +
      '\n- 添加（支持批量，一次确认）：{"action":"add_cards","cards":[{"term":"术语","def":"解释","category":"分类","code":"代码","literal":"字面义","phonetic":"音标","detail":"详细讲解"}]}' +
      '\n- 直接改字段（不经过 AI 改写；patch 里 term 表示改名）：{"action":"update_cards","terms":["术语"],"patch":{"def":"新解释","category":"新分类"}}；selector 也支持 category/categories，全库必须写 "all":true' +
      '\n- 移动分类：{"action":"move_cards","terms":["术语"],"to":"新分类"}；selector 同上' +
      '\n- AI 改写：{"action":"rebuild_cards","terms":["术语"],"instruction":"改写要求","fields":["def","code"]}；fields 可选' +
      '\n- 写详细讲解：{"action":"set_detail","terms":["术语"],"detail":"详细内容"}（不填 terms/term 则当前卡）' +
      '\n- 清空详细讲解：{"action":"clear_detail","terms":["术语"]}（不填则当前卡）' +
      '\n- 删除：{"action":"delete_cards","terms":["术语"]}；selector 支持 category/categories/terms，全库必须写 "all":true' +
      '\n- 撤销上一次写操作：{"action":"undo"}' +
      '\n- 打开卡片：{"action":"show_card","term":"术语","flip":false,"openDetail":false}（也可只给 category 打开该分类第一张）' +
      '\n- 切换卡片：{"action":"navigate","direction":"next|prev|random","category":"可选","startTerm":"可选"}' +
      '\n- 切换分类筛选：{"action":"set_filter","category":"分类名"}（空字符串=全部）' +
      '\n- 朗读：{"action":"speak","term":"可选，默认当前卡"}' +
      '\n【规则】' +
      '\n1. 不确定术语或分类是否准确时，先 search_cards / list_categories，不要猜；terms 必须是库里真实存在的术语。' +
      '\n2. 批量操作优先用 terms / category / categories，不要一条条调用；全库操作必须显式 "all":true（删除尤其如此）。' +
      '\n3. 工具结果以【工具结果】消息返回 JSON：ok:true 表示成功；ok:false 时按 error/hint 修正后再试，或向用户说明。error 为 cancelled 表示用户拒绝，不要重试。' +
      '\n4. 不需要操作、只是提问时，直接用文字回答；工具执行完后也用简短中文总结，不要再输出 JSON。';
    return p;
  }

  async function callAi(messages) {
    const cfg = getApiConfig();
    if (!cfg.apiKey) throw new Error('未配置 API Key');
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify({ model: cfg.model, messages: messages, stream: false }),
        signal: ctrl.signal
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('请求超时（90 秒），请重试');
      throw new Error('网络请求失败：' + e.message + '（可能是 CORS 或网络问题）');
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('接口返回的不是 JSON（HTTP ' + res.status + '）：' + text.slice(0, 120)); }
    if (!res.ok) {
      throw new Error((data.error && data.error.message) || ('HTTP ' + res.status + ' ' + res.statusText));
    }
    if (!(data.choices && data.choices[0] && data.choices[0].message)) {
      throw new Error((data.error && data.error.message) || '接口未返回 choices');
    }
    return String(data.choices[0].message.content || '');
  }

  function tryParseJson(s) {
    try { return JSON.parse(s); } catch (e) {}
    try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
    return undefined;
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
            const obj = tryParseJson(text.slice(start, i + 1));
            if (obj !== undefined) objs.push(obj);
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

  async function generateRebuild(card, instruction, fields) {
    const allowed = (fields && fields.length ? fields : ['category', 'def', 'code', 'literal', 'phonetic'])
      .filter((f) => ['category', 'def', 'code', 'literal', 'phonetic', 'detail'].includes(f));
    if (allowed.length === 0) return null;
    const sys = '你是 Java 术语卡片编辑。根据用户的修改要求，输出一个 JSON 对象，只包含需要修改的字段（可能是其中一个或几个），只能使用这些字段：' +
      allowed.join('、') + '。detail 是详细讲解（可较长），其他字段保持简短。只输出 JSON，不要其他文字。';
    const userContent = JSON.stringify({
      卡片: { term: card.term, category: card.category, def: card.def, code: card.code || '', literal: card.literal || '', phonetic: card.phonetic || '', detail: card.detail || '' },
      用户要求: instruction || '重新改写解释，使其更通俗准确'
    });
    const content = await callAi([
      { role: 'system', content: sys },
      { role: 'user', content: userContent }
    ]);
    const obj = tryParseJson(extractJsonObject(content));
    if (!obj) return null;
    const patch = {};
    allowed.forEach((f) => {
      if (obj[f] !== undefined && obj[f] !== null) patch[f] = String(obj[f]).trim();
    });
    if (Object.keys(patch).length === 0) return null;
    return patch;
  }

  // ---------- 工具：选择器与卡片操作 ----------
  const PATCH_FIELDS = ['term', 'category', 'def', 'code', 'literal', 'phonetic', 'detail'];
  const LEGACY_ACTIONS = {
    add_card: 'add_cards',
    delete_card: 'delete_cards',
    rebuild_card: 'rebuild_cards',
    search_card: 'search_cards',
    add_detail: 'set_detail',
    get_detail: 'get_card'
  };
  let undoSnapshot = null;

  function asArray(v) {
    if (v == null || v === '') return [];
    return Array.isArray(v) ? v.slice() : [v];
  }

  function splitList(v) {
    const out = [];
    asArray(v).forEach((x) => {
      if (typeof x === 'string') {
        x.split(/[，,、;；\n]+/).forEach((y) => {
          const t = y.trim();
          if (t) out.push(t);
        });
      } else if (x != null) {
        out.push(x);
      }
    });
    return out;
  }

  function normalizeTerm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[\s_\-·:：()（）]/g, '');
  }

  function findCard(term) {
    const t = String(term == null ? '' : term).trim();
    if (!t) return null;
    const cards = allCards();
    const lt = t.toLowerCase();
    let c = cards.find((x) => x.term === t) || cards.find((x) => x.term.toLowerCase() === lt);
    if (c) return c;
    const nt = normalizeTerm(t);
    if (!nt) return null;
    c = cards.find((x) => normalizeTerm(x.term) === nt);
    if (c) return c;
    const cands = cards.filter((x) => {
      const xn = normalizeTerm(x.term);
      return xn && (xn.includes(nt) || nt.includes(xn));
    });
    return cands.length === 1 ? cands[0] : null;
  }

  function matchCategory(name) {
    const cat = String(name == null ? '' : name).trim();
    if (!cat) return { categories: [], cards: [] };
    const all = categories();
    let matched = all.filter((c) => c === cat);
    if (matched.length === 0) matched = all.filter((c) => c.includes(cat) || cat.includes(c));
    const set = new Set(matched);
    return { categories: matched, cards: allCards().filter((c) => set.has(c.category)) };
  }

  function selectorKinds(tool) {
    const kinds = [];
    if (tool.all) kinds.push('all');
    if (splitList(tool.terms).length) kinds.push('terms');
    if (tool.term != null && String(tool.term).trim()) kinds.push('term');
    if (splitList(tool.categories).length) kinds.push('categories');
    if (tool.category != null && String(tool.category).trim()) kinds.push('category');
    return kinds;
  }

  function resolveSelection(tool, defaultCurrent) {
    if (tool.all) {
      return { cards: allCards(), matchedCategories: categories(), missing: [], error: null };
    }
    const found = [];
    const missing = [];
    const matchedCats = new Set();
    const add = (c) => {
      if (c && !found.some((f) => f.term === c.term && f.category === c.category)) found.push(c);
    };
    splitList(tool.categories).forEach((name) => {
      const m = matchCategory(name);
      m.categories.forEach((x) => matchedCats.add(x));
      if (!m.categories.length) missing.push('分类:' + name);
      m.cards.forEach(add);
    });
    if (tool.category != null && String(tool.category).trim()) {
      const m = matchCategory(tool.category);
      m.categories.forEach((x) => matchedCats.add(x));
      if (!m.categories.length) missing.push('分类:' + tool.category);
      m.cards.forEach(add);
    }
    const terms = splitList(tool.terms);
    if (tool.term != null && String(tool.term).trim()) terms.push(tool.term);
    terms.forEach((t) => {
      const c = findCard(t);
      if (c) add(c);
      else missing.push(String(t));
    });
    const hadSelector = selectorKinds(tool).length > 0;
    if (found.length === 0 && defaultCurrent && !hadSelector && currentStudyCard) {
      const c = findCard(currentStudyCard.term);
      if (c) add(c);
    }
    return {
      cards: found,
      matchedCategories: Array.from(matchedCats),
      missing,
      error: found.length === 0 ? (hadSelector ? 'not_found' : 'no_selector') : null
    };
  }

  function cardBrief(c) {
    return {
      term: c.term,
      category: c.category,
      def: (c.def || '').slice(0, 80),
      custom: !!c.isCustom,
      hasDetail: !!c.detail
    };
  }

  function cardFull(c) {
    return {
      term: c.term,
      category: c.category,
      def: c.def || '',
      code: c.code || '',
      literal: c.literal || '',
      phonetic: c.phonetic || '',
      detail: c.detail || '',
      custom: !!c.isCustom
    };
  }

  function toolResult(obj) { return JSON.stringify(obj); }
  function toolError(error, extra) { return toolResult(Object.assign({ ok: false, error: error }, extra || {})); }

  function previewList(cards) {
    return cards.slice(0, 20).map((c) => '· ' + c.term).join('\n') + (cards.length > 20 ? '\n…' : '');
  }

  function searchCards(query, limit) {
    const q = String(query == null ? '' : query).trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/[\s,，、;；]+/).filter(Boolean);
    const scored = [];
    allCards().forEach((c) => {
      const term = (c.term || '').toLowerCase();
      const def = (c.def || '').toLowerCase();
      const cat = (c.category || '').toLowerCase();
      const lit = (c.literal || '').toLowerCase();
      let score = 0;
      if (term === q) score += 100;
      if (term.includes(q)) score += 40;
      if (lit.includes(q)) score += 15;
      if (def.includes(q)) score += 15;
      if (cat.includes(q)) score += 10;
      tokens.forEach((t) => {
        if (term.includes(t)) score += 20;
        if (lit.includes(t)) score += 8;
        if (cat.includes(t)) score += 8;
        if (def.includes(t)) score += 4;
      });
      if (score > 0) scored.push({ c: c, score: score });
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit || 10).map((x) => x.c);
  }

  function snapshotData() {
    undoSnapshot = JSON.stringify({ custom: loadCustom(), deleted: getDeleted(), overrides: getOverrides() });
  }

  function restoreSnapshot() {
    if (!undoSnapshot) return false;
    try {
      const s = JSON.parse(undoSnapshot);
      saveCustom(s.custom || []);
      saveDeleted(s.deleted || []);
      saveOverrides(s.overrides || {});
      undoSnapshot = null;
      refreshAfterDataChange();
      return true;
    } catch (e) {
      return false;
    }
  }

  function applyPatch(card, patch) {
    const clean = {};
    PATCH_FIELDS.forEach((f) => {
      if (patch[f] !== undefined && patch[f] !== null) clean[f] = String(patch[f]).trim();
    });
    if (Object.keys(clean).length === 0) return { ok: false, reason: 'empty_patch' };

    if (clean.term && clean.term !== card.term) {
      const dup = allCards().find((c) =>
        c.term.toLowerCase() === clean.term.toLowerCase() && !(c.term === card.term && c.category === card.category));
      if (dup) return { ok: false, reason: 'duplicate_term' };
      const merged = {
        term: clean.term,
        category: clean.category !== undefined ? clean.category : card.category,
        def: clean.def !== undefined ? clean.def : (card.def || ''),
        code: clean.code !== undefined ? clean.code : (card.code || ''),
        literal: clean.literal !== undefined ? clean.literal : (card.literal || ''),
        phonetic: clean.phonetic !== undefined ? clean.phonetic : (card.phonetic || ''),
        detail: clean.detail !== undefined ? clean.detail : (card.detail || '')
      };
      if (card.isCustom) {
        saveCustom(loadCustom().map((x) => (x.term === card.term && x.category === card.category) ? merged : x));
      } else {
        saveCustom(loadCustom().concat([merged]));
        const deleted = getDeleted();
        if (!deleted.includes(card.term)) { deleted.push(card.term); saveDeleted(deleted); }
      }
      return { ok: true, renamed: clean.term };
    }

    const update = {};
    Object.keys(clean).forEach((f) => { if (f !== 'term') update[f] = clean[f]; });
    if (Object.keys(update).length === 0) return { ok: false, reason: 'empty_patch' };
    updateCard(card, update);
    return { ok: true };
  }

  function refreshStudyState(render) {
    const studyTerm = currentStudyCard ? currentStudyCard.term : null;
    const studyKey = currentStudyCard ? currentStudyCard.key : null;
    let cat = $('#studyCategory').value;
    if (cat && !categories().includes(cat)) { cat = ''; $('#studyCategory').value = ''; }
    studyCards = allCards().filter((c) => !cat || c.category === cat);
    if (studyCards.length) {
      let idx = studyTerm ? studyCards.findIndex((c) => c.term === studyTerm) : -1;
      if (idx < 0 && studyKey) idx = studyCards.findIndex((c) => c.key === studyKey);
      studyIndex = idx >= 0 ? idx : Math.min(Math.max(0, studyIndex), studyCards.length - 1);
      currentStudyCard = studyCards[studyIndex];
    } else {
      studyIndex = 0;
      currentStudyCard = null;
    }
    if (render) {
      suppressFlipAnim = true;
      renderStudy();
    }
  }

  function refreshAfterDataChange() {
    refreshCategorySelects();
    updateProgressText();
    refreshStudyState(true);
    if ($('#view-list').classList.contains('active')) renderList();
    if ($('#detailBackdrop').classList.contains('open')) {
      if (currentStudyCard && currentStudyCard.term === detailTerm) openDetail();
      else closeDetail();
    }
  }

  function selectCardForStudy(card, flip, openDetailFlag) {
    $('#studyCategory').value = card.category;
    pendingStudy = { category: card.category, startKey: card.key, flip: !!flip };
    switchView('study');
    if (openDetailFlag) openDetail();
  }

  async function executeTool(tool) {
    const rawAction = String(tool.action || '').trim();
    const action = LEGACY_ACTIONS[rawAction] || rawAction;

    if (action === 'get_stats') {
      const cards = allCards();
      const counts = {};
      cards.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
      return toolResult({
        ok: true,
        action: 'get_stats',
        total: cards.length,
        builtin: cards.filter((c) => !c.isCustom).length,
        custom: cards.filter((c) => c.isCustom).length,
        deletedTerms: getDeleted().length,
        categories: Object.keys(counts).map((n) => ({ name: n, count: counts[n] }))
      });
    }

    if (action === 'list_categories') {
      const counts = {};
      allCards().forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
      return toolResult({
        ok: true,
        action: 'list_categories',
        categories: Object.keys(counts).map((n) => ({ name: n, count: counts[n] }))
      });
    }

    if (action === 'list_cards') {
      let cards = allCards();
      if (tool.category != null && String(tool.category).trim()) {
        const m = matchCategory(tool.category);
        if (!m.categories.length) return toolError('category_not_found', { category: tool.category, categories: categories() });
        cards = m.cards;
      }
      const kw = String(tool.keyword || '').trim().toLowerCase();
      if (kw) {
        cards = cards.filter((c) => [c.term, c.def, c.category, c.literal, c.detail]
          .some((v) => String(v || '').toLowerCase().includes(kw)));
      }
      const total = cards.length;
      const offset = Math.max(0, parseInt(tool.offset, 10) || 0);
      const limit = Math.min(100, Math.max(1, parseInt(tool.limit, 10) || 50));
      const page = cards.slice(offset, offset + limit);
      return toolResult({
        ok: true,
        action: 'list_cards',
        total: total,
        offset: offset,
        limit: limit,
        hasMore: offset + page.length < total,
        cards: page.map(cardBrief)
      });
    }

    if (action === 'list_terms') {
      let cards = allCards();
      if (tool.category != null && String(tool.category).trim()) {
        const m = matchCategory(tool.category);
        if (!m.categories.length) return toolError('category_not_found', { category: tool.category, categories: categories() });
        cards = m.cards;
      }
      const kw = String(tool.keyword || '').trim().toLowerCase();
      if (kw) {
        cards = cards.filter((c) => [c.term, c.def, c.category, c.literal]
          .some((v) => String(v || '').toLowerCase().includes(kw)));
      }
      return toolResult({
        ok: true,
        action: 'list_terms',
        total: cards.length,
        terms: cards.map((c) => c.term)
      });
    }

    if (action === 'search_cards') {
      const q = String(tool.query || tool.keyword || '').trim();
      if (!q) return toolError('empty_query', { hint: '请提供 query' });
      const limit = Math.min(30, Math.max(1, parseInt(tool.limit, 10) || 10));
      const found = searchCards(q, limit);
      return toolResult({
        ok: true,
        action: 'search_cards',
        query: q,
        count: found.length,
        results: found.map(cardBrief),
        hint: found.length ? undefined : '没有匹配，换关键词或先用 list_cards 浏览分类'
      });
    }

    if (action === 'get_card') {
      const term = String(tool.term || '').trim();
      if (!term) return toolError('missing_term');
      const card = findCard(term);
      if (!card) {
        const suggestions = searchCards(term, 5).map((c) => c.term);
        return toolError('card_not_found', {
          term: term,
          suggestions: suggestions,
          hint: suggestions.length ? '是否指这些卡片？' : '先用 list_cards 或 search_cards 查找'
        });
      }
      return toolResult({ ok: true, action: 'get_card', card: cardFull(card) });
    }

    if (action === 'get_current_card') {
      if (!currentStudyCard) return toolError('no_current_card', { hint: '用户当前不在学习视图或分类为空' });
      const card = findCard(currentStudyCard.term) || currentStudyCard;
      return toolResult({
        ok: true,
        action: 'get_current_card',
        position: studyIndex + 1,
        total: studyCards.length,
        card: cardFull(card)
      });
    }

    if (action === 'add_cards') {
      let input;
      if (Array.isArray(tool.cards)) input = tool.cards;
      else if (tool.cards && typeof tool.cards === 'object') input = [tool.cards];
      else input = [{ term: tool.term, category: tool.category, def: tool.def, code: tool.code, literal: tool.literal, phonetic: tool.phonetic, detail: tool.detail }];
      const valid = validateCards(input);
      if (!valid.length) return toolError('invalid_cards', { hint: '每张卡必须包含 term 和 def' });

      const existing = new Set(allCards().map((c) => normalizeTerm(c.term)));
      const kept = [];
      const skipped = [];
      valid.forEach((c) => {
        const k = normalizeTerm(c.term);
        if (!k) { skipped.push({ term: c.term, reason: 'empty_term' }); return; }
        if (existing.has(k)) { skipped.push({ term: c.term, reason: 'duplicate' }); return; }
        existing.add(k);
        kept.push(c);
      });
      if (!kept.length) return toolResult({ ok: true, action: 'add_cards', added: 0, skipped: skipped, hint: '全部已存在，未添加' });

      if (!confirm('将添加 ' + kept.length + ' 张卡片：\n' + kept.slice(0, 20).map((c) => '· ' + c.term + '（' + c.category + '）').join('\n') + (kept.length > 20 ? '\n…' : ''))) {
        return toolError('cancelled', { hint: '用户取消了添加，不要重试' });
      }
      snapshotData();
      saveCustom(loadCustom().concat(kept));
      refreshAfterDataChange();
      return toolResult({ ok: true, action: 'add_cards', added: kept.length, terms: kept.map((c) => c.term), skipped: skipped });
    }

    if (action === 'update_cards') {
      const sel = resolveSelection(tool, false);
      if (sel.error) {
        return toolError(sel.error, {
          missing: sel.missing,
          hint: sel.error === 'not_found' ? '先 search_cards 确认术语' : '请提供 terms/category/categories，全库请用 all:true'
        });
      }
      const patch = (tool.patch && typeof tool.patch === 'object') ? tool.patch : tool;
      const clean = {};
      PATCH_FIELDS.forEach((f) => {
        if (patch[f] !== undefined && patch[f] !== null) clean[f] = patch[f];
      });
      if (Object.keys(clean).length === 0) return toolError('empty_patch', { fields: PATCH_FIELDS });
      if (!confirm('将修改 ' + sel.cards.length + ' 张卡片：\n' + previewList(sel.cards) + '\n\n字段：' + Object.keys(clean).join('、'))) {
        return toolError('cancelled', { hint: '用户取消了修改，不要重试' });
      }
      snapshotData();
      const updated = [];
      const failed = [];
      sel.cards.forEach((c) => {
        const r = applyPatch(c, clean);
        if (r.ok) updated.push(r.renamed || c.term);
        else failed.push({ term: c.term, reason: r.reason });
      });
      refreshAfterDataChange();
      return toolResult({ ok: true, action: 'update_cards', updated: updated.length, terms: updated, failed: failed, missing: sel.missing });
    }

    if (action === 'move_cards') {
      const sel = resolveSelection(tool, false);
      if (sel.error) {
        return toolError(sel.error, {
          missing: sel.missing,
          hint: sel.error === 'not_found' ? '先 search_cards 确认术语' : '请提供 terms/category/categories'
        });
      }
      const to = String(tool.to || tool.targetCategory || '').trim();
      if (!to) return toolError('missing_target_category', { hint: '请提供 "to":"新分类名"' });
      if (!confirm('将 ' + sel.cards.length + ' 张卡片移动到「' + to + '」：\n' + previewList(sel.cards))) {
        return toolError('cancelled', { hint: '用户取消了移动，不要重试' });
      }
      snapshotData();
      sel.cards.forEach((c) => updateCard(c, { category: to }));
      refreshAfterDataChange();
      return toolResult({ ok: true, action: 'move_cards', moved: sel.cards.length, category: to, terms: sel.cards.map((c) => c.term) });
    }

    if (action === 'rebuild_cards') {
      const sel = resolveSelection(tool, false);
      if (sel.error) {
        return toolError(sel.error, {
          missing: sel.missing,
          hint: sel.error === 'not_found' ? '先 search_cards 确认术语' : '请提供 terms/category/categories'
        });
      }
      if (sel.cards.length > 30) {
        return toolError('too_many_targets', { count: sel.cards.length, hint: '一次最多改写 30 张，请缩小范围' });
      }
      const fields = splitList(tool.fields);
      const inst = String(tool.instruction || '').trim();
      if (!confirm('将用 AI 改写 ' + sel.cards.length + ' 张卡片：\n' + previewList(sel.cards) + '\n\n要求：' + (inst || '重写解释'))) {
        return toolError('cancelled', { hint: '用户取消了改写，不要重试' });
      }
      snapshotData();
      let ok = 0;
      const failed = [];
      for (const c of sel.cards) {
        try {
          const patch = await generateRebuild(c, inst, fields);
          if (patch && Object.keys(patch).length) { updateCard(c, patch); ok++; }
          else failed.push({ term: c.term, reason: 'ai_empty' });
        } catch (e) {
          failed.push({ term: c.term, reason: e.message });
        }
      }
      refreshAfterDataChange();
      return toolResult({ ok: true, action: 'rebuild_cards', updated: ok, failed: failed });
    }

    if (action === 'set_detail') {
      const detail = String(tool.detail || '').trim();
      if (!detail) return toolError('missing_detail', { hint: '请提供 detail 内容' });
      const sel = resolveSelection(tool, true);
      if (sel.error) {
        return toolError(sel.error, {
          missing: sel.missing,
          hint: sel.error === 'not_found' ? '先 search_cards 确认术语' : '未指定术语时需要有当前卡片'
        });
      }
      snapshotData();
      sel.cards.forEach((c) => updateCard(c, { detail: detail }));
      refreshAfterDataChange();
      return toolResult({ ok: true, action: 'set_detail', updated: sel.cards.length, terms: sel.cards.map((c) => c.term) });
    }

    if (action === 'clear_detail') {
      const sel = resolveSelection(tool, true);
      if (sel.error) {
        return toolError(sel.error, {
          missing: sel.missing,
          hint: sel.error === 'not_found' ? '先 search_cards 确认术语' : '未指定术语时需要有当前卡片'
        });
      }
      snapshotData();
      sel.cards.forEach((c) => updateCard(c, { detail: '' }));
      refreshAfterDataChange();
      return toolResult({ ok: true, action: 'clear_detail', cleared: sel.cards.length, terms: sel.cards.map((c) => c.term) });
    }

    if (action === 'delete_cards') {
      if (selectorKinds(tool).length === 0) {
        return toolError('no_selector', { hint: '删除必须指定 terms/category/categories，或显式 all:true' });
      }
      const sel = resolveSelection(tool, false);
      if (sel.error) {
        return toolError(sel.error, { missing: sel.missing, hint: '先 search_cards 确认术语' });
      }
      if (!confirm('确定删除以下 ' + sel.cards.length + ' 张卡片？\n' + previewList(sel.cards))) {
        return toolError('cancelled', { hint: '用户取消了删除，不要重试' });
      }
      snapshotData();
      sel.cards.forEach((c) => deleteCard(c));
      refreshAfterDataChange();
      return toolResult({ ok: true, action: 'delete_cards', deleted: sel.cards.length, terms: sel.cards.map((c) => c.term) });
    }

    if (action === 'undo') {
      if (!restoreSnapshot()) return toolError('nothing_to_undo', { hint: '没有可撤销的写操作' });
      return toolResult({ ok: true, action: 'undo', message: '已撤销上一次写操作' });
    }

    if (action === 'show_card') {
      if (tool.category && !tool.term) {
        const m = matchCategory(tool.category);
        if (!m.categories.length) return toolError('category_not_found', { categories: categories() });
        if (!m.cards.length) return toolError('empty_category', { category: tool.category });
        selectCardForStudy(m.cards[0], !!tool.flip, !!tool.openDetail);
        return toolResult({ ok: true, action: 'show_card', term: currentStudyCard ? currentStudyCard.term : '' });
      }
      const card = findCard(tool.term);
      if (!card) {
        const suggestions = searchCards(tool.term, 5).map((c) => c.term);
        return toolError('card_not_found', { term: tool.term, suggestions: suggestions });
      }
      selectCardForStudy(card, !!tool.flip, !!tool.openDetail);
      return toolResult({ ok: true, action: 'show_card', term: card.term, category: card.category });
    }

    if (action === 'navigate') {
      const cat = String(tool.category || '').trim();
      if (cat) {
        const m = matchCategory(cat);
        if (!m.categories.length) return toolError('category_not_found', { categories: categories() });
        $('#studyCategory').value = m.categories[0];
        pendingStudy = { category: m.categories[0] };
        switchView('study');
      } else if (!$('#view-study').classList.contains('active')) {
        switchView('study');
      }
      if (!studyCards.length) return toolError('empty_study', { hint: '当前分类没有卡片' });
      if (tool.startTerm) {
        const c = findCard(tool.startTerm);
        if (!c) return toolError('card_not_found', { term: tool.startTerm });
        const idx = studyCards.findIndex((x) => x.term === c.term && x.category === c.category);
        if (idx < 0) return toolError('card_not_in_category', { term: c.term, category: $('#studyCategory').value });
        studyIndex = idx;
        renderStudy();
      }
      const dir = String(tool.direction || '').toLowerCase();
      if (dir === 'next') nextCard();
      else if (dir === 'prev') prevCard();
      else if (dir === 'random') { studyIndex = Math.floor(Math.random() * studyCards.length); renderStudy(); }
      return toolResult({
        ok: true,
        action: 'navigate',
        term: currentStudyCard ? currentStudyCard.term : '',
        position: studyIndex + 1,
        total: studyCards.length,
        filterCategory: $('#studyCategory').value || '全部'
      });
    }

    if (action === 'set_filter') {
      const cat = String(tool.category == null ? '' : tool.category).trim();
      let targetCat = '';
      if (cat) {
        const m = matchCategory(cat);
        if (!m.categories.length) return toolError('category_not_found', { categories: categories() });
        targetCat = m.categories[0];
      }
      $('#studyCategory').value = targetCat;
      pendingStudy = { category: targetCat };
      switchView('study');
      return toolResult({ ok: true, action: 'set_filter', category: targetCat || '全部', count: studyCards.length });
    }

    if (action === 'speak') {
      const card = tool.term ? findCard(tool.term) : currentStudyCard;
      if (!card) return toolError('no_card_to_speak', { hint: '请提供 term 或先打开一张卡片' });
      speakTerm(card.term);
      return toolResult({ ok: true, action: 'speak', term: card.term, spoken: speakTextForTerm(card.term) });
    }

    return toolError('unknown_action', { action: rawAction, hint: '请使用系统提示中列出的 action' });
  }

  async function askAi(question) {
    if (!question.trim()) return;
    if (!getApiConfig().apiKey) { openAiKey(); return; }

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
      const callWithHistory = () => callAi([{ role: 'system', content: buildAiSystemPrompt() }, ...aiHistory]);
      let content = await callWithHistory();
      let rounds = 0;

      while (rounds < 6) {
        const calls = parseToolCalls(content);
        if (calls.length === 0) break;
        aiHistory.push({ role: 'assistant', content: content, hidden: true });
        const results = [];
        for (const tool of calls) {
          try {
            results.push(await executeTool(tool));
          } catch (e) {
            results.push(toolError('tool_crashed', { action: tool && tool.action, message: e.message }));
          }
        }
        aiHistory.push({ role: 'user', content: '【工具结果】\n' + results.join('\n'), hidden: true });
        content = await callWithHistory();
        rounds++;
      }

      if (parseToolCalls(content).length) {
        aiHistory.push({ role: 'assistant', content: content, hidden: true });
        content = await callAi([
          { role: 'system', content: buildAiSystemPrompt() },
          ...aiHistory,
          { role: 'user', content: '请用中文简要总结上面的工具执行结果，不要再输出 JSON 或调用工具。' }
        ]);
      }

      if (parseToolCalls(content).length) content = '操作已执行，但 AI 没有返回总结，可以继续追问。';
      if (!content || !String(content).trim()) content = '（没有返回内容，请重试）';

      pending.remove();
      aiHistory.push({ role: 'assistant', content: content });
      saveAiHistory();
      renderAiMessages();
    } catch (e) {
      pending.remove();
      aiHistory.push({ role: 'assistant', content: '请求出错：' + e.message });
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
        phonetic: c.phonetic ? String(c.phonetic).trim() : '',
        detail: c.detail ? String(c.detail).trim() : ''
      });
    });
    return out;
  }

  function refreshCategorySelects() {
    const cats = categories();
    const studyVal = $('#studyCategory').value;
    const listVal = $('#listCategory').value;
    fillCategorySelect($('#studyCategory'), true);
    fillCategorySelect($('#listCategory'), true);
    if (studyVal && cats.includes(studyVal)) $('#studyCategory').value = studyVal;
    if (listVal && cats.includes(listVal)) $('#listCategory').value = listVal;
  }

  function addCardsToStore(cards, clearAfter) {
    if (cards.length === 0) return;
    saveCustom(loadCustom().concat(cards));
    refreshAfterDataChange();
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
          '<span class="li-tag">' + escapeHtml(c.category) + '</span>' +
          '<button class="ai-add-one" data-i="' + i + '">单个添加</button>' +
        '</div>' +
        '<div class="ai-add-term">' + escapeHtml(c.term) + '</div>' +
        (c.phonetic ? '<div class="ai-add-phonetic">' + escapeHtml(c.phonetic) + '</div>' : '') +
        (c.literal ? '<div class="ai-add-literal">' + escapeHtml(c.literal) + '</div>' : '') +
        '<div class="ai-add-def">' + escapeHtml(c.def) + '</div>' +
        (c.code ? '<pre class="card-code">' + escapeHtml(c.code) + '</pre>' : '');
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
    if (!getApiConfig().apiKey) { openAiKey(); return; }

    const btn = $('#aiAddGenerate');
    const box = $('#aiAddResult');
    btn.disabled = true;
    btn.textContent = '生成中…';
    box.innerHTML = '<div class="empty">AI 生成中，请稍候…</div>';

    const existingTerms = allCards().map((c) => c.term).join('、');
    const systemMsg = AI_ADD_SYSTEM + ' 以下是已有术语，请勿生成与它们重复或语义相同的卡片：' + existingTerms;

    try {
      const content = await callAi([
        { role: 'system', content: systemMsg },
        { role: 'user', content: desc.trim() }
      ]);
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
      box.innerHTML = '<div class="empty">请求出错：' + escapeHtml(e.message) + '</div>';
    } finally {
      btn.disabled = false;
      btn.textContent = '生成卡片';
    }
  }

  // ---------- 列表 ----------
  const LIST_PAGE_SIZE = 40;
  let listState = { items: [], shown: 0, observer: null };
  let listSearchTimer = null;

  function createListItem(c) {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML =
      '<div class="li-top"><span class="li-tag">' + escapeHtml(c.category) + '</span>' +
      '<span class="li-term">' + escapeHtml(c.term) + '</span>' +
      (c.phonetic ? '<span class="li-phonetic">' + escapeHtml(c.phonetic) + '</span>' : '') +
      '<button class="li-delete">删除</button></div>' +
      (c.literal ? '<div class="li-literal">' + escapeHtml(c.literal) + '</div>' : '') +
      '<div class="li-def">' + escapeHtml(c.def) + '</div>' +
      (c.code ? '<pre class="card-code">' + escapeHtml(c.code) + '</pre>' : '');
    item.addEventListener('click', () => enterStudy(c));
    item.querySelector('.li-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('确定删除「' + c.term + '」？')) return;
      deleteCard(c);
      const idx = listState.items.indexOf(c);
      if (idx >= 0) {
        listState.items.splice(idx, 1);
        if (idx < listState.shown) listState.shown--;
      }
      item.remove();
      updateProgressText();
      refreshCategorySelects();
      refreshStudyState(false);
      if (listState.items.length === 0) renderList();
    });
    return item;
  }

  function appendListChunk() {
    const box = $('#cardList');
    const st = listState;
    if (!st.items.length || st.shown >= st.items.length) return;
    const oldSentinel = box.querySelector('.list-sentinel');
    if (oldSentinel) oldSentinel.remove();
    const end = Math.min(st.shown + LIST_PAGE_SIZE, st.items.length);
    const frag = document.createDocumentFragment();
    for (let i = st.shown; i < end; i++) frag.appendChild(createListItem(st.items[i]));
    st.shown = end;
    box.appendChild(frag);
    if (st.shown >= st.items.length) return;

    const sentinel = document.createElement('div');
    sentinel.className = 'list-sentinel';
    sentinel.textContent = '加载更多…';
    box.appendChild(sentinel);
    if ('IntersectionObserver' in window) {
      st.observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (st.observer) { st.observer.disconnect(); st.observer = null; }
        appendListChunk();
      }, { root: document.querySelector('main'), rootMargin: '600px' });
      st.observer.observe(sentinel);
    } else {
      appendListChunk();
    }
  }

  function renderList() {
    const cat = $('#listCategory').value;
    const kw = ($('#listSearch').value || '').trim().toLowerCase();
    const list = allCards()
      .filter((c) => !cat || c.category === cat)
      .filter((c) => !kw || c.term.toLowerCase().includes(kw) || c.def.toLowerCase().includes(kw) ||
        (c.literal || '').toLowerCase().includes(kw) || c.category.toLowerCase().includes(kw));

    if (listState.observer) { listState.observer.disconnect(); listState.observer = null; }
    listState = { items: list, shown: 0, observer: null };

    const box = $('#cardList');
    box.innerHTML = '';
    if (list.length === 0) {
      box.innerHTML = '<div class="empty">没有匹配的卡片</div>';
      return;
    }
    appendListChunk();
  }

  function enterStudy(card) {
    $('#studyCategory').value = card.category;
    pendingStudy = { category: card.category, startKey: card.key };
    switchView('study');
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

    if (name === 'study') {
      const p = pendingStudy;
      pendingStudy = null;
      if (p) buildStudy(p.category, p.startKey, p.flip);
      else buildStudy($('#studyCategory').value);
    } else {
      pendingStudy = null;
      if (name === 'list') renderList();
    }
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
    $('#listSearch').addEventListener('input', () => {
      clearTimeout(listSearchTimer);
      listSearchTimer = setTimeout(renderList, 120);
    });

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
      localStorage.setItem(MODEL_KEY, model);
      clearAiHistory();
      fillAiModel();
      closeSettings();
      alert('已保存自定义模型，AI 已切换到它');
    });
    $('#customModelSelect').addEventListener('pointerdown', () => {
      const baseUrl = $('#customBaseUrl').value.trim();
      const apiKey = $('#customApiKey').value.trim();
      const sig = baseUrl + '|' + apiKey;
      if (sig && sig !== modelsFetchedFor) {
        fetchModels();
      }
    });
    $('#customClearBtn').addEventListener('click', () => {
      localStorage.removeItem(CUSTOM_API_KEY);
      const cur = getModel();
      if (!PRESET_MODELS.includes(cur)) {
        localStorage.setItem(MODEL_KEY, 'deepseek-flash');
      }
      clearAiHistory();
      loadCustomApi();
      fillAiModel();
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

  // ---------- Android 返回键 ----------
  // 原生层通过 evaluateJavascript 调用；返回 true 表示已消费这次返回。
  function handleAndroidBack() {
    if (!$('#aiKeyDialog').hidden) { closeAiKey(); return true; }
    if (!$('#settingsDialog').hidden) { closeSettings(); return true; }
    if ($('#detailBackdrop').classList.contains('open')) { closeDetail(); return true; }
    if ($('#aiBackdrop').classList.contains('open')) { closeAi(); return true; }
    if ($('#sheetBackdrop').classList.contains('open')) { closeSheet(); return true; }
    const active = document.querySelector('.tab.active');
    if (active && active.dataset.view !== 'study') { switchView('study'); return true; }
    return false;
  }

  // ---------- 初始化 ----------
  function init() {
    window.__handleAndroidBack = handleAndroidBack;
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

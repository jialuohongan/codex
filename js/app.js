/* ==========================================================================
   指尖打字通 · 主应用
   模式切换 / 课程 / 自由练习 / 指法演示 / 实时统计 / 本地持久化 / 快捷键
   ========================================================================== */
(function (global) {
  'use strict';

  const TT = global.TT;

  const LS_SETTINGS = 'tt.settings';
  const LS_THEME = 'tt.theme';
  const LS_STATS = 'tt.stats';
  const MAX_RECORDS = 80;

  const DEFAULT_IME_HINT = '提示：请切换到英文输入法；若开启了大写锁定会给出提醒。';

  const DEFAULT_SETTINGS = {
    colorKeys: true,
    showNext: true,
    showHands: true,
    strict: false,
    caseSensitive: true,
    soundOn: true
  };

  const CODE_ALIAS = {
    Space: '空格键', Enter: '回车键', Tab: 'Tab 键', Backspace: '退格键',
    ShiftLeft: '左 Shift', ShiftRight: '右 Shift', CapsLock: '大写锁定'
  };

  const $ = function (id) { return document.getElementById(id); };

  /* ---------------- 本地存储 ---------------- */

  function loadJSON(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      const val = JSON.parse(raw);
      return (val === null || val === undefined) ? fallback : val;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, val) {
    try { global.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略容量/隐私模式错误 */ }
  }

  function normalizeStats(raw) {
    const src = (raw && typeof raw === 'object') ? raw : {};
    const out = { keyStats: {}, records: [] };
    const ks = src.keyStats;
    if (ks && typeof ks === 'object') {
      Object.keys(ks).forEach(function (code) {
        const v = ks[code] || {};
        const hits = Number(v.hits);
        const errors = Number(v.errors);
        if (!isFinite(hits) && !isFinite(errors)) return;
        out.keyStats[code] = {
          code: code,
          hits: isFinite(hits) ? hits : 0,
          errors: isFinite(errors) ? errors : 0
        };
      });
    }
    if (Array.isArray(src.records)) {
      out.records = src.records.filter(function (r) {
        return r && typeof r === 'object' && typeof r.name === 'string';
      }).slice(0, MAX_RECORDS);
    }
    return out;
  }

  /* ---------------- 工具 ---------------- */

  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function normText(t) {
    return String(t || '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
  }

  function normCode(t) {
    return String(t || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(function (line) { return line.replace(/[ \t]+$/, ''); })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+|\n+$/g, '');
  }

  function countUnmapped(text) {
    let n = 0;
    Array.from(text).forEach(function (ch) {
      if (ch !== '\n' && ch !== '\t' && !TT.charInfo(ch)) n++;
    });
    return n;
  }

  function keyLabelFull(info) {
    if (!info || !info.code) return '—';
    const key = TT.KEY_BY_CODE[info.code];
    const base = CODE_ALIAS[info.code] || (key ? key.l : info.code);
    if (info.shift && key && key.s) return 'Shift + ' + base + '（' + key.s + '）';
    if (info.shift) return 'Shift + ' + base;
    return base;
  }

  /* ---------------- 应用状态 ---------------- */

  const state = {
    tab: 'practice',
    settings: Object.assign({}, DEFAULT_SETTINGS, loadJSON(LS_SETTINGS, {})),
    theme: global.localStorage.getItem(LS_THEME) || 'dark',
    stats: normalizeStats(loadJSON(LS_STATS, null)),
    groupId: TT.LESSON_GROUPS[0].id,
    lessonId: TT.LESSON_LIST[0].id,
    freeMode: 'words',
    freeSeed: Math.floor(Math.random() * 100000) + 1,
    source: null
  };

  let engine = null;
  let keyboard = null;
  let hands = null;
  let demoPlayer = null;
  let hintTimer = 0;
  let zoneTimer = 0;

  const dom = {};

  const DOM_IDS = [
    'tabs', 'btnSound', 'btnSettings', 'btnTheme', 'settingsPop', 'setColorKeys', 'setShowNext',
    'setShowHands', 'setStrict', 'setCaseSensitive', 'setSoundOn', 'view-practice', 'view-free',
    'view-demo', 'groupChips', 'lessonGrid', 'freeModeSeg', 'freeRowLen', 'freeLen', 'freeLenVal',
    'btnGenerate', 'freeRowCustom', 'freeText', 'btnUseCustom', 'demoSelect', 'btnDemoPlay',
    'btnDemoStop', 'demoSpeed', 'demoSpeedVal', 'demoLoop', 'stageTitle', 'focusKeys', 'btnRestart',
    'btnPrev', 'btnNext', 'statWpm', 'statAcc', 'statTime', 'statErr', 'statProg', 'progressBar',
    'textDisplay', 'textContent', 'startHint', 'keyboard', 'imeHint', 'handsPanel', 'hands',
    'handBadge', 'nextKey', 'nextChar', 'nextCode', 'nextFinger', 'fingerLegend', 'btnResetStats',
    'weakKeys', 'heatmap', 'records', 'resultModal', 'resultTitle', 'btnCloseModal', 'resWpm',
    'resAcc', 'resTime', 'resChars', 'resNote', 'resWeakKeys', 'btnAgain', 'btnNextLesson'
  ];

  function cacheDom() {
    DOM_IDS.forEach(function (id) { dom[id] = $(id); });
  }

  /* ======================================================================
     启动
     ====================================================================== */

  function boot() {
    cacheDom();
    applyTheme(state.theme);
    syncSettingInputs();
    TT.Sound.enabled = state.settings.soundOn;
    updateSoundButton();

    engine = new TT.Engine({
      el: dom.textContent,
      display: dom.textDisplay,
      caseSensitive: state.settings.caseSensitive,
      strict: state.settings.strict,
      onStart: handleStart,
      onNext: handleNext,
      onCorrect: handleCorrect,
      onError: handleError,
      onBackspace: handleBackspace,
      onProgress: updateStats,
      onComplete: handleComplete
    });

    keyboard = new TT.Keyboard(dom.keyboard);
    keyboard.setColored(state.settings.colorKeys);
    keyboard.onKeyClick = handleKeyClick;

    hands = new TT.Hands(dom.hands);

    demoPlayer = new TT.DemoPlayer({
      engine: engine,
      keyboard: keyboard,
      hands: hands,
      onChar: handleDemoChar,
      onStateChange: handleDemoState
    });

    renderFingerLegend();
    renderGroupChips();
    renderLessons();
    renderDemoSelect();
    renderWeakKeys();
    renderRecords();
    bindEvents();
    applyHandsVisibility();

    loadLesson(state.lessonId);

    /* URL 参数直达：?theme=light&tab=free|demo|practice */
    try {
      const qs = new URLSearchParams(global.location.search);
      const qTheme = qs.get('theme');
      if (qTheme === 'light' || qTheme === 'dark') applyTheme(qTheme);
      const qTab = qs.get('tab');
      if (qTab && ['practice', 'free', 'demo'].indexOf(qTab) >= 0 && qTab !== state.tab) setTab(qTab);
      /* 诊断探针：?debug=css 时把关键计算样式输出到页面，供无头浏览器检查 */
      if (qs.get('debug') === 'css') {
        const probe = function (sel, prop) {
          const el = document.querySelector(sel);
          return el ? global.getComputedStyle(el)[prop] : 'no-element';
        };
        const info = [
          'lc-name.color=' + probe('.lesson-card .lc-name', 'color'),
          'lesson-card.color=' + probe('.lesson-card', 'color'),
          'finger-body.stroke=' + probe('.finger .finger-body', 'stroke'),
          'finger-body.strokeWidth=' + probe('.finger .finger-body', 'strokeWidth'),
          'hand-palm.fill=' + probe('.hand-palm', 'fill'),
          'body.color=' + probe('body', 'color')
        ].join('\n');
        const pre = document.createElement('pre');
        pre.id = 'css-debug';
        pre.textContent = info;
        document.body.appendChild(pre);
      }
    } catch (e) { /* 忽略不支持 URLSearchParams 的环境 */ }
  }

  /* ======================================================================
     主题与设置
     ====================================================================== */

  function applyTheme(t) {
    state.theme = (t === 'light') ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    if (dom.btnTheme) {
      dom.btnTheme.textContent = state.theme === 'dark' ? '🌙' : '☀️';
      dom.btnTheme.title = state.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题';
    }
    try { global.localStorage.setItem(LS_THEME, state.theme); } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    saveJSON(LS_SETTINGS, state.settings);
  }

  function syncSettingInputs() {
    const s = state.settings;
    dom.setColorKeys.checked = !!s.colorKeys;
    dom.setShowNext.checked = !!s.showNext;
    dom.setShowHands.checked = !!s.showHands;
    dom.setStrict.checked = !!s.strict;
    dom.setCaseSensitive.checked = !!s.caseSensitive;
    dom.setSoundOn.checked = !!s.soundOn;
  }

  function updateSoundButton() {
    const on = !!state.settings.soundOn;
    dom.btnSound.textContent = on ? '🔊' : '🔇';
    dom.btnSound.classList.toggle('is-off', !on);
    dom.btnSound.title = on ? '音效已开启（点击关闭）' : '音效已关闭（点击开启）';
  }

  /** 设置项变化后的即时生效逻辑 */
  function applySetting(key) {
    const s = state.settings;
    if (key === 'colorKeys') {
      keyboard.setColored(s.colorKeys);
    } else if (key === 'showHands') {
      applyHandsVisibility();
    } else if (key === 'strict') {
      engine.strict = s.strict;
      if (s.strict) setImeHint('已开启严格模式：打错必须按退格删除后才能继续。', false);
    } else if (key === 'caseSensitive') {
      engine.caseSensitive = s.caseSensitive;
    } else if (key === 'soundOn') {
      TT.Sound.enabled = s.soundOn;
      updateSoundButton();
      if (s.soundOn) { TT.Sound.resume(); TT.Sound.ok(); }
    } else if (key === 'showNext') {
      const info = engine.currentInfo();
      if (s.showNext && info && info.code) keyboard.showNext(info.code, info.shiftCode);
      else keyboard.clearNext();
    }
  }

  function applyHandsVisibility() {
    const on = !!state.settings.showHands;
    dom.hands.classList.toggle('hidden', !on);
    dom.fingerLegend.classList.toggle('hidden', !on);
    if (!on) hands.clear();
  }

  /* ======================================================================
     课程
     ====================================================================== */

  function renderGroupChips() {
    dom.groupChips.innerHTML = '';
    TT.LESSON_GROUPS.forEach(function (g) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (g.id === state.groupId ? ' is-active' : '');
      b.dataset.group = g.id;
      b.textContent = ' ' + g.name;
      b.title = g.icon + ' ' + g.desc;
      b.addEventListener('click', function () { selectGroup(g.id); });
      dom.groupChips.appendChild(b);
    });
  }

  function renderLessons() {
    const group = TT.LESSON_GROUPS.filter(function (g) { return g.id === state.groupId; })[0];
    if (!group) return;
    dom.lessonGrid.innerHTML = '';
    group.lessons.forEach(function (l) {
      const best = bestWpm(l.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'lesson-card' + (l.id === state.lessonId && state.tab === 'practice' ? ' is-active' : '');
      card.innerHTML =
        '<div class="lc-name">' + escapeHtml(l.name) + '</div>' +
        '<div class="lc-sub">' + escapeHtml(l.sub) + '</div>' +
        '<div class="lc-best' + (best ? '' : ' none') + '">' +
          (best ? '最佳 ' + best + ' WPM' : '尚未练习') +
        '</div>' +
        (best ? '<span class="lc-done">✓</span>' : '');
      card.addEventListener('click', function () { setTab('practice', true); loadLesson(l.id); });
      dom.lessonGrid.appendChild(card);
    });
  }

  function bestWpm(lessonId) {
    let best = 0;
    state.stats.records.forEach(function (r) {
      if (r.type === 'lesson' && r.id === lessonId && (r.wpm || 0) > best) best = r.wpm || 0;
    });
    return best;
  }

  function selectGroup(groupId) {
    const group = TT.LESSON_GROUPS.filter(function (g) { return g.id === groupId; })[0];
    if (!group || !group.lessons.length) return;
    state.groupId = groupId;
    setTab('practice', true);
    loadLesson(group.lessons[0].id);
  }

  function currentLessonList() {
    const g = TT.LESSON_GROUPS.filter(function (x) { return x.id === state.groupId; })[0];
    return g ? g.lessons : TT.LESSON_LIST;
  }

  function loadLesson(lessonId) {
    const l = TT.LESSONS[lessonId];
    if (!l) return;
    state.lessonId = l.id;
    state.groupId = l.groupId;
    state.source = { type: 'lesson', id: l.id, name: l.name };
    dom.stageTitle.textContent = l.name;
    renderFocusKeys(l.keys);
    renderGroupChips();
    renderLessons();
    loadText(l.text, false);
  }

  function stepLesson(delta) {
    const list = currentLessonList();
    if (!list.length) return;
    let idx = -1;
    for (let i = 0; i < list.length; i++) if (list[i].id === state.lessonId) idx = i;
    if (idx < 0) idx = 0;
    const next = idx + delta;
    if (next < 0 || next >= list.length) {
      setImeHint(delta > 0 ? '已经是本组最后一课了，可以切换到下一个分组。' : '已经是本组第一课了。', false);
      return;
    }
    setTab('practice', true);
    loadLesson(list[next].id);
  }

  function renderFocusKeys(keys) {
    dom.focusKeys.innerHTML = '';
    (keys || []).forEach(function (k) {
      const el = document.createElement('span');
      el.className = 'focus-key';
      if (typeof k === 'string' && k.length === 1) {
        const info = TT.charInfo(k);
        if (info && info.finger) {
          el.dataset.finger = info.finger;
          el.style.background = 'var(--finger-' + info.finger + ')';
          el.style.color = '#fff';
          el.style.borderColor = 'transparent';
        }
        el.textContent = (k === ' ') ? '␣' : k;
      } else {
        el.textContent = String(k);
      }
      dom.focusKeys.appendChild(el);
    });
  }

  /* ======================================================================
     文本装载 / 打字台
     ====================================================================== */

  function loadText(text, demo) {
    demoPlayer.stop();
    engine.load(text, { demo: !!demo });
    engine.caseSensitive = state.settings.caseSensitive;
    engine.strict = state.settings.strict;
    resetStatsDisplay();
    dom.startHint.classList.toggle('fade', !!demo);
    keyboard.clearStates();
    hands.clear();
    dom.handBadge.textContent = demo ? '演示待机' : '待命';
    resetImeHint();
    updateNextPanel(engine.currentInfo());
  }

  function restartCurrent() {
    if (!engine.chars.length) return;
    demoPlayer.stop();
    engine.restart();
    resetStatsDisplay();
    hands.clear();
    keyboard.clearStates();
    dom.startHint.classList.toggle('fade', !!engine.demoMode);
    dom.handBadge.textContent = engine.demoMode ? '演示待机' : '待命';
    resetImeHint();
    updateNextPanel(engine.currentInfo());
  }

  function resetStatsDisplay() {
    dom.statWpm.textContent = '0';
    dom.statAcc.textContent = '100';
    dom.statTime.textContent = '0';
    dom.statErr.textContent = '0';
    dom.statProg.textContent = '0';
    dom.progressBar.style.width = '0%';
  }

  function updateStats(s) {
    dom.statWpm.textContent = s.wpm;
    dom.statAcc.textContent = s.acc;
    dom.statTime.textContent = s.seconds;
    dom.statErr.textContent = s.wrong;
    dom.statProg.textContent = s.progress;
    dom.progressBar.style.width = s.progress + '%';
  }

  /** 每次击键后立即刷新，避免短文本练习时统计条滞后 */
  function refreshStats() {
    if (!engine || !engine.chars.length) return;
    updateStats(engine.stats());
  }

  function updateNextPanel(info) {
    const cur = engine.currentChar();
    dom.nextChar.className = 'next-char';

    if (!cur) {
      dom.nextChar.textContent = '·';
      dom.nextCode.textContent = engine.demoMode ? '演示结束' : '等待开始';
      dom.nextFinger.textContent = '—';
      dom.nextChar.style.removeProperty('--fc');
      return;
    }

    dom.nextChar.textContent = TT.Engine.displayChar(cur);
    if (info && info.finger) {
      dom.nextChar.classList.add('has-fc');
      dom.nextChar.style.setProperty('--fc', 'var(--finger-' + info.finger + ')');
    } else {
      dom.nextChar.style.removeProperty('--fc');
    }
    dom.nextCode.textContent = keyLabelFull(info);
    dom.nextFinger.innerHTML = escapeHtml((info && info.fingerName) || '标准键盘外字符') +
      (info && info.shift ? '<span class="shift-tag">按住 Shift</span>' : '');
  }

  function setImeHint(text, warn) {
    dom.imeHint.textContent = text;
    dom.imeHint.classList.toggle('warn', !!warn);
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(resetImeHint, 3200);
  }

  function resetImeHint() {
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = 0; }
    dom.imeHint.textContent = DEFAULT_IME_HINT;
    dom.imeHint.classList.remove('warn');
  }

  function shakeDisplay() {
    dom.textDisplay.classList.remove('is-shake');
    void dom.textDisplay.offsetWidth;
    dom.textDisplay.classList.add('is-shake');
    setTimeout(function () { dom.textDisplay.classList.remove('is-shake'); }, 320);
  }

  /* ======================================================================
     引擎回调
     ====================================================================== */

  function handleStart() {
    dom.startHint.classList.add('fade');
    dom.handBadge.textContent = '练习中';
    resetImeHint();
    refreshStats();
  }

  function handleNext(info) {
    if (state.settings.showNext && info && info.code) {
      keyboard.showNext(info.code, info.shiftCode);
    } else {
      keyboard.clearNext();
    }
    if (state.settings.showHands) {
      if (info && info.finger) hands.activate(info.finger);
      else hands.clear();
    }
    updateNextPanel(info);
  }

  function handleCorrect(info) {
    if (info && info.code === 'Space') TT.Sound.space();
    else TT.Sound.ok();
    if (state.settings.showHands && info && info.finger) hands.tap(info.finger);
    if (info && info.code) keyboard.press(info.code, false);
    refreshStats();
  }

  function handleError(info, index, typed, blocked) {
    TT.Sound.err();
    shakeDisplay();
    if (info && info.code) keyboard.press(info.code, true);
    const want = (info && info.keyLabel) ? info.keyLabel : '';
    if (blocked) {
      setImeHint('打错了，严格模式下必须按 Backspace 删除后重打。', true);
    } else if (typed === ' ') {
      setImeHint('多按了空格：单词之间只需要一个空格。', true);
    } else {
      setImeHint('打错了：这一位应该是「' + TT.Engine.displayChar(want) + '」，看看手型提示。', true);
    }
    refreshStats();
  }

  function handleBackspace() {
    TT.Sound.blip(220, 0.05, 'sine', 0.025);
    refreshStats();
  }

  function handleComplete(s) {
    TT.Sound.done();
    dom.handBadge.textContent = '已完成';
    hands.clear();
    keyboard.clearNext();
    refreshStats();
    recordResult(s);
    showResultModal(s);
  }

  function handleKeyClick(finger, code) {
    keyboard.showZone(finger);
    const meta = TT.FINGERS[finger];
    const key = TT.KEY_BY_CODE[code];
    if (meta && state.settings.showHands) hands.activate(finger);
    const label = key ? key.l : code;
    dom.nextChar.className = 'next-char has-fc';
    dom.nextChar.style.setProperty('--fc', 'var(--finger-' + finger + ')');
    dom.nextChar.textContent = (key && key.l.length === 1) ? key.l : '·';
    dom.nextCode.textContent = label + ' 键';
    dom.nextFinger.textContent = meta ? meta.name : '';
    if (zoneTimer) clearTimeout(zoneTimer);
    zoneTimer = setTimeout(function () { keyboard.clearZone(); }, 1500);
  }

  /* ======================================================================
     记录 / 薄弱键位
     ====================================================================== */

  function recordResult(s) {
    if (!s.started) return;
    const src = state.source || { type: 'custom', id: 'custom', name: '练习' };
    state.stats.records.unshift({
      type: src.type,
      id: src.id,
      name: src.name,
      wpm: s.wpm,
      acc: s.acc,
      wrong: s.wrong,
      seconds: s.seconds,
      chars: s.correct,
      total: s.total,
      at: Date.now()
    });
    if (state.stats.records.length > MAX_RECORDS) state.stats.records.length = MAX_RECORDS;
    state.stats.keyStats = TT.mergeKeyStats(state.stats.keyStats, s.keyStats);
    saveJSON(LS_STATS, state.stats);
    renderWeakKeys();
    renderRecords();
    renderLessons();
  }

  function renderWeakKeys() {
    renderWeakKeyChips(dom.weakKeys, TT.rankKeys(state.stats.keyStats, 12, 2),
      '还没有数据，先完成一次练习吧。');
    TT.renderHeatmap(dom.heatmap, state.stats.keyStats);
  }

  function renderWeakKeyChips(container, list, emptyText) {
    container.innerHTML = '';
    if (!list || !list.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = emptyText || '暂无数据。';
      container.appendChild(p);
      return;
    }
    list.forEach(function (item) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'weak-key';
      el.title = item.label + ' 键 · 击键 ' + item.hits + ' 次 / 错误 ' + item.errors + ' 次（点击加练）';
      el.innerHTML = '<span>' + escapeHtml(String(item.label)) + '</span><small>' +
        item.rate + '% · ' + item.errors + '次</small>';
      el.addEventListener('click', function () { drillKey(item.code); });
      container.appendChild(el);
    });
  }

  /** 针对某个薄弱键生成专项加练文本 */
  function drillKey(code) {
    const key = TT.KEY_BY_CODE[code];
    if (!key || !key.l || key.l.length !== 1) {
      setImeHint('该键不在标准字母/数字/符号范围内，暂时无法生成加练。', true);
      return;
    }
    const base = key.l.toLowerCase();
    const info = TT.charInfo(base);
    let pool = base;
    if (info && info.finger && TT.FINGER_KEYS[info.finger]) {
      pool += TT.FINGER_KEYS[info.finger].replace(/[^A-Za-z]/g, '').toLowerCase();
    }
    pool += 'asdfjkl;';
    pool = Array.from(new Set(Array.from(pool))).join('');

    state.freeSeed = (state.freeSeed * 1103515245 + 12345) % 2147483647;
    const rnd = TT.mulberry32(Math.abs(state.freeSeed));
    const out = [];
    let len = 0;
    let guard = 0;
    while (len < 200 && guard++ < 3000) {
      const n = 2 + Math.floor(rnd() * 4);
      let w = '';
      for (let i = 0; i < n; i++) w += pool[Math.floor(rnd() * pool.length)];
      out.push(w);
      len += w.length + 1;
    }

    closeModal();
    setTab('practice', true);
    state.source = { type: 'drill', id: code, name: '专项加练 · ' + key.l + ' 键' };
    dom.stageTitle.textContent = state.source.name;
    renderFocusKeys([base]);
    loadText(out.join(' '), false);
    setImeHint('已为「' + key.l + '」键生成一段加练文本，慢一点、看准手指。', false);
    dom.textDisplay.focus();
  }

  function renderRecords() {
    const list = state.stats.records;
    if (!list.length) {
      dom.records.innerHTML = '<p class="empty">暂无记录。</p>';
      return;
    }
    let best = 0;
    let accSum = 0;
    list.forEach(function (r) {
      if ((r.wpm || 0) > best) best = r.wpm || 0;
      accSum += r.acc || 0;
    });
    const avgAcc = (accSum / list.length).toFixed(1);

    let html = '<div class="record-summary">' +
      '<div>最佳速度<b>' + best + ' <span style="font-size:11px">WPM</span></b></div>' +
      '<div>平均准确率<b>' + avgAcc + '<span style="font-size:11px">%</span></b></div>' +
      '<div>练习次数<b>' + list.length + '</b></div>' +
      '</div>';

    list.slice(0, 8).forEach(function (r) {
      html += '<div class="record-row">' +
        '<span class="rr-name">' + escapeHtml(r.name || '练习') + '</span>' +
        '<span class="rr-wpm">' + (r.wpm || 0) + '</span>' +
        '<span class="rr-acc">' + (r.acc || 0) + '%</span>' +
        '</div>';
    });
    dom.records.innerHTML = html;
  }

  function evaluate(s) {
    const parts = [];
    if (s.acc >= 98) parts.push('准确率 ' + s.acc + '%，手指控制得非常稳。');
    else if (s.acc >= 95) parts.push('准确率 ' + s.acc + '%，已经达到熟练标准（≥95%）。');
    else if (s.acc >= 90) parts.push('准确率 ' + s.acc + '%，还有提升空间，建议先稍微放慢一点。');
    else parts.push('准确率只有 ' + s.acc + '%，先把速度降到舒适区，保证打得对再提速。');

    if (s.wpm >= 60) parts.push('速度 ' + s.wpm + ' WPM，已经是专业打字员水准。');
    else if (s.wpm >= 40) parts.push('速度 ' + s.wpm + ' WPM，属于日常流畅水平。');
    else if (s.wpm >= 25) parts.push('速度 ' + s.wpm + ' WPM，稳步提升中。');
    else parts.push('速度 ' + s.wpm + ' WPM，别着急，准确率上去后速度会自然跟着涨。');

    if (s.wrong === 0) parts.push('全程零失误，非常漂亮。');
    else parts.push('共出错 ' + s.wrong + ' 次，配合下方「易错键位」单独加练会更有效。');
    return parts.join('');
  }

  /* ======================================================================
     成绩弹窗
     ====================================================================== */

  function showResultModal(s) {
    dom.resWpm.textContent = s.wpm;
    dom.resAcc.textContent = s.acc + '%';
    dom.resTime.textContent = s.seconds + 's';
    dom.resChars.textContent = s.correct + '/' + s.total;
    dom.resNote.textContent = evaluate(s);
    dom.resultTitle.textContent = (state.source ? state.source.name : '练习') + ' · 完成！';
    renderWeakKeyChips(dom.resWeakKeys, TT.rankKeys(s.keyStats, 8, 1), '本次没有出错，非常稳！');
    const isLesson = !!(state.source && state.source.type === 'lesson');
    dom.btnNextLesson.disabled = !isLesson;
    dom.resultModal.classList.remove('hidden');
  }

  function closeModal() {
    dom.resultModal.classList.add('hidden');
  }

  /* ======================================================================
     自由练习
     ====================================================================== */

  function selectFreeMode(mode) {
    state.freeMode = mode;
    Array.prototype.forEach.call(dom.freeModeSeg.querySelectorAll('.seg-btn'), function (b) {
      b.classList.toggle('is-active', b.dataset.mode === mode);
    });
    dom.freeRowLen.classList.toggle('hidden', mode === 'custom');
    dom.freeRowCustom.classList.toggle('hidden', mode !== 'custom');
    if (mode === 'custom') {
      dom.freeText.focus();
      return;
    }
    generateFreeText();
  }

  function generateFreeText() {
    const mode = state.freeMode;
    if (mode === 'custom') { useCustomText(); return; }

    const words = Math.max(10, Math.min(150, Number(dom.freeLen.value) || 40));
    state.freeSeed = (state.freeSeed * 1103515245 + 12345) % 2147483647;
    const seed = Math.abs(state.freeSeed) + 1;

    let text = '';
    let name = '';

    if (mode === 'words') {
      text = TT.fromWords(TT.FREE_BANKS.words, seed, words * 6);
      name = '自由练习 · 随机单词';
    } else if (mode === 'tech') {
      text = TT.fromWords(TT.FREE_BANKS.tech, seed, words * 8);
      name = '自由练习 · 编程词汇';
    } else {
      const rnd = TT.mulberry32(seed);
      const target = words * 6;
      const out = [];
      let len = 0;
      let guard = 0;
      while (len < target && guard++ < 400) {
        const p = TT.PARAGRAPHS[Math.floor(rnd() * TT.PARAGRAPHS.length)];
        out.push(p);
        len += p.length + 1;
      }
      text = out.join(' ');
      name = '自由练习 · 英文段落';
    }

    state.source = { type: 'free', id: mode, name: name };
    dom.stageTitle.textContent = name;
    renderFocusKeys([]);
    loadText(normText(text), false);
  }

  function useCustomText() {
    const raw = dom.freeText.value;
    if (!raw || !raw.trim()) {
      setImeHint('请先在文本框里粘贴要练习的内容。', true);
      dom.freeText.focus();
      return;
    }
    const text = (raw.indexOf('\n') >= 0) ? normCode(raw) : normText(raw);
    if (!text) {
      setImeHint('文本里没有可练习的字符。', true);
      return;
    }
    const unmapped = countUnmapped(text);
    state.source = { type: 'custom', id: 'custom', name: '自定义文本' };
    dom.stageTitle.textContent = '自定义文本';
    renderFocusKeys([]);
    loadText(text, false);
    dom.textDisplay.focus();
    if (unmapped > 0) {
      setImeHint('注意：文本中有 ' + unmapped + ' 个字符不属于标准英文键盘（如中文、emoji），无法给出指法提示。', true);
    }
  }

  /* ======================================================================
     指法演示
     ====================================================================== */

  function renderDemoSelect() {
    dom.demoSelect.innerHTML = '';
    TT.DEMO_TEXTS.forEach(function (d) {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = d.name;
      dom.demoSelect.appendChild(o);
    });
    dom.demoSpeedVal.textContent = dom.demoSpeed.value;
    demoPlayer.setSpeed(Number(dom.demoSpeed.value));
    demoPlayer.setLoop(dom.demoLoop.checked);
  }

  function prepareDemo() {
    const id = dom.demoSelect.value;
    let d = null;
    for (let i = 0; i < TT.DEMO_TEXTS.length; i++) if (TT.DEMO_TEXTS[i].id === id) d = TT.DEMO_TEXTS[i];
    if (!d) d = TT.DEMO_TEXTS[0];

    state.source = { type: 'demo', id: d.id, name: '指法演示 · ' + d.name };
    dom.stageTitle.textContent = state.source.name;
    renderFocusKeys([]);
    loadText(d.text, true);
  }

  function handleDemoChar(ch, info, done) {
    if (done) {
      dom.handBadge.textContent = '本轮结束';
      return;
    }
    const s = engine.stats();
    dom.statProg.textContent = s.progress;
    dom.progressBar.style.width = s.progress + '%';
    dom.statTime.textContent = s.seconds;
  }

  function handleDemoState(playing) {
    dom.btnDemoPlay.disabled = playing;
    dom.btnDemoStop.disabled = !playing;
    dom.handBadge.textContent = playing ? '演示中' : (engine.chars.length && engine.finished ? '本轮结束' : '演示待机');
  }

  /* ======================================================================
     手指图例
     ====================================================================== */

  function renderFingerLegend() {
    dom.fingerLegend.innerHTML = '';
    TT.FINGER_ORDER.forEach(function (id) {
      const f = TT.FINGERS[id];
      const keys = TT.FINGER_KEYS[id] || '';
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.dataset.finger = id;
      item.style.setProperty('--fc', 'var(--finger-' + id + ')');
      item.title = f.name + ' 负责：' + keys;
      item.innerHTML = '<span class="legend-dot"></span><span class="legend-name">' +
        escapeHtml(f.short) + '</span><span class="legend-keys">' + escapeHtml(keys) + '</span>';

      item.addEventListener('mouseenter', function () { keyboard.showZone(id); });
      item.addEventListener('mouseleave', function () { keyboard.clearZone(); });
      item.addEventListener('click', function () {
        keyboard.showZone(id);
        if (state.settings.showHands) hands.activate(id);
        const home = (f.home === '␣') ? '空格' : f.home;
        dom.nextChar.className = 'next-char has-fc';
        dom.nextChar.style.setProperty('--fc', 'var(--finger-' + id + ')');
        dom.nextChar.textContent = (f.home === '␣') ? '␣' : f.home;
        dom.nextCode.textContent = f.name + '（基准键 ' + home + '）';
        dom.nextFinger.textContent = '负责 ' + keys;
        setImeHint(f.name + ' 负责这些键：' + keys + '。', false);
      });
      dom.fingerLegend.appendChild(item);
    });
  }

  /* ======================================================================
     标签页 / 事件绑定
     ====================================================================== */

  function setTab(name, skipLoad) {
    state.tab = name;
    ['practice', 'free', 'demo'].forEach(function (t) {
      dom['view-' + t].classList.toggle('hidden', t !== name);
    });
    Array.prototype.forEach.call(dom.tabs.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('is-active', b.dataset.tab === name);
      b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false');
    });

    if (name !== 'demo') demoPlayer.stop();
    if (skipLoad) { renderLessons(); return; }

    if (name === 'practice') {
      loadLesson(state.lessonId);
    } else if (name === 'free') {
      selectFreeMode(state.freeMode);
    } else if (name === 'demo') {
      prepareDemo();
    }
  }

  function bindEvents() {
    /* 标签页 */
    Array.prototype.forEach.call(dom.tabs.querySelectorAll('.tab'), function (b) {
      b.addEventListener('click', function () { setTab(b.dataset.tab); });
    });

    /* 顶栏按钮 */
    dom.btnTheme.addEventListener('click', function () {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    dom.btnSound.addEventListener('click', function () {
      state.settings.soundOn = !state.settings.soundOn;
      syncSettingInputs();
      applySetting('soundOn');
      saveSettings();
    });

    dom.btnSettings.addEventListener('click', function (e) {
      e.stopPropagation();
      dom.settingsPop.classList.toggle('hidden');
    });

    /* 设置开关 */
    const settingMap = [
      ['setColorKeys', 'colorKeys'],
      ['setShowNext', 'showNext'],
      ['setShowHands', 'showHands'],
      ['setStrict', 'strict'],
      ['setCaseSensitive', 'caseSensitive'],
      ['setSoundOn', 'soundOn']
    ];
    settingMap.forEach(function (pair) {
      dom[pair[0]].addEventListener('change', function () {
        state.settings[pair[1]] = dom[pair[0]].checked;
        applySetting(pair[1]);
        saveSettings();
      });
    });

    /* 点击外部关闭设置弹层 */
    document.addEventListener('click', function (e) {
      if (dom.settingsPop.classList.contains('hidden')) return;
      if (e.target.closest && (e.target.closest('#settingsPop') || e.target.closest('#btnSettings'))) return;
      dom.settingsPop.classList.add('hidden');
    });

    /* 键盘输入 */
    document.addEventListener('keydown', onKeyDown);

    /* 打字台 */
    dom.textDisplay.addEventListener('click', function () {
      if (engine.demoMode) return;
      dom.textDisplay.focus();
      if (engine.chars.length) dom.startHint.classList.add('fade');
    });

    /* 打字台控制 */
    dom.btnRestart.addEventListener('click', restartCurrent);
    dom.btnPrev.addEventListener('click', function () { stepLesson(-1); });
    dom.btnNext.addEventListener('click', function () { stepLesson(1); });

    /* 自由练习 */
    Array.prototype.forEach.call(dom.freeModeSeg.querySelectorAll('.seg-btn'), function (b) {
      b.addEventListener('click', function () { selectFreeMode(b.dataset.mode); });
    });
    dom.freeLen.addEventListener('input', function () {
      dom.freeLenVal.textContent = dom.freeLen.value;
    });
    dom.freeLen.addEventListener('change', function () { generateFreeText(); });
    dom.btnGenerate.addEventListener('click', generateFreeText);
    dom.btnUseCustom.addEventListener('click', useCustomText);

    /* 演示 */
    dom.btnDemoPlay.addEventListener('click', function () {
      TT.Sound.resume();
      if (!engine.demoMode) prepareDemo();
      demoPlayer.start();
    });
    dom.btnDemoStop.addEventListener('click', function () { demoPlayer.stop(); });
    dom.demoSpeed.addEventListener('input', function () {
      const v = Number(dom.demoSpeed.value) || 120;
      dom.demoSpeedVal.textContent = v;
      demoPlayer.setSpeed(v);
    });
    dom.demoLoop.addEventListener('change', function () { demoPlayer.setLoop(dom.demoLoop.checked); });
    dom.demoSelect.addEventListener('change', function () { prepareDemo(); });

    /* 统计 */
    dom.btnResetStats.addEventListener('click', function () {
      if (!global.confirm('确定要清空所有练习记录和薄弱键位统计吗？此操作不可撤销。')) return;
      state.stats = { keyStats: {}, records: [] };
      saveJSON(LS_STATS, state.stats);
      renderWeakKeys();
      renderRecords();
      renderLessons();
      setImeHint('已清空全部练习记录。', false);
    });

    /* 成绩弹窗 */
    dom.btnCloseModal.addEventListener('click', closeModal);
    dom.btnAgain.addEventListener('click', function () { closeModal(); restartCurrent(); });
    dom.btnNextLesson.addEventListener('click', function () { closeModal(); stepLesson(1); });
    dom.resultModal.addEventListener('click', function (e) {
      if (e.target === dom.resultModal) closeModal();
    });
  }

  /* ======================================================================
     键盘输入分发
     ====================================================================== */

  function onKeyDown(e) {
    /* 成绩弹窗打开时：Esc 关闭 / Enter 再练一次 */
    if (!dom.resultModal.classList.contains('hidden')) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      else if (e.key === 'Enter') { e.preventDefault(); closeModal(); restartCurrent(); }
      return;
    }

    if (e.key === 'Escape') {
      if (!dom.settingsPop.classList.contains('hidden')) dom.settingsPop.classList.add('hidden');
      return;
    }

    /* 表单控件内不拦截 */
    const t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;

    /* 快捷键 */
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); restartCurrent(); return; }
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); stepLesson(-1); return; }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); stepLesson(1); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'CapsLock') {
      setImeHint('大写锁定（Caps Lock）已开启：除练习大写字母外请关掉它。', true);
      return;
    }

    /* 输入法组合中 */
    if (e.isComposing || e.keyCode === 229) {
      setImeHint('检测到中文输入法正在组词，请按 Shift 切到英文输入。', true);
      return;
    }

    if (!engine.chars.length) return;
    if (engine.demoMode) {
      setImeHint('当前是指法演示模式，切到「课程练习」或「自由练习」就能动手打字。', false);
      return;
    }
    if (engine.finished) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      engine.backspace();
      return;
    }

    let ch = null;
    if (e.key === 'Enter') ch = '\n';
    else if (e.key === 'Tab') ch = '\t';
    else if (e.key.length === 1) ch = e.key;
    if (ch === null) return;

    e.preventDefault();
    TT.Sound.resume();
    engine.typeChar(ch);
  }

  /* ---------------- 启动 ---------------- */
  boot();

})(window);

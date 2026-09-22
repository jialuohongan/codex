/* ==========================================================================
   打字引擎：文本渲染 / 击键判定 / 实时统计 / 演示步进
   ========================================================================== */
(function (global) {
  'use strict';

  class Engine {
    /**
     * options: {
     *   el,             文本容器（.text-content）
     *   display,        外层滚动容器（.text-display）
     *   caseSensitive,  是否区分大小写
     *   strict,         严格模式：打错必须退格
     *   onStart / onNext / onCorrect / onError / onBackspace / onProgress / onComplete
     * }
     */
    constructor(options) {
      const opts = options || {};
      this.el = opts.el || null;
      this.display = opts.display || null;
      this.handlers = {
        onStart: opts.onStart || null,
        onNext: opts.onNext || null,
        onCorrect: opts.onCorrect || null,
        onError: opts.onError || null,
        onBackspace: opts.onBackspace || null,
        onProgress: opts.onProgress || null,
        onComplete: opts.onComplete || null
      };
      this.caseSensitive = opts.caseSensitive !== false;
      this.strict = !!opts.strict;
      this.text = '';
      this.chars = [];
      this.demoMode = false;
      this.reset();
    }

    /* ---------------- 生命周期 ---------------- */

    /** 载入新文本；opts.demo=true 时进入演示模式（不接受键盘输入） */
    load(text, opts) {
      const o = opts || {};
      this.demoMode = !!o.demo;
      this.text = typeof text === 'string' ? text : '';
      this.reset();
      this.build();
      this.updateCurrent(-1);
    }

    /** 保留文本、清空进度 */
    restart() {
      this.reset();
      this.build();
      this.updateCurrent(-1);
    }

    reset() {
      if (this.timer) { clearInterval(this.timer); this.timer = 0; }
      this.index = 0;
      this.started = false;
      this.finished = false;
      this.startTime = 0;
      this.elapsed = 0;
      this.correct = 0;
      this.wrong = 0;
      this.keyStats = {};
      this.errorIdx = new Set();
    }

    /* ---------------- 文本渲染 ---------------- */

    build() {
      if (!this.el) return;
      this.el.innerHTML = '';
      const frag = document.createDocumentFragment();
      this.chars = Array.from(this.text).map(function (ch) {
        const span = document.createElement('span');
        span.textContent = ch === '\t' ? '    ' : ch;
        frag.appendChild(span);
        return { ch: ch, span: span, info: TT.charInfo(ch), state: 'pending', wrong: false };
      });
      this.el.appendChild(frag);
      this.chars.forEach(function (t) { this.applyClass(t, false); }, this);
    }

    /** 计算单个字符应有的类名 */
    applyClass(t, isCurrent) {
      let cls = 'ch';
      if (t.ch === ' ') cls += ' space';
      else if (t.ch === '\n' || t.ch === '\t') cls += ' linebreak';
      if (t.wrong) cls += ' err';
      if (t.state === 'ok') cls += ' done';
      else if (t.state === 'demo') cls += ' demo-done';
      if (isCurrent) cls += ' current';
      t.span.className = cls;
    }

    /** 把光标移到 this.index，并通知外部「下一个键」 */
    updateCurrent(prevIndex) {
      if (prevIndex >= 0 && this.chars[prevIndex]) this.applyClass(this.chars[prevIndex], false);
      const t = this.chars[this.index];
      if (t) {
        this.applyClass(t, true);
        this.scrollTo(t.span);
      }
      this.emitNext();
    }

    emitNext() {
      const t = this.chars[this.index];
      if (this.handlers.onNext) this.handlers.onNext(t ? t.info : null, this.index, this);
    }

    scrollTo(span) {
      const box = this.display;
      if (!box || !span) return;
      const b = box.getBoundingClientRect();
      const s = span.getBoundingClientRect();
      if (s.top < b.top + 6) box.scrollTop -= (b.top + 6 - s.top);
      else if (s.bottom > b.bottom - 6) box.scrollTop += (s.bottom - b.bottom + 6);
    }

    /* ---------------- 输入 ---------------- */

    /** 输入一个字符，返回 { ok, info, index, blocked } 或 null */
    typeChar(ch) {
      if (this.demoMode || this.finished) return null;
      const t = this.chars[this.index];
      if (!t || typeof ch !== 'string' || !ch) return null;
      if (!this.started) this.start();

      const info = t.info || { code: '', shift: false, shiftCode: '', finger: '', keyLabel: ch };
      let ok = ch === t.ch;
      if (!ok && !this.caseSensitive) ok = ch.toLowerCase() === t.ch.toLowerCase();

      if (info.code) {
        const s = this.stat(info.code);
        s.hits++;
        if (!ok) s.errors++;
      }

      if (ok) {
        if (t.state !== 'ok') this.correct++;
        t.state = 'ok';
        const at = this.index;
        this.index++;
        this.updateCurrent(at);
        if (this.handlers.onCorrect) this.handlers.onCorrect(info, at, this);
        if (this.index >= this.chars.length) this.finish();
        return { ok: true, info: info, index: at, blocked: false };
      }

      this.wrong++;
      this.errorIdx.add(this.index);
      t.wrong = true;
      const at = this.index;

      if (this.strict) {
        this.applyClass(t, true);
        if (this.handlers.onError) this.handlers.onError(info, at, ch, true, this);
        return { ok: false, info: info, index: at, blocked: true };
      }

      t.state = 'bad';
      this.index++;
      this.updateCurrent(at);
      if (this.handlers.onError) this.handlers.onError(info, at, ch, false, this);
      if (this.index >= this.chars.length) this.finish();
      return { ok: false, info: info, index: at, blocked: false };
    }

    /** 退格：严格模式下先清除当前错字标记，否则回退一个字符 */
    backspace() {
      if (this.demoMode || this.finished) return false;
      const cur = this.chars[this.index];
      if (cur && cur.wrong && cur.state === 'pending') {
        cur.wrong = false;
        this.applyClass(cur, true);
        if (this.handlers.onBackspace) this.handlers.onBackspace(this.index, this);
        return true;
      }
      if (this.index === 0) return false;

      const from = this.index;
      const t = this.chars[from - 1];
      if (t.state === 'ok') this.correct = Math.max(0, this.correct - 1);
      t.state = 'pending';
      this.index = from - 1;
      this.applyClass(this.chars[from], false);
      this.applyClass(t, true);
      this.scrollTo(t.span);
      this.emitNext();
      if (this.handlers.onBackspace) this.handlers.onBackspace(this.index, this);
      return true;
    }

    /* ---------------- 演示模式 ---------------- */

    /** 前进一个字符（由 demo.js 按节奏调用），返回被点亮的字符信息 */
    demoStep() {
      if (!this.demoMode) return null;
      const t = this.chars[this.index];
      if (!t) return null;
      const stepped = { ch: t.ch, info: t.info, index: this.index };
      t.state = 'demo';
      this.index++;
      this.updateCurrent(stepped.index);
      if (this.index >= this.chars.length) this.finished = true;
      return stepped;
    }

    demoRestart() {
      this.index = 0;
      this.finished = false;
      this.chars.forEach(function (t) { t.state = 'pending'; t.wrong = false; });
      this.updateCurrent(-1);
    }

    /* ---------------- 统计 ---------------- */

    start() {
      this.started = true;
      this.startTime = Date.now();
      if (this.handlers.onStart) this.handlers.onStart(this);
      const self = this;
      this.timer = setInterval(function () {
        if (self.handlers.onProgress) self.handlers.onProgress(self.stats());
      }, 250);
    }

    finish() {
      if (this.finished) return;
      this.finished = true;
      this.elapsed = this.elapsedMs();
      if (this.timer) { clearInterval(this.timer); this.timer = 0; }
      const last = this.chars[this.chars.length - 1];
      if (last) this.applyClass(last, false);
      if (this.handlers.onComplete) this.handlers.onComplete(this.stats(), this);
    }

    elapsedMs() {
      if (!this.started) return 0;
      if (this.finished) return this.elapsed;
      return Date.now() - this.startTime;
    }

    stat(code) {
      let s = this.keyStats[code];
      if (!s) s = this.keyStats[code] = { code: code, hits: 0, errors: 0 };
      return s;
    }

    stats() {
      const total = this.chars.length;
      const ms = this.elapsedMs();
      const minutes = ms / 60000;
      const typed = this.correct + this.wrong;
      return {
        total: total,
        index: this.index,
        correct: this.correct,
        wrong: this.wrong,
        errorChars: this.errorIdx.size,
        elapsed: ms,
        seconds: Math.round(ms / 1000),
        wpm: minutes > 0.008 ? Math.round((this.correct / 5) / minutes) : 0,
        acc: typed > 0 ? Math.round((this.correct / typed) * 1000) / 10 : 100,
        progress: total ? Math.min(100, Math.round((this.index / total) * 100)) : 0,
        keyStats: this.keyStats,
        started: this.started,
        finished: this.finished,
        demo: this.demoMode
      };
    }

    charAt(i) {
      const t = this.chars[i];
      return t ? t.ch : '';
    }

    currentChar() { return this.charAt(this.index); }

    currentInfo() {
      const t = this.chars[this.index];
      return t ? t.info : null;
    }

    /** 显示用字符（空格/换行用可见符号） */
    static displayChar(ch) {
      if (ch === ' ') return '␣';
      if (ch === '\n') return '↵';
      if (ch === '\t') return '⇥';
      return ch;
    }
  }

  /** 按键错误排行：错误率高者优先 */
  function rankKeys(keyStats, limit, minHits) {
    const min = minHits || 1;
    return Object.keys(keyStats || {})
      .map(function (code) {
        const s = keyStats[code] || {};
        return { code: code, hits: s.hits || 0, errors: s.errors || 0 };
      })
      .filter(function (s) { return s.errors > 0 && s.hits >= min; })
      .sort(function (a, b) {
        const ra = a.errors / Math.max(1, a.hits);
        const rb = b.errors / Math.max(1, b.hits);
        if (rb !== ra) return rb - ra;
        return b.errors - a.errors;
      })
      .slice(0, limit || 8)
      .map(function (s) {
        const key = TT.KEY_BY_CODE[s.code];
        s.label = key ? key.l : s.code;
        s.rate = Math.round((s.errors / Math.max(1, s.hits)) * 100);
        return s;
      });
  }

  /** 把一次练习的按键统计累加进总表 */
  function mergeKeyStats(target, source) {
    const out = target || {};
    Object.keys(source || {}).forEach(function (code) {
      const s = source[code];
      if (!out[code]) out[code] = { code: code, hits: 0, errors: 0 };
      out[code].hits += s.hits || 0;
      out[code].errors += s.errors || 0;
    });
    return out;
  }

  const TT = global.TT;
  TT.Engine = Engine;
  TT.rankKeys = rankKeys;
  TT.mergeKeyStats = mergeKeyStats;
})(window);

/* ==========================================================================
   虚拟键盘：渲染 / 指法着色 / 下一键高亮 / 按压反馈 / 错误热力图
   ========================================================================== */
(function (global) {
  'use strict';

  const TT = global.TT;

  class Keyboard {
    constructor(container) {
      this.el = container;
      this.keys = {};
      this.build();
      this.bind();
    }

    build() {
      const frag = document.createDocumentFragment();
      TT.KEY_ROWS.forEach(function (row) {
        const rowEl = document.createElement('div');
        rowEl.className = 'kb-row';
        row.forEach(function (key) {
          const el = document.createElement('div');
          el.className = 'key' + (key.k === 'mod' ? ' is-mod' : '');
          el.dataset.code = key.c;
          el.style.setProperty('--w', key.w);
          if (key.f && TT.FINGERS[key.f]) {
            el.dataset.finger = key.f;
            el.style.setProperty('--fc', 'var(--finger-' + key.f + ')');
            el.title = key.l + ' · ' + TT.FINGERS[key.f].name;
          }
          const isLetter = /^[A-Za-z]$/.test(key.l);
          if (key.s && !isLetter) {
            const up = document.createElement('span');
            up.className = 'k-shift';
            up.textContent = key.s;
            const down = document.createElement('span');
            down.className = 'k-base';
            down.textContent = key.l;
            el.appendChild(up);
            el.appendChild(down);
          } else {
            const span = document.createElement('span');
            span.className = 'k-base';
            span.textContent = key.l;
            el.appendChild(span);
          }
          rowEl.appendChild(el);
          this.keys[key.c] = el;
        }, this);
        frag.appendChild(rowEl);
      }, this);
      this.el.appendChild(frag);
      this.el.classList.add('colored');
    }

    bind() {
      const self = this;
      this.el.addEventListener('click', function (e) {
        const keyEl = e.target.closest('.key');
        if (!keyEl || !keyEl.dataset.finger) return;
        if (self.onKeyClick) self.onKeyClick(keyEl.dataset.finger, keyEl.dataset.code);
      });
    }

    get(code) { return this.keys[code]; }

    setColored(on) { this.el.classList.toggle('colored', !!on); }

    clearStates() {
      Object.keys(this.keys).forEach(function (code) {
        this.keys[code].classList.remove('next', 'next-shift', 'down', 'wrong', 'zone');
      }, this);
    }

    /** 高亮下一个要按的键；shiftCode 为需要同时按住的 Shift */
    showNext(code, shiftCode) {
      Object.keys(this.keys).forEach(function (c) {
        this.keys[c].classList.remove('next', 'next-shift');
      }, this);
      const main = this.keys[code];
      if (main) main.classList.add('next');
      if (shiftCode && this.keys[shiftCode]) this.keys[shiftCode].classList.add('next', 'next-shift');
    }

    /** 按下反馈；wrong=true 时显示红色 */
    press(code, wrong) {
      const el = this.keys[code];
      if (!el) return;
      el.classList.add(wrong ? 'wrong' : 'down');
      setTimeout(function () { el.classList.remove('down', 'wrong'); }, wrong ? 260 : 110);
    }

    /** 高亮某个手指负责的全部键区 */
    showZone(fingerId) {
      Object.keys(this.keys).forEach(function (code) {
        const el = this.keys[code];
        el.classList.toggle('zone', el.dataset.finger === fingerId);
      }, this);
    }

    clearZone() {
      Object.keys(this.keys).forEach(function (code) {
        this.keys[code].classList.remove('zone');
      }, this);
    }

    /** 清除「下一键」高亮 */
    clearNext() {
      Object.keys(this.keys).forEach(function (code) {
        this.keys[code].classList.remove('next', 'next-shift');
      }, this);
    }
  }

  /* ---------------- 迷你错误热力图 ---------------- */
  function renderHeatmap(container, keyStats) {
    container.innerHTML = '';
    let max = 0;
    Object.keys(keyStats || {}).forEach(function (code) {
      const s = keyStats[code];
      if (s.errors > max) max = s.errors;
    });
    TT.KEY_ROWS.forEach(function (row) {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(function (key) {
        if (key.k === 'mod' && key.c !== 'Space' && key.c !== 'Enter') return;
        const el = document.createElement('div');
        el.className = 'mini-key';
        el.style.setProperty('--w', key.w);
        el.textContent = key.c === 'Space' ? '␣' : (/^[A-Za-z]$/.test(key.l) ? key.l : (key.l.length > 2 ? '␣' : key.l));
        const s = keyStats ? keyStats[key.c] : null;
        if (s && s.errors > 0 && max > 0) {
          const ratio = s.errors / max;
          el.dataset.level = ratio > 0.66 ? '3' : (ratio > 0.33 ? '2' : '1');
          el.title = key.l + ' · 错误 ' + s.errors + ' 次 / 击键 ' + s.hits + ' 次';
        } else {
          el.title = key.l;
        }
        rowEl.appendChild(el);
      });
      container.appendChild(rowEl);
    });
  }

  TT.Keyboard = Keyboard;
  TT.renderHeatmap = renderHeatmap;
})(window);

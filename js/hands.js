/* ==========================================================================
   手型指法演示：SVG 双手俯视图，实时点亮应该使用的手指
   ========================================================================== */
(function (global) {
  'use strict';

  const TT = global.TT;
  const VB_W = 560;
  const VB_H = 258;

  /* 右手沿用左手槽位的几何形状，但手指身份要映射到右手指 */
  const HAND_MIRROR = { lp: 'rp', lr: 'rr', lm: 'rm', li: 'ri', th: 'th' };

  function geom(mirror) {
    const M = function (x) { return mirror ? VB_W - x : x; };
    const MR = function (x, w) { return mirror ? VB_W - x - w : x; };
    return {
      palm: { x: MR(28, 186), y: 114, w: 186, h: 106, rx: 46 },
      wrist: { x: MR(84, 86), y: 202, w: 86, h: 38, rx: 19 },
      nameX: M(127),
      fingers: {
        lp: { base: [M(60), 148], tip: [M(39), 78], w: 29 },
        lr: { base: [M(95), 140], tip: [M(84), 46], w: 31 },
        lm: { base: [M(131), 138], tip: [M(128), 36], w: 32 },
        li: { base: [M(167), 142], tip: [M(179), 56], w: 32 },
        th: { base: [M(190), 178], tip: [M(243), 198], w: 33 }
      }
    };
  }

  function handMarkup(mirror, handName) {
    const g = geom(mirror);
    const out = [];
    out.push('<g class="hand" data-hand="' + (mirror ? 'right' : 'left') + '">');
    out.push('<rect class="hand-palm" x="' + g.wrist.x + '" y="' + g.wrist.y + '" width="' + g.wrist.w + '" height="' + g.wrist.h + '" rx="' + g.wrist.rx + '"/>');
    out.push('<rect class="hand-palm" x="' + g.palm.x + '" y="' + g.palm.y + '" width="' + g.palm.w + '" height="' + g.palm.h + '" rx="' + g.palm.rx + '"/>');

    ['lp', 'lr', 'lm', 'li', 'th'].forEach(function (slot) {
      const f = g.fingers[slot];
      const id = mirror ? HAND_MIRROR[slot] : slot;
      const bx = f.base[0], by = f.base[1], tx = f.tip[0], ty = f.tip[1];
      const dx = tx - bx, dy = ty - by;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const lx = tx + (dx / len) * 18;
      const ly = ty + (dy / len) * 18;
      const meta = TT.FINGERS[id];
      out.push(
        '<g class="finger f-' + id + '" data-finger="' + id + '" style="--fw:' + f.w + 'px;--fc:var(--finger-' + id + ')">' +
          '<line class="finger-outline" x1="' + bx + '" y1="' + by + '" x2="' + tx + '" y2="' + ty + '"/>' +
          '<line class="finger-body" x1="' + bx + '" y1="' + by + '" x2="' + tx + '" y2="' + ty + '"/>' +
          '<circle class="fingertip" cx="' + tx + '" cy="' + ty + '" r="' + (f.w / 2 - 6) + '"/>' +
          '<circle class="tap-ring" cx="' + tx + '" cy="' + ty + '" r="' + (f.w / 2 + 3) + '"/>' +
          '<text class="home-label" x="' + lx.toFixed(1) + '" y="' + (ly + 3.5).toFixed(1) + '">' + meta.home + '</text>' +
          '<title>' + meta.name + '（基准键 ' + meta.home + '）</title>' +
        '</g>'
      );
    });

    out.push('<text class="hand-name" x="' + g.nameX + '" y="252">' + handName + '</text>');
    out.push('</g>');
    return out.join('');
  }

  class Hands {
    constructor(container) {
      this.el = container;
      this.groups = {};
      this.onFingerClick = null;
      this.render();
    }

    render() {
      const svg =
        '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="双手指法示意图">' +
        handMarkup(false, '左手 Left') +
        handMarkup(true, '右手 Right') +
        '</svg>';
      this.el.innerHTML = svg;
      const self = this;
      this.el.querySelectorAll('.finger').forEach(function (g) {
        const id = g.dataset.finger;
        (self.groups[id] = self.groups[id] || []).push(g);
        g.addEventListener('click', function () {
          if (self.onFingerClick) self.onFingerClick(id);
        });
      });
    }

    clear() {
      this.el.querySelectorAll('.finger').forEach(function (g) {
        g.classList.remove('is-active', 'is-down');
      });
    }

    /** 点亮即将使用的手指 */
    activate(fingerId) {
      this.clear();
      if (!fingerId) return;
      (this.groups[fingerId] || []).forEach(function (g) { g.classList.add('is-active'); });
    }

    /** 击键瞬间的按压动画（保留 is-active，重播涟漪） */
    tap(fingerId) {
      const list = this.groups[fingerId] || [];
      list.forEach(function (g) {
        g.classList.remove('is-down');
        void g.getBoundingClientRect();
        g.classList.add('is-active', 'is-down');
      });
      setTimeout(function () {
        list.forEach(function (g) { g.classList.remove('is-down'); });
      }, 130);
    }
  }

  TT.Hands = Hands;
})(window);

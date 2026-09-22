/* ==========================================================================
   音效：用 Web Audio 合成，无需外部音频文件
   ========================================================================== */
(function (global) {
  'use strict';

  const Sound = {
    ctx: null,
    enabled: true,

    init: function () {
      if (this.ctx) return;
      const AC = global.AudioContext || global.webkitAudioContext;
      if (AC) this.ctx = new AC();
    },

    resume: function () {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    blip: function (freq, dur, type, vol) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol || 0.06, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    },

    ok: function () { this.blip(660 + Math.random() * 60, 0.05, 'triangle', 0.035); },
    err: function () { this.blip(150, 0.14, 'square', 0.05); },
    space: function () { this.blip(320, 0.045, 'sine', 0.03); },
    done: function () {
      const self = this;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        setTimeout(function () { self.blip(f, 0.22, 'sine', 0.05); }, i * 95);
      });
    }
  };

  global.TT = global.TT || {};
  global.TT.Sound = Sound;
})(window);

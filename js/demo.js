/* ==========================================================================
   指法演示播放器：按设定速度自动步进，同步点亮虚拟键盘与双手手型
   ========================================================================== */
(function (global) {
  'use strict';

  const TT = global.TT;

  const MIN_CPM = 30;
  const MAX_CPM = 320;

  class DemoPlayer {
    /**
     * options: {
     *   engine,       TT.Engine 实例（已 load(text, { demo: true })）
     *   keyboard,     TT.Keyboard 实例
     *   hands,        TT.Hands 实例
     *   onChar,       (char, info, done) => void   每步回调
     *   onStateChange (playing) => void
     * }
     */
    constructor(options) {
      const o = options || {};
      this.engine = o.engine || null;
      this.keyboard = o.keyboard || null;
      this.hands = o.hands || null;
      this.onChar = o.onChar || null;
      this.onStateChange = o.onStateChange || null;

      this.cpm = 120;      // 每分钟字符数
      this.loop = true;
      this.playing = false;
      this.timer = 0;
    }

    /* ---------------- 配置 ---------------- */

    setSpeed(cpm) {
      const n = Number(cpm);
      this.cpm = Math.min(MAX_CPM, Math.max(MIN_CPM, isFinite(n) && n > 0 ? n : 120));
    }

    setLoop(on) { this.loop = !!on; }

    /** 单字符间隔（毫秒） */
    intervalMs() {
      return Math.round(60000 / Math.max(MIN_CPM, this.cpm));
    }

    /* ---------------- 播放控制 ---------------- */

    start() {
      if (!this.engine) return;
      this.stop();
      this.engine.demoRestart();
      this.playing = true;
      this.notify();
      this.schedule();
    }

    stop() {
      const was = this.playing;
      this.playing = false;
      if (this.timer) { clearTimeout(this.timer); this.timer = 0; }
      if (this.hands) this.hands.clear();
      if (this.keyboard) { this.keyboard.clearZone(); this.keyboard.clearNext(); }
      if (was) this.notify();
    }

    toggle() { this.playing ? this.stop() : this.start(); }

    schedule() {
      const self = this;
      if (!this.playing) return;
      this.timer = setTimeout(function () { self.tick(); }, this.intervalMs());
    }

    /** 推进一个字符 */
    tick() {
      if (!this.playing) return;
      const stepped = this.engine.demoStep();

      if (!stepped) { this.finish(); return; }

      const info = stepped.info || null;

      if (this.keyboard) {
        this.keyboard.clearNext();
        if (info && info.code) this.keyboard.showNext(info.code, info.shiftCode);
      }
      if (this.hands) {
        if (info && info.finger) this.hands.tap(info.finger);
        else this.hands.clear();
      }
      if (this.onChar) this.onChar(stepped.ch, info, false);

      this.schedule();
    }

    finish() {
      if (this.onChar) this.onChar('', null, true);
      if (this.loop) {
        const self = this;
        this.timer = setTimeout(function () { if (self.playing) self.start(); }, 900);
      } else {
        this.stop();
      }
    }

    notify() {
      if (this.onStateChange) this.onStateChange(this.playing);
    }
  }

  TT.DemoPlayer = DemoPlayer;
  TT.DEMO_MIN_CPM = MIN_CPM;
  TT.DEMO_MAX_CPM = MAX_CPM;
})(window);

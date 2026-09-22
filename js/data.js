/* ==========================================================================
   数据层：键盘布局 / 八指分区 / 课程库 / 词库
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------- 手指定义 ---------------- */
  const FINGERS = {
    lp: { id: 'lp', hand: 'left',  name: '左手小指',   short: '左小指',   home: 'A' },
    lr: { id: 'lr', hand: 'left',  name: '左手无名指', short: '左无名指', home: 'S' },
    lm: { id: 'lm', hand: 'left',  name: '左手中指',   short: '左中指',   home: 'D' },
    li: { id: 'li', hand: 'left',  name: '左手食指',   short: '左食指',   home: 'F' },
    th: { id: 'th', hand: 'both',  name: '拇指（左右皆可）', short: '拇指', home: '␣' },
    ri: { id: 'ri', hand: 'right', name: '右手食指',   short: '右食指',   home: 'J' },
    rm: { id: 'rm', hand: 'right', name: '右手中指',   short: '右中指',   home: 'K' },
    rr: { id: 'rr', hand: 'right', name: '右手无名指', short: '右无名指', home: 'L' },
    rp: { id: 'rp', hand: 'right', name: '右手小指',   short: '右小指',   home: ';' }
  };
  const FINGER_ORDER = ['lp', 'lr', 'lm', 'li', 'th', 'ri', 'rm', 'rr', 'rp'];

  /* 每个手指负责的主要字符（用于图例展示） */
  const FINGER_KEYS = {
    lp: '1 Q A Z', lr: '2 W S X', lm: '3 E D C', li: '4 5 R T F G V B', th: '空格',
    ri: '6 7 Y U H J N M', rm: '8 I K ,', rr: '9 O L .', rp: '0 P ; / - ='
  };

  /* ---------------- 键盘布局 ---------------- */
  function K(code, label, shiftLabel, w, finger, kind) {
    return { c: code, l: label, s: shiftLabel || '', w: w || 1, f: finger || '', k: kind || '' };
  }

  const KEY_ROWS = [
    [
      K('Backquote', '`', '~', 1, 'lp'), K('Digit1', '1', '!', 1, 'lp'), K('Digit2', '2', '@', 1, 'lr'),
      K('Digit3', '3', '#', 1, 'lm'), K('Digit4', '4', '$', 1, 'li'), K('Digit5', '5', '%', 1, 'li'),
      K('Digit6', '6', '^', 1, 'ri'), K('Digit7', '7', '&', 1, 'ri'), K('Digit8', '8', '*', 1, 'rm'),
      K('Digit9', '9', '(', 1, 'rr'), K('Digit0', '0', ')', 1, 'rp'), K('Minus', '-', '_', 1, 'rp'),
      K('Equal', '=', '+', 1, 'rp'), K('Backspace', 'Backspace', '', 2, 'rp', 'mod')
    ],
    [
      K('Tab', 'Tab', '', 1.5, 'lp', 'mod'),
      K('KeyQ', 'Q', '', 1, 'lp'), K('KeyW', 'W', '', 1, 'lr'), K('KeyE', 'E', '', 1, 'lm'),
      K('KeyR', 'R', '', 1, 'li'), K('KeyT', 'T', '', 1, 'li'), K('KeyY', 'Y', '', 1, 'ri'),
      K('KeyU', 'U', '', 1, 'ri'), K('KeyI', 'I', '', 1, 'rm'), K('KeyO', 'O', '', 1, 'rr'),
      K('KeyP', 'P', '', 1, 'rp'), K('BracketLeft', '[', '{', 1, 'rp'), K('BracketRight', ']', '}', 1, 'rp'),
      K('Backslash', '\\', '|', 1.5, 'rp')
    ],
    [
      K('CapsLock', 'Caps', '', 1.75, 'lp', 'mod'),
      K('KeyA', 'A', '', 1, 'lp'), K('KeyS', 'S', '', 1, 'lr'), K('KeyD', 'D', '', 1, 'lm'),
      K('KeyF', 'F', '', 1, 'li'), K('KeyG', 'G', '', 1, 'li'), K('KeyH', 'H', '', 1, 'ri'),
      K('KeyJ', 'J', '', 1, 'ri'), K('KeyK', 'K', '', 1, 'rm'), K('KeyL', 'L', '', 1, 'rr'),
      K('Semicolon', ';', ':', 1, 'rp'), K('Quote', "'", '"', 1, 'rp'),
      K('Enter', 'Enter', '', 2.25, 'rp', 'mod')
    ],
    [
      K('ShiftLeft', 'Shift', '', 2.25, 'lp', 'mod'),
      K('KeyZ', 'Z', '', 1, 'lp'), K('KeyX', 'X', '', 1, 'lr'), K('KeyC', 'C', '', 1, 'lm'),
      K('KeyV', 'V', '', 1, 'li'), K('KeyB', 'B', '', 1, 'li'), K('KeyN', 'N', '', 1, 'ri'),
      K('KeyM', 'M', '', 1, 'ri'), K('Comma', ',', '<', 1, 'rm'), K('Period', '.', '>', 1, 'rr'),
      K('Slash', '/', '?', 1, 'rp'), K('ShiftRight', 'Shift', '', 2.75, 'rp', 'mod')
    ],
    [
      K('ControlLeft', 'Ctrl', '', 1.25, 'lp', 'mod'), K('MetaLeft', 'Win', '', 1.25, 'lp', 'mod'),
      K('AltLeft', 'Alt', '', 1.25, 'lp', 'mod'), K('Space', '空格', '', 6.25, 'th', 'mod'),
      K('AltRight', 'Alt', '', 1.25, 'rp', 'mod'), K('MetaRight', 'Win', '', 1.25, 'rp', 'mod'),
      K('ContextMenu', 'Menu', '', 1.25, 'rp', 'mod'), K('ControlRight', 'Ctrl', '', 1.25, 'rp', 'mod')
    ]
  ];

  const KEY_BY_CODE = {};
  KEY_ROWS.forEach(function (row) {
    row.forEach(function (key) { KEY_BY_CODE[key.c] = key; });
  });

  /* 字符 -> 按键信息 */
  const CHAR_TO_CODE = {};
  KEY_ROWS.forEach(function (row) {
    row.forEach(function (key) {
      if (key.l && key.l.length === 1) {
        CHAR_TO_CODE[key.l] = { code: key.c, shift: false };
        const lower = key.l.toLowerCase();
        if (lower !== key.l) CHAR_TO_CODE[lower] = { code: key.c, shift: false };
      }
      if (key.s && key.s.length === 1) CHAR_TO_CODE[key.s] = { code: key.c, shift: true };
    });
  });
  CHAR_TO_CODE[' '] = { code: 'Space', shift: false };
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function (letter) {
    CHAR_TO_CODE[letter.toUpperCase()] = { code: 'Key' + letter.toUpperCase(), shift: true };
  });
  CHAR_TO_CODE['\n'] = { code: 'Enter', shift: false };
  CHAR_TO_CODE['\r'] = { code: 'Enter', shift: false };
  CHAR_TO_CODE['\t'] = { code: 'Tab', shift: false };

  /**
   * 返回字符对应的按键信息：{ code, shift, finger, keyLabel, shiftCode }
   * 无法映射（如中文、emoji）时返回 null。
   */
  function charInfo(ch) {
    if (ch === '\r') ch = '\n';
    const hit = CHAR_TO_CODE[ch];
    if (!hit) return null;
    const key = KEY_BY_CODE[hit.code];
    const finger = key ? key.f : '';
    let shiftCode = '';
    if (hit.shift && finger && finger !== 'th') {
      shiftCode = finger[0] === 'l' ? 'ShiftRight' : 'ShiftLeft';
    } else if (hit.shift) {
      shiftCode = 'ShiftLeft';
    }
    return {
      code: hit.code,
      shift: !!hit.shift,
      shiftCode: shiftCode,
      finger: finger,
      fingerName: FINGERS[finger] ? FINGERS[finger].name : '',
      keyLabel: key ? key.l : ch
    };
  }

  /* ---------------- 随机数（固定种子，保证课程文本稳定） ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function split(str) { return Array.from(str); }

  /** 单手/单组字符随机组词 */
  function drillSame(chars, seed, target, minLen, maxLen) {
    const rnd = mulberry32(seed || 1);
    const set = split(chars);
    const out = [];
    let len = 0;
    minLen = minLen || 2; maxLen = maxLen || 5;
    while (len < (target || 180)) {
      const n = minLen + Math.floor(rnd() * (maxLen - minLen + 1));
      let w = '';
      for (let i = 0; i < n; i++) w += pick(rnd, set);
      out.push(w); len += w.length + 1;
    }
    return out.join(' ');
  }

  /** 左右手交替组词（练习换手节奏） */
  function drillAlt(left, right, seed, target, minLen, maxLen) {
    const rnd = mulberry32(seed || 1);
    const L = split(left), R = split(right);
    const out = [];
    let len = 0;
    minLen = minLen || 2; maxLen = maxLen || 6;
    while (len < (target || 180)) {
      const n = minLen + Math.floor(rnd() * (maxLen - minLen + 1));
      let w = '';
      let useLeft = rnd() < 0.5;
      for (let i = 0; i < n; i++) {
        w += useLeft ? pick(rnd, L) : pick(rnd, R);
        useLeft = !useLeft;
      }
      out.push(w); len += w.length + 1;
    }
    return out.join(' ');
  }

  /** 从词库中按种子抽取若干词组成练习文本 */
  function fromWords(words, seed, target) {
    const rnd = mulberry32(seed || 1);
    const out = [];
    let len = 0;
    while (len < (target || 200)) {
      const w = pick(rnd, words);
      out.push(w); len += w.length + 1;
    }
    return out.join(' ');
  }

  /** 规范化文本：普通文本折叠空白，代码文本保留换行 */
  function norm(text) {
    if (text.indexOf('\n') >= 0) {
      return text
        .replace(/\r/g, '')
        .split('\n')
        .map(function (line) { return line.replace(/[ \t]+$/, ''); })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\n+|\n+$/g, '');
    }
    return text.replace(/\s+/g, ' ').trim();
  }
  function lines(arr) { return arr.join('\n'); }

  /* ---------------- 课程库 ---------------- */

  const HOME_WORDS = ('all ask dad fall fad gala gall hall half jade lads lash lass sad saga salad shall flag flask glass dash gas had has add alas falls slag alfalfa jak lad sal flask glass hall lash dash half sad add gas had flag gala jade lads saga salad shall').split(' ');

  const TOP_WORDS = ('the you were your this that with would about there they power write quote type poet tour wire port quit our top out wet yet put per use used user it is or to are ear eat ate tea tar rat art war was route tour tower tout poet quiet quite require upright entire proper water write wrote').split(' ');

  const BOTTOM_WORDS = ('many very come back zone box cave move name make bake nice mice vibe maze civic zinc boom moon vein number member moment minute common bacon cave comma banana combine magazine exam exact example value brave cover curve cycle buzz maze').split(' ');

  const COMMON_WORDS = ('the be of and a to in he have it that for they I with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over most even also after our two way well how its most only over also such than into some time'.replace(/\s+/g, ' ')).split(' ').filter(function (w) { return w.length > 0; });

  const SHORT_WORDS = ('a an as at be by do go he if in is it me my no of on or so to up us we was for has him his her how man new now old one our out saw say she the too two use way who why yet yes all any but can did get got had has her him let may put say see set try use was way who').split(' ');

  const TECH_WORDS = 'function return const array object string number boolean class interface module import export default async await promise callback variable parameter argument property method loop condition exception handler compiler runtime database query server client request response token session cache buffer thread process kernel socket protocol package library framework component template selector attribute element node style script event listener handler node module'.split(' ');

  const LONG_WORDS = ('achievement appropriate availability background characteristic communication considerable development differentiation environment establishment experience functionality government headquarters implementation infrastructure international knowledge management organization particularly performance possibility professional psychological recommendation relationship responsibility significant specifically sophisticated subscription substantially suggestion supervision temperature television transportation understanding unfortunately university').split(' ');

  const BIZ_WORDS = 'account agenda attachment budget calendar client conference contract deadline delivery discussion document engagement estimate feedback follow invoice meeting milestone negotiation objective overview payment proposal quarter quarterly report requirement revenue schedule signature stakeholder strategy summary timeline update vendor warranty'.split(' ');

  const LESSON_GROUPS = [
    {
      id: 'home', name: '基准键位', icon: '🏠', desc: '双手就位的起点，最重要的地基',
      lessons: [
        {
          id: 'h1', name: '右手基准键', sub: 'J K L ; 四指就位', keys: ['j', 'k', 'l', ';'],
          text: 'jjj kkk lll ;;; jj kk ll ;; jk lk ;l j; jkl ;lk lkj jkl; jj kk ll ;; ' + drillSame('jkl;', 101, 170, 2, 5)
        },
        {
          id: 'h2', name: '左手基准键', sub: 'A S D F 四指就位', keys: ['a', 's', 'd', 'f'],
          text: 'fff ddd sss aaa fd fs fa df ds da ff dd ss aa asdf fdsa asdf fdsa ' + drillSame('asdf', 102, 170, 2, 5)
        },
        {
          id: 'h3', name: '食指内扩 G H', sub: 'F 与 J 向中间伸展', keys: ['f', 'g', 'h', 'j'],
          text: 'fgf jhj fgf jhj gfg hjh fg jh gf hj fghj jhgf gg hh ff jj gh hg fghj jhgf ' + drillAlt('fg', 'hj', 103, 160, 2, 5)
        },
        {
          id: 'h4', name: '基准键综合', sub: '左右手交替节奏', keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
          text: drillAlt('asdfg', 'hjkl;', 104, 260, 2, 6)
        },
        {
          id: 'h5', name: '基准键单词', sub: '只用基准键拼出的英文词', keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
          text: fromWords(HOME_WORDS, 105, 240)
        },
        {
          id: 'h6', name: '基准键短句', sub: '加上空格键（拇指）', keys: ['空格'],
          text: 'a sad lad asked all; dad has a flask; ask a lass; all shall fall; a hall full of glass; dad had a salad; a lad shall ask; glass falls; a flag shall add half a gala; all dads had flags; slash the flag; a flask half full; lads shall add salad;'
        }
      ]
    },
    {
      id: 'top', name: '上排键位', icon: '⬆️', desc: '从基准键向上伸展',
      lessons: [
        {
          id: 't1', name: '左手上排引导', sub: 'F→R D→E S→W A→Q', keys: ['q', 'w', 'e', 'r', 't'],
          text: 'frf ded sws aqa frfrf deded swsws aqaqa qwe ewq wer rew ert tre ' + drillSame('qwert', 201, 160, 2, 5)
        },
        {
          id: 't2', name: '右手上排引导', sub: 'J→Y K→U L→I ;→O', keys: ['y', 'u', 'i', 'o', 'p'],
          text: 'juj kik lol ;p; juj kik lol ;p; yui iuy uio oui iop poi yuy pyo ' + drillSame('yuiop', 202, 160, 2, 5)
        },
        {
          id: 't3', name: '上排 T 与 Y', sub: '两个食指的远端', keys: ['t', 'y', 'r', 'u'],
          text: 'frf juj ftf jyj rfr ujy tyt ruy ftfj jyjy tr yt rtyu ' + drillAlt('rt', 'yu', 203, 160, 2, 5)
        },
        {
          id: 't4', name: '上排综合', sub: '左右手交替', keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
          text: drillAlt('qwert', 'yuiop', 204, 240, 2, 6)
        },
        {
          id: 't5', name: '上排 + 基准键', sub: '两排自由切换', keys: ['上排', '基准'],
          text: drillAlt('asdfgqwert', 'hjkl;yuiop', 205, 260, 3, 6)
        },
        {
          id: 't6', name: '上排单词', sub: '常用英文单词', keys: ['上排', '基准'],
          text: fromWords(TOP_WORDS, 206, 240)
        },
        {
          id: 't7', name: '上排短句', sub: '带空格的完整句子', keys: ['空格'],
          text: 'you were there with your power to write; the poet would quote this tour; type out the report; they put the wire in the port; water under the bridge; every good writer types with ease; your route to the tower is quiet;'
        }
      ]
    },
    {
      id: 'bottom', name: '下排键位', icon: '⬇️', desc: '最难的一排，手指向下弯曲',
      lessons: [
        {
          id: 'b1', name: '左手下排引导', sub: 'F→Z S→X D→C V/B', keys: ['z', 'x', 'c', 'v', 'b'],
          text: 'fzf sxs dcd fvf bfb fzf sxs dcd zxc cvb bvc xzc zx cv vb ' + drillSame('zxcvb', 301, 160, 2, 5)
        },
        {
          id: 'b2', name: '右手下排引导', sub: 'J→N M 与 , . /', keys: ['n', 'm', ',', '.', '/'],
          text: 'njn mjm ,k, .l. /;/ njn mjm nm ,. /. mn ,. n,m m,n ' + drillSame('nm,./', 302, 160, 2, 5)
        },
        {
          id: 'b3', name: '下排综合', sub: '左右手交替', keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
          text: drillAlt('zxcvb', 'nm,./', 303, 220, 2, 6)
        },
        {
          id: 'b4', name: '三排大混合', sub: '基准 + 上排 + 下排', keys: ['全部字母'],
          text: drillAlt('asdfgzxcvb', 'hjkl;nm,./', 304, 260, 3, 6) + ' ' + drillAlt('qwert', 'yuiop', 305, 120, 3, 6)
        },
        {
          id: 'b5', name: '下排单词', sub: '包含下排字母的常用词', keys: ['下排'],
          text: fromWords(BOTTOM_WORDS, 306, 240)
        },
        {
          id: 'b6', name: '下排短句', sub: '含逗号与句号', keys: [',', '.'],
          text: 'many people come back to move the box. make a nice cave for the mice, and never move the box without a name. the vibe of the city is amazing. come back before noon, bring the box, and make a note of every number. bacon and cabbage make a nice lunch, but the vegetables must be very clean.'
        }
      ]
    },
    {
      id: 'shift', name: '大写与符号', icon: '⇧', desc: 'Shift 的正确用法',
      lessons: [
        {
          id: 's1', name: '大写入门', sub: '用小指按住 Shift', keys: ['Shift'],
          text: 'Asdf Jkl; Fff Jjj Aaa Sss Ddd Fff Jjj Kkk Lll Ask Dad Fall Hall Salad Flag Glass Jade Gala Lads Lass Saga Shall Dash Flask Glass Half'
        },
        {
          id: 's2', name: '大写单词', sub: '星期、月份、专有名词', keys: ['Shift'],
          text: 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December China America London Paris Tokyo Ada Grace Linus'
        },
        {
          id: 's3', name: '句首大写', sub: '句子与引号', keys: ['Shift', '.', ','],
          text: 'The sun rises in the east. She said, "Hello, my friend!" Every morning I drink a cup of coffee. Would you like to join us? I think that it is a good idea. My name is Ada, and I work in Paris. Please send the report before Friday.'
        },
        {
          id: 's4', name: '常用标点', sub: ', . ; : ? ! \' "', keys: [',', '.', ';', ':', '?', '!'],
          text: 'Are you ready? Yes, I am! Where are we going; do you know? He said: "wait here, please." It is not far, only two miles. Why? Because the road is closed! One, two, three; four, five, six. Really? Of course! Maybe later; not now.'
        },
        {
          id: 's5', name: '括号与符号', sub: '( ) [ ] { } - = / \\', keys: ['(', ')', '[', ']', '-', '='],
          text: '(a + b) * c = d; [1, 2, 3] - {x: 1, y: 2}; a / b = 1.5; 100 - 20 = 80; f(x) = x * 2 + 1; "key" : value; <div></div>; a_b-c; 50% of 200 = 100; #1 @user $5 & more'
        }
      ]
    },
    {
      id: 'num', name: '数字键位', icon: '🔢', desc: '上排数字与符号',
      lessons: [
        {
          id: 'n1', name: '左手数字 1-5', sub: '小指到食指的跨越', keys: ['1', '2', '3', '4', '5'],
          text: '1 2 3 4 5 11 22 33 44 55 12 34 51 23 45 123 456 1234 5432 15 24 33 42 51 12345 54321 ' + drillSame('12345', 401, 130, 2, 4)
        },
        {
          id: 'n2', name: '右手数字 6-0', sub: '食指到小指', keys: ['6', '7', '8', '9', '0'],
          text: '6 7 8 9 0 66 77 88 99 00 67 89 60 78 96 678 890 6789 0987 60 79 88 97 06 67890 09876 ' + drillSame('67890', 402, 130, 2, 4)
        },
        {
          id: 'n3', name: '数字综合', sub: '0-9 全排', keys: ['0-9'],
          text: '1 2 3 4 5 6 7 8 9 0 10 20 30 40 50 60 70 80 90 100 1234 5678 9012 3456 7890 0987 6543 2109 8765 4321 ' + drillSame('1234567890', 403, 140, 3, 5)
        },
        {
          id: 'n4', name: '数字符号', sub: '! @ # $ % ^ & * ( )', keys: ['!', '@', '#', '$', '%'],
          text: '! @ # $ % ^ & * ( ) 1! 2@ 3# 4$ 5% 6^ 7& 8* 9( 0) !1 @2 #3 $4 %5 ^6 &7 *8 (9 )0 !@# $%^ &*()'
        },
        {
          id: 'n5', name: '实战数字', sub: '日期、电话、金额', keys: ['0-9'],
          text: '2026-09-22 13:45 010-88886666 +86 138 0013 8000 $1,299.00 42.5% No.1024 3.14159 192.168.1.1 2024/07/01 09:30-18:00 1000GB 88 66 99 12345678'
        }
      ]
    },
    {
      id: 'words', name: '常用单词', icon: '📖', desc: '把键位练成肌肉记忆',
      lessons: [
        { id: 'w1', name: '高频短词', sub: '2-3 个字母', keys: ['短词'], text: fromWords(SHORT_WORDS, 501, 240, 3, 6) },
        { id: 'w2', name: '常用单词', sub: '英文使用频率最高', keys: ['常用词'], text: fromWords(COMMON_WORDS, 502, 280) },
        { id: 'w3', name: '长难词', sub: '锻炼连续击键稳定性', keys: ['长词'], text: fromWords(LONG_WORDS, 503, 260) },
        { id: 'w4', name: '技术词汇', sub: '程序员日常', keys: ['编程词'], text: fromWords(TECH_WORDS, 504, 260) },
        { id: 'w5', name: '商务词汇', sub: '邮件与会议用语', keys: ['商务词'], text: fromWords(BIZ_WORDS, 505, 260) }
      ]
    },
    {
      id: 'sent', name: '句子段落', icon: '✍️', desc: '真实语流中的节奏',
      lessons: [
        {
          id: 'p1', name: '全字母句', sub: '26 个字母全覆盖', keys: ['全部'],
          text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow.'
        },
        {
          id: 'p2', name: '日常英语', sub: '口语常用句', keys: ['句子'],
          text: 'I would like a cup of coffee, please. Could you tell me where the station is? It takes about twenty minutes to walk there. She has been learning to type every evening this month. We should leave before it starts to rain.'
        },
        {
          id: 'p3', name: '名言警句', sub: '顺便读点好东西', keys: ['句子'],
          text: 'The only way to do great work is to love what you do. Practice does not make perfect; only perfect practice makes perfect. It always seems impossible until it is done. Simplicity is the ultimate sophistication. First, solve the problem. Then, write the code.'
        },
        {
          id: 'p4', name: '英文段落', sub: '长文本耐力训练', keys: ['段落'],
          text: 'Touch typing is a skill built on muscle memory rather than sight. The typist keeps the fingers resting on the home row and reaches for other keys without looking down. Each finger owns a small group of keys, and the thumbs handle the space bar. With regular practice of about fifteen minutes a day, most people reach a comfortable speed within a few weeks. Accuracy matters more than raw speed, because every mistake costs more time to correct than it saved.'
        }
      ]
    },
    {
      id: 'code', name: '代码练习', icon: '💻', desc: '程序员的专项训练',
      lessons: [
        {
          id: 'c1', name: 'JavaScript', sub: '函数与循环', keys: ['代码'],
          text: lines([
            'function average(numbers) {',
            '  let total = 0;',
            '  for (const n of numbers) {',
            '    total += n;',
            '  }',
            '  return total / numbers.length;',
            '}',
            '',
            'const scores = [88, 92, 79, 95, 61];',
            'console.log("avg:", average(scores));'
          ])
        },
        {
          id: 'c2', name: 'Python', sub: '列表推导式', keys: ['代码'],
          text: lines([
            'def fib(n):',
            '    a, b = 0, 1',
            '    for _ in range(n):',
            '        a, b = b, a + b',
            '    return a',
            '',
            'squares = [x * x for x in range(10) if x % 2 == 0]',
            'print(squares, sum(squares))'
          ])
        },
        {
          id: 'c3', name: 'HTML / CSS', sub: '标签与样式', keys: ['代码'],
          text: lines([
            '<div class="card" id="main">',
            '  <h2>Hello, world</h2>',
            '  <p>Touch typing trainer</p>',
            '  <a href="/about">About</a>',
            '</div>',
            '',
            '.card { border-radius: 12px; padding: 16px 20px; }',
            '.card h2 { margin: 0 0 8px; font-size: 18px; }'
          ])
        },
        {
          id: 'c4', name: 'SQL / JSON', sub: '查询与数据', keys: ['代码'],
          text: lines([
            'SELECT name, score FROM users',
            'WHERE score >= 80 AND active = 1',
            'ORDER BY score DESC LIMIT 10;',
            '',
            '{ "id": 1, "name": "Ada", "tags": ["math", "code"] }'
          ])
        }
      ]
    }
  ];

  /* 扁平化课程索引 */
  const LESSONS = {};
  const LESSON_LIST = [];
  LESSON_GROUPS.forEach(function (group) {
    group.lessons.forEach(function (lesson, idx) {
      lesson.groupId = group.id;
      lesson.groupName = group.name;
      lesson.index = idx;
      lesson.text = norm(lesson.text);
      LESSONS[lesson.id] = lesson;
      LESSON_LIST.push(lesson);
    });
  });

  /* ---------------- 自由练习词库 ---------------- */
  const PARAGRAPHS = [
    'The best way to predict the future is to invent it. A person who never made a mistake never tried anything new. Keep your eyes on the stars and your feet on the ground. Success is not final, failure is not fatal: it is the courage to continue that counts.',
    'Reading is to the mind what exercise is to the body. Writing code is a form of thinking, and thinking takes time. When you type without looking at the keyboard, your attention is free to focus on the ideas instead of the letters.',
    'Every morning we are born again. What we do today is what matters most. Small daily improvements are the key to staggering long term results. Do the hard jobs first; the easy jobs will take care of themselves.',
    'A journey of a thousand miles begins with a single step. The road to success is always under construction. Do not watch the clock; do what it does, and keep going. Quality means doing it right when no one is looking.',
    'Computers are useless. They can only give you answers. The real skill is asking good questions. Science is a way of thinking much more than it is a body of knowledge, and curiosity is the engine that drives it forward.'
  ];

  const FREE_BANKS = {
    words: COMMON_WORDS.concat(SHORT_WORDS),
    tech: TECH_WORDS,
    para: PARAGRAPHS
  };

  /* ---------------- 指法演示文本 ---------------- */
  const DEMO_TEXTS = [
    { id: 'd1', name: '基准键就位', text: 'asdf jkl; asdf jkl; fff jjj ddd kkk sss lll aaa ;;;' },
    { id: 'd2', name: '食指分工 F/G/R/T', text: 'frf juj ftf jyj fgf jhj fghj jhgf' },
    { id: 'd3', name: '左右手交替', text: 'fjdk sl;a fjdk sl;a ask dad fall hall' },
    { id: 'd4', name: 'Shift 大写与符号', text: 'The Quick Brown Fox! (100% OK)' },
    { id: 'd5', name: '全字母句', text: 'The quick brown fox jumps over the lazy dog.' },
    { id: 'd6', name: '常用单词', text: 'you were there with your power to write this report' },
    { id: 'd7', name: '数字与标点', text: '2026-09-22, 13:45 (No.1024) = $1,299.00; 42.5%?' }
  ];

  /* ---------------- 导出 ---------------- */
  global.TT = global.TT || {};
  Object.assign(global.TT, {
    FINGERS: FINGERS,
    FINGER_ORDER: FINGER_ORDER,
    FINGER_KEYS: FINGER_KEYS,
    KEY_ROWS: KEY_ROWS,
    KEY_BY_CODE: KEY_BY_CODE,
    charInfo: charInfo,
    LESSON_GROUPS: LESSON_GROUPS,
    LESSONS: LESSONS,
    LESSON_LIST: LESSON_LIST,
    FREE_BANKS: FREE_BANKS,
    PARAGRAPHS: PARAGRAPHS,
    DEMO_TEXTS: DEMO_TEXTS,
    fromWords: fromWords,
    mulberry32: mulberry32
  });
})(window);

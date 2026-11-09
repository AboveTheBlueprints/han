// 喊（网页版，第二个，第 16 天 07:30；照 ~/碰/喊/喊.py 第二版搬过来）
// 跟终端版不一样的只有一样：每一天谁什么时候叫、叫的什么，按天号随出来（第一个 07:24 说同一串重放下数都一样，第二局就是背答案）。
// 一天里：头三回大猴叫正好是豹、鹰、蛇各一回（顺序随），小猴把飞过的鸟当鹰叫一回，后面几回随。
'use strict';

const N_TURNS = 40, GOAL = 30;
const SAFE = { '豹': ['树上', '洞'], '鹰': ['灌木', '洞'], '蛇': ['树下', '树上', '灌木'] };
const CALL = { '豹': '嗷咔', '鹰': '呃呃', '蛇': '嘀哩哩' };
const SYL2T = { '嗷咔': '豹', '呃呃': '鹰', '嘀哩哩': '蛇' };
const HIDE = { '豹': '树上', '鹰': '灌木', '蛇': '站' };
const SHOW = { '豹': '一只豹子从灌木里窜出来', '鹰': '一只鹰从天上扎下来', '蛇': '一条蛇从草里、洞里游出来' };
const TAKE = { '豹': '一只猴子没上树，被豹子叼走了', '鹰': '鹰抓走了一只小猴', '蛇': '一只猴子没站起来看，被蛇咬了，倒在树下' };
const HURT = { '豹': '豹子一爪子挠在你背上', '鹰': '鹰爪子从你背上刮过去', '蛇': '蛇在你后腿上咬了一口' };
const MISS = { '豹': '它扑了个空，转身走了', '鹰': '它扑了个空，又飞走了', '蛇': '它没够着谁，游走了' };
const MSAFE = { '豹': ['树上'], '鹰': ['灌木'], '蛇': ['站', '树上', '灌木'] };
const ZONES = { '去草地': '草地', '去树下': '树下', '上树': '树上', '钻灌木': '灌木', '进洞': '洞' };
const GO = { '草地': '你跑回草地。', '树下': '你跑到树底下。', '树上': '你爬上树。', '灌木': '你钻进灌木。', '洞': '你钻进石头底下的洞。' };
const RESP = { '树上': '猴子全窜上了树。', '灌木': '猴子全钻进了灌木。', '站': '猴子都站起来，低头看着草里。' };

function rng(seed) {           // mulberry32
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeDay(seed) {
  const r = rng(seed * 7919 + 13);
  const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const types = ['豹', '鹰', '蛇'];
  for (let i = 2; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  const big = [];
  let t = ri(3, 5);
  while (t <= 37) {
    let tp = big.length < 3 ? types[big.length] : null;
    if (!tp) { const rest = ['豹', '鹰', '蛇'].filter(x => x !== big[big.length - 1][2]); tp = rest[Math.floor(r() * 2)]; }
    big.push([t, '大猴', tp]);
    t += ri(4, 7);
  }
  // 小猴：放在头两回大猴叫之间，或第二、三回之间，离谁都至少 2 下
  const day = big.slice();
  const k = big.length > 2 && r() < 0.5 ? 1 : 0;
  const lo = big[k][0] + 2, hi = big[k + 1][0] - 2;
  if (hi >= lo) day.push([ri(lo, hi), '小猴', '鸟']);
  day.sort((x, y) => x[0] - y[0]);
  return day;
}

function dull(m, tp) {
  if (MSAFE[tp].includes(m.where))
    return '猴子本来就' + { '树上': '在树上', '灌木': '在灌木里', '站': '站着看草' }[m.where] + '，没动。';
  return '猴子抬头看了一眼，没动。';
}

function newGame(seed) {
  const day = makeDay(seed);
  const events = {};
  for (const [t, who, what] of day) events[t] = [who, what];
  return {
    seed, events, t: 0, zone: '草地', food: 0, hp: 2, heard: [],
    strength: { '豹': 1, '鹰': 1, '蛇': 1 },
    m: { n: 9, where: '果', back: 0 },
    pending: [], log: [], dead: false, over: false,
  };
}

// 走一下，返回这一下的那一行
function step(g, a) {
  if (g.over) return '';
  g.t += 1;
  const t = g.t, m = g.m;
  let line = '';
  if (a in ZONES) {
    const nz = ZONES[a];
    line += nz === g.zone ? '你已经在这儿了。' : GO[nz];
    g.zone = nz;
  } else if (a === '吃') {
    if (g.zone === '草地') { g.food += 1; line += '你啃了一口草。'; }
    else if (g.zone === '树下') {
      if (m.n > 0 && (m.where === '果' || m.where === '站')) line += '大猴冲你龇牙，你没抢着。';
      else { g.food += 3; line += '果子掉了一地没人管，你吃了一大口。'; }
    } else line += '这儿没吃的。';
  } else if (a === '等') {
    line += '你不动。';
  } else if (a.startsWith('学')) {
    const syl = a.slice(1), tp = SYL2T[syl];
    if (!tp || !g.heard.includes(syl)) line += '你张了张嘴，不知道该怎么叫。';
    else {
      line += `你学着叫：${syl}！`;
      if (m.n > 0) {
        let resp;
        if (g.strength[tp] >= 0.5) {
          m.where = HIDE[tp];
          if (!g.pending.length) m.back = 3;
          resp = RESP[m.where];
        } else resp = dull(m, tp);
        line += '　' + resp;
        g.log.push([t, '你', syl, '你学的', resp.replace(/。$/, ''), '什么也没来']);
      }
      g.strength[tp] = Math.max(0, g.strength[tp] - 0.35);
    }
  }
  // 到点的扑下来
  for (const p of g.pending.filter(p => p[0] === t)) {
    const [st, tp] = p;
    g.pending.splice(g.pending.indexOf(p), 1);
    let res = SHOW[tp] + '。', caught = false;
    if (m.n > 0 && !MSAFE[tp].includes(m.where)) { m.n -= 1; caught = true; res += TAKE[tp] + '。'; }
    const hit = !SAFE[tp].includes(g.zone);
    if (hit) { g.hp -= 1; res += HURT[tp] + '。'; }
    else if (!caught) res += MISS[tp] + '。';
    else res += '它走了。';
    line += '　' + res;
    for (const row of g.log)
      if (row[0] === st - 2 && row[3] === tp)
        row[5] = (caught ? '一只猴子没跑掉' : '扑了个空') + (hit ? '，你挨了一下' : '');
    m.back = 2;
    if (g.hp <= 0) { line += '　你倒在了' + { '草地': '草地上', '树下': '树底下', '树上': '树杈上', '灌木': '灌木里', '洞': '洞里' }[g.zone] + '。'; g.dead = true; }
  }
  // 猴子回去吃
  if (!g.dead && m.where !== '果' && m.back > 0) {
    m.back -= 1;
    if (m.back === 1 && !g.pending.length && m.n > 0) {
      const pre = { '树上': '猴子开始往下爬了。', '灌木': '猴子从灌木里探出头来。' }[m.where];
      if (pre) line += '　' + pre;
    }
    if (m.back === 0 && !g.pending.length) {
      m.where = '果';
      if (m.n > 0) line += '　猴子又回到树底下吃果子。';
    }
  }
  // 这一下末尾有谁叫
  if (!g.dead && g.events[t] && m.n > 0) {
    const [who, what] = g.events[t];
    const tp = what === '鸟' ? '鹰' : what;
    const syl = CALL[tp];
    if (!g.heard.includes(syl)) g.heard.push(syl);
    line += `　${who === '大猴' ? '一只大猴' : '一只小猴'}叫：${syl}！${syl}！`;
    if (who === '小猴') {
      const resp = m.where === '果' ? '大猴抬头看了看，接着吃。' : '大猴抬头看了看天，没理它。';
      line += '　' + resp;
      g.log.push([t, '小猴', syl, '天上飞过一只鸟', resp.replace(/。$/, ''), '什么也没来']);
    } else {
      let resp;
      if (g.strength[tp] >= 0.5) { m.where = HIDE[tp]; m.back = 99; resp = RESP[m.where]; }
      else resp = dull(m, tp);
      line += '　' + resp;
      g.pending.push([t + 2, tp]);
      g.log.push([t, '大猴', syl, tp, resp.replace(/。$/, ''), '']);
    }
  }
  for (const k in g.strength) g.strength[k] = Math.min(1, g.strength[k] + 0.02);
  if (g.dead || g.t >= N_TURNS) g.over = true;
  return line;
}

function zhMonkeys(m) {
  if (m.n === 0) return '猴子一只都没了。';
  const s = { '果': '在树下吃果子', '树上': '都在树上', '灌木': '都钻在灌木里', '站': '都站起来，低头看着草里' }[m.where];
  return `猴子${m.n}只，${s}。`;
}

if (typeof module !== 'undefined') module.exports = { newGame, step, zhMonkeys, makeDay, N_TURNS, GOAL };

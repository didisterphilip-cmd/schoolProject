/* ============================================================
   TURRET DEFENSE KING — original HTML5 Canvas tower defense
   100 levels · progressive difficulty · unlockable turrets
   ============================================================ */
(function () {
"use strict";

/* ---------------- Grid / geometry ---------------- */
const COLS = 18, ROWS = 12, CELL = 48;
const W = COLS * CELL, H = ROWS * CELL;
const TOTAL_LEVELS = 100;
const SAVE_KEY = "tdk_save_v1";

/* ---------------- Maps (axis-aligned waypoint paths) ---------------- */
// Each map is a list of [col,row] waypoints. Off-grid ends (<0 or >=COLS/ROWS)
// are the enemy entrance/exit. Segments are horizontal or vertical only.
const MAPS = [
  [[-1,1],[15,1],[15,5],[2,5],[2,9],[18,9]],
  [[-1,2],[4,2],[4,9],[9,9],[9,2],[14,2],[14,9],[18,9]],
  [[-1,0],[16,0],[16,10],[1,10],[1,3],[12,3],[12,7],[18,7]],
  [[-1,5],[3,5],[3,1],[8,1],[8,10],[13,10],[13,1],[18,1]],
  [[-1,1],[16,1],[16,4],[1,4],[1,7],[16,7],[16,10],[-1,10]],
  [[-1,6],[2,6],[2,2],[15,2],[15,9],[5,9],[5,6],[9,6],[9,4],[18,4]],
];

// Precompute the set of path cells for each map (for build validity + drawing).
const MAP_PATHCELLS = MAPS.map(buildPathCells);
function buildPathCells(wps) {
  const set = new Set();
  const mark = (c, r) => { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) set.add(c + "," + r); };
  for (let i = 0; i < wps.length - 1; i++) {
    let [c1, r1] = wps[i], [c2, r2] = wps[i + 1];
    if (r1 === r2) { const s = Math.sign(c2 - c1) || 1; for (let c = c1; c !== c2 + s; c += s) mark(c, r1); }
    else { const s = Math.sign(r2 - r1) || 1; for (let r = r1; r !== r2 + s; r += s) mark(c1, r); }
  }
  return set;
}
// Waypoints in pixel centers for movement.
function mapPixelPath(mapIndex) {
  return MAPS[mapIndex].map(([c, r]) => ({ x: (c + 0.5) * CELL, y: (r + 0.5) * CELL }));
}

/* ---------------- Enemy archetypes (base pre-scaling) ---------------- */
const ENEMIES = {
  grunt:   { name:"Grunt",   hp:24,  speed:1.15, reward:6,  air:false, armor:0,   radius:11, color:"#8ce06b", leak:1  },
  runner:  { name:"Runner",  hp:14,  speed:2.15, reward:5,  air:false, armor:0,   radius:9,  color:"#ffd24d", leak:1  },
  swarm:   { name:"Swarm",   hp:8,   speed:1.5,  reward:3,  air:false, armor:0,   radius:7,  color:"#f6a5ff", leak:1  },
  tank:    { name:"Tank",    hp:90,  speed:0.62, reward:14, air:false, armor:0.15,radius:15, color:"#7ab0ff", leak:2  },
  flyer:   { name:"Flyer",   hp:22,  speed:1.7,  reward:8,  air:true,  armor:0,   radius:10, color:"#67e8f9", leak:1  },
  healer:  { name:"Healer",  hp:46,  speed:0.95, reward:13, air:false, armor:0,   radius:12, color:"#c084fc", leak:2, heal:true },
  armored: { name:"Armored", hp:70,  speed:0.85, reward:13, air:false, armor:0.5, radius:13, color:"#cbd5e1", leak:2  },
  boss:    { name:"BOSS",    hp:720,  speed:0.5, reward:140,air:false, armor:0.2, radius:22, color:"#ff5d6c", leak:12, boss:true },
};

/* ---------------- Turret archetypes ----------------
   dmg/rate/range are level-1 values; upgrades multiply them.
   unlock = level at which the turret becomes buildable. */
const TOWERS = {
  gun:    { name:"Gun",     icon:"🔫", unlock:1,  cost:60,  dmg:6,   rate:4.2, range:2.6, air:false, kind:"bullet",  bulletSpeed:520, color:"#cbd5e1",
            desc:"Cheap, rapid single-target fire. Backbone of any defense." },
  cannon: { name:"Cannon",  icon:"💣", unlock:1,  cost:105, dmg:24,  rate:0.95,range:2.5, air:false, kind:"bullet",  bulletSpeed:340, splash:0.85, color:"#f59e0b",
            desc:"Slow, heavy shots with splash damage. Great vs. clustered ground." },
  frost:  { name:"Frost",   icon:"❄️", unlock:4,  cost:95,  dmg:3,   rate:1.6, range:2.3, air:true,  kind:"bullet",  bulletSpeed:420, slow:0.45, slowDur:1.6, splash:0.6, color:"#67e8f9",
            desc:"Chills enemies, slowing them. Low damage but force-multiplies your turrets." },
  sniper: { name:"Sniper",  icon:"🎯", unlock:9,  cost:150, dmg:65,  rate:0.6, range:5.2, air:true,  kind:"hitscan", color:"#a3e635",
            desc:"Extreme range, huge single-target damage. Hits air. Slow reload." },
  tesla:  { name:"Tesla",   icon:"⚡", unlock:16, cost:185, dmg:16,  rate:1.25,range:2.6, air:true,  kind:"chain",   chains:3, color:"#7c5cff",
            desc:"Lightning arcs between multiple enemies. Hits air. Shreds swarms." },
  flame:  { name:"Flame",   icon:"🔥", unlock:24, cost:165, dmg:5,   rate:7,   range:1.9, air:false, kind:"bullet",  bulletSpeed:260, burn:6, burnDur:2, splash:0.7, color:"#fb7185",
            desc:"Short-range spray that sets enemies ablaze for damage over time." },
  missile:{ name:"Missile", icon:"🚀", unlock:34, cost:225, dmg:48,  rate:0.75,range:3.3, air:true,  kind:"bullet",  bulletSpeed:300, splash:1.25, color:"#f97316",
            desc:"Big splash, hits air. Homes in for devastating area damage." },
  poison: { name:"Poison",  icon:"☠️", unlock:46, cost:205, dmg:4,   rate:1.1, range:2.5, air:true,  kind:"bullet",  bulletSpeed:360, poison:9, poisonDur:3, color:"#4ade80",
            desc:"Stacking poison that ignores armor. Melts tanks and bosses over time." },
  laser:  { name:"Laser",   icon:"🔆", unlock:60, cost:265, dmg:30,  rate:8,   range:3.1, air:true,  kind:"beam",    color:"#f0abfc",
            desc:"Continuous beam that ramps up damage the longer it holds a target." },
  railgun:{ name:"Railgun", icon:"🛰️", unlock:78, cost:340, dmg:150, rate:0.5, range:6, air:true,   kind:"pierce",  color:"#38bdf8",
            desc:"Piercing hyper-shot that punches through everything in a line. Hits air." },
};
const TOWER_ORDER = ["gun","cannon","frost","sniper","tesla","flame","missile","poison","laser","railgun"];

// Upgrade multipliers per tower level (index = level-1).
const UP_DMG   = [1, 1.6, 2.5, 3.9];
const UP_RATE  = [1, 1.15, 1.32, 1.5];
const UP_RANGE = [1, 1.1, 1.2, 1.32];
const MAX_TLEVEL = 4;
function upgradeCost(t) { return Math.round(t.def.cost * (0.7 + t.level * 0.55)); }
function sellValue(t) { return Math.round(t.invested * 0.7); }

/* ---------------- Level configuration / difficulty ---------------- */
function isBossLevel(level) { return level % 10 === 0; }

function levelConfig(level) {
  const mapIndex = (level - 1) % MAPS.length;
  const hpMul = Math.pow(1.058, level - 1);
  const rewardMul = Math.pow(1.027, level - 1);
  const speedMul = 1 + Math.min(0.55, (level - 1) * 0.006);
  const startGold = 250 + (level - 1) * 6;
  const lives = 20;
  const numWaves = Math.min(12, 4 + Math.floor((level - 1) / 8));

  // Which enemy types are available at this level.
  const pool = ["grunt"];
  if (level >= 3) pool.push("runner");
  if (level >= 5) pool.push("tank");
  if (level >= 6) pool.push("swarm");
  if (level >= 11) pool.push("flyer");
  if (level >= 20) pool.push("healer");
  if (level >= 28) pool.push("armored");

  const waves = [];
  const rnd = mulberry32(level * 9301 + 49297);
  for (let w = 0; w < numWaves; w++) {
    const isLast = w === numWaves - 1;
    const entries = [];
    const groups = 1 + Math.floor(rnd() * 2) + (level > 30 ? 1 : 0);
    for (let g = 0; g < groups; g++) {
      const type = pool[Math.floor(rnd() * pool.length)];
      const base = ENEMIES[type];
      let count = Math.round((5 + level * 0.35 + w * 1.1) * (type === "swarm" ? 2.2 : type === "tank" || type === "armored" ? 0.5 : 1));
      count = Math.max(2, count);
      const interval = base.speed > 1.6 ? 0.45 : 0.7;
      entries.push({ type, count, interval });
    }
    // Boss on the final wave of boss levels; occasional mini-tank groups later.
    if (isLast && isBossLevel(level)) {
      const bossCount = 1 + Math.floor(level / 40);
      entries.push({ type: "boss", count: bossCount, interval: 3 });
    }
    waves.push({ entries, gap: isLast ? 0 : 5 });
  }

  return { level, mapIndex, hpMul, rewardMul, speedMul, startGold, lives, waves };
}

// Build a scaled enemy stat block.
function scaledEnemy(type, cfg) {
  const b = ENEMIES[type];
  return {
    type,
    maxHp: Math.round(b.hp * cfg.hpMul * (b.boss ? 1 : 1)),
    speed: b.speed * cfg.speedMul,
    reward: Math.max(1, Math.round(b.reward * cfg.rewardMul)),
    air: b.air, armor: b.armor, radius: b.radius, color: b.color,
    leak: b.leak, heal: !!b.heal, boss: !!b.boss, name: b.name,
  };
}

/* ---------------- Save / progress ---------------- */
let save = loadSave();
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.cleared === "number") return { cleared: s.cleared, stars: s.stars || {} };
  } catch (e) {}
  return { cleared: 0, stars: {} };
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
function highestUnlockedLevel() { return Math.min(TOTAL_LEVELS, save.cleared + 1); }

/* ---------------- Utility ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

/* ---------------- Audio (tiny WebAudio blips, no assets) ---------------- */
const Audio = (function () {
  let ctx = null, enabled = true;
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ctx; }
  function blip(freq, dur, type, vol) {
    if (!enabled) return; const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    g.gain.value = (vol || 0.04);
    o.connect(g); g.connect(c.destination);
    const t = c.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
    o.start(t); o.stop(t + (dur || 0.08) + 0.02);
  }
  return {
    shoot: () => blip(680, 0.05, "square", 0.02),
    hit:   () => blip(240, 0.05, "sawtooth", 0.02),
    build: () => blip(520, 0.09, "sine", 0.05),
    kill:  () => blip(180, 0.08, "triangle", 0.03),
    lose:  () => blip(120, 0.3, "sawtooth", 0.05),
    win:   () => { blip(523,0.12,"sine",0.05); setTimeout(()=>blip(659,0.12,"sine",0.05),120); setTimeout(()=>blip(784,0.18,"sine",0.05),240); },
    leak:  () => blip(90, 0.15, "sawtooth", 0.05),
    toggle:(v)=>{ enabled = v; },
  };
})();

/* ============================================================
   GAME STATE
   ============================================================ */
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const Game = {
  cfg: null,
  path: null,
  pathCells: null,
  gold: 0, lives: 0,
  enemies: [], towers: [], projectiles: [], effects: [],
  waveIndex: -1,          // current wave (0-based), -1 = not started
  spawnQueue: [],         // pending spawns for the active wave
  waveActive: false,
  betweenTimer: 0,        // countdown to auto-start next wave
  autoNext: false,
  finished: false, won: false, lost: false,
  speed: 1, paused: false,
  selectedType: null,     // turret type chosen to build
  selectedTower: null,    // placed turret selected
  hover: { c: -1, r: -1, valid: false },
  time: 0,
};

/* ---------------- Level start ---------------- */
function startLevel(level) {
  const cfg = levelConfig(level);
  Game.cfg = cfg;
  Game.path = mapPixelPath(cfg.mapIndex);
  Game.pathCells = MAP_PATHCELLS[cfg.mapIndex];
  Game.gold = cfg.startGold;
  Game.lives = cfg.lives;
  Game.enemies = []; Game.towers = []; Game.projectiles = []; Game.effects = [];
  Game.waveIndex = -1; Game.spawnQueue = []; Game.waveActive = false;
  Game.betweenTimer = 0; Game.autoNext = false;
  Game.finished = false; Game.won = false; Game.lost = false;
  Game.speed = 1; Game.paused = false;
  Game.selectedType = null; Game.selectedTower = null;
  Game.time = 0; Game.leakedThisLevel = 0;

  showScreen("game");
  hideOverlay();
  buildTowerButtons();
  refreshHUD();
  updateStartButton();
  setSpeed(1);
  hideSelCard();
}

/* ---------------- Wave management ---------------- */
function startNextWave() {
  if (Game.finished) return;
  if (Game.waveActive) return;
  const next = Game.waveIndex + 1;
  if (next >= Game.cfg.waves.length) return;
  Game.waveIndex = next;
  Game.waveActive = true;
  Game.betweenTimer = 0;
  Game.autoNext = false;
  // Build spawn queue from wave entries (interleave groups a little).
  const wave = Game.cfg.waves[next];
  const q = [];
  wave.entries.forEach((e, gi) => {
    let t = gi * 0.25;
    for (let i = 0; i < e.count; i++) { q.push({ type: e.type, at: t }); t += e.interval; }
  });
  q.sort((a, b) => a.at - b.at);
  Game.spawnQueue = q;
  Game.spawnClock = 0;
  refreshHUD();
  updateStartButton();
}

// Send the next wave early for a small gold bonus.
function sendWaveEarly() {
  if (!Game.waveActive && Game.waveIndex >= 0 && Game.waveIndex < Game.cfg.waves.length - 1) {
    const bonus = 20 + Game.waveIndex * 4;
    Game.gold += bonus;
    spawnFloatText((W/2), 30, "+" + bonus + " early bonus", "#ffd24d");
    startNextWave();
  }
}

/* ---------------- Enemy spawning ---------------- */
function spawnEnemy(type) {
  const st = scaledEnemy(type, Game.cfg);
  const p0 = Game.path[0];
  const e = {
    ...st, hp: st.maxHp,
    x: p0.x, y: p0.y, seg: 0, t: 0,
    slowUntil: 0, slowFactor: 1,
    burns: [], poisons: [], healTick: 0,
    dead: false, leaked: false,
  };
  Game.enemies.push(e);
}

/* ---------------- Update loop ---------------- */
let lastTs = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05; // clamp big gaps
  if (screen === "game" && !Game.paused && !Game.finished) {
    const steps = Game.speed;
    for (let s = 0; s < steps; s++) update(dt);
  }
  if (screen === "game") render();
}

function update(dt) {
  Game.time += dt;

  // --- spawns ---
  if (Game.waveActive) {
    Game.spawnClock += dt;
    while (Game.spawnQueue.length && Game.spawnQueue[0].at <= Game.spawnClock) {
      spawnEnemy(Game.spawnQueue.shift().type);
    }
  }

  // --- enemies ---
  const path = Game.path;
  for (const e of Game.enemies) {
    if (e.dead) continue;
    // status effects
    let spd = e.speed;
    if (Game.time < e.slowUntil) spd *= e.slowFactor; else e.slowFactor = 1;
    // burns
    if (e.burns.length) {
      let dps = 0;
      e.burns = e.burns.filter(b => b.until > Game.time);
      for (const b of e.burns) dps += b.dps;
      if (dps) damageEnemy(e, dps * dt, true, null);
    }
    // poisons (stack)
    if (e.poisons.length) {
      let dps = 0;
      e.poisons = e.poisons.filter(p => p.until > Game.time);
      for (const p of e.poisons) dps += p.dps;
      if (dps) damageEnemy(e, dps * dt, true, null);
    }
    if (e.dead) continue;
    // healer aura
    if (e.heal) {
      e.healTick -= dt;
      if (e.healTick <= 0) {
        e.healTick = 1;
        for (const o of Game.enemies) {
          if (o !== e && !o.dead && dist2(o.x, o.y, e.x, e.y) < (CELL * 2) ** 2) {
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.04);
          }
        }
        spawnRing(e.x, e.y, CELL * 2, "rgba(192,132,252,.5)");
      }
    }
    // movement along path
    let move = spd * CELL * dt;
    while (move > 0 && e.seg < path.length - 1) {
      const a = path[e.seg], b = path[e.seg + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const remain = segLen * (1 - e.t);
      if (move < remain) {
        e.t += move / segLen; move = 0;
      } else {
        move -= remain; e.seg++; e.t = 0;
      }
    }
    if (e.seg >= path.length - 1) {
      // leaked
      e.leaked = true; e.dead = true;
      Game.lives -= e.leak;
      Audio.leak();
      spawnFloatText(W - 60, 30, "-" + e.leak + " ❤", "#ff5d6c");
      continue;
    }
    const a = path[e.seg], b = path[e.seg + 1];
    e.x = a.x + (b.x - a.x) * e.t;
    e.y = a.y + (b.y - a.y) * e.t;
    e.facing = Math.atan2(b.y - a.y, b.x - a.x);
  }

  // --- towers ---
  for (const t of Game.towers) {
    t.cooldown -= dt;
    t.beamTarget = null;
    const rangePx = t.range * CELL;
    // acquire target: furthest-along in range that this tower can hit
    let best = null, bestScore = -1;
    for (const e of Game.enemies) {
      if (e.dead) continue;
      if (e.air && !t.def.air) continue;
      if (dist2(e.x, e.y, t.x, t.y) <= rangePx * rangePx) {
        const score = e.seg + e.t; // progress
        if (score > bestScore) { bestScore = score; best = e; }
      }
    }
    if (!best) { t.beamRamp = 0; continue; }
    t.angle = Math.atan2(best.y - t.y, best.x - t.x);

    if (t.def.kind === "beam") {
      // continuous beam ramps up while locked
      t.beamTarget = best;
      t.beamRamp = Math.min(3, (t.beamRamp || 0) + dt * 1.2);
      const dps = t.dmg * (1 + t.beamRamp);
      damageEnemy(best, dps * dt, false, t);
      continue;
    }

    if (t.cooldown <= 0) {
      t.cooldown = 1 / t.rate;
      fire(t, best);
    }
  }

  // --- projectiles ---
  for (const p of Game.projectiles) {
    if (p.done) continue;
    const tgt = p.target;
    if (!tgt || tgt.dead) {
      // fly toward last known point, then expire
      p.x += Math.cos(p.dir) * p.speed * dt;
      p.y += Math.sin(p.dir) * p.speed * dt;
      p.life -= dt; if (p.life <= 0) p.done = true;
      continue;
    }
    const dx = tgt.x - p.x, dy = tgt.y - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + tgt.radius) {
      p.done = true;
      onProjectileHit(p, tgt);
    } else {
      p.x += (dx / d) * step; p.y += (dy / d) * step;
      p.dir = Math.atan2(dy, dx);
    }
  }

  // --- effects ---
  for (const fx of Game.effects) { fx.life -= dt; }
  Game.effects = Game.effects.filter(f => f.life > 0);

  // cleanup
  Game.projectiles = Game.projectiles.filter(p => !p.done);
  Game.enemies = Game.enemies.filter(e => !e.dead || e._render);
  // remove dead marked
  Game.enemies = Game.enemies.filter(e => !e.dead);

  // --- wave / level completion ---
  if (Game.waveActive && Game.spawnQueue.length === 0 && Game.enemies.length === 0) {
    Game.waveActive = false;
    // wave bonus
    const wb = 30 + Game.waveIndex * 6;
    Game.gold += wb;
    if (Game.waveIndex >= Game.cfg.waves.length - 1) {
      levelWon();
    } else {
      spawnFloatText(W / 2, 30, "Wave clear +" + wb, "#4ade80");
      Game.betweenTimer = 6; Game.autoNext = true;
    }
    updateStartButton();
  }
  if (Game.autoNext && !Game.waveActive && !Game.finished) {
    Game.betweenTimer -= dt;
    if (Game.betweenTimer <= 0) { Game.autoNext = false; startNextWave(); }
  }

  if (Game.lives <= 0 && !Game.finished) levelLost();

  refreshHUD();
}

/* ---------------- Firing / damage ---------------- */
function fire(t, target) {
  const def = t.def;
  Audio.shoot();
  if (def.kind === "hitscan") {
    spawnBeamFX(t.x, t.y, target.x, target.y, def.color, 0.09, 2);
    damageEnemy(target, t.dmg, false, t);
    return;
  }
  if (def.kind === "chain") {
    // chain lightning: hit target then jump to nearest others
    const hitList = [target];
    let cur = target;
    for (let i = 0; i < def.chains; i++) {
      let nxt = null, bd = (CELL * 2.1) ** 2;
      for (const e of Game.enemies) {
        if (e.dead || hitList.includes(e)) continue;
        if (e.air && !def.air) continue;
        const dd = dist2(e.x, e.y, cur.x, cur.y);
        if (dd < bd) { bd = dd; nxt = e; }
      }
      if (!nxt) break;
      hitList.push(nxt); cur = nxt;
    }
    let prev = { x: t.x, y: t.y };
    for (const e of hitList) {
      spawnBeamFX(prev.x, prev.y, e.x, e.y, def.color, 0.12, 2);
      damageEnemy(e, t.dmg, false, t);
      prev = e;
    }
    return;
  }
  if (def.kind === "pierce") {
    // railgun: damage everything along a line from tower through target
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    const len = def.range * CELL + CELL;
    const ex = t.x + Math.cos(ang) * len, ey = t.y + Math.sin(ang) * len;
    spawnBeamFX(t.x, t.y, ex, ey, def.color, 0.16, 4);
    for (const e of Game.enemies) {
      if (e.dead) continue; if (e.air && !def.air) continue;
      if (pointLineDist(e.x, e.y, t.x, t.y, ex, ey) < e.radius + 8) damageEnemy(e, t.dmg, false, t);
    }
    return;
  }
  // default: projectile
  Game.projectiles.push({
    x: t.x, y: t.y, target, speed: def.bulletSpeed, dir: t.angle,
    dmg: t.dmg, def, color: def.color, life: 2, done: false, tower: t,
  });
}

function onProjectileHit(p, tgt) {
  const def = p.def;
  Audio.hit();
  if (def.splash) {
    const r = def.splash * CELL;
    spawnRing(p.x, p.y, r, "rgba(251,146,60,.4)");
    for (const e of Game.enemies) {
      if (e.dead) continue;
      if (e.air && !def.air && e !== tgt) continue;
      if (dist2(e.x, e.y, p.x, p.y) <= r * r) applyProjectileEffects(e, p);
    }
  } else {
    applyProjectileEffects(tgt, p);
  }
}
function applyProjectileEffects(e, p) {
  const def = p.def;
  damageEnemy(e, p.dmg, false, p.tower);
  if (e.dead) return;
  if (def.slow) { e.slowFactor = Math.min(e.slowFactor, 1 - def.slow); e.slowUntil = Game.time + def.slowDur; }
  if (def.burn) e.burns.push({ dps: def.burn, until: Game.time + def.burnDur });
  if (def.poison) e.poisons.push({ dps: def.poison, until: Game.time + def.poisonDur });
}

function damageEnemy(e, amount, bypassArmor, tower) {
  if (e.dead) return;
  let dmg = amount;
  if (!bypassArmor && e.armor) dmg *= (1 - e.armor);
  e.hp -= dmg;
  if (e.hp <= 0) {
    e.dead = true;
    Game.gold += e.reward;
    Audio.kill();
    spawnFloatText(e.x, e.y - 6, "+" + e.reward, "#ffd24d");
    spawnBurst(e.x, e.y, e.color);
  }
}

/* ---------------- Visual FX helpers ---------------- */
function spawnFloatText(x, y, text, color) { Game.effects.push({ kind: "text", x, y, text, color, life: 0.9, maxLife: 0.9 }); }
function spawnBeamFX(x1, y1, x2, y2, color, life, wid) { Game.effects.push({ kind: "beam", x1, y1, x2, y2, color, life, maxLife: life, wid }); }
function spawnRing(x, y, r, color) { Game.effects.push({ kind: "ring", x, y, r, color, life: 0.3, maxLife: 0.3 }); }
function spawnBurst(x, y, color) { Game.effects.push({ kind: "burst", x, y, color, life: 0.35, maxLife: 0.35 }); }

function pointLineDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy; if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let tt = ((px - x1) * dx + (py - y1) * dy) / l2; tt = clamp(tt, 0, 1);
  return Math.hypot(px - (x1 + tt * dx), py - (y1 + tt * dy));
}

/* ---------------- Level end ---------------- */
function starsForLevel() {
  // 3 stars: no lives lost. 2: lost <= 25%. 1: survived.
  const lost = Game.cfg.lives - Game.lives;
  if (lost <= 0) return 3;
  if (lost <= Game.cfg.lives * 0.25) return 2;
  return 1;
}
function levelWon() {
  Game.finished = true; Game.won = true;
  Audio.win();
  const lvl = Game.cfg.level;
  const stars = starsForLevel();
  save.cleared = Math.max(save.cleared, lvl);
  save.stars[lvl] = Math.max(save.stars[lvl] || 0, stars);
  persist();
  showResult(true, stars, lvl);
}
function levelLost() {
  Game.finished = true; Game.lost = true;
  Audio.lose();
  showResult(false, 0, Game.cfg.level);
}

/* ============================================================
   RENDERING
   ============================================================ */
function render() {
  ctx.clearRect(0, 0, W, H);
  drawTerrain();
  drawPath();
  drawBuildHover();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawEffects();
  drawWaveBanner();
}

function drawTerrain() {
  // grass base
  ctx.fillStyle = "#16311f";
  ctx.fillRect(0, 0, W, H);
  // subtle checker
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if ((r + c) % 2 === 0) { ctx.fillStyle = "rgba(255,255,255,0.015)"; ctx.fillRect(c * CELL, r * CELL, CELL, CELL); }
  }
  // grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); }
  for (let r = 0; r <= ROWS; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); }
  ctx.stroke();
}

function drawPath() {
  const path = Game.path;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // dirt road
  ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = CELL * 0.82;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
  ctx.strokeStyle = "#5a4a34"; ctx.lineWidth = CELL * 0.62;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke();
  // dashed center
  ctx.setLineDash([8, 12]); ctx.strokeStyle = "rgba(255,220,150,.25)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke(); ctx.setLineDash([]);
  // start & base markers
  const s = path[0], e = path[path.length - 1];
  drawMarker(s.x, s.y, "#4ade80", "▶");
  drawMarker(e.x, e.y, "#ff5d6c", "🏰");
}
function drawMarker(x, y, color, label) {
  x = clamp(x, 14, W - 14); y = clamp(y, 14, H - 14);
  ctx.fillStyle = color; ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
}

function drawBuildHover() {
  if (!Game.selectedType) return;
  const { c, r, valid } = Game.hover;
  if (c < 0) return;
  const def = TOWERS[Game.selectedType];
  const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL;
  // range preview
  ctx.beginPath(); ctx.arc(x, y, def.range * CELL, 0, Math.PI * 2);
  ctx.fillStyle = valid ? "rgba(124,92,255,.12)" : "rgba(255,93,108,.10)";
  ctx.fill();
  ctx.strokeStyle = valid ? "rgba(124,92,255,.5)" : "rgba(255,93,108,.5)"; ctx.lineWidth = 1.5; ctx.stroke();
  // cell highlight
  ctx.fillStyle = valid ? "rgba(124,92,255,.28)" : "rgba(255,93,108,.28)";
  ctx.fillRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6);
  ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.globalAlpha = valid ? 0.9 : 0.4;
  ctx.fillText(def.icon, x, y); ctx.globalAlpha = 1;
}

function drawTowers() {
  for (const t of Game.towers) {
    const sel = Game.selectedTower === t;
    if (sel) {
      ctx.beginPath(); ctx.arc(t.x, t.y, t.range * CELL, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(124,92,255,.10)"; ctx.fill();
      ctx.strokeStyle = "rgba(124,92,255,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // base pad
    ctx.fillStyle = "#0e1a12";
    roundRect(t.x - 18, t.y - 18, 36, 36, 8); ctx.fill();
    ctx.strokeStyle = t.def.color; ctx.lineWidth = 2; ctx.stroke();
    // barrel pointing at angle
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle || 0);
    ctx.fillStyle = t.def.color;
    ctx.fillRect(0, -3, 20, 6);
    ctx.restore();
    // icon
    ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t.def.icon, t.x, t.y);
    // level pips
    for (let i = 0; i < t.level; i++) {
      ctx.fillStyle = "#ffd24d";
      ctx.beginPath(); ctx.arc(t.x - 12 + i * 8, t.y + 15, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    // beam render
    if (t.beamTarget) {
      spawnBeamNow(t.x, t.y, t.beamTarget.x, t.beamTarget.y, t.def.color, 2 + (t.beamRamp || 0));
    }
  }
}
function spawnBeamNow(x1, y1, x2, y2, color, wid) {
  ctx.strokeStyle = color; ctx.lineWidth = wid; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1;
}

function drawEnemies() {
  for (const e of Game.enemies) {
    // slow tint
    if (Game.time < e.slowUntil) { ctx.strokeStyle = "rgba(103,232,249,.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2); ctx.stroke(); }
    // body
    ctx.fillStyle = e.color;
    if (e.air) {
      // diamond for flyers
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2); ctx.restore();
      // shadow
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.radius + 6, e.radius, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill();
    }
    // boss crown / outline
    if (e.boss) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "14px serif"; ctx.textAlign = "center"; ctx.fillText("👑", e.x, e.y - e.radius - 6); }
    if (e.armor) { ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius - 2, 0, Math.PI * 2); ctx.stroke(); }
    if (e.poisons && e.poisons.length) { ctx.fillStyle = "rgba(74,222,128,.35)"; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill(); }
    if (e.burns && e.burns.length) { ctx.fillStyle = "rgba(251,113,133,.3)"; ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.fill(); }
    // hp bar
    const w = e.radius * 2.2, hpf = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(e.x - w / 2, e.y - e.radius - 8, w, 4);
    ctx.fillStyle = hpf > 0.5 ? "#4ade80" : hpf > 0.25 ? "#ffd24d" : "#ff5d6c";
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 8, w * hpf, 4);
  }
}

function drawProjectiles() {
  for (const p of Game.projectiles) {
    ctx.fillStyle = p.color;
    const r = p.def.splash ? 5 : 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    // little trail
    ctx.strokeStyle = p.color; ctx.globalAlpha = 0.3; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(p.dir) * 8, p.y - Math.sin(p.dir) * 8); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function drawEffects() {
  for (const fx of Game.effects) {
    const a = clamp(fx.life / fx.maxLife, 0, 1);
    if (fx.kind === "text") {
      ctx.globalAlpha = a; ctx.fillStyle = fx.color;
      ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
      ctx.fillText(fx.text, fx.x, fx.y - (1 - a) * 18); ctx.globalAlpha = 1;
    } else if (fx.kind === "beam") {
      ctx.globalAlpha = a; ctx.strokeStyle = fx.color; ctx.lineWidth = fx.wid || 2;
      ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (fx.kind === "ring") {
      ctx.globalAlpha = a; ctx.strokeStyle = fx.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1.1 - a * 0.1), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (fx.kind === "burst") {
      ctx.globalAlpha = a; ctx.fillStyle = fx.color;
      for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2; const rr = (1 - a) * 14;
        ctx.beginPath(); ctx.arc(fx.x + Math.cos(ang) * rr, fx.y + Math.sin(ang) * rr, 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
}

function drawWaveBanner() {
  if (Game.autoNext && Game.betweenTimer > 0) {
    const s = Math.ceil(Game.betweenTimer);
    ctx.fillStyle = "rgba(0,0,0,.35)"; roundRect(W / 2 - 90, 8, 180, 26, 8); ctx.fill();
    ctx.fillStyle = "#e7edf7"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Next wave in " + s + "s  ·  (Send early)", W / 2, 21);
  } else if (Game.waveIndex < 0 && !Game.finished) {
    ctx.fillStyle = "rgba(0,0,0,.35)"; roundRect(W / 2 - 110, 8, 220, 26, 8); ctx.fill();
    ctx.fillStyle = "#e7edf7"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Build your defense, then Start Wave", W / 2, 21);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ============================================================
   INPUT
   ============================================================ */
function canvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  const cx = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
  const cy = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
  return { x: cx * sx, y: cy * sy };
}
function cellAt(x, y) { return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) }; }

function canBuildAt(c, r) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  if (Game.pathCells.has(c + "," + r)) return false;
  for (const t of Game.towers) if (t.c === c && t.r === r) return false;
  return true;
}

canvas.addEventListener("mousemove", (e) => {
  const p = canvasPos(e); const { c, r } = cellAt(p.x, p.y);
  Game.hover = { c, r, valid: Game.selectedType ? canBuildAt(c, r) : false };
});
canvas.addEventListener("mouseleave", () => { Game.hover = { c: -1, r: -1, valid: false }; });

function handleClick(e) {
  const p = canvasPos(e); const { c, r } = cellAt(p.x, p.y);
  // clicking a placed tower selects it
  const clicked = Game.towers.find(t => t.c === c && t.r === r);
  if (Game.selectedType && canBuildAt(c, r)) {
    tryBuild(c, r);
    return;
  }
  if (clicked) { selectTower(clicked); return; }
  // empty click clears selection
  Game.selectedTower = null; hideSelCard();
}
canvas.addEventListener("click", handleClick);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const p = canvasPos(e); const { c, r } = cellAt(p.x, p.y);
  Game.hover = { c, r, valid: Game.selectedType ? canBuildAt(c, r) : false };
  handleClick(e);
}, { passive: false });

function tryBuild(c, r) {
  const def = TOWERS[Game.selectedType];
  if (Game.gold < def.cost) { flashCantAfford(); return; }
  Game.gold -= def.cost;
  const t = makeTower(Game.selectedType, c, r);
  Game.towers.push(t);
  Audio.build();
  refreshHUD();
  // keep selectedType so player can place multiple; deselect if can't afford another
  buildTowerButtons();
}

function makeTower(type, c, r) {
  const def = TOWERS[type];
  const t = {
    type, def, c, r,
    x: (c + 0.5) * CELL, y: (r + 0.5) * CELL,
    level: 1, invested: def.cost,
    cooldown: 0, angle: -Math.PI / 2, beamRamp: 0,
  };
  recomputeTower(t);
  return t;
}
function recomputeTower(t) {
  const i = t.level - 1;
  t.dmg = t.def.dmg * UP_DMG[i];
  t.rate = t.def.rate * UP_RATE[i];
  t.range = t.def.range * UP_RANGE[i];
}

function selectTower(t) {
  Game.selectedTower = t;
  Game.selectedType = null;
  buildTowerButtons();
  showSelCard(t);
}

/* ============================================================
   UI: screens, HUD, sidebar
   ============================================================ */
let screen = "menu";
function showScreen(name) {
  screen = name;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  if (name === "levels") renderLevelSelect();
}

function refreshHUD() {
  document.getElementById("hud-level").textContent = Game.cfg ? Game.cfg.level : "-";
  document.getElementById("hud-gold").textContent = Math.floor(Game.gold);
  document.getElementById("hud-lives").textContent = Math.max(0, Game.lives);
  const wtot = Game.cfg ? Game.cfg.waves.length : 0;
  const wnow = Math.max(0, Game.waveIndex + (Game.waveActive || Game.waveIndex >= 0 ? 1 : 0));
  document.getElementById("hud-wave").textContent = Math.min(wnow, wtot) + "/" + wtot;
}

function updateStartButton() {
  const btn = document.getElementById("btn-startwave");
  if (Game.finished) { btn.disabled = true; btn.textContent = "—"; return; }
  btn.disabled = false;
  if (Game.waveActive) {
    // during a wave, allow sending next early if there is one
    if (Game.waveIndex < Game.cfg.waves.length - 1) { btn.textContent = "⏭ Send Next Wave"; }
    else { btn.textContent = "Wave in progress…"; btn.disabled = true; }
  } else if (Game.waveIndex < 0) {
    btn.textContent = "▶ Start Wave 1";
  } else if (Game.autoNext) {
    btn.textContent = "⏭ Send Next Now (+bonus)";
  } else if (Game.waveIndex >= Game.cfg.waves.length - 1) {
    btn.textContent = "—"; btn.disabled = true;
  } else {
    btn.textContent = "▶ Start Next Wave";
  }
}

/* --- tower sidebar --- */
function buildTowerButtons() {
  const list = document.getElementById("tower-list");
  list.innerHTML = "";
  const lvl = Game.cfg ? Game.cfg.level : 1;
  for (const type of TOWER_ORDER) {
    const def = TOWERS[type];
    const locked = def.unlock > lvl;
    const canAfford = Game.gold >= def.cost;
    const el = document.createElement("div");
    el.className = "tower-btn" + (locked ? " locked" : "") + (!canAfford && !locked ? " cant" : "") + (Game.selectedType === type ? " selected" : "");
    if (locked) {
      el.innerHTML = `<div class="ticon">🔒</div><div class="tname">${def.name}</div><div class="lockinfo">Lv.${def.unlock}</div>`;
    } else {
      el.innerHTML = `<div class="ticon">${def.icon}</div><div class="tname">${def.name}</div><div class="tcost">💰${def.cost}</div>`;
      el.addEventListener("click", () => {
        Game.selectedType = (Game.selectedType === type) ? null : type;
        Game.selectedTower = null; hideSelCard();
        document.getElementById("tower-desc").textContent = Game.selectedType ? def.desc : "Select a turret to build, then click a tile.";
        buildTowerButtons();
      });
      el.addEventListener("mouseenter", () => { document.getElementById("tower-desc").textContent = def.desc; });
    }
    list.appendChild(el);
  }
}

function showSelCard(t) {
  const card = document.getElementById("sel-card");
  card.style.display = "block";
  document.getElementById("sel-title").textContent = t.def.icon + " " + t.def.name + " — Lv." + t.level;
  const dps = (t.def.kind === "beam") ? (t.dmg * 2).toFixed(0) + "–" + (t.dmg * 4).toFixed(0) : (t.dmg * t.rate).toFixed(0);
  const stats = document.getElementById("sel-stats");
  stats.innerHTML = `
    <div class="row"><span class="k">Damage</span><span>${t.dmg.toFixed(1)}</span></div>
    <div class="row"><span class="k">Fire rate</span><span>${t.rate.toFixed(2)}/s</span></div>
    <div class="row"><span class="k">DPS</span><span>${dps}</span></div>
    <div class="row"><span class="k">Range</span><span>${(t.range).toFixed(1)} tiles</span></div>
    <div class="row"><span class="k">Targets air</span><span>${t.def.air ? "Yes" : "No"}</span></div>`;
  const up = document.getElementById("btn-upgrade");
  if (t.level >= MAX_TLEVEL) { up.textContent = "MAX LEVEL"; up.disabled = true; }
  else { up.disabled = false; up.textContent = "⬆ Upgrade 💰" + upgradeCost(t); }
  document.getElementById("btn-sell").textContent = "Sell 💰" + sellValue(t);
}
function hideSelCard() { document.getElementById("sel-card").style.display = "none"; }

function upgradeSelected() {
  const t = Game.selectedTower; if (!t || t.level >= MAX_TLEVEL) return;
  const cost = upgradeCost(t);
  if (Game.gold < cost) { flashCantAfford(); return; }
  Game.gold -= cost; t.invested += cost; t.level++;
  recomputeTower(t); Audio.build();
  showSelCard(t); refreshHUD(); buildTowerButtons();
}
function sellSelected() {
  const t = Game.selectedTower; if (!t) return;
  Game.gold += sellValue(t);
  Game.towers = Game.towers.filter(x => x !== t);
  Game.selectedTower = null; hideSelCard(); refreshHUD(); buildTowerButtons();
}

function flashCantAfford() {
  const g = document.querySelector(".hud .gold");
  g.animate([{ color: "#ff5d6c" }, { color: "" }], { duration: 500 });
}

/* --- speed / pause --- */
function setSpeed(s) {
  Game.speed = s; Game.paused = false;
  ["spd1", "spd2", "spd3"].forEach(id => document.getElementById(id).classList.remove("on"));
  document.getElementById("spd" + s).classList.add("on");
  document.getElementById("btn-pause").textContent = "⏸ Pause";
}
function togglePause() {
  Game.paused = !Game.paused;
  document.getElementById("btn-pause").textContent = Game.paused ? "▶ Resume" : "⏸ Pause";
}

/* --- result overlay --- */
function showResult(win, stars, level) {
  const ov = document.getElementById("overlay");
  const box = document.getElementById("result-box");
  box.className = "result " + (win ? "win" : "lose");
  document.getElementById("result-title").textContent = win ? "Level Complete!" : "Defenses Breached";
  document.getElementById("result-stars").textContent = win ? "★".repeat(stars) + "☆".repeat(3 - stars) : "";
  document.getElementById("result-msg").textContent = win
    ? (level >= TOTAL_LEVELS ? "You conquered all 100 levels. You are the Turret Defense KING! 👑" : "Great defending! Ready for the next challenge?")
    : "The enemies overran your base. Adjust your build and try again.";

  // new tower unlock banner
  const banner = document.getElementById("unlock-banner");
  banner.style.display = "none";
  if (win && level < TOTAL_LEVELS) {
    const nextUnlock = TOWER_ORDER.map(k => TOWERS[k]).find(d => d.unlock === level + 1);
    if (nextUnlock) { banner.style.display = "block"; banner.textContent = "🔓 New turret unlocked: " + nextUnlock.icon + " " + nextUnlock.name + "!"; }
  }

  const actions = document.getElementById("result-actions");
  actions.innerHTML = "";
  if (win && level < TOTAL_LEVELS) {
    const nb = mkBtn("▶ Next Level", "primary", () => startLevel(level + 1));
    actions.appendChild(nb);
  }
  actions.appendChild(mkBtn(win ? "Replay" : "↻ Retry", win ? "ghost" : "primary", () => startLevel(level)));
  actions.appendChild(mkBtn("Levels", "ghost", () => showScreen("levels")));
  ov.classList.add("show");
}
function hideOverlay() { document.getElementById("overlay").classList.remove("show"); }
function mkBtn(label, cls, fn) {
  const b = document.createElement("button");
  b.className = "btn " + (cls || "");
  b.textContent = label; b.addEventListener("click", fn);
  return b;
}

/* --- level select grid --- */
function renderLevelSelect() {
  const grid = document.getElementById("levels-grid");
  grid.innerHTML = "";
  const unlockedMax = highestUnlockedLevel();
  for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
    const locked = lvl > unlockedMax;
    const cleared = lvl <= save.cleared;
    const boss = isBossLevel(lvl);
    const cell = document.createElement("div");
    cell.className = "level-cell" + (locked ? " locked" : "") + (cleared ? " cleared" : "") + (boss ? " boss" : "");
    const stars = save.stars[lvl] || 0;
    const newTower = TOWER_ORDER.map(k => TOWERS[k]).find(d => d.unlock === lvl);
    cell.innerHTML =
      (boss ? `<span class="bosslabel">BOSS</span>` : "") +
      (locked ? `<span class="lk">🔒</span>` : `<span>${lvl}</span>`) +
      (cleared ? `<span class="stars">${"★".repeat(stars)}</span>` : `<span class="stars"></span>`) +
      (newTower && !locked ? `<span class="newtower">${newTower.icon} unlock</span>` : "");
    if (!locked) cell.addEventListener("click", () => startLevel(lvl));
    grid.appendChild(cell);
  }
  document.getElementById("progress-note").textContent =
    save.cleared + " / " + TOTAL_LEVELS + " levels cleared";
}

/* ============================================================
   WIRE UP BUTTONS
   ============================================================ */
document.getElementById("btn-play").addEventListener("click", () => {
  if (save.cleared > 0) showScreen("levels"); else startLevel(1);
});
document.getElementById("btn-continue").addEventListener("click", () => {
  startLevel(highestUnlockedLevel());
});
document.getElementById("btn-howto").addEventListener("click", () => {
  const h = document.getElementById("howto"); h.style.display = h.style.display === "none" ? "block" : "none";
});
document.getElementById("btn-back-menu").addEventListener("click", () => showScreen("menu"));
document.getElementById("btn-quit").addEventListener("click", () => showScreen("levels"));
document.getElementById("btn-reset").addEventListener("click", () => {
  if (confirm("Erase all saved progress?")) { save = { cleared: 0, stars: {} }; persist(); renderLevelSelect(); }
});
document.getElementById("btn-startwave").addEventListener("click", () => {
  if (Game.waveIndex < 0) startNextWave();
  else if (Game.autoNext || (!Game.waveActive && Game.waveIndex < Game.cfg.waves.length - 1)) startNextWave();
  else if (Game.waveActive && Game.waveIndex < Game.cfg.waves.length - 1) sendWaveEarly();
});
document.getElementById("btn-pause").addEventListener("click", togglePause);
["1", "2", "3"].forEach(s => document.getElementById("spd" + s).addEventListener("click", () => setSpeed(+s)));
document.getElementById("btn-upgrade").addEventListener("click", upgradeSelected);
document.getElementById("btn-sell").addEventListener("click", sellSelected);

// keyboard shortcuts
window.addEventListener("keydown", (e) => {
  if (screen !== "game") return;
  if (e.key === " ") { e.preventDefault(); togglePause(); }
  else if (e.key === "1") setSpeed(1);
  else if (e.key === "2") setSpeed(2);
  else if (e.key === "3") setSpeed(3);
  else if (e.key === "Enter") document.getElementById("btn-startwave").click();
  else if (e.key === "Escape") { Game.selectedType = null; Game.selectedTower = null; hideSelCard(); buildTowerButtons(); }
});

// initial continue-button state
if (save.cleared === 0) document.getElementById("btn-continue").style.display = "none";

// go!
requestAnimationFrame(frame);
})();

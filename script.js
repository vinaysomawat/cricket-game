'use strict';

/* ============================================================
   Utility helpers
   ============================================================ */
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutQuad = (t) => t * (2 - t);
const easeInQuad = (t) => t * t;

// Picks a value from a list of {value, weight} pairs.
function weightedChoice(options) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of options) {
    if (r < o.weight) return o.value;
    r -= o.weight;
  }
  return options[options.length - 1].value;
}

const COMMENTARY = {
  six: ["That's massive!", 'Straight into the crowd!', 'Excellent timing!', 'Out of the park!'],
  four: ['What a shot!', 'Fantastic cover drive!', 'Clean hit! Races to the boundary!', 'Finds the gap perfectly!'],
  run: ['Good running!', 'Clean hit!', 'Nicely placed!', 'Quick single!'],
  dot: ['Solid defense.', 'Well bowled, no run.', 'Blocked back to the bowler.'],
  leave: ['Left alone, safe.', 'Shouldering arms.', 'Watchful leave.'],
  out: ['Bowled him!', 'Gone! What a delivery!', "That's the end of the innings!", 'Clean bowled!'],
};

/* ============================================================
   SoundManager — procedural WebAudio sound effects (no assets needed)
   ============================================================ */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this.enabled = false;
        return null;
      }
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _tone(freq, duration, type = 'sine', startGain = 0.25, delay = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(startGain, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  _noise(duration, startGain = 0.2, delay = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(startGain, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  whoosh() { this._tone(200, 0.12, 'sine', 0.08); }
  batHit() { this._tone(700, 0.12, 'square', 0.3); this._tone(1400, 0.08, 'triangle', 0.15, 0.01); }
  dotBlock() { this._tone(300, 0.1, 'sine', 0.15); }
  boundary() { this._tone(500, 0.2, 'sawtooth', 0.2); this._tone(750, 0.25, 'sine', 0.2, 0.05); this.crowdCheer(0.5); }
  six() {
    this._tone(500, 0.15, 'sawtooth', 0.25);
    this._tone(750, 0.15, 'sawtooth', 0.22, 0.08);
    this._tone(1000, 0.3, 'sawtooth', 0.2, 0.16);
    this.crowdCheer(0.8);
  }
  out() { this._tone(220, 0.35, 'sawtooth', 0.3); this._tone(160, 0.4, 'square', 0.25, 0.15); this.crowdCheer(0.3); }
  crowdCheer(gain = 0.5) { this._noise(1.1, gain * 0.3); }
}

/* ============================================================
   Particles + on-screen popups + commentary + camera shake
   ============================================================ */
class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.size = size; this.life = life; this.age = 0;
    this.gravity = 0.18;
  }
  update(dt) {
    this.age += dt;
    this.vy += this.gravity;
    this.x += (this.vx * dt) / 16;
    this.y += (this.vy * dt) / 16;
    return this.age < this.life;
  }
  draw(ctx) {
    const t = 1 - this.age / this.life;
    ctx.globalAlpha = clamp(t, 0, 1);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0, this.size * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class AnimationManager {
  constructor(popupLayerEl, commentaryEl) {
    this.popupLayer = popupLayerEl;
    this.commentaryEl = commentaryEl;
    this.particles = [];
    this._commentaryTimeout = null;
  }
  updateParticles(dt) {
    this.particles = this.particles.filter((p) => p.update(dt));
  }
  drawParticles(ctx) {
    for (const p of this.particles) p.draw(ctx);
  }
  burst(x, y, color, count = 26, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(opts.minSpeed || 2, opts.maxSpeed || 8);
      this.particles.push(
        new Particle(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - (opts.upBias || 3),
          color, rand(2, 5), rand(500, 1000)
        )
      );
    }
  }
  popup(text, x, y, cls) {
    const el = document.createElement('div');
    el.className = `popup-text ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.popupLayer.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }
  say(text) {
    clearTimeout(this._commentaryTimeout);
    this.commentaryEl.textContent = text;
    this.commentaryEl.classList.add('show');
    this._commentaryTimeout = setTimeout(() => this.commentaryEl.classList.remove('show'), 2200);
  }
  shake(container, duration = 400) {
    container.classList.remove('shake');
    void container.offsetWidth;
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), duration);
  }
}

/* ============================================================
   Confetti overlay — played on a new high score
   ============================================================ */
class ConfettiSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pieces = [];
    this.running = false;
  }
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  start(durationMs = 3000) {
    this.resize();
    this.canvas.style.display = 'block';
    this.running = true;
    this.pieces = Array.from({ length: 120 }, () => ({
      x: rand(0, this.canvas.width),
      y: rand(-this.canvas.height, 0),
      w: rand(6, 12), h: rand(8, 16),
      vy: rand(2, 5), vx: rand(-2, 2),
      rot: rand(0, Math.PI * 2), vr: rand(-0.2, 0.2),
      color: choice(['#ffb703', '#fb8500', '#3a86ff', '#ff006e', '#8ac926', '#ffffff']),
    }));
    const endAt = performance.now() + durationMs;
    const loop = () => {
      if (!this.running) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (const p of this.pieces) {
        p.y += p.vy; p.x += p.vx; p.rot += p.vr;
        if (p.y > this.canvas.height + 20) p.y = -20;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();
      }
      if (performance.now() < endAt) requestAnimationFrame(loop);
      else this.stop();
    };
    requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = 'none';
  }
}

/* ============================================================
   ScoreBoard
   ============================================================ */
class ScoreBoard {
  constructor(dom) {
    this.dom = dom;
    this.totalBalls = 12;
    this.reset();
  }
  reset() {
    this.runs = 0; this.wickets = 0; this.ballsBowled = 0;
    this.fours = 0; this.sixes = 0; this.dots = 0;
    this.highScore = Number(localStorage.getItem('cricketClashHighScore') || 0);
  }
  addBall(runs, isOut, isDot) {
    this.ballsBowled++;
    this.runs += runs;
    if (runs === 4) this.fours++;
    if (runs === 6) this.sixes++;
    if (isDot) this.dots++;
    if (isOut) this.wickets++;
  }
  get isMatchOver() { return this.wickets >= 1 || this.ballsBowled >= this.totalBalls; }
  get overs() {
    const completed = Math.floor(this.ballsBowled / 6);
    const rem = this.ballsBowled % 6;
    return `${completed}.${rem}`;
  }
  get ballsLeft() { return this.totalBalls - this.ballsBowled; }
  get crr() {
    if (this.ballsBowled === 0) return '0.00';
    const overs = this.ballsBowled / 6;
    return (this.runs / overs).toFixed(2);
  }
  get strikeRate() {
    if (this.ballsBowled === 0) return '0.0';
    return ((this.runs / this.ballsBowled) * 100).toFixed(1);
  }
  maybeUpdateHighScore() {
    const isNew = this.runs > this.highScore;
    if (isNew) {
      this.highScore = this.runs;
      localStorage.setItem('cricketClashHighScore', String(this.runs));
    }
    return isNew;
  }
  render() {
    this.dom.runs.textContent = this.runs;
    this.dom.wickets.textContent = this.wickets;
    this.dom.overs.textContent = this.overs;
    this.dom.ballsLeft.textContent = this.ballsLeft;
    this.dom.crr.textContent = this.crr;
    this.dom.highScore.textContent = this.highScore;
  }
}

/* ============================================================
   Bowler — generates randomized delivery parameters
   ============================================================ */
class Bowler {
  newDelivery() {
    const speedKmh = randInt(105, 150);
    const baseDuration = lerp(950, 620, (speedKmh - 105) / 45);
    return {
      runUpDuration: randInt(500, 850),
      travelDuration: Math.round(clamp(baseDuration + rand(-40, 40), 550, 1000)),
      line: rand(-0.35, 0.35),
      bounceFrac: rand(0.45, 0.7),
      speedKmh,
    };
  }
}

/* ============================================================
   Player — tracks the batsman's swing input
   ============================================================ */
class Player {
  constructor() {
    this.swingAt = null;
    this.hasSwungThisBall = false;
  }
  reset() {
    this.hasSwungThisBall = false;
    this.swingAt = null;
  }
  swing(now) {
    if (this.hasSwungThisBall) return false;
    this.hasSwungThisBall = true;
    this.swingAt = now;
    return true;
  }
}

/* ============================================================
   Game — main controller: state machine, rendering, input
   ============================================================ */
class Game {
  constructor() {
    this.canvas = document.getElementById('stadium');
    this.ctx = this.canvas.getContext('2d');
    this.confettiCanvas = document.getElementById('confetti-canvas');
    this.confetti = new ConfettiSystem(this.confettiCanvas);
    this.sound = new SoundManager();
    this.anim = new AnimationManager(document.getElementById('popup-layer'), document.getElementById('commentary'));

    this.scoreboard = new ScoreBoard({
      runs: document.getElementById('sb-runs'),
      wickets: document.getElementById('sb-wickets'),
      overs: document.getElementById('sb-overs'),
      ballsLeft: document.getElementById('sb-balls-left'),
      crr: document.getElementById('sb-crr'),
      highScore: document.getElementById('sb-high-score'),
    });

    this.bowler = new Bowler();
    this.player = new Player();

    this.screens = {
      start: document.getElementById('screen-start'),
      toss: document.getElementById('screen-toss'),
      game: document.getElementById('screen-game'),
      summary: document.getElementById('screen-summary'),
    };
    this.stadiumWrap = document.querySelector('.stadium-wrap');

    this.phase = 'idle'; // idle | runup | travel | result | gap
    this.phaseStart = 0;
    this.currentDelivery = null;
    this.hitResult = null;
    this.stumpsBroken = false;
    this.stumpsBrokenAt = 0;
    this._lastNow = 0;

    this._initCrowdAndClouds();
    this._bindEvents();
    this._resizeCanvas();

    document.getElementById('start-high-score').textContent = this.scoreboard.highScore;

    requestAnimationFrame(this.loop.bind(this));
  }

  /* ---------- setup ---------- */

  _initCrowdAndClouds() {
    this.crowd = Array.from({ length: 140 }, () => ({
      xf: Math.random(),
      yf: rand(0.12, 0.205),
      color: choice(['#ffefd5', '#ffd6a5', '#ffadad', '#a0c4ff', '#bdb2ff', '#caffbf', '#fdffb6']),
      size: rand(1.4, 3),
    }));
    this.clouds = Array.from({ length: 5 }, () => ({
      xf: Math.random(), yf: rand(0.02, 0.12), scale: rand(0.6, 1.4), speed: rand(2, 6),
    }));
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      this._resizeCanvas();
      this.confetti.resize();
    });

    document.getElementById('btn-play').addEventListener('click', () => {
      this.sound._ensure();
      this.goToToss();
    });
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.goToToss();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.attemptHit();
      }
    });
    this.stadiumWrap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.attemptHit();
    });
  }

  _resizeCanvas() {
    const rect = this.stadiumWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, rect.width * dpr);
    this.canvas.height = Math.max(1, rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = rect.width;
    this._h = rect.height;
  }

  showScreen(name) {
    Object.values(this.screens).forEach((s) => s.classList.remove('active'));
    this.screens[name].classList.add('active');
    if (name === 'game') this._resizeCanvas();
  }

  /* ---------- flow: start -> toss -> match -> summary ---------- */

  goToToss() {
    this.phase = 'idle';
    this.showScreen('toss');
    const coin = document.getElementById('coin');
    const resultEl = document.getElementById('toss-result');
    resultEl.textContent = '';
    coin.classList.remove('flipping');
    void coin.offsetWidth;
    coin.classList.add('flipping');
    setTimeout(() => {
      resultEl.textContent = "You won the toss — you're batting first!";
      setTimeout(() => this.startMatch(), 1300);
    }, 1650);
  }

  startMatch() {
    this.scoreboard.reset();
    this.scoreboard.render();
    this.showScreen('game');
    this.startNextDelivery();
  }

  startNextDelivery() {
    this.player.reset();
    this.hitResult = null;
    this.stumpsBroken = false;
    this.currentDelivery = this.bowler.newDelivery();
    this._setPhase('runup');
  }

  _setPhase(phase) {
    this.phase = phase;
    this.phaseStart = performance.now();
    this._resultApplied = false;
  }

  endMatch() {
    this.phase = 'idle';
    const isNewRecord = this.scoreboard.maybeUpdateHighScore();

    document.getElementById('summary-title').textContent =
      this.scoreboard.wickets >= 1 ? 'All Out!' : 'Innings Complete!';
    document.getElementById('summary-score').textContent =
      `${this.scoreboard.runs}/${this.scoreboard.wickets}`;
    document.getElementById('sum-sr').textContent = this.scoreboard.strikeRate;
    document.getElementById('sum-fours').textContent = this.scoreboard.fours;
    document.getElementById('sum-sixes').textContent = this.scoreboard.sixes;
    document.getElementById('sum-dots').textContent = this.scoreboard.dots;
    document.getElementById('sum-wickets').textContent = this.scoreboard.wickets;
    document.getElementById('sum-high').textContent = this.scoreboard.highScore;
    document.getElementById('start-high-score').textContent = this.scoreboard.highScore;

    const recordEl = document.getElementById('summary-new-record');
    recordEl.classList.toggle('show', isNewRecord);

    this.showScreen('summary');
    if (isNewRecord) this.confetti.start(3500);
  }

  /* ---------- input & shot resolution ---------- */

  attemptHit() {
    if (this.phase !== 'travel') return;
    const now = performance.now();
    if (!this.player.swing(now)) return;
    this.sound.whoosh();
    this.resolveShot(now);
  }

  resolveShot(now) {
    const d = this.currentDelivery;
    const travelElapsed = now - this.phaseStart;
    const idealHitTime = d.travelDuration * 0.86;
    const offset = travelElapsed - idealHitTime;
    const absOffset = Math.abs(offset);

    let category;
    if (absOffset <= 70) category = 'perfect';
    else if (absOffset <= 180) category = 'good';
    else if (absOffset <= 320) category = 'poor';
    else category = 'verypoor';

    let runs = 0;
    let isOut = false;
    if (category === 'perfect') {
      runs = weightedChoice([{ value: 6, weight: 55 }, { value: 4, weight: 45 }]);
    } else if (category === 'good') {
      runs = weightedChoice([{ value: 1, weight: 45 }, { value: 2, weight: 35 }, { value: 3, weight: 20 }]);
    } else if (category === 'poor') {
      runs = 0;
    } else {
      isOut = true;
    }

    this.hitResult = { category, runs, isOut, hitAt: now };
    this._setPhase('result');
  }

  autoLeave() {
    this.hitResult = { category: 'leave', runs: 0, isOut: false, hitAt: performance.now() };
    this._setPhase('result');
  }

  applyResult() {
    const r = this.hitResult;
    this.scoreboard.addBall(r.runs, r.isOut, !r.isOut && r.runs === 0);
    this.scoreboard.render();
    this.showResultFX(r);
  }

  resultAnimDurationFor(r) {
    if (!r) return 500;
    if (r.isOut) return 1000;
    switch (r.runs) {
      case 6: return 1400;
      case 4: return 950;
      case 0: return 500;
      default: return 750;
    }
  }

  showResultFX(r) {
    const contact = this.getPitchPoint(1, this.currentDelivery.line);
    const x = contact.x;
    const y = Math.max(30, contact.y - 60);

    if (r.isOut) {
      this.stumpsBroken = true;
      this.stumpsBrokenAt = performance.now();
      this.sound.out();
      this.anim.popup('OUT!', x, y, 'popup-out');
      this.anim.say(choice(COMMENTARY.out));
      this.anim.shake(this.stadiumWrap, 500);
      this.anim.burst(contact.x, contact.y, '#ef233c', 22, { maxSpeed: 6, upBias: 2 });
    } else if (r.category === 'leave') {
      this.anim.popup('Dot', x, y, 'popup-dot');
      this.anim.say(choice(COMMENTARY.leave));
    } else if (r.runs === 6) {
      this.sound.six();
      this.anim.popup('+6 SIX!', x, y, 'popup-six');
      this.anim.say(choice(COMMENTARY.six));
      this.anim.shake(this.stadiumWrap, 400);
      this.anim.burst(contact.x, contact.y, choice(['#ff006e', '#ffb703', '#3a86ff']), 40, { maxSpeed: 10, upBias: 6 });
    } else if (r.runs === 4) {
      this.sound.boundary();
      this.anim.popup('+4 FOUR!', x, y, 'popup-four');
      this.anim.say(choice(COMMENTARY.four));
      this.anim.burst(contact.x, contact.y, '#3a86ff', 26, { maxSpeed: 7, upBias: 3 });
    } else if (r.runs > 0) {
      this.sound.batHit();
      this.anim.popup(`+${r.runs}`, x, y, 'popup-run');
      this.anim.say(choice(COMMENTARY.run));
    } else {
      this.sound.dotBlock();
      this.anim.popup('Dot', x, y, 'popup-dot');
      this.anim.say(choice(COMMENTARY.dot));
    }
  }

  /* ---------- main loop ---------- */

  loop(now) {
    requestAnimationFrame(this.loop.bind(this));
    const dt = this._lastNow ? now - this._lastNow : 16;
    this._lastNow = now;

    if (this.screens.game.classList.contains('active')) {
      this.updateGameLogic(now);
      this.anim.updateParticles(dt);
      this.render(now);
    }
  }

  updateGameLogic(now) {
    const elapsed = now - this.phaseStart;
    switch (this.phase) {
      case 'runup':
        if (elapsed >= this.currentDelivery.runUpDuration) this._setPhase('travel');
        break;
      case 'travel':
        if (elapsed >= this.currentDelivery.travelDuration) this.autoLeave();
        break;
      case 'result':
        if (!this._resultApplied) {
          this._resultApplied = true;
          this.applyResult();
        }
        if (elapsed >= this.resultAnimDurationFor(this.hitResult)) {
          if (this.scoreboard.isMatchOver) this.endMatch();
          else this._setPhase('gap');
        }
        break;
      case 'gap':
        if (elapsed >= 450) this.startNextDelivery();
        break;
      default:
        break;
    }
  }

  /* ---------- pitch geometry (perspective helper) ---------- */

  getPitchPoint(t, xOffsetFrac = 0) {
    const w = this._w, h = this._h;
    const topY = h * 0.24, bottomY = h * 0.84;
    const topHalfWidth = w * 0.035, bottomHalfWidth = w * 0.12;
    const y = lerp(topY, bottomY, t);
    const halfWidth = lerp(topHalfWidth, bottomHalfWidth, t);
    const centerX = w / 2 + xOffsetFrac * halfWidth;
    const scale = lerp(0.55, 1.5, t);
    return { x: centerX, y, scale };
  }

  _creaseLine(ctx, t) {
    const L = this.getPitchPoint(t, -1), R = this.getPitchPoint(t, 1);
    ctx.beginPath();
    ctx.moveTo(L.x, L.y);
    ctx.lineTo(R.x, R.y);
    ctx.stroke();
  }

  /* ---------- rendering ---------- */

  render(now) {
    const ctx = this.ctx;
    const w = this._w, h = this._h;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    // sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.32);
    skyGrad.addColorStop(0, '#0b2545');
    skyGrad.addColorStop(1, '#4a7fb5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.32);

    // sun glow
    const sunX = w * 0.82, sunY = h * 0.06;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 60);
    sunGrad.addColorStop(0, 'rgba(255,244,200,0.9)');
    sunGrad.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(sunX, sunY, 60, 0, Math.PI * 2); ctx.fill();

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const c of this.clouds) {
      const cx = ((c.xf * w + now * 0.006 * c.speed) % (w + 120)) - 60;
      const cy = c.yf * h;
      this.drawCloud(ctx, cx, cy, 26 * c.scale);
    }

    // crowd
    for (const p of this.crowd) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.xf * w, p.yf * h, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, h * 0.205, w, h * 0.03);

    // ground
    const groundGrad = ctx.createLinearGradient(0, h * 0.22, 0, h);
    groundGrad.addColorStop(0, '#3a9d4f');
    groundGrad.addColorStop(1, '#1f6b34');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.22, w, h * 0.78);

    // boundary rope
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.58, w * 0.47, h * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // pitch
    const topL = this.getPitchPoint(0, -1), topR = this.getPitchPoint(0, 1);
    const botL = this.getPitchPoint(1, -1), botR = this.getPitchPoint(1, 1);
    const pitchGrad = ctx.createLinearGradient(0, topL.y, 0, botL.y);
    pitchGrad.addColorStop(0, '#d8c690');
    pitchGrad.addColorStop(1, '#c9a86a');
    ctx.fillStyle = pitchGrad;
    ctx.beginPath();
    ctx.moveTo(topL.x, topL.y);
    ctx.lineTo(topR.x, topR.y);
    ctx.lineTo(botR.x, botR.y);
    ctx.lineTo(botL.x, botL.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    this._creaseLine(ctx, 0.06);
    this._creaseLine(ctx, 0.92);

    // stumps
    this.drawStumps(ctx, 0.03, 0.4);
    this.drawStumps(ctx, 0.97, 1.05);

    this.drawBowler(ctx, now);
    this.drawBatsman(ctx, now);
    this.drawBall(ctx, now);

    this.anim.drawParticles(ctx);
  }

  drawCloud(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, y + r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x - r * 0.8, y + r * 0.3, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStumps(ctx, t, extraScale = 1) {
    const p = this.getPitchPoint(t, 0);
    const scale = p.scale * extraScale;
    const stumpH = 26 * scale, stumpW = 3 * scale, gap = 7 * scale;
    ctx.fillStyle = '#f1e2c0';
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(p.x + i * gap - stumpW / 2, p.y - stumpH, stumpW, stumpH);
    }
    const broken = this.stumpsBroken && t > 0.9;
    if (!broken) {
      ctx.fillRect(p.x - gap - stumpW / 2, p.y - stumpH - 3 * scale, gap * 2 + stumpW, 3 * scale);
    } else {
      const age = performance.now() - this.stumpsBrokenAt;
      const prog = clamp(age / 500, 0, 1);
      ctx.save();
      ctx.translate(p.x + prog * 20 * scale, p.y - stumpH - 3 * scale - prog * 30 * scale);
      ctx.rotate(prog * 4);
      ctx.fillRect(-8 * scale, -1.5 * scale, 16 * scale, 3 * scale);
      ctx.restore();
    }
  }

  drawBowler(ctx, now) {
    const d = this.currentDelivery;
    if (!d) return;
    let t;
    if (this.phase === 'runup') {
      const prog = clamp((now - this.phaseStart) / d.runUpDuration, 0, 1);
      t = lerp(-0.18, 0, easeInQuad(prog));
    } else {
      t = 0;
    }
    const p = this.getPitchPoint(t, 0);
    const scale = p.scale;
    const bob = this.phase === 'runup' ? Math.sin(now * 0.02) * 4 * scale : 0;

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 4, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    const legPhase = this.phase === 'runup' ? Math.sin(now * 0.02) : 0;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6 * (1 + legPhase * 0.4), 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6 * (1 - legPhase * 0.4), 14); ctx.stroke();

    ctx.fillStyle = '#1d6fa5';
    ctx.fillRect(-6, -20, 12, 20);

    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(0, -26, 6, 0, Math.PI * 2); ctx.fill();

    let armAngle = -0.3;
    if (this.phase === 'travel') {
      const releaseProg = clamp((now - this.phaseStart) / 150, 0, 1);
      armAngle = lerp(-2.2, 0.6, easeOutQuad(releaseProg));
    }
    ctx.strokeStyle = '#f2c9a0'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, -18);
    ctx.lineTo(4 + Math.cos(armAngle) * 12, -18 + Math.sin(armAngle) * 12);
    ctx.stroke();

    ctx.restore();
  }

  drawBatsman(ctx, now) {
    const p = this.getPitchPoint(1, 0.15);
    const scale = p.scale * 1.15;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 6, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-7, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(7, 10); ctx.stroke();

    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-7, -30, 14, 26);

    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(0, -36, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d6efd';
    ctx.beginPath(); ctx.arc(0, -38, 7.5, Math.PI, 0); ctx.fill();

    let swingAngle = -0.15;
    if (this.player.swingAt) {
      const age = now - this.player.swingAt;
      const prog = clamp(age / 300, 0, 1);
      swingAngle = Math.sin(prog * Math.PI) * -1.9 - 0.15;
    }
    ctx.save();
    ctx.translate(6, -14);
    ctx.rotate(swingAngle);
    ctx.fillStyle = '#c98a4b';
    ctx.fillRect(-2, 0, 4, 26);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-2.5, 24, 5, 6);
    ctx.restore();

    ctx.restore();
  }

  drawBall(ctx, now) {
    if (this.phase === 'travel') {
      const d = this.currentDelivery;
      const prog = clamp((now - this.phaseStart) / d.travelDuration, 0, 1);
      const p = this.getPitchPoint(prog, d.line);
      const bounceWindow = 0.12;
      const distToBounce = Math.abs(prog - d.bounceFrac);
      const hop = distToBounce < bounceWindow
        ? Math.sin((1 - distToBounce / bounceWindow) * Math.PI) * 10 * p.scale
        : 0;
      this._drawBallAt(ctx, p.x, p.y - hop, 4 * p.scale, p.scale);
    } else if (this.phase === 'result') {
      this.drawBallResult(ctx, now);
    }
  }

  _drawBallAt(ctx, x, y, radius, scale) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + radius * 1.4, radius * 1.3, radius * 0.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#c1121f';
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, radius * 0.25);
    ctx.beginPath(); ctx.arc(x, y, radius * 0.9, 0.3, 1.6); ctx.stroke();
  }

  drawBallResult(ctx, now) {
    const r = this.hitResult;
    if (!r) return;
    const age = now - r.hitAt;
    const dur = this.resultAnimDurationFor(r);
    const prog = clamp(age / dur, 0, 1);
    const contact = this.getPitchPoint(1, this.currentDelivery.line);
    const dir = this.currentDelivery.line >= 0 ? 1 : -1;

    if (r.isOut || r.runs === 0) {
      const x = contact.x + (r.isOut ? 10 : 0);
      const y = contact.y + prog * 6;
      this._drawBallAt(ctx, x, y, 4 * contact.scale, contact.scale);
      return;
    }

    if (r.runs === 6) {
      const x = lerp(contact.x, contact.x - dir * this._w * 0.35, prog);
      const y = lerp(contact.y, contact.y - this._h * 0.55, easeOutQuad(prog));
      const scale = lerp(contact.scale, contact.scale * 0.4, prog);
      this._drawBallAt(ctx, x, y, 4 * scale, scale);
    } else if (r.runs === 4) {
      const x = lerp(contact.x, contact.x + dir * this._w * 0.5, easeOutQuad(prog));
      const y = lerp(contact.y, contact.y - this._h * 0.05, prog);
      const scale = lerp(contact.scale, contact.scale * 0.7, prog);
      this._drawBallAt(ctx, x, y, 4 * scale, scale);
    } else {
      const dist = 0.08 * r.runs;
      const x = lerp(contact.x, contact.x + dir * this._w * dist, easeOutQuad(prog));
      const y = lerp(contact.y, contact.y - this._h * dist * 0.6, prog);
      this._drawBallAt(ctx, x, y, 4 * contact.scale, contact.scale);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});

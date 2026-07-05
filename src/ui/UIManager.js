import { CAMERA_LABELS } from '../cameras/CameraRig.js';
import { clamp } from '../utils.js';

// All DOM overlay concerns: screen transitions, scoreboard text, popups,
// commentary ticker, camera label, shot-timing meter, replay banner.
export class UIManager {
  constructor() {
    this.screens = {
      start: document.getElementById('screen-start'),
      toss: document.getElementById('screen-toss'),
      game: document.getElementById('screen-game'),
      summary: document.getElementById('screen-summary'),
    };
    this.el = {
      startHighScore: document.getElementById('start-high-score'),
      sbRuns: document.getElementById('sb-runs'),
      sbWickets: document.getElementById('sb-wickets'),
      sbOvers: document.getElementById('sb-overs'),
      sbBallsLeft: document.getElementById('sb-balls-left'),
      sbCrr: document.getElementById('sb-crr'),
      sbHighScore: document.getElementById('sb-high-score'),
      popupLayer: document.getElementById('popup-layer'),
      commentary: document.getElementById('commentary'),
      camLabel: document.getElementById('cam-label'),
      timingMeter: document.getElementById('timing-meter'),
      timingNeedle: document.getElementById('timing-needle'),
      replayBanner: document.getElementById('replay-banner'),
      tapHint: document.getElementById('tap-hint'),
      stadiumWrap: document.querySelector('.stadium-wrap'),
      coin: document.getElementById('coin'),
      tossResult: document.getElementById('toss-result'),
      loadingNote: document.getElementById('loading-note'),
      btnPlay: document.getElementById('btn-play'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      summaryTitle: document.getElementById('summary-title'),
      summaryScore: document.getElementById('summary-score'),
      sumSr: document.getElementById('sum-sr'),
      sumFours: document.getElementById('sum-fours'),
      sumSixes: document.getElementById('sum-sixes'),
      sumDots: document.getElementById('sum-dots'),
      sumWickets: document.getElementById('sum-wickets'),
      sumHigh: document.getElementById('sum-high'),
      summaryNewRecord: document.getElementById('summary-new-record'),
    };
    this._commentaryTimeout = null;
  }

  hideLoadingNote() {
    if (this.el.loadingNote) this.el.loadingNote.style.display = 'none';
  }

  showScreen(name) {
    Object.values(this.screens).forEach((s) => s.classList.remove('active'));
    this.screens[name].classList.add('active');
  }

  setStartHighScore(v) { this.el.startHighScore.textContent = v; }

  renderScoreboard(sb) {
    this.el.sbRuns.textContent = sb.runs;
    this.el.sbWickets.textContent = sb.wickets;
    this.el.sbOvers.textContent = sb.overs;
    this.el.sbBallsLeft.textContent = sb.ballsLeft;
    this.el.sbCrr.textContent = sb.crr;
    this.el.sbHighScore.textContent = sb.highScore;
  }

  playToss(onDone) {
    this.el.tossResult.textContent = '';
    this.el.coin.classList.remove('flipping');
    void this.el.coin.offsetWidth;
    this.el.coin.classList.add('flipping');
    setTimeout(() => {
      this.el.tossResult.textContent = "You won the toss — you're batting first!";
      setTimeout(onDone, 1300);
    }, 1650);
  }

  // Projects a 3D world point to CSS pixel coordinates within the stadium container.
  worldToScreen(vec3, camera) {
    const v = vec3.clone().project(camera);
    const rect = this.el.stadiumWrap.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * rect.width,
      y: (-v.y * 0.5 + 0.5) * rect.height,
    };
  }

  popup(text, x, y, cls) {
    const el = document.createElement('div');
    el.className = `popup-text ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.el.popupLayer.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }

  say(text) {
    clearTimeout(this._commentaryTimeout);
    this.el.commentary.textContent = text;
    this.el.commentary.classList.add('show');
    this._commentaryTimeout = setTimeout(() => this.el.commentary.classList.remove('show'), 2200);
  }

  setCamLabel(name) {
    const label = CAMERA_LABELS[name] || name.toUpperCase();
    this.el.camLabel.textContent = label;
    this.el.camLabel.classList.add('show');
    clearTimeout(this._camLabelTimeout);
    this._camLabelTimeout = setTimeout(() => this.el.camLabel.classList.remove('show'), 1600);
  }

  showReplayBanner(show) {
    this.el.replayBanner.classList.toggle('show', show);
  }

  showTimingMeter(show) {
    this.el.timingMeter.classList.toggle('show', show);
  }

  setTimingNeedle(percent) {
    this.el.timingNeedle.style.left = `${clamp(percent, 0, 100)}%`;
  }

  shakeStadium(duration = 400) {
    const el = this.el.stadiumWrap;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), duration);
  }

  fillSummary(sb, isNewRecord) {
    this.el.summaryTitle.textContent = sb.wickets >= 1 ? 'All Out!' : 'Innings Complete!';
    this.el.summaryScore.textContent = `${sb.runs}/${sb.wickets}`;
    this.el.sumSr.textContent = sb.strikeRate;
    this.el.sumFours.textContent = sb.fours;
    this.el.sumSixes.textContent = sb.sixes;
    this.el.sumDots.textContent = sb.dots;
    this.el.sumWickets.textContent = sb.wickets;
    this.el.sumHigh.textContent = sb.highScore;
    this.el.summaryNewRecord.classList.toggle('show', isNewRecord);
  }
}

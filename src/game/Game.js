import * as THREE from 'three';
import { Renderer3D } from '../engine/Renderer.js';
import { makeBallTexture } from '../engine/Textures.js';
import { Stadium } from '../stadium/Stadium.js';
import { Lighting } from '../stadium/Lighting.js';
import { Crowd } from '../stadium/Crowd.js';
import { BowlerModel } from '../players/BowlerModel.js';
import { BatsmanModel } from '../players/BatsmanModel.js';
import { CameraRig } from '../cameras/CameraRig.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { Confetti } from '../effects/Confetti.js';
import { ReplayManager } from '../replay/ReplayManager.js';
import { SoundManager } from '../audio/SoundManager.js';
import { UIManager } from '../ui/UIManager.js';
import { ScoreBoard } from './ScoreBoard.js';
import { DeliveryGenerator } from './DeliveryGenerator.js';
import { PlayerInput } from './PlayerInput.js';
import { COMMENTARY } from './Commentary.js';
import { BOWLER_Z, BATSMAN_Z } from './constants.js';
import { deliveryPosition, missContinuation, leavePosition, hitTrajectory } from '../physics/BallPhysics.js';
import { clamp, lerp, choice, weightedChoice, rand } from '../utils.js';

export class Game {
  constructor(container) {
    this.renderer3d = new Renderer3D(container);

    this.stadium = new Stadium();
    this.renderer3d.scene.add(this.stadium.group);

    this.lighting = new Lighting(this.renderer3d.scene, this.stadium.floodlightPositions, this.renderer3d);

    this.crowd = new Crowd();
    this.renderer3d.scene.add(this.crowd.group);

    this.bowlerModel = new BowlerModel();
    this.bowlerModel.root.position.set(0, 0, BOWLER_Z);
    this.renderer3d.scene.add(this.bowlerModel.root);

    this.batsmanModel = new BatsmanModel();
    this.batsmanModel.root.position.set(0, 0, BATSMAN_Z);
    this.batsmanModel.root.rotation.y = Math.PI;
    this.renderer3d.scene.add(this.batsmanModel.root);

    const ballGeo = new THREE.SphereGeometry(0.036, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ map: makeBallTexture(), roughness: 0.45 });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.visible = false;
    this.renderer3d.scene.add(this.ballMesh);
    this._ballWorldPos = new THREE.Vector3();

    this.cameraRig = new CameraRig(this.renderer3d);
    this.particles = new ParticleSystem(this.renderer3d.scene);
    this.confetti = new Confetti(document.getElementById('confetti-canvas'));
    this.ui = new UIManager();
    this.sound = new SoundManager();
    this.scoreboard = new ScoreBoard();
    this.deliveryGen = new DeliveryGenerator();
    this.playerInput = new PlayerInput();
    this.replay = new ReplayManager(this.cameraRig, this.stadium, this.ui);

    this.phase = 'idle'; // idle | runup | travel | result | replay | gap
    this.phaseStart = 0;
    this.currentDelivery = null;
    this.hitResult = null;
    this._lastNow = 0;
    this._camCutDone = false;

    this.ui.setStartHighScore(this.scoreboard.highScore);
    this.ui.hideLoadingNote();

    this._bindEvents();
    requestAnimationFrame(this.tick);
  }

  _bindEvents() {
    this.ui.el.btnPlay.addEventListener('click', () => this.goToToss());
    this.ui.el.btnPlayAgain.addEventListener('click', () => this.goToToss());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.attemptHit();
      }
    });
    this.ui.el.stadiumWrap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.attemptHit();
    });
  }

  /* ---------- flow ---------- */

  goToToss() {
    this.phase = 'idle';
    this.sound._ensure();
    this.lighting.cycle();
    this.ui.showScreen('toss');
    this.ui.playToss(() => this.startMatch());
  }

  startMatch() {
    this.scoreboard.reset();
    this.ui.renderScoreboard(this.scoreboard);
    this.ui.showScreen('game');
    this.startNextDelivery();
  }

  startNextDelivery() {
    this.playerInput.reset();
    this.hitResult = null;
    this._camCutDone = false;
    this.currentDelivery = this.deliveryGen.next();
    this.bowlerModel.setHoldingBall(true);
    this.cameraRig.cutTo('broadcast');
    this.ui.setCamLabel('broadcast');
    this._setPhase('runup');
    if (this.scoreboard.ballsBowled > 0 && this.scoreboard.ballsBowled % 6 === 0) {
      this.crowd.startWave();
    }
  }

  _setPhase(phase) {
    this.phase = phase;
    this.phaseStart = performance.now();
    this._resultApplied = false;
    this.ui.showTimingMeter(phase === 'travel');
  }

  endMatch() {
    this.phase = 'idle';
    const isNewRecord = this.scoreboard.maybeUpdateHighScore();
    this.ui.fillSummary(this.scoreboard, isNewRecord);
    this.ui.setStartHighScore(this.scoreboard.highScore);
    this.ui.showScreen('summary');
    if (isNewRecord) this.confetti.start(3500);
  }

  /* ---------- input & shot resolution ---------- */

  attemptHit() {
    if (this.phase !== 'travel') return;
    const now = performance.now();
    if (!this.playerInput.swing(now)) return;
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

    let runs = 0, isOut = false;
    if (category === 'perfect') runs = weightedChoice([{ value: 6, weight: 55 }, { value: 4, weight: 45 }]);
    else if (category === 'good') runs = weightedChoice([{ value: 1, weight: 45 }, { value: 2, weight: 35 }, { value: 3, weight: 20 }]);
    else if (category === 'poor') runs = 0;
    else isOut = true;

    const contact = deliveryPosition(d, 1);
    const shotAngle = clamp(-d.line * 0.6 + rand(-0.5, 0.5), -1.1, 1.1);

    this.hitResult = { category, runs, isOut, hitAt: now, contact, shotAngle };
    this._setPhase('result');
  }

  autoLeave(now) {
    this.hitResult = {
      category: 'leave', runs: 0, isOut: false, hitAt: now,
      contact: deliveryPosition(this.currentDelivery, 1), shotAngle: 0,
    };
    this._setPhase('result');
  }

  applyResult(now) {
    const r = this.hitResult;
    this.scoreboard.addBall(r.runs, r.isOut, !r.isOut && r.runs === 0);
    this.ui.renderScoreboard(this.scoreboard);
    this.showResultFX(now, r);
  }

  resultAnimDurationFor(r) {
    if (!r) return 500;
    if (r.isOut) return 650;
    switch (r.runs) {
      case 6: return 1600;
      case 4: return 1100;
      case 0: return 500;
      default: return 800;
    }
  }

  showResultFX(now, r) {
    const contact = r.contact;
    const popupPos = this.ui.worldToScreen(new THREE.Vector3(contact.x, contact.y + 1.3, contact.z), this.cameraRig.camera);

    if (r.isOut) {
      this.sound.out({ x: contact.x, y: 1, z: BATSMAN_Z });
      this.ui.popup('OUT!', popupPos.x, popupPos.y, 'popup-out');
      this.ui.say(choice(COMMENTARY.out));
      this.ui.shakeStadium(500);
      this.cameraRig.shake(0.4, 500);
      this.particles.burst({ x: contact.x, y: 0.4, z: BATSMAN_Z }, '#ef233c', 30, { maxSpeed: 5, upBoost: 3 });
      this.batsmanModel.triggerSwing('miss', now);
      this.batsmanModel.celebrate(now + 50, 'out');
      this.crowd.silence();
      this.cameraRig.cutTo('stumpcam');
      this.ui.setCamLabel('stumpcam');
    } else if (r.category === 'leave') {
      this.ui.popup('Dot', popupPos.x, popupPos.y, 'popup-dot');
      this.ui.say(choice(COMMENTARY.leave));
    } else if (r.runs === 6) {
      this.sound.six({ x: contact.x, y: 1, z: contact.z });
      this.ui.popup('+6 SIX!', popupPos.x, popupPos.y, 'popup-six');
      this.ui.say(choice(COMMENTARY.six));
      this.ui.shakeStadium(400);
      this.cameraRig.shake(0.3, 400);
      this.particles.burst({ x: contact.x, y: 1, z: contact.z }, choice(['#ff006e', '#ffb703', '#3a86ff']), 50, { maxSpeed: 9, upBoost: 6, maxLife: 1.3 });
      this.batsmanModel.triggerSwing('loft', now);
      this.batsmanModel.celebrate(now + 400, 'six');
      this.crowd.cheer();
      this.crowd.startWave();
      this.cameraRig.followBall(() => this._ballWorldPos);
      this.ui.setCamLabel('follow');
    } else if (r.runs === 4) {
      this.sound.boundary({ x: contact.x, y: 1, z: contact.z });
      this.ui.popup('+4 FOUR!', popupPos.x, popupPos.y, 'popup-four');
      this.ui.say(choice(COMMENTARY.four));
      this.particles.burst({ x: contact.x, y: 0.6, z: contact.z }, '#3a86ff', 30, { maxSpeed: 6 });
      this.batsmanModel.triggerSwing('drive', now);
      this.batsmanModel.celebrate(now + 250, 'four');
      this.crowd.cheer();
      this.cameraRig.followBall(() => this._ballWorldPos);
      this.ui.setCamLabel('follow');
    } else if (r.runs > 0) {
      this.sound.batHit({ x: contact.x, y: 1, z: contact.z });
      this.ui.popup(`+${r.runs}`, popupPos.x, popupPos.y, 'popup-run');
      this.ui.say(choice(COMMENTARY.run));
      this.batsmanModel.triggerSwing('drive', now);
    } else {
      this.sound.dotBlock({ x: contact.x, y: 1, z: contact.z });
      this.ui.popup('Dot', popupPos.x, popupPos.y, 'popup-dot');
      this.ui.say(choice(COMMENTARY.dot));
      this.batsmanModel.triggerSwing('defend', now);
    }
  }

  _buildReplayEvent(r) {
    const d = this.currentDelivery;
    if (r.isOut) {
      return {
        kind: 'out',
        durationMs: 900,
        cameraAngles: ['stumpcam', 'crowd'],
        getPositionAt: (p) => (p < 0.5 ? deliveryPosition(d, lerp(0.75, 1, p / 0.5)) : missContinuation(d, (p - 0.5) / 0.5)),
        onBallUpdate: (pos) => this._setBallPos(pos),
      };
    }
    const kind = r.runs === 6 ? 'six' : 'four';
    return {
      kind,
      durationMs: this.resultAnimDurationFor(r),
      cameraAngles: kind === 'six' ? ['boundary', 'drone'] : ['boundary', 'crowd'],
      getPositionAt: (p) => hitTrajectory(r.runs, r.contact, r.shotAngle, p),
      onBallUpdate: (pos) => this._setBallPos(pos),
    };
  }

  afterResult() {
    const r = this.hitResult;
    const needsReplay = r.isOut || r.runs === 4 || r.runs === 6;
    if (needsReplay) {
      this._setPhase('replay');
      this.replay.start(this._buildReplayEvent(r), () => {
        if (this.scoreboard.isMatchOver) this.endMatch();
        else this._setPhase('gap');
      });
    } else if (this.scoreboard.isMatchOver) {
      this.endMatch();
    } else {
      this._setPhase('gap');
    }
  }

  /* ---------- per-frame update ---------- */

  _setBallPos(pos) {
    this._ballWorldPos.set(pos.x, pos.y, pos.z);
    this.ballMesh.position.copy(this._ballWorldPos);
  }

  updateBallPosition(now) {
    const d = this.currentDelivery;
    if (!d || this.phase === 'idle' || this.phase === 'runup') {
      this.ballMesh.visible = false;
      return;
    }
    if (this.phase === 'replay') return; // driven by ReplayManager callback

    const elapsed = now - this.phaseStart;
    this.ballMesh.visible = true;
    if (this.phase === 'travel') {
      this._setBallPos(deliveryPosition(d, clamp(elapsed / d.travelDuration, 0, 1)));
    } else if (this.phase === 'result') {
      const r = this.hitResult;
      const p = clamp(elapsed / this.resultAnimDurationFor(r), 0, 1);
      if (r.isOut) this._setBallPos(missContinuation(d, p));
      else if (r.category === 'leave') this._setBallPos(leavePosition(d, p));
      else this._setBallPos(hitTrajectory(r.runs, r.contact, r.shotAngle, p));
    } else {
      this.ballMesh.visible = false;
    }
  }

  updateGameLogic(now) {
    const elapsed = now - this.phaseStart;
    switch (this.phase) {
      case 'runup': {
        const d = this.currentDelivery;
        if (elapsed > d.runUpDuration * 0.55 && !this._camCutDone) {
          this._camCutDone = true;
          this.cameraRig.cutTo('batsman');
          this.ui.setCamLabel('batsman');
        }
        if (elapsed >= d.runUpDuration) this._setPhase('travel');
        break;
      }
      case 'travel': {
        const d = this.currentDelivery;
        const idealHitTime = d.travelDuration * 0.86;
        const pct = ((elapsed - idealHitTime + 400) / 800) * 100;
        this.ui.setTimingNeedle(pct);
        if (elapsed >= d.travelDuration) this.autoLeave(now);
        break;
      }
      case 'result': {
        if (!this._resultApplied) {
          this._resultApplied = true;
          this.applyResult(now);
        }
        if (elapsed >= this.resultAnimDurationFor(this.hitResult)) {
          this.afterResult();
        }
        break;
      }
      case 'replay':
        break; // ReplayManager drives everything until it calls onDone
      case 'gap':
        if (elapsed >= 500) this.startNextDelivery();
        break;
      default:
        break;
    }
  }

  tick = (now) => {
    requestAnimationFrame(this.tick);
    const dt = this._lastNow ? (now - this._lastNow) / 1000 : 0.016;
    this._lastNow = now;
    const t = now / 1000;

    if (!this.ui.screens.game.classList.contains('active')) return;

    this.updateGameLogic(now);

    this.stadium.update(t, dt);
    this.crowd.update(t, dt);
    this.particles.update(dt);

    const bowlerPhase = this.phase === 'runup' ? 'runup' : this.phase === 'travel' ? 'travel' : 'idle';
    const bowlerProgress = this.currentDelivery
      ? this.phase === 'travel'
        ? (now - this.phaseStart) / this.currentDelivery.travelDuration
        : this.phase === 'runup'
          ? (now - this.phaseStart) / this.currentDelivery.runUpDuration
          : 0
      : 0;
    this.bowlerModel.animate(bowlerPhase, bowlerProgress, t);
    this.batsmanModel.animate(now, t);

    this.updateBallPosition(now);
    this.cameraRig.update(now);
    this.renderer3d.render();
  };
}

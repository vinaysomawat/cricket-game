import * as THREE from 'three';
import { buildFigure } from './FigureFactory.js';

export class BowlerModel {
  constructor() {
    const fig = buildFigure({ jersey: 0x1d6fa5, trim: 0x0b3d61, skin: 0xdba876 });
    this.fig = fig;
    this.root = fig.root;

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x123, roughness: 0.6 })
    );
    cap.position.copy(fig.head.position);
    cap.position.y += 0.03;
    fig.hips.add(cap);

    // ball held in the bowling (right) hand
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xb5121b, roughness: 0.45 })
    );
    fig.rightArm.hand.add(this.ball);

    this._runPhase = 0;
  }

  setHoldingBall(v) {
    this.ball.visible = v;
  }

  // phase: 'runup' | 'travel' | other ; progress: 0..1 within phase
  animate(phase, progress, t) {
    const { leftArm, rightArm, leftLeg, rightLeg, hips, root } = this.fig;

    if (phase === 'runup') {
      const speed = 14;
      this._runPhase += 0.016 * speed;
      const swing = Math.sin(this._runPhase);
      leftLeg.hip.rotation.x = swing * 0.6;
      rightLeg.hip.rotation.x = -swing * 0.6;
      leftLeg.knee.rotation.x = Math.max(0, -swing) * 0.9;
      rightLeg.knee.rotation.x = Math.max(0, swing) * 0.9;
      leftArm.shoulder.rotation.x = -swing * 0.7;
      rightArm.shoulder.rotation.x = swing * 0.5 - 0.4;
      rightArm.elbow.rotation.x = -0.6;
      hips.position.y = 0.9 + Math.abs(swing) * 0.02;
      root.rotation.y = 0;
      this.setHoldingBall(true);
    } else if (phase === 'travel') {
      // bowling release action over the first ~180ms of travel
      const p = Math.min(1, progress / 0.2);
      rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-2.3, 0.9, easeOutBack(p));
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.2, -1.1, p);
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(0.6, -0.5, p);
      leftLeg.hip.rotation.x = THREE.MathUtils.lerp(0.5, -0.2, p);
      rightLeg.hip.rotation.x = THREE.MathUtils.lerp(-0.5, 0.15, p);
      leftLeg.knee.rotation.x = 0;
      rightLeg.knee.rotation.x = 0;
      hips.position.y = 0.9;
      this.setHoldingBall(p < 0.18);
    } else {
      // idle follow-through / breathing
      const breathe = Math.sin(t * 1.5) * 0.02;
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, 0, 0.1);
      rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(rightArm.shoulder.rotation.x, 0.15, 0.1);
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(rightArm.elbow.rotation.x, 0, 0.1);
      leftLeg.hip.rotation.x = THREE.MathUtils.lerp(leftLeg.hip.rotation.x, 0, 0.1);
      rightLeg.hip.rotation.x = THREE.MathUtils.lerp(rightLeg.hip.rotation.x, 0, 0.1);
      hips.position.y = 0.9 + breathe;
      this.setHoldingBall(false);
    }
  }
}

function easeOutBack(p) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

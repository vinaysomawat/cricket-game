import * as THREE from 'three';
import { buildFigure } from './FigureFactory.js';
import { makeWoodTexture } from '../engine/Textures.js';

export class BatsmanModel {
  constructor() {
    const fig = buildFigure({ jersey: 0xf1f1f1, trim: 0xe9e2d0, skin: 0xe0ac7a });
    this.fig = fig;
    this.root = fig.root;

    // helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x0d6efd, roughness: 0.4 })
    );
    helmet.position.copy(fig.head.position);
    helmet.position.y += 0.01;
    fig.hips.add(helmet);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 })
    );
    visor.position.set(0, -0.02, 0.13);
    helmet.add(visor);

    // gloves
    [fig.leftArm.hand, fig.rightArm.hand].forEach((hand) => {
      const glove = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 })
      );
      hand.add(glove);
    });

    // bat, held in the right hand with a pivot near the top of the handle
    this.batPivot = new THREE.Group();
    fig.rightArm.hand.add(this.batPivot);
    this.batPivot.rotation.x = -0.25;
    this.batPivot.rotation.z = 0.15;

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.02, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 })
    );
    handle.position.y = -0.08;
    this.batPivot.add(handle);

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.42, 0.03),
      new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.5 })
    );
    blade.position.y = -0.37;
    blade.castShadow = true;
    this.batPivot.add(blade);

    this._swing = null; // {type, start, duration}
  }

  triggerSwing(type, atMs) {
    this._swing = { type, start: atMs, duration: type === 'loft' ? 420 : type === 'defend' ? 260 : 340 };
  }

  celebrate(nowMs, kind) {
    this._celebrateStart = nowMs;
    this._celebrateKind = kind; // 'four' | 'six' | 'out'
  }

  animate(nowMs, t) {
    const { leftArm, rightArm, leftLeg, hips, torso } = this.fig;

    if (this._celebrateKind === 'out') {
      const age = nowMs - this._celebrateStart;
      const p = Math.min(1, age / 600);
      torso.rotation.x = THREE.MathUtils.lerp(0, 0.5, p);
      hips.position.y = THREE.MathUtils.lerp(0.9, 0.75, p);
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(0, -0.3, p);
      rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(0, -0.3, p);
      return;
    }
    if (this._celebrateKind === 'four' || this._celebrateKind === 'six') {
      const age = nowMs - this._celebrateStart;
      const p = Math.min(1, age / 700);
      const raise = Math.sin(p * Math.PI) ;
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(0, -2.6, raise);
      rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(0, -2.6, raise);
      torso.rotation.x = -raise * 0.15;
      if (age > 700) { this._celebrateKind = null; }
      return;
    }

    if (this._swing) {
      const age = nowMs - this._swing.start;
      const p = THREE.MathUtils.clamp(age / this._swing.duration, 0, 1);
      const curve = Math.sin(p * Math.PI);
      if (this._swing.type === 'loft') {
        this.batPivot.rotation.x = THREE.MathUtils.lerp(-0.25, -3.1, curve);
        torso.rotation.x = -curve * 0.35;
        rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-0.1, -2.4, curve);
        leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(0.1, -1.8, curve);
      } else if (this._swing.type === 'defend') {
        this.batPivot.rotation.x = THREE.MathUtils.lerp(-0.25, -0.7, curve);
        torso.rotation.x = curve * 0.08;
        rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-0.1, -0.5, curve);
      } else if (this._swing.type === 'miss') {
        this.batPivot.rotation.x = THREE.MathUtils.lerp(-0.25, -2.6, curve);
        torso.rotation.y = curve * 0.5;
        rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-0.1, -2.0, curve);
      } else {
        // drive
        this.batPivot.rotation.x = THREE.MathUtils.lerp(-0.25, -2.0, curve);
        torso.rotation.x = -curve * 0.2;
        rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(-0.1, -1.7, curve);
        leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(0.1, -1.2, curve);
      }
      if (p >= 1) this._swing = null;
      return;
    }

    // idle batting stance: gentle weight shift + breathing
    const sway = Math.sin(t * 1.1) * 0.03;
    hips.rotation.z = sway * 0.3;
    torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0.08, 0.08);
    leftLeg.hip.rotation.x = THREE.MathUtils.lerp(leftLeg.hip.rotation.x, 0, 0.1);
    this.batPivot.rotation.x = THREE.MathUtils.lerp(this.batPivot.rotation.x, -0.25 + sway * 0.2, 0.08);
    rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(rightArm.shoulder.rotation.x, -0.1, 0.08);
    leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, 0.1, 0.08);
  }
}

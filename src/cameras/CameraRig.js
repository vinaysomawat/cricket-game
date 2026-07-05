import * as THREE from 'three';
import { BOWLER_Z, BATSMAN_Z, BOUNDARY_RADIUS } from '../game/constants.js';
import { clamp, easeInOutQuad, rand } from '../utils.js';

function poses(ballPos) {
  return {
    bowler: { pos: [0, 1.9, BOWLER_Z - 3.2], look: [0, 1.1, BATSMAN_Z * 0.5] },
    batsman: { pos: [0.6, 2.2, BATSMAN_Z + 9], look: [0, 1.2, BOWLER_Z] },
    broadcast: { pos: [46, 17, 8], look: [0, 1, 0] },
    boundary: { pos: [BOUNDARY_RADIUS - 6, 3.2, BATSMAN_Z * 0.55], look: [0, 1, BATSMAN_Z * 0.25] },
    drone: { pos: [0.1, 52, 0.1], look: [0, 0, 0] },
    crowd: { pos: [12, 9.5, BOUNDARY_RADIUS + 9], look: [0, 1.4, 0] },
    stumpcam: { pos: [2.2, 0.6, BATSMAN_Z + 1.4], look: [0, 0.4, BATSMAN_Z] },
    follow: ballPos
      ? { pos: [ballPos.x - 7, ballPos.y + 4.5, ballPos.z + 9], look: [ballPos.x, ballPos.y, ballPos.z] }
      : { pos: [0, 4, 0], look: [0, 0, 0] },
  };
}

export const CAMERA_LABELS = {
  bowler: 'BOWLER CAM', batsman: 'BATSMAN CAM', broadcast: 'BROADCAST CAM',
  boundary: 'BOUNDARY CAM', drone: 'DRONE CAM', crowd: 'CROWD CAM',
  stumpcam: 'STUMP CAM', follow: 'FOLLOW CAM',
};

// Owns the single active perspective camera and moves it between named
// broadcast-style poses — either an instant cut (cutTo) or an eased fly
// (flyTo), plus a dynamic follow mode that tracks the ball in flight.
export class CameraRig {
  constructor(renderer3d) {
    this.renderer3d = renderer3d;
    this.camera = renderer3d.camera;

    this.basePos = new THREE.Vector3();
    this.baseLook = new THREE.Vector3();
    this._transition = null;
    this._followFn = null;
    this._shakeUntil = 0;
    this._shakeIntensity = 0;

    this.cutTo('broadcast');
  }

  cutTo(name) {
    const p = poses()[name];
    if (!p) return;
    this.current = name;
    this._transition = null;
    this._followFn = null;
    this.basePos.set(...p.pos);
    this.baseLook.set(...p.look);
  }

  flyTo(name, duration = 900, ballPos = null) {
    const target = poses(ballPos)[name];
    if (!target) return;
    this._transition = {
      fromPos: this.basePos.clone(),
      fromLook: this.baseLook.clone(),
      toPos: new THREE.Vector3(...target.pos),
      toLook: new THREE.Vector3(...target.look),
      start: performance.now(),
      duration,
    };
    this._followFn = null;
    this.current = name;
  }

  followBall(getBallPos) {
    this.current = 'follow';
    this._transition = null;
    this._followFn = getBallPos;
  }

  shake(intensity = 0.2, duration = 350) {
    this._shakeIntensity = intensity;
    this._shakeUntil = performance.now() + duration;
  }

  update(now) {
    if (this._followFn) {
      const b = this._followFn();
      const p = poses(b).follow;
      this.basePos.lerp(new THREE.Vector3(...p.pos), 0.09);
      this.baseLook.lerp(new THREE.Vector3(...p.look), 0.16);
    } else if (this._transition) {
      const t = clamp((now - this._transition.start) / this._transition.duration, 0, 1);
      const e = easeInOutQuad(t);
      this.basePos.lerpVectors(this._transition.fromPos, this._transition.toPos, e);
      this.baseLook.lerpVectors(this._transition.fromLook, this._transition.toLook, e);
      if (t >= 1) this._transition = null;
    }

    let px = this.basePos.x, py = this.basePos.y, pz = this.basePos.z;
    if (now < this._shakeUntil) {
      const falloff = (this._shakeUntil - now) / 350;
      px += rand(-1, 1) * this._shakeIntensity * falloff;
      py += rand(-1, 1) * this._shakeIntensity * falloff;
    }
    this.camera.position.set(px, py, pz);
    this.camera.lookAt(this.baseLook);
  }
}

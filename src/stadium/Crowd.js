import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BOUNDARY_RADIUS } from '../game/constants.js';

const CLOTHING_COLORS = [
  0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93,
  0xffffff, 0xf3722c, 0x577590, 0xf94144, 0x90be6d,
];

function personGeometry() {
  const body = new THREE.CylinderGeometry(0.16, 0.2, 0.5, 6);
  body.translate(0, 0.25, 0);
  const head = new THREE.SphereGeometry(0.13, 8, 6);
  head.translate(0, 0.58, 0);
  return mergeGeometries([body, head]);
}

// Instanced low-poly spectators filling the stand tiers. Cheap enough to
// animate every frame (idle bob + wave + cheer/silence energy pulses).
export class Crowd {
  constructor() {
    this.group = new THREE.Group();

    const geo = personGeometry();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 });

    const tiers = 3;
    const perTier = 420;
    const count = tiers * perTier;

    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    this._base = new Float32Array(count * 3); // x,y,z
    this._angle = new Float32Array(count);
    this._phase = new Float32Array(count);
    this._scale = new Float32Array(count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let i = 0;
    for (let t = 0; t < tiers; t++) {
      const radius = BOUNDARY_RADIUS + 6 + t * 6;
      const y = 2.6 + t * 3.2;
      for (let n = 0; n < perTier; n++) {
        const angle = (n / perTier) * Math.PI * 2 + Math.random() * 0.02;
        const r = radius + (Math.random() - 0.5) * 2.2;
        const x = Math.sin(angle) * r;
        const z = Math.cos(angle) * r;
        const scale = 0.85 + Math.random() * 0.4;

        this._base[i * 3] = x;
        this._base[i * 3 + 1] = y;
        this._base[i * 3 + 2] = z;
        this._angle[i] = angle;
        this._phase[i] = Math.random() * Math.PI * 2;
        this._scale[i] = scale;

        dummy.position.set(x, y, z);
        dummy.lookAt(0, y, 0);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        this.mesh.setMatrixAt(i, dummy.matrix);
        color.setHex(CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)]);
        this.mesh.setColorAt(i, color);
        i++;
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.group.add(this.mesh);

    this.count = count;
    this._energy = 1;
    this._targetEnergy = 1;
    this._waveActive = false;
    this._waveT = 0;
    this._dummy = dummy;
  }

  cheer() {
    this._targetEnergy = 3.2;
    clearTimeout(this._cheerTimeout);
    this._cheerTimeout = setTimeout(() => { this._targetEnergy = 1; }, 1400);
  }

  silence() {
    this._targetEnergy = 0.12;
    clearTimeout(this._cheerTimeout);
    this._cheerTimeout = setTimeout(() => { this._targetEnergy = 1; }, 1800);
  }

  startWave() {
    this._waveActive = true;
    this._waveT = 0;
  }

  update(t, dt) {
    this._energy += (this._targetEnergy - this._energy) * Math.min(1, dt * 3);

    if (this._waveActive) {
      this._waveT += dt * 1.6;
      if (this._waveT > Math.PI * 2 + 1) this._waveActive = false;
    }

    const dummy = this._dummy;
    for (let i = 0; i < this.count; i++) {
      const x = this._base[i * 3];
      const y = this._base[i * 3 + 1];
      const z = this._base[i * 3 + 2];
      const bob = Math.sin(t * 2.2 + this._phase[i]) * 0.05 * this._energy;

      let waveLift = 0;
      if (this._waveActive) {
        const angle = this._angle[i];
        const d = Math.abs(((angle / (Math.PI * 2)) - (this._waveT / (Math.PI * 2))) % 1);
        waveLift = Math.max(0, 1 - d * 6) * 0.8;
      }

      dummy.position.set(x, y + bob + waveLift, z);
      dummy.lookAt(0, y, 0);
      dummy.scale.setScalar(this._scale[i] * (1 + waveLift * 0.15));
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

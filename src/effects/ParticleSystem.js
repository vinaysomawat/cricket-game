import * as THREE from 'three';
import { rand, clamp } from '../utils.js';

const MAX_PARTICLES = 700;

// A single pooled THREE.Points cloud for every particle burst in the game
// (bat impact dust/sparks, six fireworks, out dust). Particles are never
// created or destroyed after startup — inactive slots are just invisible
// (size/alpha 0), which keeps this allocation-free during gameplay.
export class ParticleSystem {
  constructor(scene) {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.alphas = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (260.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float edge = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vColor, vAlpha * edge);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;

    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({ active: false }));
  }

  burst(position, color, count = 24, opts = {}) {
    const colorObj = new THREE.Color(color);
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.x = position.x; p.y = position.y; p.z = position.z;
      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.5;
      const speed = rand(opts.minSpeed ?? 1.5, opts.maxSpeed ?? 5);
      p.vx = Math.cos(angle) * Math.cos(upAngle) * speed;
      p.vz = Math.sin(angle) * Math.cos(upAngle) * speed;
      p.vy = Math.sin(upAngle) * speed + (opts.upBoost ?? 2);
      p.life = 0;
      p.maxLife = rand(opts.minLife ?? 0.5, opts.maxLife ?? 1.1);
      p.color = colorObj;
      p.size = rand(opts.minSize ?? 0.08, opts.maxSize ?? 0.22);
      p.gravity = opts.gravity ?? 6;
      spawned++;
    }
  }

  update(dt) {
    const pos = this.positions, col = this.colors, size = this.sizes, alpha = this.alphas;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) { alpha[i] = 0; size[i] = 0; continue; }
      p.life += dt;
      if (p.life >= p.maxLife) { p.active = false; alpha[i] = 0; size[i] = 0; continue; }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.8; p.vz *= 0.8; }

      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 3] = p.color.r; col[i * 3 + 1] = p.color.g; col[i * 3 + 2] = p.color.b;
      size[i] = p.size;
      alpha[i] = clamp(1 - p.life / p.maxLife, 0, 1);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
  }
}

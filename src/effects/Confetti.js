import { rand, choice } from '../utils.js';

// DOM-overlay confetti (2D canvas) played once, on a new high score at
// match end — kept separate from the in-scene 3D particle system since it
// draws over the whole page rather than inside the stadium.
export class Confetti {
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
  start(durationMs = 3200) {
    this.resize();
    this.canvas.style.display = 'block';
    this.running = true;
    this.pieces = Array.from({ length: 130 }, () => ({
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

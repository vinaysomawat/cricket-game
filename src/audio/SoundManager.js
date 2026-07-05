// Procedural WebAudio sound effects — no audio files to fetch or license.
// Each sound is routed through a PannerNode positioned in world space, so
// bat impact / crowd cheer effects are simple 3D-spatialized audio relative
// to the listener (kept at the origin, near the pitch).
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return null; }
      this.ctx = new AC();
      this.ctx.listener.setPosition?.(0, 1.5, 0);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _panner(position) {
    const ctx = this._ensure();
    if (!ctx) return null;
    const panner = ctx.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = 8;
    if (position) {
      if (panner.positionX) {
        panner.positionX.value = position.x;
        panner.positionY.value = position.y;
        panner.positionZ.value = position.z;
      } else {
        panner.setPosition(position.x, position.y, position.z);
      }
    }
    panner.connect(ctx.destination);
    return panner;
  }

  _tone(freq, duration, type = 'sine', startGain = 0.25, delay = 0, position = null) {
    const ctx = this._ensure();
    if (!ctx) return;
    const out = this._panner(position) || ctx.destination;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(startGain, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  _noise(duration, startGain = 0.2, delay = 0, position = null) {
    const ctx = this._ensure();
    if (!ctx) return;
    const out = this._panner(position) || ctx.destination;
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
    src.connect(filter).connect(gain).connect(out);
    src.start(t0);
  }

  whoosh() { this._tone(200, 0.12, 'sine', 0.08); }
  batHit(pos) { this._tone(700, 0.12, 'square', 0.3, 0, pos); this._tone(1400, 0.08, 'triangle', 0.15, 0.01, pos); }
  dotBlock(pos) { this._tone(300, 0.1, 'sine', 0.15, 0, pos); }
  boundary(pos) {
    this._tone(500, 0.2, 'sawtooth', 0.2, 0, pos);
    this._tone(750, 0.25, 'sine', 0.2, 0.05, pos);
    this.crowdCheer(0.5);
  }
  six(pos) {
    this._tone(500, 0.15, 'sawtooth', 0.25, 0, pos);
    this._tone(750, 0.15, 'sawtooth', 0.22, 0.08, pos);
    this._tone(1000, 0.3, 'sawtooth', 0.2, 0.16, pos);
    this.crowdCheer(0.85);
  }
  out(pos) {
    this._tone(220, 0.35, 'sawtooth', 0.3, 0, pos);
    this._tone(160, 0.4, 'square', 0.25, 0.15, pos);
    this.crowdCheer(0.3);
  }
  crowdCheer(gain = 0.5) { this._noise(1.1, gain * 0.3, 0, { x: 0, y: 8, z: 40 }); }
  appeal() { this._tone(440, 0.25, 'sawtooth', 0.15, 0, { x: 0, y: 1, z: 10 }); }
}

// Instant-replay controller for boundaries and wickets.
//
// The ball's flight is a deterministic function of progress (see
// physics/BallPhysics.js), so "recording" a replay just means re-evaluating
// that same function on a slower clock from a different camera angle —
// there's no need to buffer per-frame transforms to get an accurate replay.
export class ReplayManager {
  constructor(cameraRig, stadium, ui) {
    this.cameraRig = cameraRig;
    this.stadium = stadium;
    this.ui = ui;
    this.active = false;
    this._rafId = null;
  }

  start(replayEvent, onDone) {
    this.active = true;
    this.ui.showReplayBanner(true);
    this.stadium.updateReplayScreenText(
      replayEvent.kind === 'out' ? 'OUT!' : replayEvent.kind === 'six' ? 'SIX!' : 'FOUR!',
      replayEvent.kind === 'out' ? '#ef233c' : '#ffb703'
    );

    const angles = replayEvent.cameraAngles;
    const replaySpeed = 0.32;
    const segmentDuration = replayEvent.durationMs / replaySpeed;
    let switched = false;

    this.cameraRig.flyTo(angles[0], 450, replayEvent.getPositionAt(0));
    const startTime = performance.now();

    const step = (now) => {
      const p = Math.min(1, (now - startTime) / segmentDuration);
      const pos = replayEvent.getPositionAt(p);
      replayEvent.onBallUpdate(pos);

      if (!switched && angles.length > 1 && p > 0.5) {
        switched = true;
        this.cameraRig.flyTo(angles[1], 500, pos);
      }

      if (p >= 1) {
        this.active = false;
        this.ui.showReplayBanner(false);
        onDone();
        return;
      }
      this._rafId = requestAnimationFrame(step);
    };
    this._rafId = requestAnimationFrame(step);
  }

  cancel() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.active = false;
    this.ui.showReplayBanner(false);
  }
}

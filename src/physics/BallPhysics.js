import { BOWLER_Z, BATSMAN_Z, PITCH_HALF_WIDTH, BOUNDARY_RADIUS } from '../game/constants.js';
import { lerp, clamp, easeOutQuad } from '../utils.js';

const RELEASE_HEIGHT = 2.0;
const CONTACT_HEIGHT = 0.85;

// Ball position while travelling from the bowler's hand to the bat,
// including swing (a curve that peaks mid-flight), a bounce arc, and a
// small seam deviation applied after the bounce.
export function deliveryPosition(delivery, progress) {
  const p = clamp(progress, 0, 1);
  const z = lerp(BOWLER_Z + 1.2, BATSMAN_Z - 1.6, p);
  const swingCurve = delivery.swingAmount * Math.sin(p * Math.PI);
  let x = delivery.line * PITCH_HALF_WIDTH * 0.8 + swingCurve;

  const bounceFrac = delivery.bounceFrac;
  let y;
  if (p < bounceFrac) {
    const t1 = p / bounceFrac;
    y = RELEASE_HEIGHT * (1 - t1) + 0.25 * 4 * t1 * (1 - t1);
  } else {
    const t2 = (p - bounceFrac) / (1 - bounceFrac);
    y = CONTACT_HEIGHT * t2 + delivery.bounceHeight * 4 * t2 * (1 - t2);
    x += delivery.seamDeviation * t2;
  }
  return { x, y: Math.max(0.03, y), z };
}

// Ball continuing past a missed shot on into the stumps (bowled).
export function missContinuation(delivery, extraProgress) {
  const end = deliveryPosition(delivery, 1);
  const p = clamp(extraProgress, 0, 1);
  return {
    x: lerp(end.x, end.x + delivery.line * 0.3, p),
    y: lerp(end.y, 0.32, p),
    z: lerp(end.z, BATSMAN_Z + 0.25, p),
  };
}

// Ball leaving safely (no shot attempted) — gathered just short of the bat.
export function leavePosition(delivery, extraProgress) {
  const end = deliveryPosition(delivery, 1);
  const p = clamp(extraProgress, 0, 1);
  return {
    x: end.x,
    y: lerp(end.y, 0.05, p),
    z: lerp(end.z, end.z + 0.4, p),
  };
}

// Ball trajectory once struck, keyed by run outcome. `shotAngle` (radians,
// 0 = straight back down the ground) biases direction left/right.
export function hitTrajectory(runs, contact, shotAngle, progress) {
  const p = clamp(progress, 0, 1);
  const dirX = Math.sin(shotAngle);
  const dirZ = Math.cos(shotAngle);

  let distance, heightFn, ease;
  if (runs === 6) {
    distance = BOUNDARY_RADIUS + 22;
    ease = easeOutQuad(p);
    heightFn = () => Math.sin(p * Math.PI * 0.92) * 15;
  } else if (runs === 4) {
    distance = BOUNDARY_RADIUS + 3;
    ease = easeOutQuad(p);
    heightFn = () => Math.max(0, Math.abs(Math.sin(p * Math.PI * 5)) * 0.5 * (1 - p));
  } else if (runs > 0) {
    distance = runs * 9;
    ease = easeOutQuad(p);
    heightFn = () => Math.max(0, Math.abs(Math.sin(p * Math.PI * 3)) * 0.35 * (1 - p));
  } else {
    distance = 1.6;
    ease = p;
    heightFn = () => Math.max(0, (1 - p) * 0.15 * Math.sin(p * Math.PI * 2));
  }

  return {
    x: contact.x + dirX * distance * ease,
    y: heightFn(),
    z: contact.z - dirZ * distance * ease,
  };
}

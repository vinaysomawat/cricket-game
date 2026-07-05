import { randInt, rand, lerp, clamp } from '../utils.js';

// Produces the randomized parameters for a single ball: pace, line
// (across the pitch), swing curve, seam deviation after the bounce, and
// how high it bounces — every delivery should feel a little different.
export class DeliveryGenerator {
  next() {
    const speedKmh = randInt(105, 150);
    const baseDuration = lerp(1050, 680, (speedKmh - 105) / 45);
    return {
      runUpDuration: randInt(550, 900),
      travelDuration: Math.round(clamp(baseDuration + rand(-40, 40), 600, 1150)),
      line: rand(-0.4, 0.4),
      bounceFrac: rand(0.45, 0.68),
      bounceHeight: rand(0.25, 0.55),
      swingAmount: rand(-0.35, 0.35),
      seamDeviation: rand(-0.18, 0.18),
      speedKmh,
    };
  }
}

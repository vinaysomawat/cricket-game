export const rand = (min, max) => Math.random() * (max - min) + min;
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutQuad = (t) => t * (2 - t);
export const easeInQuad = (t) => t * t;
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function weightedChoice(options) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of options) {
    if (r < o.weight) return o.value;
    r -= o.weight;
  }
  return options[options.length - 1].value;
}

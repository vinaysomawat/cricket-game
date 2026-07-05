import * as THREE from 'three';

// Small procedural canvas textures shared by a few meshes — avoids shipping
// binary texture assets while still giving surfaces some visual detail.

export function makeWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d8b483';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(120,80,40,0.35)';
  for (let i = 0; i < 26; i++) {
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    let x = Math.random() * canvas.width;
    ctx.moveTo(x, 0);
    for (let y = 0; y <= canvas.height; y += 16) {
      x += (Math.random() - 0.5) * 6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function makeBallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b5121b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // subtle shading band
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // seam stitching: two dashed curves representing the leather seam
  ctx.strokeStyle = '#f2eee0';
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.5);
  ctx.bezierCurveTo(canvas.width * 0.25, canvas.height * 0.3, canvas.width * 0.75, canvas.height * 0.7, canvas.width, canvas.height * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.5, 0);
  ctx.bezierCurveTo(canvas.width * 0.3, canvas.height * 0.25, canvas.width * 0.7, canvas.height * 0.75, canvas.width * 0.5, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

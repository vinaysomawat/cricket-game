import * as THREE from 'three';
import { PITCH_LENGTH, PITCH_HALF_WIDTH, BOWLER_Z, BATSMAN_Z, BOUNDARY_RADIUS, GROUND_RADIUS } from '../game/constants.js';

function makePitchTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 4;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#cdb47a');
  grad.addColorStop(0.5, '#c2a86c');
  grad.addColorStop(1, '#b89a5e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // mown stripes along the length
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#000000' : '#ffffff';
    ctx.fillRect(0, (i * canvas.height) / 40, canvas.width, canvas.height / 40);
  }
  ctx.globalAlpha = 1;

  // worn footmarks / dust patches near both ends
  ctx.fillStyle = 'rgba(120,95,55,0.35)';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * canvas.width;
    const y = canvas.height * 0.08 + Math.random() * canvas.height * 0.1;
    ctx.beginPath();
    ctx.ellipse(x, y, rand(4, 12), rand(3, 7), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * canvas.width;
    const y = canvas.height * 0.86 + Math.random() * canvas.height * 0.12;
    ctx.beginPath();
    ctx.ellipse(x, y, rand(4, 14), rand(3, 8), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // fine crack lines
  ctx.strokeStyle = 'rgba(90,70,40,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 50; i++) {
    let x = Math.random() * canvas.width;
    let y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += rand(-14, 14);
      y += rand(-14, 14);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // seam / crease lines
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, canvas.height * 0.09); ctx.lineTo(canvas.width, canvas.height * 0.09); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, canvas.height * 0.91); ctx.lineTo(canvas.width, canvas.height * 0.91); ctx.stroke();

  function rand(a, b) { return a + Math.random() * (b - a); }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeBoardTexture(text, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return new THREE.CanvasTexture(canvas);
}

export class Stadium {
  constructor() {
    this.group = new THREE.Group();
    this.ledBoards = [];
    this.flags = [];
    this.floodlightPositions = [];

    this._buildGround();
    this._buildPitch();
    this._buildBoundary();
    this._buildStands();
    this._buildSightScreen();
    this._buildFloodlights();
    this._buildReplayScreen();
    this._buildFlags();
  }

  _buildGround() {
    const geo = new THREE.CircleGeometry(GROUND_RADIUS, 96);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2f8f47, roughness: 0.95, metalness: 0.0 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // subtle mowed rings for texture variation
    for (let r = 8; r < GROUND_RADIUS; r += 8) {
      const ringGeo = new THREE.RingGeometry(r, r + 4, 96);
      const ringMat = new THREE.MeshStandardMaterial({
        color: (r / 8) % 2 === 0 ? 0x2c8a43 : 0x33934c,
        roughness: 0.95,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.001;
      ring.receiveShadow = true;
      this.group.add(ring);
    }

    this.grassPatch = ground;
  }

  _buildPitch() {
    const geo = new THREE.PlaneGeometry(PITCH_HALF_WIDTH * 2, PITCH_LENGTH + 3, 20, 40);
    const tex = makePitchTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.02 });
    const pitch = new THREE.Mesh(geo, mat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.01;
    pitch.receiveShadow = true;
    this.group.add(pitch);
    this.pitchMesh = pitch;

    // stumps
    this.stumpsBowler = this._buildStumpSet();
    this.stumpsBowler.position.set(0, 0, BOWLER_Z);
    this.group.add(this.stumpsBowler);

    this.stumpsBatsman = this._buildStumpSet();
    this.stumpsBatsman.position.set(0, 0, BATSMAN_Z);
    this.group.add(this.stumpsBatsman);

    // popping creases (thin white lines)
    const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [BOWLER_Z + 1.2, BATSMAN_Z - 1.2].forEach((z) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(PITCH_HALF_WIDTH * 2.4, 0.06), creaseMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.02, z);
      this.group.add(line);
    });
  }

  _buildStumpSet() {
    const group = new THREE.Group();
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0xf1e6c8, roughness: 0.6 });
    const bailMat = new THREE.MeshStandardMaterial({ color: 0xdcccA0, roughness: 0.5 });
    for (let i = -1; i <= 1; i++) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.71, 8), stumpMat);
      stump.position.set(i * 0.11, 0.355, 0);
      stump.castShadow = true;
      group.add(stump);
    }
    const bail1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), bailMat);
    bail1.position.set(-0.055, 0.715, 0);
    const bail2 = bail1.clone();
    bail2.position.set(0.055, 0.715, 0);
    group.add(bail1, bail2);
    return group;
  }

  _buildBoundary() {
    const ropeGeo = new THREE.TorusGeometry(BOUNDARY_RADIUS, 0.08, 8, 128);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.x = -Math.PI / 2;
    rope.position.y = 0.08;
    rope.castShadow = true;
    this.group.add(rope);

    // advertising boards ring around the boundary
    const boardTexts = [
      ['CRICKET CLASH', '#0d1b2a', '#ffb703'],
      ['12 BALL BLITZ', '#7f0d1f', '#ffffff'],
      ['SIX!', '#023e8a', '#ffd60a'],
      ['CLASH ARENA', '#2b2d42', '#8ecae6'],
    ];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const [text, bg, fg] = boardTexts[i % boardTexts.length];
      const tex = makeBoardTexture(text, bg, fg);
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.6 });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.8), mat);
      const r = BOUNDARY_RADIUS + 1.4;
      board.position.set(Math.sin(angle) * r, 1.1, Math.cos(angle) * r);
      board.lookAt(0, 1.1, 0);
      board.rotateY(Math.PI);
      this.group.add(board);
      this.ledBoards.push(board);
    }
  }

  _buildStands() {
    const tierColors = [0x555b6e, 0x89909e, 0x3d4451];
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
      const innerR = BOUNDARY_RADIUS + 4 + t * 6;
      const outerR = innerR + 6;
      const geo = new THREE.RingGeometry(innerR, outerR, 96, 1, 0, Math.PI * 2);
      const mat = new THREE.MeshStandardMaterial({ color: tierColors[t % tierColors.length], roughness: 0.9, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 2 + t * 3.2;
      ring.receiveShadow = true;
      this.group.add(ring);

      // vertical back wall of the tier
      const wallGeo = new THREE.CylinderGeometry(outerR, outerR, 3.2, 64, 1, true);
      const wallMat = new THREE.MeshStandardMaterial({ color: tierColors[(t + 1) % tierColors.length], roughness: 0.95, side: THREE.BackSide });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.y = 2 + t * 3.2 + 1.6;
      this.group.add(wall);
    }

    // pavilion block (single side, taller structure)
    const pavilion = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(26, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xe6dcc8, roughness: 0.8 })
    );
    base.position.set(0, 6, BOUNDARY_RADIUS + 18);
    base.castShadow = true;
    base.receiveShadow = true;
    pavilion.add(base);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(15, 4, 4),
      new THREE.MeshStandardMaterial({ color: 0x6a4b3a, roughness: 0.7 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 14, BOUNDARY_RADIUS + 18);
    pavilion.add(roof);

    // VIP boxes as a row of small glazed boxes along the pavilion front
    for (let i = -4; i <= 4; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.6, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x223, roughness: 0.3, metalness: 0.2 })
      );
      box.position.set(i * 2.6, 9.5, BOUNDARY_RADIUS + 12.8);
      pavilion.add(box);
    }
    this.group.add(pavilion);

    // dugouts either side of the pitch, pitch-level
    [-1, 1].forEach((side) => {
      const dugout = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2.2, 3),
        new THREE.MeshStandardMaterial({ color: 0x333d4d, roughness: 0.8 })
      );
      dugout.position.set(side * (PITCH_HALF_WIDTH + 10), 1.1, 0);
      dugout.castShadow = true;
      this.group.add(dugout);
    });
  }

  _buildSightScreen() {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 })
    );
    screen.position.set(0, 4, BOWLER_Z - 14);
    this.group.add(screen);
    this.sightScreen = screen;
  }

  _buildFloodlights() {
    const positions = [
      [BOUNDARY_RADIUS * 0.75, BOUNDARY_RADIUS * 0.75],
      [-BOUNDARY_RADIUS * 0.75, BOUNDARY_RADIUS * 0.75],
      [BOUNDARY_RADIUS * 0.75, -BOUNDARY_RADIUS * 0.75],
      [-BOUNDARY_RADIUS * 0.75, -BOUNDARY_RADIUS * 0.75],
    ];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5, metalness: 0.6 });
    const rigMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });

    positions.forEach(([x, z]) => {
      const towerHeight = 34;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, towerHeight, 10), poleMat);
      pole.position.set(x, towerHeight / 2, z);
      pole.castShadow = true;
      this.group.add(pole);

      const rig = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 16), rigMat);
      rig.position.set(x, towerHeight + 0.6, z);
      this.group.add(rig);

      // individual light fixtures as small emissive boxes
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const bulb = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xfff2c0, emissiveIntensity: 1.4 })
        );
        bulb.position.set(x + Math.cos(angle) * 2.2, towerHeight + 0.6, z + Math.sin(angle) * 2.2);
        this.group.add(bulb);
      }

      this.floodlightPositions.push(new THREE.Vector3(x, towerHeight, z));
    });
  }

  _buildReplayScreen() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#04101c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 40px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CRICKET CLASH', canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);

    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 9),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9 })
    );
    screenMesh.position.set(0, 16, BATSMAN_Z + 26);
    screenMesh.rotation.y = Math.PI;
    this.group.add(screenMesh);

    // support frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(19, 10, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })
    );
    frame.position.copy(screenMesh.position);
    frame.position.z += 0.31;
    this.group.add(frame);

    this.replayScreenCanvas = canvas;
    this.replayScreenCtx = ctx;
    this.replayScreenTexture = tex;
  }

  _buildFlags() {
    const colors = [0xff006e, 0x3a86ff, 0xffb703, 0x8ac926, 0xef233c];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = BOUNDARY_RADIUS + 22;
      const poleHeight = 4;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, poleHeight, 6),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
      );
      pole.position.set(Math.sin(angle) * r, poleHeight / 2 + 8, Math.cos(angle) * r);
      this.group.add(pole);

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.8, 6, 3),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide })
      );
      flag.position.set(pole.position.x + 0.72, poleHeight + 8 - 0.4, pole.position.z);
      flag.userData.basePos = flag.position.clone();
      flag.userData.phase = Math.random() * Math.PI * 2;
      this.group.add(flag);
      this.flags.push(flag);
    }
  }

  updateReplayScreenText(text, color = '#ffb703') {
    const ctx = this.replayScreenCtx;
    const canvas = this.replayScreenCanvas;
    ctx.fillStyle = '#04101c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = 'bold 56px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    this.replayScreenTexture.needsUpdate = true;
  }

  update(t, dt) {
    // gentle grass sway via vertex displacement on the pitch mesh
    const pos = this.pitchMesh.geometry.attributes.position;
    if (!this._basePitchY) {
      this._basePitchY = Float32Array.from(pos.array);
    }
    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      const bx = this._basePitchY[ix], bz = this._basePitchY[iz];
      pos.array[iy] = Math.sin(t * 1.4 + bx * 2 + bz * 0.6) * 0.004;
    }
    pos.needsUpdate = true;

    // flags flutter
    this.flags.forEach((f) => {
      f.rotation.y = Math.sin(t * 2 + f.userData.phase) * 0.35;
    });
  }
}

import * as THREE from 'three';

const PRESETS = {
  day: {
    sky: 0x8ec9ff, fog: 0x8ec9ff,
    sunColor: 0xfff4e0, sunIntensity: 3.2, sunPos: [40, 60, 20],
    hemiSky: 0xbfe3ff, hemiGround: 0x3a6b35, hemiIntensity: 0.9,
    floodIntensity: 0, exposure: 1.05, bloom: 0.4,
  },
  evening: {
    sky: 0xff9d5c, fog: 0xffb37a,
    sunColor: 0xffb066, sunIntensity: 2.2, sunPos: [-50, 16, 30],
    hemiSky: 0xffb37a, hemiGround: 0x442a1e, hemiIntensity: 0.6,
    floodIntensity: 55, exposure: 1.15, bloom: 0.45,
  },
  night: {
    sky: 0x040814, fog: 0x040814,
    sunColor: 0x3a4a6b, sunIntensity: 0.15, sunPos: [20, 40, -20],
    hemiSky: 0x1c2a4a, hemiGround: 0x05070c, hemiIntensity: 0.45,
    floodIntensity: 130, exposure: 1.1, bloom: 0.55,
  },
};

// Owns the sun / hemisphere / floodlight rig and switches between
// day, evening and night presets (color, fog, exposure, bloom together).
export class Lighting {
  constructor(scene, floodlightPositions, renderer3d) {
    this.scene = scene;
    this.renderer3d = renderer3d;

    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3a6b35, 0.9);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff4e0, 3.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 200 });
    this.sun.shadow.bias = -0.0015;
    scene.add(this.sun, this.sun.target);

    this.floodlights = floodlightPositions.map((pos) => {
      const light = new THREE.SpotLight(0xfff2c0, 0, 140, Math.PI / 5, 0.45, 1.8);
      light.position.copy(pos);
      light.target.position.set(0, 1, 0);
      scene.add(light, light.target);
      return light;
    });

    this.setPreset('day');
  }

  setPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    this.current = name;
    this.scene.background = new THREE.Color(p.sky);
    this.scene.fog = new THREE.Fog(p.fog, 60, 175);
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.sun.position.set(...p.sunPos);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.floodlights.forEach((l) => { l.intensity = p.floodIntensity; });
    this.renderer3d.setExposure(p.exposure);
    this.renderer3d.setBloom(p.bloom);
  }

  cycle() {
    const order = ['day', 'evening', 'night'];
    const next = order[(order.indexOf(this.current) + 1) % order.length];
    this.setPreset(next);
    return next;
  }
}

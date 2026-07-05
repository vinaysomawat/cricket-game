import * as THREE from 'three';

// Builds a simple low-poly humanoid rig out of primitives, with pivot
// groups at the shoulders/elbows/hips/knees so limbs can be posed and
// animated without needing a real skinned mesh / skeleton.
export function buildFigure({ jersey = 0xffffff, trim = 0x0d6efd, skin = 0xf2c9a0 } = {}) {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const jerseyMat = new THREE.MeshStandardMaterial({ color: jersey, roughness: 0.75 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.6 });

  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.38, 4, 8), jerseyMat);
  torso.position.y = 0.32;
  torso.castShadow = true;
  hips.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMat);
  head.position.y = 0.66;
  head.castShadow = true;
  hips.add(head);

  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.21, 0.5, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 6), jerseyMat);
    upper.position.y = -0.14;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.26;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 6), skinMat);
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    elbow.add(forearm);

    const hand = new THREE.Group();
    hand.position.y = -0.24;
    elbow.add(hand);

    return { shoulder, elbow, hand };
  }

  function buildLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.09, 0, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 4, 6), trimMat);
    thigh.position.y = -0.15;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.3;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 4, 6), trimMat);
    shin.position.y = -0.14;
    shin.castShadow = true;
    knee.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    foot.position.set(0, -0.29, 0.05);
    foot.castShadow = true;
    knee.add(foot);

    return { hip, knee };
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  hips.add(leftArm.shoulder, rightArm.shoulder);

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  hips.add(leftLeg.hip, rightLeg.hip);

  return { root, hips, head, torso, leftArm, rightArm, leftLeg, rightLeg, skinMat, jerseyMat, trimMat };
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Sculpted, fully volumetric props. Each factory owns its resources for safe disposal. */
function atelier() {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries = {
    box: new RoundedBoxGeometry(1, 1, 1, 2, .13),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 20),
  };
  function material(color: string, metalness = .02, roughness = .63) {
    const key = `${color}:${metalness}:${roughness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness }));
    return materials.get(key)!;
  }
  function mesh(group: THREE.Group, geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(x, y, z); object.scale.set(sx, sy, sz);
    object.castShadow = true; object.receiveShadow = true; group.add(object); return object;
  }
  const box = (group: THREE.Group, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) => mesh(group, geometries.box, color, x, y, z, sx, sy, sz);
  const ball = (group: THREE.Group, color: string, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => mesh(group, geometries.sphere, color, x, y, z, sx, sy, sz);
  const cylinder = (group: THREE.Group, color: string, x: number, y: number, z: number, radius: number, length: number) => mesh(group, geometries.cylinder, color, x, y, z, radius, length, radius);
  function link(group: THREE.Group, color: string, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
    const limb = cylinder(group, color, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, radius, a.distanceTo(b));
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return limb;
  }
  function polygon(group: THREE.Group, color: string, points: number[][], depth: number, z: number, bevel = 1) {
    const shape = new THREE.Shape(); points.forEach(([x, y], i) => i ? shape.lineTo(x!, y!) : shape.moveTo(x!, y!)); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSegments: 2, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 4 });
    return mesh(group, geo, color, 0, 0, z);
  }
  return { material, mesh, box, ball, cylinder, link, polygon };
}

export function createSpecialist(): THREE.Group {
  const group = new THREE.Group(); group.name = 'sculpted-code-quality-specialist';
  const a = atelier();
  const white = '#fffdf0', shade = '#d7e7de', dark = '#183e3e', skin = '#efb68b', skinLight = '#f9cca1';
  // Bent legs and oversized polished shoes give the hero a planted arcade stance.
  a.link(group, shade, new THREE.Vector3(-14, -35, -1), new THREE.Vector3(-23, -70, 0), 12);
  a.link(group, white, new THREE.Vector3(-23, -70, 0), new THREE.Vector3(-35, -95, 5), 10);
  a.link(group, white, new THREE.Vector3(12, -35, 1), new THREE.Vector3(22, -70, 5), 12);
  a.link(group, white, new THREE.Vector3(22, -70, 5), new THREE.Vector3(35, -96, 11), 10);
  a.box(group, dark, -34, -101, 10, 40, 17, 31).rotation.z = -.08;
  a.box(group, dark, 38, -101, 17, 43, 18, 31).rotation.z = .08;
  a.box(group, '#608b80', -35, -109, 12, 38, 3, 28);
  a.box(group, '#608b80', 39, -109, 19, 39, 3, 28);
  a.ball(group, '#415f57', -40, -99, 25, 12, 2, 3);
  a.ball(group, '#415f57', 45, -99, 30, 12, 2, 3);
  // Tailored solid blazer with separate sculpted lapels and golden necktie.
  a.box(group, dark, 0, -37, 1, 45, 9, 29);
  a.box(group, '#f2c746', 2, -37, 18, 12, 10, 5);
  a.polygon(group, white, [[-24, 34], [19, 36], [29, 13], [25, -9], [36, -36], [10, -43], [0, -31], [-15, -42], [-34, -35], [-24, 5]], 29, -15, 3);
  a.polygon(group, '#e4efe5', [[-12, 34], [11, 34], [17, -19], [0, -33], [-16, -20]], 4, 16, 1);
  a.polygon(group, '#f5c94c', [[-1, 25], [7, 24], [5, 16], [12, -13], [3, -22], [-5, -14], [-1, 16], [-5, 22]], 5, 22, .7);
  a.polygon(group, white, [[-16, 36], [-3, 25], [-12, 15], [-17, 21], [-23, 4], [-12, -1], [-23, -33], [-29, -30], [-22, 25]], 4, 22, .7);
  a.polygon(group, white, [[14, 36], [5, 25], [15, 15], [19, 23], [27, 5], [17, 0], [28, -32], [32, -29], [25, 25]], 4, 22, .7);
  a.ball(group, dark, 14, -17, 25, 2.2);
  a.box(group, '#75b6a0', -20, 5, 29, 11, 15, 3).rotation.z = .14;
  a.link(group, white, new THREE.Vector3(-23, 32, -1), new THREE.Vector3(-41, 8, 6), 12);
  a.link(group, white, new THREE.Vector3(-41, 8, 6), new THREE.Vector3(-17, 18, 30), 10);
  a.ball(group, skinLight, -13, 19, 31, 10, 10, 9);
  a.link(group, white, new THREE.Vector3(23, 28, 3), new THREE.Vector3(40, 2, 17), 12);
  a.link(group, white, new THREE.Vector3(40, 2, 17), new THREE.Vector3(62, 12, 28), 10);
  a.box(group, shade, 56, 9, 27, 7, 20, 20).rotation.z = -.28;
  a.ball(group, skinLight, 66, 13, 29, 12, 9, 10);
  a.ball(group, skin, 70, 19, 34, 5, 8, 5);
  a.cylinder(group, skin, 1, 41, 1, 12, 20);
  const head = new THREE.Group(); head.position.set(1, 72, 3); head.rotation.y = .18; group.add(head);
  a.ball(head, skinLight, 0, 0, 0, 27, 34, 24);
  a.ball(head, skin, -26, -1, 2, 6, 10, 7);
  a.ball(head, skinLight, 24, -1, 3, 5, 9, 7);
  // Nose projects toward the camera and right; actual glass lens/frame geometry sits in front.
  a.ball(head, skin, 7, -4, 24, 6, 11, 9);
  a.ball(head, skinLight, 9, -6, 29, 6, 5, 6);
  a.ball(head, dark, -7, 6, 23, 2.1, 3.7, 1.4);
  a.ball(head, dark, 16, 6, 21, 2.1, 3.7, 1.4);
  const lensMaterial = new THREE.MeshStandardMaterial({ color: '#d5ffff', transparent: true, opacity: .27, roughness: .1, metalness: .12 });
  for (const [x, z, ry] of [[-9, 25, -.10], [15, 23, .14]]) {
    const frame = new THREE.Group(); frame.position.set(x!, 5, z!); frame.rotation.y = ry!; head.add(frame);
    const shape = new THREE.Shape(); shape.moveTo(-10, -5); shape.quadraticCurveTo(-10, -10, -5, -10); shape.lineTo(5, -10); shape.quadraticCurveTo(10, -10, 10, -5); shape.lineTo(10, 7); shape.quadraticCurveTo(10, 10, 5, 10); shape.lineTo(-5, 10); shape.quadraticCurveTo(-10, 10, -10, 7); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(-7, -5); hole.lineTo(-7, 6); hole.quadraticCurveTo(-7, 7, -5, 7); hole.lineTo(5, 7); hole.quadraticCurveTo(7, 7, 7, 5); hole.lineTo(7, -5); hole.quadraticCurveTo(7, -7, 5, -7); hole.lineTo(-5, -7); hole.quadraticCurveTo(-7, -7, -7, -5); shape.holes.push(hole);
    a.mesh(frame, new THREE.ExtrudeGeometry(shape, { depth: 2.5, bevelEnabled: true, bevelSize: .5, bevelThickness: .5, bevelSegments: 1, steps: 1 }), dark, 0, 0, 0);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 1), lensMaterial); lens.position.z = 1; frame.add(lens);
    a.box(frame, '#f5ffff', -3, 5, 3, 7, 1.3, 1).rotation.z = .33;
  }
  a.box(head, dark, 3, 7, 25, 7, 3, 3);
  a.link(head, dark, new THREE.Vector3(-20, 8, 25), new THREE.Vector3(-27, 8, 1), 1.7);
  a.link(head, dark, new THREE.Vector3(25, 8, 23), new THREE.Vector3(27, 7, 1), 1.7);
  a.polygon(head, dark, [[-8, -17], [15, -15], [12, -22], [2, -24], [-5, -22]], 2, 21, .3);
  a.polygon(head, white, [[-6, -17], [13, -16], [11, -19], [-3, -20]], 1, 24, .1);
  // A sculpted pompadour silhouette, with separately lit sweep and sideburns.
  a.ball(head, dark, -3, 24, -2, 29, 20, 24);
  a.ball(head, dark, 4, 37, 3, 27, 13, 23).rotation.z = -.2;
  a.ball(head, dark, 19, 32, 10, 18, 13, 18).rotation.z = .25;
  a.ball(head, '#2a5350', -4, 35, 19, 20, 5, 7).rotation.z = .15;
  a.box(head, dark, -23, 12, 2, 9, 25, 13).rotation.z = .09;
  group.userData.kind = 'specialist'; return group;
}

export function createCannon(): THREE.Group {
  const group = new THREE.Group(); group.name = 'volumetric-refactor-cannon'; const a = atelier();
  const body = a.cylinder(group, '#72c8ad', 26, 0, 0, 17, 52); body.rotation.z = Math.PI / 2;
  a.box(group, '#f3cb48', 4, -6, 0, 20, 34, 32);
  a.box(group, '#244b48', -2, -24, 0, 13, 23, 13).rotation.z = -.22;
  a.box(group, '#f7de73', 29, 12, 0, 37, 7, 21);
  const collar = a.cylinder(group, '#f4d05a', 48, 0, 0, 19, 12); collar.rotation.z = Math.PI / 2;
  // Torus muzzle is genuinely hollow, with a recessed dark inner bore.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(13, 4, 8, 24), a.material('#d1ebd9', .28, .34)); ring.rotation.y = Math.PI / 2; ring.position.x = 73; ring.castShadow = true; group.add(ring);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 17, 24, 1, true), a.material('#254d47', .1)); tube.rotation.z = Math.PI / 2; tube.position.x = 65; tube.castShadow = true; group.add(tube);
  const bore = a.cylinder(group, '#10332f', 57, 0, 0, 12.7, 1); bore.rotation.z = Math.PI / 2;
  for (const x of [12, 30]) a.box(group, '#b2eed0', x, 0, 16, 8, 12, 3);
  group.userData.kind = 'cannon'; return group;
}

export function createSpecial(type: 'homing' | 'grenade' | 'review' | 'lint'): THREE.Group {
  if(type==='review'||type==='lint') return createToolPickup(type);
  const group = new THREE.Group(); group.name = `sculpted-${type}`; const a = atelier();
  if (type === 'homing') {
    // Backspace arrow has a solid extruded body and raised cross on its front face.
    a.polygon(group, '#f9d15b', [[-24, 0], [-12, 15], [21, 15], [24, 12], [24, -12], [21, -15], [-12, -15]], 12, -6, 2);
    a.polygon(group, '#fff1ac', [[-19, 0], [-9, 10], [18, 10], [18, -10], [-9, -10]], 1.5, 8, .6);
    a.box(group, '#254b49', 5, 0, 11, 19, 3.5, 3).rotation.z = Math.PI / 4;
    a.box(group, '#254b49', 5, 0, 11, 19, 3.5, 3).rotation.z = -Math.PI / 4;
    const jet = a.cylinder(group, '#416c63', -17, 0, -2, 7, 12); jet.rotation.z = Math.PI / 2;
    a.polygon(group, '#e6853f', [[-24, -4], [-38, 0], [-24, 4]], 7, -3, .5);
  } else {
    a.box(group, '#48ae92', 0, -2, 0, 26, 31, 22);
    a.box(group, '#2a7769', 0, -17, 0, 25, 4, 22);
    a.box(group, '#8bd8b1', 0, 15, 0, 34, 7, 29).rotation.z = .08;
    a.box(group, '#2c6a5b', 0, 23, 0, 13, 8, 8);
    a.box(group, '#a8f2d1', 0, 23, 0, 7, 4, 10);
    for (const x of [-8, 0, 8]) a.box(group, '#76c9a3', x, -3, 12, 2.4, 21, 3);
    // Three connected arrowheads form a raised geometric recycling emblem.
    const emblem = new THREE.Group(); emblem.position.set(0, -1, 15); group.add(emblem);
    for (let i = 0; i < 3; i++) { const arrow = new THREE.Group(); arrow.rotation.z = i * Math.PI * 2 / 3; emblem.add(arrow); a.polygon(arrow, '#fff1bb', [[-2, 7], [3, 7], [3, 10], [8, 5], [3, 0], [3, 3], [-2, 3]], 2, 0, .2); }
  }
  group.userData.kind = type; return group;
}

export function createPickup(type: 'double' | 'triple' | 'quad' | 'quint' | 'homing' | 'grenade' | 'review' | 'lint'): THREE.Group {
  if(type==='homing'||type==='grenade') {
    const group=createSpecial(type);group.name=`${type}-bonus`;group.scale.setScalar(1.15);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(34,1.7,8,40),new THREE.MeshStandardMaterial({color:'#fff0a4',emissive:'#b28524',emissiveIntensity:.4}));group.add(halo);
    group.userData.kind='pickup';return group;
  }
  if(type==='review'||type==='lint') return createToolPickup(type);
  const group = new THREE.Group(); group.name = `${type}-weapon-upgrade`; const a = atelier();
  const rare=type==='quad'||type==='quint';
  a.box(group, rare?'#8964ce':'#e6b93c', 0, 0, 0, 45, 41, 18);
  a.box(group, rare?'#e1ceff':'#ffe9a0', 0, 0, 10, 37, 33, 6);
  const count = {double:2,triple:3,quad:4,quint:5}[type];
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * (count>3?6:10);
    a.box(group, rare?'#56378d':'#285c4e', x, 0, 15, count>3?3.6:5, 19, 4).rotation.z = -(i-(count-1)/2)*.14;
    a.ball(group, '#fff7d1', x, 9, 18, 2.4);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(32, 1.3, 6, 36), a.material('#fbd668', .3, .25)); group.add(halo); halo.rotation.x = .25;
  group.userData.kind = 'pickup'; return group;
}

/** Distinct solid pickups: a review freeze ray and a spherical lint-clearing bomb. */
function createToolPickup(type:'review'|'lint'):THREE.Group {
  const group=new THREE.Group();group.name=`${type}-bonus`;const a=atelier();
  if(type==='review') {
    a.box(group,'#67c9f3',0,0,0,34,22,19);
    a.box(group,'#245879',-10,-16,0,11,23,12).rotation.z=-.22;
    const barrel=a.cylinder(group,'#c1f4ff',22,1,0,8,22);barrel.rotation.z=Math.PI/2;
    const nozzle=new THREE.Mesh(new THREE.TorusGeometry(8,2.5,8,20),a.material('#3b83aa',.35,.3));nozzle.rotation.y=Math.PI/2;nozzle.position.set(34,1,0);group.add(nozzle);
    a.box(group,'#f1fdff',-3,3,12,18,18,3);
    a.box(group,'#369ac0',-7,2,15,7,2.8,2).rotation.z=-.7;
    a.box(group,'#369ac0',-1,4,15,12,2.8,2).rotation.z=.8;
    for(let i=0;i<3;i++){const crystal=a.mesh(group,new THREE.OctahedronGeometry(4),'#b9f5ff',-11+i*10,20,0);crystal.rotation.z=.4;}
  } else {
    a.ball(group,'#7c5baa',0,-2,0,23,24,21);
    a.box(group,'#bda0f0',0,19,0,15,10,13);
    a.link(group,'#ebca78',new THREE.Vector3(0,23,0),new THREE.Vector3(10,33,0),2.5);
    a.ball(group,'#ffe7a3',12,34,0,5);
    a.box(group,'#ffedac',0,-1,20,25,20,3);
    a.box(group,'#6c4b94',-4,-1,23,3,11,2);
    a.box(group,'#6c4b94',1,-5,23,9,3,2);
    for(let i=0;i<3;i++)a.box(group,'#8964ae',4+i*3,4-i*4,24,2,3,2);
  }
  const halo=new THREE.Mesh(new THREE.TorusGeometry(35,1.5,8,40),a.material(type==='review'?'#a6edff':'#d4b3ff',.2,.3));halo.rotation.x=.2;group.add(halo);
  group.userData.kind='pickup';return group;
}

export function createBullet(): THREE.Group {
  const group = new THREE.Group(); const a = atelier(); group.name = 'solid-refactor-round';
  a.ball(group, '#fff2a9', 0, 0, 0, 12, 4.5, 4.5);
  a.ball(group, '#fffdf0', 6, 0, 1, 5, 3.7, 3.7);
  group.userData.kind = 'bullet'; return group;
}

export function createEnvironment(): THREE.Group {
  const group = new THREE.Group(); group.name = 'sculpted-mint-city'; const a = atelier();
  // True ground plane, curb, tiles, solid buildings and window recesses share scene lighting.
  a.box(group, '#9dc7ad', 640, 15, -530, 2900, 30, 1700).receiveShadow = true;
  a.box(group, '#cce0bf', 640, 34, -450, 2600, 12, 1450);
  a.box(group, '#79a48c', 640, 25, 110, 2600, 26, 40);
  a.box(group, '#dfebcf', 640, 42, 65, 2600, 10, 60);
  // Broad pavement strips recede into the scene; light catches their bevels naturally.
  for (let i = 0; i < 13; i++) a.box(group, '#b8d3b6', i * 130 - 100, 41, -160, 2, 2, 450);
  const buildings = [
    [-80, 180, 135, -560, '#afc8ad'], [85, 245, 132, -615, '#bed0b3'],
    [235, 155, 115, -480, '#9cbdab'], [358, 220, 140, -570, '#d5dabb'],
    [510, 126, 136, -460, '#aac9b0'], [650, 190, 130, -610, '#9ab9a6'],
    [790, 285, 124, -650, '#c3d0b5'], [940, 172, 140, -500, '#a9c6ae'],
    [1110, 240, 150, -620, '#bcccad'], [1280, 152, 155, -520, '#9cbea9'],
    [1450, 260, 160, -650, '#cbd5b7'],
  ] as const;
  const windowMatrices: THREE.Matrix4[] = [];
  for (const [x, height, width, z, color] of buildings) {
    const building = new THREE.Group(); building.position.set(x, 40, z); building.rotation.y = (x % 3 - 1) * .045; group.add(building);
    a.box(building, color, 0, height / 2, 0, width, height, 95);
    a.box(building, '#e0e6cb', 0, height + 3, 0, width + 9, 10, 105);
    a.box(building, '#729e8c', -width / 2 + 5, height / 2, 50, 8, height - 12, 9);
    a.box(building, '#dce4c7', 0, 9, 51, width + 4, 15, 9);
    building.updateMatrix();
    for (let row = 0; row < Math.floor((height - 32) / 35); row++) {
      for (let col = 0; col < 3; col++) {
        const local = new THREE.Matrix4().compose(new THREE.Vector3((col - 1) * width * .24, 34 + row * 35, 50), new THREE.Quaternion(), new THREE.Vector3(width * .13, 18, 4));
        windowMatrices.push(building.matrix.clone().multiply(local));
      }
    }
    if (height > 210) {
      a.box(building, '#8cad99', width * .2, height + 16, -5, 37, 26, 42);
      const antenna = a.cylinder(building, '#749581', width * .2, height + 45, -5, 1.7, 35); antenna.castShadow = false;
    }
  }
  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), a.material('#719c8f', .2, .46), windowMatrices.length);
  windowMatrices.forEach((matrix, index) => windows.setMatrixAt(index, matrix)); windows.castShadow = true; windows.receiveShadow = true; group.add(windows);
  // Tiny volumetric street trees and planters sit behind the action near the horizon.
  for (const x of [160, 460, 1015, 1370]) {
    a.box(group, '#6f9983', x, 53, -260, 48, 24, 36);
    a.cylinder(group, '#7e8c63', x, 86, -260, 5, 51);
    a.ball(group, '#83b89c', x - 8, 117, -260, 24, 30, 23);
    a.ball(group, '#aed0a4', x + 10, 130, -253, 24, 27, 22);
    a.ball(group, '#96c49e', x - 4, 141, -267, 21, 24, 21);
  }
  group.userData.kind = 'environment'; return group;
}

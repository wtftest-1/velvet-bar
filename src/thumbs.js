// Renders every catalogue item to a small 3D preview image (cached), so you can see what you are buying.
import * as THREE from 'three';
import { buildItem } from './furniture.js';
import { FURNITURE } from './data/catalog.js';

const cache = new Map();
let rig = null;
const SIZE = 176;

function setup(renderer, env) {
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.9; scene.background = new THREE.Color(0x2b1220);
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x4a2430, 1.5));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a70, 1.2); rim.position.set(-4, 2, -3); scene.add(rim);
  const wrap = new THREE.Group(); wrap.scale.x = -1; scene.add(wrap); // same mirror as the game world
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshStandardMaterial({ color: 0x3a1a28, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; wrap.add(floor);
  const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  rig = { scene, wrap, rt, cam, renderer, buf: new Uint8Array(SIZE * SIZE * 4), cv: Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE }) };
}

export function thumbFor(k, world) {
  if (cache.has(k)) return cache.get(k);
  if (!rig) setup(world.renderer, world.scene.environment);
  const { scene, wrap, rt, cam, renderer, buf, cv } = rig, d = FURNITURE[k];
  const g = buildItem({ id: 0, k, f: 0, x: 0, z: 0, r: 0, m: {} }); g.position.set(0, 0, 0); g.rotation.y = 0.65; g.updateMatrixWorld(true);
  if (d.hang) g.children[0].visible = false; // hide the long chain
  wrap.add(g);
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const R = Math.max(size.x, size.y, size.z) * 0.5 * 1.18, dist = R / Math.tan(THREE.MathUtils.degToRad(15)) * 1.05;
  cam.position.set(ctr.x + dist * 0.62, ctr.y + dist * 0.38, ctr.z + dist * 0.78); cam.lookAt(ctr);
  const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buf); renderer.setRenderTarget(prev);
  wrap.remove(g); g.traverse(o => o.geometry?.dispose());
  const c2 = cv.getContext('2d'), img = c2.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) img.data.set(buf.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
  c2.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/jpeg', 0.85); cache.set(k, url); return url;
}

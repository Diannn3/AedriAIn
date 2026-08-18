import * as THREE from 'three';

let activeCamera: THREE.Camera | null = null;
let activeCanvas: HTMLCanvasElement | null = null;

export const setSpatialRuntime = (camera: THREE.Camera | null, canvas: HTMLCanvasElement | null) => {
  activeCamera = camera;
  activeCanvas = canvas;
};

export const getSpatialCamera = () => activeCamera;
export const getSpatialCanvas = () => activeCanvas;

export function screenToNdc(clientX: number, clientY: number) {
  const rect = activeCanvas?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  return new THREE.Vector2(
    ((clientX - rect.left) / width) * 2 - 1,
    -(((clientY - rect.top) / height) * 2 - 1),
  );
}

export function normalizedHandToNdc(x: number, y: number) {
  // MediaPipe sees the unmirrored camera frame while AedriAIn presents a mirrored
  // interaction view, so X is mirrored before converting into Three NDC space.
  return new THREE.Vector2((1 - x) * 2 - 1, 1 - y * 2);
}

export function cameraFacingPlane(camera: THREE.Camera, point: THREE.Vector3) {
  const normal = new THREE.Vector3();
  camera.getWorldDirection(normal);
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
}

export function intersectNdcPlane(
  camera: THREE.Camera,
  ndc: THREE.Vector2,
  plane: THREE.Plane,
  target = new THREE.Vector3(),
) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(plane, target);
}

export function intersectScreenPlane(
  camera: THREE.Camera,
  clientX: number,
  clientY: number,
  plane: THREE.Plane,
  target = new THREE.Vector3(),
) {
  return intersectNdcPlane(camera, screenToNdc(clientX, clientY), plane, target);
}

export function fallbackPointerPoint(camera: THREE.Camera, ndc: THREE.Vector2, target = new THREE.Vector3()) {
  const plane = cameraFacingPlane(camera, new THREE.Vector3(0, 0, 0));
  return intersectNdcPlane(camera, ndc, plane, target);
}

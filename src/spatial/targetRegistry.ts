import type * as THREE from 'three';

export type SpatialTargetRegion = 'chrome' | 'content';

export interface SpatialTarget {
  key: string;
  windowId: string;
  region: SpatialTargetRegion;
  object: THREE.Object3D;
  priority: number;
}

const targets = new Map<string, SpatialTarget>();

export const registerSpatialTarget = (
  windowId: string,
  region: SpatialTargetRegion,
  object: THREE.Object3D,
  priority = region === 'chrome' ? 20 : 10,
) => {
  const key = `${windowId}:${region}`;
  object.userData.windowId = windowId;
  object.userData.spatialRegion = region;
  targets.set(key, { key, windowId, region, object, priority });
  return () => {
    if (targets.get(key)?.object === object) targets.delete(key);
  };
};

export const getSpatialTargets = () => [...targets.values()];
export const getSpatialTargetsForWindow = (windowId: string) => [...targets.values()].filter((target) => target.windowId === windowId);
export const clearSpatialTargets = () => targets.clear();

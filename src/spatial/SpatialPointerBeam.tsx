import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { interactionRuntime } from './interactionRuntime';

export function SpatialPointerBeam() {
  const { camera } = useThree();
  const lineRef = useRef<THREE.Line>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const positions = useMemo(() => new Float32Array(6), []);

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const interaction = interactionRuntime.getState();
    const visible = Boolean(interaction.primaryHandId && interaction.pointerWorld);
    line.visible = visible;
    if (!visible || !interaction.pointerWorld) return;

    const origin = new THREE.Vector3();
    camera.getWorldPosition(origin);
    positions[0] = origin.x;
    positions[1] = origin.y;
    positions[2] = origin.z;
    positions[3] = interaction.pointerWorld[0];
    positions[4] = interaction.pointerWorld[1];
    positions[5] = interaction.pointerWorld[2];
    const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
    if (materialRef.current) materialRef.current.opacity = interaction.mode === 'transform' ? 0.58 : interaction.mode === 'grab' ? 0.48 : interaction.mode === 'hover' ? 0.32 : 0.12;
  });

  return (
    <line ref={lineRef} visible={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <lineBasicMaterial ref={materialRef} color="#63efff" transparent opacity={0.12} />
    </line>
  );
}

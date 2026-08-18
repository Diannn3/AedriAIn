import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDesktopStore } from '../store/useDesktopStore';
import { AssistantOrb } from './AssistantOrb';
import { HandInteractionController } from './HandInteractionController';
import { SpatialWindow } from './SpatialWindow';
import { PerformanceProbe } from './PerformanceProbe';
import { SpatialPointerBeam } from './SpatialPointerBeam';

function AmbientScene() {
  const grid = useRef<THREE.GridHelper>(null);
  const points = useMemo(() => {
    const data = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i += 1) {
      data[i * 3] = (Math.random() - 0.5) * 18;
      data[i * 3 + 1] = (Math.random() - 0.5) * 10;
      data[i * 3 + 2] = -1 - Math.random() * 7;
    }
    return data;
  }, []);

  useFrame(({ clock }) => {
    if (grid.current) grid.current.material.opacity = 0.13 + Math.sin(clock.elapsedTime * 0.45) * 0.025;
  });

  return (
    <>
      <ambientLight intensity={0.36} />
      <directionalLight position={[4, 7, 5]} intensity={1.1} color="#b9f7ff" />
      <gridHelper ref={grid} args={[20, 42, '#1b8aa0', '#0a3640']} position={[0, -3.05, -1.8]} material-transparent material-opacity={0.15} />
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry>
        <pointsMaterial color="#37b9ce" size={0.018} transparent opacity={0.35} sizeAttenuation />
      </points>
      <fog attach="fog" args={['#020a0d', 7.5, 16]} />
    </>
  );
}

function DesktopObjects() {
  const windows = useDesktopStore((s) => s.windows);
  return (
    <>
      {windows.filter((w) => w.open && !w.minimized).sort((a, b) => a.zOrder - b.zOrder).map((model) => <SpatialWindow key={model.id} model={model} />)}
      <AssistantOrb />
      <HandInteractionController />
      <SpatialPointerBeam />
      <PerformanceProbe />
    </>
  );
}

export function SpatialScene() {
  return (
    <Canvas className="spatial-canvas" camera={{ position: [0, 0, 8.2], fov: 43, near: 0.1, far: 40 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={['#02090c']} />
      <AmbientScene />
      <DesktopObjects />
    </Canvas>
  );
}

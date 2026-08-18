import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export function AssistantOrb() {
  const group = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (group.current) group.current.position.y = 0.04 + Math.sin(clock.elapsedTime * 1.2) * 0.07;
    if (ringA.current) { ringA.current.rotation.x += delta * 0.35; ringA.current.rotation.z += delta * 0.18; }
    if (ringB.current) { ringB.current.rotation.y -= delta * 0.42; ringB.current.rotation.z -= delta * 0.13; }
  });

  return (
    <group ref={group} position={[0, 0.15, -0.45]}>
      <pointLight color="#4de8ff" intensity={7} distance={4.5} />
      <mesh>
        <icosahedronGeometry args={[0.48, 5]} />
        <meshPhysicalMaterial color="#062f3a" emissive="#24dfff" emissiveIntensity={2.8} roughness={0.18} metalness={0.45} transparent opacity={0.78} />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[0.48, 42, 42]} />
        <meshBasicMaterial color="#77f2ff" wireframe transparent opacity={0.12} />
      </mesh>
      <mesh ref={ringA} rotation={[Math.PI / 2.7, 0, 0]}>
        <torusGeometry args={[0.78, 0.012, 8, 120]} />
        <meshBasicMaterial color="#5feaff" transparent opacity={0.75} />
      </mesh>
      <mesh ref={ringB} rotation={[0.2, Math.PI / 2.2, 0]}>
        <torusGeometry args={[0.96, 0.008, 8, 120]} />
        <meshBasicMaterial color="#208fa8" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

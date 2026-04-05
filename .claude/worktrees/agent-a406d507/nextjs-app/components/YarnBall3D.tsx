'use client'
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// We need to use mesh + tube geometry instead of line to avoid SVG type conflict
function YarnBallMesh() {
  const groupRef = useRef<THREE.Group>(null);
  
  const tubes = useMemo(() => {
    const result: THREE.TubeGeometry[] = [];
    const numLines = 40;
    
    for (let i = 0; i < numLines; i++) {
      const points: THREE.Vector3[] = [];
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const radius = 1.8 + Math.random() * 0.3;
      
      for (let j = 0; j <= 50; j++) {
        const t = j / 50;
        const angle = t * Math.PI * 2 * (2 + Math.random() * 3);
        const r = radius * Math.sin(t * Math.PI);
        const offsetPhi = phi + angle * 0.3;
        const offsetTheta = theta + angle;
        
        points.push(new THREE.Vector3(
          r * Math.sin(offsetPhi) * Math.cos(offsetTheta),
          r * Math.cos(offsetPhi),
          r * Math.sin(offsetPhi) * Math.sin(offsetTheta)
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      result.push(new THREE.TubeGeometry(curve, 40, 0.02, 4, false));
    }
    return result;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  const colors = ['#8C1A1A', '#A52525', '#C9A76B', '#D4A853', '#7A1515'];

  return (
    <group ref={groupRef}>
      {tubes.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            color={colors[i % colors.length]}
            transparent
            opacity={0.6 + Math.random() * 0.4}
            roughness={0.8}
          />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshStandardMaterial
          color="#8C1A1A"
          transparent
          opacity={0.1}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

export default function YarnBall3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#F3E6D4" />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#C9A76B" />
        <YarnBallMesh />
      </Canvas>
    </div>
  );
}

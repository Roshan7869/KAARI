'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedYarnBall() {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.3;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <Sphere args={[1.5, 64, 64]}>
          <meshPhongMaterial
            color="#c084fc"
            wireframe={false}
            shininess={100}
          />
        </Sphere>
      </mesh>

      {/* Lighting */}
      <pointLight position={[10, 10, 10]} intensity={0.7} />
      <ambientLight intensity={0.5} />
    </group>
  );
}

export function YarnBall3DContent() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <AnimatedYarnBall />
      <OrbitControls enableZoom={false} autoRotate />
    </Canvas>
  );
}

'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, GradientTexture } from '@react-three/drei';
import * as THREE from 'three';

function FloatingNodes() {
  const nodesRef = useRef<THREE.Group>(null);
  
  const nodes = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
      ] as [number, number, number],
      scale: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.2,
      color: i % 3 === 0 ? '#4caf50' : i % 3 === 1 ? '#81c784' : '#2e7d32',
    }));
  }, []);

  useFrame((state) => {
    if (nodesRef.current) {
      nodesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      nodesRef.current.children.forEach((node, i) => {
        node.position.y += Math.sin(state.clock.elapsedTime * nodes[i].speed + i) * 0.002;
      });
    }
  });

  return (
    <group ref={nodesRef}>
      {nodes.map((node, i) => (
        <Float key={i} speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <Sphere position={node.position} args={[node.scale, 32, 32]}>
            <meshStandardMaterial 
              color={node.color} 
              emissive={node.color}
              emissiveIntensity={0.3}
              roughness={0.3}
              metalness={0.8}
            />
          </Sphere>
        </Float>
      ))}
    </group>
  );
}

function AnimatedWave() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={[3, -1, -2]} scale={1.5}>
      <torusKnotGeometry args={[1, 0.3, 128, 32]} />
      <MeshDistortMaterial 
        color="#4caf50" 
        emissive="#2e7d32"
        emissiveIntensity={0.2}
        distort={0.4} 
        speed={2}
        roughness={0.2}
        metalness={0.9}
      />
    </mesh>
  );
}

function MicIcon() {
  const micRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (micRef.current) {
      micRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={micRef} position={[-3, 0, -1]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1.2, 32]} />
        <meshStandardMaterial color="#1b5e20" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#2e7d32" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.3, 32]} />
        <meshStandardMaterial color="#1b5e20" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

export default function LandingHero() {
  return (
    <div className="h-[600px] w-full relative">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#4caf50" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#81c784" />
        <FloatingNodes />
        <AnimatedWave />
        <MicIcon />
      </Canvas>
    </div>
  );
}


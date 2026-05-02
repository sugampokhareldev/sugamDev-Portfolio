import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshTransmissionMaterial } from '@react-three/drei';

function PremiumObject() {
  const meshRef = useRef();
  const wireRef = useRef();

  useFrame((state) => {
    if (!meshRef.current || !wireRef.current) return;
    const t = state.clock.getElapsedTime();

    // Smooth rotation
    meshRef.current.rotation.y = t * 0.2;
    wireRef.current.rotation.y = t * 0.2;

    // Subtle floating effect
    meshRef.current.position.y = Math.sin(t * 0.8) * 0.15;
    wireRef.current.position.y = Math.sin(t * 0.8) * 0.15;

    // Slight scale breathing
    const scale = 1 + Math.sin(t * 1.2) * 0.03;
    meshRef.current.scale.set(scale, scale, scale);
    wireRef.current.scale.set(scale, scale, scale);
  });

  return (
    <>
      {/* Glass Object */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 1]} />
        <MeshTransmissionMaterial
          thickness={0.4}
          roughness={0}
          transmission={1}
          ior={1.5}
          chromaticAberration={0.02}
          backside
        />
      </mesh>

      {/* Wireframe Overlay */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshBasicMaterial
          color="#e8c547"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </>
  );
}

const ThreeCanvas = () => {
  return (
    <div className="three-canvas-container" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 10 }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} />
        <pointLight position={[-3, -3, -3]} intensity={1} />
        
        <PremiumObject />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 2.5}
        />
      </Canvas>
    </div>
  );
};

export default ThreeCanvas;

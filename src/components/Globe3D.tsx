import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface ViewerDot {
  position: [number, number, number];
  delay: number;
}

const Globe3D = () => {
  const globeRef = useRef<THREE.Mesh>(null);
  const dotsGroupRef = useRef<THREE.Group>(null);

  // Generate random viewer locations on sphere surface
  const viewerDots = useMemo(() => {
    const dots: ViewerDot[] = [];
    const count = 25;
    
    for (let i = 0; i < count; i++) {
      // Random spherical coordinates
      const theta = Math.random() * Math.PI * 2; // longitude
      const phi = Math.acos(2 * Math.random() - 1); // latitude
      
      // Convert to cartesian coordinates on sphere surface
      const radius = 2.05; // Slightly above globe surface
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      dots.push({
        position: [x, y, z],
        delay: Math.random() * 2,
      });
    }
    
    return dots;
  }, []);

  // Auto-rotate globe
  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.002;
    }
    
    // Animate dots pulsing
    if (dotsGroupRef.current) {
      dotsGroupRef.current.children.forEach((dot, index) => {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + viewerDots[index].delay) * 0.5;
        dot.scale.setScalar(scale);
      });
    }
  });

  return (
    <>
      {/* Globe */}
      <Sphere ref={globeRef} args={[2, 64, 64]}>
        <meshStandardMaterial
          color="#1a1a2e"
          wireframe={true}
          wireframeLinewidth={1}
          emissive="#0f3460"
          emissiveIntensity={0.2}
        />
      </Sphere>

      {/* Viewer dots */}
      <group ref={dotsGroupRef}>
        {viewerDots.map((dot, index) => (
          <mesh key={index} position={dot.position}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="#ef4444" />
            {/* Glow effect */}
            <mesh scale={1.5}>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial
                color="#ef4444"
                transparent
                opacity={0.3}
              />
            </mesh>
          </mesh>
        ))}
      </group>

      {/* Ambient light */}
      <ambientLight intensity={0.3} />
      
      {/* Directional light */}
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
    </>
  );
};

export default Globe3D;

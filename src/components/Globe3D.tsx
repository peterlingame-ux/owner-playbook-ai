import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
// Using high-quality NASA Blue Marble Earth texture
const EARTH_TEXTURE_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg';

interface ViewerDot {
  position: [number, number, number];
  delay: number;
}

const Globe3D = () => {
  const globeGroupRef = useRef<THREE.Group>(null);
  const dotsGroupRef = useRef<THREE.Group>(null);
  
  // Load high-quality earth texture with atmosphere
  const texture = useLoader(THREE.TextureLoader, EARTH_TEXTURE_URL);

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

  // Auto-rotate globe and dots together
  useFrame((state) => {
    const rotationSpeed = 0.002;
    
    // Rotate the entire group (globe + dots) together
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += rotationSpeed;
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
      {/* Group containing globe and dots - rotates together */}
      <group ref={globeGroupRef}>
        {/* Globe with high-quality earth texture */}
        <Sphere args={[2, 128, 128]}>
          <meshStandardMaterial
            map={texture}
            metalness={0.0}
            roughness={0.7}
            emissive={new THREE.Color(0x222222)}
            emissiveIntensity={0.1}
          />
        </Sphere>
        
        {/* Atmospheric glow effect */}
        <Sphere args={[2.02, 64, 64]}>
          <meshBasicMaterial
            color={0x87ceeb}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </Sphere>

        {/* Viewer dots - fixed on globe surface */}
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
      </group>

      {/* Ambient light - increased for better visibility */}
      <ambientLight intensity={0.8} />
      
      {/* Main directional light (sun) - brighter */}
      <directionalLight 
        position={[5, 3, 5]} 
        intensity={2.0}
        castShadow={false}
      />
      
      {/* Fill light from opposite side */}
      <directionalLight 
        position={[-3, -2, -3]} 
        intensity={0.8}
      />
      
      {/* Additional point light for brightness */}
      <pointLight position={[5, 5, 5]} intensity={1.0} distance={15} />
      
      {/* Extra point light for even illumination */}
      <pointLight position={[-5, -5, -5]} intensity={0.6} distance={15} />
    </>
  );
};

export default Globe3D;

import { useNavigate } from "react-router-dom";
import { Trophy, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 3D Football Component
const Football = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.015;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[-2.5, 0, 0]}>
      <icosahedronGeometry args={[0.8, 1]} />
      <meshStandardMaterial 
        color="#ffffff" 
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
};

// Falling Bitcoin Component
const FallingBitcoin = ({ startPosition, delay }: { startPosition: [number, number, number], delay: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialY = startPosition[1];
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime + delay;
      // Falling animation with reset
      meshRef.current.position.y = initialY - ((time * 0.8) % 4);
      // Rotation
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.z = Math.sin(time * 2) * 0.3;
      // Slight horizontal sway
      meshRef.current.position.x = startPosition[0] + Math.sin(time * 1.5) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={startPosition}>
      <cylinderGeometry args={[0.15, 0.15, 0.03, 32]} />
      <meshStandardMaterial 
        color="#f7931a" 
        roughness={0.2}
        metalness={0.8}
        emissive="#f7931a"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

// Bitcoin rain group
const BitcoinRain = () => {
  const bitcoins = useMemo(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      items.push({
        id: i,
        position: [
          (Math.random() - 0.5) * 6 + 2,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 2
        ] as [number, number, number],
        delay: Math.random() * 4
      });
    }
    return items;
  }, []);

  return (
    <>
      {bitcoins.map((bitcoin) => (
        <FallingBitcoin 
          key={bitcoin.id} 
          startPosition={bitcoin.position} 
          delay={bitcoin.delay}
        />
      ))}
    </>
  );
};

// 3D Scene
const Scene3D = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#4f9eff" />
      <pointLight position={[5, -5, 5]} intensity={0.3} color="#f7931a" />
      
      <Suspense fallback={null}>
        <Football />
        <BitcoinRain />
      </Suspense>
    </Canvas>
  );
};

const CryptoTicker = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden">
      {/* Main Banner */}
      <div className="relative min-h-[220px] sm:min-h-[260px] lg:min-h-[300px] bg-gradient-to-br from-[#0a1628] via-[#0d2847] to-[#0a1628]">
        {/* 3D Scene */}
        <Scene3D />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-[#f7931a]/10"/>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"/>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}/>
          
          {/* Floating particles */}
          <div className="absolute top-10 left-[20%] w-2 h-2 bg-primary/40 rounded-full animate-float"/>
          <div className="absolute top-20 right-[30%] w-3 h-3 bg-[#f7931a]/30 rounded-full animate-float-delayed"/>
          <div className="absolute bottom-10 left-[40%] w-2 h-2 bg-green-400/30 rounded-full animate-float"/>
          <div className="absolute bottom-20 right-[20%] w-1.5 h-1.5 bg-primary/50 rounded-full animate-float-delayed"/>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-10 lg:py-12 flex flex-col items-center justify-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-[#f7931a]/20 border border-primary/30 mb-4 animate-pulse-slow backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-[#f7931a]"/>
            <span className="text-xs sm:text-sm font-semibold text-white/90 tracking-wide">限时活动</span>
            <Sparkles className="w-4 h-4 text-primary"/>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight">
            <span className="bg-gradient-to-r from-white via-primary-foreground to-white bg-clip-text text-transparent drop-shadow-lg">
              免费注册与AI进行竞赛
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-white/80 mb-2 font-medium">
            赢得大奖，展示你的预测能力
          </p>

          {/* Prize Amount */}
          <div className="relative mb-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#f7931a] animate-bounce-slow"/>
              <span className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black">
                <span className="bg-gradient-to-r from-[#f7931a] via-yellow-400 to-[#f7931a] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(247,147,26,0.5)]">
                  $1,000,000
                </span>
              </span>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#f7931a] animate-bounce-slow"/>
            </div>
            <p className="text-sm sm:text-base text-white/60 mt-1 font-medium tracking-wider">
              最高奖金
            </p>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="relative overflow-hidden bg-gradient-to-r from-primary via-primary to-[#f7931a] hover:from-primary/90 hover:to-[#f7931a]/90 text-white font-bold px-8 sm:px-10 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:shadow-[0_0_40px_rgba(var(--primary),0.6)] transition-all duration-300 hover:scale-105 z-20"
          >
            <Zap className="w-5 h-5 mr-2"/>
            立即免费注册
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] animate-shimmer"/>
          </Button>

          {/* Bottom text */}
          <p className="mt-4 text-xs sm:text-sm text-white/50">
            无需支付任何费用 • 与顶级AI模型同台竞技
          </p>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent z-10"/>
      </div>
    </div>
  );
};

export default CryptoTicker;
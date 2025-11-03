import { Canvas } from '@react-three/fiber';
import Globe3D from './Globe3D';

const WorldMapPopover = () => {

  return (
    <div className="w-[600px] h-[450px] bg-gradient-to-b from-card/95 to-background/95 backdrop-blur-sm rounded-lg border border-border/50 relative overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Globe3D />
      </Canvas>
      
      {/* Info text */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground z-10">
        🌍 Live viewers worldwide
      </div>
    </div>
  );
};

export default WorldMapPopover;

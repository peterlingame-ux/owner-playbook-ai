import { useEffect, useState } from "react";

interface ViewerLocation {
  x: number;
  y: number;
  id: number;
}

const WorldMapPopover = () => {
  const [locations, setLocations] = useState<ViewerLocation[]>([]);

  useEffect(() => {
    // Generate random viewing locations
    const generateLocations = () => {
      const newLocations: ViewerLocation[] = [];
      const count = 15 + Math.floor(Math.random() * 10);
      
      for (let i = 0; i < count; i++) {
        newLocations.push({
          x: Math.random() * 100,
          y: 20 + Math.random() * 60,
          id: i,
        });
      }
      
      setLocations(newLocations);
    };

    generateLocations();
    const interval = setInterval(generateLocations, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-[500px] h-[300px] bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      
      {/* World Map SVG Simplified */}
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 150,150 L 180,140 L 220,145 L 250,155 L 280,150 L 310,160 L 340,155 L 370,165 L 400,160 L 420,155 L 440,160 L 460,165 L 480,160 L 500,165 L 520,170 L 540,165 L 560,170 L 580,175 L 600,170 L 620,175 L 640,180 L 660,175 L 680,180 L 700,185 L 720,180 L 740,185 L 760,190 L 780,185 L 800,190 L 820,195 L 840,190 L 850,185
          M 140,180 L 160,190 L 180,185 L 200,190 L 220,195 L 240,190 L 260,195 L 280,200 L 300,195 L 320,200 L 340,205 L 360,200 L 380,205 L 400,210 L 420,205 L 440,210 L 460,215 L 480,210 L 500,215 L 520,220 L 540,215 L 560,220 L 580,225 L 600,220 L 620,225 L 640,230 L 660,225 L 680,230 L 700,235 L 720,230 L 740,235 L 760,240 L 780,235 L 800,240 L 820,245 L 840,240 L 860,235
          M 130,220 L 150,230 L 170,225 L 190,230 L 210,235 L 230,230 L 250,235 L 270,240 L 290,235 L 310,240 L 330,245 L 350,240 L 370,245 L 390,250 L 410,245 L 430,250 L 450,255 L 470,250 L 490,255 L 510,260 L 530,255 L 550,260 L 570,265 L 590,260 L 610,265 L 630,270 L 650,265 L 670,270 L 690,275 L 710,270 L 730,275 L 750,280 L 770,275 L 790,280 L 810,285 L 830,280 L 850,285 L 870,280"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground/50"
        />
        
        {/* Continents simplified shapes */}
        <ellipse cx="200" cy="200" rx="60" ry="40" fill="currentColor" className="text-foreground/20" />
        <ellipse cx="350" cy="220" rx="80" ry="50" fill="currentColor" className="text-foreground/20" />
        <ellipse cx="550" cy="240" rx="90" ry="60" fill="currentColor" className="text-foreground/20" />
        <ellipse cx="750" cy="260" rx="70" ry="45" fill="currentColor" className="text-foreground/20" />
        <ellipse cx="450" cy="350" rx="60" ry="40" fill="currentColor" className="text-foreground/20" />
        <ellipse cx="180" cy="320" rx="50" ry="35" fill="currentColor" className="text-foreground/20" />
      </svg>

      {/* Animated viewing location dots */}
      {locations.map((location) => (
        <div
          key={location.id}
          className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${location.x}%`,
            top: `${location.y}%`,
            animation: `pulse 2s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          <div className="absolute inset-0 bg-destructive rounded-full animate-ping opacity-75" />
          <div className="absolute inset-0 bg-destructive rounded-full" />
        </div>
      ))}

      {/* Info text */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
        Live viewers worldwide
      </div>
    </div>
  );
};

export default WorldMapPopover;

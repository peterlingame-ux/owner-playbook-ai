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
    <div className="w-[600px] h-[350px] bg-card/95 backdrop-blur-sm rounded-lg border border-border/50 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-info/10 to-transparent" />
      
      {/* World Map SVG - More detailed continents */}
      <svg
        viewBox="0 0 2000 1000"
        className="w-full h-full absolute inset-0 opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* North America */}
        <path
          d="M 200,200 L 220,180 L 240,185 L 260,175 L 280,180 L 300,170 L 320,175 L 340,165 L 360,170 L 380,175 L 400,180 L 420,190 L 440,200 L 460,210 L 480,220 L 500,230 L 520,240 L 540,250 L 560,260 L 580,270 L 600,280 L 620,290 L 640,300 L 620,320 L 600,330 L 580,340 L 560,350 L 540,360 L 520,370 L 500,380 L 480,390 L 460,400 L 440,410 L 420,420 L 400,430 L 380,440 L 360,450 L 340,460 L 320,470 L 300,460 L 280,450 L 260,440 L 240,430 L 220,420 L 200,410 L 180,400 L 160,390 L 140,380 L 120,370 L 100,360 L 80,350 L 60,340 L 80,320 L 100,300 L 120,280 L 140,260 L 160,240 L 180,220 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/30"
        />
        
        {/* South America */}
        <path
          d="M 480,500 L 500,490 L 520,495 L 540,505 L 560,515 L 580,525 L 600,535 L 620,545 L 640,555 L 660,565 L 680,575 L 700,585 L 720,595 L 740,605 L 760,615 L 780,625 L 800,635 L 820,645 L 840,655 L 860,665 L 880,675 L 900,685 L 880,695 L 860,705 L 840,715 L 820,725 L 800,735 L 780,745 L 760,755 L 740,765 L 720,775 L 700,785 L 680,795 L 660,805 L 640,795 L 620,785 L 600,775 L 580,765 L 560,755 L 540,745 L 520,735 L 500,725 L 480,715 L 460,705 L 440,695 L 420,685 L 400,675 L 380,665 L 360,655 L 340,645 L 360,635 L 380,625 L 400,615 L 420,605 L 440,595 L 460,585 L 480,575 L 500,565 L 520,555 L 500,545 L 480,535 L 460,525 L 480,515 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/30"
        />
        
        {/* Europe */}
        <path
          d="M 900,180 L 920,175 L 940,180 L 960,185 L 980,190 L 1000,195 L 1020,200 L 1040,205 L 1060,210 L 1080,215 L 1100,220 L 1120,225 L 1140,230 L 1160,235 L 1180,240 L 1200,245 L 1220,250 L 1240,255 L 1260,260 L 1280,265 L 1300,270 L 1320,275 L 1340,280 L 1320,290 L 1300,300 L 1280,310 L 1260,320 L 1240,330 L 1220,340 L 1200,350 L 1180,360 L 1160,350 L 1140,340 L 1120,330 L 1100,320 L 1080,310 L 1060,300 L 1040,290 L 1020,280 L 1000,270 L 980,260 L 960,250 L 940,240 L 920,230 L 900,220 L 880,210 L 860,200 L 880,190 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/30"
        />
        
        {/* Africa */}
        <path
          d="M 880,350 L 900,360 L 920,370 L 940,380 L 960,390 L 980,400 L 1000,410 L 1020,420 L 1040,430 L 1060,440 L 1080,450 L 1100,460 L 1120,470 L 1140,480 L 1160,490 L 1180,500 L 1200,510 L 1220,520 L 1240,530 L 1260,540 L 1280,550 L 1300,560 L 1320,570 L 1340,580 L 1360,590 L 1380,600 L 1400,610 L 1420,620 L 1440,630 L 1460,640 L 1480,650 L 1460,660 L 1440,670 L 1420,680 L 1400,690 L 1380,700 L 1360,710 L 1340,720 L 1320,730 L 1300,740 L 1280,750 L 1260,740 L 1240,730 L 1220,720 L 1200,710 L 1180,700 L 1160,690 L 1140,680 L 1120,670 L 1100,660 L 1080,650 L 1060,640 L 1040,630 L 1020,620 L 1000,610 L 980,600 L 960,590 L 940,580 L 920,570 L 900,560 L 880,550 L 860,540 L 840,530 L 820,520 L 800,510 L 780,500 L 760,490 L 740,480 L 760,470 L 780,460 L 800,450 L 820,440 L 840,430 L 860,420 L 880,410 L 900,400 L 880,390 L 860,380 L 880,370 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/30"
        />
        
        {/* Asia */}
        <path
          d="M 1200,150 L 1220,145 L 1240,150 L 1260,155 L 1280,160 L 1300,165 L 1320,170 L 1340,175 L 1360,180 L 1380,185 L 1400,190 L 1420,195 L 1440,200 L 1460,205 L 1480,210 L 1500,215 L 1520,220 L 1540,225 L 1560,230 L 1580,235 L 1600,240 L 1620,245 L 1640,250 L 1660,255 L 1680,260 L 1700,265 L 1720,270 L 1740,275 L 1760,280 L 1780,285 L 1800,290 L 1820,295 L 1840,300 L 1860,305 L 1880,310 L 1900,315 L 1920,320 L 1940,325 L 1920,335 L 1900,345 L 1880,355 L 1860,365 L 1840,375 L 1820,385 L 1800,395 L 1780,405 L 1760,415 L 1740,425 L 1720,435 L 1700,445 L 1680,455 L 1660,465 L 1640,475 L 1620,485 L 1600,495 L 1580,505 L 1560,515 L 1540,525 L 1520,535 L 1500,545 L 1480,535 L 1460,525 L 1440,515 L 1420,505 L 1400,495 L 1380,485 L 1360,475 L 1340,465 L 1320,455 L 1300,445 L 1280,435 L 1260,425 L 1240,415 L 1220,405 L 1200,395 L 1180,385 L 1160,375 L 1140,365 L 1160,355 L 1180,345 L 1200,335 L 1220,325 L 1240,315 L 1260,305 L 1280,295 L 1300,285 L 1320,275 L 1340,265 L 1360,255 L 1340,245 L 1320,235 L 1300,225 L 1280,215 L 1260,205 L 1240,195 L 1220,185 L 1200,175 L 1180,165 L 1200,160 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/30"
        />
        
        {/* Australia */}
        <path
          d="M 1500,650 L 1520,645 L 1540,650 L 1560,655 L 1580,660 L 1600,665 L 1620,670 L 1640,675 L 1660,680 L 1680,685 L 1700,690 L 1720,695 L 1740,700 L 1760,705 L 1780,710 L 1800,715 L 1820,720 L 1840,725 L 1860,730 L 1880,735 L 1900,740 L 1880,750 L 1860,760 L 1840,770 L 1820,780 L 1800,790 L 1780,800 L 1760,810 L 1740,820 L 1720,830 L 1700,840 L 1680,850 L 1660,840 L 1640,830 L 1620,820 L 1600,810 L 1580,800 L 1560,790 L 1540,780 L 1520,770 L 1500,760 L 1480,750 L 1460,740 L 1440,730 L 1420,720 L 1440,710 L 1460,700 L 1480,690 L 1500,680 L 1480,670 L 1500,660 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          className="text-foreground/30"
        />
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

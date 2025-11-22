import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import WorldMapPopover from "./WorldMapPopover";

const OnlineUsers = () => {
  const { t } = useTranslation();
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    // Simulate online users count with random fluctuation (1000-5000)
    const updateOnlineCount = () => {
      // 生成 1000 到 5000 之间的随机数
      const min = 1000;
      const max = 5000;
      const randomCount = Math.floor(Math.random() * (max - min + 1)) + min;
      setOnlineCount(randomCount);
    };

    // Initial update
    updateOnlineCount();

    // Update every 5 seconds
    const interval = setInterval(updateOnlineCount, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Badge 
          variant="outline" 
          className="bg-success/10 text-success border-success/30 px-1.5 sm:px-3 py-1 sm:py-1.5 gap-1 sm:gap-2 cursor-pointer hover:bg-success/20 transition-colors flex items-center min-w-0 flex-shrink-0"
        >
          <div className="relative w-2 h-2 flex-shrink-0 mr-0.5">
            <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)'
            }} />
            <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
          </div>
          <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="font-bold font-mono-data text-[10px] sm:text-sm">{onlineCount.toLocaleString()}</span>
          <span className="text-[9px] sm:text-xs">{t('users_watching')}</span>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto p-0 border-0 bg-transparent shadow-2xl">
        <WorldMapPopover />
      </HoverCardContent>
    </HoverCard>
  );
};

export default OnlineUsers;

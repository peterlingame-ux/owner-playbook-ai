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
    // Simulate online users count with random fluctuation
    const updateOnlineCount = () => {
      const baseCount = 1247;
      const variation = Math.floor(Math.random() * 100) - 50;
      setOnlineCount(baseCount + variation);
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
          className="bg-success/10 text-success border-success/30 px-1.5 sm:px-3 py-1 sm:py-1.5 gap-1 sm:gap-2 animate-pulse cursor-pointer hover:bg-success/20 transition-colors hidden xs:flex"
        >
          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="font-bold font-mono-data text-[10px] sm:text-sm">{onlineCount.toLocaleString()}</span>
          <span className="text-[9px] sm:text-xs hidden sm:inline">{t('users_watching')}</span>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto p-0 border-0 bg-transparent shadow-2xl">
        <WorldMapPopover />
      </HoverCardContent>
    </HoverCard>
  );
};

export default OnlineUsers;

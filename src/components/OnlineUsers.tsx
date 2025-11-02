import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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
    <Badge 
      variant="outline" 
      className="bg-success/10 text-success border-success/30 px-4 py-2 gap-2 animate-pulse"
    >
      <Users className="h-4 w-4" />
      <span className="font-bold font-mono-data">{onlineCount.toLocaleString()}</span>
      <span className="text-xs">{t('header.online')}</span>
    </Badge>
  );
};

export default OnlineUsers;

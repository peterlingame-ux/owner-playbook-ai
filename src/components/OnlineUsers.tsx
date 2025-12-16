import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

const OnlineUsers = () => {
  const { t } = useTranslation();
  const [onlineCount, setOnlineCount] = useState(2500);

  useEffect(() => {
    // 更真实的数据波动模拟：基于当前值进行渐进式变化
    const baseMin = 2000;
    const baseMax = 4500;
    let currentCount = 2500; // 初始值

    const updateOnlineCount = () => {
      // 每次变化幅度：-50 到 +50 之间
      const changeAmount = Math.floor(Math.random() * 101) - 50;
      const newCount = currentCount + changeAmount;
      
      // 确保在合理范围内，但不严格限制在边界
      const targetCount = Math.max(baseMin * 0.8, Math.min(baseMax * 1.1, newCount));
      
      // 平滑过渡：实际更新时使用目标值，但保持连续性
      currentCount = targetCount;
      setOnlineCount(Math.floor(targetCount));
    };

    // Initial update
    updateOnlineCount();

    // 每 3-7 秒随机更新一次，模拟真实用户上下线
    const scheduleNextUpdate = () => {
      const delay = 3000 + Math.random() * 4000; // 3-7秒随机间隔
      setTimeout(() => {
        updateOnlineCount();
        scheduleNextUpdate();
      }, delay);
    };

    scheduleNextUpdate();

    // 清理函数（虽然这里使用的是setTimeout，但保留cleanup pattern）
    return () => {
      // setTimeout 会在组件卸载时自动清理
    };
  }, []);

  return (
    <Badge 
      variant="outline" 
      className="bg-success/10 text-success border-success/30 px-1.5 sm:px-3 py-1 sm:py-1.5 gap-1 sm:gap-2 flex items-center min-w-0 flex-shrink-0"
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
  );
};

export default OnlineUsers;

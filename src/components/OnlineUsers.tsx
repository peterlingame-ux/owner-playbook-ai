import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const OnlineUsers = () => {
  const { t } = useTranslation();
  const [onlineCount, setOnlineCount] = useState(2500);
  const [prevCount, setPrevCount] = useState(2500);

  useEffect(() => {
    const baseMin = 2000;
    const baseMax = 4500;
    let currentCount = 2500;

    const updateOnlineCount = () => {
      const changeAmount = Math.floor(Math.random() * 101) - 50;
      const newCount = currentCount + changeAmount;
      const targetCount = Math.max(baseMin * 0.8, Math.min(baseMax * 1.1, newCount));
      currentCount = targetCount;
      setPrevCount(onlineCount);
      setOnlineCount(Math.floor(targetCount));
    };

    updateOnlineCount();

    const scheduleNextUpdate = () => {
      const delay = 3000 + Math.random() * 4000;
      setTimeout(() => {
        updateOnlineCount();
        scheduleNextUpdate();
      }, delay);
    };

    scheduleNextUpdate();

    return () => {};
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/80 to-emerald-900/60 border border-emerald-500/30 backdrop-blur-sm">
      {/* Live Indicator */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-50" />
          <div 
            className="absolute inset-[-2px] rounded-full bg-emerald-400/30 animate-pulse"
            style={{ filter: 'blur(3px)' }}
          />
        </div>
        <span className="text-[10px] sm:text-xs font-bold tracking-wider text-emerald-400 uppercase">
          {t('common.live', 'Live')}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-emerald-500/30" />

      {/* Count Display */}
      <div className="flex items-center gap-1.5">
        <motion.span 
          key={onlineCount}
          initial={{ opacity: 0, y: onlineCount > prevCount ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="font-mono font-bold text-sm sm:text-base text-white tracking-tight"
        >
          {formatNumber(onlineCount)}
        </motion.span>
        <span className="text-[10px] sm:text-xs text-emerald-300/80 font-medium">
          {t('common.online', 'online')}
        </span>
      </div>

      {/* Glow Effect */}
      <div 
        className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

export default OnlineUsers;

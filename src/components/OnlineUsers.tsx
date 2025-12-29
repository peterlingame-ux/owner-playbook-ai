import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const OnlineUsers = () => {
  const [onlineCount, setOnlineCount] = useState(2500);
  const [prevCount, setPrevCount] = useState(2500);

  // Avatar images from public folder
  const avatars = [
    "/avatars/avatar-1.png",
    "/avatars/avatar-2.png",
    "/avatars/avatar-3.png",
    "/avatars/avatar-4.png",
  ];

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
    <div className="relative flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-emerald-950/80 to-emerald-900/60 border border-emerald-500/30 backdrop-blur-sm">
      {/* Avatar Stack */}
      <div className="flex items-center -space-x-2">
        {avatars.map((avatar, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.5, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="relative"
            style={{ zIndex: avatars.length - index }}
          >
            <img
              src={avatar}
              alt={`User ${index + 1}`}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-emerald-900/80 object-cover"
            />
            {index === 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-emerald-900" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="absolute inset-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping opacity-50" />
        </div>
        <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
          Live
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-3 sm:h-4 bg-emerald-500/30" />

      {/* Count Display */}
      <div className="flex items-center gap-1">
        <motion.span 
          key={onlineCount}
          initial={{ opacity: 0, y: onlineCount > prevCount ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="font-mono font-bold text-xs sm:text-sm text-white tracking-tight"
        >
          {formatNumber(onlineCount)}
        </motion.span>
        <span className="text-[9px] sm:text-[10px] text-emerald-300/80 font-medium hidden sm:inline">
          online
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

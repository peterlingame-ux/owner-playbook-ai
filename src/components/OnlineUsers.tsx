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
    <div className="flex items-center gap-1">
      <motion.span 
        key={onlineCount}
        initial={{ opacity: 0, y: onlineCount > prevCount ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="font-mono font-medium text-xs sm:text-sm text-white tracking-tight"
      >
        {formatNumber(onlineCount)}
      </motion.span>
      <span className="text-xs sm:text-sm text-white">
        online
      </span>
    </div>
  );
};

export default OnlineUsers;

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

// 全局状态：保存在线人数，确保路由切换时保持连续性
let globalOnlineCount: number | null = null;
let globalTimeoutId: NodeJS.Timeout | null = null;
let globalTargetValue: number | null = null;
// 事件系统：用于通知所有组件更新
const updateCallbacks = new Set<(count: number) => void>();

// 通知所有注册的组件更新
const notifyAllComponents = (count: number) => {
  updateCallbacks.forEach(callback => {
    try {
      callback(count);
    } catch (error) {
      console.error('Error in online count update callback:', error);
    }
  });
};

const OnlineUsers = () => {
  const { t } = useTranslation();
  
  // 如果全局状态存在，使用全局值；否则初始化一个随机值
  const getInitialCount = () => {
    if (globalOnlineCount !== null) {
      return globalOnlineCount;
    }
    return Math.floor(Math.random() * 5000) + 1000;
  };
  
  const initialCount = getInitialCount();
  const [onlineCount, setOnlineCount] = useState(initialCount);
  const [prevCount, setPrevCount] = useState(initialCount);
  // 使用 ref 保存当前值，避免依赖问题
  const currentCountRef = useRef(initialCount);

  // 注册更新回调
  useEffect(() => {
    const updateCallback = (count: number) => {
      setOnlineCount(prev => {
        setPrevCount(prev);
        currentCountRef.current = count;
        return Math.floor(count);
      });
    };
    
    updateCallbacks.add(updateCallback);
    
    // 如果全局状态已存在，立即同步
    if (globalOnlineCount !== null) {
      updateCallback(globalOnlineCount);
    }
    
    return () => {
      updateCallbacks.delete(updateCallback);
    };
  }, []);

  useEffect(() => {
    // 如果已经有全局定时器在运行，不重复初始化
    if (globalTimeoutId) {
      return;
    }

    const baseMin = 1000;
    const baseMax = 6000;
    
    // 设置一个目标值，让数值逐渐向目标值靠近，这样可以游走整个范围
    if (globalTargetValue === null) {
      globalTargetValue = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    }
    let targetValue = globalTargetValue;
    
    // 初始化全局状态
    if (globalOnlineCount === null) {
      globalOnlineCount = initialCount;
      currentCountRef.current = initialCount;
    } else {
      currentCountRef.current = globalOnlineCount;
    }

    const updateOnlineCount = () => {
      const current = currentCountRef.current;
      const distance = targetValue - current;
      
      // 如果已经接近目标值（差距小于200），设置新的目标值
      if (Math.abs(distance) < 200) {
        // 随机选择新的目标值，确保能覆盖整个范围
        // 使用加权随机，让目标值更分散
        const range = baseMax - baseMin;
        const segment = Math.floor(Math.random() * 5); // 0-4，分成5段
        const segmentSize = range / 5;
        targetValue = Math.floor(Math.random() * segmentSize) + baseMin + segment * segmentSize;
        globalTargetValue = targetValue;
      }
      
      // 计算变化量：倾向于向目标值移动，但单次变化不超过200
      let changeAmount: number;
      if (Math.abs(distance) > 200) {
        // 距离较远时，更倾向于向目标值移动
        // 70%的概率向目标值移动，30%随机
        if (Math.random() < 0.7) {
          // 向目标值移动，但不超过200
          const maxChange = Math.min(200, Math.abs(distance));
          changeAmount = distance > 0 
            ? Math.floor(Math.random() * maxChange) + 1  // 正向，1-200
            : -(Math.floor(Math.random() * maxChange) + 1); // 负向，-1到-200
        } else {
          // 随机变化，但不超过200
          changeAmount = Math.floor(Math.random() * 401) - 200;
        }
      } else {
        // 接近目标值时，变化更随机，但单次不超过200
        changeAmount = Math.floor(Math.random() * 401) - 200;
      }
      
      // 确保变化量不超过200
      changeAmount = Math.max(-200, Math.min(200, changeAmount));
      
      const newCount = current + changeAmount;
      // 确保新值在 1000-6000 范围内
      const targetCount = Math.max(baseMin, Math.min(baseMax, newCount));
      const roundedCount = Math.floor(targetCount);
      
      // 更新全局状态
      globalOnlineCount = targetCount;
      
      // 通知所有组件更新
      notifyAllComponents(targetCount);
    };

    // 立即执行一次更新
    updateOnlineCount();

    const scheduleNextUpdate = () => {
      // 更新间隔：2-5秒，让变化更频繁
      const delay = 2000 + Math.random() * 3000;
      globalTimeoutId = setTimeout(() => {
        updateOnlineCount();
        scheduleNextUpdate();
      }, delay);
    };

    scheduleNextUpdate();

    // 清理函数：当所有组件都卸载时，清除全局定时器
    return () => {
      // 检查是否还有其他组件在监听
      if (updateCallbacks.size === 0 && globalTimeoutId) {
        clearTimeout(globalTimeoutId);
        globalTimeoutId = null;
      }
    };
  }, []); // 只在组件挂载时初始化一次

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

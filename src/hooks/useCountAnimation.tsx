import { useEffect, useState, useRef } from 'react';

interface UseCountAnimationOptions {
  duration?: number; // 动画持续时间（毫秒）
  startValue?: number; // 起始值
}

export const useCountAnimation = (
  endValue: number,
  options: UseCountAnimationOptions = {}
) => {
  const { duration = 1500, startValue } = options;
  const [count, setCount] = useState<number>(startValue ?? endValue);
  const previousValueRef = useRef<number>(startValue ?? endValue);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    // 保存之前的值作为动画起点
    const start = previousValueRef.current;
    const end = endValue;
    
    // 如果值没有变化，不需要动画
    if (start === end) {
      return;
    }

    startTimeRef.current = undefined;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // 使用easeOutCubic缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = start + (end - start) * easeProgress;
      setCount(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [endValue, duration]);

  return count;
};

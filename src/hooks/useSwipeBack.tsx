import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeBackOptions {
  enabled?: boolean;
  threshold?: number;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

export const useSwipeBack = (options: SwipeBackOptions = {}) => {
  const {
    enabled = true,
    threshold = 100,
    onSwipeStart,
    onSwipeEnd
  } = options;

  const navigate = useNavigate();
  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isValidSwipe = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      currentX.current = touch.clientX;
      
      // Only start swipe if touch starts near the left edge (within 50px)
      if (touch.clientX < 50) {
        isValidSwipe.current = true;
        onSwipeStart?.();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe.current) return;

      const touch = e.touches[0];
      currentX.current = touch.clientX;
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Only allow horizontal swipe (not vertical)
      if (deltaY > 30 && deltaX < 30) {
        isValidSwipe.current = false;
        return;
      }

      if (deltaX > 0 && deltaX < window.innerWidth / 2) {
        setIsSwipingBack(true);
        setSwipeProgress(Math.min(deltaX / threshold, 1));
        
        // Prevent default scrolling
        if (deltaX > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isValidSwipe.current) {
        setIsSwipingBack(false);
        setSwipeProgress(0);
        return;
      }

      const deltaX = currentX.current - touchStartX.current;
      
      if (deltaX > threshold) {
        // Complete the swipe back
        navigate(-1);
      }
      
      setIsSwipingBack(false);
      setSwipeProgress(0);
      isValidSwipe.current = false;
      onSwipeEnd?.();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, navigate, onSwipeStart, onSwipeEnd]);

  return { isSwipingBack, swipeProgress };
};

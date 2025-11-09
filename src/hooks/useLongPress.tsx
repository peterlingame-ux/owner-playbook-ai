import { useCallback, useRef, useState } from 'react';

interface LongPressOptions {
  threshold?: number;
  onLongPress?: (event: React.TouchEvent | React.MouseEvent) => void;
  onPress?: (event: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void;
}

export const useLongPress = (options: LongPressOptions = {}) => {
  const {
    threshold = 500,
    onLongPress,
    onPress,
    onClick
  } = options;

  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();
  const isLongPress = useRef(false);

  const start = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    target.current = event.target;
    isLongPress.current = false;
    setIsLongPressing(false);
    
    onPress?.(event);

    timeout.current = setTimeout(() => {
      isLongPress.current = true;
      setIsLongPressing(true);
      onLongPress?.(event);
      
      // Add haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, threshold);
  }, [onLongPress, onPress, threshold]);

  const clear = useCallback((event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
    timeout.current && clearTimeout(timeout.current);
    setIsLongPressing(false);
    
    // If it wasn't a long press and onClick is defined, trigger it
    if (shouldTriggerClick && !isLongPress.current && onClick) {
      onClick(event);
    }
    
    isLongPress.current = false;
  }, [onClick]);

  return {
    isLongPressing,
    handlers: {
      onMouseDown: start,
      onTouchStart: start,
      onMouseUp: clear,
      onMouseLeave: (e: React.MouseEvent) => clear(e, false),
      onTouchEnd: clear,
      onTouchMove: (e: React.TouchEvent) => {
        // Cancel long press if finger moves too much
        const touch = e.touches[0];
        if (touch) {
          clear(e, false);
        }
      }
    }
  };
};

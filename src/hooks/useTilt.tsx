import { useState, useCallback, useRef, useEffect, MouseEvent, TouchEvent } from 'react';

interface TiltState {
  rotateX: number;
  rotateY: number;
  scale: number;
  glareX: number;
  glareY: number;
  glareOpacity: number;
}

interface UseTiltOptions {
  max?: number; // Max tilt rotation in degrees
  perspective?: number; // Perspective value
  scale?: number; // Scale on hover
  speed?: number; // Transition speed in ms
  easing?: string; // CSS easing function
  glare?: boolean; // Enable glare effect
  maxGlare?: number; // Max glare opacity
  disabled?: boolean; // Disable tilt
}

const defaultOptions: UseTiltOptions = {
  max: 15,
  perspective: 1000,
  scale: 1.02,
  speed: 400,
  easing: 'cubic-bezier(0.03, 0.98, 0.52, 0.99)',
  glare: true,
  maxGlare: 0.3,
  disabled: false,
};

export function useTilt(options: UseTiltOptions = {}) {
  const opts = { ...defaultOptions, ...options };
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });
  const [isHovering, setIsHovering] = useState(false);

  const updateTilt = useCallback(
    (clientX: number, clientY: number) => {
      if (!ref.current || opts.disabled) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate position relative to center (-1 to 1)
      const percentX = (clientX - centerX) / (rect.width / 2);
      const percentY = (clientY - centerY) / (rect.height / 2);

      // Calculate rotation (inverted for natural feel)
      const rotateX = -percentY * opts.max!;
      const rotateY = percentX * opts.max!;

      // Calculate glare position (0-100)
      const glareX = ((clientX - rect.left) / rect.width) * 100;
      const glareY = ((clientY - rect.top) / rect.height) * 100;

      setTilt({
        rotateX,
        rotateY,
        scale: opts.scale!,
        glareX,
        glareY,
        glareOpacity: opts.glare ? opts.maxGlare! : 0,
      });
    },
    [opts.max, opts.scale, opts.glare, opts.maxGlare, opts.disabled]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      updateTilt(e.clientX, e.clientY);
    },
    [updateTilt]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 1) {
        updateTilt(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [updateTilt]
  );

  const handleMouseEnter = useCallback(() => {
    if (!opts.disabled) {
      setIsHovering(true);
    }
  }, [opts.disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      glareX: 50,
      glareY: 50,
      glareOpacity: 0,
    });
  }, []);

  const style = {
    transform: `perspective(${opts.perspective}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
    transition: isHovering 
      ? `transform ${opts.speed! / 4}ms ${opts.easing}` 
      : `transform ${opts.speed}ms ${opts.easing}`,
    transformStyle: 'preserve-3d' as const,
    willChange: 'transform',
  };

  const glareStyle = opts.glare
    ? {
        position: 'absolute' as const,
        inset: 0,
        borderRadius: 'inherit',
        background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,${tilt.glareOpacity}), transparent 60%)`,
        pointerEvents: 'none' as const,
        transition: `opacity ${opts.speed}ms ${opts.easing}`,
        zIndex: 50,
      }
    : null;

  return {
    ref,
    style,
    glareStyle,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onTouchMove: handleTouchMove,
      onTouchStart: handleMouseEnter,
      onTouchEnd: handleMouseLeave,
    },
    isHovering,
  };
}

export default useTilt;

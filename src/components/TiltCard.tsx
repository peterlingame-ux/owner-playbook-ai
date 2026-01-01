import React, { useRef, useState, useCallback, ReactNode, MouseEvent, TouchEvent } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
  maxGlare?: number;
}

const TiltCard = ({
  children,
  className = '',
  onClick,
  disabled = false,
  maxTilt = 12,
  perspective = 1000,
  scale = 1.02,
  speed = 400,
  glare = true,
  maxGlare = 0.25,
}: TiltCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const isMobile = useIsMobile();

  // Disable all tilt effects on mobile for performance
  const effectsDisabled = disabled || isMobile;

  const updateTilt = useCallback(
    (clientX: number, clientY: number) => {
      if (!cardRef.current || effectsDisabled) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate position relative to center (-1 to 1)
      const percentX = (clientX - centerX) / (rect.width / 2);
      const percentY = (clientY - centerY) / (rect.height / 2);

      // Calculate rotation (inverted for natural feel)
      const rotateX = -percentY * maxTilt;
      const rotateY = percentX * maxTilt;

      // Calculate glare position (0-100)
      const glareX = ((clientX - rect.left) / rect.width) * 100;
      const glareY = ((clientY - rect.top) / rect.height) * 100;

      setTilt({ rotateX, rotateY, scale });
      setGlarePos({ x: glareX, y: glareY, opacity: maxGlare });
    },
    [maxTilt, scale, maxGlare, effectsDisabled]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!isMobile) {
        updateTilt(e.clientX, e.clientY);
      }
    },
    [updateTilt, isMobile]
  );

  // Disable touch move tilt on mobile for performance
  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      // Do nothing on mobile - disable tilt effect for performance
    },
    []
  );

  const handleMouseEnter = useCallback(() => {
    if (!effectsDisabled) {
      setIsHovering(true);
    }
  }, [effectsDisabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
    setGlarePos({ x: 50, y: 50, opacity: 0 });
  }, []);

  // Simplified render for mobile - no 3D transforms
  if (isMobile) {
    return (
      <div
        ref={cardRef}
        className={`relative ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
        scale: tilt.scale,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.5,
      }}
      whileHover={effectsDisabled ? {} : { 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' 
      }}
    >
      {/* Content */}
      {children}

      {/* Glare Effect */}
      {glare && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-50 rounded-[inherit] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovering ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, ${glarePos.opacity}), transparent 60%)`,
              transition: isHovering ? 'none' : 'all 0.4s ease-out',
            }}
          />
        </motion.div>
      )}

      {/* Inner Shadow on Hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-40 rounded-[inherit]"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovering ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: 'inset 0 0 30px rgba(255, 255, 255, 0.05)',
        }}
      />

      {/* Border Glow */}
      <motion.div
        className="absolute -inset-px pointer-events-none z-30 rounded-[inherit]"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovering ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.05))',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />
    </motion.div>
  );
};

export default TiltCard;

import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useTranslation } from "react-i18next";
import bannerBg from "@/assets/banner-bg.png";

const CryptoTicker = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const prizeRef = useRef(null);
  const isInView = useInView(prizeRef, { once: true });
  const [startCount, setStartCount] = useState(false);
  
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setStartCount(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isInView]);
  
  const animatedPrize = useCountAnimation(startCount ? 1000000 : 0, { 
    duration: 2000, 
    startValue: 0 
  });
  
  const formatPrize = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`;
  };

  // Generate floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="relative overflow-hidden w-full max-w-full overflow-x-hidden">
      {/* Main Banner */}
      <div className="relative min-h-[260px] sm:min-h-[300px] lg:min-h-[340px] overflow-x-hidden">
        {/* Background Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{ backgroundImage: `url(${bannerBg})`, backgroundPosition: 'center calc(50% + 40px)' }}
        />
        
        {/* Professional gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background"/>
        
        {/* Animated glow orbs */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none"
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.2, 0.4, 0.2],
            scale: [1.2, 1, 1.2],
            x: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/15 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.15, 0.3, 0.15],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 right-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"
        />

        {/* Floating particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-primary/40 pointer-events-none"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ 
              opacity: [0, 0.6, 0],
              y: [-20, -80, -140],
              x: [0, Math.random() * 40 - 20, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Light rays */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-primary/30 via-primary/5 to-transparent"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-0 left-1/3 w-[1px] h-3/4 bg-gradient-to-b from-blue-400/20 via-blue-400/5 to-transparent rotate-12"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute top-0 right-1/3 w-[1px] h-2/3 bg-gradient-to-b from-emerald-400/15 via-emerald-400/5 to-transparent -rotate-12"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        {/* App Download Buttons - Top Right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2 sm:gap-3">
          {/* Google Play Button */}
          <a 
            href="https://play.google.com/store/apps/hunsoccer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-black rounded-md border border-white/20 transition-all duration-300 hover:bg-zinc-900 hover:border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.4),0_0_30px_rgba(34,197,94,0.2)]"
          >
            <div className="transition-transform duration-300 group-hover:scale-110">
              <svg viewBox="0 0 512 512" className="w-4 h-4 sm:w-5 sm:h-5">
                <path fill="#2196F3" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z"/>
                <path fill="#4CAF50" d="M325.3 277.7l-256.5 256c13 6.8 29.7 6.8 42.7 0L399.1 399.1l-73.8-121.4z"/>
                <path fill="#FFC107" d="M486.7 247.2c-7-10.5-17.5-14-31.5-7l-130.9 75.5 73.8 121.4 88.6-51.1c14-8.8 14-21 0-29.8l-88.6-51.1 88.6-51.1c14-7.9 14-20.1 0-28.8z"/>
                <path fill="#F44336" d="M104.6 499L385.4 337.8l-60.1-60.1L47 512c13 6.8 29.7 6.8 42.7 0l14.9-13z"/>
              </svg>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[7px] text-white/70 leading-tight uppercase tracking-wide">GET IT ON</span>
              <span className="text-[10px] font-medium text-white leading-tight">Google Play</span>
            </div>
          </a>

          {/* App Store Button */}
          <a 
            href="https://apps.apple.com/app/hunsoccer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-black rounded-md border border-white/20 transition-all duration-300 hover:bg-zinc-900 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.4),0_0_30px_rgba(59,130,246,0.2)]"
          >
            <svg viewBox="0 0 384 512" className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-transform duration-300 group-hover:scale-110" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            <div className="hidden sm:flex flex-col">
              <span className="text-[7px] text-white/70 leading-tight">Available on the</span>
              <span className="text-[10px] font-medium text-white leading-tight">App Store</span>
            </div>
          </a>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-10 sm:py-12 lg:py-14 flex flex-col items-center justify-center text-center">

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-2 leading-tight max-w-3xl tracking-tight"
          >
            {t('banner_title')}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl"
          >
            {t('banner_subtitle')}
          </motion.p>

          {/* Prize Amount */}
          <motion.div 
            ref={prizeRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="relative mb-6"
          >
            {/* Falling gold coins */}
            {Array.from({ length: 12 }, (_, i) => (
              <motion.div
                key={`coin-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${10 + (i % 6) * 16}%`,
                  top: '-20px',
                }}
                initial={{ y: -20, opacity: 0, rotateY: 0 }}
                animate={{ 
                  y: [0, 120, 140],
                  opacity: [0, 1, 0],
                  rotateY: [0, 360, 720],
                  x: [0, (i % 2 === 0 ? 10 : -10), 0],
                }}
                transition={{ 
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeIn",
                }}
              >
                <div 
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 shadow-lg"
                  style={{
                    boxShadow: '0 0 8px rgba(251,191,36,0.6), inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3)',
                  }}
                >
                  <div className="w-full h-full rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-yellow-900/70">
                    $
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Golden glow effect */}
            <motion.div 
              className="absolute inset-0 -inset-y-4 bg-gradient-to-r from-yellow-500/20 via-amber-400/30 to-yellow-500/20 blur-2xl rounded-full"
              style={{ left: '-2rem', right: '-2rem' }}
              animate={{ 
                opacity: [0.4, 0.7, 0.4],
                scale: [0.95, 1.05, 0.95],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute inset-0 -inset-y-2 bg-amber-400/20 blur-xl rounded-full"
              style={{ left: '-1rem', right: '-1rem' }}
              animate={{ 
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <div className="relative flex flex-col items-center gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium tracking-widest uppercase">{t('max_prize')}</span>
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                {formatPrize(animatedPrize)}
              </span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Button 
              onClick={() => navigate('/auth')}
              size="lg"
              className="group relative bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 py-3 text-base rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              {t('join_competition')}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"/>
            </Button>
          </motion.div>

          {/* Bottom text */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-6 flex items-center gap-4 text-xs sm:text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-500"/>
              {t('free_to_join')}
            </span>
            <span className="w-px h-3 bg-border"/>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-500"/>
              {t('no_deposit')}
            </span>
            <span className="w-px h-3 bg-border"/>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-500"/>
              {t('fair_competition')}
            </span>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent"/>
      </div>
    </div>
  );
};

export default CryptoTicker;

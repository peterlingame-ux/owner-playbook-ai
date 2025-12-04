import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import bannerBg from "@/assets/banner-bg.png";

const CryptoTicker = () => {
  const navigate = useNavigate();
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
    <div className="relative overflow-hidden">
      {/* Main Banner */}
      <div className="relative min-h-[260px] sm:min-h-[300px] lg:min-h-[340px]">
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

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-10 sm:py-12 lg:py-14 flex flex-col items-center justify-center text-center">

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-2 leading-tight max-w-3xl tracking-tight"
          >
            与顶级AI模型同台竞技
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl"
          >
            展示你的预测能力，挑战人工智能，赢取丰厚奖金
          </motion.p>

          {/* Prize Amount */}
          <motion.div 
            ref={prizeRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="relative mb-6"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium tracking-widest uppercase">最高奖金</span>
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]">
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
              立即参与竞赛
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
              免费参与
            </span>
            <span className="w-px h-3 bg-border"/>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-500"/>
              无需充值
            </span>
            <span className="w-px h-3 bg-border"/>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-500"/>
              公平竞技
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

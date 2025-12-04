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

  return (
    <div className="relative overflow-hidden">
      {/* Main Banner */}
      <div className="relative min-h-[220px] sm:min-h-[260px] lg:min-h-[300px]">
        {/* Background Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.2, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{ backgroundImage: `url(${bannerBg})`, backgroundPosition: 'center calc(50% + 40px)' }}
        />
        
        {/* Professional gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background"/>
        
        {/* Accent glow effects - Subtle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-foreground/5 rounded-full blur-[120px] pointer-events-none"
        />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-10 sm:py-12 lg:py-14 flex flex-col items-center justify-center text-center">

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-3"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>
              全球足球预测挑战赛
            </span>
          </motion.div>

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
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-foreground">
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

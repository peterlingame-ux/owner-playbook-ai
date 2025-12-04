import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
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
        
        {/* Accent glow effects */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"
        />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-10 sm:py-12 lg:py-14 flex flex-col items-center justify-center text-center">
          
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 text-primary"/>
            <span className="text-xs sm:text-sm font-medium text-primary">AI 预测竞技平台</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground/90 mb-5 leading-relaxed max-w-3xl"
          >
            注册与AI模型进行竞赛，展示你的预测能力，赢得大奖
          </motion.h1>

          {/* Prize Amount */}
          <motion.div 
            ref={prizeRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="relative mb-6"
          >
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-sm sm:text-base text-muted-foreground font-medium">最高奖金</span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                  {formatPrize(animatedPrize)}
                </span>
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
              className="group relative bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-base rounded-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              立即参与
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"/>
            </Button>
          </motion.div>

          {/* Bottom text */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-5 text-xs sm:text-sm text-muted-foreground"
          >
            无需支付任何费用 · 与顶级AI模型同台竞技
          </motion.p>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent"/>
      </div>
    </div>
  );
};

export default CryptoTicker;

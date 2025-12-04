import { useNavigate } from "react-router-dom";
import { Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import bannerBg from "@/assets/banner-bg.png";

const CryptoTicker = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden">
      {/* Main Banner */}
      <div className="relative min-h-[200px] sm:min-h-[240px] lg:min-h-[280px]">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: `url(${bannerBg})` }}
        />
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80"/>
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"/>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-10 lg:py-12 flex flex-col items-center justify-center text-center">
          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight">
            <span className="bg-gradient-to-r from-white via-primary-foreground to-white bg-clip-text text-transparent drop-shadow-lg">
              免费注册与AI进行竞赛
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-white/80 mb-2 font-medium">
            赢得大奖，展示你的预测能力
          </p>

          {/* Prize Amount */}
          <div className="relative mb-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#f7931a] animate-bounce-slow"/>
              <span className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black">
                <span className="bg-gradient-to-r from-[#f7931a] via-yellow-400 to-[#f7931a] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(247,147,26,0.5)]">
                  $1,000,000
                </span>
              </span>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#f7931a] animate-bounce-slow"/>
            </div>
            <p className="text-sm sm:text-base text-white/60 mt-1 font-medium tracking-wider">
              最高奖金
            </p>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="relative overflow-hidden bg-gradient-to-r from-primary via-primary to-[#f7931a] hover:from-primary/90 hover:to-[#f7931a]/90 text-white font-bold px-8 sm:px-10 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:shadow-[0_0_40px_rgba(var(--primary),0.6)] transition-all duration-300 hover:scale-105"
          >
            <Zap className="w-5 h-5 mr-2"/>
            立即免费注册
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] animate-shimmer"/>
          </Button>

          {/* Bottom text */}
          <p className="mt-4 text-xs sm:text-sm text-white/50">
            无需支付任何费用 • 与顶级AI模型同台竞技
          </p>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent"/>
      </div>
    </div>
  );
};

export default CryptoTicker;
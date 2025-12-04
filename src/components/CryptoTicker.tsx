import { useNavigate } from "react-router-dom";
import { Trophy, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const CryptoTicker = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden">
      {/* Main Banner */}
      <div className="relative min-h-[200px] sm:min-h-[240px] lg:min-h-[280px] bg-gradient-to-br from-[#0a1628] via-[#0d2847] to-[#0a1628]">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Football pattern */}
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 opacity-10">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-slow">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-white"/>
              <path d="M50 5 L50 95 M5 50 L95 50 M15 15 L85 85 M85 15 L15 85" stroke="currentColor" strokeWidth="1" className="text-white/50"/>
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/30"/>
            </svg>
          </div>
          
          {/* Bitcoin symbol */}
          <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-48 h-48 opacity-15">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f7931a" strokeWidth="3"/>
              <text x="50" y="65" textAnchor="middle" fontSize="40" fontWeight="bold" fill="#f7931a">₿</text>
            </svg>
          </div>
          
          {/* Floating particles */}
          <div className="absolute top-10 left-[20%] w-2 h-2 bg-primary/40 rounded-full animate-float"/>
          <div className="absolute top-20 right-[30%] w-3 h-3 bg-[#f7931a]/30 rounded-full animate-float-delayed"/>
          <div className="absolute bottom-10 left-[40%] w-2 h-2 bg-green-400/30 rounded-full animate-float"/>
          <div className="absolute bottom-20 right-[20%] w-1.5 h-1.5 bg-primary/50 rounded-full animate-float-delayed"/>
          
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-[#f7931a]/10"/>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"/>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}/>
        </div>

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
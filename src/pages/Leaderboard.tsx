import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import PlayerLeaderboardTable from "@/components/PlayerLeaderboardTable";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bot, Users, Zap, Trophy, Star } from "lucide-react";

const Leaderboard = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute bottom-40 right-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl animate-pulse [animation-delay:0.5s]" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Floating icons */}
        <Trophy className="absolute top-32 left-[15%] w-8 h-8 text-primary/10 animate-bounce [animation-duration:3s]" />
        <Star className="absolute top-48 right-[20%] w-6 h-6 text-accent/10 animate-bounce [animation-duration:4s] [animation-delay:0.5s]" />
        <Trophy className="absolute bottom-32 right-[15%] w-10 h-10 text-orange-500/10 animate-bounce [animation-duration:3.5s] [animation-delay:1s]" />
        <Star className="absolute bottom-48 left-[20%] w-7 h-7 text-red-500/10 animate-bounce [animation-duration:4.5s] [animation-delay:1.5s]" />
        
        {/* Diagonal lines decoration */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent transform -skew-x-12" />
          <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-accent/5 to-transparent transform skew-x-12" />
        </div>
      </div>

      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 safe-area-padding relative z-10">
        {/* VS Header - Centered above both tables */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          <div className="relative">
            {/* Pulsing glow rings */}
            <div className="absolute inset-0 animate-ping">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 opacity-20" />
            </div>
            <div className="absolute inset-0 animate-pulse">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 opacity-30 blur-md" />
            </div>
            
            {/* Main VS badge */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-0.5 sm:p-1 shadow-2xl shadow-red-500/50 animate-bounce [animation-duration:2s]">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <div className="relative flex flex-col items-center">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 absolute -top-2 sm:-top-3 animate-pulse" />
                  <span className="text-xl sm:text-2xl font-black bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                    VS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side by side layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* AI Leaderboard - Left Side */}
          <div className="space-y-4">
            {/* Section Header */}
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 overflow-hidden">
              {/* Header glow effect */}
              <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-primary/20 to-transparent blur-xl" />
              <div className="relative flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                  <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-sm sm:text-lg text-primary">{t('ai_leaderboard')}</span>
                  <p className="text-xs text-muted-foreground">{t('all_models')}</p>
                </div>
              </div>
            </div>
            <LeaderboardTable compact />
          </div>
          
          {/* Player Leaderboard - Right Side */}
          <div className="space-y-4">
            {/* Section Header */}
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-l from-accent/10 via-accent/5 to-transparent border border-accent/20 overflow-hidden">
              {/* Header glow effect */}
              <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-accent/20 to-transparent blur-xl" />
              <div className="relative flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/30">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="text-center">
                  <span className="font-bold text-sm sm:text-lg text-accent">{t('player_leaderboard')}</span>
                  <p className="text-xs text-muted-foreground">{t('all_players')}</p>
                </div>
              </div>
            </div>
            <PlayerLeaderboardTable compact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

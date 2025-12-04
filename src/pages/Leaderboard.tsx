import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import PlayerLeaderboardTable from "@/components/PlayerLeaderboardTable";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bot, Users, Zap } from "lucide-react";

const Leaderboard = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 safe-area-padding">
        {/* VS Header */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Bot className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="text-right">
              <span className="font-bold text-base sm:text-xl text-primary">{t('ai_leaderboard')}</span>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('all_models')}</p>
            </div>
          </div>
          
          {/* Animated VS Badge */}
          <div className="relative">
            {/* Pulsing glow rings */}
            <div className="absolute inset-0 animate-ping">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 opacity-20" />
            </div>
            <div className="absolute inset-0 animate-pulse">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 opacity-30 blur-md" />
            </div>
            
            {/* Main VS badge with bounce animation */}
            <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-0.5 sm:p-1 shadow-2xl shadow-red-500/50 animate-bounce [animation-duration:2s]">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <div className="relative flex flex-col items-center">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 absolute -top-2 sm:-top-3 animate-pulse" />
                  <span className="text-lg sm:text-2xl font-black bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                    VS
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-left">
              <span className="font-bold text-base sm:text-xl text-accent">{t('player_leaderboard')}</span>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('all_players')}</p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-accent/10 border border-accent/30">
              <Users className="h-5 w-5 sm:h-7 sm:w-7 text-accent" />
            </div>
          </div>
        </div>

        {/* Side by side layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* AI Leaderboard - Left Side */}
          <div className="space-y-4">
            <LeaderboardTable compact />
          </div>
          
          {/* Player Leaderboard - Right Side */}
          <div className="space-y-4">
            <PlayerLeaderboardTable compact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

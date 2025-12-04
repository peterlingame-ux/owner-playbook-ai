import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import PlayerLeaderboardTable from "@/components/PlayerLeaderboardTable";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bot, Users, Swords } from "lucide-react";

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
        {/* VS Header for mobile */}
        <div className="lg:hidden flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary">AI</span>
          </div>
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
              <span className="text-white font-black text-sm">VS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-accent">玩家</span>
            <Users className="h-5 w-5 text-accent" />
          </div>
        </div>

        {/* Side by side layout on desktop, stacked on mobile */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* VS Divider - Desktop only */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            {/* Top line */}
            <div className="w-px h-24 bg-gradient-to-b from-transparent via-red-500/50 to-red-500" />
            
            {/* VS Badge */}
            <div className="relative my-4">
              {/* Glow effect */}
              <div className="absolute inset-0 blur-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 opacity-60 animate-pulse" />
              
              {/* Outer ring */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-1 shadow-2xl shadow-red-500/40">
                {/* Inner circle */}
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <div className="relative">
                    <Swords className="h-6 w-6 text-red-500 absolute -top-4 left-1/2 -translate-x-1/2 opacity-60" />
                    <span className="text-2xl font-black bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                      VS
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom line */}
            <div className="w-px flex-1 bg-gradient-to-b from-red-500 via-red-500/50 to-transparent" />
          </div>

          {/* AI Leaderboard - Left Side */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold leading-tight">{t('ai_leaderboard')}</h2>
                <p className="text-sm text-muted-foreground">{t('all_models')}</p>
              </div>
            </div>
            <LeaderboardTable />
          </div>
          
          {/* Player Leaderboard - Right Side */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold leading-tight">{t('player_leaderboard')}</h2>
                <p className="text-sm text-muted-foreground">{t('all_players')}</p>
              </div>
            </div>
            <PlayerLeaderboardTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

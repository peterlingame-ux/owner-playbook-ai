import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import PlayerLeaderboardTable from "@/components/PlayerLeaderboardTable";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bot, Users } from "lucide-react";

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
        {/* Side by side layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* AI Leaderboard - Left Side */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-lg bg-primary/10">
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
              <div className="p-2 rounded-lg bg-accent/10">
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

import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import AdCarousel from "@/components/AdCarousel";
import LeaderboardTable from "@/components/LeaderboardTable";
import PlayerLeaderboardTable from "@/components/PlayerLeaderboardTable";
import PlayerCopyTradingBoard from "@/components/PlayerCopyTradingBoard";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Leaderboard = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      
      {/* Ad Carousel Banner */}
      <div className="container mx-auto px-3 sm:px-4 pt-4">
        <AdCarousel />
      </div>
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 safe-area-padding">
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="ai" className="text-xs sm:text-sm">{t('ai_leaderboard')}</TabsTrigger>
            <TabsTrigger value="players" className="text-xs sm:text-sm">{t('player_leaderboard')}</TabsTrigger>
            <TabsTrigger value="copy" className="text-xs sm:text-sm">{t('copy_trading_board') || '玩家跟单排行榜'}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai">
            <h2 className="text-lg sm:text-2xl font-bold mb-4 px-2 leading-tight">{t('all_models')}</h2>
            <LeaderboardTable />
          </TabsContent>
          
          <TabsContent value="players">
            <h2 className="text-lg sm:text-2xl font-bold mb-4 px-2 leading-tight">{t('all_players')}</h2>
            <PlayerLeaderboardTable />
          </TabsContent>
          
          <TabsContent value="copy">
            <h2 className="text-lg sm:text-2xl font-bold mb-4 px-2 leading-tight">{t('copy_trading_board') || '玩家跟单排行榜'}</h2>
            <PlayerCopyTradingBoard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;

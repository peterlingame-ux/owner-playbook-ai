import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";

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
        {/* Leaderboard Table */}
        <div>
          <h2 className="text-lg sm:text-2xl font-bold mb-4 px-2 leading-tight">{t('all_models')}</h2>
          <LeaderboardTable />
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

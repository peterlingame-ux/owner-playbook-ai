import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChallengeAIBanner from "@/components/ChallengeAIBanner";
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
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'copy' ? 'copy' : tabParam === 'ai' ? 'ai' : 'players';
  
  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      
      {/* Challenge AI Banner */}
      <motion.div 
        className="container mx-auto px-2 sm:px-4 pt-3 sm:pt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <ChallengeAIBanner />
      </motion.div>
      
      <motion.div 
        className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 lg:py-8 safe-area-padding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue={defaultTab} className="w-full">
          <motion.div 
            className="flex justify-center mb-4 sm:mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
            <TabsList className="grid grid-cols-3 w-full max-w-md sm:max-w-lg h-8 sm:h-10">
              <TabsTrigger value="ai" className="text-[10px] sm:text-sm px-1 sm:px-4 h-7 sm:h-9">{t('ai_leaderboard')}</TabsTrigger>
              <TabsTrigger value="players" className="text-[10px] sm:text-sm px-1 sm:px-4 h-7 sm:h-9">{t('player_leaderboard')}</TabsTrigger>
              <TabsTrigger value="copy" className="text-[10px] sm:text-sm px-1 sm:px-4 h-7 sm:h-9">{t('copy_trading_board')}</TabsTrigger>
            </TabsList>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          >
            <TabsContent value="ai">
              <LeaderboardTable />
            </TabsContent>
            
            <TabsContent value="players">
              <PlayerLeaderboardTable />
            </TabsContent>
            
            <TabsContent value="copy">
              <PlayerCopyTradingBoard />
            </TabsContent>
          </motion.div>
        </Tabs>
      </motion.div>
      <Footer />
    </div>
  );
};

export default Leaderboard;

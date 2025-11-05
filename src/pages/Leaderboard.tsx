import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import ModelCard from "@/components/ModelCard";
import { aiModels } from "@/data/mockData";

const Leaderboard = () => {
  const { t } = useTranslation();
  
  // Sort models by win rate to get the winner
  const sortedModels = [...aiModels].sort((a, b) => b.winRate - a.winRate);
  const winningModel = sortedModels[0];
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">{t('leaderboard')}</h1>
        
        {/* Winning Model Section */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 bg-gradient-to-r from-primary via-success to-primary bg-clip-text text-transparent">
            🏆 {t('top_performer')}
          </h2>
          <div className="max-w-md mx-auto lg:max-w-lg">
            <ModelCard model={winningModel} />
          </div>
        </div>

        {/* Leaderboard Table */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('all_models')}</h2>
          <LeaderboardTable />
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

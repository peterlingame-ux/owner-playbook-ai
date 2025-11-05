import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import FloatingAIChat from "@/components/FloatingAIChat";
import CryptoTicker from "@/components/CryptoTicker";
import ActiveAIBets from "@/components/ActiveAIBets";
import MatchCenter from "@/components/MatchCenter";
import { aiModels } from "@/data/mockData";

const Index = () => {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  // Sort models by win rate
  const sortedModels = [...aiModels].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Models Section - Horizontal Layout */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white font-pixel tracking-wider text-center">
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {sortedModels.slice(1).map((model) => (
              <ModelCard 
                key={model.id} 
                model={model}
              />
            ))}
          </div>
        </div>

        {/* Performance Chart */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <PerformanceChart 
            onChartClick={() => {
              const element = document.getElementById('match-predictions');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          />
        </div>

        {/* AI Betting Cards - Full Width Section */}
        <div id="match-predictions" className="mb-6 sm:mb-8 scroll-mt-20">
          <ActiveAIBets />
        </div>

        {/* Match Schedule Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white font-pixel tracking-wider text-center">
            {t('match_schedule')}
          </h2>
          <MatchCenter />
        </div>
      </div>
      
      {/* Floating AI Chat */}
      <FloatingAIChat />
    </div>
  );
};

export default Index;

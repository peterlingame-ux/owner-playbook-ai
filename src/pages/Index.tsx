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
      
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-6 lg:py-8">
        {/* Models Section - Mobile Optimized */}
        <div className="mb-4 sm:mb-8 lg:mb-10 min-h-[50vh] sm:min-h-0 flex flex-col justify-center">
          <h2 className="text-base sm:text-xl font-bold mb-4 sm:mb-6 text-white font-pixel tracking-wider text-center uppercase">
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {sortedModels.slice(1).map((model) => (
              <ModelCard 
                key={model.id} 
                model={model}
              />
            ))}
          </div>
        </div>

        {/* Performance Chart - Full Screen on Mobile */}
        <div className="mb-4 sm:mb-8 lg:mb-12 min-h-[100vh] sm:min-h-0 flex items-center">
          <PerformanceChart 
            onChartClick={() => {
              const element = document.getElementById('match-predictions');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          />
        </div>

        {/* AI Betting Cards - 2 Columns on Mobile */}
        <div id="match-predictions" className="mb-4 sm:mb-8 scroll-mt-20 min-h-[100vh] sm:min-h-0 flex flex-col justify-start">
          <ActiveAIBets />
        </div>

        {/* Match Schedule Section - Full Screen on Mobile */}
        <div className="mb-4 sm:mb-8 min-h-[100vh] sm:min-h-0 flex flex-col justify-start">
          <h2 className="text-base sm:text-xl font-bold mb-4 sm:mb-6 text-white font-pixel tracking-wider text-center uppercase">
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

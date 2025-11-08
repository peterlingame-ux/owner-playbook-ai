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
        {/* Models Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-foreground tracking-wide sm:tracking-wider text-center uppercase px-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ fontWeight: 700 }}>
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
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

        {/* AI Betting Cards */}
        <div id="match-predictions" className="mb-6 sm:mb-8 scroll-mt-20">
          <ActiveAIBets />
        </div>

        {/* Match Schedule Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-6 text-foreground font-pixel tracking-wide sm:tracking-wider text-center uppercase px-4">
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

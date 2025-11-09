import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import CryptoTicker from "@/components/CryptoTicker";
import ActiveAIBets from "@/components/ActiveAIBets";
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
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 safe-area-padding">
        {/* Models Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-foreground tracking-wide sm:tracking-wider text-center uppercase px-2 sm:px-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-tight" style={{ fontWeight: 700 }}>
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
            {sortedModels.map((model) => (
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
      </div>
    </div>
  );
};

export default Index;

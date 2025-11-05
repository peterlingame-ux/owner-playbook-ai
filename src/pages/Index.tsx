import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import ChatBot from "@/components/ChatBot";
import FloatingChat from "@/components/FloatingChat";
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
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            <PerformanceChart />
            {/* HUNSOCCER ChatBot */}
            <div className="h-[500px]">
              <ChatBot />
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4">
            {/* Models Section */}
            <div>
              <h2 className="text-lg font-bold mb-4 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent font-pixel">
                {t('the_contestants')}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {sortedModels.slice(1).map((model) => (
                  <ModelCard 
                    key={model.id} 
                    model={model}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Betting Cards - Full Width Section */}
        <div className="mb-6 sm:mb-8">
          <ActiveAIBets />
        </div>
      </div>
      
      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
};

export default Index;

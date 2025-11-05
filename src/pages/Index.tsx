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
        {/* Hero Section - Performance Chart */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <PerformanceChart />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-6 sm:mb-8 lg:mb-12">
          {/* Left Column - ChatBot */}
          <div className="order-2 lg:order-1">
            <div className="h-[600px] lg:h-[700px]">
              <ChatBot />
            </div>
          </div>

          {/* Right Column - Models Section */}
          <div className="order-1 lg:order-2">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent font-pixel tracking-wider">
                {t('the_contestants')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
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

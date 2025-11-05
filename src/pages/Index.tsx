import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import MatchCenter from "@/components/MatchCenter";
import FloatingChat from "@/components/FloatingChat";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import ActivePredictions from "@/components/ActivePredictions";
import ActiveAIBets from "@/components/ActiveAIBets";
import { aiModels } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("leaderboard");
  
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
            {/* Match Center - Integrated Schedule and Chat */}
            <MatchCenter />
          </div>
          <div className="lg:col-span-1 space-y-3">
            {/* AI Betting Cards Section */}
            <ActiveAIBets />
          </div>
        </div>

        {/* Models Section - Full Width */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg font-bold mb-3 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent font-pixel">
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedModels.slice(1).map((model) => (
              <ModelCard 
                key={model.id} 
                model={model}
              />
            ))}
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6 sm:mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="leaderboard" className="text-xs sm:text-sm">{t('leaderboard')}</TabsTrigger>
            <TabsTrigger value="positions" className="text-xs sm:text-sm">{t('positions')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="leaderboard">
            <LeaderboardTable />
          </TabsContent>
          
          <TabsContent value="positions">
            <ActivePredictions />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
};

export default Index;

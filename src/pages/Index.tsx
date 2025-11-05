import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import AIChat from "@/components/AIChat";
import MatchSchedule from "@/components/MatchSchedule";
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
            {/* AI Chat and Match Schedule - Split in Half */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIChat />
              <MatchSchedule />
            </div>
          </div>
          <div className="lg:col-span-1 space-y-3">
            {/* Models Section */}
            <div>
              <h2 className="text-lg font-bold mb-3 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent font-pixel">
                {t('the_contestants')}
              </h2>
              <div className="grid grid-cols-1 gap-2">
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
    </div>
  );
};

export default Index;

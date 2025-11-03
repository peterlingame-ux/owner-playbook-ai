import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import LiveMatches from "@/components/LiveMatches";
import AIChat from "@/components/AIChat";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import ActivePredictions from "@/components/ActivePredictions";
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
      
      <div className="container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-8">
            <PerformanceChart />
            {/* AI Chat Section below performance chart */}
            <AIChat />
          </div>
          <div className="flex flex-col">
            <LiveMatches />
          </div>
        </div>

        {/* Models Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-info to-primary bg-clip-text text-transparent animate-gradient">
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedModels.map((model) => (
              <ModelCard 
                key={model.id} 
                model={model}
              />
            ))}
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="leaderboard">{t('leaderboard')}</TabsTrigger>
            <TabsTrigger value="positions">{t('positions')}</TabsTrigger>
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

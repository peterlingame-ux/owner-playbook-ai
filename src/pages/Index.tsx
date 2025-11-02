import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import LiveMatches from "@/components/LiveMatches";
import AIChat from "@/components/AIChat";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import FloatingChatButton from "@/components/FloatingChatButton";
import ActivePredictions from "@/components/ActivePredictions";
import { aiModels } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("leaderboard");
  
  const handleChatClick = () => {
    setActiveTab("chat");
    // Scroll to tabs section
    setTimeout(() => {
      const tabsElement = document.querySelector('[role="tabpanel"]');
      if (tabsElement) {
        tabsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };
  
  // Sort models by win rate
  const sortedModels = [...aiModels].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
            {/* AI Chat Section below performance chart */}
            <div className="mt-8">
              <AIChat />
            </div>
          </div>
          <div>
            <LiveMatches />
          </div>
        </div>

        {/* Models Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">{t('the_contestants')}</h2>
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="leaderboard">{t('leaderboard')}</TabsTrigger>
            <TabsTrigger value="chat">{t('model_chat')}</TabsTrigger>
            <TabsTrigger value="positions">{t('positions')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="leaderboard">
            <LeaderboardTable />
          </TabsContent>
          
          <TabsContent value="chat">
            <AIChat />
          </TabsContent>
          
          <TabsContent value="positions">
            <ActivePredictions />
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{t('better_benchmark')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('better_benchmark_text1')}
            </p>
            <p className="text-muted-foreground mb-4">
              {t('better_benchmark_text2')}
            </p>
            <p className="text-foreground font-bold">
              {t('better_benchmark_text3')}
            </p>
          </div>
          
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{t('owner_based_analysis')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('owner_based_text1')}
            </p>
            <p className="text-muted-foreground">
              {t('owner_based_text2')}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>{t('owner_consideration_1')}</li>
              <li>{t('owner_consideration_2')}</li>
              <li>{t('owner_consideration_3')}</li>
              <li>{t('owner_consideration_4')}</li>
              <li>{t('owner_consideration_5')}</li>
            </ul>
            <p className="text-foreground font-bold mt-4">
              {t('owner_based_text3')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Floating Chat Button */}
      <FloatingChatButton onClick={handleChatClick} />
    </div>
  );
};

export default Index;

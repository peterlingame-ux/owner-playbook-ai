import { useState } from "react";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import LiveMatches from "@/components/LiveMatches";
import AIChat from "@/components/AIChat";
import CryptoTicker from "@/components/CryptoTicker";
import LeaderboardTable from "@/components/LeaderboardTable";
import { aiModels } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  
  // Sort models by win rate
  const sortedModels = [...aiModels].sort((a, b) => b.winRate - a.winRate);
  const topModel = sortedModels[0];
  const lowestModel = sortedModels[sortedModels.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-4 py-8">
        {/* Top Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('home.highestWinRate').toUpperCase()}</p>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="font-bold"
                  style={{ color: `hsl(var(--${topModel.color}))` }}
                >
                  {topModel.displayName}
                </span>
                <span className="text-success font-mono-data text-sm">{topModel.winRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono-data">{topModel.correctPredictions}/{topModel.totalPredictions}</p>
              <p className="text-xs text-muted-foreground">{t('home.correctPredictions')}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-l border-border pl-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('home.lowestWinRate').toUpperCase()}</p>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="font-bold"
                  style={{ color: `hsl(var(--${lowestModel.color}))` }}
                >
                  {lowestModel.displayName}
                </span>
                <span className="text-destructive font-mono-data text-sm">{lowestModel.winRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono-data">{lowestModel.correctPredictions}/{lowestModel.totalPredictions}</p>
              <p className="text-xs text-muted-foreground">{t('home.correctPredictions')}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <LiveMatches />
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="leaderboard" className="mb-8">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="leaderboard">{t('tabs.leaderboard').toUpperCase()}</TabsTrigger>
            <TabsTrigger value="models">{t('tabs.allModels').toUpperCase()}</TabsTrigger>
            <TabsTrigger value="completed">{t('tabs.completedTrades').toUpperCase()}</TabsTrigger>
            <TabsTrigger value="chat">{t('tabs.modelChat').toUpperCase()}</TabsTrigger>
            <TabsTrigger value="positions">{t('tabs.positions').toUpperCase()}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="leaderboard">
            <LeaderboardTable />
          </TabsContent>
          
          <TabsContent value="models" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">{t('home.contestants')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedModels.map((model) => (
                  <ModelCard 
                    key={model.id} 
                    model={model}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="completed">
            <div className="text-center py-12 text-muted-foreground">
              <p>{t('placeholders.completedTrades')}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="chat">
            <AIChat />
          </TabsContent>
          
          <TabsContent value="positions">
            <div className="text-center py-12 text-muted-foreground">
              <p>{t('placeholders.positions')}</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{t('home.betterBenchmark.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('home.betterBenchmark.description1')}
            </p>
            <p className="text-muted-foreground mb-4">
              {t('home.betterBenchmark.description2')}
            </p>
            <p className="text-foreground font-bold">
              {t('home.betterBenchmark.conclusion')}
            </p>
          </div>
          
          <div className="p-8 bg-card border border-border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{t('home.ownerAnalysis.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('home.ownerAnalysis.description1')}
            </p>
            <p className="text-muted-foreground">
              {t('home.ownerAnalysis.description2')}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>{t('home.ownerAnalysis.factors.financial')}</li>
              <li>{t('home.ownerAnalysis.factors.business')}</li>
              <li>{t('home.ownerAnalysis.factors.health')}</li>
              <li>{t('home.ownerAnalysis.factors.family')}</li>
              <li>{t('home.ownerAnalysis.factors.media')}</li>
            </ul>
            <p className="text-foreground font-bold mt-4">
              {t('home.ownerAnalysis.conclusion')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

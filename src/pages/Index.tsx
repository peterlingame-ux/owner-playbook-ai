import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import UserModelCard from "@/components/UserModelCard";
import CryptoTicker from "@/components/CryptoTicker";
import ActiveAIBets from "@/components/ActiveAIBets";
import Disclaimer from "@/components/Disclaimer";
import { aiModels } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { AIModel } from "@/types/prediction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelsWithRealData, setModelsWithRealData] = useState<AIModel[]>(aiModels);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  
  // Real-time stats for video section - AI monitoring data
  const [liveStats, setLiveStats] = useState({
    // 球员追踪
    trackedPlayers: 22,
    homeFormation: '4-3-3',
    awayFormation: '3-5-2',
    // 跑动数据
    totalDistance: 8.7,
    sprintSpeed: 34.2,
    // 控球分析
    possession: 58,
    passAccuracy: 89,
    // AI预测
    goalProbability: 67,
    dangerZone: 4,
    // 战术分析
    pressureIndex: 73,
    counterAttack: 2
  });

  // Simulate real-time AI data updates matching video analysis
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => {
        // 随机切换阵型 (偶尔变化)
        const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
        const newHomeFormation = Math.random() > 0.95 ? formations[Math.floor(Math.random() * formations.length)] : prev.homeFormation;
        const newAwayFormation = Math.random() > 0.95 ? formations[Math.floor(Math.random() * formations.length)] : prev.awayFormation;
        
        return {
          trackedPlayers: Math.random() > 0.92 ? (prev.trackedPlayers === 22 ? 21 : 22) : prev.trackedPlayers,
          homeFormation: newHomeFormation,
          awayFormation: newAwayFormation,
          totalDistance: Math.round((prev.totalDistance + 0.1 + Math.random() * 0.2) * 10) / 10,
          sprintSpeed: Math.round((30 + Math.random() * 6) * 10) / 10,
          possession: Math.min(70, Math.max(30, prev.possession + Math.floor(Math.random() * 5) - 2)),
          passAccuracy: Math.min(95, Math.max(75, prev.passAccuracy + Math.floor(Math.random() * 3) - 1)),
          goalProbability: Math.min(85, Math.max(35, prev.goalProbability + Math.floor(Math.random() * 8) - 4)),
          dangerZone: Math.floor(1 + Math.random() * 5),
          pressureIndex: Math.min(90, Math.max(40, prev.pressureIndex + Math.floor(Math.random() * 6) - 3)),
          counterAttack: Math.floor(1 + Math.random() * 4)
        };
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Check if user has seen the welcome dialog
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeDialog');
    if (!hasSeenWelcome) {
      setShowWelcomeDialog(true);
    }
  }, []);

  const handleWelcomeClose = () => {
    localStorage.setItem('hasSeenWelcomeDialog', 'true');
    setShowWelcomeDialog(false);
  };
  
  // 使用模拟数据生成AI模型统计（相关表不存在）
  useEffect(() => {
    const generateAIStats = () => {
      setIsLoadingModels(true);
      const INITIAL_BALANCE = 10000;
      
      const updatedModels = aiModels.map(model => {
        // 使用模型ID生成稳定的随机种子
        const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // 生成稳定的胜率（55%-75%之间）
        const baseWinRate = 55 + (seed % 20);
        const winRate = baseWinRate + (Math.sin(seed) * 5);
        const totalPredictions = 50 + (seed % 30);
        const correctPredictions = Math.round(totalPredictions * (winRate / 100));
        
        // 计算模拟收益
        const profitRate = (winRate - 50) / 50;
        const profit = Math.round(INITIAL_BALANCE * profitRate * (0.3 + Math.random() * 0.2));
        const currentValue = INITIAL_BALANCE + profit;
        const changePercent = (profit / INITIAL_BALANCE) * 100;
        
        return {
          ...model,
          winRate: Math.round(winRate * 10) / 10,
          totalPredictions,
          correctPredictions,
          currentValue: `$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: profit >= 0 ? `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          changePercent: Math.round(changePercent * 100) / 100,
        };
      });
      
      setModelsWithRealData(updatedModels);
      setIsLoadingModels(false);
    };

    generateAIStats();
  }, []);

  // Sort models by win rate
  const sortedModels = [...modelsWithRealData].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      <div className="w-full max-w-full overflow-x-hidden">
        <Header />
        <CryptoTicker />
      </div>

      {/* Welcome Dialog */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              {t('welcome_title')}
            </DialogTitle>
            <DialogDescription className="text-sm whitespace-pre-line text-center pt-3">
              {t('welcome_message')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-3">
            <Button onClick={handleWelcomeClose} size="default" className="min-w-[160px]">
              {t('welcome_button')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10 safe-area-padding max-w-7xl w-full overflow-x-hidden">
        {/* Official Promotional Video Section */}
        <section className="mb-10 sm:mb-12 lg:mb-14">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-4 sm:mb-5 text-foreground tracking-wide text-center">
            {t('ai_analysis_title')}
          </h2>
          <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-6">
            {/* Left Stats Panel */}
            <div className="hidden md:flex flex-col gap-2 w-40 lg:w-48">
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 lg:p-3">
                <span className="text-xs text-muted-foreground">{t('realtime_monitoring')}</span>
                <h4 className="text-xs font-medium text-foreground mb-0.5">{t('player_tracking')}</h4>
                <div className="text-xl font-bold text-primary transition-all duration-300">{liveStats.trackedPlayers}</div>
                <p className="text-xs text-muted-foreground">{t('tracked_players')}</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 lg:p-3">
                <span className="text-xs text-muted-foreground">{t('ai_recognition')}</span>
                <h4 className="text-xs font-medium text-foreground mb-0.5">{t('formation_analysis')}</h4>
                <div className="text-lg font-bold text-primary">{liveStats.homeFormation}</div>
                <p className="text-xs text-muted-foreground">vs {liveStats.awayFormation}</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 lg:p-3">
                <span className="text-xs text-muted-foreground">{t('running_stats')}</span>
                <h4 className="text-xs font-medium text-foreground mb-0.5">{t('total_distance')}</h4>
                <div className="text-xl font-bold text-primary transition-all duration-300">{liveStats.totalDistance}</div>
                <p className="text-xs text-muted-foreground">{t('km_distance')}</p>
              </div>
            </div>

            {/* Video */}
            <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden bg-card border border-border shadow-lg">
              <video
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                src="/videos/hunsoccer-promo.mp4?v=2"
                playsInline
                autoPlay
                loop
                muted
              >
                Your browser does not support video playback
              </video>
            </div>

            {/* Right Stats Panel */}
            <div className="hidden md:flex flex-col gap-2 w-40 lg:w-48">
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 lg:p-3">
                <span className="text-xs text-muted-foreground">{t('possession_analysis')}</span>
                <h4 className="text-xs font-medium text-foreground mb-0.5">{t('ball_possession')}</h4>
                <div className="text-xl font-bold text-primary transition-all duration-300">{liveStats.possession}%</div>
                <p className="text-xs text-muted-foreground">{t('pass_accuracy')}: {liveStats.passAccuracy}%</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 lg:p-3">
                <span className="text-xs text-muted-foreground">{t('ai_prediction_label')}</span>
                <h4 className="text-xs font-medium text-foreground mb-0.5">{t('goal_probability')}</h4>
                <div className="text-lg font-bold text-primary transition-all duration-300">{liveStats.goalProbability}%</div>
                <p className="text-xs text-muted-foreground">{t('danger_zone')}: {liveStats.dangerZone}</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 lg:p-3">
                <span className="text-xs text-muted-foreground">{t('pressure_analysis')}</span>
                <h4 className="text-xs font-medium text-foreground mb-0.5">{t('pressure_index')}</h4>
                <div className="text-lg font-bold text-primary transition-all duration-300">{liveStats.pressureIndex}%</div>
                <p className="text-xs text-muted-foreground">{t('counter_attack')}: {liveStats.counterAttack}</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Stats Panel - Below Video */}
          <div className="grid grid-cols-3 gap-2 mt-4 md:hidden">
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">{t('player_tracking')}</span>
              <div className="text-lg font-bold text-primary transition-all duration-300">{liveStats.trackedPlayers}</div>
              <p className="text-[10px] text-muted-foreground">{t('tracked_players')}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">{t('formation_analysis')}</span>
              <div className="text-sm font-bold text-primary">{liveStats.homeFormation}</div>
              <p className="text-[10px] text-muted-foreground">vs {liveStats.awayFormation}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">{t('ball_possession')}</span>
              <div className="text-lg font-bold text-primary transition-all duration-300">{liveStats.possession}%</div>
              <p className="text-[10px] text-muted-foreground">{t('accuracy_rate')}: {liveStats.passAccuracy}%</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">{t('goal_probability')}</span>
              <div className="text-lg font-bold text-primary transition-all duration-300">{liveStats.goalProbability}%</div>
              <p className="text-[10px] text-muted-foreground">{t('scoring_chance')}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">{t('pressure_index')}</span>
              <div className="text-lg font-bold text-primary transition-all duration-300">{liveStats.pressureIndex}%</div>
              <p className="text-[10px] text-muted-foreground">{t('high_press')}</p>
            </div>
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 text-center">
              <span className="text-[10px] text-muted-foreground block">{t('counter_attack')}</span>
              <div className="text-lg font-bold text-primary transition-all duration-300">{liveStats.counterAttack}</div>
              <p className="text-[10px] text-muted-foreground">{t('counter_chances')}</p>
            </div>
          </div>
        </section>

        {/* AI Betting Cards - Match Predictions Today */}
        <section id="match-predictions" className="mb-10 sm:mb-12 lg:mb-14 scroll-mt-20">
          <ActiveAIBets />
        </section>

        {/* Models Section */}
        <section className="mb-10 sm:mb-12 lg:mb-14">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-4 sm:mb-5 text-foreground tracking-wide text-center">
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
            {sortedModels.filter(model => model.id !== 'hunsoccermax').map((model) => (
              <ModelCard 
                key={model.id} 
                model={model}
              />
            ))}
            {/* User's Personal Model Card */}
            <UserModelCard />
          </div>
        </section>

        {/* Performance Chart */}
        <section className="mb-10 sm:mb-12 lg:mb-14">
          <PerformanceChart 
            onChartClick={() => {
              const element = document.getElementById('match-predictions');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          />
        </section>

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </div>
  );
};

export default Index;

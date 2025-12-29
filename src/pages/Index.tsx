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
      
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 lg:py-10 safe-area-padding max-w-7xl w-full overflow-x-hidden">
        {/* AI Match Intelligence Section - Modern Western Style */}
        <section className="mb-8 sm:mb-12 lg:mb-16">
          {/* Header with gradient accent */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/60" />
              <span className="text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-primary/80">
                Live Analysis
              </span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/60" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Match Intelligence
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Real-time AI-powered tactical analysis and performance metrics
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 max-w-6xl mx-auto">
            
            {/* Left Stats - Desktop */}
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-3">
              <div className="group bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-xl p-4 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tracking</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Players Tracked</span>
                    <span className="text-lg font-semibold text-foreground tabular-nums">{liveStats.trackedPlayers}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: '100%' }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">Status: Active</p>
                </div>
              </div>

              <div className="group bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-xl p-4 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3z"/>
                      <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Formation</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Home</span>
                    <span className="text-sm font-mono font-semibold text-foreground">{liveStats.homeFormation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Away</span>
                    <span className="text-sm font-mono font-semibold text-foreground">{liveStats.awayFormation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500">92% confidence</span>
                  </div>
                </div>
              </div>

              <div className="group bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-xl p-4 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distance</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-foreground tabular-nums">{liveStats.totalDistance}</span>
                      <span className="text-xs text-muted-foreground">km</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">High Intensity</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-medium text-orange-500 tabular-nums">8.2</span>
                      <span className="text-xs text-muted-foreground">km</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Video */}
            <div className="lg:col-span-6">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-card border border-border shadow-xl group">
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src="/videos/hunsoccer-promo.mp4?v=2"
                  playsInline
                  autoPlay
                  loop
                  muted
                >
                  Your browser does not support video playback
                </video>
                
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Live indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-white tracking-wide">LIVE</span>
                </div>
                
                {/* Legend - Bottom */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-xs text-white/90">Home</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      <span className="text-xs text-white/90">Away</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 bg-amber-400 rounded-full" />
                      <span className="text-xs text-white/90">Pass Lines</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Stats - Desktop */}
            <div className="hidden lg:flex lg:col-span-3 flex-col gap-3">
              <div className="group bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-xl p-4 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Possession</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Ball Control</span>
                    <span className="text-lg font-semibold text-foreground tabular-nums">{liveStats.possession}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500" style={{ width: `${liveStats.possession}%` }} />
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Pass Accuracy</span>
                    <span className="text-sm font-medium text-blue-500 tabular-nums">{liveStats.passAccuracy}%</span>
                  </div>
                </div>
              </div>

              <div className="group bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-xl p-4 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">xG Analysis</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Goal Probability</span>
                    <span className="text-lg font-semibold text-foreground tabular-nums">{liveStats.goalProbability}%</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Danger Entries</span>
                    <span className="text-sm font-medium text-red-500 tabular-nums">{liveStats.dangerZone}</span>
                  </div>
                </div>
              </div>

              <div className="group bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-xl p-4 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pressure</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Intensity Index</span>
                    <span className="text-lg font-semibold text-foreground tabular-nums">{liveStats.pressureIndex}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Counter Chances</span>
                    <span className="text-sm font-medium text-violet-500 tabular-nums">{liveStats.counterAttack}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 lg:hidden">
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Tracking</span>
              </div>
              <div className="text-xl font-bold text-foreground tabular-nums">{liveStats.trackedPlayers}</div>
              <p className="text-[10px] text-muted-foreground">Players Tracked</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h18v18H3z"/>
                    <path d="M9 3v18M15 3v18"/>
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Formation</span>
              </div>
              <div className="text-sm font-mono font-bold text-foreground">{liveStats.homeFormation}</div>
              <p className="text-[10px] text-muted-foreground">vs {liveStats.awayFormation}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Possession</span>
              </div>
              <div className="text-xl font-bold text-foreground tabular-nums">{liveStats.possession}%</div>
              <p className="text-[10px] text-muted-foreground">Pass: {liveStats.passAccuracy}%</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">xG</span>
              </div>
              <div className="text-xl font-bold text-foreground tabular-nums">{liveStats.goalProbability}%</div>
              <p className="text-[10px] text-muted-foreground">Goal Prob.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Pressure</span>
              </div>
              <div className="text-xl font-bold text-foreground tabular-nums">{liveStats.pressureIndex}</div>
              <p className="text-[10px] text-muted-foreground">Intensity</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Distance</span>
              </div>
              <div className="text-xl font-bold text-foreground tabular-nums">{liveStats.totalDistance}</div>
              <p className="text-[10px] text-muted-foreground">km covered</p>
            </div>
          </div>
          
          {/* Disclaimer */}
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-6 text-center max-w-xl mx-auto leading-relaxed">
            Data derived from real-time visual recognition and statistical models. Subject to delay and margin of error. For tactical analysis reference only.
          </p>
        </section>

        {/* AI Betting Cards - Match Predictions Today */}
        <section id="match-predictions" className="mb-6 sm:mb-10 lg:mb-14 scroll-mt-20">
          <ActiveAIBets />
        </section>

        {/* Models Section */}
        <section className="mb-6 sm:mb-10 lg:mb-14">
          <h2 className="text-sm sm:text-base lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-foreground tracking-wide text-center">
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-5">
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
        <section className="mb-6 sm:mb-10 lg:mb-14">
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

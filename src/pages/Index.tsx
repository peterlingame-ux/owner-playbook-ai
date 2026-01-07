import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import UserModelCard from "@/components/UserModelCard";
import CryptoTicker from "@/components/CryptoTicker";
import ActiveAIBets from "@/components/ActiveAIBets";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import MobileFooter from "@/components/MobileFooter";
import { aiModels } from "@/data/mockData";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
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
  
  // 从数据库获取真实AI模型统计数据
  useEffect(() => {
    const INITIAL_BALANCE = 10000;
    
    const fetchAIStats = async (isRefresh = false) => {
      if (!isRefresh) {
        setIsLoadingModels(true);
      }
      
      try {
        // 并行获取胜率统计和余额数据
        const [winRatesResult, balancesResult] = await Promise.all([
          supabase
            .from('ai_win_rates_overall' as any)
            .select('ai_id, total_predictions, correct_predictions, win_rate'),
          supabase
            .from('ai_balances' as any)
            .select('ai_id, available_balance, locked_balance')
        ]);

        const { data: winRatesData, error: winRatesError } = winRatesResult;
        const { data: balancesData, error: balancesError } = balancesResult;

        if (winRatesError) {
          console.error('Error fetching win rates:', winRatesError);
        }
        if (balancesError) {
          console.error('Error fetching balances:', balancesError);
        }

        // 创建数据映射
        const winRatesMap = new Map<string, { total_predictions: number; correct_predictions: number; win_rate: number }>();
        if (winRatesData) {
          winRatesData.forEach((item: any) => {
            winRatesMap.set(item.ai_id, {
              total_predictions: item.total_predictions || 0,
              correct_predictions: item.correct_predictions || 0,
              win_rate: item.win_rate || 0
            });
          });
        }

        const balancesMap = new Map<string, { available_balance: number; locked_balance: number }>();
        if (balancesData) {
          balancesData.forEach((item: any) => {
            balancesMap.set(item.ai_id, {
              available_balance: item.available_balance || 0,
              locked_balance: item.locked_balance || 0
            });
          });
        }

        // 更新模型数据
        const updatedModels = aiModels.map(model => {
          const winRateData = winRatesMap.get(model.id);
          const balanceData = balancesMap.get(model.id);

          // 使用真实数据，如果没有则使用默认值
          const totalPredictions = winRateData?.total_predictions || 0;
          const correctPredictions = winRateData?.correct_predictions || 0;
          const winRate = winRateData?.win_rate || 0;

          // 计算余额和收益
          const totalBalance = balanceData 
            ? (balanceData.available_balance || 0) + (balanceData.locked_balance || 0)
            : INITIAL_BALANCE;
          const profit = totalBalance - INITIAL_BALANCE;
          const changePercent = (profit / INITIAL_BALANCE) * 100;

          return {
            ...model,
            totalPredictions,
            correctPredictions,
            winRate: Math.round(winRate * 10) / 10,
            currentValue: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: profit >= 0 
              ? `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
              : `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            changePercent: Math.round(changePercent * 100) / 100,
          };
        });

        setModelsWithRealData(updatedModels);
      } catch (error) {
        console.error('Error fetching AI stats:', error);
        // 如果出错，使用默认数据（仅在首次加载时）
        if (!isRefresh) {
          setModelsWithRealData(aiModels);
        }
      } finally {
        if (!isRefresh) {
          setIsLoadingModels(false);
        }
      }
    };

    // 初始加载
    fetchAIStats(false);

    // 每60秒自动刷新数据（静默刷新）
    const interval = setInterval(() => fetchAIStats(true), 60000);

    // 订阅 ai_balances 表的变化，实时更新余额
    const balancesChannel = supabase
      .channel('ai-balances-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_balances',
        },
        (payload) => {
          console.log('AI balance updated, refreshing stats:', payload);
          fetchAIStats(true);
        }
      )
      .subscribe();

    // 订阅 ai_win_rates_overall 视图的变化（如果支持）
    // 注意：视图可能不支持实时订阅，所以主要依赖定时刷新

    return () => {
      clearInterval(interval);
      supabase.removeChannel(balancesChannel);
    };
  }, []);

  // Sort models by win rate
  const sortedModels = [...modelsWithRealData].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      <Header />
      <div className="pt-[50px] sm:pt-[70px] w-full max-w-full overflow-x-hidden">
        <CryptoTicker />

      {/* Welcome Dialog */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl font-bold text-center pr-6">
              {t('welcome_title')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm whitespace-pre-line text-center pt-2 sm:pt-3 leading-relaxed">
              {t('welcome_message')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-2 sm:pt-3">
            <Button onClick={handleWelcomeClose} size="sm" className="min-w-[120px] sm:min-w-[160px] h-9 sm:h-10 text-sm">
              {t('welcome_button')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6 lg:py-10 safe-area-padding max-w-7xl w-full overflow-x-hidden">
        {/* Official Promotional Video Section - Western Minimalist Style */}
        <section className="mb-6 sm:mb-12 lg:mb-16">
          {/* Title */}
          <h2 className="text-[10px] sm:text-sm lg:text-base font-medium text-muted-foreground tracking-[0.15em] sm:tracking-[0.2em] uppercase text-center mb-3 sm:mb-8">
            {t('ai_analysis_title')}
          </h2>
          
          {/* Main Layout */}
          <div className="flex items-stretch justify-center gap-4 lg:gap-8">
            {/* Left Stats - Desktop */}
            <div className="hidden md:flex flex-col justify-between py-2 w-36 lg:w-44">
              <div className="space-y-1">
                <p className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">{t('realtime_monitoring')}</p>
                <p className="text-xl lg:text-2xl font-light text-foreground tabular-nums">{liveStats.trackedPlayers}</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">{t('tracked_players')}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">{t('ai_recognition')}</p>
                <p className="text-lg lg:text-xl font-light text-foreground">{liveStats.homeFormation}</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">{t('opponent_formation')}: {liveStats.awayFormation}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">{t('running_stats')}</p>
                <p className="text-xl lg:text-2xl font-light text-foreground tabular-nums">{liveStats.totalDistance}<span className="text-xs ml-1">{t('km_distance')}</span></p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">{t('sprint_tracking')}: 8.2 km</p>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative w-full max-w-2xl aspect-video rounded-lg overflow-hidden bg-black/20">
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
              {/* Minimal Legend - Hidden on mobile */}
              <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 hidden sm:flex items-center gap-4 text-[10px] text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500/90" />
                  {t('legend_home')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/90" />
                  {t('legend_away')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-px bg-yellow-400/90" />
                  {t('legend_pass')}
                </span>
              </div>
            </div>

            {/* Right Stats - Desktop */}
            <div className="hidden md:flex flex-col justify-between py-2 w-36 lg:w-44 text-right">
              <div className="space-y-1">
                <p className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">{t('possession_analysis')}</p>
                <p className="text-xl lg:text-2xl font-light text-foreground tabular-nums">{liveStats.possession}<span className="text-xs">%</span></p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">{t('pass_accuracy')}: {liveStats.passAccuracy}%</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">{t('ai_prediction_label')}</p>
                <p className="text-xl lg:text-2xl font-light text-foreground tabular-nums">{liveStats.goalProbability}<span className="text-xs">%</span></p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">{t('danger_zone')}: {liveStats.dangerZone}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">{t('pressure_analysis')}</p>
                <p className="text-xl lg:text-2xl font-light text-foreground tabular-nums">{liveStats.pressureIndex}</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground">{t('counter_attack')}: {liveStats.counterAttack}</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Stats - 2 rows for better visibility */}
          <div className="grid grid-cols-3 gap-1 mt-2 md:hidden">
            <div className="bg-white/5 rounded-lg p-1 text-center overflow-hidden">
              <p className="text-[6px] text-muted-foreground uppercase leading-tight truncate">{t('realtime_monitoring')}</p>
              <p className="text-xs font-light text-foreground tabular-nums">{liveStats.trackedPlayers}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1 text-center overflow-hidden">
              <p className="text-[6px] text-muted-foreground uppercase leading-tight truncate">{t('ai_recognition')}</p>
              <p className="text-xs font-light text-foreground">{liveStats.homeFormation}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1 text-center overflow-hidden">
              <p className="text-[6px] text-muted-foreground uppercase leading-tight truncate">{t('running_stats')}</p>
              <p className="text-xs font-light text-foreground tabular-nums">{liveStats.totalDistance}<span className="text-[7px] ml-0.5">{t('km_distance')}</span></p>
            </div>
            <div className="bg-white/5 rounded-lg p-1 text-center overflow-hidden">
              <p className="text-[6px] text-muted-foreground uppercase leading-tight truncate">{t('possession_analysis')}</p>
              <p className="text-xs font-light text-foreground tabular-nums">{liveStats.possession}%</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1 text-center overflow-hidden">
              <p className="text-[6px] text-muted-foreground uppercase leading-tight truncate">{t('ai_prediction_label')}</p>
              <p className="text-xs font-light text-foreground tabular-nums">{liveStats.goalProbability}%</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1 text-center overflow-hidden">
              <p className="text-[6px] text-muted-foreground uppercase leading-tight truncate">{t('pressure_analysis')}</p>
              <p className="text-xs font-light text-foreground tabular-nums">{liveStats.pressureIndex}</p>
            </div>
          </div>
          
          {/* Disclaimer */}
          <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 mt-3 sm:mt-5 text-center max-w-xl mx-auto px-2">
            {t('ai_analysis_disclaimer')}
          </p>
        </section>

        {/* AI Betting Cards - Match Predictions Today */}
        <section id="match-predictions" className="mb-6 sm:mb-10 lg:mb-14 scroll-mt-20">
          <ActiveAIBets />
        </section>

        {/* Models Section */}
        <section className="mb-6 sm:mb-10 lg:mb-14">
          <h2 className="text-xs sm:text-base lg:text-xl font-semibold mb-2 sm:mb-4 lg:mb-5 text-foreground tracking-wide text-center px-1">
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-3 lg:gap-5 px-0.5 sm:px-0">
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
      </div>
      </div>

      {/* Footer - hidden on mobile when bottom nav is shown */}
      {!isMobile && <Footer />}
      
      {/* Mobile Footer */}
      {isMobile && <MobileFooter />}
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNav />}
    </div>
  );
};

export default Index;

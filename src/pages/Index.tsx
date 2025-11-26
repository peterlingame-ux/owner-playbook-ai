import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PerformanceChart from "@/components/PerformanceChart";
import ModelCard from "@/components/ModelCard";
import PlayerCard from "@/components/PlayerCard";
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

interface PlayerData {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  changePercent: number;
  rank: number;
}

const Index = () => {
  const { t } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelsWithRealData, setModelsWithRealData] = useState<AIModel[]>(aiModels);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [topPlayers, setTopPlayers] = useState<PlayerData[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);

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
  
  // 获取真实的胜率数据和模拟收益 - 使用 Realtime 订阅实现实时更新
  useEffect(() => {
    const fetchWinRates = async () => {
      try {
        setIsLoadingModels(true);
        
        const INITIAL_BALANCE = 10000; // 初始余额
        
        // 并行查询：胜率数据和余额数据
        const [winRatesResult, balancesResult] = await Promise.all([
          supabase.from('ai_win_rates_overall' as any).select('*'),
          supabase.from('ai_balances' as any).select('*'),
        ]);

        // 处理胜率数据
        const winRatesMap = new Map<string, { winRate: number; totalPredictions: number; correctPredictions: number }>();
        if (!winRatesResult.error && winRatesResult.data) {
          winRatesResult.data.forEach((item: any) => {
            winRatesMap.set(item.ai_id, {
              winRate: item.win_rate || 0,
              totalPredictions: item.total_predictions || 0,
              correctPredictions: item.correct_predictions || 0,
            });
          });
        }

        // 处理余额数据，计算模拟收益
        const balancesMap = new Map<string, { currentValue: number; profit: number; changePercent: number }>();
        if (!balancesResult.error && balancesResult.data) {
          balancesResult.data.forEach((item: any) => {
            const totalBalance = (item.available_balance || 0) + (item.locked_balance || 0);
            const profit = totalBalance - INITIAL_BALANCE;
            const changePercent = (profit / INITIAL_BALANCE) * 100;
            
            balancesMap.set(item.ai_id, {
              currentValue: totalBalance,
              profit,
              changePercent,
            });
          });
        }

        // 更新每个模型的数据
        const updatedModels = aiModels.map(model => {
          const winRateData = winRatesMap.get(model.id);
          const balanceData = balancesMap.get(model.id);
          
          // 计算模拟收益
          const profit = balanceData?.profit ?? 0;
          const changePercent = balanceData?.changePercent ?? 0;
          const currentValue = balanceData?.currentValue ?? INITIAL_BALANCE;
          
          return {
            ...model,
            winRate: winRateData?.winRate ?? 0,
            totalPredictions: winRateData?.totalPredictions ?? 0,
            correctPredictions: winRateData?.correctPredictions ?? 0,
            currentValue: `$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: profit >= 0 ? `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            changePercent: Math.round(changePercent * 100) / 100,
          };
        });
        
        setModelsWithRealData(updatedModels);
      } catch (error) {
        console.error('Error fetching win rates:', error);
        // 如果出错，显示0而不是默认数据
        const INITIAL_BALANCE = 10000;
        const zeroModels = aiModels.map(model => ({
          ...model,
          winRate: 0,
          totalPredictions: 0,
          correctPredictions: 0,
          currentValue: `$${INITIAL_BALANCE.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: '$0.00',
          changePercent: 0,
        }));
        setModelsWithRealData(zeroModels);
      } finally {
        setIsLoadingModels(false);
      }
    };

    // 初始加载
    fetchWinRates();

    // 订阅 sim_positions 表的变化，当有投注结算时实时更新胜率
    const positionsChannel = supabase
      .channel('win-rates-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sim_positions',
          filter: 'status=eq.settled',
        },
        (payload) => {
          console.log('Sim position settled, refreshing win rates:', payload);
          fetchWinRates();
        }
      )
      .subscribe();

    // 订阅 ai_balances 表的变化，当余额变化时实时更新模拟收益
    const balancesChannel = supabase
      .channel('balances-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'ai_balances',
        },
        (payload) => {
          console.log('AI balance changed, refreshing data:', payload);
          fetchWinRates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(positionsChannel);
      supabase.removeChannel(balancesChannel);
    };
  }, []);
  
  // 获取前3名玩家数据
  useEffect(() => {
    const fetchTopPlayers = async () => {
      try {
        setIsLoadingPlayers(true);
        const INITIAL_BALANCE = 10000;
        
        // 获取所有用户的基本信息
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url');
        
        if (usersError) throw usersError;
        if (!usersData) return;
        
        // 获取所有用户的余额信息
        const { data: balancesData, error: balancesError } = await supabase
          .from('user_balances')
          .select('user_id, balance');
        
        if (balancesError) throw balancesError;
        
        // 获取所有用户的预测统计
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('user_predictions')
          .select('user_id, result');
        
        if (predictionsError) throw predictionsError;
        
        // 创建映射
        const balancesMap = new Map(balancesData?.map(b => [b.user_id, b.balance]) || []);
        
        // 计算每个用户的统计数据
        const playerStats = usersData.map(user => {
          const userPredictions = predictionsData?.filter(p => p.user_id === user.id) || [];
          const totalPredictions = userPredictions.length;
          const correctPredictions = userPredictions.filter(p => p.result === 'win').length;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          
          const balance = balancesMap.get(user.id) || INITIAL_BALANCE;
          const profit = balance - INITIAL_BALANCE;
          const changePercent = (profit / INITIAL_BALANCE) * 100;
          
          return {
            id: user.id,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            totalPredictions,
            correctPredictions,
            winRate,
            balance,
            profit,
            changePercent,
            rank: 0 // 临时值，稍后设置
          };
        });
        
        // 按胜率排序并设置排名
        const sortedPlayers = playerStats
          .sort((a, b) => b.winRate - a.winRate)
          .map((player, index) => ({
            ...player,
            rank: index + 1
          }))
          .slice(0, 3); // 只取前3名
        
        setTopPlayers(sortedPlayers);
      } catch (error) {
        console.error('Error fetching top players:', error);
        setTopPlayers([]);
      } finally {
        setIsLoadingPlayers(false);
      }
    };
    
    fetchTopPlayers();
    
    // 订阅用户预测和余额变化，实时更新排名
    const predictionsChannel = supabase
      .channel('top-players-predictions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_predictions',
        },
        () => {
          console.log('User predictions changed, refreshing top players');
          fetchTopPlayers();
        }
      )
      .subscribe();
    
    const balancesChannel = supabase
      .channel('top-players-balances')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
        },
        () => {
          console.log('User balances changed, refreshing top players');
          fetchTopPlayers();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(predictionsChannel);
      supabase.removeChannel(balancesChannel);
    };
  }, []);

  // Sort models by win rate
  const sortedModels = [...modelsWithRealData].sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CryptoTicker />

      {/* Welcome Dialog */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {t('welcome_title')}
            </DialogTitle>
            <DialogDescription className="text-base whitespace-pre-line text-center pt-4">
              {t('welcome_message')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={handleWelcomeClose} size="lg" className="min-w-[200px]">
              {t('welcome_button')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 safe-area-padding">
        {/* Models Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-foreground tracking-wide sm:tracking-wider text-center uppercase px-2 sm:px-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-tight" style={{ fontWeight: 700 }}>
            {t('the_contestants')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {sortedModels.map((model) => (
              <ModelCard 
                key={model.id} 
                model={model}
              />
            ))}
          </div>
        </div>

        {/* Top Players Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6 text-foreground tracking-wide sm:tracking-wider text-center uppercase px-2 sm:px-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-tight" style={{ fontWeight: 700 }}>
            {t('top_players')}
          </h2>
          {isLoadingPlayers ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : topPlayers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {topPlayers.map((player) => (
                <PlayerCard 
                  key={player.id} 
                  player={player}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无玩家数据，快来参与预测吧！
            </div>
          )}
        </div>

        {/* Performance Chart */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <PerformanceChart 
            onChartClick={() => {
              const element = document.getElementById('match-predictions');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          />
        </div>

        {/* AI Betting Cards */}
        <div id="match-predictions" className="mb-6 sm:mb-8 scroll-mt-20">
          <ActiveAIBets />
        </div>

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </div>
  );
};

export default Index;

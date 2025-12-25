import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import prizeBannerGreen from "@/assets/prize-banner-green.png";
import hunsoccerAiIcon from "@/assets/hunsoccer-ai-icon.png";
import { virtualPlayers } from "@/data/virtualPlayers";

const PRIZE_POOL = 1000000; // $1,000,000
const AI_BENCHMARK_PREDICTIONS = 247;
const AI_BENCHMARK_WIN_RATE = 78.95;
const AI_BENCHMARK_PROFIT = 2478900; // $24,789 in cents

interface PlayerData {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  profitAmount?: number;
  rank: number;
}

const ChallengeAIBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // 计算倒计时 - 每30天为一个周期
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const startOfCycle = new Date(now);
      startOfCycle.setDate(1); // 每月1日开始
      startOfCycle.setHours(0, 0, 0, 0);
      
      const endOfCycle = new Date(startOfCycle);
      endOfCycle.setDate(31); // 每月31日结束
      endOfCycle.setHours(23, 59, 59, 999);
      
      // 如果已经过了31日，下个月
      if (now > endOfCycle) {
        endOfCycle.setMonth(endOfCycle.getMonth() + 1);
        endOfCycle.setDate(31);
      }
      
      const diff = endOfCycle.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // 获取所有玩家数据
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        // 合并虚拟玩家和真实玩家
        const virtualPlayersData = virtualPlayers.map((vp, index) => ({
          id: vp.id,
          displayName: vp.displayName,
          avatarUrl: vp.avatarUrl,
          totalPredictions: vp.totalPredictions,
          correctPredictions: vp.correctPredictions,
          winRate: vp.winRate,
          profitAmount: vp.profit || 0,
          rank: index + 1,
        }));

        // 获取真实玩家数据
        if (user) {
          const { data: predictionsData } = await supabase
            .from('user_predictions')
            .select('user_id, result');

          if (predictionsData) {
            const userPredictions = predictionsData.filter(p => p.user_id === user.id);
            const totalPredictions = userPredictions.length;
            const correctPredictions = userPredictions.filter(p => p.result === 'win').length;
            const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

            const { data: balanceData } = await supabase
              .from('user_balances')
              .select('balance')
              .eq('user_id', user.id)
              .single();

            const initialBalance = 10000 * 100; // 初始余额10000美元 = 1000000分
            const currentBalance = balanceData?.balance || initialBalance;
            const profitAmount = currentBalance - initialBalance;

            const realPlayerData: PlayerData = {
              id: user.id,
              displayName: user.user_metadata?.display_name || user.email || 'Player',
              avatarUrl: user.user_metadata?.avatar_url || '/avatars/avatar-1.png',
              totalPredictions,
              correctPredictions,
              winRate,
              profitAmount,
              rank: 0,
            };

            const allPlayersData = [...virtualPlayersData, realPlayerData];
            setAllPlayers(allPlayersData);
          } else {
            setAllPlayers(virtualPlayersData);
          }
        } else {
          setAllPlayers(virtualPlayersData);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        setAllPlayers(virtualPlayers.map((vp, index) => ({
          id: vp.id,
          displayName: vp.displayName,
          avatarUrl: vp.avatarUrl,
          totalPredictions: vp.totalPredictions,
          correctPredictions: vp.correctPredictions,
          winRate: vp.winRate,
          profitAmount: vp.profit || 0,
          rank: index + 1,
        })));
      }
    };

    fetchPlayers();
  }, [user]);

  const currentPlayer = user ? allPlayers.find(p => p.id === user.id) : null;
  const playerPredictions = currentPlayer?.totalPredictions || 0;
  const playerWinRate = currentPlayer?.winRate || 0;
  const playerProfit = currentPlayer?.profitAmount || 0;
  const meetsRequirements = playerPredictions >= AI_BENCHMARK_PREDICTIONS && 
                           playerWinRate >= AI_BENCHMARK_WIN_RATE && 
                           playerProfit >= AI_BENCHMARK_PROFIT;

  const qualifiedCount = allPlayers.filter(p => 
    p.totalPredictions >= AI_BENCHMARK_PREDICTIONS && 
    p.winRate >= AI_BENCHMARK_WIN_RATE && 
    (p.profitAmount || 0) >= AI_BENCHMARK_PROFIT
  ).length;
  const prizePerPerson = qualifiedCount > 0 ? Math.floor(PRIZE_POOL / qualifiedCount) : PRIZE_POOL;

  return (
    <Card className="border-border/50 overflow-hidden relative">
      {/* 绿色草地背景图 - 稍微暗一点 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${prizeBannerGreen})`,
          filter: 'brightness(0.85)'
        }}
      />
      <CardContent className="p-3 sm:p-6 relative">
        <div className="flex flex-col gap-3 sm:gap-5">
          {/* 主标题 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-3 mb-1 sm:mb-2 flex-wrap">
              <span className="text-sm sm:text-xl font-bold text-foreground">{t('challenge_ai')}</span>
              <span className="text-xl sm:text-4xl font-black text-foreground">$1,000,000</span>
              <span className="text-sm sm:text-xl font-bold text-foreground">{t('big_prize_waiting')}</span>
            </div>
            <p className="text-xs sm:text-sm text-white max-w-lg mx-auto leading-tight">
              {t('challenge_description')}
            </p>
          </div>
          
          {/* AI vs 玩家数据对比 */}
          <div className="w-full max-w-3xl mx-auto space-y-1.5 sm:space-y-2">
            {/* AI数据 */}
            <div className="bg-muted/30 rounded-lg px-2 sm:px-4 py-2 sm:py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-warning/50">
                    <AvatarImage src={hunsoccerAiIcon} />
                    <AvatarFallback className="text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-xs sm:text-sm">HUNSOCCER MAX</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t('ai_benchmark')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-6 text-[10px] sm:text-sm flex-wrap">
                  <span className="text-muted-foreground">{t('banner_predictions')} <span className="font-bold text-foreground">247</span></span>
                  <span className="text-muted-foreground">{t('banner_win_rate')} <span className="font-bold text-foreground">78.95%</span></span>
                  <span className="text-muted-foreground">{t('banner_profit')} <span className="font-bold text-foreground">24789 PTS</span></span>
                </div>
              </div>
            </div>
            
            {/* 玩家专属模型数据 */}
            {user ? (
              <div className={`rounded-lg px-2 sm:px-4 py-2 sm:py-3 ${meetsRequirements ? 'bg-success/10' : 'bg-muted/30'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary/50">
                        <AvatarImage src={currentPlayer?.avatarUrl || '/avatars/avatar-1.png'} />
                        <AvatarFallback className="text-xs">{currentPlayer?.displayName?.charAt(0) || 'P'}</AvatarFallback>
                      </Avatar>
                      {currentPlayer && currentPlayer.rank > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-primary-foreground">
                          #{currentPlayer.rank}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{currentPlayer?.displayName || t('banner_my_model')}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {meetsRequirements ? <span className="text-success">✓ {t('qualified_status')}</span> : t('keep_going')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-6 text-[10px] sm:text-sm flex-wrap">
                    <span className="text-muted-foreground">
                      {t('banner_predictions')} <span className={`font-bold ${playerPredictions >= AI_BENCHMARK_PREDICTIONS ? 'text-success' : 'text-foreground'}`}>{playerPredictions}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t('banner_win_rate')} <span className={`font-bold ${playerWinRate >= AI_BENCHMARK_WIN_RATE ? 'text-success' : 'text-foreground'}`}>{playerWinRate.toFixed(1)}%</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t('banner_profit')} <span className={`font-bold ${playerProfit >= AI_BENCHMARK_PROFIT ? 'text-success' : 'text-foreground'}`}>{(playerProfit / 100).toLocaleString()} PTS</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg px-2 sm:px-4 py-2 sm:py-3 bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-muted/40">
                      <AvatarImage src="/avatars/avatar-1.png" />
                      <AvatarFallback className="text-xs">P</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-xs sm:text-sm">{t('banner_my_model')}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t('login_to_view')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/auth')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg text-[10px] sm:text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {t('login')}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 倒计时和统计 */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-[10px] sm:text-sm">
            <span className="font-mono text-foreground">
              {countdown.days}{t('days_unit')} {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
            </span>
            <div className="h-3 sm:h-4 w-px bg-border" />
            <span><span className="font-bold text-foreground">{qualifiedCount}</span> {t('people_qualified')}</span>
            <div className="h-3 sm:h-4 w-px bg-border" />
            <span>{t('expected_ai_reward')} <span className="font-bold text-warning text-xs sm:text-base">${prizePerPerson.toLocaleString()}</span></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeAIBanner;

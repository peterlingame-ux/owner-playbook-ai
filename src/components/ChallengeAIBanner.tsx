import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import prizeBannerGreen from "@/assets/prize-banner-green.png";
import hunsoccerAiIcon from "@/assets/hunsoccer-ai-icon.png";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import { virtualPlayers } from "@/data/virtualPlayers";
import { aiModels } from "@/data/mockData";

// Animated number component
const AnimatedPrizeNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return (
    <motion.span
      className="inline-block"
      animate={{ 
        scale: [1, 1.02, 1],
        textShadow: [
          "0 0 0px rgba(251, 191, 36, 0)",
          "0 0 20px rgba(251, 191, 36, 0.8)",
          "0 0 0px rgba(251, 191, 36, 0)"
        ]
      }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
};

// Animated prize per person with smooth transition
const AnimatedPrizePerPerson = ({ value, prevValue }: { value: number; prevValue: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (value !== prevValue) {
      setIsAnimating(true);
      const duration = 1000;
      const steps = 30;
      const diff = value - prevValue;
      const increment = diff / steps;
      let current = prevValue;
      let step = 0;
      
      const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          setDisplayValue(value);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [value, prevValue]);
  
  return (
    <motion.span
      className="inline-block"
      animate={isAnimating ? { 
        scale: [1, 1.1, 1],
        color: ['rgb(74, 222, 128)', 'rgb(250, 204, 21)', 'rgb(74, 222, 128)']
      } : {}}
      transition={{ duration: 0.5 }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
};

// Flip card digit component
const FlipDigit = ({ digit, prevDigit }: { digit: string; prevDigit: string }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  
  useEffect(() => {
    if (digit !== prevDigit) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 300);
      return () => clearTimeout(timer);
    }
  }, [digit, prevDigit]);

  return (
    <div className="relative w-4 h-5 xs:w-5 xs:h-7 sm:w-7 sm:h-9 perspective-500">
      <motion.div
        className="w-full h-full"
        animate={isFlipping ? { rotateX: [0, -90, 0] } : {}}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 rounded-[2px] sm:rounded border border-white/20 flex items-center justify-center shadow-lg">
          <span className="text-xs xs:text-sm sm:text-lg font-bold font-mono text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {digit}
          </span>
        </div>
        {/* Top highlight */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/5 rounded-t-[2px] sm:rounded-t pointer-events-none" />
      </motion.div>
    </div>
  );
};

// Countdown display with flip animation
const FlipCountdown = ({ days, hours, minutes, seconds, t }: { 
  days: number; 
  hours: number; 
  minutes: number; 
  seconds: number;
  t: (key: string) => string;
}) => {
  const [prevValues, setPrevValues] = useState({ days, hours, minutes, seconds });
  
  useEffect(() => {
    setPrevValues({ days, hours, minutes, seconds });
  }, [days, hours, minutes, seconds]);

  const formatTwo = (n: number) => String(n).padStart(2, '0');
  const daysStr = String(days);
  const hoursStr = formatTwo(hours);
  const minutesStr = formatTwo(minutes);
  const secondsStr = formatTwo(seconds);
  
  const prevDaysStr = String(prevValues.days);
  const prevHoursStr = formatTwo(prevValues.hours);
  const prevMinutesStr = formatTwo(prevValues.minutes);
  const prevSecondsStr = formatTwo(prevValues.seconds);

  return (
    <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2">
      {/* Days */}
      <div className="flex flex-col items-center">
        <div className="flex gap-[2px]">
          {daysStr.split('').map((d, i) => (
            <FlipDigit key={`day-${i}`} digit={d} prevDigit={prevDaysStr[i] || '0'} />
          ))}
        </div>
        <span className="text-[6px] xs:text-[8px] sm:text-[10px] text-muted-foreground mt-0.5">{t('days_unit')}</span>
      </div>
      
      <span className="text-sm xs:text-base sm:text-xl font-bold text-white/40">:</span>
      
      {/* Hours */}
      <div className="flex flex-col items-center">
        <div className="flex gap-[2px]">
          <FlipDigit digit={hoursStr[0]} prevDigit={prevHoursStr[0]} />
          <FlipDigit digit={hoursStr[1]} prevDigit={prevHoursStr[1]} />
        </div>
        <span className="text-[6px] xs:text-[8px] sm:text-[10px] text-muted-foreground mt-0.5">{t('hours') || '时'}</span>
      </div>
      
      <span className="text-sm xs:text-base sm:text-xl font-bold text-white/40">:</span>
      
      {/* Minutes */}
      <div className="flex flex-col items-center">
        <div className="flex gap-[2px]">
          <FlipDigit digit={minutesStr[0]} prevDigit={prevMinutesStr[0]} />
          <FlipDigit digit={minutesStr[1]} prevDigit={prevMinutesStr[1]} />
        </div>
        <span className="text-[6px] xs:text-[8px] sm:text-[10px] text-muted-foreground mt-0.5">{t('minutes') || '分'}</span>
      </div>
      
      <span className="text-sm xs:text-base sm:text-xl font-bold text-white/40">:</span>
      
      {/* Seconds */}
      <div className="flex flex-col items-center">
        <div className="flex gap-[2px]">
          <FlipDigit digit={secondsStr[0]} prevDigit={prevSecondsStr[0]} />
          <FlipDigit digit={secondsStr[1]} prevDigit={prevSecondsStr[1]} />
        </div>
        <span className="text-[6px] xs:text-[8px] sm:text-[10px] text-muted-foreground mt-0.5">{t('seconds') || '秒'}</span>
      </div>
    </div>
  );
};

const PRIZE_POOL = 1000000; // $1,000,000
const AI_BENCHMARK_PREDICTIONS = 0;
const AI_BENCHMARK_WIN_RATE = 0;
const AI_BENCHMARK_PROFIT = 0; // $24,789 in cents

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

interface AIModelData {
  id: string;
  name: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  profitAmount: number; // 以分为单位
}

const ChallengeAIBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [topAIModel, setTopAIModel] = useState<AIModelData | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [prevPrizePerPerson, setPrevPrizePerPerson] = useState(PRIZE_POOL);

  // 获取模型图标（与 LeaderboardTable 一致）
  const getModelIcon = (modelId: string) => {
    if (modelId === 'hunsoccermax' || modelId === 'hunsoccer-max') {
      return user && userProfile?.avatar_url ? userProfile.avatar_url : hunsoccerAiIcon;
    }
    const icons: Record<string, string> = {
      'deepseek': deepseekIcon,
      'qwen': deepseekIcon,
      'claude': claudeIcon,
      'grok': grokIcon,
      'gemini': geminiIcon,
      'gpt': gpt5Icon,
      'gpt5': gpt5Icon,
    };
    return icons[modelId] || gpt5Icon;
  };

  // 获取模型显示名称（与 LeaderboardTable 一致）
  const getModelDisplayName = (modelId: string, modelName: string) => {
    if (modelId === 'hunsoccermax' || modelId === 'hunsoccer-max') {
      return user && userProfile?.display_name ? userProfile.display_name : t('demo_player') || 'Demo Player';
    }
    // 只显示第一个单词（基础名字），不显示版本号，与 LeaderboardTable 一致
    return modelName.split(' ')[0];
  };

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

  // 获取排名第一的AI模型数据（真实数据）
  useEffect(() => {
    const fetchTopAIModel = async () => {
      try {
        // 获取所有AI模型的胜率数据
        const { data: winRatesData, error: winRatesError } = await supabase
          .from('ai_win_rates_overall' as any)
          .select('ai_id, total_predictions, correct_predictions, win_rate');

        if (winRatesError) {
          console.error('Error fetching AI win rates:', winRatesError);
        }

        // 创建数据映射
        const winRatesMap = new Map<string, { total_predictions: number; correct_predictions: number; win_rate: number }>();
        if (winRatesData) {
          winRatesData.forEach((item: any) => {
            winRatesMap.set(String(item.ai_id), {
              total_predictions: Number(item.total_predictions) || 0,
              correct_predictions: Number(item.correct_predictions) || 0,
              win_rate: Number(item.win_rate) || 0
            });
          });
        }

        // 计算每个模型的数据并找到排名第一的（按胜率排序）
        // 使用与 LeaderboardTable 完全相同的盈利计算方式
        const avgBetAmount = 200; // 默认平均投注金额（与 LeaderboardTable 保持一致）
        const avgOdds = 1.8; // 默认平均赔率（与 LeaderboardTable 保持一致）
        const modelsWithData: AIModelData[] = aiModels.map(model => {
          const winRateData = winRatesMap.get(model.id);

          const totalPredictions = winRateData?.total_predictions ?? 0;
          const correctPredictions = winRateData?.correct_predictions ?? 0;
          const winRate = winRateData?.win_rate ?? 0;

          // 使用与 LeaderboardTable 完全相同的计算方式
          const totalBetAmount = totalPredictions * avgBetAmount;
          const validAmount = correctPredictions * avgBetAmount * avgOdds;
          const profitAmount = validAmount - totalBetAmount; // 与 LeaderboardTable 保持一致（单位相同）

          return {
            id: model.id,
            name: model.displayName || model.name,
            totalPredictions,
            correctPredictions,
            winRate,
            profitAmount // 与 LeaderboardTable 中的 profitAmount 单位一致
          };
        });

        // 按胜率排序，找到排名第一的模型（与 LeaderboardTable 排序逻辑完全一致）
        const sortedModels = modelsWithData
          .sort((a, b) => b.winRate - a.winRate); // 与 LeaderboardTable 第709行排序逻辑一致

        if (sortedModels.length > 0) {
          setTopAIModel(sortedModels[0]);
        } else {
          // 如果没有真实数据，使用默认值
          setTopAIModel({
            id: 'hunsoccer-max',
            name: aiModels.find(m => m.id === 'hunsoccer-max')?.displayName || 'HUNSOCCER MAX',
            totalPredictions: AI_BENCHMARK_PREDICTIONS,
            correctPredictions: Math.round(AI_BENCHMARK_PREDICTIONS * AI_BENCHMARK_WIN_RATE / 100),
            winRate: AI_BENCHMARK_WIN_RATE,
            profitAmount: AI_BENCHMARK_PROFIT
          });
        }
      } catch (error) {
        console.error('Error fetching top AI model:', error);
        // 使用默认值
        setTopAIModel({
          id: 'hunsoccer-max',
          name: aiModels.find(m => m.id === 'hunsoccer-max')?.displayName || 'HUNSOCCER MAX',
          totalPredictions: AI_BENCHMARK_PREDICTIONS,
          correctPredictions: Math.round(AI_BENCHMARK_PREDICTIONS * AI_BENCHMARK_WIN_RATE / 100),
          winRate: AI_BENCHMARK_WIN_RATE,
          profitAmount: AI_BENCHMARK_PROFIT
        });
      }
    };

    fetchTopAIModel();
  }, []);

  // 获取所有玩家数据（包括用户专属模型）
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

        // 获取真实玩家数据（用户专属模型）
        if (user) {
          // 获取用户预测数据（包含投注金额和实际赔付）
          const { data: predictionsData, error: predictionsError } = await supabase
            .from('user_predictions')
            .select('user_id, result, bet_amount, actual_payout')
            .eq('user_id', user.id);

          if (predictionsError) {
            console.error('Error fetching user predictions:', predictionsError);
          }

          const totalPredictions = predictionsData?.length || 0;
          const correctPredictions = predictionsData?.filter(p => p.result === 'win').length || 0;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

          // 计算真实盈利金额（从 user_predictions 表计算）
          // 盈利 = 所有获胜预测的实际赔付总和 - 所有投注金额总和
          const totalBetAmount = predictionsData?.reduce((sum, p) => sum + (Number(p.bet_amount) || 0), 0) || 0;
          const totalPayout = predictionsData?.reduce((sum, p) => {
            if (p.result === 'win') {
              return sum + (Number(p.actual_payout) || Number(p.bet_amount) || 0);
            }
            return sum;
          }, 0) || 0;
          const profitAmount = totalPayout - totalBetAmount; // 真实盈利金额（以分为单位）

          // 获取用户信息
          const { data: userProfileData, error: userProfileError } = await supabase
            .from('users')
            .select('display_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

          if (userProfileError) {
            console.error('Error fetching user profile:', userProfileError);
          }

          const realPlayerData: PlayerData = {
            id: user.id,
            displayName: userProfileData?.display_name || user.user_metadata?.display_name || user.email || t('player_default_name') || '玩家',
            avatarUrl: userProfileData?.avatar_url || user.user_metadata?.avatar_url || '/avatars/avatar-1.png',
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
  }, [user, t]);

  const currentPlayer = user ? allPlayers.find(p => p.id === user.id) : null;
  const playerPredictions = currentPlayer?.totalPredictions || 0;
  const playerWinRate = currentPlayer?.winRate || 0;
  const playerProfit = currentPlayer?.profitAmount || 0;
  
  // 使用真实AI模型数据作为基准（如果可用）
  const aiBenchmarkPredictions = topAIModel?.totalPredictions || AI_BENCHMARK_PREDICTIONS;
  const aiBenchmarkWinRate = topAIModel?.winRate || AI_BENCHMARK_WIN_RATE;
  const aiBenchmarkProfit = topAIModel?.profitAmount || AI_BENCHMARK_PROFIT;
  
  const meetsRequirements = playerPredictions >= aiBenchmarkPredictions && 
                           playerWinRate >= aiBenchmarkWinRate && 
                           playerProfit >= aiBenchmarkProfit;
  
  const qualifiedCount = allPlayers.filter(p => 
    p.totalPredictions >= aiBenchmarkPredictions && 
    p.winRate >= aiBenchmarkWinRate && 
    (p.profitAmount || 0) >= aiBenchmarkProfit
  ).length;
  const prizePerPerson = qualifiedCount > 0 ? Math.floor(PRIZE_POOL / qualifiedCount) : PRIZE_POOL;

  // Update previous prize value when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevPrizePerPerson(prizePerPerson);
    }, 1500);
    return () => clearTimeout(timer);
  }, [prizePerPerson]);

  return (
    <Card className="border-border/50 overflow-hidden relative">
      {/* 绿色草地背景图 - 手机端固定宽高比，避免变形 */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundImage: `url(${prizeBannerGreen})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(0.85)',
        }}
      />
      {/* 背景渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/30" />
      <CardContent className="p-1.5 sm:p-6 relative">
        <div className="flex flex-col gap-1 sm:gap-5">
          {/* 主标题 - 手机端极简紧凑 */}
          <div className="text-center">
            <p className="text-[7px] sm:text-sm text-white/80 max-w-lg mx-auto leading-tight line-clamp-1">
              {t('challenge_description')}
            </p>
          </div>
          
          {/* AI vs 玩家数据对比 - 手机端超紧凑单行 */}
          <div className="w-full max-w-3xl mx-auto space-y-0.5 sm:space-y-2">
            {/* AI数据 - 排行榜第一名 */}
            <div className="bg-muted/40 backdrop-blur-sm rounded px-1.5 sm:px-4 py-1 sm:py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-3">
                  <Avatar className={`w-5 h-5 sm:w-10 sm:h-10 ${topAIModel?.id === 'hunsoccermax' || topAIModel?.id === 'hunsoccer-max' ? 'rounded-full' : 'rounded-lg'}`}>
                    <AvatarImage src={topAIModel ? getModelIcon(topAIModel.id) : hunsoccerAiIcon} />
                    <AvatarFallback className="text-[7px] sm:text-xs">AI</AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-[9px] sm:text-sm">
                    {topAIModel ? getModelDisplayName(topAIModel.id, topAIModel.name) : (t('top_ai_model_name') || 'DeepSeek R1')}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-6 text-[7px] sm:text-sm">
                  <span className="text-muted-foreground">{t('banner_predictions')} <span className="font-bold text-foreground">{topAIModel?.totalPredictions || AI_BENCHMARK_PREDICTIONS}</span></span>
                  <span className="text-muted-foreground">{t('banner_win_rate')} <span className="font-bold text-foreground">{topAIModel ? topAIModel.winRate.toFixed(2) : AI_BENCHMARK_WIN_RATE.toFixed(2)}%</span></span>
                  <span className="text-muted-foreground hidden xs:flex items-center gap-0.5">{t('banner_profit')} <span className="font-bold text-foreground flex items-center gap-0.5">{topAIModel ? Math.abs(topAIModel.profitAmount).toLocaleString() : Math.round(AI_BENCHMARK_PROFIT / 100).toLocaleString()}<img src={hunterCoinIcon} alt="猎人币" className="w-2 h-2 sm:w-4 sm:h-4" /></span></span>
                </div>
              </div>
            </div>
            
            {/* 玩家专属模型数据 - 手机端超紧凑 */}
            {user ? (
              <div className={`rounded px-1.5 sm:px-4 py-1 sm:py-3 backdrop-blur-sm ${meetsRequirements ? 'bg-success/20' : 'bg-muted/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-3">
                    <div className="relative">
                      <Avatar className="w-5 h-5 sm:w-10 sm:h-10 border border-primary/50">
                        <AvatarImage src={currentPlayer?.avatarUrl || '/avatars/avatar-1.png'} />
                        <AvatarFallback className="text-[7px] sm:text-xs">{currentPlayer?.displayName?.charAt(0) || 'P'}</AvatarFallback>
                      </Avatar>
                      {currentPlayer && currentPlayer.rank > 0 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center text-[5px] sm:text-[10px] font-bold text-primary-foreground">
                          #{currentPlayer.rank}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-[9px] sm:text-sm truncate max-w-[70px] sm:max-w-none">{currentPlayer?.displayName || userProfile?.display_name || t('predictor_exclusive_model') || '预测者专属模型'}</p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-6 text-[7px] sm:text-sm">
                    <span className="text-muted-foreground">
                      {t('banner_predictions')} <span className={`font-bold ${playerPredictions >= aiBenchmarkPredictions ? 'text-success' : 'text-foreground'}`}>{playerPredictions}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t('banner_win_rate')} <span className={`font-bold ${playerWinRate >= aiBenchmarkWinRate ? 'text-success' : 'text-foreground'}`}>{playerWinRate.toFixed(1)}%</span>
                    </span>
                    <span className="text-muted-foreground hidden xs:flex items-center gap-0.5">
                      {t('banner_profit')} <span className={`font-bold flex items-center gap-0.5 ${playerProfit >= aiBenchmarkProfit ? 'text-success' : 'text-foreground'}`}>{(playerProfit / 100).toLocaleString()}<img src={hunterCoinIcon} alt="猎人币" className="w-2 h-2 sm:w-4 sm:h-4" /></span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded px-1.5 sm:px-4 py-1 sm:py-3 bg-muted/40 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-3">
                    <Avatar className="w-5 h-5 sm:w-10 sm:h-10 border border-dashed border-white/30">
                      <AvatarFallback className="bg-white/5">
                        <span className="text-[7px] sm:text-xs text-muted-foreground/50">?</span>
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-bold text-[9px] sm:text-sm">{t('predictor_exclusive_model') || '预测者专属模型'}</p>
                  </div>
                  <button
                    onClick={() => navigate('/auth')}
                    className="px-1.5 sm:px-4 py-0.5 sm:py-2 bg-primary text-primary-foreground rounded text-[8px] sm:text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    {t('login')}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 倒计时和统计 - 手机端超紧凑 */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-6">
            {/* 倒计时 */}
            <FlipCountdown 
              days={countdown.days} 
              hours={countdown.hours} 
              minutes={countdown.minutes} 
              seconds={countdown.seconds}
              t={t}
            />
            
            {/* 统计数据 */}
            <div className="flex items-center gap-1.5 sm:gap-0">
              <div className="hidden sm:block h-10 w-px bg-border/50" />
              <div className="flex flex-col items-center sm:mx-6">
                <span className="text-xs sm:text-2xl font-bold text-foreground">{qualifiedCount}</span>
                <span className="text-[6px] sm:text-[10px] text-muted-foreground">{t('people_qualified')}</span>
              </div>
              <div className="h-4 sm:h-10 w-px bg-border/30" />
              <div className="flex flex-col items-center ml-1 sm:ml-0">
                <span className="text-xs sm:text-2xl font-bold text-amber-400">
                  <AnimatedPrizePerPerson value={prizePerPerson} prevValue={prevPrizePerPerson} />
                </span>
                <span className="text-[6px] sm:text-[10px] text-muted-foreground">{t('prize_per_person') || '平分奖金'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeAIBanner;

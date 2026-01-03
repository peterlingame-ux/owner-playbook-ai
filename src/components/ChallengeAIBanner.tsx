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
import { virtualPlayers } from "@/data/virtualPlayers";

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
  const [prevPrizePerPerson, setPrevPrizePerPerson] = useState(PRIZE_POOL);

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

  // Update previous prize value when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevPrizePerPerson(prizePerPerson);
    }, 1500);
    return () => clearTimeout(timer);
  }, [prizePerPerson]);

  return (
    <Card className="border-border/50 overflow-hidden relative">
      {/* 绿色草地背景图 - 手机端优化，保持比例不拉伸 */}
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
      {/* 手机端背景渐变遮罩 - 确保文字可读 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background/40 sm:from-background/20 sm:via-transparent sm:to-background/30" />
      <CardContent className="p-2 sm:p-6 relative">
        <div className="flex flex-col gap-1.5 sm:gap-5">
          {/* 主标题 - 手机端紧凑布局 */}
          <div className="text-center">
            <motion.div 
              className="flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-1 sm:gap-3 mb-0.5 sm:mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="text-sm xs:text-base sm:text-4xl font-black text-foreground flex items-center gap-0.5 sm:gap-1 flex-wrap justify-center">
                <motion.span
                  className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                >
                  <AnimatedPrizeNumber value={1000000} />
                </motion.span>
              </span>
              <span className="text-[9px] xs:text-[10px] sm:text-xl font-bold text-foreground">{t('big_prize_waiting')}</span>
            </motion.div>
            <p className="text-[8px] xs:text-[9px] sm:text-sm text-white/90 max-w-lg mx-auto leading-tight px-1 line-clamp-2">
              {t('challenge_description')}
            </p>
          </div>
          
          {/* AI vs 玩家数据对比 - 手机端更紧凑 */}
          <div className="w-full max-w-3xl mx-auto space-y-1 sm:space-y-2">
            {/* AI数据 */}
            <div className="bg-muted/40 backdrop-blur-sm rounded-md sm:rounded-lg px-2 sm:px-4 py-1.5 sm:py-3">
              <div className="flex items-center justify-between gap-1 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <Avatar className="w-6 h-6 sm:w-10 sm:h-10 border sm:border-2 border-warning/50">
                    <AvatarImage src={hunsoccerAiIcon} />
                    <AvatarFallback className="text-[8px] sm:text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-[10px] sm:text-sm">{t('top_ai_model_name') || 'DeepSeek R1'}</p>
                    <p className="text-[8px] sm:text-xs text-muted-foreground hidden sm:block">{t('ai_benchmark')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-6 text-[8px] sm:text-sm">
                  <span className="text-muted-foreground">{t('banner_predictions')} <span className="font-bold text-foreground">247</span></span>
                  <span className="text-muted-foreground">{t('banner_win_rate')} <span className="font-bold text-foreground">78.95%</span></span>
                  <span className="text-muted-foreground hidden xs:flex items-center gap-0.5">{t('banner_profit')} <span className="font-bold text-foreground flex items-center gap-0.5">24789<img src={hunterCoinIcon} alt="猎人币" className="w-2.5 h-2.5 sm:w-4 sm:h-4" /></span></span>
                </div>
              </div>
            </div>
            
            {/* 玩家专属模型数据 - 手机端紧凑 */}
            {user ? (
              <div className={`rounded-md sm:rounded-lg px-2 sm:px-4 py-1.5 sm:py-3 backdrop-blur-sm ${meetsRequirements ? 'bg-success/20' : 'bg-muted/40'}`}>
                <div className="flex items-center justify-between gap-1 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <div className="relative">
                      <Avatar className="w-6 h-6 sm:w-10 sm:h-10 border sm:border-2 border-primary/50">
                        <AvatarImage src={currentPlayer?.avatarUrl || '/avatars/avatar-1.png'} />
                        <AvatarFallback className="text-[8px] sm:text-xs">{currentPlayer?.displayName?.charAt(0) || 'P'}</AvatarFallback>
                      </Avatar>
                      {currentPlayer && currentPlayer.rank > 0 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center text-[6px] sm:text-[10px] font-bold text-primary-foreground">
                          #{currentPlayer.rank}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[10px] sm:text-sm truncate max-w-[80px] sm:max-w-none">{t('predictor_exclusive_model') || '预测者专属模型'}</p>
                      <p className="text-[8px] sm:text-xs text-muted-foreground hidden sm:block">
                        {meetsRequirements ? <span className="text-success">✓ {t('qualified_status')}</span> : t('keep_going')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-6 text-[8px] sm:text-sm">
                    <span className="text-muted-foreground">
                      {t('banner_predictions')} <span className={`font-bold ${playerPredictions >= AI_BENCHMARK_PREDICTIONS ? 'text-success' : 'text-foreground'}`}>{playerPredictions}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t('banner_win_rate')} <span className={`font-bold ${playerWinRate >= AI_BENCHMARK_WIN_RATE ? 'text-success' : 'text-foreground'}`}>{playerWinRate.toFixed(1)}%</span>
                    </span>
                    <span className="text-muted-foreground hidden xs:flex items-center gap-0.5">
                      {t('banner_profit')} <span className={`font-bold flex items-center gap-0.5 ${playerProfit >= AI_BENCHMARK_PROFIT ? 'text-success' : 'text-foreground'}`}>{(playerProfit / 100).toLocaleString()}<img src={hunterCoinIcon} alt="猎人币" className="w-2.5 h-2.5 sm:w-4 sm:h-4" /></span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md sm:rounded-lg px-2 sm:px-4 py-1.5 sm:py-3 bg-muted/40 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <Avatar className="w-6 h-6 sm:w-10 sm:h-10 border sm:border-2 border-dashed border-white/30">
                      <AvatarFallback className="bg-white/5">
                        <span className="text-[8px] sm:text-xs text-muted-foreground/50">?</span>
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-[10px] sm:text-sm">{t('predictor_exclusive_model') || '预测者专属模型'}</p>
                      <p className="text-[8px] sm:text-xs text-muted-foreground">{t('login_to_view')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/auth')}
                    className="px-2 sm:px-4 py-1 sm:py-2 bg-primary text-primary-foreground rounded-md text-[9px] sm:text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap shrink-0"
                  >
                    {t('login')}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 倒计时和统计 - 手机端更紧凑 */}
          <div className="flex items-center justify-center gap-2 sm:gap-6">
            {/* 倒计时 */}
            <FlipCountdown 
              days={countdown.days} 
              hours={countdown.hours} 
              minutes={countdown.minutes} 
              seconds={countdown.seconds}
              t={t}
            />
            
            {/* 统计数据 */}
            <div className="flex items-center gap-2 sm:gap-0">
              <div className="hidden sm:block h-8 sm:h-10 w-px bg-border/50" />
              <div className="flex flex-col items-center sm:mx-6">
                <span className="text-sm sm:text-2xl font-bold text-foreground">{qualifiedCount}</span>
                <span className="text-[7px] sm:text-[10px] text-muted-foreground">{t('people_qualified')}</span>
              </div>
              <div className="h-5 sm:h-10 w-px bg-border/30 sm:bg-border/50" />
              <div className="flex flex-col items-center ml-2 sm:ml-0">
                <span className="text-sm sm:text-2xl font-bold text-amber-400">
                  <AnimatedPrizePerPerson value={prizePerPerson} prevValue={prevPrizePerPerson} />
                </span>
                <span className="text-[7px] sm:text-[10px] text-muted-foreground">{t('prize_per_person') || '平分奖金'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeAIBanner;

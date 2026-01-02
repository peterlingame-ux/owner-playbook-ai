import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Send, 
  Brain, 
  History, 
  Trash2, 
  Zap,
  Database,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
  Tag,
  FileText,
  Calendar,
  Shield,
  ChevronLeft,
  User,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import hunsoccerAlphaLogo from "@/assets/hunsoccer-alpha-logo-outline.png";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import TiltCard from "@/components/TiltCard";

interface TrainingRecord {
  id: string;
  content: string;
  created_at: string;
}

interface BetData {
  match: any; // Flexible match type to support different formats
  aiId: string;
  betType: string;
  prediction: string;
  confidence: number;
  odds: number;
  betAmount: number;
  handicapLine?: number;
  overUnderLine?: number;
  overUnderPick?: string;
  confirmed: boolean;
}

interface PlayerExclusiveModelCardProps {
  className?: string;
  // Data from ActiveAIBets
  currentMatchData?: { match: any; bets: BetData[] } | null;
  moneylineBet?: BetData | null;
  handicapBet?: BetData | null;
  overUnderBet?: BetData | null;
  balanceValue?: string;
  matchIndex?: number;
  matchEntries?: Array<{ match: any; bets: BetData[] }>;
  onOpenPKDialog?: (match: any) => void;
  onOpenAnalysis?: (matchId: string, aiId: string, match: any, aiModel: any) => void;
  getTeamName?: (match: any, team: 'home' | 'away') => string;
  getLeagueName?: (match: any) => string;
  onPrevMatch?: (e: React.MouseEvent) => void;
  onNextMatch?: (e: React.MouseEvent) => void;
  // Manual prediction mode
  isManualPrediction?: boolean;
  availableMatches?: any[];
}

// Common football-related keywords to extract
const FOOTBALL_KEYWORDS = [
  '主队', '客队', '胜率', '进球', '失球', '主场', '客场', '连胜', '连败', '不败',
  '实力', '状态', '伤病', '阵容', '战术', '防守', '进攻', '中场', '前锋', '后卫',
  '门将', '角球', '任意球', '点球', '红牌', '黄牌', '换人', '加时', '半场', '全场',
  '欧冠', '英超', '西甲', '德甲', '意甲', '法甲', '世界杯', '欧洲杯', '联赛', '杯赛',
  '让球', '大小球', '亚盘', '欧赔', '赔率', '盘口', '水位', '初盘', '即时', '临场',
  '爆冷', '热门', '冷门', '稳胆', '单关', '串关', '比分', '净胜', '总进球', '半全场'
];

// MatchTimeDisplay component for PlayerExclusiveModelCard
const MatchTimeDisplay = ({ match }: { match: any }) => {
  const { t } = useTranslation();
  const [timeDisplay, setTimeDisplay] = useState<string>('');
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const status = match.status_short;
      
      if (status !== 'NS') {
        setShowCountdown(false);
        const showScoreAndTimeStatuses = ['LIVE', '1H', 'HT', '2H', 'ET'];
        const shouldShowScore = showScoreAndTimeStatuses.includes(status);
        setIsLive(shouldShowScore);
        
        if (shouldShowScore) {
          const elapsed = match.status_elapsed;
          switch (status) {
            case 'HT':
              setTimeDisplay(t('half_time') || '半场');
              break;
            case '1H':
            case '2H':
            case 'ET':
            case 'LIVE':
              setTimeDisplay(elapsed !== null && elapsed !== undefined ? `${elapsed}'` : status);
              break;
            default:
              setTimeDisplay(status);
              break;
          }
        } else {
          setIsLive(false);
          switch (status) {
            case 'P':
              setTimeDisplay('PEN');
              break;
            case 'BREAK':
              setTimeDisplay('BREAK');
              break;
            default:
              setTimeDisplay(status);
              break;
          }
        }
        return;
      }
      
      setIsLive(false);
      setShowCountdown(true);
      const kickoffTime = new Date(match.kickoff_at);
      const now = new Date();
      const diff = kickoffTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeDisplay(t('starting_soon') || '即将开始');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeDisplay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [match.status_short, match.status_elapsed, match.kickoff_at, t]);

  const homeScore = match.goals_home ?? 0;
  const awayScore = match.goals_away ?? 0;

  return (
    <div className="flex flex-col items-center gap-0.5 px-1 sm:px-1 shrink-0">
      {isLive ? (
        <>
          <div className="flex items-center gap-1 sm:gap-1">
            <span className="text-sm sm:text-sm font-bold font-mono-data text-success">{homeScore}</span>
            <span className="text-[9px] sm:text-[9px] text-muted-foreground">-</span>
            <span className="text-sm sm:text-sm font-bold font-mono-data text-success">{awayScore}</span>
          </div>
          <span className="text-[7px] sm:text-[7px] text-success font-bold font-mono uppercase">
            {timeDisplay}
          </span>
        </>
      ) : (
        <>
          <span className="text-[9px] sm:text-[9px] text-muted-foreground font-bold">VS</span>
          {showCountdown && (
            <span className="text-[6px] sm:text-[7px] text-muted-foreground/70">
              {t('until_match_starts') || '距离比赛开始'}
            </span>
          )}
          <span className="text-[7px] sm:text-[7px] text-muted-foreground font-mono">
            {timeDisplay}
          </span>
        </>
      )}
    </div>
  );
};

const PlayerExclusiveModelCard = ({ 
  className,
  currentMatchData,
  moneylineBet,
  handicapBet,
  overUnderBet,
  balanceValue,
  matchIndex = 0,
  matchEntries = [],
  onOpenPKDialog,
  onOpenAnalysis,
  getTeamName,
  getLeagueName,
  onPrevMatch,
  onNextMatch,
  isManualPrediction = false,
  availableMatches = []
}: PlayerExclusiveModelCardProps) => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const [showFeedDialog, setShowFeedDialog] = useState(false);
  const [feedText, setFeedText] = useState('');
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedProgress, setFeedProgress] = useState(0);
  const [feedComplete, setFeedComplete] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState<TrainingRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [trainingCount, setTrainingCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('feed');

  // Manual prediction state
  const [showManualBetDialog, setShowManualBetDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [manualBetType, setManualBetType] = useState<'handicap' | 'over_under'>('handicap');
  const [manualBetAmount, setManualBetAmount] = useState(100);
  const [manualHandicapLine, setManualHandicapLine] = useState(0);
  const [manualOverUnderLine, setManualOverUnderLine] = useState(2.5);
  const [manualPrediction, setManualPrediction] = useState<string>('');
  const [manualOverUnderPick, setManualOverUnderPick] = useState<'over' | 'under'>('over');
  const [isSubmittingBet, setIsSubmittingBet] = useState(false);
  const [manualBetConfirmed, setManualBetConfirmed] = useState(false);
  const [confirmedManualBet, setConfirmedManualBet] = useState<any>(null);

  // Demo matches for manual prediction when no real matches available
  const demoMatches = useMemo(() => [
    {
      mid: 'demo_1',
      home_team_name: 'Manchester United',
      away_team_name: 'Liverpool',
      home_logo: 'https://media.api-sports.io/football/teams/33.png',
      away_logo: 'https://media.api-sports.io/football/teams/40.png',
      league_name: 'Premier League',
      date: new Date().toISOString().split('T')[0],
    },
    {
      mid: 'demo_2',
      home_team_name: 'Barcelona',
      away_team_name: 'Real Madrid',
      home_logo: 'https://media.api-sports.io/football/teams/529.png',
      away_logo: 'https://media.api-sports.io/football/teams/541.png',
      league_name: 'La Liga',
      date: new Date().toISOString().split('T')[0],
    },
    {
      mid: 'demo_3',
      home_team_name: 'Bayern Munich',
      away_team_name: 'Dortmund',
      home_logo: 'https://media.api-sports.io/football/teams/157.png',
      away_logo: 'https://media.api-sports.io/football/teams/165.png',
      league_name: 'Bundesliga',
      date: new Date().toISOString().split('T')[0],
    },
  ], []);

  // Use available matches or demo matches
  const matchesToShow = availableMatches.length > 0 ? availableMatches : demoMatches;

  const trainingSteps = [
    { icon: Database, label: '数据解析', description: '正在分析输入内容...' },
    { icon: Brain, label: '神经网络', description: '更新模型权重...' },
    { icon: Target, label: '模式识别', description: '学习预测模式...' },
    { icon: TrendingUp, label: '优化完成', description: '模型已更新！' },
  ];

  // Demo mode for non-logged-in users
  const isDemo = !user || !userProfile;
  const displayName = isDemo ? t('demo_player') || '预测者专属模型' : `${userProfile?.display_name || '玩家'}的模型`;
  const avatarUrl = isDemo ? '/avatars/avatar-1.png' : (userProfile?.avatar_url || '/avatars/avatar-1.png');

  // Calculate training trend data (last 7 days)
  const trendData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(day => {
      const dayStart = startOfDay(day);
      const count = trainingHistory.filter(record => {
        const recordDate = startOfDay(new Date(record.created_at));
        return recordDate.getTime() === dayStart.getTime();
      }).length;

      return {
        date: format(day, 'MM/dd'),
        count,
        fullDate: format(day, 'yyyy-MM-dd')
      };
    });
  }, [trainingHistory]);

  // Extract and count keywords from training history
  const keywordStats = useMemo(() => {
    const allText = trainingHistory.map(r => r.content).join(' ');
    const keywordCounts: Record<string, number> = {};

    FOOTBALL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = allText.match(regex);
      if (matches && matches.length > 0) {
        keywordCounts[keyword] = matches.length;
      }
    });

    // Sort by count and take top 12
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([keyword, count]) => ({ keyword, count }));
  }, [trainingHistory]);

  // Calculate total characters
  const totalCharacters = useMemo(() => {
    return trainingHistory.reduce((sum, r) => sum + r.content.length, 0);
  }, [trainingHistory]);

  // Fetch training history count on mount
  useEffect(() => {
    if (user) {
      fetchTrainingCount();
    }
  }, [user]);

  // Fetch training history when dialog opens
  useEffect(() => {
    if (showFeedDialog && user) {
      fetchTrainingHistory();
    }
  }, [showFeedDialog, user]);

  const fetchTrainingCount = async () => {
    if (!user) return;
    
    const { count, error } = await supabase
      .from('ai_training_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (!error && count !== null) {
      setTrainingCount(count);
    }
  };

  const fetchTrainingHistory = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('ai_training_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100); // Fetch more for better analytics
    
    if (error) {
      console.error('Error fetching training history:', error);
      toast.error(t('fetch_training_failed'));
    } else {
      setTrainingHistory(data || []);
    }
    setIsLoadingHistory(false);
  };

  const saveTrainingData = async (content: string) => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('ai_training_history')
        .insert({
          user_id: user.id,
          content: content
        })
        .select(); // 返回插入的数据，用于验证
      
      if (error) {
        console.error('Error saving training data:', error);
        toast.error(`保存失败: ${error.message}`);
        return false;
      }
      
      if (data && data.length > 0) {
        console.log('Training data saved successfully:', data[0].id);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Unexpected error saving training data:', err);
      toast.error('保存失败，请检查网络连接');
      return false;
    }
  };

  const deleteTrainingRecord = async (id: string) => {
    const { error } = await supabase
      .from('ai_training_history')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('删除失败');
      return;
    }
    
    setTrainingHistory(prev => prev.filter(r => r.id !== id));
    setTrainingCount(prev => prev - 1);
    toast.success('已删除');
  };

  // Handle AI feeding progress animation with steps
  useEffect(() => {
    if (isFeeding && feedProgress < 100) {
      const interval = setInterval(() => {
        setFeedProgress(prev => {
          const increment = Math.random() * 8 + 3;
          const newProgress = Math.min(prev + increment, 100);
          
          if (newProgress >= 25 && currentStep < 1) setCurrentStep(1);
          if (newProgress >= 50 && currentStep < 2) setCurrentStep(2);
          if (newProgress >= 75 && currentStep < 3) setCurrentStep(3);
          
          if (newProgress >= 100) {
            setIsFeeding(false);
            setFeedComplete(true);
            clearInterval(interval);
          }
          return newProgress;
        });
      }, 120);
      return () => clearInterval(interval);
    }
  }, [isFeeding, feedProgress, currentStep]);

  const handleFeedSubmit = async () => {
    if (!feedText.trim()) {
      toast.error('请输入训练数据');
      return;
    }
    
    if (isDemo) {
      toast.info('请先登录以保存训练数据');
      // 演示模式下不执行训练动画
      return;
    }
    
    // 保存训练数据
    const saved = await saveTrainingData(feedText.trim());
    if (!saved) {
      toast.error('保存训练数据失败，请稍后重试');
      return;
    }
    
    // 保存成功后立即更新训练计数和历史记录
    setTrainingCount(prev => prev + 1);
    // 延迟获取历史记录，确保数据库已写入
    setTimeout(() => {
      fetchTrainingHistory();
    }, 500);
    
    // 开始训练动画
    setCurrentStep(0);
    setIsFeeding(true);
    setFeedProgress(0);
    setFeedComplete(false);
  };

  const handleDialogClose = () => {
    setShowFeedDialog(false);
    setFeedText('');
    setFeedProgress(0);
    setIsFeeding(false);
    setFeedComplete(false);
    setCurrentStep(0);
    setActiveTab('feed');
  };

  const handleFeedComplete = () => {
    toast.success('AI训练完成！您的专属模型已更新');
    // 训练计数和历史记录已在 handleFeedSubmit 中更新，这里只需刷新一次确保数据同步
    if (!isDemo && user) {
      fetchTrainingCount();
      fetchTrainingHistory();
    }
    setFeedText('');
    setFeedProgress(0);
    setFeedComplete(false);
    setCurrentStep(0);
  };

  // Get keyword color based on frequency
  const getKeywordColor = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'bg-amber-500 text-black';
    if (ratio > 0.4) return 'bg-amber-500/60 text-white';
    return 'bg-amber-500/30 text-amber-200';
  };

  // Helper functions with fallbacks
  const safeGetTeamName = (match: any, team: 'home' | 'away') => {
    if (getTeamName) return getTeamName(match, team);
    return team === 'home' ? (match?.home_team_name || '主队') : (match?.away_team_name || '客队');
  };

  const safeGetLeagueName = (match: any) => {
    if (getLeagueName) return getLeagueName(match);
    return match?.league_name || '联赛';
  };

  const bet = handicapBet || overUnderBet || moneylineBet;

  // State to track slide direction for animation
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const handlePrevMatch = (e: React.MouseEvent) => {
    setSlideDirection('left');
    if (onPrevMatch) onPrevMatch(e);
  };

  const handleNextMatch = (e: React.MouseEvent) => {
    setSlideDirection('right');
    if (onNextMatch) onNextMatch(e);
  };

  // Handle manual bet submission
  const handleManualBetSubmit = async () => {
    if (!selectedMatch) {
      toast.error(t('please_select_match') || '请选择比赛');
      return;
    }

    if (manualBetType === 'handicap' && !manualPrediction) {
      toast.error(t('please_select_team') || '请选择球队');
      return;
    }

    setIsSubmittingBet(true);

    // Calculate odds (demo calculation)
    const odds = 1.85 + Math.random() * 0.3;
    const potentialPayout = manualBetAmount * odds;

    // If user is logged in, save to database
    if (user) {
      try {
        const matchDate = selectedMatch.date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase.rpc('place_bet', {
          p_user_id: user.id,
          p_match_id: selectedMatch.mid || selectedMatch.fixture_id?.toString(),
          p_match_date: matchDate,
          p_prediction: manualBetType === 'handicap' ? manualPrediction : manualOverUnderPick.toUpperCase(),
          p_prediction_type: manualBetType,
          p_bet_amount: manualBetAmount,
          p_potential_payout: potentialPayout,
          p_confidence: 75,
          p_handicap_line: manualBetType === 'handicap' ? manualHandicapLine : null,
          p_over_under_line: manualBetType === 'over_under' ? manualOverUnderLine : null,
        });

        if (error) {
          console.error('Place bet error:', error);
          toast.error(t('bet_failed') || '下注失败');
          setIsSubmittingBet(false);
          return;
        }
      } catch (err) {
        console.error('Manual bet error:', err);
        toast.error(t('unknown_error') || '未知错误');
        setIsSubmittingBet(false);
        return;
      }
    }

    // Save the confirmed bet for display (works for both demo and logged-in users)
    setConfirmedManualBet({
      match: selectedMatch,
      betType: manualBetType,
      prediction: manualBetType === 'handicap' ? manualPrediction : manualOverUnderPick.toUpperCase(),
      betAmount: manualBetAmount,
      odds: odds,
      confidence: 75,
      handicapLine: manualBetType === 'handicap' ? manualHandicapLine : undefined,
      overUnderLine: manualBetType === 'over_under' ? manualOverUnderLine : undefined,
      overUnderPick: manualBetType === 'over_under' ? manualOverUnderPick : undefined,
    });

    setManualBetConfirmed(true);
    setShowManualBetDialog(false);
    setIsSubmittingBet(false);
    toast.success(isDemo ? (t('demo_prediction_success') || '体验预测成功') : (t('bet_success') || '预测成功'));
  };

  // Reset manual bet when switching modes
  useEffect(() => {
    if (!isManualPrediction) {
      setManualBetConfirmed(false);
      setConfirmedManualBet(null);
    }
  }, [isManualPrediction]);

  return (
    <>
      <TiltCard
        className={`group rounded-lg sm:rounded-2xl p-1.5 sm:p-5 bg-gradient-to-br from-amber-900/20 via-slate-800/60 to-slate-900/40 backdrop-blur-sm border-2 border-amber-500/60 hover:border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all duration-300 overflow-hidden cursor-pointer ${className}`}
        onClick={handleNextMatch}
        maxTilt={8}
        scale={1.02}
        glare={false}
        maxGlare={0}
      >
        {/* Animated Background Pattern - Hidden on mobile for performance */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none hidden sm:block">
          <motion.div 
            className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"
            animate={{ 
              x: [20, 40, 20],
              y: [-20, -40, -20],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl"
            animate={{ 
              x: [-10, -30, -10],
              y: [10, 30, 10],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Match Counter - Top Right */}
        {matchEntries.length > 1 && (
          <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-20 flex items-center gap-0.5 sm:gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 sm:h-6 sm:w-6 p-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/10"
              onClick={handlePrevMatch}
              title={t('previous_match') || '上一场'}
            >
              <ChevronLeft className="h-2 w-2 sm:h-3 sm:w-3" />
            </Button>
            <span className="text-[8px] sm:text-xs font-mono font-medium px-1 sm:px-2 py-0 sm:py-0.5 rounded-full bg-white/10 border border-white/10">
              {matchIndex + 1}/{matchEntries.length}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 sm:h-6 sm:w-6 p-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/10"
              onClick={handleNextMatch}
              title={t('next_match') || '下一场'}
            >
              <ChevronRight className="h-2 w-2 sm:h-3 sm:w-3" />
            </Button>
          </div>
        )}

        {/* No Bets Indicator */}
        {matchEntries.length === 0 && (
          <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-20">
            <Badge 
              variant="outline"
              className="text-[8px] sm:text-[10px] font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-white/10 border-white/20 text-foreground/80 backdrop-blur-sm"
            >
              {t('no_bets')}
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 space-y-1.5 sm:space-y-4 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`player-${matchIndex}`}
              initial={{ 
                opacity: 0, 
                x: slideDirection === 'right' ? 80 : -80 
              }}
              animate={{ 
                opacity: 1, 
                x: 0 
              }}
              exit={{ 
                opacity: 0, 
                x: slideDirection === 'right' ? -80 : 80 
              }}
              transition={{ 
                duration: 0.25, 
                ease: "easeOut" 
              }}
              className="space-y-1.5 sm:space-y-4"
            >
              {/* AI Model Header */}
              <div className="flex items-center justify-between">
                {/* Player Avatar & Info */}
                <div className="flex items-center gap-1 sm:gap-3">
                  <div className="relative">
                    <Avatar className={`h-6 w-6 sm:h-12 sm:w-12 shadow-lg ${isDemo ? 'border border-dashed sm:border-2 border-white/30' : 'ring-1 sm:ring-2 ring-white/20'}`}>
                      {!isDemo ? (
                        <>
                          <AvatarImage 
                            src={avatarUrl} 
                            alt={displayName} 
                            className="object-cover" 
                          />
                          <AvatarFallback className="text-[8px] sm:text-sm font-bold bg-white/10">{displayName[0]}</AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="bg-white/5">
                          <User className="h-3 w-3 sm:h-5 sm:w-5 text-muted-foreground/40" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {/* Online Indicator - only show when logged in */}
                    {!isDemo && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 sm:w-3.5 sm:h-3.5 bg-success rounded-full border sm:border-2 border-card" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] sm:text-sm font-bold tracking-wide uppercase text-slate-200">
                      {displayName}
                    </span>
                    <span className="text-[8px] sm:text-xs text-muted-foreground/80 font-medium inline-flex items-center gap-0.5">
                      <img src={hunterCoinIcon} alt="猎人币" className="w-2.5 h-2.5 sm:w-5 sm:h-5" />
                      {!isDemo ? (balanceValue || '10,000') : '--'}
                    </span>
                  </div>
                </div>
                
                {/* Action Button - Only show when has bets, hidden on mobile */}
                {bet && currentMatchData && onOpenAnalysis && (
                  <Button
                    size="sm"
                    className="hidden sm:flex h-7 sm:h-8 px-2.5 sm:px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-foreground font-medium text-[10px] sm:text-xs backdrop-blur-sm transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAnalysis(
                        currentMatchData.match.mid || currentMatchData.match.fixture_id,
                        'hunsoccermax',
                        currentMatchData.match,
                        { id: 'hunsoccermax', displayName: 'HUNSOCCER MAX' }
                      );
                    }}
                  >
                    <span className="hidden sm:inline">{t('view_analysis')}</span>
                    <span className="sm:hidden">{t('view') || '查看'}</span>
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1" />
                  </Button>
                )}
              </div>

              {/* Training Badge - Show if has training, hidden on mobile */}
              {trainingCount > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="text-[10px] font-medium px-2.5 py-1 bg-white/10 border-white/20 text-foreground/80 cursor-pointer hover:bg-white/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFeedDialog(true);
                    }}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    {trainingCount}{t('times_training')}
                  </Badge>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Match Info */}
              {currentMatchData ? (
                <div className="space-y-1 sm:space-y-3">
                  {/* League Badge */}
                  <div className="flex items-center justify-center">
                    <Badge className="text-[7px] sm:text-[11px] py-0 sm:py-1 px-1.5 sm:px-3 bg-white/10 border-white/20 text-foreground/90 font-medium backdrop-blur-sm">
                      {safeGetLeagueName(currentMatchData.match)}
                    </Badge>
                  </div>
                
                  {/* Teams Display */}
                  <div className="flex items-center justify-between gap-0.5 sm:gap-2 px-0">
                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-2 flex-1 min-w-0">
                      <div className="relative">
                        {currentMatchData.match.home_logo ? (
                          <Avatar className="h-5 w-5 sm:h-10 sm:w-10 ring-1 sm:ring-2 ring-white/10 shadow-md">
                            <AvatarImage src={currentMatchData.match.home_logo} alt={safeGetTeamName(currentMatchData.match, 'home')} />
                            <AvatarFallback><Shield className="h-2 w-2 sm:h-4 sm:w-4" /></AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-5 w-5 sm:h-10 sm:w-10 rounded-full bg-white/10 flex items-center justify-center ring-1 sm:ring-2 ring-white/10">
                            <Shield className="h-2 w-2 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(currentMatchData.match, 'home')}
                      </p>
                    </div>
                  
                    {/* Match Time Display */}
                    <MatchTimeDisplay match={currentMatchData.match} />
                  
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-2 flex-1 min-w-0">
                      <div className="relative">
                        {currentMatchData.match.away_logo ? (
                          <Avatar className="h-5 w-5 sm:h-10 sm:w-10 ring-1 sm:ring-2 ring-white/10 shadow-md">
                            <AvatarImage src={currentMatchData.match.away_logo} alt={safeGetTeamName(currentMatchData.match, 'away')} />
                            <AvatarFallback><Shield className="h-2 w-2 sm:h-4 sm:w-4" /></AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-5 w-5 sm:h-10 sm:w-10 rounded-full bg-white/10 flex items-center justify-center ring-1 sm:ring-2 ring-white/10">
                            <Shield className="h-2 w-2 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(currentMatchData.match, 'away')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : isManualPrediction && !manualBetConfirmed ? (
                /* Manual Prediction Mode - Show Start Predict Button */
                <div className="flex flex-col items-center justify-center py-3 sm:py-4 text-center">
                  <Button
                    size="sm"
                    className="h-8 sm:h-10 px-4 sm:px-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs sm:text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowManualBetDialog(true);
                    }}
                  >
                    {t('start_prediction') || '开始预测'}
                  </Button>
                </div>
              ) : manualBetConfirmed && confirmedManualBet ? (
                /* Show confirmed manual bet */
                <div className="space-y-1 sm:space-y-3">
                  {/* League Badge */}
                  <div className="flex items-center justify-center">
                    <Badge className="text-[7px] sm:text-[11px] py-0 sm:py-1 px-1.5 sm:px-3 bg-white/10 border-white/20 text-foreground/90 font-medium backdrop-blur-sm">
                      {safeGetLeagueName(confirmedManualBet.match)}
                    </Badge>
                  </div>
                
                  {/* Teams Display */}
                  <div className="flex items-center justify-between gap-0.5 sm:gap-2 px-0">
                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-2 flex-1 min-w-0">
                      <div className="relative">
                        {confirmedManualBet.match.home_logo ? (
                          <Avatar className="h-5 w-5 sm:h-10 sm:w-10 ring-1 sm:ring-2 ring-white/10 shadow-md">
                            <AvatarImage src={confirmedManualBet.match.home_logo} alt={safeGetTeamName(confirmedManualBet.match, 'home')} />
                            <AvatarFallback><Shield className="h-2 w-2 sm:h-4 sm:w-4" /></AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-5 w-5 sm:h-10 sm:w-10 rounded-full bg-white/10 flex items-center justify-center ring-1 sm:ring-2 ring-white/10">
                            <Shield className="h-2 w-2 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(confirmedManualBet.match, 'home')}
                      </p>
                    </div>
                  
                    {/* VS */}
                    <div className="flex flex-col items-center gap-0.5 px-1 shrink-0">
                      <span className="text-[9px] sm:text-[9px] text-muted-foreground font-bold">VS</span>
                    </div>
                  
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-2 flex-1 min-w-0">
                      <div className="relative">
                        {confirmedManualBet.match.away_logo ? (
                          <Avatar className="h-5 w-5 sm:h-10 sm:w-10 ring-1 sm:ring-2 ring-white/10 shadow-md">
                            <AvatarImage src={confirmedManualBet.match.away_logo} alt={safeGetTeamName(confirmedManualBet.match, 'away')} />
                            <AvatarFallback><Shield className="h-2 w-2 sm:h-4 sm:w-4" /></AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-5 w-5 sm:h-10 sm:w-10 rounded-full bg-white/10 flex items-center justify-center ring-1 sm:ring-2 ring-white/10">
                            <Shield className="h-2 w-2 sm:h-4 sm:w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-[7px] sm:text-xs text-center leading-tight truncate w-full max-w-[50px] sm:max-w-[100px]">
                        {safeGetTeamName(confirmedManualBet.match, 'away')}
                      </p>
                    </div>
                  </div>

                  {/* Manual Bet Details */}
                  {confirmedManualBet.betType === 'handicap' && (
                    <div className="bg-white/5 rounded-lg p-2 space-y-1 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-xs font-semibold text-foreground/90 uppercase">{t('handicap_bet')}</span>
                        <Badge variant="outline" className="text-[7px] sm:text-[9px] px-1.5 py-0.5 bg-success/20 text-success border-success/30">
                          Confirmed
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                          confirmedManualBet.prediction === 'HOME' ? 'bg-primary/20 border-primary/60' : 'bg-white/5 border-white/10 opacity-60'
                        }`}>
                          <span className="text-[8px] sm:text-[10px] font-semibold truncate flex-1">{safeGetTeamName(confirmedManualBet.match, 'home')}</span>
                          <span className="text-[8px] sm:text-[10px] font-mono font-bold text-primary">
                            {confirmedManualBet.handicapLine > 0 ? '+' : ''}{confirmedManualBet.handicapLine}
                          </span>
                        </div>
                        <div className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                          confirmedManualBet.prediction === 'AWAY' ? 'bg-primary/20 border-primary/60' : 'bg-white/5 border-white/10 opacity-60'
                        }`}>
                          <span className="text-[8px] sm:text-[10px] font-semibold truncate flex-1">{safeGetTeamName(confirmedManualBet.match, 'away')}</span>
                          <span className="text-[8px] sm:text-[10px] font-mono font-bold text-muted-foreground">
                            {-confirmedManualBet.handicapLine > 0 ? '+' : ''}{-confirmedManualBet.handicapLine}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[8px] sm:text-[10px] pt-1 border-t border-white/10">
                        <span className="text-muted-foreground">@<span className="font-mono font-bold text-foreground">{(confirmedManualBet.odds - 1).toFixed(2)}</span></span>
                        <span className="font-mono font-bold text-success">${(confirmedManualBet.betAmount * confirmedManualBet.odds).toFixed(0)}</span>
                      </div>
                    </div>
                  )}

                  {confirmedManualBet.betType === 'over_under' && (
                    <div className="bg-white/5 rounded-lg p-2 space-y-1 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-xs font-semibold text-foreground/90 uppercase">{t('over_under_bet')}</span>
                        <Badge variant="outline" className="text-[7px] sm:text-[9px] px-1.5 py-0.5 bg-success/20 text-success border-success/30">
                          Confirmed
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className={`p-1.5 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                          confirmedManualBet.overUnderPick === 'over' ? 'bg-primary/20 border-primary/60' : 'bg-white/5 border-white/10 opacity-60'
                        }`}>
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-[8px] sm:text-[10px] font-semibold">{t('over')}</span>
                          <span className="text-[8px] sm:text-[10px] font-mono font-bold">{confirmedManualBet.overUnderLine}</span>
                        </div>
                        <div className={`p-1.5 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                          confirmedManualBet.overUnderPick === 'under' ? 'bg-primary/20 border-primary/60' : 'bg-white/5 border-white/10 opacity-60'
                        }`}>
                          <TrendingUp className="h-3 w-3 rotate-180" />
                          <span className="text-[8px] sm:text-[10px] font-semibold">{t('under')}</span>
                          <span className="text-[8px] sm:text-[10px] font-mono font-bold">{confirmedManualBet.overUnderLine}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[8px] sm:text-[10px] pt-1 border-t border-white/10">
                        <span className="text-muted-foreground">@<span className="font-mono font-bold text-foreground">{(confirmedManualBet.odds - 1).toFixed(2)}</span></span>
                        <span className="font-mono font-bold text-success">${(confirmedManualBet.betAmount * confirmedManualBet.odds).toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 sm:py-6 text-center">
                  <img src={hunsoccerAlphaLogo} alt="HUNSOCCER" className="h-8 sm:h-16 w-auto opacity-15 mb-1 sm:mb-3" />
                  {isDemo ? (
                    <p className="text-[9px] sm:text-sm text-muted-foreground/80 font-medium">
                      {t('login_to_create_model')}
                    </p>
                  ) : (
                    <>
                      <p className="text-[9px] sm:text-sm text-muted-foreground/80 font-medium">
                        {t('no_active_predictions')}
                      </p>
                      <p className="text-[8px] sm:text-xs text-muted-foreground/60 mt-0.5 sm:mt-1 hidden sm:block">
                        {t('no_bets_for_ai')}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Handicap Bet - Modern Style - Hidden on mobile */}
              {handicapBet && currentMatchData && (
                <div className="hidden sm:block bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3 border border-white/10">
                  {/* Bet Type Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">{t('handicap_bet')}</span>
                    <Badge 
                      variant="outline"
                      className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${handicapBet.confirmed ? "bg-success/20 text-success border-success/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                    >
                      {handicapBet.confirmed ? "Confirmed" : "Pending"}
                    </Badge>
                  </div>
                  
                  {/* Selection Grid */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                      handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME"
                        ? "bg-primary/20 border-primary/60" 
                        : "bg-white/5 border-white/10 opacity-60"
                    }`}>
                      {currentMatchData.match.home_logo && (
                        <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                          <AvatarImage src={currentMatchData.match.home_logo} />
                          <AvatarFallback><Shield className="h-2 w-2 sm:h-3 sm:w-3" /></AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-[10px] sm:text-xs font-semibold truncate flex-1">{safeGetTeamName(currentMatchData.match, 'home')}</span>
                      {handicapBet.handicapLine !== undefined && (
                        <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                          handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME" ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {((handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                          {(handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                        </span>
                      )}
                    </div>
                    <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center gap-1 sm:gap-2 ${
                      handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY"
                        ? "bg-primary/20 border-primary/60" 
                        : "bg-white/5 border-white/10 opacity-60"
                    }`}>
                      {currentMatchData.match.away_logo && (
                        <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                          <AvatarImage src={currentMatchData.match.away_logo} />
                          <AvatarFallback><Shield className="h-2 w-2 sm:h-3 sm:w-3" /></AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-[10px] sm:text-xs font-semibold truncate flex-1">{safeGetTeamName(currentMatchData.match, 'away')}</span>
                      {handicapBet.handicapLine !== undefined && (
                        <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                          handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY" ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {((handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                          {(handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="text-muted-foreground">{t('confidence')}: <span className="font-bold text-foreground">{handicapBet.confidence}%</span></span>
                      <span className="text-muted-foreground">@<span className="font-mono font-bold text-foreground">{Math.max(0, handicapBet.odds - 1).toFixed(2)}</span></span>
                    </div>
                    <span className="font-mono font-bold text-success">${(handicapBet.betAmount * handicapBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              )}

              {/* Over/Under Bet - Modern Style - Hidden on mobile */}
              {overUnderBet && currentMatchData && (
                <div className="hidden sm:block bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-2 sm:space-y-3 border border-white/10">
                  {/* Bet Type Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-foreground/90 uppercase tracking-wider">{t('over_under_bet')}</span>
                    <Badge 
                      variant="outline"
                      className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 ${overUnderBet.confirmed ? "bg-success/20 text-success border-success/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                    >
                      {overUnderBet.confirmed ? "Confirmed" : "Pending"}
                    </Badge>
                  </div>
                  
                  {/* Selection Grid */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${
                      overUnderBet.overUnderPick === 'over'
                        ? "bg-primary/20 border-primary/60" 
                        : "bg-white/5 border-white/10 opacity-60"
                    }`}>
                      <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="text-[10px] sm:text-xs font-semibold">{t('over')}</span>
                      <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                        overUnderBet.overUnderPick === 'over' ? "text-primary" : "text-muted-foreground"
                      }`}>{overUnderBet.overUnderLine}</span>
                    </div>
                    <div className={`p-1.5 sm:p-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${
                      overUnderBet.overUnderPick === 'under'
                        ? "bg-primary/20 border-primary/60" 
                        : "bg-white/5 border-white/10 opacity-60"
                    }`}>
                      <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 rotate-180" />
                      <span className="text-[10px] sm:text-xs font-semibold">{t('under')}</span>
                      <span className={`text-[10px] sm:text-xs font-mono font-bold ${
                        overUnderBet.overUnderPick === 'under' ? "text-primary" : "text-muted-foreground"
                      }`}>{overUnderBet.overUnderLine}</span>
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="text-muted-foreground">{t('confidence')}: <span className="font-bold text-foreground">{overUnderBet.confidence}%</span></span>
                      <span className="text-muted-foreground">@<span className="font-mono font-bold text-foreground">{Math.max(0, overUnderBet.odds - 1).toFixed(2)}</span></span>
                    </div>
                    <span className="font-mono font-bold text-success">${(overUnderBet.betAmount * overUnderBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </TiltCard>

      {/* AI Feed Dialog */}
      <Dialog open={showFeedDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-[#212121] border-[#3a3a3a] rounded-2xl">
          {/* Header */}
          <div className="px-6 pt-5 pb-4">
            <DialogHeader>
              <DialogTitle className="text-base font-medium text-white">
                AI 模型训练
              </DialogTitle>
              <p className="text-sm text-[#9b9b9b] mt-1">输入训练数据以优化您的专属AI模型</p>
            </DialogHeader>

            {/* Stats Bar */}
            <div className="flex items-center gap-6 mt-4 text-sm text-[#9b9b9b]">
              <span>训练次数 <span className="text-white font-medium ml-1">{trainingCount}</span></span>
              <span>总字符 <span className="text-white font-medium ml-1">{totalCharacters.toLocaleString()}</span></span>
              <span>状态 <span className="text-white font-medium ml-1">活跃</span></span>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {!isFeeding && !feedComplete ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-6 h-10 grid grid-cols-3 bg-[#2f2f2f] rounded-xl p-1">
                      <TabsTrigger value="feed" className="text-sm text-[#9b9b9b] data-[state=active]:bg-[#424242] data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">
                        投喂训练
                      </TabsTrigger>
                      <TabsTrigger value="stats" className="text-sm text-[#9b9b9b] data-[state=active]:bg-[#424242] data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">
                        数据分析
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-sm text-[#9b9b9b] data-[state=active]:bg-[#424242] data-[state=active]:text-white data-[state=active]:shadow-none rounded-lg">
                        训练历史
                      </TabsTrigger>
                    </TabsList>

                    {/* Feed Tab */}
                    <TabsContent value="feed" className="flex-1 overflow-auto px-6 pt-5 pb-6 space-y-4 m-0">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-white">
                          输入训练数据
                        </label>
                        <div className="relative">
                          <Textarea
                            placeholder="例如：&#10;• 我认为主队在主场的胜率通常更高&#10;• 最近5场比赛保持不败的球队状态更好&#10;• 欧冠比赛中实力差距明显的比赛更容易爆冷..."
                            value={feedText}
                            onChange={(e) => setFeedText(e.target.value)}
                            className="min-h-[200px] resize-none bg-[#2f2f2f] border-[#3a3a3a] focus:border-[#5a5a5a] text-white placeholder:text-[#6b6b6b] text-sm rounded-xl"
                          />
                          <div className="absolute bottom-3 right-3 text-xs text-[#6b6b6b]">
                            {feedText.length} 字符
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button 
                          variant="ghost" 
                          onClick={handleDialogClose} 
                          className="text-sm text-[#9b9b9b] hover:text-white hover:bg-[#2f2f2f]"
                        >
                          取消
                        </Button>
                        <Button 
                          onClick={handleFeedSubmit}
                          className="text-sm bg-[#2f2f2f] hover:bg-[#424242] text-white border border-[#3a3a3a]"
                          disabled={!feedText.trim()}
                        >
                          开始训练
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Stats Tab */}
                    <TabsContent value="stats" className="flex-1 overflow-auto px-6 pt-5 pb-6 space-y-6 m-0">
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-[#6b6b6b]" />
                        </div>
                      ) : trainingHistory.length === 0 ? (
                        <div className="text-center py-12 text-[#6b6b6b]">
                          <p className="text-sm">暂无训练数据</p>
                          <p className="text-xs mt-1">开始投喂数据后将显示统计分析</p>
                        </div>
                      ) : (
                        <>
                          {/* Training Trend Chart */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white">近7天训练趋势</h4>
                            <div className="h-[140px] bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-3">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                  <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 10, fill: '#6b6b6b' }}
                                    axisLine={{ stroke: '#3a3a3a' }}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 10, fill: '#6b6b6b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#2f2f2f',
                                      border: '1px solid #3a3a3a',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      color: '#fff'
                                    }}
                                    formatter={(value: number) => [`${value} 次训练`, '投喂次数']}
                                    labelFormatter={(label) => `日期: ${label}`}
                                  />
                                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {trendData.map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.count > 0 ? '#fff' : '#3a3a3a'}
                                        fillOpacity={entry.count > 0 ? 0.8 : 0.3}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Keyword Analysis */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white">常用关键词</h4>
                            {keywordStats.length === 0 ? (
                              <div className="text-center py-6 text-[#6b6b6b] text-sm bg-[#2f2f2f] rounded-xl border border-[#3a3a3a]">
                                暂未检测到足球相关关键词
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2 p-4 bg-[#2f2f2f] rounded-xl border border-[#3a3a3a]">
                                {keywordStats.map((item, index) => (
                                  <span 
                                    key={item.keyword}
                                    className="text-xs font-medium px-3 py-1.5 bg-[#424242] text-white rounded-full"
                                  >
                                    {item.keyword}
                                    <span className="ml-1.5 text-[#9b9b9b]">×{item.count}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Summary Stats */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-4 text-center">
                              <div className="text-2xl font-semibold text-white">{trainingCount}</div>
                              <div className="text-xs text-[#6b6b6b] mt-1">总训练次数</div>
                            </div>
                            <div className="bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-4 text-center">
                              <div className="text-2xl font-semibold text-white">{totalCharacters.toLocaleString()}</div>
                              <div className="text-xs text-[#6b6b6b] mt-1">总字符数</div>
                            </div>
                            <div className="bg-[#2f2f2f] rounded-xl border border-[#3a3a3a] p-4 text-center">
                              <div className="text-2xl font-semibold text-white">{keywordStats.length}</div>
                              <div className="text-xs text-[#6b6b6b] mt-1">识别关键词</div>
                            </div>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history" className="flex-1 overflow-hidden px-6 pt-5 pb-6 m-0">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-white">训练历史记录</h4>
                        <span className="text-xs text-[#6b6b6b]">{trainingHistory.length} 条</span>
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#6b6b6b]" />
                          <span className="text-[#6b6b6b]">加载中...</span>
                        </div>
                      ) : trainingHistory.length === 0 ? (
                        <div className="text-center py-12 text-[#6b6b6b]">
                          <p className="text-sm">暂无训练记录</p>
                          <p className="text-xs mt-1">开始投喂您的专属AI吧</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[280px] pr-4">
                          <div className="space-y-2">
                            {trainingHistory.slice(0, 20).map((record, index) => (
                              <div
                                key={record.id}
                                className="bg-[#2f2f2f] rounded-xl p-4 border border-[#3a3a3a] group/item hover:border-[#5a5a5a] transition-all"
                              >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <span className="text-xs text-[#6b6b6b] font-mono">
                                    {format(new Date(record.created_at), 'MM-dd HH:mm')}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity text-[#6b6b6b] hover:text-red-400 hover:bg-red-400/10"
                                    onClick={() => deleteTrainingRecord(record.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="text-sm text-[#d1d1d1] line-clamp-2 leading-relaxed">{record.content}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </Tabs>
                </motion.div>
              ) : (
                /* Training Progress View */
                <motion.div
                  key="training"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1 flex flex-col items-center justify-center py-8 px-6"
                >
                  <h3 className="text-lg font-medium mb-6 text-white">
                    {feedComplete ? '训练完成' : '正在训练模型...'}
                  </h3>
                  
                  <div className="w-full max-w-md space-y-6">
                    {/* Progress Steps with connecting line */}
                    <div className="relative">
                      {/* Connecting line background */}
                      <div className="absolute top-5 left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 bg-[#3a3a3a]" />
                      {/* Connecting line progress */}
                      <motion.div 
                        className="absolute top-5 left-[calc(12.5%)] h-0.5 bg-white origin-left"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (currentStep / (trainingSteps.length - 1)) * 75)}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                      
                      <div className="relative grid grid-cols-4 gap-2">
                        {trainingSteps.map((step, index) => {
                          const StepIcon = step.icon;
                          const isActive = index <= currentStep;
                          const isCurrent = index === currentStep && isFeeding;
                          const isCompleted = index < currentStep;
                          
                          return (
                            <motion.div
                              key={step.label}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex flex-col items-center text-center"
                            >
                              <motion.div 
                                className={`relative h-10 w-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-300 ${
                                  isCompleted 
                                    ? 'bg-white border-white' 
                                    : isActive 
                                    ? 'bg-[#212121] border-white' 
                                    : 'bg-[#212121] border-[#3a3a3a]'
                                }`}
                                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-[#212121]" />
                                ) : (
                                  <StepIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#6b6b6b]'} ${isCurrent ? 'animate-pulse' : ''}`} />
                                )}
                                {isCurrent && (
                                  <motion.div 
                                    className="absolute inset-0 rounded-full border-2 border-white"
                                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                )}
                              </motion.div>
                              <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-white' : 'text-[#6b6b6b]'}`}>
                                {step.label}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#9b9b9b]">处理进度</span>
                        <span className="font-mono font-medium text-white">{Math.round(feedProgress)}%</span>
                      </div>
                      <div className="relative h-1.5 bg-[#3a3a3a] rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-white rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${feedProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {feedComplete && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
                      <Button 
                        onClick={handleFeedComplete}
                        className="px-8 bg-[#2f2f2f] hover:bg-[#424242] text-white border border-[#3a3a3a]"
                      >
                        完成
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Bet Dialog - Professional Betting Style */}
      <Dialog open={showManualBetDialog} onOpenChange={(open) => {
        setShowManualBetDialog(open);
        if (!open) {
          setSelectedMatch(null);
          setManualPrediction('');
        }
      }}>
        <DialogContent className="sm:max-w-md w-[calc(100%-32px)] max-h-[85vh] p-0 gap-0 bg-[#0d0d0d] border-[#1a1a1a]">
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b border-[#1a1a1a] flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedMatch && (
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <DialogTitle className="text-sm font-medium">
                {selectedMatch ? safeGetTeamName(selectedMatch, 'home') + ' vs ' + safeGetTeamName(selectedMatch, 'away') : (t('select_match') || '选择比赛')}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
            {/* Step 1: Match Selection */}
            {!selectedMatch ? (
              <div className="p-3 space-y-2">
                {matchesToShow.slice(0, 5).map((match: any) => (
                  <div
                    key={match.mid || match.fixture_id}
                    className="p-4 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] cursor-pointer transition-colors border border-[#1f1f1f] hover:border-[#2a2a2a]"
                    onClick={() => {
                      setSelectedMatch(match);
                      setManualPrediction('');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[130px]">
                        {safeGetTeamName(match, 'home')}
                      </span>
                      <span className="text-xs text-[#666] mx-3">vs</span>
                      <span className="text-sm font-medium truncate max-w-[130px] text-right">
                        {safeGetTeamName(match, 'away')}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#555] text-center mt-2">
                      {safeGetLeagueName(match)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Step 2: Betting Options */
              <div className="p-4 space-y-4">
                {/* Match Header */}
                <div className="text-center pb-3 border-b border-[#1a1a1a]">
                  <p className="text-[10px] text-[#666] mb-1">{safeGetLeagueName(selectedMatch)}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm font-semibold">{safeGetTeamName(selectedMatch, 'home')}</span>
                    <span className="text-xs text-[#555]">vs</span>
                    <span className="text-sm font-semibold">{safeGetTeamName(selectedMatch, 'away')}</span>
                  </div>
                </div>

                {/* Handicap Section - Fixed Options */}
                <div className="space-y-2">
                  <span className="text-xs text-[#888]">{t('handicap_bet') || '让分盘'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { line: -0.5, homeOdds: 1.85, awayOdds: 1.95 },
                      { line: 0, homeOdds: 1.90, awayOdds: 1.90 },
                      { line: +0.5, homeOdds: 1.95, awayOdds: 1.85 },
                      { line: -1, homeOdds: 2.10, awayOdds: 1.75 },
                    ].map(({ line, homeOdds, awayOdds }) => (
                      <div key={line} className="contents">
                        <button
                          type="button"
                          className={`p-2.5 rounded-lg border transition-all text-left ${
                            manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === line
                              ? 'bg-primary/10 border-primary'
                              : 'bg-[#141414] border-[#1f1f1f] hover:border-[#333]'
                          }`}
                          onClick={() => { setManualBetType('handicap'); setManualPrediction('HOME'); setManualHandicapLine(line); }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] truncate max-w-[60px]">{safeGetTeamName(selectedMatch, 'home')}</span>
                            <span className="text-[10px] text-[#666]">{line > 0 ? '+' : ''}{line}</span>
                          </div>
                          <p className="text-base font-bold text-primary mt-1">{homeOdds.toFixed(2)}</p>
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 rounded-lg border transition-all text-left ${
                            manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === line
                              ? 'bg-primary/10 border-primary'
                              : 'bg-[#141414] border-[#1f1f1f] hover:border-[#333]'
                          }`}
                          onClick={() => { setManualBetType('handicap'); setManualPrediction('AWAY'); setManualHandicapLine(line); }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] truncate max-w-[60px]">{safeGetTeamName(selectedMatch, 'away')}</span>
                            <span className="text-[10px] text-[#666]">{-line > 0 ? '+' : ''}{-line}</span>
                          </div>
                          <p className="text-base font-bold text-primary mt-1">{awayOdds.toFixed(2)}</p>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Over/Under Section - Fixed Options */}
                <div className="space-y-2">
                  <span className="text-xs text-[#888]">{t('over_under_bet') || '大小球'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { line: 2.5, overOdds: 1.88, underOdds: 1.92 },
                      { line: 3, overOdds: 2.05, underOdds: 1.80 },
                      { line: 3.5, overOdds: 2.20, underOdds: 1.70 },
                    ].map(({ line, overOdds, underOdds }) => (
                      <div key={line} className="contents">
                        <button
                          type="button"
                          className={`p-2.5 rounded-lg border transition-all text-left ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === line
                              ? 'bg-primary/10 border-primary'
                              : 'bg-[#141414] border-[#1f1f1f] hover:border-[#333]'
                          }`}
                          onClick={() => { setManualBetType('over_under'); setManualOverUnderPick('over'); setManualOverUnderLine(line); }}
                        >
                          <span className="text-[11px]">{t('over') || '大'} {line}</span>
                          <p className="text-base font-bold text-primary mt-1">{overOdds.toFixed(2)}</p>
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 rounded-lg border transition-all text-left ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === line
                              ? 'bg-primary/10 border-primary'
                              : 'bg-[#141414] border-[#1f1f1f] hover:border-[#333]'
                          }`}
                          onClick={() => { setManualBetType('over_under'); setManualOverUnderPick('under'); setManualOverUnderLine(line); }}
                        >
                          <span className="text-[11px]">{t('under') || '小'} {line}</span>
                          <p className="text-base font-bold text-primary mt-1">{underOdds.toFixed(2)}</p>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bet Amount Input */}
                <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#888]">{t('bet_amount') || '下注金额'}</span>
                    <div className="flex items-center gap-1">
                      <img src={hunterCoinIcon} alt="" className="w-4 h-4" />
                      <input
                        type="number"
                        value={manualBetAmount}
                        onChange={(e) => setManualBetAmount(Math.max(10, parseInt(e.target.value) || 0))}
                        className="w-20 h-8 px-2 rounded bg-[#141414] border border-[#1f1f1f] text-right text-sm font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                          manualBetAmount === amt
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-[#141414] text-[#888] border border-[#1f1f1f] hover:border-[#333]'
                        }`}
                        onClick={() => setManualBetAmount(amt)}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Potential Win */}
                {((manualBetType === 'handicap' && manualPrediction) || manualBetType === 'over_under') && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#141414]">
                    <span className="text-xs text-[#888]">{t('potential_win') || '预计收益'}</span>
                    <span className="text-sm font-bold text-success">
                      +{(manualBetAmount * 0.9).toFixed(0)}
                    </span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  className="w-full h-11 text-sm font-medium"
                  onClick={handleManualBetSubmit}
                  disabled={isSubmittingBet || (manualBetType === 'handicap' && !manualPrediction)}
                >
                  {isSubmittingBet ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {t('confirm_bet') || '确认下注'} · {manualBetAmount}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlayerExclusiveModelCard;

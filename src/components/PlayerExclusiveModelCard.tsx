import { Card } from "@/components/ui/card";
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
  BarChart3,
  Tag,
  FileText,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

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
  onOpenAnalysis?: (matchId: number, aiId: string, match: any, aiModel: any) => void;
  getTeamName?: (match: any, team: 'home' | 'away') => string;
  getLeagueName?: (match: any) => string;
  onPrevMatch?: (e: React.MouseEvent) => void;
  onNextMatch?: (e: React.MouseEvent) => void;
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
  onNextMatch
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

  const trainingSteps = [
    { icon: Database, label: '数据解析', description: '正在分析输入内容...' },
    { icon: Brain, label: '神经网络', description: '更新模型权重...' },
    { icon: Target, label: '模式识别', description: '学习预测模式...' },
    { icon: TrendingUp, label: '优化完成', description: '模型已更新！' },
  ];

  // Demo mode for non-logged-in users
  const isDemo = !user || !userProfile;
  const displayName = isDemo ? '体验玩家' : (userProfile?.display_name || '玩家');
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
      toast.error('获取训练历史失败');
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

  return (
    <>
      <Card 
        className={`relative rounded-lg p-3 sm:p-4 bg-card border border-amber-500/30 hover:border-amber-500/50 transition-all duration-300 overflow-hidden cursor-pointer ${className}`}
        onClick={onNextMatch}
      >
        {/* Match Counter - Top Right */}
        {matchEntries.length > 1 && (
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 flex items-center gap-0.5 sm:gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 sm:h-5 sm:w-5 p-0 bg-background/80 hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                if (onPrevMatch) onPrevMatch(e);
              }}
            >
              <ChevronLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
            <Badge 
              variant="secondary"
              className="text-[8px] sm:text-[10px] font-bold px-1 sm:px-2 py-0.5 bg-background/80"
            >
              {matchIndex + 1}/{matchEntries.length}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 sm:h-5 sm:w-5 p-0 bg-background/80 hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                if (onNextMatch) onNextMatch(e);
              }}
            >
              <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
          </div>
        )}

        {/* Training Count Badge */}
        {trainingCount > 0 && (
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20">
            <Badge variant="outline" className="text-[8px] sm:text-[10px] font-bold px-2 py-0.5 bg-background/80 border-amber-500/40 text-amber-400">
              <History className="h-2.5 w-2.5 mr-1" />
              {trainingCount}次训练
            </Badge>
          </div>
        )}

        {/* No Bets Indicator */}
        {matchEntries.length === 0 && (
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
            <Badge 
              variant="outline"
              className="text-[8px] sm:text-[10px] font-bold px-2 py-0.5 bg-muted/80 text-muted-foreground"
            >
              {t('no_bets')}
            </Badge>
          </div>
        )}
        
        {/* Content */}
        <div className="relative z-10 space-y-3">
          {/* Compact Header - Player Info & Actions */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/30">
            {/* Player Avatar & Balance */}
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 ring-1 ring-amber-500/50">
                <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                <AvatarFallback className="text-xs font-bold bg-amber-500/20 text-amber-400">{displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-amber-400">{displayName}</span>
                <span className="text-[10px] font-mono-data text-muted-foreground">{balanceValue || '$10,000.00'}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {currentMatchData && onOpenPKDialog && (
                <Button
                  size="sm"
                  className="h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPKDialog(currentMatchData.match);
                  }}
                >
                  <span className="text-[10px]">AI竞赛</span>
                </Button>
              )}
              {bet && currentMatchData && onOpenAnalysis && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-amber-500 hover:bg-amber-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAnalysis(
                      currentMatchData.match.fixture_id,
                      'hunsoccermax',
                      currentMatchData.match,
                      { id: 'hunsoccermax', displayName: 'HUNSOCCER MAX' }
                    );
                  }}
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  <span className="text-[10px] font-bold">{t('view_analysis') || '分析'}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Match Info */}
          {currentMatchData ? (
            <div className="space-y-1.5 py-1">
              {/* League & Status Row */}
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[9px] py-0.5 px-2 truncate max-w-[60%]">
                  {safeGetLeagueName(currentMatchData.match)}
                </Badge>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="h-7 px-3 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowFeedDialog(true); 
                    }}
                  >
                    {t('model_training') || '模型训练'}
                  </Button>
                  {/* Match Status Indicator */}
                {(() => {
                  const status = currentMatchData.match.status_short;
                  const liveStatuses = ['LIVE', '1H', 'HT', '2H', 'ET', 'P', 'BREAK'];
                  const finishedStatuses = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];
                  
                  if (liveStatuses.includes(status)) {
                    return (
                      <Badge className="text-[8px] px-1.5 py-0 bg-success/20 text-success border-success/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-success mr-1" />
                        {t('live') || 'LIVE'}
                      </Badge>
                    );
                  } else if (finishedStatuses.includes(status)) {
                    return (
                      <Badge variant="secondary" className="text-[8px] px-1.5 py-0 text-muted-foreground">
                        {t('finished') || '已结束'}
                      </Badge>
                    );
                  }
                  return null;
                })()}
                </div>
              </div>
              
              {/* Teams with Logos */}
              <div className="flex items-center justify-between gap-1 sm:gap-1 px-1">
                <div className="flex items-center gap-1 sm:gap-1 flex-1 min-w-0">
                  {currentMatchData.match.home_logo ? (
                    <Avatar className="h-5 w-5 sm:h-5 sm:w-5 ring-1 ring-border shrink-0">
                      <AvatarImage src={currentMatchData.match.home_logo} alt={safeGetTeamName(currentMatchData.match, 'home')} />
                      <AvatarFallback><Shield className="h-2 w-2 sm:h-2 sm:w-2" /></AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-5 w-5 sm:h-5 sm:w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Shield className="h-2 w-2 sm:h-2 sm:w-2 text-muted-foreground" />
                    </div>
                  )}
                  <p className="font-bold text-[10px] sm:text-[10px] leading-tight flex-1 text-left truncate">
                    {safeGetTeamName(currentMatchData.match, 'home')}
                  </p>
                </div>
                
                {/* Match Time Display */}
                <MatchTimeDisplay match={currentMatchData.match} />
                
                <div className="flex items-center gap-1 sm:gap-1 flex-1 min-w-0 justify-end">
                  <p className="font-bold text-[10px] sm:text-[10px] leading-tight flex-1 text-right truncate">
                    {safeGetTeamName(currentMatchData.match, 'away')}
                  </p>
                  {currentMatchData.match.away_logo ? (
                    <Avatar className="h-5 w-5 sm:h-5 sm:w-5 ring-1 ring-border shrink-0">
                      <AvatarImage src={currentMatchData.match.away_logo} alt={safeGetTeamName(currentMatchData.match, 'away')} />
                      <AvatarFallback><Shield className="h-2 w-2 sm:h-2 sm:w-2" /></AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-5 w-5 sm:h-5 sm:w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Shield className="h-2 w-2 sm:h-2 sm:w-2 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t('no_active_predictions')}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {t('no_bets_for_ai')}
              </p>
            </div>
          )}

          {/* Handicap Bet - Simplified */}
          {handicapBet && currentMatchData && (
            <div className="bg-amber-500/10 rounded-lg p-2.5 space-y-2">
              {/* Bet Type Header */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">{t('handicap_bet')}</span>
                <Badge 
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 ${handicapBet.confirmed ? "text-success border-success/40" : "text-muted-foreground"}`}
                >
                  {handicapBet.confirmed ? "✓" : "○"}
                </Badge>
              </div>
              
              {/* Selection Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`p-2 rounded-md border transition-all ${
                  handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME"
                    ? "bg-amber-500/20 border-amber-500/50" 
                    : "bg-card/50 border-border/30"
                }`}>
                  <div className="flex items-center gap-1.5">
                    {currentMatchData.match.home_logo && (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={currentMatchData.match.home_logo} />
                        <AvatarFallback><Shield className="h-2 w-2" /></AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-[9px] font-medium truncate flex-1">{safeGetTeamName(currentMatchData.match, 'home')}</span>
                    {handicapBet.handicapLine !== undefined && (
                      <span className={`text-[9px] font-mono-data font-bold ${
                        handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME" ? "text-amber-400" : "text-muted-foreground"
                      }`}>
                        {((handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                        {(handicapBet.prediction === "HOME_WIN" || handicapBet.prediction === "HOME") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`p-2 rounded-md border transition-all ${
                  handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY"
                    ? "bg-amber-500/20 border-amber-500/50" 
                    : "bg-card/50 border-border/30"
                }`}>
                  <div className="flex items-center gap-1.5">
                    {currentMatchData.match.away_logo && (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={currentMatchData.match.away_logo} />
                        <AvatarFallback><Shield className="h-2 w-2" /></AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-[9px] font-medium truncate flex-1">{safeGetTeamName(currentMatchData.match, 'away')}</span>
                    {handicapBet.handicapLine !== undefined && (
                      <span className={`text-[9px] font-mono-data font-bold ${
                        handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY" ? "text-amber-400" : "text-muted-foreground"
                      }`}>
                        {((handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine) > 0 ? '+' : ''}
                        {(handicapBet.prediction === "AWAY_WIN" || handicapBet.prediction === "AWAY") ? handicapBet.handicapLine : -handicapBet.handicapLine}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Compact Stats Row */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-amber-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{t('confidence')}: <span className="font-semibold text-foreground">{handicapBet.confidence}%</span></span>
                  <span className="text-muted-foreground">@<span className="font-mono-data font-semibold text-foreground">{Math.max(0, handicapBet.odds - 1).toFixed(2)}</span></span>
                </div>
                <span className="font-mono-data font-bold text-success">${(handicapBet.betAmount * handicapBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}

          {/* Over/Under Bet - Simplified */}
          {overUnderBet && currentMatchData && (
            <div className="bg-amber-500/10 rounded-lg p-2.5 space-y-2">
              {/* Bet Type Header */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">{t('over_under_bet')}</span>
                <Badge 
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 ${overUnderBet.confirmed ? "text-success border-success/40" : "text-muted-foreground"}`}
                >
                  {overUnderBet.confirmed ? "✓" : "○"}
                </Badge>
              </div>
              
              {/* Selection Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`p-2 rounded-md border text-center transition-all ${
                  overUnderBet.overUnderPick === 'over'
                    ? "bg-amber-500/20 border-amber-500/50" 
                    : "bg-card/50 border-border/30"
                }`}>
                  <span className="text-[9px] font-medium">{t('over')}</span>
                  <span className={`ml-1 text-[10px] font-mono-data font-bold ${
                    overUnderBet.overUnderPick === 'over' ? "text-amber-400" : "text-muted-foreground"
                  }`}>{overUnderBet.overUnderLine}</span>
                </div>
                <div className={`p-2 rounded-md border text-center transition-all ${
                  overUnderBet.overUnderPick === 'under'
                    ? "bg-amber-500/20 border-amber-500/50" 
                    : "bg-card/50 border-border/30"
                }`}>
                  <span className="text-[9px] font-medium">{t('under')}</span>
                  <span className={`ml-1 text-[10px] font-mono-data font-bold ${
                    overUnderBet.overUnderPick === 'under' ? "text-amber-400" : "text-muted-foreground"
                  }`}>{overUnderBet.overUnderLine}</span>
                </div>
              </div>
              
              {/* Compact Stats Row */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-amber-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{t('confidence')}: <span className="font-semibold text-foreground">{overUnderBet.confidence}%</span></span>
                  <span className="text-muted-foreground">@<span className="font-mono-data font-semibold text-foreground">{Math.max(0, overUnderBet.odds - 1).toFixed(2)}</span></span>
                </div>
                <span className="font-mono-data font-bold text-success">${(overUnderBet.betAmount * overUnderBet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}

        </div>
      </Card>

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
    </>
  );
};

export default PlayerExclusiveModelCard;

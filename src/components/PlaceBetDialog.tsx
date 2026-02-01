import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { teamsZh } from "@/i18n/teams-zh";
import { leaguesZh } from "@/i18n/leagues-zh";

// AI模型图标映射
import gpt5Icon from "@/assets/ai-icon-chatgpt.png";
import claudeIcon from "@/assets/ai-icon-claude.png";
import geminiIcon from "@/assets/ai-icon-gemini.png";
import deepseekIcon from "@/assets/deepseek-icon.png";
import grokIcon from "@/assets/ai-icon-grok.png";
import hunsoccerIcon from "@/assets/ai-icon-hunsoccer.png";
import greencourtBg from "@/assets/icon_greencourt.jpg";

const AI_ICONS: Record<string, string> = {
  "GPT-5": gpt5Icon,
  "Claude": claudeIcon,
  "Gemini": geminiIcon,
  "DeepSeek": deepseekIcon,
  "Grok": grokIcon,
  "HUNSOCCER": hunsoccerIcon,
};

interface Match {
  fixture_id: number;
  home_team_id?: number;
  home_team_name: string;
  away_team_id?: number;
  away_team_name: string;
  home_logo?: string;
  away_logo?: string;
  league_name: string;
  kickoff_at: string;
}

interface AIBet {
  ai_id: string;
  ai_display_name: string;
  prediction: string;
  bet_type: string;
  confidence: number;
  odds: number;
  handicap_line?: number;
  over_under_line?: number;
  over_under_pick?: string;
}

interface BetOption {
  label: string;
  value: string;
  odds: number;
  line?: number;
}

// 已删除 MatchStats 和 TeamRadarData 接口

interface AIMatchWithDetails extends Match {
  ai_count: number;
  ai_models: string[];
}

// 虚拟演示数据 - 当没有真实数据时使用
const DEMO_AI_MATCHES: AIMatchWithDetails[] = [
  {
    fixture_id: 1001,
    home_team_id: 33,
    home_team_name: "曼联",
    away_team_id: 40,
    away_team_name: "利物浦",
    home_logo: "https://media.api-sports.io/football/teams/33.png",
    away_logo: "https://media.api-sports.io/football/teams/40.png",
    league_name: "英超",
    kickoff_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    ai_count: 5,
    ai_models: ["GPT-5", "Claude", "Gemini", "DeepSeek", "Grok"],
  },
  {
    fixture_id: 1002,
    home_team_id: 529,
    home_team_name: "巴塞罗那",
    away_team_id: 541,
    away_team_name: "皇家马德里",
    home_logo: "https://media.api-sports.io/football/teams/529.png",
    away_logo: "https://media.api-sports.io/football/teams/541.png",
    league_name: "西甲",
    kickoff_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    ai_count: 6,
    ai_models: ["GPT-5", "Claude", "Gemini", "DeepSeek", "Grok", "HUNSOCCER"],
  },
  {
    fixture_id: 1003,
    home_team_id: 157,
    home_team_name: "拜仁慕尼黑",
    away_team_id: 165,
    away_team_name: "多特蒙德",
    home_logo: "https://media.api-sports.io/football/teams/157.png",
    away_logo: "https://media.api-sports.io/football/teams/165.png",
    league_name: "德甲",
    kickoff_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    ai_count: 4,
    ai_models: ["GPT-5", "Claude", "Gemini", "DeepSeek"],
  },
  {
    fixture_id: 1004,
    home_team_id: 85,
    home_team_name: "巴黎圣日耳曼",
    away_team_id: 81,
    away_team_name: "马赛",
    home_logo: "https://media.api-sports.io/football/teams/85.png",
    away_logo: "https://media.api-sports.io/football/teams/81.png",
    league_name: "法甲",
    kickoff_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    ai_count: 5,
    ai_models: ["GPT-5", "Claude", "Gemini", "Grok", "HUNSOCCER"],
  },
  {
    fixture_id: 1005,
    home_team_id: 489,
    home_team_name: "AC米兰",
    away_team_id: 505,
    away_team_name: "国际米兰",
    home_logo: "https://media.api-sports.io/football/teams/489.png",
    away_logo: "https://media.api-sports.io/football/teams/505.png",
    league_name: "意甲",
    kickoff_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    ai_count: 6,
    ai_models: ["GPT-5", "Claude", "Gemini", "DeepSeek", "Grok", "HUNSOCCER"],
  },
];

interface PlaceBetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match?: Match | null;
  onBetPlaced?: () => void;
}

export const PlaceBetDialog = ({ open, onOpenChange, match, onBetPlaced }: PlaceBetDialogProps) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  
  // 获取中文球队名
  const getTeamNameZh = (teamName: string): string => {
    if (i18n.language.startsWith('zh')) {
      return teamsZh[teamName] || teamName;
    }
    return teamName;
  };
  
  // 获取中文联赛名
  const getLeagueNameZh = (leagueName: string): string => {
    if (i18n.language.startsWith('zh')) {
      return leaguesZh[leagueName] || leagueName;
    }
    return leagueName;
  };
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(match);
  const [aiPredictions, setAiPredictions] = useState<AIBet[]>([]);
  const [selectedBetType, setSelectedBetType] = useState<string>("handicap");
  const [selectedBetOption, setSelectedBetOption] = useState<string>("");
  const [isDemo, setIsDemo] = useState(false);
  const [betAmount, setBetAmount] = useState<string>("100");
  const [userBalance, setUserBalance] = useState<number>(100000);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 已移除 matchStats 和 matchLoading 状态
  
  // AI预测比赛列表相关状态
  const [aiMatches, setAiMatches] = useState<AIMatchWithDetails[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [showMatchSelection, setShowMatchSelection] = useState(!match);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ amount: number; payout: number } | null>(null);

  // Update selectedMatch when match prop changes
  useEffect(() => {
    if (match) {
      setSelectedMatch(match);
      setShowMatchSelection(false);
    } else {
      setShowMatchSelection(true);
    }
  }, [match]);

  // 当对话框打开时获取AI预测的比赛列表
  useEffect(() => {
    if (open && showMatchSelection) {
      fetchAIMatches();
      fetchUserBalance();
    }
  }, [open, showMatchSelection]);

  useEffect(() => {
    if (open && selectedMatch && !showMatchSelection) {
      fetchUserBalance();
      fetchAIPredictions(selectedMatch.fixture_id);
    }
  }, [open, selectedMatch, showMatchSelection]);

  // 实时倒计时更新
  useEffect(() => {
    if (!open) return;
    
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (selectedMatch) {
      setSelectedBetOption("");
    }
  }, [selectedMatch]);

  useEffect(() => {
    if (aiPredictions.length > 0) {
      setSelectedBetType(aiPredictions[0].bet_type);
    }
  }, [aiPredictions]);

  useEffect(() => {
    setSelectedBetOption("");
  }, [selectedBetType]);

  // 获取AI已预测的比赛列表
  const fetchAIMatches = async () => {
    setIsLoadingMatches(true);
    setIsDemo(false);
    try {
      // 获取所有pending状态的AI预测
      const { data: betsData, error: betsError } = await supabase
        .from('ai_auto_bets' as any)
        .select('match_id, ai_id, ai_display_name')
        .eq('status', 'pending');

      if (betsError) {
        console.error('Error fetching AI bets:', betsError);
        // 使用演示数据
        setAiMatches(DEMO_AI_MATCHES);
        setIsDemo(true);
        return;
      }

      if (!betsData || betsData.length === 0) {
        // 没有真实数据时使用演示数据
        setAiMatches(DEMO_AI_MATCHES);
        setIsDemo(true);
        return;
      }

      // 按match_id分组统计AI数量
      const matchAIMap = new Map<number, { count: number; models: Set<string> }>();
      betsData.forEach((bet: any) => {
        const matchId = bet.match_id;
        if (!matchAIMap.has(matchId)) {
          matchAIMap.set(matchId, { count: 0, models: new Set() });
        }
        const entry = matchAIMap.get(matchId)!;
        entry.count++;
        if (bet.ai_display_name) {
          entry.models.add(bet.ai_display_name);
        }
      });

      const matchIds = [...matchAIMap.keys()];

      // 获取比赛详情
      const { data: matchesData, error: matchesError } = await supabase
        .from('daily_matches' as any)
        .select('*')
        .in('fixture_id', matchIds)
        .order('kickoff_at', { ascending: true });

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        // 使用演示数据
        setAiMatches(DEMO_AI_MATCHES);
        setIsDemo(true);
        return;
      }

      // 合并数据
      const matchesWithAI: AIMatchWithDetails[] = (matchesData || []).map((m: any) => {
        const aiInfo = matchAIMap.get(m.fixture_id) || { count: 0, models: new Set() };
        return {
          fixture_id: m.fixture_id,
          home_team_id: m.home_team_id,
          home_team_name: m.home_team_name,
          away_team_id: m.away_team_id,
          away_team_name: m.away_team_name,
          home_logo: m.home_logo,
          away_logo: m.away_logo,
          league_name: m.league_name,
          kickoff_at: m.kickoff_at,
          ai_count: aiInfo.count,
          ai_models: [...aiInfo.models],
        };
      });

      if (matchesWithAI.length === 0) {
        // 如果没有匹配到比赛，使用演示数据
        setAiMatches(DEMO_AI_MATCHES);
        setIsDemo(true);
      } else {
        setAiMatches(matchesWithAI);
        setIsDemo(false);
      }
    } catch (error) {
      console.error('Error fetching AI matches:', error);
      // 发生错误时使用演示数据
      setAiMatches(DEMO_AI_MATCHES);
      setIsDemo(true);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const fetchUserBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    setUserBalance(data?.balance ?? 100000);
  };

  const fetchAIPredictions = async (matchId: number) => {
    try {
      const { data: betsData } = await supabase
        .from('ai_auto_bets' as any)
        .select('*')
        .eq('match_id', matchId)
        .eq('status', 'pending');
      
      if (betsData && betsData.length > 0) {
        const predictions = betsData.map((bet: any) => ({
          ai_id: bet.ai_id || '',
          ai_display_name: bet.ai_display_name || '',
          prediction: bet.prediction || '',
          bet_type: bet.bet_type || 'handicap',
          confidence: bet.confidence || 0,
          odds: bet.odds || 1.9,
          handicap_line: bet.handicap_line || undefined,
          over_under_line: bet.over_under_line || undefined,
          over_under_pick: bet.over_under_pick || undefined,
        })) as AIBet[];
        setAiPredictions(predictions);
        if (predictions.length > 0) {
          setSelectedBetType(predictions[0].bet_type);
        }
      }
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
    }
  };

  // 已移除 fetchMatchStats 函数

  const getBetOptions = (): BetOption[] => {
    if (selectedBetType === "handicap") {
      return [
        { label: `${selectedMatch ? getTeamNameZh(selectedMatch.home_team_name) : ''} -1.5`, value: "home_-1.5", odds: 2.10, line: -1.5 },
        { label: `${selectedMatch ? getTeamNameZh(selectedMatch.away_team_name) : ''} +1.5`, value: "away_+1.5", odds: 1.75, line: 1.5 },
      ];
    } else {
      // over_under
      return [
        { label: "大球 2.5", value: "over_2.5", odds: 1.88, line: 2.5 },
        { label: "小球 2.5", value: "under_2.5", odds: 1.95, line: 2.5 },
      ];
    }
  };

  const getCurrentOdds = (): number => {
    const options = getBetOptions();
    const selected = options.find(opt => opt.value === selectedBetOption);
    return selected?.odds || 1.9;
  };

  const handleSelectMatch = (m: AIMatchWithDetails) => {
    setSelectedMatch(m);
    setShowMatchSelection(false);
    setAiPredictions([]);
  };

  const handleBackToSelection = () => {
    setShowMatchSelection(true);
    setSelectedMatch(null);
    setAiPredictions([]);
    setSelectedBetOption("");
  };

  const handlePlaceBet = async () => {
    // 演示模式下也显示成功动画
    if (isDemo) {
      const amount = parseFloat(betAmount) || 100;
      const options = getBetOptions();
      const selected = options.find(opt => opt.value === selectedBetOption);
      const odds = selected?.odds || 1.9;
      
      setSuccessData({ amount, payout: amount * odds });
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessData(null);
        toast.info("演示模式：请登录后进行真实下注");
      }, 1500);
      return;
    }
    
    if (!user || !selectedMatch) {
      toast.error("请先登录");
      return;
    }
    if (!selectedBetOption) {
      toast.error("请选择下注选项");
      return;
    }
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > userBalance) {
      toast.error("余额不足或金额无效");
      return;
    }
    const options = getBetOptions();
    const selected = options.find(opt => opt.value === selectedBetOption);
    if (!selected) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('place_bet', {
        p_user_id: user.id,
        p_match_id: selectedMatch.fixture_id.toString(),
        p_prediction_type: selectedBetType,
        p_prediction: selected.label,
        p_bet_amount: amount,
        p_potential_payout: amount * selected.odds,
        p_match_date: selectedMatch.kickoff_at,
        p_handicap_line: selectedBetType === "handicap" ? selected.line : null,
        p_over_under_line: selectedBetType === "over_under" ? selected.line : null,
        p_confidence: null
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (result?.success) {
        // 显示成功动画
        setSuccessData({ amount, payout: amount * selected.odds });
        setShowSuccess(true);
        
        // 延迟关闭弹窗
        setTimeout(() => {
          setShowSuccess(false);
          setSuccessData(null);
          onOpenChange(false);
          setBetAmount("100");
          setSelectedBetOption("");
          setShowMatchSelection(true);
          setSelectedMatch(null);
          if (onBetPlaced) onBetPlaced();
        }, 1500);
      } else {
        toast.error(result?.error || "下注失败");
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error("下注失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // 关闭时重置状态
        setShowMatchSelection(!match);
        setSelectedMatch(match);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-3 sm:p-4">
        {/* 成功动画覆盖层 */}
        {showSuccess && successData && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 animate-fade-in">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              {/* 成功图标 */}
              <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary" strokeWidth={2} />
                </div>
                {/* 扩散圆环 */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              </div>
              
              {/* 文字 */}
              <div className="text-center space-y-1 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <p className="text-base sm:text-lg font-bold">{t('bet_success_title')}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('bet_placed')} <span className="font-mono font-medium text-foreground">${successData.amount}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t('expected_return')} <span className="font-mono font-medium text-primary">${successData.payout.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </div>
        )}
        
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg font-bold">
            {showMatchSelection ? t('select_match_title') : t('place_bet_title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-3">
          {/* 余额显示 */}
          <div className="flex items-center justify-between py-1.5 sm:py-2 px-2.5 sm:px-3 bg-muted/50 rounded-lg">
            <span className="text-[10px] sm:text-xs text-muted-foreground">{t('virtual_wallet_balance')}</span>
            <span className="text-base sm:text-lg font-bold font-mono">${userBalance.toFixed(0)}</span>
          </div>

          {/* 比赛选择列表 */}
          {showMatchSelection && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-medium">{t('challenge_ai')}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground px-1 sm:px-1.5 py-0.5 bg-muted rounded">
                    {format(new Date(), i18n.language.startsWith('zh') ? 'MM月dd日' : 'MMM dd')}
                  </span>
                </div>
                {isDemo && (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] text-amber-500 border-amber-500/30">
                    {t('demo_mode')}
                  </Badge>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                {t('ai_predictions_today')}
              </p>
              
              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                </div>
              ) : aiMatches.length === 0 ? (
                <div className="py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground">
                  暂无比赛
                </div>
              ) : (
                <ScrollArea className="h-[280px] sm:h-[320px]">
                  <div className="space-y-1 sm:space-y-1.5 pr-2">
                    {aiMatches.map((m) => {
                      const kickoffTimestamp = new Date(m.kickoff_at).getTime();
                      const now = Date.now();
                      const diff = kickoffTimestamp - now;
                      const isStarted = diff <= 0;
                      
                      let countdown = "";
                      if (isStarted) {
                        countdown = "已开赛";
                      } else {
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        if (hours > 24) {
                          const days = Math.floor(hours / 24);
                          countdown = `${days}天后`;
                        } else if (hours > 0) {
                          countdown = `${hours}小时${minutes}分`;
                        } else {
                          countdown = `${minutes}分钟`;
                        }
                      }
                      
                      const kickoffTime = format(new Date(m.kickoff_at), 'HH:mm');
                      
                      return (
                        <div 
                          key={m.fixture_id}
                          className="p-2 sm:p-2.5 rounded-lg border border-border cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                          onClick={() => handleSelectMatch(m)}
                        >
                          {/* 联赛和时间 */}
                          <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-[45%]">{getLeagueNameZh(m.league_name)}</span>
                            <span className={`text-[9px] sm:text-[10px] font-mono ${isStarted ? 'text-amber-500' : 'text-muted-foreground'}`}>
                              {isStarted ? t('match_started') : kickoffTime}
                            </span>
                          </div>
                          
                          {/* 球队对阵 */}
                          <div className="flex items-center justify-between gap-1 sm:gap-2">
                            {/* 主队 */}
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
                              {m.home_logo && (
                                <img src={m.home_logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                              )}
                              <span className="text-[10px] sm:text-xs font-medium truncate">{getTeamNameZh(m.home_team_name)}</span>
                            </div>
                            
                            {/* VS - 包含AI图标在下方 */}
                            <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 shrink-0 px-1 sm:px-2">
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">vs</span>
                              {!isStarted && (
                                <span className="text-[8px] sm:text-[9px] text-muted-foreground whitespace-nowrap">{countdown}</span>
                              )}
                              {/* AI图标 - 居中显示在VS下方 */}
                              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                {m.ai_models.slice(0, 4).map((model, idx) => {
                                  // 尝试匹配不同的AI模型名称
                                  const getAIIcon = (modelName: string) => {
                                    const normalized = modelName.toUpperCase();
                                    if (normalized.includes('GPT') || normalized.includes('OPENAI') || normalized.includes('CHATGPT')) {
                                      return AI_ICONS["GPT-5"] || gpt5Icon;
                                    } else if (normalized.includes('CLAUDE')) {
                                      return AI_ICONS["Claude"] || claudeIcon;
                                    } else if (normalized.includes('GEMINI')) {
                                      return AI_ICONS["Gemini"] || geminiIcon;
                                    } else if (normalized.includes('DEEPSEEK')) {
                                      return AI_ICONS["DeepSeek"] || deepseekIcon;
                                    } else if (normalized.includes('GROK')) {
                                      return AI_ICONS["Grok"] || grokIcon;
                                    } else if (normalized.includes('HUNSOCCER')) {
                                      return AI_ICONS["HUNSOCCER"] || hunsoccerIcon;
                                    }
                                    // 如果直接匹配AI_ICONS中的key
                                    if (AI_ICONS[model]) {
                                      return AI_ICONS[model];
                                    }
                                    // 默认返回不同的图标（根据索引循环使用）
                                    const iconKeys = ["GPT-5", "Claude", "Gemini", "DeepSeek", "Grok", "HUNSOCCER"];
                                    const iconKey = iconKeys[idx % iconKeys.length];
                                    return AI_ICONS[iconKey] || gpt5Icon;
                                  };
                                  
                                  return (
                                    <img 
                                      key={idx}
                                      src={getAIIcon(model)} 
                                      alt={model}
                                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full object-cover border border-border/30"
                                      title={model}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* 客队 */}
                            <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 min-w-0">
                              <span className="text-[10px] sm:text-xs font-medium truncate text-right">{getTeamNameZh(m.away_team_name)}</span>
                              {m.away_logo && (
                                <img src={m.away_logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* 下注界面 */}
          {!showMatchSelection && selectedMatch && (
            <>

              {/* 当前选中的比赛 - 球场背景 */}
              <div 
                className="relative rounded-lg overflow-hidden"
                style={{
                  backgroundImage: `url(${greencourtBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative p-2.5 sm:p-4">
                  {/* 联赛信息 */}
                  <div className="text-center mb-2 sm:mb-3">
                    <span className="text-[9px] sm:text-[10px] text-white/70 bg-black/30 px-1.5 sm:px-2 py-0.5 rounded">
                      {getLeagueNameZh(selectedMatch.league_name)}
                    </span>
                  </div>
                  
                  {/* 球队对阵 */}
                  <div className="flex items-center justify-between gap-2 sm:gap-6 px-1 sm:px-4">
                    {/* 主队 */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1 flex-1 min-w-0">
                      {selectedMatch.home_logo && (
                        <img src={selectedMatch.home_logo} alt="" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                      )}
                      <span className="text-white font-medium text-[10px] sm:text-sm truncate max-w-full text-center">{getTeamNameZh(selectedMatch.home_team_name)}</span>
                    </div>
                    
                    {/* VS 和倒计时 */}
                    <div className="text-center flex-shrink-0">
                      {(() => {
                        const kickoffTime = new Date(selectedMatch.kickoff_at).getTime();
                        const diff = kickoffTime - currentTime;
                        
                        // 移除"已开赛"显示
                        if (diff <= 0) {
                          return null;
                        }
                        
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                        const isUrgent = hours === 0 && minutes < 10;
                        
                        if (hours > 24) {
                          const days = Math.floor(hours / 24);
                          return <span className="text-white/70 text-[10px] sm:text-xs">{days}天后开赛</span>;
                        }
                        
                        return (
                          <span className={`text-[10px] sm:text-xs font-mono ${isUrgent ? 'text-destructive animate-pulse font-bold' : 'text-primary'}`}>
                            {hours > 0 
                              ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                              : `${minutes}:${seconds.toString().padStart(2, '0')}`
                            }
                          </span>
                        );
                      })()}
                      <div className="text-white font-bold text-sm sm:text-lg">VS</div>
                    </div>
                    
                    {/* 客队 */}
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1 flex-1 min-w-0">
                      {selectedMatch.away_logo && (
                        <img src={selectedMatch.away_logo} alt="" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                      )}
                      <span className="text-white font-medium text-[10px] sm:text-sm truncate max-w-full text-center">{getTeamNameZh(selectedMatch.away_team_name)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 盘口市场选择 */}
              <div className="space-y-1.5 sm:space-y-2">
                {/* 市场标签 */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setSelectedBetType("handicap")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium transition-colors border-b-2 -mb-px ${
                      selectedBetType === "handicap"
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('handicap_bet')}
                  </button>
                  <button
                    onClick={() => setSelectedBetType("over_under")}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium transition-colors border-b-2 -mb-px ${
                      selectedBetType === "over_under"
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('over_under_bet')}
                  </button>
                </div>

                {/* 盘口选项 */}
                <div className="space-y-1 sm:space-y-1.5">
                  {getBetOptions().map((option) => {
                    const isSelected = selectedBetOption === option.value;
                    
                    return (
                      <div
                        key={option.value}
                        onClick={() => setSelectedBetOption(option.value)}
                        className={`flex items-center justify-between p-2 sm:p-3 rounded border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-foreground bg-foreground/5' 
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-medium">{option.label}</span>
                        <span className={`text-xs sm:text-sm font-mono font-bold ${
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          @{option.odds.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 投注面板 - 默认显示 */}
              <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-border">
                {/* 投注金额 */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">{t('bet_amount')}</Label>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                      {t('balance_label')}: <span className="font-mono">${userBalance.toFixed(0)}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder={t('enter_amount')}
                      className="h-9 sm:h-10 pl-6 sm:pl-7 text-right font-mono font-medium text-sm sm:text-base"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                    {[100, 500, 1000, 2000].map((amount) => (
                      <Button
                        key={amount}
                        variant={betAmount === amount.toString() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBetAmount(amount.toString())}
                        className="h-6 sm:h-7 text-[9px] sm:text-[10px] font-mono px-1"
                        disabled={amount > userBalance}
                      >
                        {amount}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 收益预览 */}
                <div className="flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3 rounded bg-muted/50">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{t('expected_return')}</span>
                  <span className="text-base sm:text-lg font-bold font-mono">
                    {selectedBetOption 
                      ? `$${((parseFloat(betAmount) || 0) * getCurrentOdds()).toFixed(2)}`
                      : "$0.00"
                    }
                  </span>
                </div>

                {/* 确认按钮 */}
                <Button
                  onClick={handlePlaceBet}
                  disabled={isSubmitting || !betAmount || parseFloat(betAmount) <= 0 || !selectedBetOption}
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm font-medium"
                >
                  {isSubmitting ? t('processing') : isDemo ? t('try_bet') : t('confirm_bet_btn')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceBetDialog;

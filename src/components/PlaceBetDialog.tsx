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
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

// AI模型图标映射
import gpt5Icon from "@/assets/ai-icon-chatgpt.png";
import claudeIcon from "@/assets/ai-icon-claude.png";
import geminiIcon from "@/assets/ai-icon-gemini.png";
import deepseekIcon from "@/assets/deepseek-icon.png";
import grokIcon from "@/assets/ai-icon-grok.png";
import hunsoccerIcon from "@/assets/ai-icon-hunsoccer.png";
import footballFieldBg from "@/assets/football-field-bg.jpg";

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

interface MatchStats {
  head_to_head: {
    home_wins: number;
    draws: number;
    away_wins: number;
    total_games: number;
  };
  team_stats: {
    home: TeamRadarData[];
    away: TeamRadarData[];
  };
}

interface TeamRadarData {
  category: string;
  value: number;
  fullMark: number;
}

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
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(match);
  const [aiPredictions, setAiPredictions] = useState<AIBet[]>([]);
  const [selectedBetType, setSelectedBetType] = useState<string>("handicap");
  const [selectedBetOption, setSelectedBetOption] = useState<string>("");
  const [isDemo, setIsDemo] = useState(false);
  const [betAmount, setBetAmount] = useState<string>("100");
  const [userBalance, setUserBalance] = useState<number>(10000);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  
  // AI预测比赛列表相关状态
  const [aiMatches, setAiMatches] = useState<AIMatchWithDetails[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [showMatchSelection, setShowMatchSelection] = useState(!match);
  const [currentTime, setCurrentTime] = useState(Date.now());

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
      fetchMatchStats(selectedMatch);
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
    setUserBalance(data?.balance ?? 10000);
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

  const fetchMatchStats = async (match: Match) => {
    if (!match.home_team_id || !match.away_team_id) return;
    setMatchLoading(true);
    try {
      const [headToHeadRes, homeHistoryRes, awayHistoryRes] = await Promise.all([
        supabase.functions.invoke('football-head-to-head', {
          body: { homeTeamId: match.home_team_id, awayTeamId: match.away_team_id },
        }),
        supabase.functions.invoke('football-team-history', {
          body: { teamId: match.home_team_id },
        }),
        supabase.functions.invoke('football-team-history', {
          body: { teamId: match.away_team_id },
        }),
      ]);

      let headToHead = { home_wins: 0, draws: 0, away_wins: 0, total_games: 0 };
      if (headToHeadRes.data && !headToHeadRes.error) {
        headToHead = headToHeadRes.data.headToHead || headToHead;
      }

      let homeStats: TeamRadarData[] = [
        { category: '进攻', value: 70, fullMark: 100 },
        { category: '防守', value: 70, fullMark: 100 },
        { category: '控球', value: 70, fullMark: 100 },
        { category: '传球', value: 70, fullMark: 100 },
        { category: '体能', value: 70, fullMark: 100 },
      ];
      let awayStats: TeamRadarData[] = [
        { category: '进攻', value: 70, fullMark: 100 },
        { category: '防守', value: 70, fullMark: 100 },
        { category: '控球', value: 70, fullMark: 100 },
        { category: '传球', value: 70, fullMark: 100 },
        { category: '体能', value: 70, fullMark: 100 },
      ];

      if (homeHistoryRes.data?.history) {
        const homeHistory = homeHistoryRes.data.history;
        const wins = homeHistory.filter((h: any) => h.result === 'W').length;
        const goalsFor = homeHistory.reduce((sum: number, h: any) => sum + (h.score?.team || 0), 0);
        const goalsAgainst = homeHistory.reduce((sum: number, h: any) => sum + (h.score?.opponent || 0), 0);
        const winRate = homeHistory.length > 0 ? wins / homeHistory.length : 0.5;
        const goalDiff = goalsFor - goalsAgainst;
        const avgGoalsFor = homeHistory.length > 0 ? goalsFor / homeHistory.length : 1.5;
        const avgGoalsAgainst = homeHistory.length > 0 ? goalsAgainst / homeHistory.length : 1.5;
        homeStats = [
          { category: '进攻', value: Math.min(100, Math.max(40, avgGoalsFor * 25)), fullMark: 100 },
          { category: '防守', value: Math.min(100, Math.max(40, 100 - avgGoalsAgainst * 25)), fullMark: 100 },
          { category: '控球', value: Math.min(100, Math.max(40, winRate * 100)), fullMark: 100 },
          { category: '传球', value: Math.min(100, Math.max(40, 60 + goalDiff * 5)), fullMark: 100 },
          { category: '体能', value: Math.min(100, Math.max(40, 70 + winRate * 20)), fullMark: 100 },
        ];
      }

      if (awayHistoryRes.data?.history) {
        const awayHistory = awayHistoryRes.data.history;
        const wins = awayHistory.filter((h: any) => h.result === 'W').length;
        const goalsFor = awayHistory.reduce((sum: number, h: any) => sum + (h.score?.team || 0), 0);
        const goalsAgainst = awayHistory.reduce((sum: number, h: any) => sum + (h.score?.opponent || 0), 0);
        const winRate = awayHistory.length > 0 ? wins / awayHistory.length : 0.5;
        const goalDiff = goalsFor - goalsAgainst;
        const avgGoalsFor = awayHistory.length > 0 ? goalsFor / awayHistory.length : 1.5;
        const avgGoalsAgainst = awayHistory.length > 0 ? goalsAgainst / awayHistory.length : 1.5;
        awayStats = [
          { category: '进攻', value: Math.min(100, Math.max(40, avgGoalsFor * 25)), fullMark: 100 },
          { category: '防守', value: Math.min(100, Math.max(40, 100 - avgGoalsAgainst * 25)), fullMark: 100 },
          { category: '控球', value: Math.min(100, Math.max(40, winRate * 100)), fullMark: 100 },
          { category: '传球', value: Math.min(100, Math.max(40, 60 + goalDiff * 5)), fullMark: 100 },
          { category: '体能', value: Math.min(100, Math.max(40, 70 + winRate * 20)), fullMark: 100 },
        ];
      }

      setMatchStats({ head_to_head: headToHead, team_stats: { home: homeStats, away: awayStats } });
    } catch (error) {
      console.error('Error fetching match stats:', error);
    } finally {
      setMatchLoading(false);
    }
  };

  const getBetOptions = (): BetOption[] => {
    if (selectedBetType === "handicap") {
      return [
        { label: `${selectedMatch?.home_team_name} -1.5`, value: "home_-1.5", odds: 2.10, line: -1.5 },
        { label: `${selectedMatch?.away_team_name} +1.5`, value: "away_+1.5", odds: 1.75, line: 1.5 },
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
    setMatchStats(null);
  };

  const handleBackToSelection = () => {
    setShowMatchSelection(true);
    setSelectedMatch(null);
    setAiPredictions([]);
    setMatchStats(null);
    setSelectedBetOption("");
  };

  const handlePlaceBet = async () => {
    // 演示模式下提示登录
    if (isDemo) {
      toast.info("演示模式：请登录后进行真实下注");
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
        toast.success("下注成功！开始与AI的PK之旅！");
        onOpenChange(false);
        setBetAmount("100");
        setSelectedBetOption("");
        setShowMatchSelection(true);
        setSelectedMatch(null);
        if (onBetPlaced) onBetPlaced();
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">
            {showMatchSelection ? "选择比赛" : "下注"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* 余额显示 */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground">虚拟钱包余额</span>
            <span className="text-lg font-bold font-mono">${userBalance.toFixed(0)}</span>
          </div>

          {/* 比赛选择列表 */}
          {showMatchSelection && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">挑战AI</span>
                {isDemo && (
                  <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                    演示
                  </Badge>
                )}
              </div>
              
              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : aiMatches.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  暂无比赛
                </div>
              ) : (
                <ScrollArea className="h-[320px]">
                  <div className="space-y-1.5 pr-2">
                    {aiMatches.map((m) => {
                      const kickoffTime = new Date(m.kickoff_at).getTime();
                      const now = Date.now();
                      const diff = kickoffTime - now;
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
                      
                      return (
                        <div 
                          key={m.fixture_id}
                          className="p-2.5 rounded-lg border border-border cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                          onClick={() => handleSelectMatch(m)}
                        >
                          {/* 球队对阵 - 居中布局 */}
                          <div className="flex items-center justify-between gap-2">
                            {/* 主队 */}
                            <div className="flex items-center gap-1.5 w-[90px]">
                              {m.home_logo && (
                                <img src={m.home_logo} alt="" className="w-6 h-6 object-contain shrink-0" />
                              )}
                              <span className="text-xs font-medium truncate">{m.home_team_name}</span>
                            </div>
                            
                            {/* 中间信息 */}
                            <div className="flex flex-col items-center flex-1">
                              <span className="text-[10px] text-muted-foreground">{m.league_name}</span>
                              <span className={`text-[10px] font-mono ${isStarted ? "text-destructive" : "text-primary"}`}>
                                {countdown}
                              </span>
                            </div>
                            
                            {/* 客队 */}
                            <div className="flex items-center justify-end gap-1.5 w-[90px]">
                              <span className="text-xs font-medium truncate text-right">{m.away_team_name}</span>
                              {m.away_logo && (
                                <img src={m.away_logo} alt="" className="w-6 h-6 object-contain shrink-0" />
                              )}
                            </div>
                          </div>
                          
                          {/* AI图标 */}
                          <div className="flex items-center justify-center gap-0.5 mt-1.5">
                            {m.ai_models.slice(0, 5).map((model, idx) => (
                              <img 
                                key={idx}
                                src={AI_ICONS[model] || gpt5Icon} 
                                alt={model}
                                className="w-3.5 h-3.5 rounded-full object-cover"
                                title={model}
                              />
                            ))}
                            {m.ai_models.length > 5 && (
                              <span className="text-[9px] text-muted-foreground ml-0.5">+{m.ai_models.length - 5}</span>
                            )}
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
              {/* 返回按钮 */}
              {!match && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToSelection}
                  className="h-7 px-2 text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  返回
                </Button>
              )}

              {/* 当前选中的比赛 - 球场背景 */}
              <div 
                className="relative rounded-lg overflow-hidden"
                style={{
                  backgroundImage: `url(${footballFieldBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative p-4">
                  {/* 联赛信息 */}
                  <div className="text-center mb-3">
                    <span className="text-[10px] text-white/70 bg-black/30 px-2 py-0.5 rounded">
                      {selectedMatch.league_name}
                    </span>
                  </div>
                  
                  {/* 球队对阵 */}
                  <div className="flex items-center justify-center gap-4">
                    {/* 主队 */}
                    <div className="flex flex-col items-center gap-1">
                      {selectedMatch.home_logo && (
                        <img src={selectedMatch.home_logo} alt="" className="w-12 h-12 object-contain" />
                      )}
                      <span className="text-white font-medium text-sm">{selectedMatch.home_team_name}</span>
                    </div>
                    
                    {/* VS 和倒计时 */}
                    <div className="text-center">
                      {(() => {
                        const kickoffTime = new Date(selectedMatch.kickoff_at).getTime();
                        const diff = kickoffTime - currentTime;
                        
                        if (diff <= 0) {
                          return <span className="text-amber-400 text-xs animate-pulse">已开赛</span>;
                        }
                        
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                        const isUrgent = hours === 0 && minutes < 10;
                        
                        if (hours > 24) {
                          const days = Math.floor(hours / 24);
                          return <span className="text-white/70 text-xs">{days}天后开赛</span>;
                        }
                        
                        return (
                          <span className={`text-xs font-mono ${isUrgent ? 'text-destructive animate-pulse font-bold' : 'text-primary'}`}>
                            {hours > 0 
                              ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                              : `${minutes}:${seconds.toString().padStart(2, '0')}`
                            }
                          </span>
                        );
                      })()}
                      <div className="text-white font-bold text-lg">VS</div>
                    </div>
                    
                    {/* 客队 */}
                    <div className="flex flex-col items-center gap-1">
                      {selectedMatch.away_logo && (
                        <img src={selectedMatch.away_logo} alt="" className="w-12 h-12 object-contain" />
                      )}
                      <span className="text-white font-medium text-sm">{selectedMatch.away_team_name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 历史交锋 */}
              {matchStats && (
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-2">历史交锋（近{matchStats.head_to_head.total_games}场）</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-primary">{matchStats.head_to_head.home_wins}</div>
                      <div className="text-[10px] text-muted-foreground">主胜</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-muted-foreground">{matchStats.head_to_head.draws}</div>
                      <div className="text-[10px] text-muted-foreground">平</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-warning">{matchStats.head_to_head.away_wins}</div>
                      <div className="text-[10px] text-muted-foreground">客胜</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 投注类型选择 */}
              <div className="space-y-3">
                <Tabs value={selectedBetType} onValueChange={setSelectedBetType}>
                  <TabsList className="w-full h-8">
                    <TabsTrigger value="handicap" className="flex-1 text-xs h-7">让球</TabsTrigger>
                    <TabsTrigger value="over_under" className="flex-1 text-xs h-7">大小球</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* 赔率选项 */}
                <div className="grid grid-cols-2 gap-2">
                  {getBetOptions().map((option) => (
                    <div
                      key={option.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedBetOption === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedBetOption(option.value)}
                    >
                      <div className="text-center">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-lg font-bold text-success">{option.odds.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 投注金额 */}
              {selectedBetOption && (
                <div className="space-y-3">
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs">投注金额</Label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="输入金额"
                      min="1"
                      max={userBalance}
                      className="h-9 text-center font-mono"
                    />
                    <div className="grid grid-cols-4 gap-1.5">
                      {[100, 500, 1000, 2000].map((amount) => (
                        <Button
                          key={amount}
                          variant={betAmount === amount.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBetAmount(amount.toString())}
                          className="h-7 text-xs"
                          disabled={amount > userBalance}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 预期收益 */}
                  <div className="flex items-center justify-between py-2 px-3 bg-success/10 rounded-lg">
                    <span className="text-xs text-muted-foreground">预期收益</span>
                    <span className="text-lg font-bold text-success font-mono">
                      ${((parseFloat(betAmount) || 0) * getCurrentOdds()).toFixed(0)}
                    </span>
                  </div>

                  {/* 确认按钮 */}
                  <Button
                    onClick={handlePlaceBet}
                    disabled={isSubmitting || !betAmount || parseFloat(betAmount) <= 0}
                    className="w-full h-9 text-sm font-medium"
                  >
                    {isSubmitting ? "下注中..." : isDemo ? "体验下注" : "确认下注"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceBetDialog;

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
import { Target, Trophy, Calendar, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";

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
  match: Match | null;
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-warning bg-clip-text text-transparent">
            {showMatchSelection ? "选择AI预测比赛" : "与AI同场PK - 选择下注"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {showMatchSelection 
              ? "以下比赛已有AI模型进行预测，选择一场比赛与AI一较高下！"
              : "选择你的预测结果，与AI在同一场比赛中一较高下！"
            }
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 余额显示 */}
          <Card className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 border-warning/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">可用余额</span>
              <span className="text-2xl font-bold font-mono">${userBalance.toFixed(0)}</span>
            </div>
          </Card>

          {/* 比赛选择列表 */}
          {showMatchSelection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  AI已预测比赛列表
                </Label>
                {isDemo && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">
                    演示数据
                  </Badge>
                )}
              </div>
              
              {/* 演示模式提示 */}
              {isDemo && (
                <Card className="p-3 bg-amber-500/10 border-amber-500/30">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    📢 当前为演示模式，显示虚拟比赛数据。登录后可查看真实AI预测比赛并参与下注。
                  </p>
                </Card>
              )}
              
              {isLoadingMatches ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">加载中...</span>
                </div>
              ) : aiMatches.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">暂无AI预测的比赛</p>
                  <p className="text-xs text-muted-foreground mt-2">请稍后再试</p>
                </Card>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {aiMatches.map((m) => (
                      <Card 
                        key={m.fixture_id}
                        className="p-4 cursor-pointer transition-all hover:border-primary hover:bg-primary/5 group"
                        onClick={() => handleSelectMatch(m)}
                      >
                        <div className="flex items-center gap-3">
                          {/* 比赛信息 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {m.home_logo && (
                                <img src={m.home_logo} alt="" className="w-6 h-6 object-contain" />
                              )}
                              <span className="font-semibold text-sm">{m.home_team_name}</span>
                              <span className="text-muted-foreground text-xs">vs</span>
                              <span className="font-semibold text-sm">{m.away_team_name}</span>
                              {m.away_logo && (
                                <img src={m.away_logo} alt="" className="w-6 h-6 object-contain" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {m.league_name}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(m.kickoff_at), "MM/dd HH:mm")}
                              </span>
                            </div>
                          </div>
                          
                          {/* AI预测数量 */}
                          <div className="text-right">
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              {m.ai_count} AI预测
                            </Badge>
                            <div className="text-[10px] text-muted-foreground mt-1 max-w-[120px] truncate">
                              {m.ai_models.slice(0, 3).join(", ")}
                              {m.ai_models.length > 3 && "..."}
                            </div>
                          </div>
                          
                          {/* 箭头 */}
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Card>
                    ))}
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
                  className="mb-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  返回选择比赛
                </Button>
              )}

              {/* 当前选中的比赛 */}
              <Card className="p-4 border-primary/20">
                <div className="flex items-center gap-4">
                  {selectedMatch.home_logo && (
                    <img src={selectedMatch.home_logo} alt="" className="w-12 h-12 object-contain" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-lg">{selectedMatch.home_team_name} vs {selectedMatch.away_team_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedMatch.league_name}</p>
                  </div>
                  {selectedMatch.away_logo && (
                    <img src={selectedMatch.away_logo} alt="" className="w-12 h-12 object-contain" />
                  )}
                </div>
              </Card>

              {/* 历史交锋和雷达图 */}
              {matchStats && (
                <div className="space-y-3">
                  <Label className="text-base font-bold">比赛数据分析</Label>
                  
                  {/* 历史交锋 */}
                  <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-primary" />
                      <h4 className="font-bold text-sm">历史交锋（近{matchStats.head_to_head.total_games}场）</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{matchStats.head_to_head.home_wins}</div>
                        <div className="text-xs text-muted-foreground">主队胜</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-muted-foreground">{matchStats.head_to_head.draws}</div>
                        <div className="text-xs text-muted-foreground">平局</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-warning">{matchStats.head_to_head.away_wins}</div>
                        <div className="text-xs text-muted-foreground">客队胜</div>
                      </div>
                    </div>
                  </Card>

                  {/* 球队实力对比雷达图 */}
                  <Card className="p-4 bg-gradient-to-br from-primary/5 to-warning/5 border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        <h4 className="font-bold text-sm">球队实力对比</h4>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart 
                        data={matchStats.team_stats.home.map((item, idx) => ({
                          category: item.category,
                          主队: item.value,
                          客队: matchStats.team_stats.away[idx].value,
                        }))}
                        margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                      >
                        <PolarGrid stroke="hsl(var(--border))" strokeWidth={1.5} strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 13 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={6} />
                        <Radar name={selectedMatch.home_team_name} dataKey="主队" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2.5} />
                        <Radar name={selectedMatch.away_team_name} dataKey="客队" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.25} strokeWidth={2.5} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              )}

              {/* 投注类型选择 */}
              <div className="space-y-4">
                <Tabs value={selectedBetType} onValueChange={setSelectedBetType}>
                  <TabsList>
                    <TabsTrigger value="handicap">让球</TabsTrigger>
                    <TabsTrigger value="over_under">大小球</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* 赔率选项 */}
                <div className="grid grid-cols-2 gap-4">
                  {getBetOptions().map((option) => (
                    <Card
                      key={option.value}
                      className={`p-5 cursor-pointer transition-all hover:border-primary ${
                        selectedBetOption === option.value
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-border'
                      }`}
                      onClick={() => setSelectedBetOption(option.value)}
                    >
                      <div className="text-center space-y-2">
                        <p className="font-bold text-base">{option.label}</p>
                        <Badge className="text-lg font-bold px-3 py-1 bg-gradient-to-r from-success/20 to-success/10 text-success border-success/30">
                          {option.odds.toFixed(2)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 投注金额 */}
              {selectedBetOption && (
                <div className="space-y-4">
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-base font-bold">选择投注金额</Label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="输入投注金额"
                      min="1"
                      max={userBalance}
                      className="h-12 text-lg font-mono text-center"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 500, 1000, 2000].map((amount) => (
                        <Button
                          key={amount}
                          variant={betAmount === amount.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => setBetAmount(amount.toString())}
                          className="h-10 font-bold"
                          disabled={amount > userBalance}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Card className="p-4 bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">预期收益</p>
                        <p className="text-sm text-muted-foreground">
                          投注 ${parseFloat(betAmount) || 0} × {getCurrentOdds().toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-success font-mono">
                          ${((parseFloat(betAmount) || 0) * getCurrentOdds()).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* 确认按钮 */}
              {selectedBetOption && (
                <>
                  {isDemo && (
                    <Card className="p-3 bg-amber-500/10 border-amber-500/30">
                      <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                        ⚠️ 演示模式：登录后可进行真实下注
                      </p>
                    </Card>
                  )}
                  <Button
                    onClick={handlePlaceBet}
                    disabled={isSubmitting || !betAmount || parseFloat(betAmount) <= 0}
                    className={`w-full h-12 text-lg font-bold ${
                      isDemo 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90' 
                        : 'bg-gradient-to-r from-primary to-warning hover:opacity-90'
                    }`}
                  >
                    <Target className="mr-2 h-5 w-5" />
                    {isSubmitting 
                      ? "下注中..." 
                      : isDemo 
                        ? `体验下注 $${betAmount} @ ${getCurrentOdds().toFixed(2)}`
                        : `确认下注 $${betAmount} @ ${getCurrentOdds().toFixed(2)}`
                    }
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceBetDialog;

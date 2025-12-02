import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';

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
  const [betAmount, setBetAmount] = useState<string>("100");
  const [userBalance, setUserBalance] = useState<number>(10000);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  // Update selectedMatch when match prop changes
  useEffect(() => {
    setSelectedMatch(match);
  }, [match]);

  useEffect(() => {
    if (open && selectedMatch) {
      fetchUserBalance();
      fetchAIPredictions(selectedMatch.fixture_id);
      fetchMatchStats(selectedMatch);
    }
  }, [open, selectedMatch]);

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
          bet_type: bet.bet_type || 'moneyline',
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
    } else if (selectedBetType === "over_under") {
      return [
        { label: "大球 2.5", value: "over_2.5", odds: 1.88, line: 2.5 },
        { label: "小球 2.5", value: "under_2.5", odds: 1.95, line: 2.5 },
      ];
    } else {
      return [
        { label: `${selectedMatch?.home_team_name} 胜`, value: "home_win", odds: 1.85 },
        { label: "平局", value: "draw", odds: 3.40 },
        { label: `${selectedMatch?.away_team_name} 胜`, value: "away_win", odds: 4.20 },
      ];
    }
  };

  const getCurrentOdds = (): number => {
    const options = getBetOptions();
    const selected = options.find(opt => opt.value === selectedBetOption);
    return selected?.odds || 1.9;
  };

  const handlePlaceBet = async () => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-warning bg-clip-text text-transparent">
            与AI同场PK - 选择比赛下注
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            选择你的预测结果，与AI在同一场比赛中一较高下！
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 余额显示 */}
          <Card className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 border-warning/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">可用余额</span>
              <span className="text-2xl font-bold font-mono-data">${userBalance.toFixed(0)}</span>
            </div>
          </Card>

          {/* 当前选中的比赛 */}
          {selectedMatch && (
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
          )}

          {/* 历史交锋和雷达图 */}
          {selectedMatch && matchStats && (
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
          {selectedMatch && aiPredictions.length > 0 && (
            <div className="space-y-4">
              <Tabs value={selectedBetType} onValueChange={setSelectedBetType}>
                <TabsList>
                  <TabsTrigger value="moneyline">独赢盘</TabsTrigger>
                  <TabsTrigger value="handicap">让分盘</TabsTrigger>
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
          )}

          {/* 投注金额 */}
          {selectedMatch && selectedBetOption && (
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
                  className="h-12 text-lg font-mono-data text-center"
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
                    <p className="text-2xl font-bold text-success font-mono-data">
                      ${((parseFloat(betAmount) || 0) * getCurrentOdds()).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 确认按钮 */}
          {selectedMatch && selectedBetOption && (
            <Button
              onClick={handlePlaceBet}
              disabled={isSubmitting || !betAmount || parseFloat(betAmount) <= 0}
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-warning hover:opacity-90"
            >
              <Target className="mr-2 h-5 w-5" />
              {isSubmitting ? "下注中..." : `确认下注 $${betAmount} @ ${getCurrentOdds().toFixed(2)}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


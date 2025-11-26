import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Match {
  fixture_id: number;
  home_team_name: string;
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

interface PlaceBetDialogProps {
  onBetPlaced?: () => void;
}

export const PlaceBetDialog = ({ onBetPlaced }: PlaceBetDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [aiPredictions, setAiPredictions] = useState<AIBet[]>([]);
  const [selectedBetType, setSelectedBetType] = useState<string>("handicap");
  const [selectedBetOption, setSelectedBetOption] = useState<string>("");
  const [betAmount, setBetAmount] = useState<string>("100");
  const [userBalance, setUserBalance] = useState<number>(10000);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableMatches();
      fetchUserBalance();
    }
  }, [open]);

  useEffect(() => {
    if (selectedMatch) {
      fetchAIPredictions(selectedMatch.fixture_id);
      setSelectedBetOption(""); // 重置选择
    }
  }, [selectedMatch]);

  useEffect(() => {
    setSelectedBetOption(""); // 切换投注类型时重置选择
  }, [selectedBetType]);

  const fetchUserBalance = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setUserBalance(data.balance);
    }
  };

  const fetchAvailableMatches = async () => {
    setIsLoading(true);
    try {
      // 获取今天和明天的比赛
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      const { data: matchesData } = await supabase
        .from('daily_matches' as any)
        .select('*')
        .in('date', [today, tomorrow])
        .eq('status_short', 'NS')
        .order('kickoff_at', { ascending: true })
        .limit(20);
      
      if (matchesData && matchesData.length > 0) {
        setMatches(matchesData as unknown as Match[]);
      } else {
        // 如果没有真实数据，使用模拟数据
        const mockMatches: Match[] = [
          {
            fixture_id: 1001,
            home_team_name: "曼城",
            away_team_name: "利物浦",
            home_logo: "https://media.api-sports.io/football/teams/50.png",
            away_logo: "https://media.api-sports.io/football/teams/40.png",
            league_name: "英超",
            kickoff_at: new Date(Date.now() + 3600000 * 2).toISOString(),
          },
          {
            fixture_id: 1002,
            home_team_name: "皇家马德里",
            away_team_name: "巴塞罗那",
            home_logo: "https://media.api-sports.io/football/teams/541.png",
            away_logo: "https://media.api-sports.io/football/teams/529.png",
            league_name: "西甲",
            kickoff_at: new Date(Date.now() + 3600000 * 5).toISOString(),
          },
          {
            fixture_id: 1003,
            home_team_name: "拜仁慕尼黑",
            away_team_name: "多特蒙德",
            home_logo: "https://media.api-sports.io/football/teams/157.png",
            away_logo: "https://media.api-sports.io/football/teams/165.png",
            league_name: "德甲",
            kickoff_at: new Date(Date.now() + 3600000 * 8).toISOString(),
          },
          {
            fixture_id: 1004,
            home_team_name: "巴黎圣日耳曼",
            away_team_name: "马赛",
            home_logo: "https://media.api-sports.io/football/teams/85.png",
            away_logo: "https://media.api-sports.io/football/teams/81.png",
            league_name: "法甲",
            kickoff_at: new Date(Date.now() + 3600000 * 12).toISOString(),
          },
        ];
        setMatches(mockMatches);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      // 出错时也使用模拟数据
      const mockMatches: Match[] = [
        {
          fixture_id: 1001,
          home_team_name: "曼城",
          away_team_name: "利物浦",
          home_logo: "https://media.api-sports.io/football/teams/50.png",
          away_logo: "https://media.api-sports.io/football/teams/40.png",
          league_name: "英超",
          kickoff_at: new Date(Date.now() + 3600000 * 2).toISOString(),
        },
        {
          fixture_id: 1002,
          home_team_name: "皇家马德里",
          away_team_name: "巴塞罗那",
          home_logo: "https://media.api-sports.io/football/teams/541.png",
          away_logo: "https://media.api-sports.io/football/teams/529.png",
          league_name: "西甲",
          kickoff_at: new Date(Date.now() + 3600000 * 5).toISOString(),
        },
      ];
      setMatches(mockMatches);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIPredictions = async (matchId: number) => {
    try {
      const { data: betsData } = await supabase
        .from('ai_auto_bets' as any)
        .select('*')
        .eq('match_id', matchId)
        .eq('status', 'pending');
      
      if (betsData && betsData.length > 0) {
        setAiPredictions(betsData as unknown as AIBet[]);
      } else {
        // 如果没有真实AI预测，使用模拟数据
        const mockPredictions: AIBet[] = [
          {
            ai_id: "gpt5",
            ai_display_name: "GPT-5",
            prediction: "主队胜",
            bet_type: "moneyline",
            confidence: 78,
            odds: 1.95,
          },
          {
            ai_id: "gpt5",
            ai_display_name: "GPT-5",
            prediction: "主队让-1.5",
            bet_type: "handicap",
            confidence: 72,
            odds: 2.10,
            handicap_line: -1.5,
          },
          {
            ai_id: "gpt5",
            ai_display_name: "GPT-5",
            prediction: "大球",
            bet_type: "over_under",
            confidence: 81,
            odds: 1.88,
            over_under_line: 2.5,
            over_under_pick: "over",
          },
        ];
        setAiPredictions(mockPredictions);
      }
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
      // 出错时也使用模拟数据
      const mockPredictions: AIBet[] = [
        {
          ai_id: "gpt5",
          ai_display_name: "GPT-5",
          prediction: "主队胜",
          bet_type: "moneyline",
          confidence: 78,
          odds: 1.95,
        },
        {
          ai_id: "gpt5",
          ai_display_name: "GPT-5",
          prediction: "主队让-1.5",
          bet_type: "handicap",
          confidence: 72,
          odds: 2.10,
          handicap_line: -1.5,
        },
        {
          ai_id: "gpt5",
          ai_display_name: "GPT-5",
          prediction: "大球",
          bet_type: "over_under",
          confidence: 81,
          odds: 1.88,
          over_under_line: 2.5,
          over_under_pick: "over",
        },
      ];
      setAiPredictions(mockPredictions);
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
    }
    return [];
  };

  const getAIPrediction = () => {
    return aiPredictions.find(p => p.bet_type === selectedBetType);
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
    if (isNaN(amount) || amount <= 0) {
      toast.error("请输入有效的投注金额");
      return;
    }

    if (amount > userBalance) {
      toast.error("余额不足");
      return;
    }

    const options = getBetOptions();
    const selected = options.find(opt => opt.value === selectedBetOption);
    if (!selected) {
      toast.error("选择的下注选项无效");
      return;
    }

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
      if (result && result.success) {
        toast.success("下注成功！开始与AI的PK之旅！");
        setOpen(false);
        setBetAmount("100");
        setSelectedMatch(null);
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

  const getPotentialPayout = (): number => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount)) return 0;
    return amount * getCurrentOdds();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full bg-gradient-to-r from-primary to-warning hover:opacity-90 transition-opacity font-bold"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          与AI同场PK
        </Button>
      </DialogTrigger>
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

          {/* 选择比赛 */}
          <div className="space-y-3">
            <Label className="text-base font-bold">选择比赛</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">加载中...</p>
            ) : matches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无可投注的比赛</p>
            ) : (
              <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                {matches.map((match) => (
                  <Card
                    key={match.fixture_id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary ${
                      selectedMatch?.fixture_id === match.fixture_id
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => setSelectedMatch(match)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {match.home_logo && (
                          <img src={match.home_logo} alt="" className="w-8 h-8 object-contain" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">
                            {match.home_team_name} vs {match.away_team_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{match.league_name}</p>
                        </div>
                        {match.away_logo && (
                          <img src={match.away_logo} alt="" className="w-8 h-8 object-contain" />
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(match.kickoff_at).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 选择投注类型和选项 */}
          {selectedMatch && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-bold mb-3 block">选择投注类型</Label>
                <Tabs value={selectedBetType} onValueChange={setSelectedBetType}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="handicap">让分盘</TabsTrigger>
                    <TabsTrigger value="over_under">大小球</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 用户选择区 */}
              <div className="space-y-3">
                <Label className="text-base font-bold">你的预测</Label>
                <div className="grid grid-cols-2 gap-3">
                  {getBetOptions().map((option) => (
                    <Card
                      key={option.value}
                      className={`p-4 cursor-pointer transition-all hover:border-primary ${
                        selectedBetOption === option.value
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-border'
                      }`}
                      onClick={() => setSelectedBetOption(option.value)}
                    >
                      <div className="text-center">
                        <p className="font-bold text-lg mb-1">{option.label}</p>
                        <Badge className="bg-success/20 text-success border-success/30">
                          赔率 {option.odds.toFixed(2)}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* AI预测展示 */}
              {getAIPrediction() && (
                <Card className="p-4 border-warning/30 bg-gradient-to-br from-warning/10 to-transparent">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">🤖 AI的预测</p>
                      <p className="font-bold">{getAIPrediction()?.ai_display_name}</p>
                    </div>
                    <Badge className="bg-warning/20 text-warning border-warning/30">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {getAIPrediction()?.confidence}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">AI选择</span>
                    <span className="font-bold text-warning">{getAIPrediction()?.prediction}</span>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* 投注金额 */}
          {selectedMatch && selectedBetOption && (
            <div className="space-y-3">
              <Label className="text-base font-bold">投注金额</Label>
              <div className="space-y-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="输入投注金额"
                  min="1"
                  max={userBalance}
                  className="text-lg font-mono-data"
                />
                <div className="flex gap-2">
                  {[100, 500, 1000, 2000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(amount.toString())}
                      className="flex-1"
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* 预期收益 */}
              <Card className="p-4 bg-gradient-to-r from-success/10 to-success/5 border-success/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">预期收益</p>
                    <p className="text-sm text-muted-foreground">
                      投注 ${parseFloat(betAmount) || 0} × {getCurrentOdds().toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success font-mono-data">
                      ${getPotentialPayout().toFixed(2)}
                    </p>
                    <p className="text-xs text-success">
                      +${(getPotentialPayout() - (parseFloat(betAmount) || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 确认按钮 */}
          {selectedMatch && selectedBetOption && (
            <div className="space-y-3">
              <Button
                onClick={handlePlaceBet}
                disabled={isSubmitting || !betAmount || parseFloat(betAmount) <= 0}
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-warning hover:opacity-90"
              >
                <Target className="mr-2 h-5 w-5" />
                {isSubmitting ? "下注中..." : "确认下注 - 挑战AI"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ 下注后不可更改，比赛结束后与AI一起结算胜负
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

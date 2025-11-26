import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Plus, Trophy, TrendingDown, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';

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

interface MatchStats {
  head_to_head: {
    home_wins: number;
    draws: number;
    away_wins: number;
    total_games: number;
  };
  home_form: string[]; // 近5场 W/D/L
  away_form: string[];
  team_stats: {
    home: TeamRadarData[];
    away: TeamRadarData[];
  };
  key_players: {
    home: KeyPlayer[];
    away: KeyPlayer[];
  };
}

interface TeamRadarData {
  category: string;
  value: number;
  fullMark: number;
}

interface KeyPlayer {
  name: string;
  position: string;
  goals: number;
  assists: number;
  rating: number;
  matches: number;
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
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);

  useEffect(() => {
    if (open) {
      fetchAvailableMatches();
      fetchUserBalance();
    }
  }, [open]);

  useEffect(() => {
    if (selectedMatch) {
      fetchAIPredictions(selectedMatch.fixture_id);
      fetchMatchStats(selectedMatch.fixture_id);
      setSelectedBetOption(""); // 重置选择
    }
  }, [selectedMatch]);

  useEffect(() => {
    // 根据AI的预测自动设置投注类型
    if (aiPredictions.length > 0) {
      setSelectedBetType(aiPredictions[0].bet_type);
    }
  }, [aiPredictions]);

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
        const predictions = betsData as unknown as AIBet[];
        setAiPredictions(predictions);
        // 自动选择第一个AI预测的投注类型
        if (predictions.length > 0) {
          setSelectedBetType(predictions[0].bet_type);
        }
      } else {
        // 使用丰富的虚拟数据展示
        const mockPredictions: AIBet[] = [
          {
            ai_id: "gpt5",
            ai_display_name: "GPT-5",
            prediction: "大球",
            bet_type: "over_under",
            confidence: 85,
            odds: 1.88,
            over_under_line: 2.5,
            over_under_pick: "over",
          },
        ];
        setAiPredictions(mockPredictions);
        // 自动选择虚拟数据的投注类型
        setSelectedBetType("over_under");
      }
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
      // 出错时使用虚拟数据
      const mockPredictions: AIBet[] = [
        {
          ai_id: "gpt5",
          ai_display_name: "GPT-5",
          prediction: "大球",
          bet_type: "over_under",
          confidence: 85,
          odds: 1.88,
          over_under_line: 2.5,
          over_under_pick: "over",
        },
      ];
      setAiPredictions(mockPredictions);
      setSelectedBetType("over_under");
    }
  };

  const fetchMatchStats = async (matchId: number) => {
    try {
      // 这里可以调用后端API获取真实数据
      // 暂时使用模拟数据
      const mockStats: MatchStats = {
        head_to_head: {
          home_wins: 5,
          draws: 3,
          away_wins: 2,
          total_games: 10,
        },
        home_form: ['W', 'W', 'D', 'W', 'L'], // 最近5场：胜-胜-平-胜-负
        away_form: ['W', 'L', 'W', 'W', 'D'],
        team_stats: {
          home: [
            { category: '进攻', value: 85, fullMark: 100 },
            { category: '防守', value: 78, fullMark: 100 },
            { category: '控球', value: 82, fullMark: 100 },
            { category: '传球', value: 88, fullMark: 100 },
            { category: '体能', value: 75, fullMark: 100 },
          ],
          away: [
            { category: '进攻', value: 72, fullMark: 100 },
            { category: '防守', value: 85, fullMark: 100 },
            { category: '控球', value: 68, fullMark: 100 },
            { category: '传球', value: 70, fullMark: 100 },
            { category: '体能', value: 80, fullMark: 100 },
          ],
        },
        key_players: {
          home: [
            { name: 'Haaland', position: '前锋', goals: 28, assists: 5, rating: 8.8, matches: 30 },
            { name: 'De Bruyne', position: '中场', goals: 8, assists: 18, rating: 8.5, matches: 28 },
            { name: 'Rodri', position: '中场', goals: 4, assists: 6, rating: 8.2, matches: 32 },
          ],
          away: [
            { name: 'Salah', position: '前锋', goals: 24, assists: 12, rating: 8.6, matches: 31 },
            { name: 'Nunez', position: '前锋', goals: 15, assists: 7, rating: 7.9, matches: 29 },
            { name: 'Alexander-Arnold', position: '后卫', goals: 2, assists: 14, rating: 8.1, matches: 30 },
          ],
        },
      };
      setMatchStats(mockStats);
    } catch (error) {
      console.error('Error fetching match stats:', error);
    }
  };

  const getFormColor = (result: string) => {
    if (result === 'W') return 'bg-success text-success-foreground';
    if (result === 'D') return 'bg-muted text-muted-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const getFormLabel = (result: string) => {
    if (result === 'W') return '胜';
    if (result === 'D') return '平';
    return '负';
  };

  const getBetTypeLabel = (): string => {
    if (selectedBetType === "handicap") return "让分盘";
    if (selectedBetType === "over_under") return "大小球";
    return "独赢盘";
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
    } else if (selectedBetType === "moneyline") {
      return [
        { label: `${selectedMatch?.home_team_name} 胜`, value: "home_win", odds: 1.85 },
        { label: "平局", value: "draw", odds: 3.40 },
        { label: `${selectedMatch?.away_team_name} 胜`, value: "away_win", odds: 4.20 },
      ];
    }
    return [];
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

          {/* 历史交锋和近期战绩 */}
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

              {/* 近期战绩 */}
              <div className="grid grid-cols-2 gap-3">
                {/* 主队战绩 */}
                <Card className="p-3 border-primary/20">
                  <div className="flex items-center gap-1 mb-2">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <p className="text-xs font-bold">主队近况</p>
                  </div>
                  <div className="flex gap-1">
                    {matchStats.home_form.map((result, idx) => (
                      <Badge 
                        key={idx} 
                        className={`text-xs w-6 h-6 flex items-center justify-center ${getFormColor(result)}`}
                      >
                        {getFormLabel(result)}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">← 最新</p>
                </Card>

                {/* 客队战绩 */}
                <Card className="p-3 border-warning/20">
                  <div className="flex items-center gap-1 mb-2">
                    <TrendingDown className="w-3 h-3 text-warning" />
                    <p className="text-xs font-bold">客队近况</p>
                  </div>
                  <div className="flex gap-1">
                    {matchStats.away_form.map((result, idx) => (
                      <Badge 
                        key={idx} 
                        className={`text-xs w-6 h-6 flex items-center justify-center ${getFormColor(result)}`}
                      >
                        {getFormLabel(result)}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">← 最新</p>
                </Card>
              </div>

              {/* 球队实力对比雷达图 */}
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-warning/5 border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h4 className="font-bold text-sm">球队实力对比</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span className="text-muted-foreground">{selectedMatch?.home_team_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-warning"></div>
                      <span className="text-muted-foreground">{selectedMatch?.away_team_name}</span>
                    </div>
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
                    <PolarGrid 
                      stroke="hsl(var(--border))" 
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ 
                        fill: 'hsl(var(--foreground))', 
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      tick={{ 
                        fill: 'hsl(var(--muted-foreground))', 
                        fontSize: 11,
                        fontWeight: 500
                      }}
                      tickCount={6}
                    />
                    <Radar 
                      name={selectedMatch?.home_team_name || "主队"}
                      dataKey="主队" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.25}
                      strokeWidth={2.5}
                    />
                    <Radar 
                      name={selectedMatch?.away_team_name || "客队"}
                      dataKey="客队" 
                      stroke="hsl(var(--warning))" 
                      fill="hsl(var(--warning))" 
                      fillOpacity={0.25}
                      strokeWidth={2.5}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        fontSize: '13px',
                        fontWeight: 600,
                        paddingTop: '15px'
                      }}
                      iconType="circle"
                    />
                  </RadarChart>
                </ResponsiveContainer>

                {/* 数据解读 */}
                <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-border">
                  {matchStats.team_stats.home.map((item, idx) => {
                    const homeValue = item.value;
                    const awayValue = matchStats.team_stats.away[idx].value;
                    const diff = homeValue - awayValue;
                    const advantage = diff > 5 ? 'home' : diff < -5 ? 'away' : 'equal';
                    
                    return (
                      <div key={idx} className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">{item.category}</p>
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-sm font-bold ${
                            advantage === 'home' ? 'text-primary' : 
                            advantage === 'away' ? 'text-warning' : 
                            'text-muted-foreground'
                          }`}>
                            {homeValue}
                          </span>
                          <span className="text-xs text-muted-foreground">:</span>
                          <span className={`text-sm font-bold ${
                            advantage === 'away' ? 'text-warning' : 
                            advantage === 'home' ? 'text-primary' : 
                            'text-muted-foreground'
                          }`}>
                            {awayValue}
                          </span>
                        </div>
                        {advantage !== 'equal' && (
                          <Badge 
                            className={`text-xs mt-1 ${
                              advantage === 'home' 
                                ? 'bg-primary/20 text-primary border-primary/30' 
                                : 'bg-warning/20 text-warning border-warning/30'
                            }`}
                          >
                            {advantage === 'home' ? '主优' : '客优'}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* 核心球员数据 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-sm">核心球员数据</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 主队球员 */}
                  <Card className="p-3 border-primary/20">
                    <p className="text-xs font-bold text-primary mb-3">主队核心</p>
                    <div className="space-y-2">
                      {matchStats.key_players.home.map((player, idx) => (
                        <div key={idx} className="p-2 bg-primary/5 rounded border border-primary/10">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="font-bold text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">{player.position}</p>
                            </div>
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              {player.rating.toFixed(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                            <div>
                              <p className="text-muted-foreground">进球</p>
                              <p className="font-bold">{player.goals}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">助攻</p>
                              <p className="font-bold">{player.assists}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">场次</p>
                              <p className="font-bold">{player.matches}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* 客队球员 */}
                  <Card className="p-3 border-warning/20">
                    <p className="text-xs font-bold text-warning mb-3">客队核心</p>
                    <div className="space-y-2">
                      {matchStats.key_players.away.map((player, idx) => (
                        <div key={idx} className="p-2 bg-warning/5 rounded border border-warning/10">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="font-bold text-sm">{player.name}</p>
                              <p className="text-xs text-muted-foreground">{player.position}</p>
                            </div>
                            <Badge className="bg-warning/20 text-warning border-warning/30">
                              {player.rating.toFixed(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                            <div>
                              <p className="text-muted-foreground">进球</p>
                              <p className="font-bold">{player.goals}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">助攻</p>
                              <p className="font-bold">{player.assists}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">场次</p>
                              <p className="font-bold">{player.matches}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* 投注选项 */}
          {selectedMatch && aiPredictions.length > 0 && (
            <div className="space-y-4">
              {/* 投注类型提示 */}
              <Card className="p-3 bg-gradient-to-r from-primary/10 to-warning/10 border-primary/30">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-bold">赔率盘口：{getBetTypeLabel()}</p>
                    <p className="text-xs text-muted-foreground">选择赔率进行下注，确认后不可更改</p>
                  </div>
                </div>
              </Card>

              {/* 赔率盘口选择 */}
              <div className="space-y-3">
                <Label className="text-base font-bold">选择赔率盘口</Label>
                <div className="grid grid-cols-2 gap-4">
                  {getBetOptions().map((option) => (
                    <Card
                      key={option.value}
                      className={`p-5 cursor-pointer transition-all hover:border-primary hover:shadow-lg ${
                        selectedBetOption === option.value
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg'
                          : 'border-border hover:bg-accent/5'
                      }`}
                      onClick={() => setSelectedBetOption(option.value)}
                    >
                      <div className="text-center space-y-2">
                        <p className="font-bold text-base">{option.label}</p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-muted-foreground">赔率</span>
                          <Badge className="text-lg font-bold px-3 py-1 bg-gradient-to-r from-success/20 to-success/10 text-success border-success/30">
                            {option.odds.toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          投注 $100 可赢 ${(100 * option.odds).toFixed(0)}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
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
                {isSubmitting ? "下注中..." : `确认下注 $${betAmount} @ ${getCurrentOdds().toFixed(2)}`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ 确认后不可更改，比赛结束后自动结算并更新你的胜率
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

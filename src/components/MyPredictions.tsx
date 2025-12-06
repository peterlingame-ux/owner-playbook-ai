import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, Wallet, Edit2, Check, ArrowLeft, History, Users, TrendingUp, TrendingDown, Calendar, BarChart3, Filter, CheckCircle2, XCircle } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface UserProfile {
  display_name: string;
  avatar_url: string;
}

interface MatchInfo {
  fixture_id: number;
  home_team_name: string;
  away_team_name: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  goals_home?: number;
  goals_away?: number;
}

interface PredictionStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  recentPredictions: Array<{
    id: string;
    match_id: string;
    prediction: string;
    result: string;
    bet_amount: number;
    actual_payout: number;
    created_at: string;
    match?: MatchInfo;
  }>;
}

interface CopyTradeRecord {
  id: string;
  followed_player_id: string;
  followed_player_name: string;
  followed_player_avatar: string;
  match_id: string;
  match_home_team: string;
  match_away_team: string;
  prediction: string;
  bet_amount: number;
  result: 'win' | 'loss' | 'pending';
  pnl: number;
  created_at: string;
}

const AVATAR_OPTIONS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
  '/avatars/avatar-7.png',
  '/avatars/avatar-8.png',
  '/avatars/avatar-9.png',
];

// 胜率趋势图表组件
const WinRateTrendChart = ({ predictions }: { predictions: Array<{ result: string; created_at: string }> }) => {
  const chartData = useMemo(() => {
    if (!predictions || predictions.length === 0) {
      // 生成示例数据
      return Array.from({ length: 7 }, (_, i) => ({
        date: format(subDays(new Date(), 6 - i), 'MM/dd'),
        winRate: Math.round(50 + Math.random() * 30),
        wins: Math.floor(Math.random() * 5),
        total: Math.floor(3 + Math.random() * 5),
      }));
    }

    // 按日期分组预测
    const dateGroups = new Map<string, { wins: number; total: number }>();
    
    predictions.forEach(pred => {
      if (pred.result === 'pending') return;
      const dateKey = format(new Date(pred.created_at), 'MM/dd');
      const current = dateGroups.get(dateKey) || { wins: 0, total: 0 };
      current.total += 1;
      if (pred.result === 'win') current.wins += 1;
      dateGroups.set(dateKey, current);
    });

    // 获取最近7天
    const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'MM/dd'));
    
    let cumulativeWins = 0;
    let cumulativeTotal = 0;
    
    return days.map(date => {
      const dayData = dateGroups.get(date) || { wins: 0, total: 0 };
      cumulativeWins += dayData.wins;
      cumulativeTotal += dayData.total;
      const winRate = cumulativeTotal > 0 ? Math.round((cumulativeWins / cumulativeTotal) * 100) : 0;
      
      return {
        date,
        winRate,
        wins: dayData.wins,
        total: dayData.total,
      };
    });
  }, [predictions]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            胜率趋势
          </h3>
          <p className="text-xs text-muted-foreground mt-1">近7天累计胜率变化</p>
        </div>
      </div>
      <div className="p-4">
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}%`, '胜率']}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="winRate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#winRateGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// 玩家历史记录表格组件 - 类似AI历史模板
const PlayerHistoryTable = ({ predictions }: { predictions: Array<{
  id: string;
  match_id: string;
  prediction: string;
  result: string;
  bet_amount: number;
  actual_payout: number;
  created_at: string;
  match?: {
    fixture_id: number;
    home_team_name: string;
    away_team_name: string;
    home_logo?: string;
    away_logo?: string;
    league_name?: string;
    goals_home?: number;
    goals_away?: number;
  };
}> }) => {
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  // 过滤数据
  const filteredPredictions = useMemo(() => {
    let filtered = [...predictions];

    if (filterResult !== "all") {
      filtered = filtered.filter(p => 
        filterResult === "win" ? p.result === 'win' : p.result === 'loss'
      );
    }

    if (filterPeriod !== "all") {
      const now = new Date();
      const daysAgo = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
      const periodDate = subDays(now, daysAgo);
      filtered = filtered.filter(p => new Date(p.created_at) >= periodDate);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [predictions, filterResult, filterPeriod]);

  // 统计数据
  const totalPredictions = filteredPredictions.length;
  const winCount = filteredPredictions.filter(p => p.result === 'win').length;
  const lossCount = filteredPredictions.filter(p => p.result === 'loss').length;
  const winRate = totalPredictions > 0 ? ((winCount / totalPredictions) * 100).toFixed(1) : "0.0";
  const totalProfit = filteredPredictions.reduce((sum, p) => sum + (p.actual_payout - p.bet_amount), 0);

  return (
    <div className="space-y-4">
      {/* 筛选器 */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">筛选</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          >
            <option value="all">全部结果</option>
            <option value="win">命中</option>
            <option value="loss">未中</option>
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          >
            <option value="all">全部时间</option>
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
            <option value="90d">近90天</option>
          </select>
        </div>

        {/* 统计摘要 */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold font-mono text-foreground">{totalPredictions}</p>
            <p className="text-xs text-muted-foreground">总计</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-mono text-success">{winCount}</p>
            <p className="text-xs text-muted-foreground">命中</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-mono text-destructive">{lossCount}</p>
            <p className="text-xs text-muted-foreground">未中</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold font-mono ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">盈亏</p>
          </div>
        </div>
      </div>

      {/* 历史记录表格 */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">日期</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">比赛</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">预测</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">投注</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">盈亏</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">结果</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    暂无记录
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((pred) => {
                  const profit = pred.actual_payout - pred.bet_amount;
                  
                  return (
                    <tr key={pred.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(pred.created_at), 'MM-dd')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          {pred.match?.home_logo && (
                            <img src={pred.match.home_logo} alt="" className="w-4 h-4 object-contain" />
                          )}
                          <span className="text-xs text-foreground truncate max-w-[80px]">
                            {pred.match?.home_team_name || '主队'}
                          </span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-xs text-foreground truncate max-w-[80px]">
                            {pred.match?.away_team_name || '客队'}
                          </span>
                          {pred.match?.away_logo && (
                            <img src={pred.match.away_logo} alt="" className="w-4 h-4 object-contain" />
                          )}
                        </div>
                        {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined && (
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {pred.match.goals_home} : {pred.match.goals_away}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground">
                        {pred.prediction}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-mono text-muted-foreground">
                        ${pred.bet_amount}
                      </td>
                      <td className={`py-3 px-4 text-right text-xs font-mono font-bold ${
                        profit >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {profit >= 0 ? '+' : ''}{profit.toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pred.result === 'win' ? (
                          <CheckCircle2 className="h-4 w-4 text-success inline-block" />
                        ) : pred.result === 'loss' ? (
                          <XCircle className="h-4 w-4 text-destructive inline-block" />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MyPredictions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchesMap, setMatchesMap] = useState<Map<string, MatchInfo>>(new Map());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copyTradeRecords, setCopyTradeRecords] = useState<CopyTradeRecord[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!user) {
        // 模拟登录后的数据，用于演示
        setUserProfile({
          display_name: "QuickTiger1234",
          avatar_url: "/avatars/avatar-1.png"
        });
        setEditDisplayName("QuickTiger1234");
        setSelectedAvatar("/avatars/avatar-1.png");
        
        // 模拟比赛数据
        const mockMatches = new Map<string, MatchInfo>();
        mockMatches.set("m1", {
          fixture_id: 1,
          home_team_name: "曼联",
          away_team_name: "利物浦",
          home_logo: "/src/assets/team-manchester-united.png",
          away_logo: "/src/assets/team-liverpool.png",
          league_name: "英超",
          goals_home: 2,
          goals_away: 1
        });
        mockMatches.set("m2", {
          fixture_id: 2,
          home_team_name: "巴塞罗那",
          away_team_name: "皇家马德里",
          home_logo: "/src/assets/team-barcelona.png",
          away_logo: "/src/assets/team-real-madrid.png",
          league_name: "西甲",
          goals_home: 3,
          goals_away: 2
        });
        mockMatches.set("m3", {
          fixture_id: 3,
          home_team_name: "拜仁",
          away_team_name: "多特蒙德",
          home_logo: "/src/assets/team-bayern.png",
          away_logo: "/src/assets/team-dortmund.png",
          league_name: "德甲",
          goals_home: 1,
          goals_away: 1
        });
        mockMatches.set("m4", {
          fixture_id: 4,
          home_team_name: "巴黎圣日耳曼",
          away_team_name: "马赛",
          home_logo: "/src/assets/team-psg.png",
          away_logo: "/src/assets/team-marseille.png",
          league_name: "法甲",
          goals_home: 0,
          goals_away: 2
        });
        setMatchesMap(mockMatches);
        
        setStats({
          totalPredictions: 15,
          correctPredictions: 10,
          winRate: 66.67,
          balance: 12500,
          profit: 2500,
          recentPredictions: [
            {
              id: "1",
              match_id: "m1",
              prediction: "主队胜",
              result: "win",
              bet_amount: 500,
              actual_payout: 950,
              created_at: new Date().toISOString(),
              match: mockMatches.get("m1")
            },
            {
              id: "2",
              match_id: "m2",
              prediction: "大球 2.5",
              result: "win",
              bet_amount: 300,
              actual_payout: 600,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              match: mockMatches.get("m2")
            },
            {
              id: "3",
              match_id: "m3",
              prediction: "平局",
              result: "loss",
              bet_amount: 400,
              actual_payout: 0,
              created_at: new Date(Date.now() - 172800000).toISOString(),
              match: mockMatches.get("m3")
            },
            {
              id: "4",
              match_id: "m4",
              prediction: "客队胜",
              result: "win",
              bet_amount: 600,
              actual_payout: 1200,
              created_at: new Date(Date.now() - 259200000).toISOString(),
              match: mockMatches.get("m4")
            }
          ]
        });
        
        // 模拟跟单记录
        setCopyTradeRecords([
          {
            id: "ct1",
            followed_player_id: "p1",
            followed_player_name: "GoldenAce7788",
            followed_player_avatar: "/avatars/avatar-3.png",
            match_id: "m1",
            match_home_team: "曼联",
            match_away_team: "利物浦",
            prediction: "主队胜",
            bet_amount: 200,
            result: 'win',
            pnl: 180,
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: "ct2",
            followed_player_id: "p2",
            followed_player_name: "LuckyDragon9999",
            followed_player_avatar: "/avatars/avatar-5.png",
            match_id: "m2",
            match_home_team: "巴塞罗那",
            match_away_team: "皇家马德里",
            prediction: "大球 2.5",
            bet_amount: 300,
            result: 'loss',
            pnl: -300,
            created_at: new Date(Date.now() - 172800000).toISOString()
          },
          {
            id: "ct3",
            followed_player_id: "p1",
            followed_player_name: "GoldenAce7788",
            followed_player_avatar: "/avatars/avatar-3.png",
            match_id: "m3",
            match_home_team: "拜仁",
            match_away_team: "多特蒙德",
            prediction: "平局",
            bet_amount: 150,
            result: 'win',
            pnl: 270,
            created_at: new Date(Date.now() - 259200000).toISOString()
          }
        ]);
        
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;

        // 获取用户资料
        const { data: profileData } = await supabase
          .from('users')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
          setEditDisplayName(profileData.display_name || '');
          setSelectedAvatar(profileData.avatar_url || '');
        }

        // 获取余额
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        // 如果查询出错且不是"无记录"错误，记录错误
        if (balanceError && balanceError.code !== 'PGRST116') {
          console.error('Error fetching balance:', balanceError);
        }

        // 获取预测记录
        const { data: predictionsData } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        // 获取所有唯一的 match_id
        const matchIds = [...new Set(predictionsData?.map(p => p.match_id).filter(Boolean) || [])];
        
        // 获取比赛详情
        const matchesDataMap = new Map<string, MatchInfo>();
        if (matchIds.length > 0) {
          const { data: matchesData } = await supabase
            .from('daily_matches' as any)
            .select('fixture_id, home_team_name, away_team_name, home_logo, away_logo, league_name, goals_home, goals_away')
            .in('fixture_id', matchIds.map(id => parseInt(id)));
          
          if (matchesData) {
            matchesData.forEach((match: any) => {
              matchesDataMap.set(match.fixture_id.toString(), match as MatchInfo);
            });
          }
        }
        setMatchesMap(matchesDataMap);

        const totalPredictions = predictionsData?.length || 0;
        const correctPredictions = predictionsData?.filter(p => p.result === 'win').length || 0;
        const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
        const balance = balanceData?.balance ?? INITIAL_BALANCE;
        const profit = balance - INITIAL_BALANCE;

        // 关联比赛信息到预测记录
        const predictionsWithMatches = predictionsData?.map(pred => ({
          ...pred,
          match: matchesDataMap.get(pred.match_id)
        })) || [];

        setStats({
          totalPredictions,
          correctPredictions,
          winRate,
          balance,
          profit,
          recentPredictions: predictionsWithMatches
        });
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) {
      // 演示模式：模拟保存
      setUserProfile({
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
      });
      setIsEditDialogOpen(false);
      toast.success("演示模式：个人资料已更新！");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editDisplayName,
          avatar_url: selectedAvatar,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUserProfile({
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
      });
      
      setIsEditDialogOpen(false);
      toast.success("个人资料已更新！");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("更新失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user && !stats) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">登录后查看您的预测统计</p>
          <Button onClick={() => navigate('/auth')}>
            立即登录
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            我的预测
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">您还没有任何预测记录</p>
          <Button onClick={() => navigate('/')}>
            开始预测
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>返回</span>
      </Button>

      {/* 用户资料卡片 - 专业简洁设计 */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* 顶部用户信息 */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-primary/30">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || '用户'} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                    {userProfile?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                {/* 编辑按钮 */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="outline"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background shadow-sm"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>编辑个人资料</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="display-name">昵称</Label>
                        <Input
                          id="display-name"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          placeholder="输入你的昵称"
                          maxLength={20}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label>选择头像</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {AVATAR_OPTIONS.map((avatar) => (
                            <button
                              key={avatar}
                              onClick={() => setSelectedAvatar(avatar)}
                              className={`
                                relative rounded-lg p-2 transition-all
                                ${selectedAvatar === avatar 
                                  ? 'ring-2 ring-primary bg-primary/10' 
                                  : 'hover:bg-muted border border-border'
                                }
                              `}
                            >
                              <Avatar className="h-16 w-16 mx-auto">
                                <AvatarImage src={avatar} />
                              </Avatar>
                              {selectedAvatar === avatar && (
                                <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        取消
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSaveProfile}
                        disabled={isSaving || !editDisplayName || !editDisplayName.trim()}
                      >
                        {isSaving ? "保存中..." : "保存"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {userProfile?.display_name || '玩家'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">预测玩家</p>
              </div>
            </div>
            
            {/* 胜率徽章 */}
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground font-mono">
                <AnimatedWinRate value={stats?.winRate || 0} />%
              </div>
              <p className="text-xs text-muted-foreground">胜率</p>
            </div>
          </div>
        </div>

        {/* 统计数据网格 */}
        <div className="grid grid-cols-4 divide-x divide-border">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{stats?.totalPredictions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">总预测</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-success font-mono">{stats?.correctPredictions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">命中</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive font-mono">
              {(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">未中</p>
          </div>
          <div className="p-4 text-center">
            <p className={`text-2xl font-bold font-mono ${(stats?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {(stats?.profit || 0) >= 0 ? '+' : ''}{stats?.profit?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">盈亏</p>
          </div>
        </div>

        {/* 钱包余额 */}
        <div className="p-4 bg-muted/30 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">虚拟钱包余额</p>
                <p className="text-xl font-bold text-foreground font-mono">
                  ${stats?.balance?.toLocaleString() || 10000}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              开始预测
            </Button>
          </div>
        </div>
      </div>

      {/* 胜率趋势图表 */}
      <WinRateTrendChart predictions={stats?.recentPredictions || []} />

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="history" className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">完整</span>历史
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            近期
          </TabsTrigger>
          <TabsTrigger value="copy-trade" className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            跟单
          </TabsTrigger>
        </TabsList>

        {/* 完整历史记录标签页 - 类似AI历史模板 */}
        <TabsContent value="history" className="mt-4">
          <PlayerHistoryTable predictions={stats?.recentPredictions || []} />
        </TabsContent>

        {/* 近期购买记录标签页 */}
        <TabsContent value="recent" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">近期记录</h3>
              <p className="text-xs text-muted-foreground mt-1">最近10条预测</p>
            </div>
            <div className="divide-y divide-border">
              {stats?.recentPredictions && stats.recentPredictions.length > 0 ? (
                stats.recentPredictions.slice(0, 10).map((pred) => (
                  <div key={pred.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(pred.created_at), 'MM-dd HH:mm')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        pred.result === 'win' 
                          ? 'bg-success/10 text-success' 
                          : pred.result === 'loss'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {pred.result === 'win' ? '胜' : pred.result === 'loss' ? '负' : '进行中'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground text-sm">
                        {pred.match?.home_team_name || '主队'} vs {pred.match?.away_team_name || '客队'}
                      </span>
                      {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined && (
                        <span className="text-sm font-mono text-muted-foreground">
                          {pred.match.goals_home} : {pred.match.goals_away}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        预测: <span className="text-foreground">{pred.prediction}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-mono text-xs">
                          ${pred.bet_amount}
                        </span>
                        <span className={`font-bold font-mono ${
                          pred.result === 'win' ? 'text-success' : 'text-destructive'
                        }`}>
                          {pred.result === 'win' ? '+' : ''}{(pred.actual_payout - pred.bet_amount).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  暂无记录
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 跟单记录标签页 */}
        <TabsContent value="copy-trade" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">跟单记录</h3>
              <p className="text-xs text-muted-foreground mt-1">您跟随其他玩家的预测</p>
            </div>
            
            {copyTradeRecords.length > 0 ? (
              <>
                {/* 跟单统计 - 更清晰的数据展示 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold font-mono text-foreground">{copyTradeRecords.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">跟单次数</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      ${copyTradeRecords.reduce((sum, r) => sum + r.bet_amount, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">总投入</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold font-mono text-success">
                      ${copyTradeRecords.filter(r => r.result === 'win').reduce((sum, r) => sum + r.bet_amount + r.pnl, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">赢得金额</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className={`text-2xl font-bold font-mono ${
                      copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 ? '+' : ''}
                      ${copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">净盈亏</p>
                  </div>
                </div>

                {/* 跟单列表 - 表格形式更清晰 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">跟单对象</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">比赛</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">跟注金额</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs">盈亏</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs">结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {copyTradeRecords.map((record) => (
                        <tr key={record.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 border border-border">
                                <AvatarImage src={record.followed_player_avatar} />
                                <AvatarFallback className="text-xs">{record.followed_player_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-medium text-foreground truncate max-w-[100px]">{record.followed_player_name}</p>
                                <p className="text-[10px] text-muted-foreground">{format(new Date(record.created_at), 'MM-dd')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-foreground">{record.match_home_team} vs {record.match_away_team}</p>
                            <p className="text-[10px] text-muted-foreground">{record.prediction}</p>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <p className="text-sm font-mono font-bold text-foreground">${record.bet_amount}</p>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <p className={`text-sm font-mono font-bold ${
                              record.pnl >= 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {record.pnl >= 0 ? '+' : ''}${record.pnl}
                            </p>
                            {record.result === 'win' && (
                              <p className="text-[10px] text-success">赢 ${record.bet_amount + record.pnl}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {record.result === 'win' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                                <CheckCircle2 className="h-3 w-3" />
                                胜
                              </span>
                            ) : record.result === 'loss' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                <XCircle className="h-3 w-3" />
                                负
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">进行中</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-1">暂无跟单记录</p>
                <p className="text-xs text-muted-foreground mb-4">前往排行榜跟单其他玩家</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/leaderboard')}>
                  查看排行榜
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyPredictions;

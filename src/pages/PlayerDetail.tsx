import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import CryptoTicker from "@/components/CryptoTicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { pastMatches, upcomingMatches } from "@/data/mockData";
import { ArrowLeft, Trophy, TrendingUp, Target, Calendar, CheckCircle2, XCircle, Filter } from "lucide-react";
import { AnimatedWinRate } from "@/components/AnimatedWinRate";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlayerData {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  changePercent: number;
  rank: number;
}

interface PredictionHistory {
  id: string;
  match_id: string;
  prediction_type: string;
  prediction: string;
  result: string;
  bet_amount: number;
  actual_payout: number;
  created_at: string;
}

const PlayerDetail = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [predictions, setPredictions] = useState<PredictionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  
  // 合并所有比赛数据用于查找
  const allMatches = [...pastMatches, ...upcomingMatches];

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerId) return;
      
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;
        
        // 检查是否是虚拟玩家
        const virtualPlayer = virtualPlayers.find(p => p.id === playerId);
        
        if (virtualPlayer) {
          // 虚拟玩家使用模拟数据
          setPlayer({
            ...virtualPlayer,
            rank: 1 // 临时值
          });
          
          // 生成虚拟预测历史
          const mockPredictions: PredictionHistory[] = Array.from({ length: virtualPlayer.totalPredictions }, (_, i) => ({
            id: `virtual-pred-${i}`,
            match_id: `match-${i}`,
            prediction_type: ['moneyline', 'handicap', 'over_under'][Math.floor(Math.random() * 3)],
            prediction: ['home', 'away', 'over', 'under'][Math.floor(Math.random() * 4)],
            result: i < virtualPlayer.correctPredictions ? 'win' : 'loss',
            bet_amount: 100 + Math.random() * 400,
            actual_payout: i < virtualPlayer.correctPredictions ? (100 + Math.random() * 400) * 1.8 : 0,
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          }));
          setPredictions(mockPredictions);
        } else {
          // 真实玩家从数据库获取
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .eq('id', playerId)
            .single();
          
          if (userError) throw userError;
          if (!userData) {
            navigate('/leaderboard');
            return;
          }
          
          // 获取余额
          const { data: balanceData } = await supabase
            .from('user_balances')
            .select('balance')
            .eq('user_id', playerId)
            .single();
          
          // 获取预测记录
          const { data: predictionsData } = await supabase
            .from('user_predictions')
            .select('*')
            .eq('user_id', playerId)
            .order('created_at', { ascending: false });
          
          const totalPredictions = predictionsData?.length || 0;
          const correctPredictions = predictionsData?.filter(p => p.result === 'win').length || 0;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          
          const balance = balanceData?.balance || INITIAL_BALANCE;
          const profit = balance - INITIAL_BALANCE;
          const changePercent = (profit / INITIAL_BALANCE) * 100;
          
          setPlayer({
            id: userData.id,
            displayName: userData.display_name,
            avatarUrl: userData.avatar_url,
            totalPredictions,
            correctPredictions,
            winRate,
            balance,
            profit,
            changePercent,
            rank: 0
          });
          
          setPredictions(predictionsData || []);
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
        navigate('/leaderboard');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlayerData();
  }, [playerId, navigate]);

  if (isLoading || !player) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <CryptoTicker />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  // 过滤预测数据
  let filteredPredictions = [...predictions];

  if (filterResult !== "all") {
    filteredPredictions = filteredPredictions.filter(p => 
      filterResult === "win" ? p.result === 'win' : p.result === 'loss'
    );
  }

  if (filterPeriod !== "all") {
    const now = new Date();
    const daysAgo = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - daysAgo);
    filteredPredictions = filteredPredictions.filter(p => 
      new Date(p.created_at) >= periodDate
    );
  }

  // 计算胜率走势数据
  const winRateTrend = predictions.reduce((acc: any[], pred, index) => {
    const wins = predictions.slice(index).filter(p => p.result === 'win').length;
    const total = predictions.length - index;
    const rate = total > 0 ? (wins / total) * 100 : 0;
    
    if (index % Math.ceil(predictions.length / 10) === 0) {
      acc.push({
        date: new Date(pred.created_at).toLocaleDateString(),
        winRate: parseFloat(rate.toFixed(1))
      });
    }
    return acc;
  }, []).reverse();

  // 预测类型统计
  const predictionTypeStats = predictions.reduce((acc: any, pred) => {
    const type = pred.prediction_type;
    if (!acc[type]) {
      acc[type] = { total: 0, wins: 0 };
    }
    acc[type].total++;
    if (pred.result === 'win') acc[type].wins++;
    return acc;
  }, {});

  const typeChartData = Object.entries(predictionTypeStats).map(([type, stats]: [string, any]) => ({
    name: type === 'moneyline' ? '独赢' : type === 'handicap' ? '让分盘' : '大小球',
    winRate: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0,
    total: stats.total
  }));

  // 收益走势
  const profitTrend = predictions.reduce((acc: any[], pred, index) => {
    const prevProfit = acc.length > 0 ? acc[acc.length - 1].profit : 0;
    const change = pred.result === 'win' 
      ? (pred.actual_payout || 0) - pred.bet_amount 
      : -pred.bet_amount;
    
    if (index % Math.ceil(predictions.length / 15) === 0 || index === predictions.length - 1) {
      acc.push({
        date: new Date(pred.created_at).toLocaleDateString(),
        profit: parseFloat((prevProfit + change).toFixed(2))
      });
    }
    return acc;
  }, []).reverse();

  const COLORS = ['hsl(var(--success))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  const getRankColor = (rank: number) => {
    switch(rank) {
      case 1:
        return 'hsl(45 100% 51%)';
      case 2:
        return 'hsl(0 0% 75%)';
      case 3:
        return 'hsl(30 60% 50%)';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      <CryptoTicker />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 safe-area-padding">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>

        {/* 玩家基本信息 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="w-24 h-24 border-4" style={{ borderColor: player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--border))' }}>
                <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                <AvatarFallback className="text-3xl">{player.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">{player.displayName}</h1>
                  {player.rank <= 3 && (
                    <Trophy className="h-6 w-6" style={{ color: getRankColor(player.rank) }} fill={getRankColor(player.rank)} />
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">胜率</p>
                    <AnimatedWinRate 
                      value={player.winRate}
                      className="text-2xl font-bold font-mono-data"
                      style={{ color: player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--foreground))' }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">总预测</p>
                    <p className="text-2xl font-bold font-mono-data">{player.totalPredictions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">余额</p>
                    <p className="text-2xl font-bold font-mono-data text-foreground/90">
                      ${player.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">收益</p>
                    <p className={`text-2xl font-bold font-mono-data ${player.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {player.profit >= 0 ? '+' : ''}{player.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 胜率走势图 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              胜率走势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={winRateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="winRate" 
                  stroke={player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--primary))'} 
                  strokeWidth={2}
                  dot={{ fill: player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 预测类型分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                预测类型分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="winRate" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {typeChartData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-mono-data">
                      {item.total} 次预测 · {item.winRate}% 胜率
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 收益走势 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                收益走势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={profitTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke={player.profit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                    strokeWidth={2}
                    dot={{ fill: player.profit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 历史记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>历史记录</span>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 筛选器 */}
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <Select value={filterResult} onValueChange={setFilterResult}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="结果" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部结果</SelectItem>
                    <SelectItem value="win">胜</SelectItem>
                    <SelectItem value="loss">负</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="时间段" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时间</SelectItem>
                    <SelectItem value="7d">最近7天</SelectItem>
                    <SelectItem value="30d">最近30天</SelectItem>
                    <SelectItem value="90d">最近90天</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border/50 flex items-center justify-between">
                <span>记录数:</span>
                <span className="font-bold">{filteredPredictions.length}</span>
              </div>
            </div>

            {/* 滚动提示 - 仅移动端显示 */}
            <div className="sm:hidden bg-muted/30 px-3 py-2 rounded-lg mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">左右滑动查看更多</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '75ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '150ms' }} />
              </div>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 font-bold">日期</TableHead>
                    <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 font-bold min-w-[180px]">比赛对阵</TableHead>
                    <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 font-bold">类型</TableHead>
                    <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 font-bold">预测</TableHead>
                    <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 font-bold">下注</TableHead>
                    <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 font-bold">盈亏</TableHead>
                    <TableHead className="text-center text-[11px] sm:text-xs px-2 sm:px-4 font-bold">结果</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPredictions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                        暂无历史记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPredictions.map((pred) => {
                      const match = allMatches.find(m => m.id === pred.match_id);
                      return (
                        <TableRow 
                          key={pred.id}
                          className="hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => {
                            if (pred.match_id) {
                              navigate(`/match/${pred.match_id}`);
                            }
                          }}
                          title={pred.match_id ? "点击查看比赛详情" : ""}
                        >
                          <TableCell className="text-[11px] sm:text-sm px-2 sm:px-4 py-3">
                            {new Date(pred.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-[11px] sm:text-sm px-2 sm:px-4">
                            {match ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
                                  <span className="font-medium">{match.homeTeamZh || match.homeTeam}</span>
                                  {match.homeScore !== undefined && match.awayScore !== undefined && (
                                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded font-bold">
                                      {match.homeScore} - {match.awayScore}
                                    </span>
                                  )}
                                  <span className="font-medium">{match.awayTeamZh || match.awayTeam}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {match.leagueZh || match.league}
                                </div>
                              </div>
                            ) : (
                              <div className="truncate max-w-[120px] group-hover:text-primary transition-colors">
                                比赛 #{pred.match_id.substring(0, 8)}
                              </div>
                            )}
                          </TableCell>
                        <TableCell className="text-[11px] sm:text-sm px-2 sm:px-4">
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            {pred.prediction_type === 'moneyline' ? '独赢' : pred.prediction_type === 'handicap' ? '让分盘' : '大小球'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] sm:text-sm px-2 sm:px-4">
                          <span className="truncate max-w-[100px] inline-block">
                            {pred.prediction}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-[11px] sm:text-sm px-2 sm:px-4 font-mono-data">
                          ${pred.bet_amount.toFixed(0)}
                        </TableCell>
                        <TableCell className={`text-right text-[11px] sm:text-sm px-2 sm:px-4 font-mono-data font-semibold ${
                          pred.result === 'win' ? 'text-success' : 'text-destructive'
                        }`}>
                          {pred.result === 'win' ? '+' : '-'}${Math.abs((pred.actual_payout || 0) - pred.bet_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center px-2 sm:px-4">
                          {pred.result === 'win' ? (
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success inline" />
                          ) : (
                            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive inline" />
                          )}
                        </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerDetail;

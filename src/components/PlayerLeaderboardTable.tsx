import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Trophy, Crown, TrendingUp } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

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

const PlayerLeaderboardTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;
        
        // 将虚拟玩家转换为 PlayerData 格式
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player, index) => ({
          ...player,
          rank: index + 1
        }));
        
        // 获取所有用户的基本信息
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url');
        
        if (usersError) throw usersError;
        
        // 如果没有真实用户或获取失败，只使用虚拟玩家
        if (!usersData || usersData.length === 0) {
          setAllPlayers(virtualPlayersData);
          return;
        }
        
        // 获取所有用户的余额信息
        const { data: balancesData, error: balancesError } = await supabase
          .from('user_balances')
          .select('user_id, balance');
        
        if (balancesError) throw balancesError;
        
        // 获取所有用户的预测统计
        const { data: predictionsData, error: predictionsError } = await supabase
          .from('user_predictions')
          .select('user_id, result');
        
        if (predictionsError) throw predictionsError;
        
        // 创建映射
        const balancesMap = new Map(balancesData?.map(b => [b.user_id, b.balance]) || []);
        
        // 计算每个用户的统计数据
        const realPlayerStats = usersData.map(user => {
          const userPredictions = predictionsData?.filter(p => p.user_id === user.id) || [];
          const totalPredictions = userPredictions.length;
          const correctPredictions = userPredictions.filter(p => p.result === 'win').length;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          
          const balance = balancesMap.get(user.id) || INITIAL_BALANCE;
          const profit = balance - INITIAL_BALANCE;
          const changePercent = (profit / INITIAL_BALANCE) * 100;
          
          return {
            id: user.id,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            totalPredictions,
            correctPredictions,
            winRate,
            balance,
            profit,
            changePercent,
            rank: 0
          };
        }).filter(player => player.totalPredictions > 0); // 只保留有预测记录的玩家
        
        // 合并真实玩家和虚拟玩家
        const combined = [...virtualPlayersData, ...realPlayerStats];
        
        // 按胜率排序并设置排名
        const sortedPlayers = combined
          .sort((a, b) => b.winRate - a.winRate)
          .map((player, index) => ({
            ...player,
            rank: index + 1
          }));
        
        setAllPlayers(sortedPlayers);
      } catch (error) {
        console.error('Error fetching all players:', error);
        // 出错时使用虚拟玩家
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player, index) => ({
          ...player,
          rank: index + 1
        }));
        setAllPlayers(virtualPlayersData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllPlayers();
    
    // 订阅用户预测和余额变化，实时更新排名
    const predictionsChannel = supabase
      .channel('all-players-predictions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_predictions',
        },
        () => {
          console.log('User predictions changed, refreshing all players');
          fetchAllPlayers();
        }
      )
      .subscribe();
    
    const balancesChannel = supabase
      .channel('all-players-balances')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
        },
        () => {
          console.log('User balances changed, refreshing all players');
          fetchAllPlayers();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(predictionsChannel);
      supabase.removeChannel(balancesChannel);
    };
  }, []);

  const getRankColor = (rank: number) => {
    switch(rank) {
      case 1:
        return 'hsl(45 100% 51%)'; // Gold
      case 2:
        return 'hsl(0 0% 75%)'; // Silver
      case 3:
        return 'hsl(30 60% 50%)'; // Bronze
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const formatProfit = (profit: number) => {
    return profit >= 0 
      ? `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 获取前6名玩家数据用于条形图
  const top6Players = allPlayers.slice(0, 6);
  const winner = allPlayers[0];

  const chartData = top6Players.map(player => ({
    name: player.displayName,
    winRate: player.winRate,
    profit: player.profit,
    rank: player.rank,
  }));

  return (
    <div className="space-y-6">
      {/* 获胜玩家和前6名对比 */}
      {!isLoading && allPlayers.length > 0 && winner && (
        <>
          {/* 获胜玩家展示 */}
          <Card className="border-2 bg-gradient-to-br from-yellow-500/10 via-background to-background" style={{ borderColor: getRankColor(1) }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Crown className="h-6 w-6" style={{ color: getRankColor(1) }} fill={getRankColor(1)} />
                当前冠军
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg bg-card/50 cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => navigate(`/player/${winner.id}`)}
              >
                <Avatar className="w-20 h-20 border-4" style={{ borderColor: getRankColor(1) }}>
                  <AvatarImage src={winner.avatarUrl} alt={winner.displayName} />
                  <AvatarFallback className="text-2xl">{winner.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-bold mb-2">{winner.displayName}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">胜率</p>
                      <p className="text-xl font-bold font-mono-data" style={{ color: getRankColor(1) }}>
                        {winner.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">总预测</p>
                      <p className="text-xl font-bold font-mono-data">{winner.totalPredictions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">余额</p>
                      <p className="text-xl font-bold font-mono-data">
                        ${winner.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">收益</p>
                      <p className="text-xl font-bold font-mono-data text-success">
                        +${winner.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 前6名玩家胜率对比 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                前6名玩家胜率对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '11px' }}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '12px' }}
                    label={{ value: '胜率 (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '胜率']}
                  />
                  <Bar 
                    dataKey="winRate" 
                    radius={[8, 8, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getRankColor(entry.rank)}
                        opacity={entry.rank <= 3 ? 1 : 0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 前6名玩家收益对比 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                前6名玩家收益对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '11px' }}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '12px' }}
                    label={{ value: '收益 ($)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [
                      `${value >= 0 ? '+' : ''}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                      '收益'
                    ]}
                  />
                  <Bar 
                    dataKey="profit" 
                    radius={[8, 8, 0, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.profit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                        opacity={entry.rank <= 3 ? 1 : 0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
      <Card className="border-border/50 bg-card/95 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          {/* 滚动提示 - 仅移动端显示 */}
          <div className="sm:hidden bg-muted/30 px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('swipe_to_view_more')}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse delay-150" />
            </div>
          </div>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent bg-muted/30">
                    <TableHead className="w-8 sm:w-12 py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase text-center">#</TableHead>
                    <TableHead className="py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase min-w-[150px] sm:min-w-0">{t('player')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">
                      <div className="flex items-center justify-center gap-1">
                        {t('win_rate')} <ArrowDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('predictions')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('correct')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('wrong')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('balance')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('profit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('loading')}...
                      </TableCell>
                    </TableRow>
                  ) : allPlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('no_data')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allPlayers.map((player) => (
                      <TableRow 
                        key={player.id}
                        className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer"
                        onClick={() => navigate(`/player/${player.id}`)}
                      >
                        <TableCell className="py-2 sm:py-3 text-center">
                          <div className="flex items-center justify-center">
                            {player.rank <= 3 ? (
                              <Trophy 
                                className="h-4 w-4 sm:h-5 sm:w-5" 
                                style={{ color: getRankColor(player.rank) }}
                                fill={getRankColor(player.rank)}
                              />
                            ) : (
                              <span className="font-bold text-xs sm:text-sm text-muted-foreground">{player.rank}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 sm:py-3">
                          <div className="flex items-center gap-1.5 sm:gap-2.5">
                            <Avatar className="w-6 h-6 sm:w-8 sm:h-8 border" style={{ borderColor: player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--border))' }}>
                              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                              <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-xs sm:text-sm truncate">{player.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <AnimatedWinRate 
                            value={player.winRate}
                            className="font-mono-data font-bold text-sm sm:text-base"
                            style={{ color: player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--foreground))' }}
                          />
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className="font-mono-data text-xs sm:text-sm text-muted-foreground">
                            {player.totalPredictions}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className="font-mono-data font-semibold text-xs sm:text-sm text-success">
                            {player.correctPredictions}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className="font-mono-data font-semibold text-xs sm:text-sm text-destructive">
                            {player.totalPredictions - player.correctPredictions}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className="font-mono-data text-xs sm:text-sm text-foreground/80">
                            ${player.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className={`font-mono-data font-semibold text-xs sm:text-sm ${player.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatProfit(player.profit)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerLeaderboardTable;

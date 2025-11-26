import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowDown, Trophy, Crown, Heart } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import grassTexture from "@/assets/grass-texture.jpg";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  bestStreak?: number;
  currentStreak?: number;
  avgConfidence?: number;
}

const PlayerLeaderboardTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followedPlayers, setFollowedPlayers] = useState<Set<string>>(new Set());

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
          .select('user_id, result, confidence');
        
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
          
          // 计算连胜和平均信心度
          let currentStreak = 0;
          let bestStreak = 0;
          let tempStreak = 0;
          let totalConfidence = 0;
          
          userPredictions.forEach(pred => {
            if (pred.result === 'win') {
              tempStreak++;
              bestStreak = Math.max(bestStreak, tempStreak);
            } else if (pred.result === 'loss') {
              tempStreak = 0;
            }
          });
          
          // 最后一次连胜
          for (let i = userPredictions.length - 1; i >= 0; i--) {
            if (userPredictions[i].result === 'win') {
              currentStreak++;
            } else {
              break;
            }
          }
          
          // 计算平均信心度
          const confidenceSum = userPredictions.reduce((sum, pred) => {
            return sum + (pred.confidence || 50);
          }, 0);
          const avgConfidence = totalPredictions > 0 ? confidenceSum / totalPredictions : 0;
          
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
            rank: 0,
            bestStreak,
            currentStreak,
            avgConfidence
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
    
    // 从本地存储加载关注列表
    const savedFollows = localStorage.getItem('followedPlayers');
    if (savedFollows) {
      setFollowedPlayers(new Set(JSON.parse(savedFollows)));
    }
    
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

  const handleFollowToggle = (playerId: string, playerName: string) => {
    const newFollows = new Set(followedPlayers);
    
    if (newFollows.has(playerId)) {
      newFollows.delete(playerId);
      toast.success(`已取消关注 ${playerName}`);
    } else {
      newFollows.add(playerId);
      toast.success(`已关注 ${playerName}`);
    }
    
    setFollowedPlayers(newFollows);
    localStorage.setItem('followedPlayers', JSON.stringify(Array.from(newFollows)));
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
      {/* 前三名玩家展示 */}
      {!isLoading && allPlayers.length >= 3 && (
        <>
          {/* 前三名人物卡 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {allPlayers.slice(0, 3).map((player, index) => {
              const rank = index + 1;
              const getMedalConfig = () => {
                switch(rank) {
                  case 1:
                    return {
                      icon: Crown,
                      color: 'from-yellow-400 via-yellow-500 to-amber-600',
                      bgGradient: 'from-yellow-500/80 via-yellow-600/70 to-amber-700/80',
                      borderColor: 'border-yellow-400/60',
                      glowColor: 'shadow-[0_0_30px_rgba(251,191,36,0.5)]',
                      label: '冠军'
                    };
                  case 2:
                    return {
                      icon: Trophy,
                      color: 'from-gray-300 via-gray-400 to-gray-500',
                      bgGradient: 'from-gray-400/70 via-gray-500/60 to-gray-600/70',
                      borderColor: 'border-gray-300/60',
                      glowColor: 'shadow-[0_0_30px_rgba(156,163,175,0.5)]',
                      label: '亚军'
                    };
                  case 3:
                    return {
                      icon: Trophy,
                      color: 'from-orange-400 via-amber-600 to-orange-700',
                      bgGradient: 'from-orange-500/70 via-amber-600/60 to-orange-700/70',
                      borderColor: 'border-orange-400/60',
                      glowColor: 'shadow-[0_0_30px_rgba(251,146,60,0.5)]',
                      label: '季军'
                    };
                  default:
                    return {
                      icon: Trophy,
                      color: 'from-gray-400 to-gray-500',
                      bgGradient: 'from-gray-500/50 to-gray-600/50',
                      borderColor: 'border-gray-400/40',
                      glowColor: '',
                      label: ''
                    };
                }
              };
              
              const config = getMedalConfig();
              const MedalIcon = config.icon;
              
              return (
                <Card key={player.id} className={`relative overflow-hidden ${config.glowColor} transition-all duration-300 hover:scale-105`}>
                  {/* 背景图片 */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${player.avatarUrl})` }}
                  />
                  
                  {/* 渐变覆盖层 */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient}`} />
                  
                  {/* 深色渐变提高文字可读性 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
                  
                  <CardContent className="p-4 sm:p-6 relative z-10">
                    {/* 顶部奖牌标签和关注按钮 */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.color} ${config.glowColor}`}>
                        <MedalIcon className="h-4 w-4 text-white" fill="white" />
                        <span className="text-xs font-bold text-white">{config.label}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={followedPlayers.has(player.id) ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowToggle(player.id, player.displayName);
                        }}
                        className={`
                          transition-all duration-300
                          ${followedPlayers.has(player.id) 
                            ? 'bg-white/20 hover:bg-white/30 border-white/40 text-white' 
                            : 'bg-white/10 hover:bg-white/20 border-white/30 text-white'
                          }
                        `}
                      >
                        <Heart 
                          className={`h-4 w-4 transition-all ${followedPlayers.has(player.id) ? 'fill-white' : ''}`}
                        />
                      </Button>
                    </div>

                    {/* 头像和名字 */}
                    <div 
                      className="flex flex-col items-center mb-4 sm:mb-6 cursor-pointer"
                      onClick={() => navigate(`/player/${player.id}`)}
                    >
                      <div className={`relative mb-3`}>
                        <Avatar className={`w-16 h-16 sm:w-20 sm:h-20 border-4 ${config.borderColor} ${config.glowColor}`}>
                          <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                          <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {/* 奖牌徽章悬浮在头像上方 */}
                        <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center ${config.glowColor} border-2 border-white`}>
                          <span className="text-white font-bold text-sm">{rank}</span>
                        </div>
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-white text-center">{player.displayName}</span>
                    </div>
                    
                    {/* 统计数据 */}
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-xs text-white/70 mb-1">{t('win_rate_label').toUpperCase()}</p>
                        <p className="text-2xl sm:text-3xl font-bold font-mono-data text-white">
                          <AnimatedWinRate 
                            value={player.winRate}
                            className="text-2xl sm:text-3xl font-bold font-mono-data text-white"
                          />
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-xs text-white/70 mb-1">{t('predictions').toUpperCase()}</p>
                          <p className="text-sm sm:text-base font-bold font-mono-data text-white">
                            {player.correctPredictions}/{player.totalPredictions}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-white/70 mb-1">{t('profit').toUpperCase()}</p>
                          <p className={`text-sm sm:text-base font-bold font-mono-data ${player.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatProfit(player.profit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 前6名玩家对比图 */}
          {allPlayers.length > 3 && (
            <Card className="relative overflow-hidden">
              {/* 草地纹理背景 */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{ 
                  backgroundImage: `url(${grassTexture})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {/* 深色覆盖层提高对比度 */}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/60" />
              
              <CardContent className="p-4 sm:p-6 relative z-10">
                <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  {t('top_players_comparison')}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
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
                      label={{ value: t('win_rate') + ' (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, t('win_rate')]}
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
          )}
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
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('best_streak')}</TableHead>
                    <TableHead className="text-center py-2 sm:py-2.5 text-muted-foreground font-medium text-[9px] sm:text-[10px] tracking-wider uppercase">{t('avg_confidence')}</TableHead>
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
                          <div className="relative w-full min-w-[100px]">
                            {/* 背景条形图 */}
                            <div 
                              className="absolute inset-0 rounded-sm opacity-20"
                              style={{ 
                                width: `${player.winRate}%`,
                                backgroundColor: player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--primary))'
                              }}
                            />
                            {/* 胜率文字 */}
                            <div className="relative z-10">
                              <AnimatedWinRate 
                                value={player.winRate}
                                className="font-mono-data font-bold text-sm sm:text-base"
                                style={{ color: player.rank <= 3 ? getRankColor(player.rank) : 'hsl(var(--foreground))' }}
                              />
                            </div>
                          </div>
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
                          <span className="font-mono-data text-xs sm:text-sm text-foreground/70">
                            +{player.bestStreak || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3">
                          <span className="font-mono-data text-xs sm:text-sm text-foreground/80">
                            {player.avgConfidence ? player.avgConfidence.toFixed(1) : '0.0'}%
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

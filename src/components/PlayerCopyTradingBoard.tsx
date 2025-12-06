import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Flame, Skull, UserPlus, Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  bestStreak: number;
  worstStreak: number;
  currentStreak: number;
  isVirtual?: boolean;
  todayTotal?: number;
  todayCorrect?: number;
  todayWinRate?: number;
}

interface TodayPrediction {
  id: string;
  match_id: string;
  prediction: string;
  prediction_type: string;
  bet_amount: number;
  potential_payout: number | null;
  actual_payout: number | null;
  result: string | null;
  created_at: string;
}

const PlayerCopyTradingBoard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<Map<string, { total: number; correct: number; winRate: number }>>(new Map());
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: PlayerData; predictions: TodayPrediction[] } | null>(null);

  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;
        
        // 将虚拟玩家转换为 PlayerData 格式
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player) => ({
          ...player,
          bestStreak: player.bestStreak || 0,
          worstStreak: player.worstStreak || 0,
          currentStreak: 0,
          isVirtual: true
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
          
          // 计算连胜/连败
          let bestStreak = 0;
          let tempStreak = 0;
          let worstStreak = 0;
          let lossStreak = 0;
          let currentStreak = 0;
          
          userPredictions.forEach(pred => {
            if (pred.result === 'win') {
              tempStreak++;
              bestStreak = Math.max(bestStreak, tempStreak);
              lossStreak = 0;
            } else if (pred.result === 'loss') {
              tempStreak = 0;
              lossStreak++;
              worstStreak = Math.max(worstStreak, lossStreak);
            }
          });
          
          // 计算当前连胜
          for (let i = userPredictions.length - 1; i >= 0; i--) {
            if (userPredictions[i].result === 'win') {
              currentStreak++;
            } else {
              break;
            }
          }
          
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
            bestStreak,
            worstStreak,
            currentStreak,
            isVirtual: false
          };
        }).filter(player => player.totalPredictions > 0);
        
        // 合并真实玩家和虚拟玩家
        const combined = [...virtualPlayersData, ...realPlayerStats];
        setAllPlayers(combined);
      } catch (error) {
        console.error('Error fetching all players:', error);
        const virtualPlayersData: PlayerData[] = virtualPlayers.map((player) => ({
          ...player,
          bestStreak: player.bestStreak || 0,
          worstStreak: player.worstStreak || 0,
          currentStreak: 0,
          isVirtual: true
        }));
        setAllPlayers(virtualPlayersData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllPlayers();
  }, []);

  // 获取今日预测统计
  useEffect(() => {
    const fetchTodayStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayPredictions, error } = await supabase
        .from('user_predictions')
        .select('user_id, result')
        .gte('created_at', today.toISOString());
      
      if (error || !todayPredictions) return;
      
      const statsMap = new Map<string, { total: number; correct: number; winRate: number }>();
      
      todayPredictions.forEach(pred => {
        const current = statsMap.get(pred.user_id) || { total: 0, correct: 0, winRate: 0 };
        current.total++;
        if (pred.result === 'win') current.correct++;
        current.winRate = current.total > 0 ? (current.correct / current.total) * 100 : 0;
        statsMap.set(pred.user_id, current);
      });
      
      // 为虚拟玩家生成模拟今日数据
      virtualPlayers.forEach(player => {
        const total = Math.floor(Math.random() * 8) + 3;
        const correct = Math.floor(total * (player.winRate / 100) + (Math.random() - 0.5) * 2);
        const actualCorrect = Math.max(0, Math.min(total, correct));
        statsMap.set(player.id, {
          total,
          correct: actualCorrect,
          winRate: total > 0 ? (actualCorrect / total) * 100 : 0
        });
      });
      
      setTodayStats(statsMap);
    };
    
    fetchTodayStats();
  }, []);

  const fetchTodayPredictions = async (player: PlayerData) => {
    if (player.isVirtual) {
      // 为虚拟玩家生成模拟数据
      const stats = todayStats.get(player.id);
      const mockPredictions: TodayPrediction[] = [];
      const total = stats?.total || 5;
      const correct = stats?.correct || 3;
      
      for (let i = 0; i < total; i++) {
        mockPredictions.push({
          id: `mock-${i}`,
          match_id: `match-${1000 + i}`,
          prediction: Math.random() > 0.5 ? 'over' : 'under',
          prediction_type: 'over_under',
          bet_amount: Math.floor(Math.random() * 500) + 100,
          potential_payout: Math.floor(Math.random() * 800) + 200,
          actual_payout: i < correct ? Math.floor(Math.random() * 800) + 200 : 0,
          result: i < correct ? 'win' : 'loss',
          created_at: new Date().toISOString()
        });
      }
      
      setSelectedPlayer({ player, predictions: mockPredictions });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('user_predictions')
      .select('*')
      .eq('user_id', player.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('获取今日记录失败');
      return;
    }
    
    setSelectedPlayer({ player, predictions: data || [] });
  };

  // 按最佳连胜排序
  const topStreakPlayers = [...allPlayers]
    .sort((a, b) => b.bestStreak - a.bestStreak)
    .slice(0, 10);

  // 按最差连败排序
  const worstStreakPlayers = [...allPlayers]
    .sort((a, b) => b.worstStreak - a.worstStreak)
    .slice(0, 10);

  const handleCopyTrade = (player: PlayerData) => {
    toast.info(t('copy_trade_unavailable_desc') || '一键跟单功能即将上线，敬请期待！');
  };

  const PlayerCard = ({ 
    player, 
    showStreak = false, 
    streakType = 'best',
    rank
  }: { 
    player: PlayerData; 
    showStreak?: boolean; 
    streakType?: 'best' | 'worst';
    rank?: number;
  }) => (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/player/${player.id}`)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {rank !== undefined && (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
            rank === 2 ? 'bg-gray-400/20 text-gray-400' :
            rank === 3 ? 'bg-orange-600/20 text-orange-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {rank}
          </div>
        )}
        <Avatar className="w-10 h-10 border-2 border-border/40 flex-shrink-0">
          <AvatarImage src={player.avatarUrl} alt={player.displayName} />
          <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{player.displayName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70">胜率:</span>
              <span className={player.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {player.winRate.toFixed(1)}%
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground/70">盈利:</span>
              <span className={player.changePercent >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
              </span>
            </span>
            {showStreak && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground/70">{streakType === 'best' ? '连胜:' : '连败:'}</span>
                  <span className={streakType === 'best' ? 'text-success font-medium' : 'text-destructive font-medium'}>
                    {streakType === 'best' ? player.bestStreak : player.worstStreak}场
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {/* 今日预测按钮 */}
        <Button
          size="sm"
          variant="ghost"
          className="text-xs gap-1 px-2"
          onClick={(e) => {
            e.stopPropagation();
            fetchTodayPredictions(player);
          }}
        >
          <Calendar className="h-3 w-3" />
          <span className="text-muted-foreground">今日预测:</span>
          {(() => {
            const stats = todayStats.get(player.id);
            if (!stats || stats.total === 0) return '-';
            return (
              <span className={stats.winRate >= 50 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {stats.correct}/{stats.total} {stats.winRate.toFixed(0)}%
              </span>
            );
          })()}
        </Button>
        {/* 跟单按钮 */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyTrade(player);
          }}
        >
          <UserPlus className="h-3 w-3" />
          {t('copy_trade_btn') || '跟单'}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Section: Win Rate Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 连红榜 - Winning Streak */}
        <Card className="border-success/30 bg-gradient-to-br from-success/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-success/20">
                <Flame className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('hot_streak_board') || '连红榜'}</h3>
                <p className="text-xs text-muted-foreground">{t('best_win_streak') || '最佳连胜纪录'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {topStreakPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} showStreak streakType="best" rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 连黑榜 - Losing Streak */}
        <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-destructive/20">
                <Skull className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('cold_streak_board') || '连黑榜'}</h3>
                <p className="text-xs text-muted-foreground">{t('worst_lose_streak') || '最差连败纪录'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {worstStreakPlayers.map((player, index) => (
                <PlayerCard key={player.id} player={player} showStreak streakType="worst" rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 今日预测详情弹窗 */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={selectedPlayer?.player.avatarUrl} />
                <AvatarFallback>{selectedPlayer?.player.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{selectedPlayer?.player.displayName} - 今日预测</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlayer && (
            <div className="space-y-3">
              {/* 今日统计 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">今日战绩</span>
                <span className="font-bold">
                  {todayStats.get(selectedPlayer.player.id)?.correct || 0}/
                  {todayStats.get(selectedPlayer.player.id)?.total || 0}
                  <span className={`ml-2 ${(todayStats.get(selectedPlayer.player.id)?.winRate || 0) >= 50 ? 'text-success' : 'text-destructive'}`}>
                    ({(todayStats.get(selectedPlayer.player.id)?.winRate || 0).toFixed(0)}%)
                  </span>
                </span>
              </div>
              
              {/* 预测列表 */}
              {selectedPlayer.predictions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  今日暂无预测记录
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPlayer.predictions.map((pred) => (
                    <div key={pred.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          比赛ID: {pred.match_id}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          pred.result === 'win' ? 'bg-success/20 text-success' :
                          pred.result === 'loss' ? 'bg-destructive/20 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {pred.result === 'win' ? '赢' : pred.result === 'loss' ? '输' : '待定'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {pred.prediction_type === 'over_under' ? '大小球' : '让球'}: 
                          <span className="font-medium ml-1">{pred.prediction}</span>
                        </span>
                        <span className="text-muted-foreground">
                          下注: ¥{pred.bet_amount}
                        </span>
                      </div>
                      {pred.result && pred.result !== 'pending' && (
                        <div className="text-xs text-right">
                          <span className={pred.result === 'win' ? 'text-success' : 'text-destructive'}>
                            {pred.result === 'win' ? `+¥${pred.actual_payout || pred.potential_payout}` : `-¥${pred.bet_amount}`}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerCopyTradingBoard;
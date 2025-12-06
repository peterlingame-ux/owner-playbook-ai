import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { virtualPlayers } from "@/data/virtualPlayers";
import { Flame, Skull, UserPlus } from "lucide-react";
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
  bestStreak: number;
  worstStreak: number;
  currentStreak: number;
  isVirtual?: boolean;
}

const PlayerCopyTradingBoard = () => {
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
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0 ml-2 text-xs gap-1"
        onClick={(e) => {
          e.stopPropagation();
          handleCopyTrade(player);
        }}
      >
        <UserPlus className="h-3 w-3" />
        {t('copy_trade_btn') || '跟单'}
      </Button>
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

    </div>
  );
};

export default PlayerCopyTradingBoard;
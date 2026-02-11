import { Trophy, ThumbsUp, Heart, Copy, Users, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { AnimatedPrize } from "./AnimatedPrize";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";

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
  totalBetAmount?: number;
  profitAmount?: number;
  rank: number;
  bestStreak?: number;
  currentStreak?: number;
  worstStreak?: number;
  isVirtual?: boolean;
  isRecommender?: boolean;
  unlockPrice?: number;
  isVip?: boolean;
}

interface PlayerLeaderboardCardProps {
  player: PlayerData;
  index: number;
  isCurrentUser: boolean;
  isLiked: boolean;
  likeCount: number;
  isLiking: boolean;
  onLike: (e: React.MouseEvent) => void;
  onClick: () => void;
  onViewHistory: (e: React.MouseEvent) => void;
  onShowFollowers?: (e: React.MouseEvent, player: PlayerData, followerCount: number) => void;
  maskPlayerName: (name: string) => string;
  calculateEstimatedPrize: (player: { totalPredictions: number; winRate: number; profit: number }, totalEligiblePlayers: number) => number;
  totalEligiblePlayers: number;
  aiBenchmarkWinRate: number;
  boardType?: 'hot' | 'profit' | 'cold'; // 区分排行榜类型
  todayWinRate?: number; // Today's win rate for trend calculation
  currentUserId?: string | null; // 当前用户ID，用于关注功能
}

// Profit Rate Badge Component
const ProfitRateBadge = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  return (
    <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium ${
      isPositive 
        ? 'bg-success/20 text-success' 
        : 'bg-destructive/20 text-destructive'
    }`}>
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

export const PlayerLeaderboardCard = ({
  player,
  index,
  isCurrentUser,
  isLiked,
  likeCount,
  isLiking,
  onLike,
  onClick,
  onViewHistory,
  onShowFollowers,
  maskPlayerName,
  calculateEstimatedPrize,
  totalEligiblePlayers,
  aiBenchmarkWinRate,
  boardType = 'hot',
  todayWinRate,
  currentUserId,
}: PlayerLeaderboardCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // 检查是否已关注该玩家
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUserId || player.isVirtual) return;
      
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', player.id)
        .maybeSingle();
      
      setIsFollowing(!!data);
    };
    
    checkFollowStatus();
  }, [currentUserId, player.id, player.isVirtual]);

  // 关注/取消关注
  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUserId) {
      toast.error(t('please_login_first') || '请先登录');
      return;
    }
    
    if (player.isVirtual) {
      toast.error(t('cannot_follow_virtual') || '暂不支持关注虚拟玩家');
      return;
    }
    
    if (currentUserId === player.id) {
      toast.error(t('cannot_follow_self') || '不能关注自己');
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', player.id);

        if (error) throw error;
        setIsFollowing(false);
        toast.success(t('unfollowed') || '已取消关注');
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUserId,
            following_id: player.id
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success(t('followed') || '关注成功');
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      toast.error(t('operation_failed') || '操作失败');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleLikeWithAnimation = (e: React.MouseEvent) => {
    if (!isLiked) {
      // Trigger floating hearts animation
      const heartIds = [Date.now(), Date.now() + 1, Date.now() + 2];
      setFloatingHearts(heartIds);
      setTimeout(() => setFloatingHearts([]), 1000);
    }
    onLike(e);
  };

  // Generate mini chart data points based on profit trend
  const profitAmount = player.profitAmount || 0;
  const generateChartPath = () => {
    const points = [];
    const width = 80;
    const height = 24;
    const numPoints = 8;
    
    // Use player id as seed for consistent chart
    const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    for (let i = 0; i < numPoints; i++) {
      const x = (i / (numPoints - 1)) * width;
      const variance = ((seed * (i + 1)) % 16) - 8;
      const trend = profitAmount >= 0 ? (i / numPoints) * 12 : -(i / numPoints) * 8;
      const y = height / 2 - trend + variance;
      points.push(`${i === 0 ? 'M' : 'L'}${x},${Math.max(2, Math.min(height - 2, y))}`);
    }
    return points.join(' ');
  };

  const prize = calculateEstimatedPrize(player, totalEligiblePlayers);
  const profitRate = player.changePercent || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ 
        scale: 1.01, 
        y: -1,
        boxShadow: "0 4px 15px -3px rgba(0, 0, 0, 0.15)"
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={`rounded-lg border p-2 sm:p-4 cursor-pointer ${
        isCurrentUser 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-muted/20 border-border/30'
      }`}
      onClick={onClick}
    >
      {/* Mobile: Ultra Compact layout */}
      <div className="sm:hidden">
        {/* Row 1: Rank + Avatar + Name + Win Rate */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {/* Rank */}
          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
            index === 0 ? 'bg-yellow-500/20' :
            index === 1 ? 'bg-gray-400/20' :
            index === 2 ? 'bg-amber-600/20' :
            'bg-muted'
          }`}>
            {index < 3 ? (
              <Trophy className={`h-2.5 w-2.5 ${
                index === 0 ? 'text-yellow-500' :
                index === 1 ? 'text-gray-400' :
                'text-amber-600'
              }`} />
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
            )}
          </div>
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className={`w-7 h-7 border border-border ${player.isVip ? 'vip-avatar-glow' : ''}`}>
              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
              <AvatarFallback className="text-[9px]">{player.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            {currentUserId !== player.id && (
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={`absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full flex items-center justify-center transition-all border shadow-sm ${
                  isFollowLoading ? 'opacity-50' : ''
                } ${
                  isFollowing 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                {isFollowLoading ? (
                  <Loader2 className="h-1.5 w-1.5 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="h-1.5 w-1.5" />
                ) : (
                  <UserPlus className="h-1.5 w-1.5" />
                )}
              </button>
            )}
          </div>
          {/* Name */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <span className="font-bold text-xs text-foreground truncate block">{maskPlayerName(player.displayName)}</span>
          </div>
          {/* Win Rate */}
          <div className="text-right flex-shrink-0">
            <AnimatedWinRate 
              value={player.winRate}
              className="text-sm font-bold font-mono-data text-success"
              trend={todayWinRate !== undefined ? todayWinRate - player.winRate : undefined}
              showTrend={todayWinRate !== undefined}
            />
          </div>
        </div>
        
        {/* Row 2: Stats - 4 columns + Buttons in same row */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 grid grid-cols-4 gap-0.5 text-center py-1 px-1 bg-muted/30 rounded">
            <div className="min-w-0">
              <p className="text-[7px] text-muted-foreground leading-none">{t('predictions_short') || '预测'}</p>
              <p className="text-[10px] font-bold text-foreground">{player.totalPredictions}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[7px] text-muted-foreground leading-none">{t('correct_short') || '正确'}</p>
              <p className="text-[10px] font-bold text-success">{player.correctPredictions}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[7px] text-muted-foreground leading-none">{t('profit_short') || '盈利'}</p>
              <p className={`text-[10px] font-bold inline-flex items-center gap-0.5 justify-center ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitAmount >= 0 ? '+' : ''}{Math.abs(profitAmount) >= 1000 ? `${(profitAmount / 1000).toFixed(1)}k` : profitAmount}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[7px] text-muted-foreground leading-none">盈利率</p>
              <p className={`text-[10px] font-bold ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Original layout */}
      <div className="hidden sm:block">
        {/* Top Row: Avatar, Name, Buttons */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Rank Badge */}
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              index === 0 ? 'bg-yellow-500/20' :
              index === 1 ? 'bg-gray-400/20' :
              index === 2 ? 'bg-amber-600/20' :
              'bg-muted'
            }`}>
              {index < 3 ? (
                <Trophy className={`h-3 w-3 ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  'text-amber-600'
                }`} />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
              )}
            </div>
            {/* Avatar with Follow Button */}
            <div className="relative flex-shrink-0">
              <Avatar className={`w-12 h-12 border border-border ${player.isVip ? 'vip-avatar-glow' : ''}`}>
                <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              {currentUserId !== player.id && (
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center transition-all border shadow-sm ${
                    isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    isFollowing 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
                  title={isFollowing ? t('following') || '已关注' : t('follow') || '关注'}
                >
                  {isFollowLoading ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : isFollowing ? (
                    <UserCheck className="h-2.5 w-2.5" />
                  ) : (
                    <UserPlus className="h-2.5 w-2.5" />
                  )}
                </button>
              )}
            </div>
            {/* Name */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base text-foreground">{maskPlayerName(player.displayName)}</span>
              </div>
            </div>
          </div>
          {/* Prize */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {prize > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-warning/25 to-warning/15 border border-warning/40 text-warning text-xs font-bold shadow-sm whitespace-nowrap">
                <AnimatedPrize value={prize} className="text-xs font-bold text-warning" duration={600} showLabel={true} />
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/40 border border-border/50 text-muted-foreground text-xs whitespace-nowrap">
                {t('not_qualified')}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Grid - Row 1: 预测, 正确, 错误, 胜率 - Desktop only */}
      <div className="hidden sm:grid grid-cols-4 gap-4">
        {/* Total Predictions */}
        <div>
          <p className="text-xs text-muted-foreground mb-1 truncate">{t('total_predictions')}</p>
          <p className="text-lg font-bold font-mono-data text-foreground">
            {player.totalPredictions}{t('matches_suffix')}
          </p>
        </div>
        
        {/* Correct Predictions */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1 truncate">{t('correct_matches')}</p>
          <p className="text-lg font-bold font-mono-data text-foreground">
            {player.correctPredictions}{t('matches_suffix')}
          </p>
        </div>
        
        {/* Incorrect Predictions */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1 truncate">{t('incorrect_matches')}</p>
          <p className="text-lg font-bold font-mono-data text-foreground">
            {player.totalPredictions - player.correctPredictions}{t('matches_suffix')}
          </p>
        </div>
        
        {/* Win Rate */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">{t('win_rate')}</p>
          <AnimatedWinRate 
            value={player.winRate}
            className="text-base font-bold font-mono-data text-success"
            trend={todayWinRate !== undefined ? todayWinRate - player.winRate : undefined}
            showTrend={todayWinRate !== undefined}
          />
        </div>
      </div>
      
      {/* Stats Grid - Row 2: 投注金额, 盈利金额, 跟单人数, 预期奖金 - Desktop only */}
      <div className="hidden sm:grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-border/50">
        {/* Bet Amount */}
        <div>
          <p className="text-xs text-muted-foreground mb-1 truncate">{t('bet_amount_label')}</p>
          <p className="text-base font-bold font-mono-data text-foreground truncate flex items-center gap-0.5">
            {((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
          </p>
        </div>
        
        {/* Profit Amount */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1 truncate">{t('profit_amount_label')}</p>
          <p className="text-base font-bold font-mono-data truncate flex items-center justify-center gap-0.5 text-foreground">
            {profitAmount >= 0 ? '+' : '-'}{Math.abs(profitAmount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
          </p>
        </div>
        
        {/* Profit Rate */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">{t('profit_rate')}</p>
          <p className="text-base font-bold font-mono-data text-foreground">
            {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
          </p>
        </div>
        
        {/* Copy Traders - Clickable */}
        <div 
          className="text-right cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
            const variance = (seed % 50) - 25;
            const followerCount = Math.max(0, baseCount + variance);
            if (onShowFollowers) {
              onShowFollowers(e, player, followerCount);
            } else {
              onViewHistory(e);
            }
          }}
        >
          <p className="text-xs text-muted-foreground mb-1 flex items-center justify-end gap-1"><Users className="h-3 w-3" fill="currentColor" />{t('followers_count')}</p>
          <p className="text-base font-bold font-mono-data text-primary hover:underline">
            {(() => {
              const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
              const variance = (seed % 50) - 25;
              return Math.max(0, baseCount + variance).toLocaleString();
            })()}{t('people_suffix')}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

import { Trophy, TrendingUp, TrendingDown, Users, Eye, Zap, ChevronRight, ThumbsUp, Heart, DollarSign, Target, Award, Flame, Snowflake } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { AnimatedPrize } from "./AnimatedPrize";

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
  signature?: string;
}

interface OKXPlayerCardProps {
  player: PlayerData;
  index: number;
  onClick: () => void;
  onViewHistory: (e: React.MouseEvent) => void;
  boardType?: 'hot' | 'cold';
  todayWinRate?: number;
  isLiked?: boolean;
  likeCount?: number;
  isLiking?: boolean;
  onLike?: (e: React.MouseEvent) => void;
  onShowFollowers?: (e: React.MouseEvent, player: PlayerData, followerCount: number) => void;
  calculateEstimatedPrize?: (winRate: number, rank: number, totalEligiblePlayers: number) => number;
  totalEligiblePlayers?: number;
  aiBenchmarkWinRate?: number;
}

export const OKXPlayerCard = ({
  player,
  index,
  onClick,
  onViewHistory,
  boardType = 'hot',
  todayWinRate,
  isLiked = false,
  likeCount = 0,
  isLiking = false,
  onLike,
  onShowFollowers,
  calculateEstimatedPrize,
  totalEligiblePlayers = 1,
  aiBenchmarkWinRate = 58,
}: OKXPlayerCardProps) => {
  const { t } = useTranslation();
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);
  
  const profitAmount = player.profitAmount || 0;
  const profitRate = player.changePercent || 0;
  const isPositiveProfit = profitRate >= 0;
  const totalBetAmount = player.totalBetAmount || 0;
  
  // 计算跟单人数
  const getFollowerCount = () => {
    const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
    const variance = (seed % 50) - 25;
    return Math.max(0, baseCount + variance);
  };
  
  const followerCount = getFollowerCount();

  // 计算预期奖金
  const prize = calculateEstimatedPrize 
    ? calculateEstimatedPrize(player.winRate, index + 1, totalEligiblePlayers)
    : 0;

  // 排名颜色
  const getRankStyle = () => {
    if (index === 0) return { bg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10', text: 'text-yellow-500', border: 'border-yellow-500/30' };
    if (index === 1) return { bg: 'bg-gradient-to-br from-slate-400/20 to-slate-500/10', text: 'text-slate-400', border: 'border-slate-400/30' };
    if (index === 2) return { bg: 'bg-gradient-to-br from-amber-600/20 to-amber-700/10', text: 'text-amber-600', border: 'border-amber-600/30' };
    return { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };
  };
  
  const rankStyle = getRankStyle();

  const handleLikeWithAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      const heartIds = [Date.now(), Date.now() + 1, Date.now() + 2];
      setFloatingHearts(heartIds);
      setTimeout(() => setFloatingHearts([]), 1000);
    }
    onLike?.(e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="group relative bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-300 hover:bg-card/80 hover:border-border/60 hover:shadow-lg hover:shadow-black/5"
    >
      {/* 顶部区域：排名 + 头像 + 信息 + 预期奖金 */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* 排名徽章 */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base border",
          rankStyle.bg, rankStyle.text, rankStyle.border
        )}>
          {index < 3 ? (
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <span>{index + 1}</span>
          )}
        </div>

        {/* 头像 + 点赞 */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-border/50 ring-2 ring-background">
            <AvatarImage src={player.avatarUrl} alt={player.displayName} className="object-cover" />
            <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
              {player.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {/* 点赞按钮 */}
          {onLike && (
            <div className="absolute -top-1.5 -right-1">
              <button
                onClick={handleLikeWithAnimation}
                disabled={isLiking}
                className={cn(
                  "flex items-center gap-0.5 px-1 py-0.5 rounded-full transition-all text-[8px] sm:text-[10px] border",
                  isLiking && 'opacity-50 cursor-not-allowed',
                  isLiked 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                )}
              >
                <ThumbsUp className={cn("h-2 w-2 sm:h-2.5 sm:w-2.5", isLiked && 'fill-current')} />
                <span className="font-medium">{likeCount}</span>
              </button>
              {/* 飘心动画 */}
              <AnimatePresence>
                {floatingHearts.map((heartId, idx) => (
                  <motion.div
                    key={heartId}
                    initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: 0, 
                      y: -40, 
                      x: (idx - 1) * 12,
                      scale: 1,
                      rotate: (idx - 1) * 15
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none"
                  >
                    <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {/* 在线状态指示器 */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-success rounded-full border-2 border-background" />
        </div>

        {/* 名称和连胜/连败 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
              {player.displayName}
            </h3>
            {boardType === 'hot' && player.currentStreak && player.currentStreak >= 3 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-success/15 text-success text-[10px] sm:text-xs font-medium whitespace-nowrap">
                <Flame className="h-3 w-3" />
                <span>{player.currentStreak}{t('win_streak_suffix')}</span>
              </span>
            )}
            {boardType === 'cold' && player.worstStreak && player.worstStreak >= 3 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive text-[10px] sm:text-xs font-medium whitespace-nowrap">
                <Snowflake className="h-3 w-3" />
                <span>{player.worstStreak}{t('lose_streak_suffix')}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
            {player.signature || t('no_signature')}
          </p>
        </div>

        {/* 预期奖金展示 */}
        <div className="flex-shrink-0 text-right">
          {prize > 0 ? (
            <div className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-warning/25 to-warning/15 border border-warning/40 shadow-sm">
              <Award className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
              <AnimatedPrize value={prize} className="text-xs sm:text-sm font-bold text-warning" duration={600} showLabel={true} />
            </div>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-muted/40 border border-border/50 text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">
              {t('not_qualified')}
            </span>
          )}
        </div>
      </div>

      {/* 数据统计网格 - Row 1: 总预测, 正确, 错误, 胜率 */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-4 pt-3 border-t border-border/30">
        {/* 总预测 */}
        <div className="text-center">
          <div className="text-base sm:text-xl font-bold font-mono-data text-foreground">
            {player.totalPredictions}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('total_predictions')}
          </div>
        </div>

        {/* 正确场次 */}
        <div className="text-center">
          <div className="text-base sm:text-xl font-bold font-mono-data text-success">
            {player.correctPredictions}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('correct_matches')}
          </div>
        </div>

        {/* 错误场次 */}
        <div className="text-center">
          <div className="text-base sm:text-xl font-bold font-mono-data text-destructive">
            {player.totalPredictions - player.correctPredictions}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('incorrect_matches')}
          </div>
        </div>

        {/* 胜率 */}
        <div className="text-center">
          <AnimatedWinRate 
            value={player.winRate}
            className="text-base sm:text-xl font-bold font-mono-data text-success"
            trend={todayWinRate !== undefined ? todayWinRate - player.winRate : undefined}
            showTrend={todayWinRate !== undefined}
          />
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('win_rate')}
          </div>
        </div>
      </div>

      {/* 数据统计网格 - Row 2: 投注金额, 盈利金额, 盈利率, 跟单人数 */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-3 pt-3 border-t border-border/30">
        {/* 投注金额 */}
        <div className="text-center">
          <div className="text-xs sm:text-base font-bold font-mono-data text-foreground truncate">
            {(totalBetAmount / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('bet_amount_label')}
          </div>
        </div>

        {/* 盈利金额 */}
        <div className="text-center">
          <div className={cn(
            "text-xs sm:text-base font-bold font-mono-data truncate",
            profitAmount >= 0 ? "text-success" : "text-destructive"
          )}>
            {profitAmount >= 0 ? '+' : ''}{(profitAmount / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('profit_amount_label')}
          </div>
        </div>

        {/* 盈利率 */}
        <div className="text-center">
          <div className={cn(
            "text-xs sm:text-base font-bold font-mono-data",
            isPositiveProfit ? "text-success" : "text-destructive"
          )}>
            {isPositiveProfit ? '+' : ''}{profitRate.toFixed(1)}%
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('profit_rate')}
          </div>
        </div>

        {/* 跟单人数 - 可点击 */}
        <div 
          className="text-center cursor-pointer hover:bg-muted/30 rounded-lg p-1 -m-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (onShowFollowers) {
              onShowFollowers(e, player, followerCount);
            }
          }}
        >
          <div className="text-xs sm:text-base font-bold font-mono-data text-primary flex items-center justify-center gap-1">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{followerCount}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('followers_count')}
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/30">
        <button
          onClick={onViewHistory}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-warning to-warning/90 text-warning-foreground text-xs sm:text-sm font-bold hover:from-warning/90 hover:to-warning transition-all duration-300 shadow-md shadow-warning/30"
        >
          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{t('today_recommendations')}</span>
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      {/* Hover效果边框 */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/20 transition-colors pointer-events-none" />
    </motion.div>
  );
};

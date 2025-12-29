import { Trophy, TrendingUp, TrendingDown, Users, Eye, Zap, ChevronRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
}

export const OKXPlayerCard = ({
  player,
  index,
  onClick,
  onViewHistory,
  boardType = 'hot',
  todayWinRate,
}: OKXPlayerCardProps) => {
  const { t } = useTranslation();
  
  const profitAmount = player.profitAmount || 0;
  const profitRate = player.changePercent || 0;
  const isPositiveProfit = profitRate >= 0;
  
  // 计算跟单人数
  const getFollowerCount = () => {
    const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
    const variance = (seed % 50) - 25;
    return Math.max(0, baseCount + variance);
  };
  
  const followerCount = getFollowerCount();

  // 排名颜色
  const getRankStyle = () => {
    if (index === 0) return { bg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10', text: 'text-yellow-500', border: 'border-yellow-500/30' };
    if (index === 1) return { bg: 'bg-gradient-to-br from-slate-400/20 to-slate-500/10', text: 'text-slate-400', border: 'border-slate-400/30' };
    if (index === 2) return { bg: 'bg-gradient-to-br from-amber-600/20 to-amber-700/10', text: 'text-amber-600', border: 'border-amber-600/30' };
    return { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };
  };
  
  const rankStyle = getRankStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="group relative bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-300 hover:bg-card/80 hover:border-border/60 hover:shadow-lg hover:shadow-black/5"
    >
      {/* 顶部区域：排名 + 头像 + 信息 + 盈利 */}
      <div className="flex items-center gap-3 sm:gap-4">
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

        {/* 头像 */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-border/50 ring-2 ring-background">
            <AvatarImage src={player.avatarUrl} alt={player.displayName} className="object-cover" />
            <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
              {player.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {/* 在线状态指示器 */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-success rounded-full border-2 border-background" />
        </div>

        {/* 名称和描述 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
              {player.displayName}
            </h3>
            {boardType === 'hot' && player.currentStreak && player.currentStreak >= 3 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-success/15 text-success text-[10px] sm:text-xs font-medium">
                <Zap className="h-3 w-3" />
                <span>{player.currentStreak}{t('win_streak_suffix') || '连胜'}</span>
              </span>
            )}
            {boardType === 'cold' && player.worstStreak && player.worstStreak >= 3 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive text-[10px] sm:text-xs font-medium">
                <span>{player.worstStreak}{t('lose_streak_suffix') || '连败'}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
            {player.signature || t('no_signature') || '专业足球预测分析师'}
          </p>
        </div>

        {/* 盈利展示 - OKX风格大字体 */}
        <div className="flex-shrink-0 text-right">
          <div className={cn(
            "text-lg sm:text-xl font-bold font-mono-data",
            isPositiveProfit ? "text-success" : "text-destructive"
          )}>
            {isPositiveProfit ? '+' : ''}{profitRate.toFixed(2)}%
          </div>
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mt-0.5">
            <span>{t('pnl_label') || '收益率'}</span>
            {todayWinRate !== undefined && (
              <span className={cn(
                "flex items-center",
                todayWinRate > player.winRate ? "text-success" : todayWinRate < player.winRate ? "text-destructive" : "text-muted-foreground"
              )}>
                {todayWinRate > player.winRate ? (
                  <TrendingUp className="h-3 w-3" />
                ) : todayWinRate < player.winRate ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 数据统计网格 - OKX风格 */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-4 pt-3 border-t border-border/30">
        {/* 胜率 */}
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold font-mono-data text-foreground">
            {player.winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('win_rate')}
          </div>
        </div>

        {/* 预测场次 */}
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold font-mono-data text-foreground">
            {player.totalPredictions}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('total_matches') || '预测场次'}
          </div>
        </div>

        {/* 盈利金额 */}
        <div className="text-center">
          <div className={cn(
            "text-lg sm:text-xl font-bold font-mono-data",
            profitAmount >= 0 ? "text-success" : "text-destructive"
          )}>
            {profitAmount >= 0 ? '+' : ''}{(profitAmount / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('profit_pts') || '盈利(PTS)'}
          </div>
        </div>

        {/* 跟单人数 */}
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold font-mono-data text-primary flex items-center justify-center gap-1">
            <Users className="h-4 w-4" />
            <span>{followerCount}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {t('followers') || '跟单人'}
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="text-success font-medium">{player.correctPredictions}</span>
            <span>{t('correct_short') || '正确'}</span>
          </span>
          <span className="text-border/50">|</span>
          <span className="flex items-center gap-1">
            <span className="text-destructive font-medium">{player.totalPredictions - player.correctPredictions}</span>
            <span>{t('wrong_short') || '错误'}</span>
          </span>
        </div>
        
        <button
          onClick={onViewHistory}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs sm:text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{t('view_picks') || '查看推荐'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hover效果边框 */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/20 transition-colors pointer-events-none" />
    </motion.div>
  );
};

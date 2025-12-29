import { Trophy, ThumbsUp, Heart, Copy, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { AnimatedPrize } from "./AnimatedPrize";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
  calculateEstimatedPrize: (winRate: number, rank: number, totalEligiblePlayers: number) => number;
  totalEligiblePlayers: number;
  aiBenchmarkWinRate: number;
  boardType?: 'hot' | 'profit' | 'cold'; // 区分排行榜类型
  todayWinRate?: number; // Today's win rate for trend calculation
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
}: PlayerLeaderboardCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

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

  const prize = calculateEstimatedPrize(player.winRate, index + 1, totalEligiblePlayers);
  const profitRate = player.changePercent || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ 
        scale: 1.02, 
        y: -2,
        boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.2)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={`rounded-lg border p-2.5 sm:p-4 cursor-pointer ${
        isCurrentUser 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-muted/20 border-border/30'
      }`}
      onClick={onClick}
    >
      {/* Top Row: Avatar, Name, Buttons */}
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Rank Badge */}
          <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
            index === 0 ? 'bg-yellow-500/20' :
            index === 1 ? 'bg-gray-400/20' :
            index === 2 ? 'bg-amber-600/20' :
            'bg-muted'
          }`}>
            {index < 3 ? (
              <Trophy className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${
                index === 0 ? 'text-yellow-500' :
                index === 1 ? 'text-gray-400' :
                'text-amber-600'
              }`} />
            ) : (
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{index + 1}</span>
            )}
          </div>
          {/* Avatar with Like Button */}
          <div className="relative flex-shrink-0">
            <Avatar className="w-8 h-8 sm:w-12 sm:h-12 border border-border">
              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
              <AvatarFallback className="text-[10px] sm:text-xs">{player.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            {/* Like Button on Avatar - Top */}
            <div className="absolute -top-1.5 -right-1">
              <button
                onClick={handleLikeWithAnimation}
                disabled={isLiking}
                className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full transition-all text-[8px] sm:text-[10px] border ${
                  isLiking ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  isLiked 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
                title={isLiked ? '取消点赞' : '点赞'}
              >
                <ThumbsUp className={`h-2 w-2 sm:h-2.5 sm:w-2.5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{likeCount}</span>
              </button>
              {/* Floating Hearts Animation */}
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
          </div>
          {/* Name & Stats */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-base text-foreground truncate max-w-[80px] sm:max-w-none">{maskPlayerName(player.displayName)}</span>
            </div>
            <div className="mt-0.5 text-[9px] sm:text-xs text-muted-foreground flex items-center gap-0.5 sm:gap-1 flex-wrap">
              {boardType === 'cold' ? (
                <>
                  <span className="whitespace-nowrap">{t('lose_streak')} <span className="text-foreground font-bold">{player.worstStreak || 0}</span></span>
                  <span className="flex items-center gap-0.5 ml-0.5">
                    {Array.from({ length: Math.min(player.worstStreak || 0, 3) }).map((_, i) => (
                      <span key={i} className="w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-foreground/20 border border-foreground/50 flex items-center justify-center text-[6px] sm:text-[9px] text-foreground font-bold">
                        {t('loss_badge')}
                      </span>
                    ))}
                  </span>
                </>
              ) : (
                <>
                  <span className="whitespace-nowrap">{t('win_streak')} <span className="text-destructive font-bold">{player.currentStreak || player.bestStreak || 0}</span></span>
                  <span className="flex items-center gap-0.5 ml-0.5">
                    {Array.from({ length: Math.min(player.currentStreak || player.bestStreak || 0, 5) }).map((_, i) => (
                      <span key={i} className="w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center text-[6px] sm:text-[9px] text-destructive font-bold">
                        {t('win_badge')}
                      </span>
                    ))}
                    {(player.currentStreak || player.bestStreak || 0) > 5 && (
                      <span className="w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-destructive/10 border border-dashed border-destructive/40 flex items-center justify-center text-[6px] sm:text-[9px] text-destructive/70 font-medium">
                        …
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Action Buttons & Prize - Stacked on mobile */}
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3 flex-shrink-0">
          {/* Estimated Prize Badge */}
          {prize > 0 ? (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-gradient-to-r from-warning/25 to-warning/15 border border-warning/40 text-warning text-[8px] sm:text-xs font-bold shadow-sm whitespace-nowrap">
              <AnimatedPrize value={prize} className="text-[8px] sm:text-xs font-bold text-warning" duration={600} showLabel={true} />
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-muted/40 border border-border/50 text-muted-foreground text-[8px] sm:text-xs whitespace-nowrap">
              {t('not_qualified')}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/history');
              }}
              className="px-1.5 sm:px-3 py-1 text-[8px] sm:text-xs font-medium rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40 whitespace-nowrap"
            >
              {t('view_history')}
            </button>
            <button 
              onClick={onViewHistory}
              className="px-1.5 sm:px-3.5 py-1 text-[8px] sm:text-xs font-bold rounded-md bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:from-warning/90 hover:to-warning transition-all duration-300 shadow-md shadow-warning/30 whitespace-nowrap"
            >
              {t('today_recommendations')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Grid - Row 1: 预测, 正确, 错误, 胜率 */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
        {/* Total Predictions */}
        <div>
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{t('total_predictions')}</p>
          <p className="text-xs sm:text-lg font-bold font-mono-data text-foreground">
            {player.totalPredictions}<span className="hidden sm:inline">{t('matches_suffix')}</span>
          </p>
        </div>
        
        {/* Correct Predictions */}
        <div className="text-center">
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{t('correct_matches')}</p>
          <p className="text-xs sm:text-lg font-bold font-mono-data text-success">
            {player.correctPredictions}<span className="hidden sm:inline">{t('matches_suffix')}</span>
          </p>
        </div>
        
        {/* Incorrect Predictions */}
        <div className="text-center">
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{t('incorrect_matches')}</p>
          <p className="text-xs sm:text-lg font-bold font-mono-data text-destructive">
            {player.totalPredictions - player.correctPredictions}<span className="hidden sm:inline">{t('matches_suffix')}</span>
          </p>
        </div>
        
        {/* Win Rate */}
        <div className="text-right">
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t('win_rate')}</p>
          <AnimatedWinRate 
            value={player.winRate}
            className="text-xs sm:text-base font-bold font-mono-data text-success"
            trend={todayWinRate !== undefined ? todayWinRate - player.winRate : undefined}
            showTrend={todayWinRate !== undefined}
          />
        </div>
      </div>
      
      {/* Stats Grid - Row 2: 投注金额, 盈利金额, 跟单人数, 预期奖金 */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-4 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
        {/* Bet Amount */}
        <div>
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{t('bet_amount_label')}</p>
          <p className="text-xs sm:text-base font-bold font-mono-data text-foreground truncate flex items-center gap-0.5">
            {((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-4 sm:h-4" />
          </p>
        </div>
        
        {/* Profit Amount */}
        <div className="text-center">
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{t('profit_amount_label')}</p>
          <p className={`text-xs sm:text-base font-bold font-mono-data truncate flex items-center justify-center gap-0.5 ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
            {profitAmount >= 0 ? '+' : '-'}{Math.abs(profitAmount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-4 sm:h-4" />
          </p>
        </div>
        
        {/* Profit Rate */}
        <div className="text-center">
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">{t('profit_rate')}</p>
          <p className={`text-xs sm:text-base font-bold font-mono-data ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
            {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%
          </p>
        </div>
        
        {/* Copy Traders - Clickable */}
        <div 
          className="text-right cursor-pointer hover:bg-muted/50 rounded-md p-0.5 sm:p-1 -m-0.5 sm:-m-1 transition-colors"
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
          <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 flex items-center justify-end gap-0.5 sm:gap-1"><Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" fill="currentColor" /><span className="hidden sm:inline">{t('followers_count')}</span></p>
          <p className="text-xs sm:text-base font-bold font-mono-data text-primary hover:underline">
            {(() => {
              const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
              const variance = (seed % 50) - 25;
              return Math.max(0, baseCount + variance);
            })()}<span className="hidden sm:inline">{t('people_suffix')}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

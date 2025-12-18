import { Trophy, ThumbsUp, Heart, Copy, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { AnimatedPrize } from "./AnimatedPrize";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  maskPlayerName: (name: string) => string;
  calculateEstimatedPrize: (winRate: number, rank: number, totalEligiblePlayers: number) => number;
  totalEligiblePlayers: number;
  aiBenchmarkWinRate: number;
  boardType?: 'hot' | 'profit' | 'cold'; // 区分排行榜类型
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
  maskPlayerName,
  calculateEstimatedPrize,
  totalEligiblePlayers,
  aiBenchmarkWinRate,
  boardType = 'hot',
}: PlayerLeaderboardCardProps) => {
  const { t } = useTranslation();
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
      className={`rounded-lg border p-3 sm:p-4 cursor-pointer ${
        isCurrentUser 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-muted/20 border-border/30'
      }`}
      onClick={onClick}
    >
      {/* Top Row: Avatar, Name, Buttons */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
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
          {/* Avatar with Like Button */}
          <div className="relative flex-shrink-0">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border border-border">
              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
              <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            {/* Like Button on Avatar - Top */}
            <div className="absolute -top-2 -right-1">
              <button
                onClick={handleLikeWithAnimation}
                disabled={isLiking}
                className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full transition-all text-[10px] border ${
                  isLiking ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  isLiked 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
                title={isLiked ? '取消点赞' : '点赞'}
              >
                <ThumbsUp className={`h-2.5 w-2.5 ${isLiked ? 'fill-current' : ''}`} />
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
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm sm:text-base text-foreground">{maskPlayerName(player.displayName)}</span>
              {/* Profit Rate Badge */}
              <ProfitRateBadge value={profitRate} />
            </div>
            <div className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              {boardType === 'cold' ? (
                <>
                  {t('lose_streak')} <span className="text-foreground font-bold">{player.worstStreak || 0}</span>
                  <span className="flex items-center gap-0.5 ml-1">
                    {Array.from({ length: Math.min(player.worstStreak || 0, 5) }).map((_, i) => (
                      <span key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-foreground/20 border border-foreground/50 flex items-center justify-center text-[8px] sm:text-[9px] text-foreground font-bold">
                        {t('loss_badge')}
                      </span>
                    ))}
                    {(player.worstStreak || 0) > 5 && (
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-foreground/10 border border-dashed border-foreground/40 flex items-center justify-center text-[8px] sm:text-[9px] text-foreground/70 font-medium">
                        …
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  {t('win_streak')} <span className="text-destructive font-bold">{player.currentStreak || 0}</span>
                  <span className="flex items-center gap-0.5 ml-1">
                    {Array.from({ length: Math.min(player.currentStreak || 0, 5) }).map((_, i) => (
                      <span key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center text-[8px] sm:text-[9px] text-destructive font-bold">
                        {t('win_badge')}
                      </span>
                    ))}
                    {(player.currentStreak || 0) > 5 && (
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive/10 border border-dashed border-destructive/40 flex items-center justify-center text-[8px] sm:text-[9px] text-destructive/70 font-medium">
                        …
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={onClick}
            className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/40"
          >
            {t('view_history')}
          </button>
          <button 
            onClick={onViewHistory}
            className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:from-warning/90 hover:to-warning transition-all duration-300 shadow-lg shadow-warning/30 hover:shadow-xl hover:shadow-warning/40 hover:scale-105 active:scale-95"
          >
            {t('today_recommendations')}
          </button>
        </div>
      </div>
      
      {/* Stats Grid - Row 1: 预测, 投注金额, 正确, 错误 */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {/* Total Predictions */}
        <div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t('total_predictions')}</p>
          <p className="text-sm sm:text-lg font-bold font-mono-data text-foreground">
            {player.totalPredictions}{t('matches_suffix')}
          </p>
        </div>
        
        {/* Bet Amount */}
        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t('bet_amount_label')}</p>
          <p className="text-sm sm:text-lg font-bold font-mono-data text-foreground">
            ¥{((player.totalBetAmount || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        
        {/* Correct Predictions */}
        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t('correct_matches')}</p>
          <p className="text-sm sm:text-lg font-bold font-mono-data text-success">
            {player.correctPredictions}{t('matches_suffix')}
          </p>
        </div>
        
        {/* Incorrect Predictions */}
        <div className="text-right">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t('incorrect_matches')}</p>
          <p className="text-sm sm:text-lg font-bold font-mono-data text-destructive">
            {player.totalPredictions - player.correctPredictions}{t('matches_suffix')}
          </p>
        </div>
      </div>
      
      {/* Stats Grid - Row 2: 胜率, 盈利金额, 跟单人数, 预期奖金 */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-3 pt-3 border-t border-border/50">
        {/* Win Rate */}
        <div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t('win_rate')}</p>
          <AnimatedWinRate 
            value={player.winRate}
            className="text-sm sm:text-base font-bold font-mono-data text-foreground"
          />
        </div>
        
        {/* Profit Amount */}
        <div className="text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t('profit_amount_label')}</p>
          <p className={`text-sm sm:text-base font-bold font-mono-data ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
            {profitAmount >= 0 ? '+' : ''}¥{(profitAmount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        
        {/* Copy Traders - Clickable */}
        <div 
          className="text-center cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onViewHistory(e);
          }}
        >
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><Users className="h-3 w-3" fill="currentColor" />{t('followers_count')}</p>
          <p className="text-sm sm:text-base font-bold font-mono-data text-primary hover:underline">
            {(() => {
              const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              const baseCount = Math.floor(player.winRate * 2 + player.totalPredictions * 0.5);
              const variance = (seed % 50) - 25;
              return Math.max(0, baseCount + variance);
            })()}{t('people_suffix')}
          </p>
        </div>
        
        {/* Estimated Prize */}
        <div className="text-right">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t('estimated_prize')}</p>
          {prize > 0 ? (
            <AnimatedPrize value={prize} className="text-sm sm:text-base font-bold text-warning" duration={600} />
          ) : (
            <span className="text-sm sm:text-base text-muted-foreground/50">{t('not_qualified')}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

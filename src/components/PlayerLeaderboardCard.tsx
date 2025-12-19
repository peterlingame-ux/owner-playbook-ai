import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
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
  boardType?: 'hot' | 'profit' | 'cold';
  todayWinRate?: number;
}

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
  todayWinRate,
}: PlayerLeaderboardCardProps) => {
  const { t } = useTranslation();
  const profitAmount = player.profitAmount || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ 
        scale: 1.01, 
        backgroundColor: "rgba(255,255,255,0.03)"
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
      <div className="flex items-center justify-between">
        {/* Left: Rank + Avatar + Name & Streak */}
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold ${
            index === 0 ? 'bg-yellow-500 text-yellow-950' :
            index === 1 ? 'bg-gray-400 text-gray-900' :
            index === 2 ? 'bg-amber-600 text-amber-950' :
            'bg-muted text-muted-foreground'
          }`}>
            {index + 1}
          </div>
          
          {/* Avatar */}
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border border-border">
            <AvatarImage src={player.avatarUrl} alt={player.displayName} />
            <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          {/* Name & Streak */}
          <div>
            <span className="font-semibold text-sm sm:text-base text-foreground">
              {maskPlayerName(player.displayName)}
            </span>
            <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {boardType === 'cold' ? (
                <span>{t('lose_streak')} <span className="text-foreground font-bold">{player.worstStreak || 0}</span></span>
              ) : (
                <span>{t('win_streak')} <span className="text-destructive font-bold">{player.currentStreak || 0}</span></span>
              )}
            </div>
          </div>
        </div>
        
        {/* Right: Win Rate & Profit */}
        <div className="text-right">
          <div className="text-lg sm:text-xl font-bold text-success">
            {player.winRate.toFixed(1)}%
          </div>
          <div className={`text-xs sm:text-sm font-medium ${profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
            {profitAmount >= 0 ? '+' : ''}¥{(profitAmount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface PlayerCardProps {
  player: {
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
  };
}

const PlayerCard = ({ player }: PlayerCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPositive = player.changePercent > 0;
  
  // 动画效果：从较低的值开始动画到实际值
  const animatedWinRate = useCountAnimation(player.winRate, { 
    duration: 1500,
    startValue: Math.max(0, player.winRate - 15)
  });
  
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
  
  const getBadgeAnimation = (rank: number) => {
    if (rank > 3) return {};
    
    return {
      animate: {
        scale: [1, 1.1, 1],
        boxShadow: [
          `0 0 0px ${getRankColor(rank)}`,
          `0 0 20px ${getRankColor(rank)}`,
          `0 0 0px ${getRankColor(rank)}`
        ]
      },
      transition: {
        duration: 2,
        repeat: Infinity as number,
      }
    };
  };
  
  const getTrophyAnimation = (rank: number) => {
    if (rank > 3) return {};
    
    return {
      animate: {
        rotate: [0, -10, 10, -10, 0],
        y: [0, -3, 0]
      },
      transition: {
        duration: 3,
        repeat: Infinity as number,
      }
    };
  };
  
  const handleCardClick = () => {
    toast.info("玩家详情页面即将上线");
  };
  
  const formattedProfit = player.profit >= 0 
    ? `+$${player.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(player.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  return (
    <Card 
      className="relative p-4 sm:p-5 lg:p-6 bg-card border-border hover:border-opacity-50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
      style={{
        borderColor: getRankColor(player.rank)
      }}
    >
      {/* Rank Badge */}
      <div className="absolute top-2 right-2 z-20">
        <motion.div 
          className="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border"
          style={{ 
            backgroundColor: `${getRankColor(player.rank).replace(')', ' / 0.2)')}`,
            borderColor: getRankColor(player.rank)
          }}
          {...getBadgeAnimation(player.rank)}
        >
          <motion.div {...getTrophyAnimation(player.rank)}>
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: getRankColor(player.rank) }} />
          </motion.div>
          <span className="text-xs sm:text-sm font-bold" style={{ color: getRankColor(player.rank) }}>
            #{player.rank}
          </span>
        </motion.div>
      </div>

      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${getRankColor(player.rank)}, transparent 70%)`
        }}
      />
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 shrink-0" style={{ borderColor: getRankColor(player.rank) }}>
              <AvatarImage src={player.avatarUrl} alt={player.displayName} />
              <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-bold text-xs sm:text-sm leading-tight text-foreground truncate">
                {player.displayName}
              </h3>
            </div>
          </div>
          
          {/* Money Change Badge */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground whitespace-nowrap">{t('simulated_profit')}</span>
            <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-mono-data font-bold text-[10px] sm:text-xs ${
              isPositive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
            }`}>
              {formattedProfit}
            </div>
          </div>
        </div>
        
        <div className="space-y-2.5 sm:space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{t('win_rate')}</span>
              <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all" style={{ color: getRankColor(player.rank) }}>
                {animatedWinRate.toFixed(1)}%
              </span>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="relative h-2 sm:h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${animatedWinRate}%`,
                  backgroundColor: getRankColor(player.rank)
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/50 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-success">
                {player.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data">
                {player.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('wrong')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-destructive">
                {player.totalPredictions - player.correctPredictions}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PlayerCard;

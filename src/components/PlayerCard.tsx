import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { Trophy } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
    bestStreak?: number;
    worstStreak?: number;
    todayTotal?: number;
    todayCorrect?: number;
  };
}

const PlayerCard = ({ player }: PlayerCardProps) => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
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
        return 'hsl(45 50% 50%)'; // Muted Gold
      case 2:
        return 'hsl(210 10% 60%)'; // Silver-gray
      case 3:
        return 'hsl(25 30% 45%)'; // Muted Bronze
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
    if (!authLoading && !user) {
      toast.warning(t("login_required"), {
        description: t("login_prompt"),
      });
      navigate("/auth");
      return;
    }
    navigate(`/player/${player.id}`);
  };
  
  const handleFollowPlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(t('copy_trade_player_unavailable_desc') || '关注玩家功能即将上线，敬请期待！');
  };
  
  const formattedProfit = player.profit >= 0 
    ? `+$${player.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(player.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  return (
    <Card 
      className="relative p-4 sm:p-5 lg:p-6 bg-card border-border/30 hover:border-border/50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Subtle Background gradient */}
      <div 
        className="absolute inset-0 opacity-3 group-hover:opacity-5 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${getRankColor(player.rank)}, transparent 80%)`
        }}
      />
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2" style={{ borderColor: getRankColor(player.rank) }}>
                <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              {player.rank <= 3 && (
                <motion.div 
                  className="absolute -top-1 -right-1 z-10"
                  {...getTrophyAnimation(player.rank)}
                >
                  <div 
                    className="rounded-full p-0.5 sm:p-1 backdrop-blur-sm border"
                    style={{ 
                      backgroundColor: `${getRankColor(player.rank).replace(')', ' / 0.9)')}`,
                      borderColor: getRankColor(player.rank)
                    }}
                  >
                    <Trophy 
                      className="h-3 w-3 sm:h-4 sm:w-4" 
                      style={{ color: 'white' }}
                      fill="white"
                    />
                  </div>
                </motion.div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-bold text-xs sm:text-sm leading-tight text-foreground truncate">
                {player.displayName}
              </h3>
            </div>
          </div>
          
          {/* Money Change Badge */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{t('simulated_profit')}</span>
            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono-data font-bold text-sm sm:text-base ${
              isPositive ? 'bg-success/30 text-success border border-success/30' : 'bg-destructive/30 text-destructive border border-destructive/30'
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
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/30 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-success">
                {player.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-foreground">
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
          
          {/* Additional Stats Row */}
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/30 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t('best_streak') || '连胜'}</p>
              <p className="text-xs sm:text-sm font-bold font-mono-data text-orange-500">
                {player.bestStreak || Math.floor(Math.random() * 8) + 3}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t('roi') || '盈利率'}</p>
              <p className={`text-xs sm:text-sm font-bold font-mono-data ${player.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {player.changePercent >= 0 ? '+' : ''}{player.changePercent.toFixed(1)}%
              </p>
            </div>
            <div 
              className="text-right cursor-pointer hover:bg-accent/50 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/history?tab=player&player=${player.id}`);
              }}
              title={t('click_to_view_history') || '点击查看历史记录'}
            >
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t('today_prediction') || '今日'}</p>
              <p className="text-xs sm:text-sm font-bold font-mono-data text-sky-500 hover:underline">
                {player.todayCorrect ?? Math.floor(Math.random() * 5) + 2}/{player.todayTotal ?? Math.floor(Math.random() * 3) + 5}
              </p>
            </div>
          </div>
          
          {/* Follow Player Button */}
          <div className="pt-2 sm:pt-2.5 border-t border-border/30">
            <Button 
              onClick={handleFollowPlayer}
              className="w-full h-9 sm:h-10 bg-secondary/50 hover:bg-secondary/80 border border-border/30 font-medium text-[10px] sm:text-xs text-foreground transition-colors"
            >
              <span>{t('copy_trade_player')}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PlayerCard;

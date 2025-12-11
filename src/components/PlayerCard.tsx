import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { Trophy, Crown, Medal, TrendingUp, Target, Flame } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  
  const animatedWinRate = useCountAnimation(player.winRate, { 
    duration: 1500,
    startValue: Math.max(0, player.winRate - 15)
  });
  
  const getRankConfig = (rank: number) => {
    switch(rank) {
      case 1:
        return {
          color: 'hsl(45 70% 50%)',
          bgGradient: 'linear-gradient(135deg, hsl(45 70% 50% / 0.15), hsl(45 70% 50% / 0.05))',
          borderColor: 'hsl(45 70% 50% / 0.4)',
          icon: Crown,
          label: '🏆 Champion'
        };
      case 2:
        return {
          color: 'hsl(210 15% 65%)',
          bgGradient: 'linear-gradient(135deg, hsl(210 15% 65% / 0.15), hsl(210 15% 65% / 0.05))',
          borderColor: 'hsl(210 15% 65% / 0.4)',
          icon: Medal,
          label: '🥈 Runner-up'
        };
      case 3:
        return {
          color: 'hsl(25 40% 50%)',
          bgGradient: 'linear-gradient(135deg, hsl(25 40% 50% / 0.15), hsl(25 40% 50% / 0.05))',
          borderColor: 'hsl(25 40% 50% / 0.4)',
          icon: Trophy,
          label: '🥉 Third'
        };
      default:
        return {
          color: 'hsl(var(--muted-foreground))',
          bgGradient: 'linear-gradient(135deg, hsl(var(--muted) / 0.3), transparent)',
          borderColor: 'hsl(var(--border) / 0.3)',
          icon: Target,
          label: ''
        };
    }
  };
  
  const rankConfig = getRankConfig(player.rank);
  const RankIcon = rankConfig.icon;
  
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
  
  const formattedProfit = player.profit >= 0 
    ? `+$${player.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : `-$${Math.abs(player.profit).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: player.rank * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card 
        className="relative p-5 sm:p-6 bg-card/80 backdrop-blur-sm border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
        style={{ borderColor: rankConfig.borderColor }}
        onClick={handleCardClick}
      >
        {/* Background gradient based on rank */}
        <div 
          className="absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity duration-300"
          style={{ background: rankConfig.bgGradient }}
        />
        
        {/* Rank Badge - Top Left */}
        {player.rank <= 3 && (
          <motion.div 
            className="absolute top-3 left-3 z-20"
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border"
              style={{ 
                backgroundColor: `${rankConfig.color.replace(')', ' / 0.2)')}`,
                borderColor: rankConfig.color
              }}
            >
              <RankIcon className="h-3.5 w-3.5" style={{ color: rankConfig.color }} />
              <span className="text-xs font-bold" style={{ color: rankConfig.color }}>
                #{player.rank}
              </span>
            </div>
          </motion.div>
        )}
        
        {/* Content */}
        <div className="relative z-10 pt-8">
          {/* Avatar & Name Section */}
          <div className="flex flex-col items-center mb-4">
            <motion.div 
              className="relative mb-3"
              whileHover={{ scale: 1.05 }}
            >
              <div 
                className="absolute inset-0 rounded-full blur-md opacity-50"
                style={{ backgroundColor: rankConfig.color }}
              />
              <Avatar 
                className="w-16 h-16 sm:w-20 sm:h-20 border-3 relative"
                style={{ borderColor: rankConfig.color }}
              >
                <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                <AvatarFallback className="text-lg font-bold">{player.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
            </motion.div>
            <h3 className="font-bold text-base sm:text-lg text-foreground text-center leading-tight">
              {player.displayName}
            </h3>
          </div>
          
          {/* Win Rate Display */}
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground mb-1">{t('win_rate')}</p>
            <div className="flex items-center justify-center gap-2">
              <span 
                className="text-3xl sm:text-4xl font-bold font-mono-data"
                style={{ color: rankConfig.color }}
              >
                {animatedWinRate.toFixed(1)}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="relative h-1.5 bg-secondary/50 rounded-full overflow-hidden mt-2 mx-auto max-w-[80%]">
              <motion.div 
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ backgroundColor: rankConfig.color }}
                initial={{ width: 0 }}
                animate={{ width: `${animatedWinRate}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
          
          {/* Profit Badge */}
          <div className="flex justify-center mb-4">
            <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-mono-data font-bold text-sm ${
              isPositive 
                ? 'bg-success/20 text-success border border-success/30' 
                : 'bg-destructive/20 text-destructive border border-destructive/30'
            }`}>
              <TrendingUp className={`h-4 w-4 ${isPositive ? '' : 'rotate-180'}`} />
              {formattedProfit}
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-lg border border-border/20">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
              <p className="text-sm font-bold font-mono-data text-success">
                {player.correctPredictions}
              </p>
            </div>
            <div className="text-center border-x border-border/30">
              <p className="text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
              <p className="text-sm font-bold font-mono-data text-foreground">
                {player.totalPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">{t('wrong')}</p>
              <p className="text-sm font-bold font-mono-data text-destructive">
                {player.totalPredictions - player.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* Bottom Stats Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
            <div className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs text-muted-foreground">{t('best_streak') || '连胜'}</span>
              <span className="text-xs font-bold font-mono-data text-success">
                {player.bestStreak || Math.floor(Math.random() * 8) + 3}
              </span>
            </div>
            <div 
              className="flex items-center gap-1 cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1 -my-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/history?tab=player&player=${player.id}`);
              }}
              title={t('click_to_view_history') || '点击查看历史记录'}
            >
              <span className="text-xs text-muted-foreground">{t('today_prediction') || '今日'}</span>
              <span className="text-xs font-bold font-mono-data text-sky-500 hover:underline">
                {player.todayCorrect ?? Math.floor(Math.random() * 5) + 2}/{player.todayTotal ?? Math.floor(Math.random() * 3) + 5}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default PlayerCard;

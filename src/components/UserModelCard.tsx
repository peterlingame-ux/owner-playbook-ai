import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import TiltCard from "@/components/TiltCard";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";

interface UserStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  profit: number;
}

const USER_THEME = {
  from: "from-amber-600/15",
  to: "to-yellow-500/5",
  accent: "text-amber-400",
  border: "border-amber-500/40",
  progress: "bg-gradient-to-r from-amber-500 to-yellow-400",
};

const UserModelCard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, userProfile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats>({
    totalPredictions: 0,
    correctPredictions: 0,
    winRate: 0,
    profit: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { data: predictions } = await supabase
        .from("user_predictions")
        .select("*")
        .eq("user_id", user.id);

      if (!predictions || predictions.length === 0) {
        setStats({ totalPredictions: 0, correctPredictions: 0, winRate: 0, profit: 0 });
        return;
      }

      const total = predictions.length;
      const correct = predictions.filter((p) => p.result === "win").length;
      const totalPayout = predictions.reduce((sum, p) => sum + (p.actual_payout || 0), 0);
      const totalWagered = predictions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);

      setStats({
        totalPredictions: total,
        correctPredictions: correct,
        winRate: total > 0 ? (correct / total) * 100 : 0,
        profit: totalPayout - totalWagered,
      });
    };

    fetchStats();
  }, [user]);

  const animatedWinRate = useCountAnimation(stats.winRate, {
    duration: 1500,
    startValue: Math.max(0, stats.winRate - 15),
  });

  const isPositive = stats.profit >= 0;
  const wrongPredictions = useMemo(
    () => Math.max(0, stats.totalPredictions - stats.correctPredictions),
    [stats.totalPredictions, stats.correctPredictions]
  );

  const handleCardClick = () => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    navigate("/my-predictions");
  };

  const handlePrimaryAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      navigate("/my-predictions");
      return;
    }
    navigate("/auth");
  };

  const title = user
    ? userProfile?.display_name || t("my_exclusive_model")
    : t("demo_player");

  const profitLabel = user
    ? `${isPositive ? "+" : "-"}${Math.abs(stats.profit).toFixed(0)}`
    : "--";

  return (
    <div>
      <TiltCard
        className={`group rounded-lg sm:rounded-2xl bg-gradient-to-br ${USER_THEME.from} ${USER_THEME.to} backdrop-blur-sm border sm:border-2 ${USER_THEME.border} hover:border-amber-400/60 transition-all duration-300 overflow-hidden cursor-pointer shadow-[0_0_15px_-5px_rgba(245,158,11,0.25)] sm:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.4)]`}
        onClick={handleCardClick}
        maxTilt={6}
        scale={1.02}
        glare={false}
      >
        {/* Animated Golden Glow Effects - Hidden on mobile for performance */}
        <motion.div 
          className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none hidden sm:block"
          animate={{ 
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-16 -left-16 w-36 h-36 bg-yellow-500/15 rounded-full blur-2xl pointer-events-none hidden sm:block"
          animate={{ 
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-300/10 rounded-full blur-3xl pointer-events-none hidden sm:block"
          animate={{ 
            scale: [0.8, 1.1, 0.8],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Star Background Image - Use img with lazy loading */}
        <img
          src={starHunsoccer}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 p-1.5 sm:p-5">
          {/* Header: Model Info + Points Badge */}
          <div className="flex items-start justify-between gap-0.5 sm:gap-2 mb-1.5 sm:mb-5">
            {/* Avatar & Name */}
            <div className="flex items-center gap-1 sm:gap-3 min-w-0">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="w-6 h-6 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/10 backdrop-blur-sm flex items-center justify-center p-0.5 ring-1 sm:ring-2 ring-amber-400/40 overflow-hidden">
                  {user ? (
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={userProfile?.avatar_url || "/avatars/avatar-1.png"}
                        alt={title}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-[8px] sm:text-sm font-bold bg-amber-900/50 text-amber-200">
                        {(userProfile?.display_name || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <motion.div 
                      className="w-full h-full rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/20 flex items-center justify-center border border-dashed sm:border-2 border-amber-400/50"
                      animate={{ 
                        borderColor: ['rgba(251,191,36,0.5)', 'rgba(251,191,36,0.8)', 'rgba(251,191,36,0.5)'],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <User className="h-3 w-3 sm:h-6 sm:w-6 text-amber-400" />
                    </motion.div>
                  )}
                </div>
              </motion.div>

              <div className="min-w-0">
                <h3
                  className={`font-bold text-[9px] sm:text-lg tracking-tight uppercase ${USER_THEME.accent} truncate`}
                  title={title}
                >
                  {title}
                </h3>
              </div>
            </div>

            {/* Points Badge */}
            <div className="flex flex-col items-end gap-0.5">
              <div
                className={`px-0.5 sm:px-3 py-0.5 sm:py-1.5 rounded sm:rounded-lg font-mono font-bold text-[8px] sm:text-sm tabular-nums border inline-flex items-center gap-0.5 ${
                  user
                    ? isPositive
                      ? "bg-success/20 text-success border-success/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                    : "bg-amber-500/10 text-amber-400/50 border-amber-500/30"
                }`}
              >
                <img src={hunterCoinIcon} alt="猎人币" className="w-2 h-2 sm:w-5 sm:h-5" />
                {profitLabel}
              </div>
            </div>
          </div>

          {/* Win Rate Section */}
          <div className="mb-1.5 sm:mb-5">
            <div className="flex items-center justify-between mb-0.5 sm:mb-2">
              <span className="text-[6px] sm:text-xs text-amber-200/60 uppercase tracking-wider font-medium truncate">
                {t("win_rate")}
              </span>
              <span className="text-xs sm:text-3xl font-bold font-mono tabular-nums text-amber-300 flex-shrink-0">
                {user ? `${animatedWinRate.toFixed(1)}%` : "--%"}
              </span>
            </div>

            {/* Progress Bar - Simplified on mobile */}
            <div className="relative h-0.5 sm:h-2 bg-amber-900/30 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${USER_THEME.progress} transition-all duration-500`}
                style={{ width: `${user ? animatedWinRate : 0}%` }}
              />
              {/* Animated shine effect - Desktop only */}
              <motion.div
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent hidden sm:block"
                initial={{ x: "-100%" }}
                animate={{ x: "400%" }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-0.5 sm:gap-3 mb-1.5 sm:mb-5 p-1 sm:p-3 rounded sm:rounded-xl bg-amber-900/20 border border-amber-500/20">
            <div className="text-center min-w-0 overflow-hidden">
              <p className="text-[5px] sm:text-[10px] text-amber-200/50 uppercase tracking-wide leading-tight mb-0 font-medium truncate">{t("correct_short") || t("correct")}</p>
              <p className="text-[9px] sm:text-xl font-bold font-mono tabular-nums text-success">
                {user ? stats.correctPredictions : "--"}
              </p>
            </div>
            <div className="text-center border-x border-amber-500/20 min-w-0 overflow-hidden">
              <p className="text-[5px] sm:text-[10px] text-amber-200/50 uppercase tracking-wide leading-tight mb-0 font-medium truncate">{t("predictions_short") || t("total_predictions")}</p>
              <p className="text-[9px] sm:text-xl font-bold font-mono tabular-nums text-amber-300">
                {user ? stats.totalPredictions : "--"}
              </p>
            </div>
            <div className="text-center min-w-0 overflow-hidden">
              <p className="text-[5px] sm:text-[10px] text-amber-200/50 uppercase tracking-wide leading-tight mb-0 font-medium truncate">{t("wrong_short") || t("wrong")}</p>
              <p className="text-[9px] sm:text-xl font-bold font-mono tabular-nums text-destructive">
                {user ? wrongPredictions : "--"}
              </p>
            </div>
          </div>

          {/* Primary Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-6 sm:h-10 text-[8px] sm:text-sm font-semibold transition-all duration-300 rounded sm:rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black border-0 shadow-lg shadow-amber-500/25"
            onClick={handlePrimaryAction}
          >
            {user ? t("my_predictions") : t("login_to_create_model")}
          </Button>
        </div>
      </TiltCard>
    </div>
  );
};

export default UserModelCard;

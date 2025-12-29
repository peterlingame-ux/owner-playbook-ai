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

interface UserStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  profit: number;
}

const USER_THEME = {
  from: "from-slate-600/15",
  to: "to-zinc-500/5",
  accent: "text-slate-200",
  border: "border-slate-500/30",
  progress: "bg-gradient-to-r from-slate-400 to-zinc-300",
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
    ? `${isPositive ? "+" : "-"}${Math.abs(stats.profit).toFixed(0)} PTS`
    : "--";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <TiltCard
        className={`group rounded-2xl bg-gradient-to-br ${USER_THEME.from} ${USER_THEME.to} backdrop-blur-sm border ${USER_THEME.border} hover:border-white/30 transition-all duration-300 overflow-hidden cursor-pointer`}
        onClick={handleCardClick}
        maxTilt={6}
        scale={1.02}
        glare={false}
      >
        {/* Star Background Image */}
        <div
          className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
          style={{
            backgroundImage: `url(${starHunsoccer})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 p-4 sm:p-5">
          {/* Header: Model Info + Points Badge */}
          <div className="flex items-start justify-between gap-3 mb-5">
            {/* Avatar & Name */}
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center p-1.5 ring-2 ring-white/10 overflow-hidden">
                  {user ? (
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={userProfile?.avatar_url || "/avatars/avatar-1.png"}
                        alt={title}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-sm font-bold bg-white/10">
                        {(userProfile?.display_name || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="min-w-0">
                <h3
                  className={`font-bold text-base sm:text-lg tracking-tight uppercase ${USER_THEME.accent} truncate`}
                  title={title}
                >
                  {title}
                </h3>
              </div>
            </div>

            {/* Points Badge */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {t("simulated_profit")}
              </span>
              <div
                className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm tabular-nums border ${
                  user
                    ? isPositive
                      ? "bg-success/20 text-success border-success/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                    : "bg-white/5 text-muted-foreground border-white/10"
                }`}
              >
                {profitLabel}
              </div>
            </div>
          </div>

          {/* Win Rate Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {t("win_rate")}
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
                {user ? `${animatedWinRate.toFixed(1)}%` : "--"}
              </span>
            </div>

            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${USER_THEME.progress}`}
                initial={{ width: 0 }}
                animate={{ width: `${user ? animatedWinRate : 0}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "400%" }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">
                {t("correct")}
              </p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-success">
                {user ? stats.correctPredictions : "--"}
              </p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">
                {t("total_predictions")}
              </p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
                {user ? stats.totalPredictions : "--"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">
                {t("wrong")}
              </p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-destructive">
                {user ? wrongPredictions : "--"}
              </p>
            </div>
          </div>

          {/* Primary Button */}
          <Button
            variant="outline"
            size="sm"
            className={`w-full h-10 text-sm font-semibold transition-all duration-300 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 shadow-sm`}
            onClick={handlePrimaryAction}
          >
            {user ? t("my_predictions") : t("login_to_create_model")}
          </Button>
        </div>
      </TiltCard>
    </motion.div>
  );
};

export default UserModelCard;

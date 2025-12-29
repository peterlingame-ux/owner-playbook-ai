import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Match } from "@/types/prediction";
import { useState, useEffect } from "react";

interface WhaleDataChartProps {
  match: Match;
}

// Mock data for betting distribution
const generateBettingData = (matchId: string) => {
  return {
    homeWin: { 
      percentage: 52, 
      amount: 2850000,
      bettors: 1247,
      change: 8.5,
      trend: 'up'
    },
    draw: { 
      percentage: 18, 
      amount: 987000,
      bettors: 523,
      change: -2.3,
      trend: 'down'
    },
    awayWin: { 
      percentage: 30, 
      amount: 1643000,
      bettors: 891,
      change: 4.2,
      trend: 'up'
    },
  };
};

const WhaleDataChart = ({ match }: WhaleDataChartProps) => {
  const { t, i18n } = useTranslation();
  const data = generateBettingData(match.id);
  
  // Animation states
  const [animatedValues, setAnimatedValues] = useState({
    homeWin: 0,
    draw: 0,
    awayWin: 0,
  });
  
  const [animatedAmounts, setAnimatedAmounts] = useState({
    homeWin: 0,
    draw: 0,
    awayWin: 0,
  });

  const [animatedBettors, setAnimatedBettors] = useState({
    homeWin: 0,
    draw: 0,
    awayWin: 0,
  });

  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setAnimatedValues({
        homeWin: data.homeWin.percentage,
        draw: data.draw.percentage,
        awayWin: data.awayWin.percentage,
      });
    }, 100);

    // Animate amounts and bettors
    const duration = 2000;
    const steps = 80;
    const interval = duration / steps;
    let currentStep = 0;

    const amountInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 4); // ease-out quartic
      
      setAnimatedAmounts({
        homeWin: Math.floor(data.homeWin.amount * easeProgress),
        draw: Math.floor(data.draw.amount * easeProgress),
        awayWin: Math.floor(data.awayWin.amount * easeProgress),
      });

      setAnimatedBettors({
        homeWin: Math.floor(data.homeWin.bettors * easeProgress),
        draw: Math.floor(data.draw.bettors * easeProgress),
        awayWin: Math.floor(data.awayWin.bettors * easeProgress),
      });

      if (currentStep >= steps) {
        clearInterval(amountInterval);
      }
    }, interval);

    return () => {
      clearTimeout(timer);
      clearInterval(amountInterval);
    };
  }, [match.id]);
  
  const getTeamName = (team: 'home' | 'away') => {
    if (i18n.language === 'zh') {
      return team === 'home' 
        ? (match.homeTeamZh || match.homeTeam)
        : (match.awayTeamZh || match.awayTeam);
    }
    return team === 'home' ? match.homeTeam : match.awayTeam;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const totalAmount = animatedAmounts.homeWin + animatedAmounts.draw + animatedAmounts.awayWin;
  const totalBettors = animatedBettors.homeWin + animatedBettors.draw + animatedBettors.awayWin;

  return (
    <Card className="p-0 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 border-2 border-slate-800/50 relative overflow-hidden shadow-2xl backdrop-blur-sm">
      {/* Sophisticated Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px),
                           repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Gradient Glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-slate-800/50 bg-gradient-to-r from-slate-900/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  {t('whale_data')}
                  <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded bg-slate-800/50">{t('common.live', 'LIVE')}</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">{t('betting_distribution')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">{t('total_betting_volume')}</p>
                <p className="text-lg font-bold text-white font-mono tracking-tight">
                  {formatAmount(totalAmount)}
                </p>
              </div>
              <div className="h-10 w-px bg-slate-800" />
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">{t('total_bettors')}</p>
                <p className="text-lg font-bold text-white font-mono tracking-tight">
                  {formatNumber(totalBettors)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="px-6 py-5 space-y-4">
          {/* Home Win */}
          <div className="group">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                <span className="text-sm font-bold text-white tracking-tight">
                  {getTeamName('home')}
                </span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                  data.homeWin.trend === 'up' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {data.homeWin.trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(data.homeWin.change)}%
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono">{formatNumber(animatedBettors.homeWin)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {formatAmount(animatedAmounts.homeWin)}
                  </span>
                </div>
                <span className="text-base font-bold text-white font-mono w-12 text-right">
                  {animatedValues.homeWin.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-slate-900/50 rounded-full overflow-hidden border border-slate-800/50">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-2000 ease-out shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                style={{ width: `${animatedValues.homeWin}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          {/* Draw */}
          <div className="group">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                <span className="text-sm font-bold text-white tracking-tight">
                  {t('draw')}
                </span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                  data.draw.trend === 'up' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {data.draw.trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(data.draw.change)}%
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono">{formatNumber(animatedBettors.draw)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {formatAmount(animatedAmounts.draw)}
                  </span>
                </div>
                <span className="text-base font-bold text-white font-mono w-12 text-right">
                  {animatedValues.draw.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-slate-900/50 rounded-full overflow-hidden border border-slate-800/50">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-2000 ease-out shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                style={{ width: `${animatedValues.draw}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          {/* Away Win */}
          <div className="group">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.6)]" />
                <span className="text-sm font-bold text-white tracking-tight">
                  {getTeamName('away')}
                </span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                  data.awayWin.trend === 'up' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {data.awayWin.trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(data.awayWin.change)}%
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono">{formatNumber(animatedBettors.awayWin)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {formatAmount(animatedAmounts.awayWin)}
                  </span>
                </div>
                <span className="text-base font-bold text-white font-mono w-12 text-right">
                  {animatedValues.awayWin.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-slate-900/50 rounded-full overflow-hidden border border-slate-800/50">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-2000 ease-out shadow-[0_0_20px_rgba(251,113,133,0.4)]"
                style={{ width: `${animatedValues.awayWin}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Alert */}
        <div className="px-6 py-3 border-t border-slate-800/50 bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-400 tracking-tight">{t('whale_alert')}</p>
              <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                {t('whale_alert_desc')}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-bold text-amber-400">+5 {t('minutes_ago')}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WhaleDataChart;

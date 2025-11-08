import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { TrendingUp, Shield } from "lucide-react";
import { Match } from "@/types/prediction";
import { useState, useEffect } from "react";

interface WhaleDataChartProps {
  match: Match;
}

// Mock data for betting distribution
const generateBettingData = (matchId: string) => {
  return {
    homeWin: { percentage: 45, amount: 1250000 },
    draw: { percentage: 25, amount: 694000 },
    awayWin: { percentage: 30, amount: 833000 },
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

  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setAnimatedValues({
        homeWin: data.homeWin.percentage,
        draw: data.draw.percentage,
        awayWin: data.awayWin.percentage,
      });
    }, 100);

    // Animate amounts
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;
    let currentStep = 0;

    const amountInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      setAnimatedAmounts({
        homeWin: Math.floor(data.homeWin.amount * easeProgress),
        draw: Math.floor(data.draw.amount * easeProgress),
        awayWin: Math.floor(data.awayWin.amount * easeProgress),
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

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-br from-card/95 to-card/80 border-2 border-primary/20 relative overflow-hidden shadow-lg">
      {/* Animated Background with Gradient Mesh */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-primary/50 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_0%,transparent_50%)] opacity-20" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
              <TrendingUp className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground drop-shadow-sm">{t('whale_data')}</h3>
              <p className="text-xs text-muted-foreground">{t('betting_distribution')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-success/20 to-success/10 border border-success/30 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            <span className="text-xs font-bold text-success drop-shadow-sm">{t('live')}</span>
          </div>
        </div>

        {/* Energy Bars */}
        <div className="space-y-5">
          {/* Home Win */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-success/10 border border-success/20">
                  <Shield className="h-4 w-4 text-success drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                </div>
                <span className="text-sm sm:text-base font-bold text-foreground drop-shadow-sm">
                  {getTeamName('home')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-success drop-shadow-sm font-mono-data">
                  {formatAmount(animatedAmounts.homeWin)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {animatedValues.homeWin.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={animatedValues.homeWin} 
                className="h-4 bg-muted/50 shadow-inner transition-all duration-1500 ease-out"
                indicatorClassName="bg-gradient-to-r from-success via-success to-success/80 shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-1500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" style={{ animationDuration: '2s' }} />
            </div>
          </div>

          {/* Draw */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-warning/10 border border-warning/20">
                  <Shield className="h-4 w-4 text-warning drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
                </div>
                <span className="text-sm sm:text-base font-bold text-foreground drop-shadow-sm">
                  {t('draw')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-warning drop-shadow-sm font-mono-data">
                  {formatAmount(animatedAmounts.draw)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {animatedValues.draw.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={animatedValues.draw} 
                className="h-4 bg-muted/50 shadow-inner transition-all duration-1500 ease-out"
                indicatorClassName="bg-gradient-to-r from-warning via-warning to-warning/80 shadow-[0_0_12px_rgba(234,179,8,0.5)] transition-all duration-1500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
            </div>
          </div>

          {/* Away Win */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <Shield className="h-4 w-4 text-destructive drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                </div>
                <span className="text-sm sm:text-base font-bold text-foreground drop-shadow-sm">
                  {getTeamName('away')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-destructive drop-shadow-sm font-mono-data">
                  {formatAmount(animatedAmounts.awayWin)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {animatedValues.awayWin.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={animatedValues.awayWin} 
                className="h-4 bg-muted/50 shadow-inner transition-all duration-1500 ease-out"
                indicatorClassName="bg-gradient-to-r from-destructive via-destructive to-destructive/80 shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-all duration-1500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>

        {/* Whale Alert */}
        <div className="mt-5 p-3.5 rounded-xl bg-gradient-to-r from-warning/15 via-warning/10 to-warning/5 border border-warning/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-warning/20 shadow-lg">
              <TrendingUp className="h-4 w-4 text-warning animate-pulse drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-warning mb-1 drop-shadow-sm">{t('whale_alert')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('whale_alert_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WhaleDataChart;

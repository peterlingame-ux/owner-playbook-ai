import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { TrendingUp, Shield } from "lucide-react";
import { Match } from "@/types/prediction";

interface WhaleDataChartProps {
  match: Match;
}

// Mock data for betting distribution
const generateBettingData = (matchId: string) => {
  return {
    homeWin: { percentage: 45, amount: "$1.25M" },
    draw: { percentage: 25, amount: "$694K" },
    awayWin: { percentage: 30, amount: "$833K" },
  };
};

const WhaleDataChart = ({ match }: WhaleDataChartProps) => {
  const { t, i18n } = useTranslation();
  const data = generateBettingData(match.id);
  
  const getTeamName = (team: 'home' | 'away') => {
    if (i18n.language === 'zh') {
      return team === 'home' 
        ? (match.homeTeamZh || match.homeTeam)
        : (match.awayTeamZh || match.awayTeam);
    }
    return team === 'home' ? match.homeTeam : match.awayTeam;
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card/95 to-card/80 border-2 border-primary/20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{t('whale_data')}</h3>
              <p className="text-xs text-muted-foreground">{t('betting_distribution')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 border border-success/20">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-bold text-success">{t('live')}</span>
          </div>
        </div>

        {/* Energy Bars */}
        <div className="space-y-4">
          {/* Home Win */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                <span className="text-sm font-bold text-foreground">
                  {getTeamName('home')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-success">{data.homeWin.amount}</span>
                <span className="text-xs text-muted-foreground">{data.homeWin.percentage}%</span>
              </div>
            </div>
            <Progress 
              value={data.homeWin.percentage} 
              className="h-3 bg-muted"
              indicatorClassName="bg-gradient-to-r from-success to-success/80"
            />
          </div>

          {/* Draw */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-warning" />
                <span className="text-sm font-bold text-foreground">
                  {t('draw')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-warning">{data.draw.amount}</span>
                <span className="text-xs text-muted-foreground">{data.draw.percentage}%</span>
              </div>
            </div>
            <Progress 
              value={data.draw.percentage} 
              className="h-3 bg-muted"
              indicatorClassName="bg-gradient-to-r from-warning to-warning/80"
            />
          </div>

          {/* Away Win */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="text-sm font-bold text-foreground">
                  {getTeamName('away')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-destructive">{data.awayWin.amount}</span>
                <span className="text-xs text-muted-foreground">{data.awayWin.percentage}%</span>
              </div>
            </div>
            <Progress 
              value={data.awayWin.percentage} 
              className="h-3 bg-muted"
              indicatorClassName="bg-gradient-to-r from-destructive to-destructive/80"
            />
          </div>
        </div>

        {/* Whale Alert */}
        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <div className="flex items-start gap-2">
            <div className="p-1 rounded bg-warning/20">
              <TrendingUp className="h-3 w-3 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-warning mb-1">{t('whale_alert')}</p>
              <p className="text-xs text-muted-foreground">
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

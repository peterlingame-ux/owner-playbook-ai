import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { TrendingUp, Users, DollarSign } from "lucide-react";

interface WhaleDataChartProps {
  matchId: string;
}

// Mock data for betting distribution
const generateBettingData = (matchId: string) => {
  return [
    { name: "home_win", value: 45, amount: "$1,250,000", color: "hsl(var(--success))" },
    { name: "away_win", value: 30, amount: "$833,333", color: "hsl(var(--destructive))" },
    { name: "draw", value: 25, amount: "$694,444", color: "hsl(var(--warning))" },
  ];
};

const WhaleDataChart = ({ matchId }: WhaleDataChartProps) => {
  const { t } = useTranslation();
  const data = generateBettingData(matchId);
  
  const totalAmount = data.reduce((sum, item) => {
    const amount = parseFloat(item.amount.replace(/[$,]/g, ''));
    return sum + amount;
  }, 0);

  const formatAmount = (value: string) => {
    return value;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm font-bold text-foreground mb-1">
            {t(payload[0].name)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('bet_amount')}: {payload[0].payload.amount}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('percentage')}: {payload[0].value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-col gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div 
            key={`item-${index}`} 
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-medium text-foreground">
                {t(entry.value)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground">
                {data[index].amount}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.payload.value.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card/95 to-card/80 border-2 border-primary/20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-transparent" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary)) 10px, hsl(var(--primary)) 11px)',
          opacity: 0.1
        }} />
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

        {/* Total Amount Card */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t('total_betting_volume')}</p>
                <p className="text-lg font-bold text-foreground font-mono-data">
                  ${(totalAmount / 1000000).toFixed(2)}M
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-success">
              <Users className="h-4 w-4" />
              <span className="text-xs font-bold">2,847</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={50}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4">
          <CustomLegend payload={data.map((item, index) => ({ 
            value: item.name, 
            color: item.color,
            payload: data[index]
          }))} />
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

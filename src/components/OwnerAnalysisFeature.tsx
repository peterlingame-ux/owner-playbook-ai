import { useTranslation } from "react-i18next";
import { TrendingUp, Users, Heart, Building2, Newspaper, BadgeDollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";

const OwnerAnalysisFeature = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: BadgeDollarSign,
      key: "owner_consideration_1",
      color: "text-[hsl(var(--chart-1))]"
    },
    {
      icon: Building2,
      key: "owner_consideration_2",
      color: "text-[hsl(var(--chart-3))]"
    },
    {
      icon: Heart,
      key: "owner_consideration_3",
      color: "text-[hsl(var(--chart-5))]"
    },
    {
      icon: Users,
      key: "owner_consideration_4",
      color: "text-[hsl(var(--chart-4))]"
    },
    {
      icon: Newspaper,
      key: "owner_consideration_5",
      color: "text-[hsl(var(--chart-3))]"
    }
  ];

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-accent/20 border-2 border-[hsl(var(--chart-1))]/30 backdrop-blur">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--chart-1))]/5 via-transparent to-[hsl(var(--chart-4))]/5 animate-gradient" />
      
      <div className="relative p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[hsl(var(--chart-1))] to-[hsl(var(--chart-4))] flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-[hsl(var(--chart-1))] via-[hsl(var(--chart-4))] to-[hsl(var(--chart-1))] bg-clip-text text-transparent mb-1 sm:mb-2">
              {t('owner_based_analysis')}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t('owner_based_text1')}
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm font-semibold text-foreground/80 uppercase tracking-wide">
            {t('owner_based_text2')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-background/50 border border-border/50 hover:border-[hsl(var(--chart-1))]/50 transition-all duration-300 hover:bg-background/80"
                >
                  <div className={`flex-shrink-0 ${feature.color}`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p className="text-xs text-foreground/70 leading-snug flex-1">
                    {t(feature.key)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to action */}
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gradient-to-r from-[hsl(var(--chart-1))]/10 via-[hsl(var(--chart-4))]/10 to-[hsl(var(--chart-1))]/10 border border-[hsl(var(--chart-1))]/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse shadow-lg shadow-[hsl(var(--success))]/50" />
            <span className="text-xs sm:text-sm font-medium text-foreground/90">
              {t('owner_analysis_warning')}
            </span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-[hsl(var(--chart-1))] uppercase tracking-wider">
            {t('ai_assistant_subtitle')}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default OwnerAnalysisFeature;

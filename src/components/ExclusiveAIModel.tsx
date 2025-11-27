import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { TrendingUp, Sparkles, Crown, Lock } from "lucide-react";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import hunsoccerMaxCardBg from "@/assets/hunsoccer-max-card-bg.png";

const ExclusiveAIModel = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full mb-6 sm:mb-8">
      <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 px-2">
        <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-center text-white flex items-center gap-2">
          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          {t('exclusive_ai_model')}
          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
        </h2>
      </div>

      {/* Horizontal Card Layout */}
      <Card className="relative w-full overflow-hidden border-2 border-yellow-500/50 hover:border-yellow-500/80 transition-all duration-500 bg-gradient-to-r from-card/95 via-card to-card/90 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)]">
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${hunsoccerMaxCardBg})` }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-orange-500/10" />
        
        {/* Sparkle Effects */}
        <div className="absolute top-2 left-2 animate-pulse">
          <Sparkles className="h-4 w-4 text-yellow-500/60" />
        </div>
        <div className="absolute top-2 right-2 animate-pulse delay-300">
          <Sparkles className="h-4 w-4 text-yellow-500/60" />
        </div>
        <div className="absolute bottom-2 left-1/4 animate-pulse delay-500">
          <Sparkles className="h-3 w-3 text-orange-500/40" />
        </div>
        <div className="absolute bottom-2 right-1/4 animate-pulse delay-700">
          <Sparkles className="h-3 w-3 text-orange-500/40" />
        </div>

        {/* Content - Horizontal Layout */}
        <div className="relative z-10 p-4 sm:p-6 flex flex-row items-center gap-4 sm:gap-6">
          {/* Left: AI Avatar & Info */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-md opacity-60 animate-pulse" />
              <Avatar className="relative h-16 w-16 sm:h-20 sm:w-20 border-2 border-yellow-500/60">
                <AvatarImage src={hunsoccerIcon} alt="HunSoccer MAX" />
                <AvatarFallback className="bg-yellow-500/20 text-yellow-500 font-bold">HS</AvatarFallback>
              </Avatar>
              <Badge className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5">
                VIP
              </Badge>
            </div>
            
            <div className="flex flex-col gap-1">
              <h3 className="text-lg sm:text-xl font-bold text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
                HunSoccer MAX
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t('exclusive_ai_desc')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  95%+ {t('win_rate')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Center: Stats */}
          <div className="flex-1 hidden sm:flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-500 font-mono-data">$50,000</div>
              <div className="text-xs text-muted-foreground">{t('simulated_profit')}</div>
            </div>
            <div className="w-px h-12 bg-yellow-500/30" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-500 font-mono-data">+320%</div>
              <div className="text-xs text-muted-foreground">{t('roi')}</div>
            </div>
            <div className="w-px h-12 bg-yellow-500/30" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono-data">1,200</div>
              <div className="text-xs text-muted-foreground">{t('total_predictions')}</div>
            </div>
          </div>

          {/* Right: CTA Button */}
          <div className="shrink-0">
            <Button 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 shadow-lg hover:shadow-yellow-500/30 transition-all duration-300"
              disabled
            >
              <Lock className="h-4 w-4 mr-2" />
              {t('coming_soon')}
            </Button>
          </div>
        </div>

        {/* Mobile Stats Row */}
        <div className="relative z-10 px-4 pb-4 flex sm:hidden items-center justify-around gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-500 font-mono-data">$50K</div>
            <div className="text-[10px] text-muted-foreground">{t('profit')}</div>
          </div>
          <div className="w-px h-8 bg-yellow-500/30" />
          <div className="text-center">
            <div className="text-lg font-bold text-green-500 font-mono-data">+320%</div>
            <div className="text-[10px] text-muted-foreground">{t('roi')}</div>
          </div>
          <div className="w-px h-8 bg-yellow-500/30" />
          <div className="text-center">
            <div className="text-lg font-bold text-white font-mono-data">1.2K</div>
            <div className="text-[10px] text-muted-foreground">{t('predictions')}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ExclusiveAIModel;

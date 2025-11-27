import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { TrendingUp, Sparkles, Crown, Lock, Zap, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import hunsoccerMaxCardBg from "@/assets/hunsoccer-max-card-bg.png";

const ExclusiveAIModel = () => {
  const { t } = useTranslation();
  const [feedLevel, setFeedLevel] = useState(65);
  const [isFeeding, setIsFeeding] = useState(false);

  const handleFeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (feedLevel >= 100) {
      toast({
        title: t('model_full'),
        description: t('model_full_desc'),
      });
      return;
    }
    
    setIsFeeding(true);
    setTimeout(() => {
      setFeedLevel(prev => Math.min(prev + 10, 100));
      setIsFeeding(false);
      toast({
        title: t('feed_success'),
        description: t('feed_success_desc'),
      });
    }, 500);
  };

  return (
    <div className="w-full mb-6 sm:mb-8">
      <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 px-2">
        <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-center text-white flex items-center gap-2">
          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          {t('exclusive_ai_model')}
          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
        </h2>
      </div>

      {/* Horizontal Card - Same style as ActiveAIBets cards */}
      <div className="relative rounded-xl p-3 sm:p-4 bg-gradient-to-br from-card/95 via-card to-card/90 hover:shadow-2xl transition-all duration-500 border-2 border-yellow-500/50 hover:border-yellow-500/80 overflow-hidden group">
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-500"
          style={{
            backgroundImage: `url(${hunsoccerMaxCardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundPositionY: '-20px',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        {/* Diagonal Stripe Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-transparent to-transparent" />
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(45, 93%, 47%) 10px, hsl(45, 93%, 47%) 11px)',
            opacity: 0.1
          }} />
        </div>
        
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-br from-yellow-500/20 via-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        
        {/* Sparkle Effects */}
        <div className="absolute top-2 right-2 animate-pulse z-20">
          <Sparkles className="h-4 w-4 text-yellow-500/60" />
        </div>

        {/* VIP Badge - Top Left */}
        <Badge className="absolute top-2 left-2 z-20 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-bold px-2 py-0.5">
          <Crown className="h-3 w-3 mr-1" />
          VIP
        </Badge>

        {/* Content - Horizontal Layout */}
        <div className="relative z-10 flex flex-row items-center gap-4 sm:gap-6">
          {/* Left: Avatar Section - Same as ActiveAIBets */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 pb-2 border-r-2 border-yellow-500/20 pr-4 sm:pr-6">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-yellow-500/40 shadow-2xl group-hover:ring-yellow-500/60 transition-all">
              <AvatarImage src={hunsoccerIcon} alt="HunSoccer MAX" className="object-cover" />
              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-yellow-500 to-orange-500">HS</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('wallet_balance')}</span>
              <Badge variant="outline" className="text-xs sm:text-sm font-mono-data font-bold px-2 py-0.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 text-yellow-500">
                $50,000
              </Badge>
            </div>
          </div>

          {/* Center: Stats & Info */}
          <div className="flex-1 space-y-2 sm:space-y-3">
            {/* Model Name */}
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
                HunSoccer MAX
              </h3>
              <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-500 border-green-500/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                95%+
              </Badge>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-green-500 font-mono-data">+$40,000</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">{t('simulated_profit')}</div>
              </div>
              <div className="w-px h-8 bg-yellow-500/30" />
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-green-500 font-mono-data">+400%</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">{t('roi')}</div>
              </div>
              <div className="w-px h-8 bg-yellow-500/30" />
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-white font-mono-data">1,200</div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">{t('total_predictions')}</div>
              </div>
            </div>

            {/* Feed Level Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-500" />
                  {t('model_energy')}
                </span>
                <span className="text-[10px] sm:text-xs font-mono-data text-yellow-500">{feedLevel}%</span>
              </div>
              <Progress 
                value={feedLevel} 
                className="h-2 bg-muted/50"
              />
            </div>
          </div>

          {/* Right: Feed Button */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Button 
              className={`bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 shadow-lg hover:shadow-yellow-500/30 transition-all duration-300 ${isFeeding ? 'animate-pulse' : ''}`}
              onClick={handleFeed}
              disabled={isFeeding}
            >
              <Zap className={`h-4 w-4 mr-1 ${isFeeding ? 'animate-spin' : ''}`} />
              {t('feed_model')}
            </Button>
            <Button 
              variant="outline"
              className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 text-xs px-3 py-1"
              disabled
            >
              <Lock className="h-3 w-3 mr-1" />
              {t('coming_soon')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExclusiveAIModel;

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, User, PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Star background images
import starMessi from "@/assets/star-messi.jpg";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

interface UserStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  profit: number;
}

type StarType = 'messi' | 'ronaldo' | 'mbappe' | 'haaland' | 'neymar' | 'hunsoccer';

const starBackgrounds: Record<StarType, { image: string; name: string; color: string }> = {
  messi: { image: starMessi, name: '梅西', color: 'hsl(210 80% 55%)' },
  ronaldo: { image: starRonaldo, name: 'C罗', color: 'hsl(0 70% 50%)' },
  mbappe: { image: starMbappe, name: '姆巴佩', color: 'hsl(220 70% 50%)' },
  haaland: { image: starHaaland, name: '哈兰德', color: 'hsl(200 80% 50%)' },
  neymar: { image: starNeymar, name: '内马尔', color: 'hsl(50 80% 50%)' },
  hunsoccer: { image: starHunsoccer, name: '胡恩索克', color: 'hsl(270 70% 60%)' },
};

const starOrder: StarType[] = ['messi', 'ronaldo', 'mbappe', 'haaland', 'neymar', 'hunsoccer'];

const UserModelCard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<{ display_name: string; avatar_url: string } | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalPredictions: 0,
    correctPredictions: 0,
    winRate: 0,
    profit: 0
  });
  const [selectedStar, setSelectedStar] = useState<StarType>('neymar');

  useEffect(() => {
    if (user) {
      // Fetch user profile
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('users')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setUserProfile(data);
      };

      // Fetch user predictions stats
      const fetchStats = async () => {
        const { data: predictions } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id);

        if (predictions && predictions.length > 0) {
          const total = predictions.length;
          const correct = predictions.filter(p => p.result === 'win').length;
          const totalPayout = predictions.reduce((sum, p) => sum + (p.actual_payout || 0), 0);
          const totalWagered = predictions.reduce((sum, p) => sum + (p.bet_amount || 0), 0);
          
          setStats({
            totalPredictions: total,
            correctPredictions: correct,
            winRate: total > 0 ? (correct / total) * 100 : 0,
            profit: totalPayout - totalWagered
          });
        }
      };

      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const animatedWinRate = useCountAnimation(stats.winRate, { 
    duration: 1500,
    startValue: 0
  });

  const handleActivate = () => {
    navigate('/auth');
  };

  const handleCardClick = () => {
    if (user) {
      navigate('/my-predictions');
    } else {
      navigate('/auth');
    }
  };

  const handlePrevStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = starOrder.indexOf(selectedStar);
    const prevIndex = (currentIndex - 1 + starOrder.length) % starOrder.length;
    setSelectedStar(starOrder[prevIndex]);
  };

  const handleNextStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = starOrder.indexOf(selectedStar);
    const nextIndex = (currentIndex + 1) % starOrder.length;
    setSelectedStar(starOrder[nextIndex]);
  };

  const currentStar = starBackgrounds[selectedStar];
  const colorTint = { hue: '270deg', color: currentStar.color };

  // Non-logged-in user view
  if (!user && !authLoading) {
    return (
      <Card 
        className="relative p-4 sm:p-5 lg:p-6 bg-card border-border/30 hover:border-border/50 transition-all cursor-pointer group overflow-hidden"
        onClick={handleActivate}
      >
        {/* Star Background Image */}
        <div 
          className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-all duration-500"
          style={{
            backgroundImage: `url(${currentStar.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        
        {/* Gradient Overlay for Content Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />
        
        {/* Star Selector */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/60 backdrop-blur-sm rounded-full px-1.5 py-0.5">
          <button 
            onClick={handlePrevStar}
            className="p-0.5 hover:bg-secondary/50 rounded-full transition-colors"
          >
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <span className="text-[10px] font-medium text-foreground min-w-[40px] text-center">{currentStar.name}</span>
          <button 
            onClick={handleNextStar}
            className="p-0.5 hover:bg-secondary/50 rounded-full transition-colors"
          >
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-card shrink-0 border-2 border-dashed border-muted-foreground/30"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h3 className="font-bold text-xs sm:text-sm leading-tight text-foreground truncate">
                  我的专属模型
                </h3>
              </div>
            </div>
            
            {/* Placeholder Badge */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{t('simulated_profit')}</span>
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono-data font-bold text-sm sm:text-base bg-secondary/50 text-muted-foreground border border-border/30">
                --
              </div>
            </div>
          </div>
          
          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t('win_rate')}</span>
                <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all text-muted-foreground">
                  --%
                </span>
              </div>
              
              {/* Win Rate Progress Bar */}
              <div className="relative h-2 sm:h-2.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 w-0"
                  style={{ backgroundColor: colorTint.color }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/30 gap-2">
              <div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
                <p className="text-base sm:text-lg font-bold font-mono-data text-muted-foreground">
                  --
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
                <p className="text-base sm:text-lg font-bold font-mono-data text-muted-foreground">
                  --
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('wrong')}</p>
                <p className="text-base sm:text-lg font-bold font-mono-data text-muted-foreground">
                  --
                </p>
              </div>
            </div>
            
            {/* Activate Button */}
            <div className="pt-2 sm:pt-2.5 border-t border-border/30">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivate();
                }}
                className="w-full h-9 sm:h-10 bg-secondary/50 hover:bg-secondary/80 border border-border/30 font-medium text-[10px] sm:text-xs text-foreground transition-colors"
              >
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <Sparkles size={13} className="sm:w-[14px] sm:h-[14px]" />
                  <span>免费激活专属模型</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Logged-in user view
  return (
    <Card 
      className="relative p-4 sm:p-5 lg:p-6 bg-card border-border/30 hover:border-border/50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Star Background Image */}
      <div 
        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-all duration-500"
        style={{
          backgroundImage: `url(${currentStar.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      />
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />
      
      {/* Star Selector */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/60 backdrop-blur-sm rounded-full px-1.5 py-0.5">
        <button 
          onClick={handlePrevStar}
          className="p-0.5 hover:bg-secondary/50 rounded-full transition-colors"
        >
          <ChevronLeft size={14} className="text-muted-foreground" />
        </button>
        <span className="text-[10px] font-medium text-foreground min-w-[40px] text-center">{currentStar.name}</span>
        <button 
          onClick={handleNextStar}
          className="p-0.5 hover:bg-secondary/50 rounded-full transition-colors"
        >
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 p-0.5 bg-card"
              style={{ border: `2px solid ${currentStar.color}` }}
            >
              <Avatar className="w-full h-full">
                <AvatarImage src={userProfile?.avatar_url || '/avatars/avatar-1.png'} />
                <AvatarFallback className="bg-secondary text-foreground">
                  {userProfile?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-bold text-xs sm:text-sm leading-tight text-foreground truncate">
                {userProfile?.display_name || '我的模型'}
              </h3>
            </div>
          </div>
          
          {/* Profit Badge */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{t('simulated_profit')}</span>
            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono-data font-bold text-sm sm:text-base ${
              stats.profit >= 0 ? 'bg-success/30 text-success border border-success/30' : 'bg-destructive/30 text-destructive border border-destructive/30'
            }`}>
              {stats.profit >= 0 ? '+' : ''}${Math.abs(stats.profit).toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="space-y-2.5 sm:space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{t('win_rate')}</span>
              <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all text-foreground">
                {animatedWinRate.toFixed(1)}%
              </span>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="relative h-2 sm:h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${animatedWinRate}%`,
                  backgroundColor: currentStar.color
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/30 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-success">
                {stats.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-foreground">
                {stats.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('wrong')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-destructive">
                {stats.totalPredictions - stats.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* View Predictions Button */}
          <div className="pt-2 sm:pt-2.5 border-t border-border/30">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/my-predictions');
              }}
              className="w-full h-9 sm:h-10 bg-secondary/50 hover:bg-secondary/80 border border-border/30 font-medium text-[10px] sm:text-xs text-foreground transition-colors"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <PlayCircle size={13} className="sm:w-[14px] sm:h-[14px]" />
                <span>查看预测记录</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserModelCard;

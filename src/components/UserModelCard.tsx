import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, User, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import footballFieldBg from "@/assets/football-field-bg.jpg";

interface UserStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  profit: number;
}

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

  const colorTint = { hue: '270deg', color: 'hsl(270 70% 60%)' };

  // Non-logged-in user view
  if (!user && !authLoading) {
    return (
      <Card 
        className="relative p-4 sm:p-5 lg:p-6 bg-card border-border hover:border-opacity-50 transition-all cursor-pointer group overflow-hidden min-h-[280px] flex flex-col"
        onClick={handleActivate}
        style={{ borderColor: 'hsl(270 70% 60% / 0.3)' }}
      >
        {/* Gradient background */}
        <div 
          className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 30% 50%, ${colorTint.color}, transparent 70%)`
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4">
            <User className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
          </div>
          
          <h3 className="text-sm sm:text-base font-semibold text-white mb-2">
            我的专属模型
          </h3>
          
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 leading-relaxed">
            创建账号后激活属于你的<br />专属AI预测模型
          </p>
          
          <Button 
            className="w-full relative overflow-hidden group/btn border font-bold text-[10px] sm:text-xs hover:scale-105 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              handleActivate();
            }}
            style={{
              background: `linear-gradient(to right, hsl(270 70% 60% / 0.18), hsl(270 70% 60% / 0.08))`,
              borderColor: 'hsl(270 70% 60% / 0.3)',
              color: 'hsl(255 100% 100%)',
            }}
          >
            {/* Football field pattern overlay */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url(${footballFieldBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative flex items-center justify-center gap-1.5 sm:gap-2">
              <Sparkles className="w-4 h-4 group-hover/btn:animate-pulse" />
              <span>免费激活专属模型</span>
            </div>
            {/* Animated shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </Button>
        </div>
      </Card>
    );
  }

  // Logged-in user view
  return (
    <Card 
      className="relative p-4 sm:p-5 lg:p-6 bg-card border-border hover:border-opacity-50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
      style={{ borderColor: 'hsl(270 70% 60% / 0.3)' }}
    >
      {/* AI Brand Color Overlay */}
      <div 
        className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${colorTint.color}, transparent 70%)`
        }}
      />
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 p-0.5 bg-card"
              style={{ border: '2px solid hsl(270 70% 60%)' }}
            >
              <Avatar className="w-full h-full">
                <AvatarImage src={userProfile?.avatar_url || '/avatars/avatar-1.png'} />
                <AvatarFallback className="bg-secondary text-white">
                  {userProfile?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-bold text-xs sm:text-sm leading-tight text-white truncate">
                {userProfile?.display_name || '我的模型'}
              </h3>
              <span className="text-[10px]" style={{ color: 'hsl(270 70% 60%)' }}>专属模型</span>
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
              <span className="text-[10px] sm:text-xs text-white">{t('win_rate')}</span>
              <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all text-white">
                {animatedWinRate.toFixed(1)}%
              </span>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="relative h-2 sm:h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${animatedWinRate}%`,
                  backgroundColor: 'hsl(270 70% 60%)'
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/50 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-white mb-0.5">{t('correct')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-success">
                {stats.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-white mb-0.5">{t('total_predictions')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data">
                {stats.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-white mb-0.5">{t('wrong')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-destructive">
                {stats.totalPredictions - stats.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* View Predictions Button */}
          <div className="pt-2 sm:pt-2.5 border-t border-border/50">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/my-predictions');
              }}
              className="w-full h-9 sm:h-10 relative overflow-hidden group/btn border font-bold text-[10px] sm:text-xs hover:scale-105 transition-transform"
              style={{
                background: `linear-gradient(to right, hsl(270 70% 60% / 0.18), hsl(270 70% 60% / 0.08))`,
                borderColor: 'hsl(270 70% 60% / 0.3)',
                color: 'hsl(255 100% 100%)',
              }}
            >
              {/* Football field pattern overlay */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url(${footballFieldBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              
              <div className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                <PlayCircle size={13} className="sm:w-[14px] sm:h-[14px] group-hover/btn:animate-pulse" />
                <span>查看预测记录</span>
              </div>
              
              {/* Animated shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserModelCard;

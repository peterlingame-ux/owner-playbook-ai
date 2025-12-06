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
import { motion } from "framer-motion";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

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

  const colorTint = { hue: '45deg', color: 'hsl(45 100% 50%)' }; // Golden color

  // Non-logged-in user view
  if (!user && !authLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card 
          className="relative p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-amber-950/40 via-card to-amber-900/20 border-2 border-amber-500/50 hover:border-amber-400/70 transition-all cursor-pointer group overflow-hidden shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.5)]"
          onClick={handleActivate}
        >
          {/* Animated glow effect */}
          <motion.div 
            className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/15 rounded-full blur-2xl pointer-events-none"
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          {/* Star Background Image */}
          <div 
            className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-300"
            style={{
              backgroundImage: `url(${starHunsoccer})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          />
          
          {/* Gradient Overlay for Content Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/70 to-transparent" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Exclusive Badge */}

            <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
                <motion.div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-yellow-600/20 shrink-0 border-2 border-dashed border-amber-400/50"
                  animate={{ 
                    borderColor: ['rgba(251,191,36,0.5)', 'rgba(251,191,36,0.8)', 'rgba(251,191,36,0.5)'],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                </motion.div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h3 className="font-semibold text-sm sm:text-base leading-tight text-amber-300 truncate tracking-tight">
                    {t('demo_player') || '体验玩家'}
                  </h3>
                </div>
              </div>
              
              {/* Placeholder Badge */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <span className="text-[10px] sm:text-xs font-medium text-amber-200/70 uppercase tracking-wide whitespace-nowrap">{t('simulated_profit')}</span>
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-mono-data font-medium text-sm sm:text-base tabular-nums bg-amber-500/10 text-amber-400/50 border border-amber-500/30">
                  --
                </div>
              </div>
            </div>
            
            <div className="space-y-2.5 sm:space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-[10px] sm:text-xs text-amber-200/60 uppercase tracking-wide">{t('win_rate')}</span>
                  <span className="text-xl sm:text-2xl font-semibold font-mono-data transition-all text-amber-400/50 tabular-nums">
                    --%
                  </span>
                </div>
                
                {/* Win Rate Progress Bar */}
                <div className="relative h-2 sm:h-2.5 bg-amber-900/30 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 w-0 bg-gradient-to-r from-amber-500 to-yellow-400"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-amber-500/20 gap-2">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-1 uppercase tracking-wide">{t('correct')}</p>
                  <p className="text-base sm:text-lg font-medium font-mono-data text-amber-400/50 tabular-nums">
                    --
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-1 uppercase tracking-wide">{t('total_predictions')}</p>
                  <p className="text-base sm:text-lg font-medium font-mono-data text-amber-400/50 tabular-nums">
                    --
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-1 uppercase tracking-wide">{t('wrong')}</p>
                  <p className="text-base sm:text-lg font-medium font-mono-data text-amber-400/50 tabular-nums">
                    --
                  </p>
                </div>
              </div>
              
              {/* Activate Button */}
              <div className="pt-2 sm:pt-2.5 border-t border-amber-500/20">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivate();
                  }}
                  className="w-full h-9 sm:h-10 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold text-[10px] sm:text-xs transition-all shadow-lg shadow-amber-500/25"
                >
                  <span>{t('login_to_create_model') || '登录后生成专属模型'}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Logged-in user view
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card 
        className="relative p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-amber-950/40 via-card to-amber-900/20 border-2 border-amber-500/50 hover:border-amber-400/70 transition-all cursor-pointer group overflow-hidden shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.5)]"
        onClick={handleCardClick}
      >
        {/* Animated glow effect */}
        <motion.div 
          className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/15 rounded-full blur-2xl pointer-events-none"
          animate={{ 
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Star Background Image */}
        <div 
          className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-300"
          style={{
            backgroundImage: `url(${starHunsoccer})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        
        {/* Gradient Overlay for Content Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/70 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Exclusive Badge */}

          <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
              <motion.div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 p-0.5"
                style={{ 
                  background: 'linear-gradient(135deg, #f59e0b, #eab308, #f59e0b)',
                  boxShadow: '0 0 15px rgba(245,158,11,0.5)'
                }}
                animate={{ 
                  boxShadow: ['0 0 15px rgba(245,158,11,0.5)', '0 0 25px rgba(245,158,11,0.7)', '0 0 15px rgba(245,158,11,0.5)'],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Avatar className="w-full h-full">
                  <AvatarImage src={userProfile?.avatar_url || '/avatars/avatar-1.png'} />
                  <AvatarFallback className="bg-amber-900 text-amber-200">
                    {userProfile?.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-sm sm:text-base leading-tight text-amber-300 truncate tracking-tight">
                  {userProfile?.display_name ? `${userProfile.display_name}的模型` : t('my_exclusive_model') || '我的专属模型'}
                </h3>
              </div>
            </div>
            
            {/* Profit Badge */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className="text-[10px] sm:text-xs font-medium text-amber-200/70 uppercase tracking-wide whitespace-nowrap">{t('simulated_profit')}</span>
              <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-mono-data font-medium text-sm sm:text-base tabular-nums ${
                stats.profit >= 0 ? 'bg-success/20 text-success border border-success/20' : 'bg-destructive/20 text-destructive border border-destructive/20'
              }`}>
                {stats.profit >= 0 ? '+' : ''}${Math.abs(stats.profit).toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs text-amber-200/60 uppercase tracking-wide">{t('win_rate')}</span>
                <span className="text-xl sm:text-2xl font-semibold font-mono-data transition-all text-amber-300 tabular-nums">
                  {animatedWinRate.toFixed(1)}%
                </span>
              </div>
              
              {/* Win Rate Progress Bar */}
              <div className="relative h-2 sm:h-2.5 bg-amber-900/30 rounded-full overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${animatedWinRate}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-amber-500/20 gap-2">
              <div>
                <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-1 uppercase tracking-wide">{t('correct')}</p>
                <p className="text-base sm:text-lg font-medium font-mono-data text-success tabular-nums">
                  {stats.correctPredictions}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-1 uppercase tracking-wide">{t('total_predictions')}</p>
                <p className="text-base sm:text-lg font-medium font-mono-data text-amber-300 tabular-nums">
                  {stats.totalPredictions}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-1 uppercase tracking-wide">{t('wrong')}</p>
                <p className="text-base sm:text-lg font-medium font-mono-data text-destructive tabular-nums">
                  {stats.totalPredictions - stats.correctPredictions}
                </p>
              </div>
            </div>
            
            {/* View Predictions Button */}
            <div className="pt-2 sm:pt-2.5 border-t border-amber-500/20">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/my-predictions');
                }}
                className="w-full h-9 sm:h-10 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-bold text-[10px] sm:text-xs transition-all shadow-lg shadow-amber-500/25"
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
    </motion.div>
  );
};

export default UserModelCard;

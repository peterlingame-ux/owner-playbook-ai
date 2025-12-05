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
        className="relative"
      >
        {/* Animated rotating border */}
        <motion.div
          className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 opacity-75 blur-sm"
          animate={{ 
            background: [
              'linear-gradient(0deg, #f59e0b, #fcd34d, #f97316)',
              'linear-gradient(90deg, #f59e0b, #fcd34d, #f97316)',
              'linear-gradient(180deg, #f59e0b, #fcd34d, #f97316)',
              'linear-gradient(270deg, #f59e0b, #fcd34d, #f97316)',
              'linear-gradient(360deg, #f59e0b, #fcd34d, #f97316)',
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        
        <Card 
          className="relative p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-amber-950/60 via-card to-amber-900/30 border-2 border-amber-400/60 hover:border-amber-300 transition-all cursor-pointer group overflow-hidden"
          onClick={handleActivate}
        >
          {/* Sparkle particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full pointer-events-none"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [0, -20, -40],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* Animated glow effect - enhanced */}
          <motion.div 
            className="absolute -top-20 -right-20 w-48 h-48 bg-amber-400/30 rounded-full blur-3xl pointer-events-none"
            animate={{ 
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-16 -left-16 w-40 h-40 bg-yellow-500/25 rounded-full blur-2xl pointer-events-none"
            animate={{ 
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
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
                <div className="relative">
                  {/* Rotating ring around avatar placeholder */}
                  <motion.div
                    className="absolute -inset-1 rounded-full border-2 border-transparent"
                    style={{
                      background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #f59e0b, #fcd34d, #f97316, #f59e0b) border-box',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div 
                    className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500/30 to-yellow-600/30 shrink-0"
                    animate={{ 
                      boxShadow: ['0 0 20px rgba(245,158,11,0.6)', '0 0 35px rgba(245,158,11,0.9)', '0 0 20px rgba(245,158,11,0.6)'],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                  </motion.div>
                  {/* Star badge */}
                  <motion.div 
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </motion.div>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <h3 className="font-bold text-xs sm:text-sm leading-tight text-amber-200 truncate">
                      我的专属模型
                    </h3>
                    <motion.span 
                      className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-full whitespace-nowrap"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      专属
                    </motion.span>
                  </div>
                </div>
              </div>
              
              {/* Placeholder Badge */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <span className="text-xs sm:text-sm font-medium text-amber-200/70 whitespace-nowrap">{t('simulated_profit')}</span>
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono-data font-bold text-sm sm:text-base bg-amber-500/10 text-amber-400/50 border border-amber-500/30">
                  --
                </div>
              </div>
            </div>
            
            <div className="space-y-2.5 sm:space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-[10px] sm:text-xs text-amber-200/60">{t('win_rate')}</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all text-amber-400/50">
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
                  <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-0.5">{t('correct')}</p>
                  <p className="text-base sm:text-lg font-bold font-mono-data text-amber-400/50">
                    --
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-0.5">{t('total_predictions')}</p>
                  <p className="text-base sm:text-lg font-bold font-mono-data text-amber-400/50">
                    --
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-0.5">{t('wrong')}</p>
                  <p className="text-base sm:text-lg font-bold font-mono-data text-amber-400/50">
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
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <Sparkles size={13} className="sm:w-[14px] sm:h-[14px]" />
                    <span>免费培养专属模型</span>
                  </div>
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
      className="relative"
    >
      {/* Animated rotating border */}
      <motion.div
        className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 opacity-75 blur-sm"
        animate={{ 
          background: [
            'linear-gradient(0deg, #f59e0b, #fcd34d, #f97316)',
            'linear-gradient(90deg, #f59e0b, #fcd34d, #f97316)',
            'linear-gradient(180deg, #f59e0b, #fcd34d, #f97316)',
            'linear-gradient(270deg, #f59e0b, #fcd34d, #f97316)',
            'linear-gradient(360deg, #f59e0b, #fcd34d, #f97316)',
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      
      <Card 
        className="relative p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-amber-950/60 via-card to-amber-900/30 border-2 border-amber-400/60 hover:border-amber-300 transition-all cursor-pointer group overflow-hidden"
        onClick={handleCardClick}
      >
        {/* Sparkle particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full pointer-events-none"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              y: [0, -20, -40],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeOut"
            }}
          />
        ))}
        
        {/* Animated glow effect - enhanced */}
        <motion.div 
          className="absolute -top-20 -right-20 w-48 h-48 bg-amber-400/30 rounded-full blur-3xl pointer-events-none"
          animate={{ 
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-16 -left-16 w-40 h-40 bg-yellow-500/25 rounded-full blur-2xl pointer-events-none"
          animate={{ 
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none"
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
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
              <div className="relative">
                {/* Rotating ring around avatar */}
                <motion.div
                  className="absolute -inset-1 rounded-full border-2 border-transparent"
                  style={{
                    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #f59e0b, #fcd34d, #f97316, #f59e0b) border-box',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                  className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 p-0.5"
                  style={{ 
                    background: 'linear-gradient(135deg, #f59e0b, #eab308, #f59e0b)',
                  }}
                  animate={{ 
                    boxShadow: ['0 0 20px rgba(245,158,11,0.6)', '0 0 35px rgba(245,158,11,0.9)', '0 0 20px rgba(245,158,11,0.6)'],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={userProfile?.avatar_url || '/avatars/avatar-1.png'} />
                    <AvatarFallback className="bg-amber-900 text-amber-200">
                      {userProfile?.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                {/* Star badge */}
                <motion.div 
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </motion.div>
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                  <h3 className="font-bold text-xs sm:text-sm leading-tight text-amber-200 truncate">
                    {userProfile?.display_name || '我的模型'}
                  </h3>
                  <motion.span 
                    className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-full whitespace-nowrap"
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    专属
                  </motion.span>
                </div>
              </div>
            </div>
            
            {/* Profit Badge */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className="text-xs sm:text-sm font-medium text-amber-200/70 whitespace-nowrap">{t('simulated_profit')}</span>
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
                <span className="text-[10px] sm:text-xs text-amber-200/60">{t('win_rate')}</span>
                <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all text-amber-300">
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
                <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-0.5">{t('correct')}</p>
                <p className="text-base sm:text-lg font-bold font-mono-data text-success">
                  {stats.correctPredictions}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-0.5">{t('total_predictions')}</p>
                <p className="text-base sm:text-lg font-bold font-mono-data text-amber-300">
                  {stats.totalPredictions}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] sm:text-[10px] text-amber-200/50 mb-0.5">{t('wrong')}</p>
                <p className="text-base sm:text-lg font-bold font-mono-data text-destructive">
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

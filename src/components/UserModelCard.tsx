import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  // Non-logged-in user view
  if (!user && !authLoading) {
    return (
      <Card 
        className="relative p-4 sm:p-5 lg:p-6 bg-[#1a1a1a] border-[#3a3a3a] hover:border-[#5a5a5a] transition-all cursor-pointer group overflow-hidden min-h-[280px] flex flex-col"
        onClick={handleActivate}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-indigo-600/10" />
        
        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#2f2f2f] border-2 border-dashed border-[#5a5a5a] flex items-center justify-center mb-4">
            <User className="w-8 h-8 sm:w-10 sm:h-10 text-[#6b6b6b]" />
          </div>
          
          <h3 className="text-sm sm:text-base font-semibold text-white mb-2">
            我的专属模型
          </h3>
          
          <p className="text-xs sm:text-sm text-[#9b9b9b] mb-4 leading-relaxed">
            创建账号后激活属于你的<br />专属AI预测模型
          </p>
          
          <Button 
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 text-xs sm:text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              handleActivate();
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            免费激活专属模型
          </Button>
        </div>
      </Card>
    );
  }

  // Logged-in user view
  return (
    <Card 
      className="relative p-4 sm:p-5 lg:p-6 bg-[#1a1a1a] border-[#3a3a3a] hover:border-violet-500/50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-indigo-600/20 opacity-50 group-hover:opacity-70 transition-opacity" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-violet-500 overflow-hidden shrink-0">
              <Avatar className="w-full h-full">
                <AvatarImage src={userProfile?.avatar_url || '/avatars/avatar-1.png'} />
                <AvatarFallback className="bg-violet-600 text-white">
                  {userProfile?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-bold text-xs sm:text-sm leading-tight text-white truncate">
                {userProfile?.display_name || '我的模型'}
              </h3>
              <span className="text-[10px] text-violet-400">专属模型</span>
            </div>
          </div>
          
          {/* Profit Badge */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="text-xs sm:text-sm font-medium text-[#9b9b9b] whitespace-nowrap">模拟收益</span>
            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono font-bold text-sm sm:text-base ${
              stats.profit >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {stats.profit >= 0 ? '+' : ''}${Math.abs(stats.profit).toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="space-y-2.5 sm:space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs text-[#9b9b9b]">{t('win_rate')}</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                {animatedWinRate.toFixed(1)}%
              </span>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="relative h-2 sm:h-2.5 bg-[#2f2f2f] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-violet-500 to-indigo-500"
                style={{ width: `${animatedWinRate}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-[#3a3a3a] gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-[#9b9b9b] mb-0.5">{t('correct')}</p>
              <p className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                {stats.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-[#9b9b9b] mb-0.5">{t('total_predictions')}</p>
              <p className="text-base sm:text-lg font-bold font-mono text-white">
                {stats.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-[#9b9b9b] mb-0.5">{t('wrong')}</p>
              <p className="text-base sm:text-lg font-bold font-mono text-red-400">
                {stats.totalPredictions - stats.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* Train Model Button */}
          <div className="pt-2 sm:pt-2.5 border-t border-[#3a3a3a]">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/my-predictions');
              }}
              className="w-full h-9 sm:h-10 bg-[#2f2f2f] hover:bg-[#424242] text-white border border-[#3a3a3a] font-medium text-[10px] sm:text-xs"
            >
              查看预测记录
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserModelCard;

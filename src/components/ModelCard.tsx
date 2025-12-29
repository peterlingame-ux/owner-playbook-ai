import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AIModel } from "@/types/prediction";
import { Lock, UserPlus, UserMinus, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import TiltCard from "@/components/TiltCard";
// AI Model Icons
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import mysteryIcon from "@/assets/mystery-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
// Star Background Images
import starMessi from "@/assets/star-messi.jpg";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

interface ModelCardProps {
  model: AIModel;
}

// Model-specific gradient colors
const MODEL_THEMES: Record<string, { from: string; to: string; accent: string; border: string; progress: string }> = {
  deepseek: { from: 'from-blue-600/15', to: 'to-cyan-500/5', accent: 'text-cyan-400', border: 'border-cyan-500/30', progress: 'bg-gradient-to-r from-blue-500 to-cyan-400' },
  gpt5: { from: 'from-emerald-600/15', to: 'to-teal-500/5', accent: 'text-emerald-400', border: 'border-emerald-500/30', progress: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
  claude: { from: 'from-orange-600/15', to: 'to-amber-500/5', accent: 'text-orange-400', border: 'border-orange-500/30', progress: 'bg-gradient-to-r from-orange-500 to-amber-400' },
  gemini: { from: 'from-purple-600/15', to: 'to-pink-500/5', accent: 'text-purple-400', border: 'border-purple-500/30', progress: 'bg-gradient-to-r from-purple-500 to-pink-400' },
  grok: { from: 'from-slate-600/15', to: 'to-zinc-500/5', accent: 'text-slate-300', border: 'border-slate-500/30', progress: 'bg-gradient-to-r from-slate-400 to-zinc-300' },
  mystery: { from: 'from-amber-600/15', to: 'to-yellow-500/5', accent: 'text-amber-400', border: 'border-amber-500/30', progress: 'bg-gradient-to-r from-amber-500 to-yellow-400' },
  hunsoccermax: { from: 'from-amber-600/15', to: 'to-yellow-500/5', accent: 'text-amber-400', border: 'border-amber-500/30', progress: 'bg-gradient-to-r from-amber-500 to-yellow-400' },
};

const ModelCard = ({ model }: ModelCardProps) => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Animated win rate
  const animatedWinRate = useCountAnimation(model.winRate, { 
    duration: 1500,
    startValue: Math.max(0, model.winRate - 15)
  });
  
  // Check follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('model_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('model_id', model.id)
        .maybeSingle();
      setIsFollowing(!!data);
    };
    checkFollowStatus();
  }, [user, model.id]);
  
  // Follow/Unfollow handler
  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authLoading && !user) {
      toast.warning(t("login_required"), { description: t("login_prompt") });
      navigate("/auth");
      return;
    }
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('model_follows')
          .delete()
          .eq('user_id', user!.id)
          .eq('model_id', model.id);
        if (error) throw error;
        setIsFollowing(false);
        toast.success(t('unfollow_success'));
      } else {
        const { error } = await supabase
          .from('model_follows')
          .insert({ user_id: user!.id, model_id: model.id });
        if (error) throw error;
        setIsFollowing(true);
        toast.success(t('follow_success'));
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      toast.error(t('operation_failed'));
    } finally {
      setFollowLoading(false);
    }
  };
  
  const getModelIcon = (modelId: string) => {
    switch(modelId) {
      case 'deepseek': return deepseekIcon;
      case 'gpt5': return openaiIcon;
      case 'claude': return claudeIcon;
      case 'gemini': return geminiIcon;
      case 'grok': return grokIcon;
      case 'mystery': return mysteryIcon;
      case 'hunsoccermax': return hunsoccerIcon;
      default: return deepseekIcon;
    }
  };

  const getStarBackground = (modelId: string) => {
    switch(modelId) {
      case 'deepseek': return starMessi;
      case 'gpt5': return starRonaldo;
      case 'claude': return starMbappe;
      case 'gemini': return starHaaland;
      case 'grok': return starNeymar;
      case 'hunsoccermax': return starHunsoccer;
      case 'mystery': return starMbappe;
      default: return starMessi;
    }
  };
  
  const handleCardClick = () => {
    if (!authLoading && !user) {
      toast.warning(t("login_required"), { description: t("login_prompt") });
      navigate("/auth");
      return;
    }
    navigate(`/model/${model.id}`);
  };

  const theme = MODEL_THEMES[model.id] || MODEL_THEMES.deepseek;
  const isPositive = model.change.startsWith('+');
  const wrongPredictions = model.totalPredictions - model.correctPredictions;
  
  return (
    <TiltCard
      className={`group rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} backdrop-blur-sm border ${theme.border} hover:border-white/30 transition-all duration-300 overflow-hidden cursor-pointer`}
      onClick={handleCardClick}
      maxTilt={6}
      scale={1.02}
      glare={false}
    >
      {/* Locked Overlay */}
      {model.locked && (
        <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/80 border border-border">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">{t('locked_model')}</span>
          </div>
        </div>
      )}

      {/* Star Background Image */}
      <div 
        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
        style={{
          backgroundImage: `url(${getStarBackground(model.id)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-5">
        {/* Header: Model Info + Points Badge */}
        <div className="flex items-start justify-between gap-3 mb-5">
          {/* Model Icon & Name */}
          <div className="flex items-center gap-3">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center p-2.5 ring-2 ring-white/10`}>
                <img 
                  src={getModelIcon(model.id)} 
                  alt={model.name}
                  className="w-full h-full object-contain"
                  style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
              </div>
            </motion.div>
            <div>
              <h3 className={`font-bold text-base sm:text-lg tracking-tight uppercase ${theme.accent}`}>
                {model.displayName.split(' ')[0]}
              </h3>
            </div>
          </div>
          
          {/* Points Badge */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {t('simulated_profit')}
            </span>
            <div className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm tabular-nums ${
              isPositive 
                ? 'bg-success/20 text-success border border-success/30' 
                : 'bg-destructive/20 text-destructive border border-destructive/30'
            }`}>
              {model.change.replace(/\$/, '').replace(/\.00$/, '').replace(/,/g, '')} PTS
            </div>
          </div>
        </div>

        {/* Win Rate Section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {t('win_rate')}
            </span>
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
              {animatedWinRate.toFixed(1)}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className={`absolute inset-y-0 left-0 rounded-full ${theme.progress}`}
              initial={{ width: 0 }}
              animate={{ width: `${animatedWinRate}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '400%' }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{t('correct')}</p>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-success">
              {model.correctPredictions}
            </p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{t('total_predictions')}</p>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
              {model.totalPredictions}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{t('wrong')}</p>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-destructive">
              {wrongPredictions}
            </p>
          </div>
        </div>

        {/* Follow Button */}
        <Button
          variant={isFollowing ? "default" : "outline"}
          size="sm"
          className={`w-full h-10 text-sm font-medium transition-all duration-300 rounded-xl ${
            isFollowing 
              ? 'bg-white/10 hover:bg-white/20 text-foreground border border-white/20' 
              : 'bg-transparent border-white/20 text-foreground hover:bg-white/10 hover:border-white/30'
          }`}
          onClick={handleFollowToggle}
          disabled={followLoading}
        >
          {isFollowing ? (
            <>
              <UserMinus className="h-4 w-4 mr-2" />
              {t('following')}
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('follow_model')}
            </>
          )}
        </Button>
      </div>
    </TiltCard>
  );
};

export default ModelCard;

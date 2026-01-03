import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AIModel } from "@/types/prediction";
import { Lock } from "lucide-react";
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
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
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
      className={`group rounded-lg sm:rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} backdrop-blur-sm border ${theme.border} hover:border-white/30 transition-all duration-300 overflow-hidden cursor-pointer h-full min-h-[160px] sm:min-h-[320px]`}
      onClick={handleCardClick}
      maxTilt={6}
      scale={1.02}
      glare={false}
    >
      {/* Locked Overlay */}
      {model.locked && (
        <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full bg-muted/80 border border-border">
            <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400" />
            <span className="text-[8px] sm:text-sm font-medium text-amber-400">{t('locked_model')}</span>
          </div>
        </div>
      )}

      {/* Star Background Image - Use img with lazy loading */}
      <img 
        src={getStarBackground(model.id)}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-2 sm:p-5 h-full flex flex-col">
        {/* Header: Model Info + Points Badge */}
        <div className="flex items-start justify-between gap-0.5 sm:gap-2 mb-1 sm:mb-5">
          {/* Model Icon & Name */}
          <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1">
            <motion.div 
              className="relative shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className={`w-6 h-6 sm:w-14 sm:h-14 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center p-0.5 sm:p-2.5 ring-1 sm:ring-2 ring-white/10`}>
                <img 
                  src={getModelIcon(model.id)} 
                  alt={model.name}
                  className="w-full h-full object-contain"
                  style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
              </div>
            </motion.div>
            <div className="min-w-0">
              <h3 className={`font-bold text-[9px] sm:text-lg tracking-tight uppercase ${theme.accent} truncate`}>
                {model.displayName.split(' ')[0]}
              </h3>
            </div>
          </div>
          
          {/* Points Badge */}
          <div className={`inline-flex items-center gap-0.5 px-0.5 sm:px-2.5 py-0.5 sm:py-1.5 rounded sm:rounded-lg shrink-0 ${
            isPositive 
              ? 'bg-success/20 border border-success/30' 
              : 'bg-destructive/20 border border-destructive/30'
          }`}>
            <span className={`font-mono font-bold text-[8px] sm:text-sm tabular-nums leading-none ${
              isPositive ? 'text-success' : 'text-destructive'
            }`}>
              {(() => {
                const numValue = parseFloat(model.change.replace(/[\$,]/g, ''));
                const sign = numValue >= 0 ? '+' : '';
                return sign + Math.abs(numValue).toLocaleString();
              })()}
            </span>
            <img 
              src={hunterCoinIcon} 
              alt="猎人币" 
              className="h-2 w-2 sm:h-4 sm:w-4 shrink-0" 
              loading="lazy" 
            />
          </div>
        </div>

        {/* Win Rate Section */}
        <div className="mb-1 sm:mb-5">
          <div className="flex items-center justify-between mb-0.5 sm:mb-2">
            <span className="text-[6px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium truncate">
              {t('win_rate') || '胜率'}
            </span>
            <span className="text-xs sm:text-3xl font-bold font-mono tabular-nums text-foreground flex-shrink-0">
              {animatedWinRate.toFixed(1)}%
            </span>
          </div>
          
          {/* Progress Bar - Simplified on mobile */}
          <div className="relative h-0.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 rounded-full ${theme.progress} transition-all duration-500`}
              style={{ width: `${animatedWinRate}%` }}
            />
            {/* Animated shine effect - Desktop only */}
            <motion.div
              className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent hidden sm:block"
              initial={{ x: '-100%' }}
              animate={{ x: '400%' }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-0.5 sm:gap-3 mb-1 sm:mb-5 p-1 sm:p-3 rounded sm:rounded-xl bg-white/5 border border-white/5">
          <div className="text-center min-w-0 overflow-hidden">
            <p className="text-[5px] sm:text-[10px] text-muted-foreground uppercase tracking-wide leading-tight mb-0 font-medium truncate">{t('correct_short') || t('correct')}</p>
            <p className="text-[9px] sm:text-xl font-bold font-mono tabular-nums text-success">
              {model.correctPredictions}
            </p>
          </div>
          <div className="text-center border-x border-white/10 min-w-0 overflow-hidden">
            <p className="text-[5px] sm:text-[10px] text-muted-foreground uppercase tracking-wide leading-tight mb-0 font-medium truncate">{t('predictions_short') || t('total_predictions')}</p>
            <p className="text-[9px] sm:text-xl font-bold font-mono tabular-nums text-foreground">
              {model.totalPredictions}
            </p>
          </div>
          <div className="text-center min-w-0 overflow-hidden">
            <p className="text-[5px] sm:text-[10px] text-muted-foreground uppercase tracking-wide leading-tight mb-0 font-medium truncate">{t('wrong_short') || t('wrong')}</p>
            <p className="text-[9px] sm:text-xl font-bold font-mono tabular-nums text-destructive">
              {wrongPredictions}
            </p>
          </div>
        </div>

        {/* Follow Button - Push to bottom */}
        <div className="mt-auto pt-0.5 sm:pt-0">
          <Button
            variant={isFollowing ? "default" : "outline"}
            size="sm"
            className={`w-full h-6 sm:h-10 text-[9px] sm:text-sm font-semibold transition-all duration-300 rounded-md sm:rounded-xl px-2 sm:px-4 ${
              isFollowing 
                ? 'bg-success/20 hover:bg-success/30 text-success border border-success/30 shadow-sm' 
                : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 shadow-sm'
            }`}
            onClick={handleFollowToggle}
            disabled={followLoading}
          >
            {isFollowing ? t('following') : t('follow_model')}
          </Button>
        </div>
      </div>
    </TiltCard>
  );
};

export default ModelCard;

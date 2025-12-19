import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIModel } from "@/types/prediction";
import { PlayCircle, Lock, UserPlus, UserMinus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
// AI Model Icons - Updated
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

const ModelCard = ({ model }: ModelCardProps) => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isPositive = model.changePercent > 0;
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // 动画效果：从较低的值开始动画到实际值
  const animatedWinRate = useCountAnimation(model.winRate, { 
    duration: 1500,
    startValue: Math.max(0, model.winRate - 15) // 从当前值减15%开始
  });
  
  // 检查用户是否已关注该模型
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
  
  // 关注/取消关注
  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authLoading && !user) {
      toast.warning(t("login_required"), {
        description: t("login_prompt"),
      });
      navigate("/auth");
      return;
    }
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // 取消关注
        const { error } = await supabase
          .from('model_follows')
          .delete()
          .eq('user_id', user!.id)
          .eq('model_id', model.id);
        if (error) throw error;
        setIsFollowing(false);
        toast.success(t('unfollow_success'));
      } else {
        // 关注
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
      case 'deepseek':
        return deepseekIcon;
      case 'gpt5':
        return openaiIcon;
      case 'claude':
        return claudeIcon;
      case 'gemini':
        return geminiIcon;
      case 'grok':
        return grokIcon;
      case 'mystery':
        return mysteryIcon;
      case 'hunsoccermax':
        return hunsoccerIcon;
      default:
        return deepseekIcon;
    }
  };
  
  const getColorTint = (modelId: string) => {
    // Unified professional color - subtle blue-gray
    if (modelId === 'mystery') {
      return { hue: '45deg', color: 'hsl(45 70% 50%)' };
    }
    return { hue: '210deg', color: 'hsl(210 15% 50%)' };
  };
  
  const getStarBackground = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return starMessi;
      case 'gpt5':
        return starRonaldo;
      case 'claude':
        return starMbappe;
      case 'gemini':
        return starHaaland;
      case 'grok':
        return starNeymar;
      case 'hunsoccermax':
        return starHunsoccer;
      case 'mystery':
        return starMbappe;
      default:
        return starMessi;
    }
  };
  
  const colorTint = getColorTint(model.id);
  
  
  const handleCardClick = () => {
    if (!authLoading && !user) {
      toast.warning(t("login_required"), {
        description: t("login_prompt"),
      });
      navigate("/auth");
      return;
    }
    navigate(`/model/${model.id}`);
  };
  
  return (
    <Card 
      className="relative p-3 sm:p-4 lg:p-6 bg-card border-border/30 hover:border-border/50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Locked Badge Overlay - Center */}
      {model.locked && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-background/90 backdrop-blur-sm border-2 rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-3 flex items-center gap-1.5 sm:gap-2 shadow-lg" style={{ borderColor: `hsl(var(--${model.color}))` }}>
          <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" style={{ color: `hsl(var(--${model.color}))` }} />
          <span className="text-[10px] sm:text-xs lg:text-sm font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
            {t('locked_model')}
          </span>
        </div>
      )}
      {/* Star Background Image */}
      <div 
        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300"
        style={{
          backgroundImage: `url(${getStarBackground(model.id)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      />
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2 sm:mb-3 lg:mb-4 gap-1.5 sm:gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 lg:gap-3 flex-1 min-w-0">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center p-1 sm:p-1.5 lg:p-2 bg-card shrink-0"
              style={{
                border: `2px solid hsl(var(--${model.color}))`
              }}
            >
              <img 
                src={getModelIcon(model.id)} 
                alt={model.name}
                className="w-full h-full object-contain"
                style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
              />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base leading-tight text-foreground truncate tracking-tight">
                {model.displayName.split(' ')[0]}
              </h3>
            </div>
          </div>
          
          {/* Money Change Badge */}
          <div className="flex flex-col items-center gap-0.5 sm:gap-1 lg:gap-1.5 shrink-0">
            <span className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t('simulated_profit')}</span>
            <div className={`px-1.5 sm:px-2.5 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-lg font-mono-data font-medium text-[10px] sm:text-xs lg:text-base tabular-nums ${
              model.change.startsWith('+') ? 'bg-success/20 text-success border border-success/20' : 'bg-destructive/20 text-destructive border border-destructive/20'
            }`}>
              {model.change}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 sm:space-y-2.5 lg:space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1 sm:mb-1.5 lg:mb-2">
              <span className="text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wide">{t('win_rate')}</span>
              <span className="text-lg sm:text-xl lg:text-2xl font-semibold font-mono-data transition-all text-foreground tabular-nums">
                {animatedWinRate.toFixed(1)}%
              </span>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="relative h-1.5 sm:h-2 lg:h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${animatedWinRate}%`,
                  backgroundColor: `hsl(var(--${model.color}))`
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-1.5 sm:pt-2 lg:pt-2.5 border-t border-border/30 gap-1.5 sm:gap-2">
            <div>
              <p className="text-[7px] sm:text-[9px] lg:text-[10px] text-muted-foreground mb-0.5 sm:mb-1 uppercase tracking-wide">{t('correct')}</p>
              <p className="text-sm sm:text-base lg:text-lg font-medium font-mono-data text-success tabular-nums">
                {model.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[7px] sm:text-[9px] lg:text-[10px] text-muted-foreground mb-0.5 sm:mb-1 uppercase tracking-wide">{t('total_predictions')}</p>
              <p className="text-sm sm:text-base lg:text-lg font-medium font-mono-data text-foreground tabular-nums">
                {model.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[7px] sm:text-[9px] lg:text-[10px] text-muted-foreground mb-0.5 sm:mb-1 uppercase tracking-wide">{t('wrong')}</p>
              <p className="text-sm sm:text-base lg:text-lg font-medium font-mono-data text-destructive tabular-nums">
                {model.totalPredictions - model.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* Follow Model Button */}
          <div className="pt-1.5 sm:pt-2 lg:pt-2.5 border-t border-border/30">
            <Button
              variant={isFollowing ? "default" : "outline"}
              size="sm"
              className={`w-full h-7 sm:h-8 lg:h-10 text-[10px] sm:text-xs lg:text-sm transition-colors ${
                isFollowing 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/80' 
                  : 'border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground'
              }`}
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 mr-1 sm:mr-1.5 lg:mr-2" />
                  {t('following')}
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 mr-1 sm:mr-1.5 lg:mr-2" />
                  {t('follow_model')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ModelCard;

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIModel } from "@/types/prediction";
import { PlayCircle, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useAuth } from "@/contexts/AuthContext";
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
  
  // 动画效果：从较低的值开始动画到实际值
  const animatedWinRate = useCountAnimation(model.winRate, { 
    duration: 1500,
    startValue: Math.max(0, model.winRate - 15) // 从当前值减15%开始
  });
  
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
  
  const handleCopyTrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(t('copy_trade_unavailable_desc') || 'FOLLOW MODEL功能即将上线，敬请期待！');
  };
  
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
      className="relative p-4 sm:p-5 lg:p-6 bg-card border-border/30 hover:border-border/50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Locked Badge Overlay - Center */}
      {model.locked && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-background/90 backdrop-blur-sm border-2 rounded-lg px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 shadow-lg" style={{ borderColor: `hsl(var(--${model.color}))` }}>
          <Lock className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: `hsl(var(--${model.color}))` }} />
          <span className="text-xs sm:text-sm font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
            {t('locked_model') || 'LOCKED'}
          </span>
        </div>
      )}
      {/* Star Background Image with Ken Burns Animation */}
      <div 
        className="absolute inset-0 opacity-20 group-hover:opacity-35 transition-opacity duration-500 overflow-hidden"
      >
        <div 
          className="absolute inset-[-20%] w-[140%] h-[140%] animate-ken-burns group-hover:scale-110 transition-transform duration-700"
          style={{
            backgroundImage: `url(${getStarBackground(model.id)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
      </div>
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center p-1.5 sm:p-2 bg-card shrink-0"
              style={{
                border: `2px solid hsl(var(--${model.color}))`
              }}
            >
              <img 
                src={getModelIcon(model.id)} 
                alt={model.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h3 className="font-bold text-xs sm:text-sm leading-tight text-foreground truncate">
                {model.displayName.split(' ')[0]}
              </h3>
            </div>
          </div>
          
          {/* Money Change Badge */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{t('simulated_profit')}</span>
            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-mono-data font-bold text-sm sm:text-base ${
              model.change.startsWith('+') ? 'bg-success/30 text-success border border-success/30' : 'bg-destructive/30 text-destructive border border-destructive/30'
            }`}>
              {model.change}
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
                  backgroundColor: `hsl(var(--${model.color}))`
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/30 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-success">
                {model.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-foreground">
                {model.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('wrong')}</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-destructive">
                {model.totalPredictions - model.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* Follow Model Button */}
          <div className="pt-2 sm:pt-2.5 border-t border-border/30">
            <Button 
              onClick={handleCopyTrade}
              className="w-full h-9 sm:h-10 bg-secondary/50 hover:bg-secondary/80 border border-border/30 font-medium text-[10px] sm:text-xs text-foreground transition-colors"
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <PlayCircle size={13} className="sm:w-[14px] sm:h-[14px]" />
                <span>{t('copy_trade')}</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ModelCard;

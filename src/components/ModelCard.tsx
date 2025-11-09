import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIModel } from "@/types/prediction";
import { TrendingUp, TrendingDown, PlayCircle, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCountAnimation } from "@/hooks/useCountAnimation";
// AI Model Icons - Updated
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import mysteryIcon from "@/assets/mystery-icon.png";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";
import expertMystery from "@/assets/expert-mystery.jpg";
import footballFieldBg from "@/assets/football-field-bg.jpg";

interface ModelCardProps {
  model: AIModel;
}

const ModelCard = ({ model }: ModelCardProps) => {
  const { t } = useTranslation();
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
      default:
        return deepseekIcon;
    }
  };
  
  const getExpertImage = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return starRonaldo;
      case 'gpt5':
        return starNeymar;
      case 'claude':
        return starMessi;
      case 'gemini':
        return starHaaland;
      case 'grok':
        return starMbappe;
      case 'mystery':
        return expertMystery;
      case 'hunsoccermax':
        return starHunsoccer;
      default:
        return starRonaldo;
    }
  };
  
  const getColorTint = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return { hue: '200deg', color: 'hsl(217 91% 60%)' };
      case 'claude':
        return { hue: '20deg', color: 'hsl(14 90% 63%)' };
      case 'gemini':
        return { hue: '260deg', color: 'hsl(250 71% 63%)' };
      case 'grok':
        return { hue: '150deg', color: 'hsl(158 64% 52%)' };
      case 'gpt5':
        return { hue: '0deg', color: 'hsl(0 0% 40%)' };
      case 'mystery':
        return { hue: '45deg', color: 'hsl(45 100% 51%)' };
      default:
        return { hue: '0deg', color: 'hsl(0 0% 40%)' };
    }
  };
  
  const colorTint = getColorTint(model.id);
  
  const handleCopyTrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(t('copy_trade_unavailable_desc') || 'FOLLOW MODEL功能即将上线，敬请期待！');
  };
  
  const handleCardClick = () => {
    navigate(`/model/${model.id}`);
  };
  
  return (
    <Card 
      className="relative p-4 sm:p-5 lg:p-6 bg-card border-border hover:border-opacity-50 transition-all cursor-pointer group overflow-hidden"
      onClick={handleCardClick}
      style={{
        borderColor: `hsl(var(--${model.color}) / 0.3)`
      }}
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
      {/* Star Player Background */}
      <div 
        className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          backgroundImage: `url(${getExpertImage(model.id)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* AI Brand Color Overlay */}
      <div 
        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${colorTint.color}, transparent 70%)`
        }}
      />
      
      {/* Gradient Overlay for Content Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
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
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-xs sm:text-sm leading-tight truncate" style={{ color: `hsl(var(--${model.color}))` }}>
                {model.displayName}
              </h3>
            </div>
          </div>
          
          {/* Money Change Badge */}
          <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-mono-data font-bold text-[10px] sm:text-xs shrink-0 ${
            model.change.startsWith('+') ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
          }`}>
            {model.change}
          </div>
        </div>
        
        <div className="space-y-2.5 sm:space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{t('win_rate')}</span>
              <span className="text-xl sm:text-2xl font-bold font-mono-data transition-all" style={{ color: `hsl(var(--${model.color}))` }}>
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
          
          <div className="flex items-center justify-between pt-2 sm:pt-2.5 border-t border-border/50 gap-2">
            <div>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('correct')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-success">
                {model.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('total_predictions')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data">
                {model.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-0.5">{t('wrong')}</p>
              <p className="text-sm sm:text-base font-bold font-mono-data text-destructive">
                {model.totalPredictions - model.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* Follow Model Button */}
          <div className="pt-2 sm:pt-2.5 border-t border-border/50">
            <Button 
              onClick={handleCopyTrade}
              className="w-full h-9 sm:h-10 relative overflow-hidden group/btn border font-bold text-[10px] sm:text-xs hover:scale-105 transition-transform"
              style={{
                background: `linear-gradient(to right, ${colorTint.color}20, ${colorTint.color}10)`,
                borderColor: `${colorTint.color}`,
                color: colorTint.color,
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
                <span>{t('copy_trade')}</span>
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

export default ModelCard;

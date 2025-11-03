import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIModel } from "@/types/prediction";
import { TrendingUp, TrendingDown, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import footballFieldBg from "@/assets/football-field-bg.jpg";

interface ModelCardProps {
  model: AIModel;
}

const ModelCard = ({ model }: ModelCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPositive = model.changePercent > 0;
  
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
      default:
        return { hue: '0deg', color: 'hsl(0 0% 40%)' };
    }
  };
  
  const colorTint = getColorTint(model.id);
  
  const handleCopyTrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/model/${model.id}`);
  };
  
  return (
    <Card 
      className="relative p-6 bg-card border-border hover:border-opacity-50 transition-all cursor-pointer group overflow-hidden"
      onClick={() => navigate(`/model/${model.id}`)}
      style={{
        borderColor: `hsl(var(--${model.color}) / 0.3)`
      }}
    >
      {/* Football Field Background */}
      <div 
        className="absolute inset-0 opacity-40 group-hover:opacity-50 transition-opacity duration-300"
        style={{
          backgroundImage: `url(${footballFieldBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Expert Background Image with Color Tint */}
      <div 
        className="absolute inset-0 opacity-25 group-hover:opacity-35 transition-opacity duration-300"
        style={{
          backgroundImage: `url(${getExpertImage(model.id)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `grayscale(20%) sepia(80%) hue-rotate(${colorTint.hue}) saturate(150%)`
        }}
      />
      
      {/* Strong Color Overlay matching AI logo */}
      <div 
        className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colorTint.color.replace(')', ' / 0.5)')} 0%, transparent 70%)`,
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center p-1.5 bg-card"
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
            <div>
              <h3 className="font-bold text-sm" style={{ color: `hsl(var(--${model.color}))` }}>
                {model.displayName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {model.totalPredictions} {t('predictions')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t('win_rate')}</span>
              <span className="text-3xl font-bold font-mono-data" style={{ color: `hsl(var(--${model.color}))` }}>
                {model.winRate.toFixed(1)}%
              </span>
            </div>
            
            {/* Win Rate Progress Bar */}
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${model.winRate}%`,
                  backgroundColor: `hsl(var(--${model.color}))`
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">{t('correct')}</p>
              <p className="text-lg font-bold font-mono-data text-success">
                {model.correctPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('total_predictions')}</p>
              <p className="text-lg font-bold font-mono-data">
                {model.totalPredictions}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('wrong')}</p>
              <p className="text-lg font-bold font-mono-data text-destructive">
                {model.totalPredictions - model.correctPredictions}
              </p>
            </div>
          </div>
          
          {/* Copy Trade Button */}
          <div className="pt-2 border-t border-border/50">
            <Button 
              onClick={handleCopyTrade}
              className="w-full relative overflow-hidden group/btn border-2 font-bold hover:scale-105 transition-transform"
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
              
              <div className="relative flex items-center justify-center gap-2">
                <PlayCircle size={18} className="group-hover/btn:animate-pulse" />
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

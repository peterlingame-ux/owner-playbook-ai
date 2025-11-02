import { Card } from "@/components/ui/card";
import { AIModel } from "@/types/prediction";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import expertDeepseek from "@/assets/expert-deepseek.jpg";
import expertGpt5 from "@/assets/expert-gpt5.jpg";
import expertClaude from "@/assets/expert-claude.jpg";
import expertGemini from "@/assets/expert-gemini.jpg";
import expertGrok from "@/assets/expert-grok.jpg";
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
        return expertDeepseek;
      case 'gpt5':
        return expertGpt5;
      case 'claude':
        return expertClaude;
      case 'gemini':
        return expertGemini;
      case 'grok':
        return expertGrok;
      default:
        return expertDeepseek;
    }
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
      
      {/* Expert Background Image */}
      <div 
        className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-300"
        style={{
          backgroundImage: `url(${getExpertImage(model.id)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(40%)'
        }}
      />
      
      {/* Color Overlay matching AI logo */}
      <div 
        className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300 mix-blend-multiply"
        style={{
          backgroundColor: `hsl(var(--${model.color}))`
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
          
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Value:</span>
            <span className="text-sm font-bold font-mono-data">{model.currentValue}</span>
            <span className={`text-xs font-medium flex items-center gap-1 ml-auto ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? '+' : ''}{model.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ModelCard;

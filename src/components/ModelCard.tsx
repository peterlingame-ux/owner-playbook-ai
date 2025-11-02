import { Card } from "@/components/ui/card";
import { AIModel } from "@/types/prediction";
import { TrendingUp, TrendingDown } from "lucide-react";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";

interface ModelCardProps {
  model: AIModel;
  onClick?: () => void;
}

const ModelCard = ({ model, onClick }: ModelCardProps) => {
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
  
  return (
    <Card 
      className="p-6 bg-card border-border hover:border-opacity-50 transition-all cursor-pointer group"
      onClick={onClick}
      style={{
        borderColor: `hsl(var(--${model.color}) / 0.3)`
      }}
    >
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
              {model.totalPredictions} predictions
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono-data">{model.currentValue}</span>
          <span className={`text-sm font-medium flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPositive ? '+' : ''}{model.changePercent.toFixed(2)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold font-mono-data">{model.winRate.toFixed(2)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Accuracy</p>
            <p className="text-lg font-bold font-mono-data">
              {model.correctPredictions}/{model.totalPredictions}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ModelCard;

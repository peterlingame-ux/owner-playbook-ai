import { Card } from "@/components/ui/card";
import { AIModel } from "@/types/prediction";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";

interface ModelCardProps {
  model: AIModel;
}

const ModelCard = ({ model }: ModelCardProps) => {
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
  
  return (
    <Card 
      className="p-6 bg-card border-border hover:border-opacity-50 transition-all cursor-pointer group"
      onClick={() => navigate(`/model/${model.id}`)}
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
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Win Rate</span>
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
            <p className="text-xs text-muted-foreground">Correct</p>
            <p className="text-lg font-bold font-mono-data text-success">
              {model.correctPredictions}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold font-mono-data">
              {model.totalPredictions}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Wrong</p>
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
    </Card>
  );
};

export default ModelCard;

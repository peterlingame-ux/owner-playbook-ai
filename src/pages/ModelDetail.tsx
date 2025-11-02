import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Circle } from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aiModels, predictionHistory } from "@/data/mockData";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";

const ModelDetail = () => {
  const { modelId } = useParams();
  const model = aiModels.find(m => m.id === modelId);
  
  if (!model) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Model not found</p>
        </div>
      </div>
    );
  }

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

  const modelPredictions = predictionHistory.filter(p => p.aiModel === model.id);
  
  const getPredictionLabel = (prediction: string) => {
    switch(prediction) {
      case "HOME_WIN":
        return "Home Win";
      case "AWAY_WIN":
        return "Away Win";
      case "DRAW":
        return "Draw";
      default:
        return prediction;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        {/* Model Header */}
        <Card className="p-8 mb-8 border-border" style={{ borderColor: `hsl(var(--${model.color}) / 0.3)` }}>
          <div className="flex items-start gap-6">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center p-3 bg-card"
              style={{ border: `3px solid hsl(var(--${model.color}))` }}
            >
              <img 
                src={getModelIcon(model.id)} 
                alt={model.name}
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2" style={{ color: `hsl(var(--${model.color}))` }}>
                {model.displayName}
              </h1>
              <p className="text-muted-foreground mb-6">
                Complete prediction history and performance analytics
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-3xl font-bold font-mono-data" style={{ color: `hsl(var(--${model.color}))` }}>
                    {model.winRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Predictions</p>
                  <p className="text-3xl font-bold font-mono-data">
                    {model.totalPredictions}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Correct</p>
                  <p className="text-3xl font-bold font-mono-data text-success">
                    {model.correctPredictions}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Wrong</p>
                  <p className="text-3xl font-bold font-mono-data text-destructive">
                    {model.totalPredictions - model.correctPredictions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Prediction History */}
        <Card className="p-6 border-border">
          <h2 className="text-2xl font-bold mb-6">Prediction History</h2>
          
          <div className="space-y-4">
            {modelPredictions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No prediction history available</p>
            ) : (
              modelPredictions.map((prediction) => (
                <div 
                  key={prediction.id}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    prediction.correct 
                      ? 'border-success/30 bg-success/5' 
                      : 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {prediction.correct ? (
                          <CheckCircle2 className="text-success" size={24} />
                        ) : (
                          <XCircle className="text-destructive" size={24} />
                        )}
                        <div>
                          <p className={`font-bold text-lg ${prediction.correct ? 'text-success' : 'text-destructive'}`}>
                            {prediction.correct ? 'Correct Prediction' : 'Wrong Prediction'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Match ID: {prediction.matchId}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                          <p className="font-semibold">
                            {new Date(prediction.date).toLocaleDateString()} • {new Date(prediction.date).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">AI Prediction</p>
                          <Badge 
                            variant="secondary"
                            className="font-semibold"
                            style={{ 
                              backgroundColor: `hsl(var(--${model.color}) / 0.2)`,
                              color: `hsl(var(--${model.color}))`
                            }}
                          >
                            {getPredictionLabel(prediction.prediction)}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Actual Result</p>
                          <Badge variant="outline" className="font-semibold">
                            {getPredictionLabel(prediction.actualResult)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">Confidence Level:</p>
                          <div className="flex-1 max-w-xs">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${prediction.confidence}%`,
                                    backgroundColor: `hsl(var(--${model.color}))`
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold font-mono-data">
                                {prediction.confidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ModelDetail;

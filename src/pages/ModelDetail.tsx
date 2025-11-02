import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aiModels, predictionHistory, pastMatches } from "@/data/mockData";

const ModelDetail = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  
  const model = aiModels.find(m => m.id === modelId);
  const modelPredictions = predictionHistory.filter(p => p.aiModel === modelId);
  
  if (!model) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Model not found</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }
  
  const getPredictionLabel = (prediction: string) => {
    switch(prediction) {
      case "HOME_WIN": return "Home Win";
      case "AWAY_WIN": return "Away Win";
      case "DRAW": return "Draw";
      default: return prediction;
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Models
          </Button>
          
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center p-2 bg-card"
              style={{
                border: `3px solid hsl(var(--${model.color}))`
              }}
            >
              <img 
                src={`/src/assets/${model.id}-icon.png`}
                alt={model.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 
                className="text-3xl font-bold"
                style={{ color: `hsl(var(--${model.color}))` }}
              >
                {model.displayName}
              </h1>
              <p className="text-muted-foreground">
                {model.totalPredictions} predictions · {model.winRate.toFixed(1)}% win rate
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Win Rate</p>
            <p className="text-3xl font-bold font-mono-data" style={{ color: `hsl(var(--${model.color}))` }}>
              {model.winRate.toFixed(1)}%
            </p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Predictions</p>
            <p className="text-3xl font-bold font-mono-data">
              {model.totalPredictions}
            </p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Correct</p>
            <p className="text-3xl font-bold font-mono-data text-success">
              {model.correctPredictions}
            </p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Wrong</p>
            <p className="text-3xl font-bold font-mono-data text-destructive">
              {model.totalPredictions - model.correctPredictions}
            </p>
          </Card>
        </div>
        
        {/* Prediction History */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Prediction History</h2>
          <div className="space-y-4">
            {modelPredictions.map((prediction) => {
              const match = pastMatches.find(m => m.id === prediction.matchId);
              if (!match) return null;
              
              return (
                <Card key={prediction.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={prediction.correct ? "default" : "destructive"} className="gap-1">
                          {prediction.correct ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Correct
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Wrong
                            </>
                          )}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{match.league}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold mb-1">
                        {match.homeTeam} vs {match.awayTeam}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{prediction.date}</span>
                        <span>{match.time}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <span className="font-bold font-mono-data">{prediction.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AI Prediction</p>
                      <p 
                        className="font-bold"
                        style={{ color: `hsl(var(--${model.color}))` }}
                      >
                        {getPredictionLabel(prediction.prediction)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Actual Result</p>
                      <p className={`font-bold ${prediction.correct ? 'text-success' : 'text-destructive'}`}>
                        {getPredictionLabel(prediction.actualResult)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelDetail;

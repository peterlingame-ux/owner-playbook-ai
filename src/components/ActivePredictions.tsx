import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Equal } from "lucide-react";
import { aiModels, upcomingMatches } from "@/data/mockData";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";

const AI_ICONS: Record<string, string> = {
  deepseek: deepseekIcon,
  gpt5: openaiIcon,
  claude: claudeIcon,
  gemini: geminiIcon,
  grok: grokIcon,
};

// Mock predictions data - each AI predicts for the same match
const mockPredictions = [
  { aiId: "deepseek", prediction: "HOME_WIN", confidence: 68 },
  { aiId: "gpt5", prediction: "AWAY_WIN", confidence: 55 },
  { aiId: "claude", prediction: "HOME_WIN", confidence: 62 },
  { aiId: "gemini", prediction: "DRAW", confidence: 45 },
  { aiId: "grok", prediction: "HOME_WIN", confidence: 71 },
];

const ActivePredictions = () => {
  const { t } = useTranslation();
  
  // Use the first live or upcoming match
  const activeMatch = upcomingMatches.find(m => m.status === 'live' || m.status === 'upcoming');
  
  if (!activeMatch) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('no_active_predictions')}</p>
      </div>
    );
  }

  const getPredictionIcon = (prediction: string) => {
    if (prediction === "HOME_WIN") return <TrendingUp className="h-4 w-4 text-success" />;
    if (prediction === "AWAY_WIN") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Equal className="h-4 w-4 text-warning" />;
  };

  const getPredictionText = (prediction: string) => {
    if (prediction === "HOME_WIN") return activeMatch.homeTeam;
    if (prediction === "AWAY_WIN") return activeMatch.awayTeam;
    return t('draw');
  };

  const getPredictionColor = (prediction: string) => {
    if (prediction === "HOME_WIN") return "text-success";
    if (prediction === "AWAY_WIN") return "text-destructive";
    return "text-warning";
  };

  return (
    <div className="space-y-6">
      {/* Match Info Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">
                {activeMatch.homeTeam} vs {activeMatch.awayTeam}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeMatch.date} {t('at')} {activeMatch.time}
              </p>
            </div>
            <Badge variant={activeMatch.status === 'live' ? 'destructive' : 'outline'}>
              {activeMatch.status === 'live' ? t('live') : t('upcoming_match')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* AI Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockPredictions.map((pred) => {
          const aiModel = aiModels.find(m => m.id === pred.aiId);
          if (!aiModel) return null;

          return (
            <Card key={pred.aiId} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* AI Icon */}
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <img 
                      src={AI_ICONS[pred.aiId]} 
                      alt={aiModel.name}
                      className="w-8 h-8 object-contain"
                    />
                  </div>

                  {/* Prediction Details */}
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-2">{aiModel.displayName}</h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                      {getPredictionIcon(pred.prediction)}
                      <span className={`font-bold ${getPredictionColor(pred.prediction)}`}>
                        {getPredictionText(pred.prediction)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>{t('confidence')}:</span>
                        <span className="font-bold text-foreground">{pred.confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('win_rate')}:</span>
                        <span className="font-bold text-foreground">{aiModel.winRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Prediction Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('prediction_summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-success">
                {mockPredictions.filter(p => p.prediction === "HOME_WIN").length}
              </p>
              <p className="text-sm text-muted-foreground">{activeMatch.homeTeam}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">
                {mockPredictions.filter(p => p.prediction === "DRAW").length}
              </p>
              <p className="text-sm text-muted-foreground">{t('draw')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">
                {mockPredictions.filter(p => p.prediction === "AWAY_WIN").length}
              </p>
              <p className="text-sm text-muted-foreground">{activeMatch.awayTeam}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivePredictions;

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Equal, Lock } from "lucide-react";
import { aiModels, upcomingMatches, matchPredictions } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedWinRate } from "./AnimatedWinRate";
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

const ActivePredictions = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Get all matches with predictions
  const activeMatches = upcomingMatches.filter(m => 
    (m.status === 'live' || m.status === 'upcoming') && matchPredictions[m.id]
  );
  
  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('loading')}</p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">{t('login_required')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('login_prompt')}
            </p>
            <Button onClick={() => navigate("/auth")}>
              {t('login_now')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (activeMatches.length === 0) {
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

  const getPredictionText = (prediction: string, match: typeof activeMatches[0]) => {
    if (prediction === "HOME_WIN") return match.homeTeam;
    if (prediction === "AWAY_WIN") return match.awayTeam;
    return t('draw');
  };

  const getPredictionColor = (prediction: string) => {
    if (prediction === "HOME_WIN") return "text-success";
    if (prediction === "AWAY_WIN") return "text-destructive";
    return "text-warning";
  };

  return (
    <div className="space-y-8">
      {activeMatches.map((match) => {
        const predictions = matchPredictions[match.id] || [];
        
        return (
          <div key={match.id} className="space-y-6">
            {/* Match Info Header */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">
                      {match.homeTeam} {t('vs_text')} {match.awayTeam}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {match.date} {t('at')} {match.time} • {match.league}
                    </p>
                  </div>
                  <Badge variant={match.status === 'live' ? 'destructive' : 'outline'}>
                    {match.status === 'live' ? t('live') : t('upcoming_match')}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* AI Predictions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predictions.map((pred) => {
                const aiModel = aiModels.find(m => m.id === pred.aiId);
                if (!aiModel) return null;

                return (
                  <Card key={`${match.id}-${pred.aiId}`} className="hover:shadow-lg transition-shadow">
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
                              {getPredictionText(pred.prediction, match)}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>{t('confidence')}:</span>
                              <span className="font-bold text-foreground">{pred.confidence}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('win_rate')}:</span>
                              <span className="font-bold text-foreground">
                                <AnimatedWinRate 
                                  value={aiModel.winRate}
                                  className="font-bold text-foreground"
                                />
                              </span>
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
                      {predictions.filter(p => p.prediction === "HOME_WIN").length}
                    </p>
                    <p className="text-sm text-muted-foreground">{match.homeTeam}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning">
                      {predictions.filter(p => p.prediction === "DRAW").length}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('draw')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">
                      {predictions.filter(p => p.prediction === "AWAY_WIN").length}
                    </p>
                    <p className="text-sm text-muted-foreground">{match.awayTeam}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default ActivePredictions;

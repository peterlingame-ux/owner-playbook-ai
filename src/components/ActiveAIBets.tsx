import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { aiModels, matchPredictions, upcomingMatches } from "@/data/mockData";
import { TrendingUp, ArrowRight } from "lucide-react";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";

const AI_ICONS: Record<string, string> = {
  deepseek: deepseekIcon,
  gpt5: gpt5Icon,
  claude: claudeIcon,
  gemini: geminiIcon,
  grok: grokIcon,
};

// Generate random bet amounts for each AI
const generateBetAmount = (aiId: string, confidence: number) => {
  const baseAmounts: Record<string, number> = {
    deepseek: 1500,
    gpt5: 800,
    claude: 1200,
    gemini: 900,
    grok: 1100,
  };
  
  const base = baseAmounts[aiId] || 1000;
  const variance = (confidence / 100) * base * 0.5;
  return Math.round(base + variance);
};

const ActiveAIBets = () => {
  const { t } = useTranslation();
  
  // Get live matches
  const liveMatches = upcomingMatches.filter(m => m.status === "live");
  
  // Get first 5 AI models (exclude mystery)
  const activeAIs = aiModels.filter(ai => ai.id !== "mystery").slice(0, 5);

  const getBetTypeText = (betType: string, prediction: string, handicapLine?: number, overUnderLine?: number, overUnderPick?: string) => {
    switch(betType) {
      case "moneyline":
        return t('moneyline_bet');
      case "handicap":
        const sign = (handicapLine || 0) >= 0 ? '+' : '';
        return `${t('handicap_bet')} (${sign}${handicapLine})`;
      case "over_under":
        return `${t('over_under_bet')} ${overUnderLine} (${overUnderPick === 'over' ? t('over') : t('under')})`;
      default:
        return "";
    }
  };

  const getPredictionIcon = (prediction: string) => {
    switch(prediction) {
      case "HOME_WIN": return <TrendingUp className="h-4 w-4 text-success" />;
      case "AWAY_WIN": return <TrendingUp className="h-4 w-4 text-success" />;
      case "DRAW": return <ArrowRight className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  const getPredictionText = (prediction: string, match: any) => {
    switch(prediction) {
      case "HOME_WIN": return match.homeTeam;
      case "AWAY_WIN": return match.awayTeam;
      case "DRAW": return t('draw');
      default: return "";
    }
  };

  const getAIModel = (aiId: string) => {
    return aiModels.find(ai => ai.id === aiId);
  };

  if (liveMatches.length === 0) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{t('active_ai_predictions')}</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('no_active_predictions')}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{t('active_ai_predictions')}</h2>
        <Badge variant="default" className="bg-success/20 text-success border-success/50 animate-pulse">
          {t('live')}
        </Badge>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {activeAIs.map((aiModel) => {
          // Find this AI's bets in live matches
          const aiBets = liveMatches.flatMap(match => {
            const predictions = matchPredictions[match.id] || [];
            const aiPrediction = predictions.find(p => p.aiId === aiModel.id);
            if (!aiPrediction) return [];
            return [{
              match,
              ...aiPrediction,
              betAmount: generateBetAmount(aiModel.id, aiPrediction.confidence)
            }];
          });

          // If no bets, skip this AI
          if (aiBets.length === 0) return null;

          // Use the first bet for display
          const bet = aiBets[0];

          return (
            <div 
              key={aiModel.id}
              className="relative rounded-lg border border-border p-4 bg-background/50 hover:bg-background/80 transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                {/* AI Avatar */}
                <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                  <AvatarImage src={AI_ICONS[aiModel.id]} alt={aiModel.displayName} />
                  <AvatarFallback>{aiModel.name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  {/* AI Name & Financial Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{aiModel.displayName}</p>
                      <Badge variant="secondary" className="text-xs">
                        {t('win_rate')}: {aiModel.winRate.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    {/* Investment & Balance - Highlighted */}
                    <div className="grid grid-cols-2 gap-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('bet_amount')}</p>
                        <p className="font-mono-data font-bold text-primary">
                          ${bet.betAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('balance')}</p>
                        <p className="font-mono-data font-bold text-success">
                          {aiModel.currentValue}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="flex items-center gap-2 text-sm pt-2 border-t border-border/50">
                    <Badge variant="outline" className="text-xs">
                      {bet.match.league}
                    </Badge>
                    <span className="font-medium truncate">
                      {bet.match.homeTeam} vs {bet.match.awayTeam}
                    </span>
                  </div>

                  {/* Bet Type & Prediction Details */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold bg-info/10 text-info border-info/30">
                        {getBetTypeText(bet.betType, bet.prediction, bet.handicapLine, bet.overUnderLine, bet.overUnderPick)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-mono-data">
                        @{bet.odds.toFixed(2)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getPredictionIcon(bet.prediction)}
                      <span className="text-sm font-semibold">
                        {t('prediction')}: {getPredictionText(bet.prediction, bet.match)}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {bet.confidence}%
                      </Badge>
                    </div>
                  </div>

                  {/* Current Score */}
                  {bet.match.homeScore !== undefined && bet.match.awayScore !== undefined && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">{t('current_score')}:</span>
                      <span className="font-mono-data font-bold text-sm text-primary">
                        {bet.match.homeScore} - {bet.match.awayScore}
                      </span>
                      {bet.match.currentMinute && (
                        <Badge variant="outline" className="text-xs ml-auto">
                          {bet.match.currentMinute}'
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ActiveAIBets;

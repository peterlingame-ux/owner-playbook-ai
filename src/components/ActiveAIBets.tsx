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
      <div className="p-8 bg-card">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">{t('active_ai_predictions')}</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('no_active_predictions')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('active_ai_predictions')}</h2>
        <Badge variant="default" className="bg-success/20 text-success border-success/50 animate-pulse text-sm px-3 py-1">
          {t('live')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
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
              className="relative rounded-xl p-5 bg-gradient-to-br from-card via-card to-card/80 hover:shadow-xl transition-all duration-300 border border-primary/20 hover:border-primary/40 overflow-hidden group"
            >
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative z-10 space-y-4">
                {/* Header with Avatar and Name */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/30 shadow-lg">
                    <AvatarImage src={AI_ICONS[aiModel.id]} alt={aiModel.displayName} />
                    <AvatarFallback className="text-base font-bold">{aiModel.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate">{aiModel.displayName}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {t('win_rate')}: {aiModel.winRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Financial Info - Compact */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('bet_amount')}</p>
                    <p className="font-mono-data font-bold text-sm text-primary">
                      ${bet.betAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{t('balance')}</p>
                    <p className="font-mono-data font-bold text-sm text-success">
                      {aiModel.currentValue}
                    </p>
                  </div>
                </div>

                {/* Match Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {bet.match.league}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm truncate">
                    {bet.match.homeTeam} vs {bet.match.awayTeam}
                  </p>
                </div>

                {/* Bet Details */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-semibold bg-info/10 text-info border-info/30">
                      {getBetTypeText(bet.betType, bet.prediction, bet.handicapLine, bet.overUnderLine, bet.overUnderPick)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-mono-data">
                      @{bet.odds.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getPredictionIcon(bet.prediction)}
                    <span className="text-xs font-semibold truncate flex-1">
                      {getPredictionText(bet.prediction, bet.match)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {bet.confidence}%
                    </Badge>
                  </div>
                </div>

                {/* Current Score */}
                {bet.match.homeScore !== undefined && bet.match.awayScore !== undefined && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">{t('current_score')}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data font-bold text-base text-primary">
                        {bet.match.homeScore} - {bet.match.awayScore}
                      </span>
                      {bet.match.currentMinute && (
                        <Badge variant="outline" className="text-xs">
                          {bet.match.currentMinute}'
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveAIBets;

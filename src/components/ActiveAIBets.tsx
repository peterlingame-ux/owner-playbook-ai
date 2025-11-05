import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { aiModels, matchPredictions, upcomingMatches } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield } from "lucide-react";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import deepseekCardBg from "@/assets/deepseek-card-bg.png";
import grokCardBg from "@/assets/grok-card-bg.png";

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
      <div className="w-full">
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-2xl font-bold">{t('active_ai_predictions')}</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('no_active_predictions')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-bold">{t('active_ai_predictions')}</h2>
        <Badge variant="default" className="bg-success/20 text-success border-success/50 animate-pulse text-sm px-3 py-1">
          {t('live')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              className="relative rounded-xl p-3 bg-gradient-to-br from-card/95 via-card to-card/90 hover:shadow-2xl transition-all duration-500 border-2 border-primary/30 hover:border-primary/60 overflow-hidden group hover:scale-[1.02]"
            >
              {/* Background Image for DeepSeek */}
              {aiModel.id === 'deepseek' && (
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${deepseekCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px'
                  }}
                />
              )}
              
              {/* Background Image for Grok */}
              {aiModel.id === 'grok' && (
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${grokCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px'
                  }}
                />
              )}
              
              {/* Diagonal Stripe Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-transparent" />
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary)) 10px, hsl(var(--primary)) 11px)',
                  opacity: 0.1
                }} />
              </div>
              
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              
              {/* Content */}
              <div className="relative z-10 space-y-2">
                {/* Header with Avatar - Centered */}
                <div className="flex flex-col items-center gap-1.5 pb-2 border-b border-primary/20">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/40 shadow-lg group-hover:ring-primary/60 transition-all">
                    <AvatarImage src={AI_ICONS[aiModel.id]} alt={aiModel.displayName} className="object-cover" />
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-primary/50">{aiModel.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-bold text-xs bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent leading-tight">
                      {aiModel.displayName}
                    </p>
                  </div>
                </div>

                {/* Financial Stats */}
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 shadow-inner">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{t('bet_amount')}</p>
                    <p className="font-mono-data font-bold text-xs text-primary">
                      ${bet.betAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{t('balance')}</p>
                    <p className="font-mono-data font-bold text-xs text-success">
                      {aiModel.currentValue}
                    </p>
                  </div>
                </div>

                {/* Match Info with Team Logos */}
                <div className="space-y-1 py-1">
                  <Badge variant="outline" className="text-[10px] w-full justify-center py-0.5 h-auto">
                    {bet.match.league}
                  </Badge>
                  
                  {/* Teams with Logos */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      {bet.match.homeLogo ? (
                        <Avatar className="h-6 w-6 ring-1 ring-border shrink-0">
                          <AvatarImage src={bet.match.homeLogo} alt={bet.match.homeTeam} />
                          <AvatarFallback><Shield size={10} /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Shield size={10} className="text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-bold text-[10px] leading-tight truncate">
                        {bet.match.homeTeam}
                      </p>
                    </div>
                    
                    <span className="text-[10px] text-muted-foreground font-bold px-1 shrink-0">VS</span>
                    
                    <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                      <p className="font-bold text-[10px] leading-tight truncate text-right">
                        {bet.match.awayTeam}
                      </p>
                      {bet.match.awayLogo ? (
                        <Avatar className="h-6 w-6 ring-1 ring-border shrink-0">
                          <AvatarImage src={bet.match.awayLogo} alt={bet.match.awayTeam} />
                          <AvatarFallback><Shield size={10} /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Shield size={10} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bet Details */}
                <div className="space-y-1.5 pt-2 border-t border-primary/20">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-bold bg-info/15 text-info border-info/40 py-0.5 h-auto leading-tight">
                      {getBetTypeText(bet.betType, bet.prediction, bet.handicapLine, bet.overUnderLine, bet.overUnderPick)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono-data font-bold py-0.5 h-auto">
                      @{bet.odds.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 bg-background/50 rounded-md p-1.5 flex-wrap">
                    {getPredictionIcon(bet.prediction)}
                    <span className="text-[11px] font-bold truncate max-w-[80px]">
                      {getPredictionText(bet.prediction, bet.match)}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold py-0.5 h-auto whitespace-nowrap">
                      {bet.confidence}%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Corner Accent */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 bg-gradient-to-tr from-primary/20 to-transparent rounded-tr-2xl" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveAIBets;

import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { aiModels, matchPredictions, upcomingMatches } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import deepseekCardBg from "@/assets/deepseek-card-bg.png";
import grokCardBg from "@/assets/grok-card-bg.png";
import gpt5CardBg from "@/assets/gpt5-card-bg.png";
import claudeCardBg from "@/assets/claude-card-bg.png";
import geminiCardBg from "@/assets/gemini-card-bg.png";

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

// Countdown Timer Component with Match Time
const MatchCountdown = ({ match }: { match: any }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState("");
  const [matchTime, setMatchTime] = useState("");

  useEffect(() => {
    if (match.status === "live") {
      // For live matches, show the current minute
      if (match.currentMinute) {
        setMatchTime(`${match.currentMinute}'`);
      }
      setCountdown(t('in_progress'));
      return;
    }

    const calculateCountdown = () => {
      const matchDateTime = new Date(`${match.date}T${match.time}`);
      const now = new Date();
      const diff = matchDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(t('in_progress'));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setCountdown(`${days}${t('days')} ${hours % 24}${t('hours')}`);
      } else if (hours > 0) {
        setCountdown(`${hours}${t('hours')} ${minutes}${t('minutes')}`);
      } else {
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [match, t]);

  return (
    <div className="flex flex-col items-center gap-1">
      <Badge 
        variant={match.status === "live" ? "default" : "secondary"}
        className={`text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 ${
          match.status === "live" 
            ? "bg-success/20 text-success border-success/50 animate-pulse" 
            : "bg-primary/20 text-primary border-primary/50"
        }`}
      >
        <Clock className="h-3 w-3" />
        {countdown}
      </Badge>
      {match.status === "live" && matchTime && (
        <span className="text-xs font-bold text-success font-mono-data">{matchTime}</span>
      )}
    </div>
  );
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              className="relative rounded-2xl p-6 bg-gradient-to-br from-card/95 via-card to-card/90 hover:shadow-2xl transition-all duration-500 border-2 border-primary/30 hover:border-primary/60 overflow-hidden group hover:scale-105"
            >
              {/* Countdown Timer - Top Left */}
              <div className="absolute top-3 left-3 z-20">
                <MatchCountdown match={bet.match} />
              </div>

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
              
              {/* Background Image for GPT5 */}
              {aiModel.id === 'gpt5' && (
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${gpt5CardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
              
              {/* Background Image for Claude */}
              {aiModel.id === 'claude' && (
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${claudeCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px',
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
              
              {/* Background Image for Gemini */}
              {aiModel.id === 'gemini' && (
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${geminiCardBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundPositionY: '-20px',
                    backgroundRepeat: 'no-repeat'
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
              <div className="relative z-10 space-y-4">
                {/* Header with Avatar - Centered */}
                <div className="flex flex-col items-center gap-3 pb-3 border-b-2 border-primary/20">
                  <Avatar className="h-20 w-20 ring-4 ring-primary/40 shadow-2xl group-hover:ring-primary/60 transition-all">
                    <AvatarImage src={AI_ICONS[aiModel.id]} alt={aiModel.displayName} className="object-cover" />
                    <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/50">{aiModel.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-bold text-lg bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                      {aiModel.displayName}
                    </p>
                  </div>
                </div>

                {/* Financial Stats */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 shadow-inner">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{t('bet_amount')}</p>
                    <p className="font-mono-data font-bold text-base text-primary">
                      ${bet.betAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{t('balance')}</p>
                    <p className="font-mono-data font-bold text-base text-success">
                      {aiModel.currentValue}
                    </p>
                  </div>
                </div>

                {/* Match Info with Team Logos */}
                <div className="space-y-2 py-2">
                  <Badge variant="outline" className="text-xs w-full justify-center">
                    {bet.match.league}
                  </Badge>
                  
                  {/* Teams with Logos and Live Score */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {bet.match.homeLogo ? (
                        <Avatar className="h-8 w-8 ring-1 ring-border">
                          <AvatarImage src={bet.match.homeLogo} alt={bet.match.homeTeam} />
                          <AvatarFallback><Shield size={14} /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Shield size={14} className="text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-bold text-xs leading-tight flex-1 text-left">
                        {bet.match.homeTeam}
                      </p>
                    </div>
                    
                    {/* Live Score - Only show for live matches */}
                    {bet.match.status === "live" ? (
                      <div className="flex flex-col items-center gap-0.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold font-mono-data text-success">{bet.match.homeScore || 0}</span>
                          <span className="text-xs text-muted-foreground">-</span>
                          <span className="text-lg font-bold font-mono-data text-success">{bet.match.awayScore || 0}</span>
                        </div>
                        <span className="text-[9px] text-success font-bold uppercase">LIVE</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 px-3">
                        <span className="text-xs text-muted-foreground font-bold">VS</span>
                        <span className="text-[9px] text-muted-foreground">{bet.match.time}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <p className="font-bold text-xs leading-tight flex-1 text-right">
                        {bet.match.awayTeam}
                      </p>
                      {bet.match.awayLogo ? (
                        <Avatar className="h-8 w-8 ring-1 ring-border">
                          <AvatarImage src={bet.match.awayLogo} alt={bet.match.awayTeam} />
                          <AvatarFallback><Shield size={14} /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Shield size={14} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bet Details */}
                <div className="space-y-2 pt-3 border-t-2 border-primary/20">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold bg-info/15 text-info border-info/40">
                      {getBetTypeText(bet.betType, bet.prediction, bet.handicapLine, bet.overUnderLine, bet.overUnderPick)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-mono-data font-bold">
                      @{bet.odds.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 bg-background/50 rounded-lg p-2">
                    {getPredictionIcon(bet.prediction)}
                    <span className="text-sm font-bold">
                      {getPredictionText(bet.prediction, bet.match)}
                    </span>
                    <Badge variant="secondary" className="text-xs font-bold">
                      {bet.confidence}% {t('confidence')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Corner Accent */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-3xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-primary/20 to-transparent rounded-tr-3xl" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveAIBets;

import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { aiModels, matchPredictions, upcomingMatches } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import deepseekCardBg from "@/assets/deepseek-card-bg.png";
import grokCardBg from "@/assets/grok-card-bg.png";
import gpt5CardBg from "@/assets/gpt5-card-bg.png";
import claudeCardBg from "@/assets/claude-card-bg.png";
import geminiCardBg from "@/assets/gemini-card-bg.png";
import hunsoccerMaxCardBg from "@/assets/hunsoccer-max-card-bg.png";

const AI_ICONS: Record<string, string> = {
  deepseek: deepseekIcon,
  gpt5: gpt5Icon,
  claude: claudeIcon,
  gemini: geminiIcon,
  grok: grokIcon,
  hunsoccermax: hunsoccerIcon,
};

// Generate random bet amounts for each AI
const generateBetAmount = (aiId: string, confidence: number) => {
  const baseAmounts: Record<string, number> = {
    deepseek: 1500,
    gpt5: 800,
    claude: 1200,
    gemini: 900,
    grok: 1100,
    hunsoccermax: 2000,
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
      setCountdown("当前预测中");
      return;
    }

    const calculateCountdown = () => {
      const matchDateTime = new Date(`${match.date}T${match.time}`);
      const now = new Date();
      const diff = matchDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("当前预测中");
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
  
  // Get AI models (exclude locked ones like mystery and boospot)
  const activeAIs = aiModels.filter(ai => !ai.locked);

  // State to track which match index is shown for each AI
  const [currentMatchIndex, setCurrentMatchIndex] = useState<Record<string, number>>({});

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
      <div className="flex flex-col items-center justify-center mb-6 px-2 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold font-pixel tracking-wider text-center text-white">
          MATCH PREDICTIONS
        </h2>
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

          // Get current match index for this AI (default to 0)
          const matchIndex = currentMatchIndex[aiModel.id] || 0;
          const bet = aiBets[matchIndex];

          // Handler to switch to next match
          const nextMatch = (e: React.MouseEvent) => {
            e.stopPropagation();
            setCurrentMatchIndex(prev => ({
              ...prev,
              [aiModel.id]: ((prev[aiModel.id] || 0) + 1) % aiBets.length
            }));
          };

          // Handler to switch to previous match
          const prevMatch = (e: React.MouseEvent) => {
            e.stopPropagation();
            setCurrentMatchIndex(prev => ({
              ...prev,
              [aiModel.id]: ((prev[aiModel.id] || 0) - 1 + aiBets.length) % aiBets.length
            }));
          };

          return (
            <div 
              key={aiModel.id}
              className="relative rounded-2xl p-6 bg-gradient-to-br from-card/95 via-card to-card/90 hover:shadow-2xl transition-all duration-500 border-2 border-primary/30 hover:border-primary/60 overflow-hidden group hover:scale-105 cursor-pointer"
              onClick={nextMatch}
            >
              {/* Countdown Timer - Top Left */}
              <div className="absolute top-3 left-3 z-20">
                <MatchCountdown match={bet.match} />
              </div>

              {/* Match Counter - Top Right */}
              {aiBets.length > 1 && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                    onClick={prevMatch}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Badge 
                    variant="secondary"
                    className="text-xs font-bold px-3 py-1 bg-background/80"
                  >
                    {matchIndex + 1}/{aiBets.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                    onClick={nextMatch}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

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
              
              {/* Background Image for HUNSOCCER MAX */}
              {aiModel.id === 'hunsoccermax' && (
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${hunsoccerMaxCardBg})`,
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
                <div className="p-4 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 rounded-xl border-2 border-amber-500/40 shadow-lg">
                  <div className="text-center">
                    <p className="text-xs text-amber-300 mb-2 uppercase tracking-wider font-bold">{t('balance')}</p>
                    <p className="font-mono-data font-bold text-2xl text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
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

                {/* Professional Sportsbook Bet Slip - Complete */}
                <div className="space-y-0 pt-3 border-t-2 border-primary/20">
                  {/* Bet Slip Card - Dark Professional Style */}
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl overflow-hidden border-2 border-border shadow-2xl">
                    {/* Header */}
                    <div className="bg-muted/30 px-4 py-2.5 border-b border-border/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t('bet_slip')}
                      </p>
                    </div>
                    
                    {/* Bet Details - Professional Layout */}
                    <div className="p-4 space-y-3 bg-card/80">
                      {/* Bet Type and Odds */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50">
                        <Badge variant="outline" className="text-sm font-bold bg-primary/15 text-primary border-primary/40 px-3 py-1.5 w-fit">
                          {bet.betType === "handicap" && (
                            <>
                              {((bet.handicapLine || 0) >= 0 ? '+' : '')}{bet.handicapLine}
                            </>
                          )}
                          {bet.betType === "over_under" && (
                            <>
                              {bet.overUnderLine} ({bet.overUnderPick === 'over' ? t('over') : t('under')})
                            </>
                          )}
                          {bet.betType === "moneyline" && getPredictionText(bet.prediction, bet.match)}
                        </Badge>
                        <Badge variant="default" className="text-sm font-mono-data font-bold bg-foreground text-background px-3 py-1.5">
                          @{bet.odds.toFixed(2)}
                        </Badge>
                      </div>

                      {/* Match Betting Lines */}
                      <div className="space-y-2">
                        {bet.betType === "handicap" && (
                          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                              {t('handicap_bet')} {t('market')}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className={`p-2 rounded border-2 transition-all ${
                                bet.prediction === "HOME_WIN" 
                                  ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                  : "bg-card border-border/50"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium truncate">{bet.match.homeTeam}</span>
                                  <Badge variant={bet.prediction === "HOME_WIN" ? "default" : "outline"} className="text-xs font-mono-data ml-1">
                                    {((bet.handicapLine || 0) >= 0 ? '+' : '')}{bet.handicapLine}
                                  </Badge>
                                </div>
                              </div>
                              <div className={`p-2 rounded border-2 transition-all ${
                                bet.prediction === "AWAY_WIN" 
                                  ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                  : "bg-card border-border/50"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium truncate">{bet.match.awayTeam}</span>
                                  <Badge variant={bet.prediction === "AWAY_WIN" ? "default" : "outline"} className="text-xs font-mono-data ml-1">
                                    {((bet.handicapLine || 0) <= 0 ? '+' : '')}{-(bet.handicapLine || 0)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {bet.betType === "over_under" && (
                          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                              {t('over_under_bet')} {t('market')}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className={`p-2 rounded border-2 transition-all ${
                                bet.overUnderPick === "over" 
                                  ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                  : "bg-card border-border/50"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium">{t('over')}</span>
                                  <Badge variant={bet.overUnderPick === "over" ? "default" : "outline"} className="text-xs font-mono-data">
                                    {bet.overUnderLine}
                                  </Badge>
                                </div>
                              </div>
                              <div className={`p-2 rounded border-2 transition-all ${
                                bet.overUnderPick === "under" 
                                  ? "bg-primary/20 border-primary shadow-lg shadow-primary/30" 
                                  : "bg-card border-border/50"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium">{t('under')}</span>
                                  <Badge variant={bet.overUnderPick === "under" ? "default" : "outline"} className="text-xs font-mono-data">
                                    {bet.overUnderLine}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {bet.betType === "moneyline" && (
                          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg p-3 border border-primary/30">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getPredictionIcon(bet.prediction)}
                                <span className="text-base font-bold text-foreground">
                                  {getPredictionText(bet.prediction, bet.match)}
                                </span>
                              </div>
                              <Badge variant="secondary" className="text-xs font-bold">
                                {bet.confidence}% {t('confidence')}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Financial Details */}
                      <div className="space-y-2 pt-2">
                        {/* Stake */}
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-muted-foreground font-medium">
                            {aiModel.displayName}本场下注金额
                          </span>
                          <span className="text-xl font-mono-data font-bold text-foreground">
                            ${bet.betAmount.toLocaleString()}
                          </span>
                        </div>
                        
                        {/* Odds Display (redundant but common in sportsbooks) */}
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-muted-foreground font-medium">
                            {t('odds')}
                          </span>
                          <span className="text-xl font-mono-data font-bold text-foreground">
                            {bet.odds.toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Dashed Divider */}
                        <div className="border-t border-dashed border-border/60 my-3" />
                        
                        {/* Potential Return */}
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-bold text-foreground/90">
                            {t('potential_return')}
                          </span>
                          <span className="text-xl font-mono-data font-bold text-foreground">
                            ${(bet.betAmount * bet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        
                        {/* Net Profit - Highlighted in Green */}
                        <div className="bg-success/15 rounded-xl px-4 py-3 border-2 border-success/40 mt-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-success" />
                              <span className="text-sm font-bold text-success">
                                {t('potential_profit')}
                              </span>
                            </div>
                            <span className="text-2xl font-mono-data font-bold text-success drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]">
                              +${((bet.betAmount * bet.odds) - bet.betAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
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

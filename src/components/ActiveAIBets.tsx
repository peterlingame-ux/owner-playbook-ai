import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { aiModels, matchPredictions, upcomingMatches } from "@/data/mockData";
import { TrendingUp, ArrowRight, Shield, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import WhaleDataChart from "@/components/WhaleDataChart";
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
  const { t, i18n } = useTranslation();
  
  // Get live matches
  const liveMatches = upcomingMatches.filter(m => m.status === "live");
  
  // Get AI models (exclude locked ones like mystery and boospot)
  const activeAIs = aiModels.filter(ai => !ai.locked);

  // State to track which match index is shown for each AI
  const [currentMatchIndex, setCurrentMatchIndex] = useState<Record<string, number>>({});

  // Helper function to get team name based on language
  const getTeamName = (match: any, team: 'home' | 'away') => {
    if (i18n.language === 'zh') {
      return team === 'home' 
        ? (match.homeTeamZh || match.homeTeam)
        : (match.awayTeamZh || match.awayTeam);
    }
    return team === 'home' ? match.homeTeam : match.awayTeam;
  };

  // Helper function to get league name based on language
  const getLeagueName = (match: any) => {
    if (i18n.language === 'zh') {
      return match.leagueZh || match.league;
    }
    return match.league;
  };

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
      case "HOME_WIN": return getTeamName(match, 'home');
      case "AWAY_WIN": return getTeamName(match, 'away');
      case "DRAW": return t('draw');
      default: return "";
    }
  };

  const getAIModel = (aiId: string) => {
    return aiModels.find(ai => ai.id === aiId);
  };

  const getModelColor = (aiId: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
      deepseek: { 
        bg: "from-blue-500/20 to-blue-600/10", 
        border: "border-blue-500/40", 
        text: "text-blue-400",
        glow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
      },
      gpt5: { 
        bg: "from-emerald-500/20 to-green-500/10", 
        border: "border-emerald-500/40", 
        text: "text-emerald-400",
        glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
      },
      claude: { 
        bg: "from-purple-500/20 to-violet-500/10", 
        border: "border-purple-500/40", 
        text: "text-purple-400",
        glow: "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
      },
      gemini: { 
        bg: "from-cyan-500/20 to-sky-500/10", 
        border: "border-cyan-500/40", 
        text: "text-cyan-400",
        glow: "drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
      },
      grok: { 
        bg: "from-orange-500/20 to-amber-500/10", 
        border: "border-orange-500/40", 
        text: "text-orange-400",
        glow: "drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
      },
      hunsoccermax: { 
        bg: "from-red-500/20 to-rose-500/10", 
        border: "border-red-500/40", 
        text: "text-red-400",
        glow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
      },
    };
    return colorMap[aiId] || colorMap.deepseek;
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
      <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 px-2 gap-2 sm:gap-3">
        <h2 className="text-sm sm:text-xl md:text-2xl font-bold font-pixel tracking-wider text-center text-white">
          {t('active_ai_predictions')}
        </h2>
        <Badge variant="default" className="bg-success/20 text-success border-success/50 animate-pulse text-[10px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
          {t('live')}
        </Badge>
      </div>

      {/* Whale Data Chart Section */}
      {liveMatches.length > 0 && (
        <div className="mb-6">
          <WhaleDataChart match={liveMatches[0]} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-900/95 to-slate-950/95 border-2 border-slate-800/50 shadow-xl hover:border-slate-700/70 transition-all duration-300 group"
            >
              {/* Subtle Background Pattern */}
              <div className="absolute inset-0 opacity-[0.02]">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)`,
                  backgroundSize: '30px 30px'
                }} />
              </div>

              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              {/* Content */}
              <div className="relative z-10 p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Header: AI Model Info */}
                <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-800/50">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-slate-800 shadow-lg">
                      <AvatarImage src={AI_ICONS[aiModel.id]} alt={aiModel.displayName} className="object-cover" />
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                        {aiModel.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        {aiModel.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {aiModel.currentValue}
                      </p>
                    </div>
                  </div>
                  
                  {/* Match Counter */}
                  {aiBets.length > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          prevMatch(e);
                        }}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 bg-slate-800/50">
                        {matchIndex + 1}/{aiBets.length}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          nextMatch(e);
                        }}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Match Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <Badge variant="outline" className="text-xs font-medium text-slate-300 border-slate-700">
                      {getLeagueName(bet.match)}
                    </Badge>
                  </div>
                  
                  {/* Teams */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {/* Home Team */}
                    <div className="flex items-center gap-2 flex-1">
                      {bet.match.homeLogo && (
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ring-1 ring-slate-700">
                          <AvatarImage src={bet.match.homeLogo} alt={bet.match.homeTeam} />
                          <AvatarFallback><Shield className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                      )}
                      <p className="text-sm sm:text-base font-bold text-white truncate">
                        {getTeamName(bet.match, 'home')}
                      </p>
                    </div>
                    
                    {/* Score/Status */}
                    {bet.match.status === "live" ? (
                      <div className="flex flex-col items-center px-3 py-1 bg-success/10 rounded-lg border border-success/30">
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-bold font-mono text-success">
                            {bet.match.homeScore || 0}
                          </span>
                          <span className="text-sm text-slate-400">-</span>
                          <span className="text-lg sm:text-xl font-bold font-mono text-success">
                            {bet.match.awayScore || 0}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-success uppercase">LIVE</span>
                      </div>
                    ) : (
                      <div className="text-center px-3 py-1">
                        <p className="text-xs text-slate-400 font-medium">VS</p>
                        <p className="text-xs text-slate-500">{bet.match.time}</p>
                      </div>
                    )}
                    
                    {/* Away Team */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <p className="text-sm sm:text-base font-bold text-white truncate text-right">
                        {getTeamName(bet.match, 'away')}
                      </p>
                      {bet.match.awayLogo && (
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ring-1 ring-slate-700">
                          <AvatarImage src={bet.match.awayLogo} alt={bet.match.awayTeam} />
                          <AvatarFallback><Shield className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prediction Section */}
                <div className="rounded-lg bg-slate-800/30 border border-slate-700/50 overflow-hidden">
                  {/* Prediction Header */}
                  <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      AI {t('prediction')}
                    </p>
                    <Badge 
                      variant={bet.confirmed ? "default" : "outline"}
                      className={`text-xs font-bold px-2 py-0.5 ${
                        bet.confirmed 
                          ? "bg-success/20 text-success border-success/50" 
                          : "bg-destructive/20 text-destructive border-destructive/50"
                      }`}
                    >
                      {bet.confirmed ? "已确定" : "未确定"}
                    </Badge>
                  </div>
                  
                  {/* Prediction Details */}
                  <div className="p-3 space-y-2.5">
                    {/* Main Prediction */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">{t('prediction')}:</span>
                      <div className="flex items-center gap-2">
                        {getPredictionIcon(bet.prediction)}
                        <span className="text-sm font-bold text-white">
                          {getPredictionText(bet.prediction, bet.match)}
                        </span>
                      </div>
                    </div>

                    {/* Bet Type */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">{t('bet_type')}:</span>
                      <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/40">
                        {getBetTypeText(bet.betType, bet.prediction, bet.handicapLine, bet.overUnderLine, bet.overUnderPick)}
                      </Badge>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">{t('confidence')}:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                            style={{ width: `${bet.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white font-mono min-w-[3rem] text-right">
                          {bet.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-700/50 my-2" />

                    {/* Financial Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">{t('bet_amount')}:</span>
                        <span className="text-base font-bold text-white font-mono">
                          ${bet.betAmount.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">{t('odds')}:</span>
                        <span className="text-base font-bold text-white font-mono">
                          @{bet.odds.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 px-3 py-2 bg-gradient-to-r from-success/10 to-success/5 rounded-lg border border-success/30">
                        <span className="text-sm font-bold text-success">{t('potential_return')}:</span>
                        <span className="text-lg font-bold text-success font-mono">
                          ${(bet.betAmount * bet.odds).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveAIBets;

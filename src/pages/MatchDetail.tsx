import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Heart, DollarSign, Activity, Newspaper, Sparkles, Trophy, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { upcomingMatches, matchOwnersData } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import footballFieldBg from "@/assets/football-field-bg.jpg";
import grassTexture from "@/assets/grass-texture.jpg";

// AI Model Icons
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

const MatchDetail = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [homeAnalyses, setHomeAnalyses] = useState<any[]>([]);
  const [awayAnalyses, setAwayAnalyses] = useState<any[]>([]);
  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingAway, setLoadingAway] = useState(false);
  
  const match = upcomingMatches.find(m => m.id === matchId);
  const ownersData = matchOwnersData[matchId || ''];
  
  const handleAnalyzeOwner = async (owner: any, isHome: boolean) => {
    if (isHome) {
      setLoadingHome(true);
    } else {
      setLoadingAway(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-owner', {
        body: { ownerData: owner }
      });

      if (error) throw error;

      if (isHome) {
        setHomeAnalyses(data.analyses);
      } else {
        setAwayAnalyses(data.analyses);
      }

      toast({
        title: t('analysis_complete'),
        description: t('analysis_complete_desc'),
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: t('analysis_error'),
        variant: "destructive",
      });
    } finally {
      if (isHome) {
        setLoadingHome(false);
      } else {
        setLoadingAway(false);
      }
    }
  };
  
  if (!match || !ownersData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('match_not_found')}</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            {t('go_back')}
          </Button>
        </div>
      </div>
    );
  }
  
  const OwnerCard = ({ owner, team, isHome }: { owner: typeof ownersData.homeOwner, team: string, isHome: boolean }) => {
    const analyses = isHome ? homeAnalyses : awayAnalyses;
    const loading = isHome ? loadingHome : loadingAway;
    
    return (
    <Card className="overflow-hidden bg-card/90 backdrop-blur-sm border-border/50">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <span>{team} {t('owner')}</span>
          <Badge variant="outline" className="text-xs">{match.league}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Photo and Basic Info - Simplified */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img 
              src={owner.photo} 
              alt={owner.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold mb-1 truncate">{owner.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">{owner.age} {t('years_old')}</p>
            <div className="flex flex-col gap-1 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-success flex-shrink-0" />
                <span className="font-mono-data truncate">{owner.netWorth}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">Social: {owner.socialActivity}/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion for Details */}
        <Accordion type="multiple" className="space-y-2">
          {/* Health Status */}
          <AccordionItem value="health" className="border rounded-lg px-3 bg-muted/30">
            <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-destructive" />
                {t('health_status')}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <p className="text-xs sm:text-sm text-muted-foreground">{owner.healthStatus}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Financial Status */}
          <AccordionItem value="financial" className="border rounded-lg px-3 bg-muted/30">
            <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                {t('financial_status')}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground">{owner.financialStatus}</p>
            </AccordionContent>
          </AccordionItem>

          {/* Family Members */}
          <AccordionItem value="family" className="border rounded-lg px-3 bg-muted/30">
            <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t('family_members')} ({owner.familyMembers.length})
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-2">
                {owner.familyMembers.map((member, idx) => (
                  <div key={idx} className="bg-background/50 p-2 rounded text-xs">
                    <div className="font-semibold">{member.name} ({member.relation})</div>
                    {member.netWorth && <div className="text-success">{member.netWorth}</div>}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Recent Activities */}
          <AccordionItem value="activities" className="border rounded-lg px-3 bg-muted/30">
            <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t('recent_activities')}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-1.5">
                {owner.recentActivities.slice(0, 3).map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-muted-foreground">{activity}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator className="my-4" />

        {/* AI Analyses Section - Simplified */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 sm:p-4 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('ai_analyses')}
            </h4>
            <Button 
              onClick={() => handleAnalyzeOwner(owner, isHome)}
              disabled={loading}
              size="sm"
              variant="outline"
              className="text-xs h-8 px-2"
            >
              {loading ? t('analyzing') : t('analyze_with_ai')}
            </Button>
          </div>
          
          {analyses.length > 0 ? (
            <div className="space-y-2 mt-3">
              {analyses.map((analysis) => (
                <div 
                  key={analysis.id} 
                  className={`bg-background/80 p-2 sm:p-3 rounded-lg border text-xs ${
                    analysis.error ? 'border-destructive/20' : 'border-primary/20'
                  }`}
                >
                  <Badge variant={analysis.error ? "destructive" : "default"} className="text-xs mb-1">
                    {analysis.name}
                  </Badge>
                  <p className="leading-relaxed text-foreground line-clamp-3">
                    {analysis.analysis}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('click_button_to_analyze')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
  
  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url(${grassTexture})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header with Back Button */}
        <div className="border-b border-border/30 bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back_to_matches')}
            </Button>
          </div>
        </div>

        {/* Live Score Display */}
        {match.status === 'live' && match.homeScore !== undefined && match.awayScore !== undefined && (
          <div className="container mx-auto px-4 py-8">
            <div 
              className="relative rounded-lg p-8 mb-6 overflow-hidden"
              style={{
                backgroundImage: `url(${footballFieldBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
              
              <div className="relative z-10">
                <div className="text-center mb-4">
                  <Badge className="mb-3">{match.league}</Badge>
                </div>
                
                {/* Match Time */}
                {match.currentMinute && (
                  <div className="text-center mb-4">
                    <Badge variant="destructive" className="text-lg px-4 py-1 bg-destructive/90 animate-pulse">
                      {match.currentMinute}'
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center flex-1">
                    <div className="text-4xl font-bold text-white drop-shadow-lg">{match.homeTeam}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-7xl font-bold text-white drop-shadow-2xl">
                      {match.homeScore} - {match.awayScore}
                    </div>
                    {match.halfTimeHomeScore !== undefined && match.halfTimeAwayScore !== undefined && (
                      <div className="text-sm text-white/90 mt-2 drop-shadow-lg">
                        {t('half_time')} {match.halfTimeHomeScore}-{match.halfTimeAwayScore}
                      </div>
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-4xl font-bold text-white drop-shadow-lg">{match.awayTeam}</div>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <p className="text-white/80 text-sm">
                    {match.date} {t('at')} {match.time}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center backdrop-blur-sm">
              <p className="text-sm font-medium text-primary">
                {t('owner_analysis_warning')}
              </p>
            </div>
          </div>
        )}
      
      {/* Betting Odds Table */}
      {match.bettingOdds && match.bettingOdds.length > 0 && (
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-card/90 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('betting_odds_handicap')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-semibold text-muted-foreground">{t('bookmaker')}</th>
                      <th className="text-center py-3 px-2 font-semibold text-muted-foreground">{t('home_win')}</th>
                      <th className="text-center py-3 px-2 font-semibold text-muted-foreground">{t('draw')}</th>
                      <th className="text-center py-3 px-2 font-semibold text-muted-foreground">{t('away_win')}</th>
                      <th className="text-center py-3 px-2 font-semibold text-destructive">{t('home_handicap')}</th>
                      <th className="text-center py-3 px-2 font-semibold text-success">{t('away_handicap')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.bettingOdds.map((odds, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{odds.bookmaker}</td>
                        <td className="text-center py-3 px-2 font-mono-data">{odds.homeWin.toFixed(2)}</td>
                        <td className="text-center py-3 px-2 font-mono-data">{odds.draw.toFixed(2)}</td>
                        <td className="text-center py-3 px-2 font-mono-data">{odds.awayWin.toFixed(2)}</td>
                        <td className="text-center py-3 px-2 font-mono-data text-destructive font-bold">
                          {odds.homeHandicap > 0 ? odds.homeHandicap.toFixed(2) : '-'}
                        </td>
                        <td className="text-center py-3 px-2 font-mono-data text-success font-bold">
                          {odds.awayHandicap > 0 ? odds.awayHandicap.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Owners Comparison */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <OwnerCard owner={ownersData.homeOwner} team={match.homeTeam} isHome={true} />
          <OwnerCard owner={ownersData.awayOwner} team={match.awayTeam} isHome={false} />
        </div>

        {/* Match Analysis Summary */}
        <Card className="mt-8 bg-gradient-to-br from-muted/50 to-background">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {t('match_outcome_analysis')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(homeAnalyses.length > 0 || awayAnalyses.length > 0) && 
             homeAnalyses.some(a => a.prediction) ? (
              <div className="space-y-6">
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {t('ai_predictions_intro')}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {homeAnalyses.map((analysis) => {
                    if (!analysis.prediction) return null;
                    
                    const probability = analysis.prediction.probability;
                    const homeWinProb = analysis.prediction.outcome === 'home_win' ? probability : Math.floor((100 - probability) / 2);
                    const awayWinProb = analysis.prediction.outcome === 'away_win' ? probability : Math.floor((100 - probability) / 2);
                    const drawProb = analysis.prediction.outcome === 'draw' ? probability : 100 - homeWinProb - awayWinProb;
                    
                    return (
                      <Card key={analysis.id} className="text-center hover:shadow-lg transition-shadow bg-card/90 backdrop-blur-sm border-border/50">
                        <CardContent className="pt-6 pb-4">
                          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                            <img 
                              src={AI_ICONS[analysis.id]} 
                              alt={analysis.name}
                              className="w-10 h-10 object-contain"
                            />
                          </div>
                          <h4 className="font-bold text-sm mb-3">{analysis.name}</h4>
                          
                          <div className="space-y-2 text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{match.homeTeam} {t('win')}:</span>
                              <span className={`font-bold ${homeWinProb > 50 ? 'text-success' : 'text-muted-foreground'}`}>
                                {homeWinProb}%
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{t('draw')}:</span>
                              <span className={`font-bold ${drawProb > 50 ? 'text-warning' : 'text-muted-foreground'}`}>
                                {drawProb}%
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{match.awayTeam} {t('win')}:</span>
                              <span className={`font-bold ${awayWinProb > 50 ? 'text-success' : 'text-muted-foreground'}`}>
                                {awayWinProb}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground leading-relaxed text-center py-8">
                {t('click_analyze_to_see_predictions')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default MatchDetail;

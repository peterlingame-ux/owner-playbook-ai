import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Heart, DollarSign, Activity, Newspaper, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { upcomingMatches, matchOwnersData } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import footballFieldBg from "@/assets/football-field-bg.jpg";

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
        title: "Analysis Complete",
        description: "AI models have analyzed the owner's situation.",
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
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="flex items-center justify-between">
          <span>{team} {t('owner')}</span>
          <Badge variant="outline">{match.league}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Photo and Basic Info */}
        <div className="flex items-start gap-6 mb-6">
          <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img 
              src={owner.photo} 
              alt={owner.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{owner.name}</h3>
            <p className="text-muted-foreground mb-3">{owner.age} {t('years_old')}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="font-mono-data">{owner.netWorth}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>Social: {owner.socialActivity}/10</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Health Status */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-destructive" />
            <h4 className="font-bold">{t('health_status')}</h4>
          </div>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {owner.healthStatus}
          </p>
        </div>

        {/* Financial Status */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-success" />
            <h4 className="font-bold">{t('financial_status')}</h4>
          </div>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg mb-4">
            {owner.financialStatus}
          </p>
          
          {/* Detailed Financial Analysis */}
          {owner.financialDetails && (
            <div className="space-y-4 bg-gradient-to-br from-success/5 to-success/10 p-4 rounded-lg border border-success/20">
              <h5 className="font-bold text-success flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('financial_details')}
              </h5>
              
              {/* Recent Expenses */}
              <div>
                <p className="font-semibold text-sm mb-2">{t('recent_expenses')}</p>
                <div className="space-y-2">
                  {owner.financialDetails.recentExpenses.map((expense, idx) => (
                    <div key={idx} className="bg-background/50 p-3 rounded text-xs space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-foreground">{expense.item}</span>
                        <span className="text-destructive font-bold">{expense.amount}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium">{t('date')}:</span> {expense.date}
                      </div>
                      <div className="text-muted-foreground italic">
                        <span className="font-medium">{t('purpose')}:</span> {expense.purpose}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recent Investments */}
              <div>
                <p className="font-semibold text-sm mb-2">{t('recent_investments')}</p>
                <div className="space-y-2">
                  {owner.financialDetails.recentInvestments.map((investment, idx) => (
                    <div key={idx} className="bg-success/10 p-3 rounded text-xs space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-foreground">{investment.investment}</span>
                        <span className="text-success font-bold">{investment.amount}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium">{t('date')}:</span> {investment.date}
                      </div>
                      <div className="text-success font-medium">
                        <span>{t('expected_return')}:</span> {investment.expectedReturn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Cash Flow */}
              <div className="bg-background/50 p-3 rounded">
                <p className="font-semibold text-sm mb-1">{t('cash_flow')}</p>
                <p className="text-xs text-muted-foreground">{owner.financialDetails.cashFlow}</p>
              </div>
              
              {/* Debt Situation */}
              <div className="bg-background/50 p-3 rounded">
                <p className="font-semibold text-sm mb-1">{t('debt_situation')}</p>
                <p className="text-xs text-muted-foreground">{owner.financialDetails.debtSituation}</p>
              </div>
            </div>
          )}
        </div>

        {/* Family Members */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <h4 className="font-bold">{t('family_members')}</h4>
          </div>
          <div className="space-y-3">
            {owner.familyMembers.map((member, idx) => (
              <div key={idx} className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg">{member.name}</span>
                    <span className="text-muted-foreground ml-2">({member.relation})</span>
                  </div>
                  <span className="text-muted-foreground">{member.age} {t('years')}</span>
                </div>
                {member.occupation && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[80px]">{t('occupation')}:</span>
                    <span className="text-foreground">{member.occupation}</span>
                  </div>
                )}
                {member.netWorth && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[80px]">{t('member_net_worth')}:</span>
                    <span className="text-success font-bold">{member.netWorth}</span>
                  </div>
                )}
                {member.influence && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground font-medium min-w-[80px]">{t('member_influence')}:</span>
                    <span className="text-primary italic">{member.influence}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Close Friends */}
        {owner.closeFriends && owner.closeFriends.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-success" />
              <h4 className="font-bold">{t('close_friends')}</h4>
            </div>
            <div className="space-y-3">
              {owner.closeFriends.map((friend, idx) => (
                <div key={idx} className="bg-success/5 border border-success/20 p-4 rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-lg">{friend.name}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground font-medium min-w-[100px]">{t('relationship')}:</span>
                      <span className="text-foreground">{friend.relationship}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground font-medium min-w-[100px]">{t('influence_level')}:</span>
                      <span className="text-success font-medium">{friend.influence}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground font-medium min-w-[100px]">{t('recent_interaction')}:</span>
                      <span className="text-muted-foreground italic">{friend.recentInteraction}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Status */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            <h4 className="font-bold">{t('social_status')}</h4>
          </div>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {owner.socialStatus}
          </p>
        </div>

        {/* Scandals */}
        {owner.scandals.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="h-5 w-5 text-destructive" />
              <h4 className="font-bold text-destructive">{t('scandals_controversies')}</h4>
            </div>
            <div className="space-y-2">
              {owner.scandals.map((scandal, idx) => (
                <div key={idx} className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-sm">
                  <p className="text-destructive-foreground">{scandal}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h4 className="font-bold">{t('recent_activities')}</h4>
          </div>
          <div className="space-y-2">
            {owner.recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-muted/50 p-3 rounded-lg text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <p className="text-muted-foreground">{activity}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* AI Analyses Section */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('ai_analyses')}
            </h4>
            <Button 
              onClick={() => handleAnalyzeOwner(owner, isHome)}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              {loading ? t('analyzing') : t('analyze_with_ai')}
            </Button>
          </div>
          
          {analyses.length > 0 ? (
            <div className="space-y-4 mt-4">
              {analyses.map((analysis) => (
                <div 
                  key={analysis.id} 
                  className={`bg-background/80 p-4 rounded-lg border ${
                    analysis.error ? 'border-destructive/20' : 'border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={analysis.error ? "destructive" : "default"}>
                      {analysis.name}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {analysis.analysis}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Click the button above to generate AI analyses from 5 different models
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
            {t('back_to_matches')}
          </Button>
          
          <div className="text-center mb-6">
            <Badge className="mb-3">{match.league}</Badge>
            <h1 className="text-3xl font-bold mb-4">
              {match.homeTeam} {t('vs')} {match.awayTeam}
            </h1>
            
            {/* Team Logos */}
            <div className="flex items-center justify-center gap-6 mb-4">
              {match.homeLogo && (
                <div className="w-20 h-20 rounded-full overflow-hidden bg-muted/50 flex items-center justify-center">
                  <img 
                    src={match.homeLogo} 
                    alt={match.homeTeam}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
              {match.awayLogo && (
                <div className="w-20 h-20 rounded-full overflow-hidden bg-muted/50 flex items-center justify-center">
                  <img 
                    src={match.awayLogo} 
                    alt={match.awayTeam}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            
            <p className="text-muted-foreground">
              {match.date} {t('at')} {match.time}
            </p>
          </div>

          {/* Live Score Display */}
          {match.status === 'live' && match.homeScore !== undefined && match.awayScore !== undefined && (
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
              </div>
            </div>
          )}

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-primary">
              {t('owner_analysis_warning')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Betting Odds Table */}
      {match.bettingOdds && match.bettingOdds.length > 0 && (
        <div className="container mx-auto px-4 py-8">
          <Card>
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
                      <Card key={analysis.id} className="text-center hover:shadow-lg transition-shadow">
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
  );
};

export default MatchDetail;

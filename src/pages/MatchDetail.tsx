import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Heart, DollarSign, Activity, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { upcomingMatches, matchOwnersData } from "@/data/mockData";

const MatchDetail = () => {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  const match = upcomingMatches.find(m => m.id === matchId);
  const ownersData = matchOwnersData[matchId || ''];
  
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
  
  const OwnerCard = ({ owner, team }: { owner: typeof ownersData.homeOwner, team: string }) => (
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

        {/* Exclusive Analysis */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
          <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span className="text-primary">🔍</span>
            {t('exclusive_owner_analysis')}
          </h4>
          <p className="text-sm leading-relaxed text-foreground">
            {owner.exclusiveAnalysis}
          </p>
        </div>
      </CardContent>
    </Card>
  );
  
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
            <h1 className="text-3xl font-bold mb-2">
              {match.homeTeam} {t('vs')} {match.awayTeam}
            </h1>
            <p className="text-muted-foreground">
              {match.date} {t('at')} {match.time}
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-primary">
              {t('owner_analysis_warning')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Owners Comparison */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <OwnerCard owner={ownersData.homeOwner} team={match.homeTeam} />
          <OwnerCard owner={ownersData.awayOwner} team={match.awayTeam} />
        </div>

        {/* Match Analysis Summary */}
        <Card className="mt-8 bg-gradient-to-br from-muted/50 to-background">
          <CardHeader>
            <CardTitle className="text-2xl">{t('match_outcome_analysis')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {t('match_outcome_text')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchDetail;

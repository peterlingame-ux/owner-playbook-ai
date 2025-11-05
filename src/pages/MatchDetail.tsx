import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ArrowLeft, DollarSign, Users, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { upcomingMatches, matchOwnersData } from "@/data/mockData";

const MatchDetail = () => {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  const match = upcomingMatches.find(m => m.id === matchId);
  const ownersData = matchOwnersData[matchId || ''];
  
  if (!match || !ownersData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('match_not_found')}</p>
          <Button onClick={() => navigate("/")} size="sm">
            {t('go_back')}
          </Button>
        </div>
      </div>
    );
  }
  
  const OwnerCard = ({ owner, team }: { owner: typeof ownersData.homeOwner, team: string }) => (
    <Card className="bg-card border-border">
      <CardContent className="p-3 sm:p-4">
        {/* 基本信息 */}
        <div className="flex items-start gap-3 mb-3">
          <img 
            src={owner.photo} 
            alt={owner.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg mb-1">{owner.name}</h3>
            <p className="text-xs text-muted-foreground mb-2">{team} · {owner.age} {t('years_old')}</p>
            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="h-3 w-3 text-success" />
              <span className="font-mono-data text-success">{owner.netWorth}</span>
            </div>
          </div>
        </div>

        {/* 折叠详情 */}
        <Accordion type="single" collapsible>
          <AccordionItem value="details" className="border-0">
            <AccordionTrigger className="py-2 text-xs hover:no-underline">
              {t('view_details')}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {/* 健康状态 */}
              <div className="bg-muted/30 p-2 rounded">
                <p className="text-xs font-semibold mb-1">{t('health_status')}</p>
                <p className="text-xs text-muted-foreground">{owner.healthStatus}</p>
              </div>

              {/* 财务状态 */}
              <div className="bg-muted/30 p-2 rounded">
                <p className="text-xs font-semibold mb-1">{t('financial_status')}</p>
                <p className="text-xs text-muted-foreground">{owner.financialStatus}</p>
              </div>

              {/* 家庭成员 */}
              {owner.familyMembers.length > 0 && (
                <div className="bg-muted/30 p-2 rounded">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t('family_members')}
                  </p>
                  <div className="space-y-1">
                    {owner.familyMembers.slice(0, 3).map((member, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-muted-foreground ml-1">({member.relation})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 近期活动 */}
              {owner.recentActivities.length > 0 && (
                <div className="bg-muted/30 p-2 rounded">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {t('recent_activities')}
                  </p>
                  <div className="space-y-1">
                    {owner.recentActivities.slice(0, 2).map((activity, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">• {activity}</p>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
  
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">{t('back_to_matches')}</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl">
        {/* 比赛信息卡片 */}
        <Card className="mb-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <Badge variant="outline" className="mb-2 text-xs">{match.league}</Badge>
              <div className="text-xs text-muted-foreground">{match.date} {match.time}</div>
            </div>
            
            {/* 比分或VS */}
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <div className="text-center flex-1">
                <div className="text-lg sm:text-xl font-bold">{match.homeTeam}</div>
              </div>
              
              {match.status === 'live' && match.homeScore !== undefined ? (
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold font-mono-data">
                    {match.homeScore} - {match.awayScore}
                  </div>
                  {match.currentMinute && (
                    <Badge variant="destructive" className="mt-1 text-xs animate-pulse">
                      {match.currentMinute}'
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-xl sm:text-2xl font-bold text-muted-foreground">VS</div>
              )}
              
              <div className="text-center flex-1">
                <div className="text-lg sm:text-xl font-bold">{match.awayTeam}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 赔率信息 */}
        {match.bettingOdds && match.bettingOdds.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-3">
              <h3 className="text-sm font-semibold mb-2">{t('betting_odds_handicap')}</h3>
              <div className="overflow-x-auto -mx-3 px-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-2 font-medium">{t('bookmaker')}</th>
                      <th className="text-center py-2 px-1 font-medium">{t('home_win')}</th>
                      <th className="text-center py-2 px-1 font-medium">{t('draw')}</th>
                      <th className="text-center py-2 px-1 font-medium">{t('away_win')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.bettingOdds.slice(0, 3).map((odds, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium">{odds.bookmaker}</td>
                        <td className="text-center py-2 px-1 font-mono-data">{odds.homeWin.toFixed(2)}</td>
                        <td className="text-center py-2 px-1 font-mono-data">{odds.draw.toFixed(2)}</td>
                        <td className="text-center py-2 px-1 font-mono-data">{odds.awayWin.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 业主信息 */}
        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold">{t('team_owners')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OwnerCard owner={ownersData.homeOwner} team={match.homeTeam} />
            <OwnerCard owner={ownersData.awayOwner} team={match.awayTeam} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;

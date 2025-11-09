import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, User } from "lucide-react";
import { MatchDetailData } from "@/types/footballApi";

export default function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState<MatchDetailData | null>(null);

  useEffect(() => {
    if (matchId) {
      fetchMatchDetail();
    }
  }, [matchId]);

  const fetchMatchDetail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('football-match-detail', {
        body: { fixtureId: matchId }
      });

      if (error) throw error;
      setMatchData(data);
    } catch (error) {
      console.error('Error fetching match details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) + ' • ' + date.toLocaleTimeString(i18n.language, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace('%', ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  };

  const renderStatBar = (homeStat: any, awayStat: any, label: string) => {
    const homeVal = getStatValue(homeStat);
    const awayVal = getStatValue(awayStat);
    const total = homeVal + awayVal || 1;
    const homePercent = (homeVal / total) * 100;
    
    return (
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="font-semibold min-w-[30px] sm:min-w-[40px] text-left">{homeVal}</span>
          <span className="text-muted-foreground text-[10px] sm:text-xs text-center px-2">{label}</span>
          <span className="font-semibold min-w-[30px] sm:min-w-[40px] text-right">{awayVal}</span>
        </div>
        <div className="flex gap-0.5 sm:gap-1 h-1.5 sm:h-2">
          <div 
            className="bg-cyan-500 rounded-l" 
            style={{ width: `${homePercent}%` }}
          />
          <div 
            className="bg-amber-500 rounded-r" 
            style={{ width: `${100 - homePercent}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t('loading')}</p>
          </Card>
        </main>
      </div>
    );
  }

  if (!matchData?.fixture) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Match not found</p>
            <Button onClick={() => navigate('/models')} className="mt-4">
              Back to Schedule
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const { fixture, statistics, lineups, players } = matchData;
  const homeStats = statistics?.find(s => s.team.id === fixture.teams.home.id);
  const awayStats = statistics?.find(s => s.team.id === fixture.teams.away.id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 safe-area-padding">
        <Button
          variant="ghost"
          onClick={() => navigate('/models')}
          className="mb-3 sm:mb-4 text-xs sm:text-sm h-8 sm:h-10"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Back</span>
        </Button>

        <Card className="overflow-hidden">
          {/* Match Header */}
          <div className="bg-gradient-to-b from-primary/10 to-background p-3 sm:p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4 text-[10px] sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {fixture.league.flag && (
                  <img src={fixture.league.flag} alt="" className="h-3 w-5 sm:h-4 sm:w-6 object-cover" />
                )}
                <span className="text-center">{fixture.league.country}: {fixture.league.name}</span>
              </div>
              <span className="hidden sm:inline sm:ml-4">{fixture.league.round}</span>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-8 mb-3 sm:mb-4">
              {/* Home Team */}
              <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 max-w-[100px] sm:max-w-[200px]">
                <img src={fixture.teams.home.logo} alt="" className="h-12 w-12 sm:h-24 sm:w-24 object-contain" />
                <h2 className="text-xs sm:text-xl font-bold text-center line-clamp-2">{fixture.teams.home.name}</h2>
              </div>

              {/* Score */}
              <div className="text-center flex-shrink-0">
                <div className="text-[9px] sm:text-sm text-muted-foreground mb-1 sm:mb-2 whitespace-nowrap px-2">
                  {formatDate(fixture.fixture.date)}
                </div>
                <div className="text-3xl sm:text-5xl font-bold mb-1 sm:mb-2">
                  {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
                </div>
                <Badge className="bg-green-500/20 text-green-500 border-green-500/50 text-[9px] sm:text-xs px-1.5 sm:px-2.5">
                  {fixture.fixture.status.long}
                </Badge>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 max-w-[100px] sm:max-w-[200px]">
                <img src={fixture.teams.away.logo} alt="" className="h-12 w-12 sm:h-24 sm:w-24 object-contain" />
                <h2 className="text-xs sm:text-xl font-bold text-center line-clamp-2">{fixture.teams.away.name}</h2>
              </div>
            </div>

            {/* Venue Info */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-[10px] sm:text-sm text-muted-foreground">
              {fixture.fixture.referee && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate max-w-[150px] sm:max-w-none">{fixture.fixture.referee}</span>
                </div>
              )}
              {fixture.fixture.venue.name && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate max-w-[150px] sm:max-w-none">{fixture.fixture.venue.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="statistics" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 overflow-x-auto flex-nowrap">
              <TabsTrigger 
                value="events" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[10px] sm:text-sm px-2 sm:px-4 whitespace-nowrap"
              >
                <span className="hidden sm:inline">EVENTS</span>
                <span className="sm:hidden">事件</span>
              </TabsTrigger>
              <TabsTrigger 
                value="statistics"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[10px] sm:text-sm px-2 sm:px-4 whitespace-nowrap"
              >
                <span className="hidden sm:inline">STATISTICS</span>
                <span className="sm:hidden">统计</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lineups"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[10px] sm:text-sm px-2 sm:px-4 whitespace-nowrap"
              >
                <span className="hidden sm:inline">LINEUPS</span>
                <span className="sm:hidden">阵容</span>
              </TabsTrigger>
              <TabsTrigger 
                value="players"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-[10px] sm:text-sm px-2 sm:px-4 whitespace-nowrap"
              >
                <span className="hidden sm:inline">PLAYERS</span>
                <span className="sm:hidden">球员</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="p-3 sm:p-6">
              <p className="text-center text-muted-foreground text-xs sm:text-sm">Events data coming soon</p>
            </TabsContent>

            <TabsContent value="statistics" className="p-3 sm:p-6">
              {homeStats && awayStats ? (
                <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
                  {homeStats.statistics.map((stat, index) => {
                    const awayStat = awayStats.statistics[index];
                    return (
                      <div key={index}>
                        {renderStatBar(stat.value, awayStat?.value, stat.type)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-xs sm:text-sm">No statistics available</p>
              )}
            </TabsContent>

            <TabsContent value="lineups" className="p-3 sm:p-6">
              {lineups && lineups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  {lineups.map((lineup) => (
                    <div key={lineup.team.id} className="bg-muted/30 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <img src={lineup.team.logo} alt="" className="h-6 w-6 sm:h-8 sm:w-8 object-contain" />
                        <h3 className="font-bold text-sm sm:text-base truncate flex-1">{lineup.team.name}</h3>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{lineup.formation}</Badge>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">Starting XI</h4>
                        {lineup.startXI.map((p) => (
                          <div key={p.player.id} className="flex items-center gap-2 text-xs sm:text-sm bg-background/50 rounded px-2 py-1.5">
                            <span className="w-5 sm:w-6 text-center font-semibold bg-primary/20 rounded px-1">{p.player.number}</span>
                            <span className="flex-1 truncate">{p.player.name}</span>
                            <span className="text-muted-foreground text-[10px] sm:text-xs">{p.player.pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-xs sm:text-sm">No lineup data available</p>
              )}
            </TabsContent>

            <TabsContent value="players" className="p-3 sm:p-6">
              <p className="text-center text-muted-foreground text-xs sm:text-sm">Player statistics coming soon</p>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}

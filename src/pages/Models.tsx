import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronDown, ChevronRight, Calendar, Search } from "lucide-react";
import { FixtureResponse } from "@/types/footballApi";

export default function Models() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fixtures, setFixtures] = useState<FixtureResponse[]>([]);
  const [expandedLeagues, setExpandedLeagues] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchFixtures();
  }, []);

  const fetchFixtures = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('football-fixtures', {
        body: { 
          league: '39',  // Premier League
          season: '2024',
          status: 'upcoming'
        }
      });

      if (error) throw error;
      if (data?.response) {
        setFixtures(data.response);
        // Auto-expand all leagues
        const leagueIds = new Set<number>(data.response.map((f: FixtureResponse) => f.league.id));
        setExpandedLeagues(leagueIds);
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLeague = (leagueId: number) => {
    const newExpanded = new Set(expandedLeagues);
    if (newExpanded.has(leagueId)) {
      newExpanded.delete(leagueId);
    } else {
      newExpanded.add(leagueId);
    }
    setExpandedLeagues(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TBD':
      case 'NS':
        return 'text-muted-foreground';
      case '1H':
      case '2H':
      case 'HT':
      case 'LIVE':
        return 'text-green-500';
      case 'FT':
      case 'AET':
      case 'PEN':
        return 'text-green-500';
      case 'PST':
      case 'CANC':
      case 'ABD':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  };

  const groupByLeague = (fixtures: FixtureResponse[]) => {
    const grouped = new Map<number, { league: any; fixtures: FixtureResponse[] }>();
    
    fixtures.forEach(fixture => {
      const leagueId = fixture.league.id;
      if (!grouped.has(leagueId)) {
        grouped.set(leagueId, {
          league: fixture.league,
          fixtures: []
        });
      }
      grouped.get(leagueId)!.fixtures.push(fixture);
    });

    return Array.from(grouped.values());
  };

  const filterFixtures = (fixtures: FixtureResponse[]) => {
    switch (activeTab) {
      case 'live':
        return fixtures.filter(f => ['1H', '2H', 'HT', 'LIVE'].includes(f.fixture.status.short));
      case 'finished':
        return fixtures.filter(f => ['FT', 'AET', 'PEN'].includes(f.fixture.status.short));
      case 'scheduled':
        return fixtures.filter(f => ['TBD', 'NS'].includes(f.fixture.status.short));
      default:
        return fixtures;
    }
  };

  const filteredFixtures = filterFixtures(fixtures);
  const groupedFixtures = groupByLeague(filteredFixtures);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all" className="text-sm">ALL</TabsTrigger>
                <TabsTrigger value="live" className="text-sm text-green-500">LIVE</TabsTrigger>
                <TabsTrigger value="finished" className="text-sm">FINISHED</TabsTrigger>
                <TabsTrigger value="scheduled" className="text-sm">SCHEDULED</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  1 OCT.
                </Button>
                <Button variant="ghost" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{t('loading')}</p>
                </Card>
              ) : groupedFixtures.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No matches available</p>
                </Card>
              ) : (
                groupedFixtures.map(({ league, fixtures: leagueFixtures }) => (
                  <Card key={league.id} className="overflow-hidden bg-card/50 backdrop-blur">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
                      onClick={() => toggleLeague(league.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        {league.flag && (
                          <img src={league.flag} alt="" className="h-4 w-6 object-cover" />
                        )}
                        <span className="font-medium text-sm">
                          {league.country}: {league.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                          Standings
                        </Button>
                        {expandedLeagues.has(league.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {expandedLeagues.has(league.id) && (
                      <div className="divide-y divide-border/50">
                        {leagueFixtures.map((fixture) => (
                          <div
                            key={fixture.fixture.id}
                            className="flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => navigate(`/match/${fixture.fixture.id}`)}
                          >
                            <div className="w-12 text-center">
                              <span className={`text-xs font-medium ${getStatusColor(fixture.fixture.status.short)}`}>
                                {fixture.fixture.status.short === 'NS' ? formatTime(fixture.fixture.date) : fixture.fixture.status.short}
                              </span>
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <img src={fixture.teams.home.logo} alt="" className="h-5 w-5" />
                                  <span className="text-sm">{fixture.teams.home.name}</span>
                                </div>
                                <span className="text-sm font-semibold min-w-[20px] text-center">
                                  {fixture.goals.home ?? '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <img src={fixture.teams.away.logo} alt="" className="h-5 w-5" />
                                  <span className="text-sm">{fixture.teams.away.name}</span>
                                </div>
                                <span className="text-sm font-semibold min-w-[20px] text-center">
                                  {fixture.goals.away ?? '-'}
                                </span>
                              </div>
                            </div>

                            {fixture.fixture.status.short !== 'NS' && fixture.fixture.status.elapsed && (
                              <div className="text-xs text-muted-foreground">
                                ({fixture.fixture.status.elapsed}')
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

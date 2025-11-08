import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, Calendar, Clock, MapPin } from "lucide-react";
import { FixtureResponse } from "@/types/footballApi";

const Models = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [liveMatches, setLiveMatches] = useState<FixtureResponse[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<FixtureResponse[]>([]);

  useEffect(() => {
    fetchFixtures();
  }, []);

  const fetchFixtures = async () => {
    try {
      setLoading(true);

      // 获取正在进行的比赛
      const { data: liveData, error: liveError } = await supabase.functions.invoke('football-fixtures', {
        body: { status: 'live' }
      });

      if (liveError) {
        console.error('Error fetching live fixtures:', liveError);
      } else if (liveData?.response) {
        setLiveMatches(liveData.response.slice(0, 20));
      }

      // 获取即将到来的比赛（英超）
      const { data: upcomingData, error: upcomingError } = await supabase.functions.invoke('football-fixtures', {
        body: { league: '39', season: '2024' }
      });

      if (upcomingError) {
        console.error('Error fetching upcoming fixtures:', upcomingError);
      } else if (upcomingData?.response) {
        setUpcomingMatches(upcomingData.response.slice(0, 30));
      }

    } catch (error) {
      console.error('Error in fetchFixtures:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (i18n.language === 'zh') {
      return date.toLocaleDateString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, elapsed: number | null) => {
    switch (status) {
      case 'LIVE':
      case '1H':
      case '2H':
        return (
          <Badge variant="default" className="bg-success/20 text-success border-success/50 animate-pulse">
            {elapsed ? `${elapsed}'` : 'LIVE'}
          </Badge>
        );
      case 'HT':
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/50">
            {t('half_time')}
          </Badge>
        );
      case 'FT':
        return (
          <Badge variant="outline" className="bg-muted/50">
            {t('finished')}
          </Badge>
        );
      case 'NS':
      case 'TBD':
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/50">
            {t('upcoming')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleMatchClick = (fixtureId: number) => {
    navigate(`/match/${fixtureId}`);
  };

  const renderMatchTable = (matches: FixtureResponse[], showStatus: boolean = true) => {
    if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center py-12">
            <p className="text-muted-foreground">{t('no_upcoming_matches')}</p>
          </TableCell>
        </TableRow>
      );
    }

    return matches.map((match) => (
      <TableRow 
        key={match.fixture.id}
        className="hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => handleMatchClick(match.fixture.id)}
      >
        <TableCell className="font-medium text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            {showStatus && getStatusBadge(match.fixture.status.short, match.fixture.status.elapsed)}
            <span className="hidden sm:inline text-muted-foreground">
              {formatDate(match.fixture.date)}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="text-xs text-muted-foreground">
            {match.league.name}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <img src={match.teams.home.logo} alt="" className="w-6 h-6" />
            <span className="text-sm font-medium">{match.teams.home.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            {match.goals.home !== null && match.goals.away !== null ? (
              <>
                <span className="text-lg font-bold font-mono-data">{match.goals.home}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-lg font-bold font-mono-data">{match.goals.away}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">VS</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm font-medium">{match.teams.away.name}</span>
            <img src={match.teams.away.logo} alt="" className="w-6 h-6" />
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
          {match.fixture.venue.name && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {match.fixture.venue.name}
            </div>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
            {t('match_schedule')}
          </h1>
          <div className="w-full h-px bg-border"></div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="live" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('live')} ({liveMatches.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('upcoming')} ({upcomingMatches.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              <Card className="border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">{t('time')}</TableHead>
                      <TableHead className="w-[120px]">{t('league')}</TableHead>
                      <TableHead>{t('home_team')}</TableHead>
                      <TableHead className="text-center w-[100px]">{t('score')}</TableHead>
                      <TableHead className="text-right">{t('away_team')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('venue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderMatchTable(liveMatches, true)}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming">
              <Card className="border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">{t('time')}</TableHead>
                      <TableHead className="w-[120px]">{t('league')}</TableHead>
                      <TableHead>{t('home_team')}</TableHead>
                      <TableHead className="text-center w-[100px]">{t('score')}</TableHead>
                      <TableHead className="text-right">{t('away_team')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('venue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderMatchTable(upcomingMatches, true)}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Models;

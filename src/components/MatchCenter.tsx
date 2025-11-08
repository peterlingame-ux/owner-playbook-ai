import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, CheckCircle2, TrendingUp, CloudRain, Cloud, Sun, CloudSnow } from "lucide-react";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import { Match } from "@/types/prediction";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MatchCenter = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const liveMatches = upcomingMatches.filter(m => m.status === 'live');
  const upcoming = upcomingMatches.filter(m => m.status === 'upcoming');
  const finished = pastMatches;

  // Helper function to get team name based on language
  const getTeamName = (match: Match, team: 'home' | 'away') => {
    if (i18n.language === 'zh') {
      return team === 'home' 
        ? (match.homeTeamZh || match.homeTeam)
        : (match.awayTeamZh || match.awayTeam);
    }
    return team === 'home' ? match.homeTeam : match.awayTeam;
  };

  // Helper function to get league name based on language
  const getLeagueName = (match: Match) => {
    if (i18n.language === 'zh') {
      return match.leagueZh || match.league;
    }
    return match.league;
  };

  // Weather icon helper
  const getWeatherIcon = (weather?: string) => {
    switch(weather) {
      case 'sunny': return <Sun className="w-3.5 h-3.5 text-yellow-500" />;
      case 'rainy': return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
      case 'cloudy': return <Cloud className="w-3.5 h-3.5 text-gray-400" />;
      case 'snowy': return <CloudSnow className="w-3.5 h-3.5 text-blue-200" />;
      default: return null;
    }
  };

  const MatchRow = ({ match, type }: { match: Match; type: 'live' | 'upcoming' | 'finished' }) => (
    <TableRow 
      className="hover:bg-accent/30 cursor-pointer transition-colors border-b border-border/40"
      onClick={() => navigate(`/match/${match.id}`)}
    >
      {/* Status & Time */}
      <TableCell className="w-[100px] py-3">
        <div className="flex flex-col items-start gap-1">
          {type === 'live' && (
            <>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 font-semibold">
                <Activity className="w-2.5 h-2.5 mr-0.5 animate-pulse" />
                LIVE
              </Badge>
              <span className="text-[11px] text-muted-foreground font-medium">{match.currentMinute}'</span>
            </>
          )}
          {type === 'upcoming' && (
            <>
              <span className="text-xs font-semibold text-foreground">{match.time}</span>
              <span className="text-[10px] text-muted-foreground">{match.date}</span>
            </>
          )}
          {type === 'finished' && (
            <>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                FT
              </Badge>
              <span className="text-[10px] text-muted-foreground">{match.date}</span>
            </>
          )}
        </div>
      </TableCell>

      {/* League */}
      <TableCell className="w-[140px] py-3">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold text-foreground/90 truncate">
            {getLeagueName(match)}
          </div>
        </div>
      </TableCell>

      {/* Home Team */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2 justify-end">
          <span className="text-sm font-semibold text-foreground truncate">
            {getTeamName(match, 'home')}
          </span>
          <img 
            src={match.homeLogo} 
            alt={match.homeTeam} 
            className="w-6 h-6 object-contain flex-shrink-0" 
          />
        </div>
      </TableCell>

      {/* Score */}
      <TableCell className="w-[80px] py-3">
        <div className="flex items-center justify-center gap-2">
          {(type === 'live' || type === 'finished') ? (
            <div className="flex items-center gap-1.5 bg-muted/50 rounded px-3 py-1.5">
              <span className="text-lg font-bold text-foreground">{match.homeScore}</span>
              <span className="text-muted-foreground text-sm">-</span>
              <span className="text-lg font-bold text-foreground">{match.awayScore}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">VS</span>
          )}
        </div>
      </TableCell>

      {/* Away Team */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <img 
            src={match.awayLogo} 
            alt={match.awayTeam} 
            className="w-6 h-6 object-contain flex-shrink-0" 
          />
          <span className="text-sm font-semibold text-foreground truncate">
            {getTeamName(match, 'away')}
          </span>
        </div>
      </TableCell>

      {/* Stats */}
      <TableCell className="w-[120px] py-3">
        {(type === 'live' || type === 'finished') && (
          <div className="flex items-center gap-3 justify-center text-[10px]">
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground mb-0.5">⚽</span>
              <span className="font-semibold text-foreground">{match.homeCorners}-{match.awayCorners}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground mb-0.5">🟨</span>
              <span className="font-semibold text-foreground">{match.homeYellowCards}-{match.awayYellowCards}</span>
            </div>
            {(match.homeRedCards > 0 || match.awayRedCards > 0) && (
              <div className="flex flex-col items-center">
                <span className="text-muted-foreground mb-0.5">🟥</span>
                <span className="font-semibold text-destructive">{match.homeRedCards}-{match.awayRedCards}</span>
              </div>
            )}
          </div>
        )}
        {type === 'upcoming' && match.weather && (
          <div className="flex justify-center">
            {getWeatherIcon(match.weather)}
          </div>
        )}
      </TableCell>

      {/* Action */}
      <TableCell className="w-[80px] py-3">
        <div className="flex justify-center">
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 hover:bg-primary/10 transition-colors">
            <TrendingUp className="w-3 h-3 mr-1" />
            {t('details')}
          </Badge>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Card className="h-[600px] flex flex-col border-border/60 bg-card/95 backdrop-blur">
      {/* Tabs */}
      <Tabs defaultValue="live" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-3 mb-0 bg-muted/50">
          <TabsTrigger value="live" className="text-xs font-semibold data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
            <Activity className="w-3 h-3 mr-1" />
            {t('live')} <span className="ml-1 opacity-70">({liveMatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs font-semibold">
            <Clock className="w-3 h-3 mr-1" />
            {t('upcoming')} <span className="ml-1 opacity-70">({upcoming.length})</span>
          </TabsTrigger>
          <TabsTrigger value="finished" className="text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('finished')} <span className="ml-1 opacity-70">({finished.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="live" className="h-full m-0 p-3 pt-2">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('status')}</TableHead>
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('league')}</TableHead>
                    <TableHead className="text-right text-[10px] font-bold text-muted-foreground">{t('home')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground">{t('score')}</TableHead>
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('away')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground">{t('stats')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveMatches.length > 0 ? (
                    liveMatches.map((match) => (
                      <MatchRow key={match.id} match={match} type="live" />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                        {t('no_live_matches')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upcoming" className="h-full m-0 p-3 pt-2">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('time')}</TableHead>
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('league')}</TableHead>
                    <TableHead className="text-right text-[10px] font-bold text-muted-foreground">{t('home')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground"></TableHead>
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('away')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground">{t('weather')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length > 0 ? (
                    upcoming.map((match) => (
                      <MatchRow key={match.id} match={match} type="upcoming" />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                        {t('no_upcoming_matches')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="finished" className="h-full m-0 p-3 pt-2">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('status')}</TableHead>
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('league')}</TableHead>
                    <TableHead className="text-right text-[10px] font-bold text-muted-foreground">{t('home')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground">{t('result')}</TableHead>
                    <TableHead className="text-[10px] font-bold text-muted-foreground">{t('away')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground">{t('stats')}</TableHead>
                    <TableHead className="text-center text-[10px] font-bold text-muted-foreground"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finished.length > 0 ? (
                    finished.map((match) => (
                      <MatchRow key={match.id} match={match} type="finished" />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                        {t('no_finished_matches')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
};

export default MatchCenter;

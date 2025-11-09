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
import { useState } from "react";
import { useLongPress } from "@/hooks/useLongPress";
import { MatchContextMenu } from "@/components/MatchContextMenu";
import { toast } from "sonner";

const MatchCenter = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{
    match: Match | null;
    isOpen: boolean;
    position: { x: number; y: number };
  }>({
    match: null,
    isOpen: false,
    position: { x: 0, y: 0 }
  });

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

  const MatchRow = ({ match, type }: { match: Match; type: 'live' | 'upcoming' | 'finished' }) => {
    const longPress = useLongPress({
      onLongPress: (e) => {
        e.preventDefault();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setContextMenu({
          match,
          isOpen: true,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          }
        });
      },
      onClick: () => navigate(`/match/${match.id}`)
    });

    return (
      <TableRow 
        {...longPress.handlers}
        className="hover:bg-accent/30 cursor-pointer transition-colors border-b border-border/40 touch-none select-none"
      >
      {/* Status & Time */}
      <TableCell className="w-[70px] sm:w-[100px] py-2 sm:py-3 px-2">
        <div className="flex flex-col items-start gap-0.5 sm:gap-1">
          {type === 'live' && (
            <>
              <Badge variant="destructive" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 font-semibold">
                <Activity className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 animate-pulse" />
                <span className="hidden sm:inline">LIVE</span>
                <span className="sm:hidden">•</span>
              </Badge>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{match.currentMinute}'</span>
            </>
          )}
          {type === 'upcoming' && (
            <>
              <span className="text-[10px] sm:text-xs font-semibold text-foreground">{match.time}</span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-[60px]">{match.date}</span>
            </>
          )}
          {type === 'finished' && (
            <>
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5">
                <CheckCircle2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5" />
                <span className="hidden sm:inline">FT</span>
              </Badge>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-[60px]">{match.date}</span>
            </>
          )}
        </div>
      </TableCell>

      {/* League - Hidden on mobile */}
      <TableCell className="hidden md:table-cell w-[140px] py-3 px-2">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold text-foreground/90 truncate">
            {getLeagueName(match)}
          </div>
        </div>
      </TableCell>

      {/* Home Team */}
      <TableCell className="py-2 sm:py-3 px-1 sm:px-2">
        <div className="flex items-center gap-1 sm:gap-2 justify-end">
          <span className="text-[11px] sm:text-sm font-semibold text-foreground truncate max-w-[60px] sm:max-w-none">
            {getTeamName(match, 'home')}
          </span>
          <img 
            src={match.homeLogo} 
            alt={match.homeTeam} 
            className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0" 
          />
        </div>
      </TableCell>

      {/* Score */}
      <TableCell className="w-[60px] sm:w-[80px] py-2 sm:py-3 px-1">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {(type === 'live' || type === 'finished') ? (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-muted/50 rounded px-2 sm:px-3 py-1 sm:py-1.5">
              <span className="text-base sm:text-lg font-bold text-foreground">{match.homeScore}</span>
              <span className="text-muted-foreground text-xs sm:text-sm">-</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{match.awayScore}</span>
            </div>
          ) : (
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">VS</span>
          )}
        </div>
      </TableCell>

      {/* Away Team */}
      <TableCell className="py-2 sm:py-3 px-1 sm:px-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <img 
            src={match.awayLogo} 
            alt={match.awayTeam} 
            className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0" 
          />
          <span className="text-[11px] sm:text-sm font-semibold text-foreground truncate max-w-[60px] sm:max-w-none">
            {getTeamName(match, 'away')}
          </span>
        </div>
      </TableCell>

      {/* Stats - Hidden on mobile */}
      <TableCell className="hidden sm:table-cell w-[100px] sm:w-[120px] py-3 px-2">
        {(type === 'live' || type === 'finished') && (
          <div className="flex items-center gap-2 sm:gap-3 justify-center text-[10px]">
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

      {/* Action - Hidden on small mobile */}
      <TableCell className="hidden sm:table-cell w-[60px] sm:w-[80px] py-3 px-1">
        <div className="flex justify-center">
          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 hover:bg-primary/10 transition-colors">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
            <span className="hidden md:inline">{t('details')}</span>
          </Badge>
        </div>
      </TableCell>
    </TableRow>
    );
  };

  return (
    <>
      <MatchContextMenu
        match={contextMenu.match}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu({ match: null, isOpen: false, position: { x: 0, y: 0 } })}
        position={contextMenu.position}
        onViewDetails={() => {
          if (contextMenu.match) navigate(`/match/${contextMenu.match.id}`);
        }}
        onShare={() => {
          toast.success(t('share_success') || '已复制分享链接');
        }}
        onSetReminder={() => {
          toast.success(t('reminder_set') || '提醒设置成功');
        }}
        onAddFavorite={() => {
          toast.success(t('favorite_added') || '已添加到收藏');
        }}
      />
      <Card className="h-[500px] sm:h-[600px] flex flex-col border-border/60 bg-card/95 backdrop-blur safe-area-padding">
      {/* Tabs */}
      <Tabs defaultValue="live" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2 sm:m-3 mb-0 bg-muted/50">
          <TabsTrigger value="live" className="text-[10px] sm:text-xs font-semibold data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground px-1 sm:px-3">
            <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
            <span className="hidden xs:inline">{t('live')}</span>
            <span className="ml-0.5 sm:ml-1 opacity-70">({liveMatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-[10px] sm:text-xs font-semibold px-1 sm:px-3">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
            <span className="hidden xs:inline">{t('upcoming')}</span>
            <span className="ml-0.5 sm:ml-1 opacity-70">({upcoming.length})</span>
          </TabsTrigger>
          <TabsTrigger value="finished" className="text-[10px] sm:text-xs font-semibold px-1 sm:px-3">
            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
            <span className="hidden xs:inline">{t('finished')}</span>
            <span className="ml-0.5 sm:ml-1 opacity-70">({finished.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="live" className="h-full m-0 p-2 sm:p-3 pt-1 sm:pt-2">
            <ScrollArea className="h-full">
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow className="border-b border-border/60 hover:bg-transparent">
                      <TableHead className="text-[9px] sm:text-[10px] font-bold text-muted-foreground px-2">{t('status')}</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] font-bold text-muted-foreground px-2">{t('league')}</TableHead>
                      <TableHead className="text-right text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1 sm:px-2">{t('home')}</TableHead>
                      <TableHead className="text-center text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1">{t('score')}</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1 sm:px-2">{t('away')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-center text-[10px] font-bold text-muted-foreground px-2">{t('stats')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-center text-[10px] font-bold text-muted-foreground px-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveMatches.length > 0 ? (
                      liveMatches.map((match) => (
                        <MatchRow key={match.id} match={match} type="live" />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                          {t('no_live_matches')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upcoming" className="h-full m-0 p-2 sm:p-3 pt-1 sm:pt-2">
            <ScrollArea className="h-full">
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow className="border-b border-border/60 hover:bg-transparent">
                      <TableHead className="text-[9px] sm:text-[10px] font-bold text-muted-foreground px-2">{t('time')}</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] font-bold text-muted-foreground px-2">{t('league')}</TableHead>
                      <TableHead className="text-right text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1 sm:px-2">{t('home')}</TableHead>
                      <TableHead className="text-center text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1"></TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1 sm:px-2">{t('away')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-center text-[10px] font-bold text-muted-foreground px-2">{t('weather')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-center text-[10px] font-bold text-muted-foreground px-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.length > 0 ? (
                      upcoming.map((match) => (
                        <MatchRow key={match.id} match={match} type="upcoming" />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                          {t('no_upcoming_matches')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="finished" className="h-full m-0 p-2 sm:p-3 pt-1 sm:pt-2">
            <ScrollArea className="h-full">
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow className="border-b border-border/60 hover:bg-transparent">
                      <TableHead className="text-[9px] sm:text-[10px] font-bold text-muted-foreground px-2">{t('status')}</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] font-bold text-muted-foreground px-2">{t('league')}</TableHead>
                      <TableHead className="text-right text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1 sm:px-2">{t('home')}</TableHead>
                      <TableHead className="text-center text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1">{t('result')}</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] font-bold text-muted-foreground px-1 sm:px-2">{t('away')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-center text-[10px] font-bold text-muted-foreground px-2">{t('stats')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-center text-[10px] font-bold text-muted-foreground px-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finished.length > 0 ? (
                      finished.map((match) => (
                        <MatchRow key={match.id} match={match} type="finished" />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                          {t('no_finished_matches')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
    </>
  );
};

export default MatchCenter;

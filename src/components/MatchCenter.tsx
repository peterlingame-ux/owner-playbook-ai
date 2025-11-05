import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, CheckCircle2, Timer } from "lucide-react";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import { Match } from "@/types/prediction";
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, parseISO } from "date-fns";
import footballFieldBg from "@/assets/football-field-bg.jpg";

const MatchCenter = () => {
  const { t } = useTranslation();

  // Split matches into live and upcoming
  const liveMatches = upcomingMatches.filter(m => m.status === 'live');
  const upcoming = upcomingMatches.filter(m => m.status === 'upcoming');
  const finished = pastMatches;

  // Countdown component
  const CountdownTimer = ({ match, type }: { match: Match; type: 'live' | 'upcoming' }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const calculateTimeLeft = () => {
        const now = new Date();
        const matchDateTime = new Date(`${match.date}T${match.time}`);
        
        if (type === 'upcoming') {
          // Calculate time until match starts
          const totalSeconds = differenceInSeconds(matchDateTime, now);
          
          if (totalSeconds <= 0) {
            setTimeLeft('即将开始');
            return;
          }

          const days = Math.floor(totalSeconds / 86400);
          const hours = Math.floor((totalSeconds % 86400) / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          if (days > 0) {
            setTimeLeft(`${days}天${hours}小时后开始`);
          } else if (hours > 0) {
            setTimeLeft(`${hours}小时${minutes}分后开始`);
          } else if (minutes > 0) {
            setTimeLeft(`${minutes}分${seconds}秒后开始`);
          } else {
            setTimeLeft(`${seconds}秒后开始`);
          }
        } else if (type === 'live') {
          // Calculate estimated time remaining (90 mins - current minute)
          const currentMinute = match.currentMinute || 0;
          const estimatedEndTime = 90;
          const minutesLeft = estimatedEndTime - currentMinute;
          
          if (minutesLeft <= 0) {
            setTimeLeft('即将结束');
          } else {
            setTimeLeft(`约${minutesLeft}分钟后结束`);
          }
        }
      };

      calculateTimeLeft();
      const interval = setInterval(calculateTimeLeft, 1000);

      return () => clearInterval(interval);
    }, [match, type]);

    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary via-primary/90 to-primary/80 border-2 border-primary/50 shadow-lg shadow-primary/30 backdrop-blur-sm">
        <Timer className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
        <span className="text-xs font-bold text-primary-foreground whitespace-nowrap">{timeLeft}</span>
      </div>
    );
  };

  const MatchCard = ({ match, type }: { match: Match; type: 'live' | 'upcoming' | 'finished' }) => (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover-scale cursor-pointer">
      {type === 'live' && (
        <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-transparent to-destructive/5 animate-pulse" />
      )}
      
      <div className="relative p-4">
        {/* Countdown Timer - Top Left */}
        {(type === 'live' || type === 'upcoming') && (
          <div className="mb-2">
            <CountdownTimer match={match} type={type} />
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {type === 'live' && (
              <div className="relative">
                <Activity className="w-4 h-4 text-destructive animate-pulse" />
                <span className="absolute inset-0 w-4 h-4 bg-destructive/20 rounded-full animate-ping" />
              </div>
            )}
            <span className="text-xs font-medium text-muted-foreground">{match.league}</span>
          </div>
          
          {type === 'live' && (
            <Badge variant="destructive" className="animate-pulse shadow-lg shadow-destructive/20">
              <span className="relative flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping absolute" />
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                {match.currentMinute}'
              </span>
            </Badge>
          )}
          {type === 'upcoming' && (
            <Badge variant="outline" className="border-primary/20 bg-primary/5">
              <Clock className="w-3 h-3 mr-1" />
              {match.time}
            </Badge>
          )}
          {type === 'finished' && (
            <Badge variant="secondary" className="bg-secondary/50">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t('finished')}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {/* Home Team */}
          <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background/50 group-hover:bg-background/80 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                <img 
                  src={match.homeLogo} 
                  alt={match.homeTeam} 
                  className="w-8 h-8 rounded-full ring-2 ring-border object-cover transition-transform group-hover:scale-110" 
                />
              </div>
              <span className="font-semibold truncate">{match.homeTeam}</span>
            </div>
            {(type === 'live' || type === 'finished') && (
              <span className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {match.homeScore}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background/50 group-hover:bg-background/80 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                <img 
                  src={match.awayLogo} 
                  alt={match.awayTeam} 
                  className="w-8 h-8 rounded-full ring-2 ring-border object-cover transition-transform group-hover:scale-110" 
                />
              </div>
              <span className="font-semibold truncate">{match.awayTeam}</span>
            </div>
            {(type === 'live' || type === 'finished') && (
              <span className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {match.awayScore}
              </span>
            )}
          </div>
        </div>

        {type === 'live' && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">角球</span>
                <span className="font-semibold">{match.homeCorners} - {match.awayCorners}</span>
              </div>
              {(match.homeYellowCards! > 0 || match.awayYellowCards! > 0) && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">黄牌</span>
                  <span className="font-semibold">{match.homeYellowCards} - {match.awayYellowCards}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url(${footballFieldBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <Card className="relative overflow-hidden border-border/30 bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-sm shadow-2xl">
        <div className="h-[600px] flex flex-col">
            <div className="relative p-5 border-b border-border/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-info/5 to-transparent" />
              <div className="relative flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
                  <Activity className="text-primary" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {t('match_schedule')}
                  </h2>
                  <p className="text-xs text-muted-foreground">实时赛事追踪 · AI智能分析</p>
                </div>
              </div>
            </div>

          <Tabs defaultValue="live" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4 mb-0 bg-secondary/30 backdrop-blur-sm h-12 p-1">
              <TabsTrigger 
                value="live" 
                className="text-xs sm:text-sm font-semibold data-[state=active]:bg-destructive/90 data-[state=active]:text-destructive-foreground data-[state=active]:shadow-lg transition-all"
              >
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                {t('live')} {liveMatches.length > 0 && `(${liveMatches.length})`}
              </TabsTrigger>
              <TabsTrigger 
                value="upcoming" 
                className="text-xs sm:text-sm font-semibold data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {t('upcoming')} {upcoming.length > 0 && `(${upcoming.length})`}
              </TabsTrigger>
              <TabsTrigger 
                value="finished" 
                className="text-xs sm:text-sm font-semibold data-[state=active]:bg-secondary data-[state=active]:shadow-lg transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {t('finished')} {finished.length > 0 && `(${finished.length})`}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="live" className="h-full m-0 p-4 pt-3">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {liveMatches.length > 0 ? (
                      liveMatches.map((match) => (
                        <MatchCard key={match.id} match={match} type="live" />
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        {t('no_live_matches')}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="upcoming" className="h-full m-0 p-4 pt-3">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {upcoming.length > 0 ? (
                      upcoming.map((match) => (
                        <MatchCard key={match.id} match={match} type="upcoming" />
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        {t('no_upcoming_matches')}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="finished" className="h-full m-0 p-4 pt-3">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {finished.length > 0 ? (
                      finished.map((match) => (
                        <MatchCard key={match.id} match={match} type="finished" />
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        {t('no_finished_matches')}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default MatchCenter;

import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import { Calendar, Clock, Trophy, AlertCircle } from "lucide-react";

const MatchSchedule = () => {
  const { t } = useTranslation();

  const liveMatches = upcomingMatches.filter(m => m.status === "live");
  const upcoming = upcomingMatches.filter(m => m.status === "upcoming");
  const finished = pastMatches;

  const MatchCard = ({ match, type }: { match: any; type: "live" | "upcoming" | "finished" }) => {
    return (
      <Card className="p-5 bg-gradient-to-br from-card/40 to-card/60 border border-border/50 hover:border-primary/30 transition-all mb-4 hover:shadow-lg hover:shadow-primary/5">
        {/* League Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary/70" />
            <span className="text-sm font-semibold text-foreground/90">{match.league}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{match.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{match.time}</span>
            </div>
          </div>
        </div>

        {/* Teams & Score Section */}
        <div className="space-y-4">
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <img 
                  src={match.homeLogo} 
                  alt={match.homeTeam}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-border/30"
                />
              </div>
              <span className="text-base font-semibold truncate">{match.homeTeam}</span>
            </div>
            
            {(type === "finished" || type === "live") && (
              <div className="text-2xl font-bold tabular-nums ml-4">
                {match.homeScore}
              </div>
            )}
          </div>

          {/* Divider with Status */}
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="flex-1 h-px bg-border/30"></div>
            {type === "live" ? (
              <Badge className="bg-destructive/90 text-destructive-foreground animate-pulse px-3 py-1 text-xs font-semibold">
                {match.currentMinute}' {t('live').toUpperCase()}
              </Badge>
            ) : type === "finished" ? (
              <Badge variant="outline" className="text-xs px-3 py-1">
                {t('finished').toUpperCase()}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground font-medium px-3">VS</span>
            )}
            <div className="flex-1 h-px bg-border/30"></div>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <img 
                  src={match.awayLogo} 
                  alt={match.awayTeam}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-border/30"
                />
              </div>
              <span className="text-base font-semibold truncate">{match.awayTeam}</span>
            </div>
            
            {(type === "finished" || type === "live") && (
              <div className="text-2xl font-bold tabular-nums ml-4">
                {match.awayScore}
              </div>
            )}
          </div>
        </div>

        {/* Match Stats */}
        {type === "live" && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-warning" />
                <span className="text-muted-foreground">
                  {match.homeYellowCards} - {match.awayYellowCards}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">🚩</span>
                <span className="text-muted-foreground">
                  {match.homeCorners} - {match.awayCorners}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Card className="p-5 bg-card border-border h-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="text-primary" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t('match_schedule')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">实时比赛动态</p>
        </div>
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-5 h-11 bg-secondary/50">
          <TabsTrigger value="live" className="text-xs font-semibold data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
            {t('live')} ({liveMatches.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs font-semibold">
            {t('upcoming')} ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="finished" className="text-xs font-semibold">
            {t('finished')} ({finished.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[340px] pr-2">
          <TabsContent value="live" className="mt-0">
            {liveMatches.length > 0 ? (
              liveMatches.map(match => (
                <MatchCard key={match.id} match={match} type="live" />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-12 px-4">
                <div className="inline-block p-4 bg-secondary/30 rounded-full mb-3">
                  <Trophy className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm">{t('no_live_matches')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0">
            {upcoming.length > 0 ? (
              upcoming.map(match => (
                <MatchCard key={match.id} match={match} type="upcoming" />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-12 px-4">
                <div className="inline-block p-4 bg-secondary/30 rounded-full mb-3">
                  <Clock className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm">{t('no_upcoming_matches')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="finished" className="mt-0">
            {finished.length > 0 ? (
              finished.map(match => (
                <MatchCard key={match.id} match={match} type="finished" />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-12 px-4">
                <div className="inline-block p-4 bg-secondary/30 rounded-full mb-3">
                  <Trophy className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm">{t('no_finished_matches')}</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
};

export default MatchSchedule;

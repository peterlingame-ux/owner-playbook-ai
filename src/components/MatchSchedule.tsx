import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import { Calendar, Clock, Trophy } from "lucide-react";

const MatchSchedule = () => {
  const { t } = useTranslation();

  const liveMatches = upcomingMatches.filter(m => m.status === "live");
  const upcoming = upcomingMatches.filter(m => m.status === "upcoming");
  const finished = pastMatches;

  const MatchCard = ({ match, type }: { match: any; type: "live" | "upcoming" | "finished" }) => {
    return (
      <Card className="p-3 bg-card/50 border-border hover:bg-card/70 transition-all mb-2">
        {/* League & Time */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            <Trophy className="w-3 h-3 mr-1" />
            {match.league}
          </Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{match.date}</span>
            <Clock className="w-3 h-3" />
            <span>{match.time}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex items-center gap-2 flex-1">
            <img 
              src={match.homeLogo} 
              alt={match.homeTeam}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium truncate">{match.homeTeam}</span>
          </div>

          {/* Score/Status */}
          <div className="px-4 flex items-center gap-2">
            {type === "live" && (
              <Badge className="bg-destructive animate-pulse text-xs">
                {match.currentMinute}'
              </Badge>
            )}
            {type === "finished" || type === "live" ? (
              <div className="flex items-center gap-2 font-bold text-lg">
                <span>{match.homeScore}</span>
                <span className="text-muted-foreground">:</span>
                <span>{match.awayScore}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">VS</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-sm font-medium truncate">{match.awayTeam}</span>
            <img 
              src={match.awayLogo} 
              alt={match.awayTeam}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        </div>

        {/* Additional Info */}
        {type === "live" && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>⚠️ {match.homeYellowCards}/{match.awayYellowCards}</span>
            <span>🚩 {match.homeCorners}/{match.awayCorners}</span>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Card className="p-4 bg-card border-border h-full">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="text-primary" size={24} />
        <h2 className="text-xl font-bold">{t('match_schedule')}</h2>
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="live" className="text-xs">
            {t('live')} ({liveMatches.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs">
            {t('upcoming')} ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="finished" className="text-xs">
            {t('finished')} ({finished.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[300px]">
          <TabsContent value="live" className="mt-0">
            {liveMatches.length > 0 ? (
              liveMatches.map(match => (
                <MatchCard key={match.id} match={match} type="live" />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {t('no_live_matches')}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0">
            {upcoming.length > 0 ? (
              upcoming.map(match => (
                <MatchCard key={match.id} match={match} type="upcoming" />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {t('no_upcoming_matches')}
              </div>
            )}
          </TabsContent>

          <TabsContent value="finished" className="mt-0">
            {finished.length > 0 ? (
              finished.map(match => (
                <MatchCard key={match.id} match={match} type="finished" />
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {t('no_finished_matches')}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
};

export default MatchSchedule;

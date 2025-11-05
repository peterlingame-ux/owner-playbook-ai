import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, CheckCircle2 } from "lucide-react";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import { Match } from "@/types/prediction";
import { useNavigate } from "react-router-dom";

const MatchCenter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const liveMatches = upcomingMatches.filter(m => m.status === 'live');
  const upcoming = upcomingMatches.filter(m => m.status === 'upcoming');
  const finished = pastMatches;

  const MatchCard = ({ match, type }: { match: Match; type: 'live' | 'upcoming' | 'finished' }) => (
    <Card 
      className="p-3 hover:bg-accent/50 transition-colors cursor-pointer border"
      onClick={() => navigate(`/match/${match.id}`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{match.league}</span>
        
        {type === 'live' && (
          <Badge variant="destructive" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            {match.currentMinute}'
          </Badge>
        )}
        {type === 'upcoming' && (
          <span className="text-xs text-muted-foreground">{match.date} {match.time}</span>
        )}
        {type === 'finished' && (
          <Badge variant="secondary" className="text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('finished')}
          </Badge>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img 
              src={match.homeLogo} 
              alt={match.homeTeam} 
              className="w-6 h-6 rounded-full object-cover" 
            />
            <span className="text-sm font-medium truncate">{match.homeTeam}</span>
          </div>
          {(type === 'live' || type === 'finished') && (
            <span className="text-lg font-bold ml-2">{match.homeScore}</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img 
              src={match.awayLogo} 
              alt={match.awayTeam} 
              className="w-6 h-6 rounded-full object-cover" 
            />
            <span className="text-sm font-medium truncate">{match.awayTeam}</span>
          </div>
          {(type === 'live' || type === 'finished') && (
            <span className="text-lg font-bold ml-2">{match.awayScore}</span>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <Card className="h-[600px] flex flex-col border-border">
      {/* Tabs */}
      <Tabs defaultValue="live" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-3">
          <TabsTrigger value="live" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            {t('live')} ({liveMatches.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {t('upcoming')} ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="finished" className="text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('finished')} ({finished.length})
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="live" className="h-full m-0 p-3">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-3">
                {liveMatches.length > 0 ? (
                  liveMatches.map((match) => (
                    <MatchCard key={match.id} match={match} type="live" />
                  ))
                ) : (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {t('no_live_matches')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upcoming" className="h-full m-0 p-3">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-3">
                {upcoming.length > 0 ? (
                  upcoming.map((match) => (
                    <MatchCard key={match.id} match={match} type="upcoming" />
                  ))
                ) : (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {t('no_upcoming_matches')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="finished" className="h-full m-0 p-3">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-3">
                {finished.length > 0 ? (
                  finished.map((match) => (
                    <MatchCard key={match.id} match={match} type="finished" />
                  ))
                ) : (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {t('no_finished_matches')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
};

export default MatchCenter;

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import { Match } from "@/types/prediction";
import ownerAnalysisBg from "@/assets/owner-analysis-bg.png";

const MatchCenter = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: t('chat_welcome')
    }
  ]);

  // Split matches into live and upcoming
  const liveMatches = upcomingMatches.filter(m => m.status === 'live');
  const upcoming = upcomingMatches.filter(m => m.status === 'upcoming');
  const finished = pastMatches;

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: message }]);
    setMessage("");
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: t('chat_ai_response')
      }]);
    }, 1000);
  };

  const MatchCard = ({ match, type }: { match: Match; type: 'live' | 'upcoming' | 'finished' }) => (
    <Card className="p-4 bg-card/50 border-border/50 hover:bg-card/80 transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-1 truncate">{match.league}</div>
          {type === 'live' && (
            <Badge variant="destructive" className="animate-pulse mb-2">
              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-ping" />
              {t('live')} {match.currentMinute}'
            </Badge>
          )}
          {type === 'upcoming' && (
            <Badge variant="outline" className="mb-2">
              <Clock className="w-3 h-3 mr-1" />
              {match.time}
            </Badge>
          )}
          {type === 'finished' && (
            <Badge variant="secondary" className="mb-2">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t('finished')}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={match.homeLogo} alt={match.homeTeam} className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium truncate">{match.homeTeam}</span>
          </div>
          {(type === 'live' || type === 'finished') && (
            <span className="text-xl font-bold ml-2">{match.homeScore}</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={match.awayLogo} alt={match.awayTeam} className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium truncate">{match.awayTeam}</span>
          </div>
          {(type === 'live' || type === 'finished') && (
            <span className="text-xl font-bold ml-2">{match.awayScore}</span>
          )}
        </div>
      </div>

      {type === 'live' && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>角球: {match.homeCorners} - {match.awayCorners}</span>
            {match.homeYellowCards! > 0 || match.awayYellowCards! > 0 ? (
              <span>黄牌: {match.homeYellowCards} - {match.awayYellowCards}</span>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card via-card to-card/80 border-border/50">
      <div className="grid grid-cols-1 lg:grid-cols-3 h-[600px]">
        {/* Left: Match Schedule - 2/3 width */}
        <div className="lg:col-span-2 border-r border-border/50 flex flex-col">
          <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary" size={24} />
              <div>
                <h2 className="text-xl font-bold">{t('match_schedule')}</h2>
                <p className="text-xs text-muted-foreground">{t('ai_assistant_subtitle')}</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="live" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
              <TabsTrigger value="live" className="text-xs sm:text-sm">
                {t('live')} {liveMatches.length > 0 && `(${liveMatches.length})`}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                {t('upcoming')} {upcoming.length > 0 && `(${upcoming.length})`}
              </TabsTrigger>
              <TabsTrigger value="finished" className="text-xs sm:text-sm">
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

        {/* Right: AI Chat - 1/3 width */}
        <div className="lg:col-span-1 flex flex-col relative">
          {/* Background */}
          <div 
            className="absolute inset-0 z-0 opacity-10"
            style={{
              backgroundImage: `url(${ownerAnalysisBg})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />

          <div className="p-4 border-b border-border/50 relative z-10 bg-gradient-to-r from-info/5 to-transparent">
            <div className="flex items-center gap-2">
              <Bot className="text-info" size={24} />
              <div>
                <h3 className="font-bold">{t('ai_assistant')}</h3>
                <p className="text-xs text-muted-foreground">智能赛事分析</p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 relative z-10">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/80 backdrop-blur-sm"
                    }`}
                  >
                    <p className={`text-sm ${msg.role === "assistant" ? "text-foreground" : ""}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/50 relative z-10 bg-card/80 backdrop-blur-sm">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder={t('chat_placeholder')}
                className="flex-1 bg-background/50 border-border placeholder:text-muted-foreground/50"
              />
              <Button onClick={handleSend} size="icon" className="flex-shrink-0">
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MatchCenter;

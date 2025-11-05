import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, MessageSquare, Activity, Clock, CheckCircle2, Sparkles } from "lucide-react";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import { Match } from "@/types/prediction";
import footballFieldBg from "@/assets/football-field-bg.jpg";

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
    <Card className="group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover-scale cursor-pointer">
      {type === 'live' && (
        <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-transparent to-destructive/5 animate-pulse" />
      )}
      
      <div className="relative p-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 h-[600px]">
          {/* Left: Match Schedule - 2/3 width */}
          <div className="lg:col-span-2 border-r border-border/30 flex flex-col">
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

        {/* Right: AI Chat - 1/3 width */}
        <div className="lg:col-span-1 flex flex-col relative bg-gradient-to-b from-card to-card/50">
          <div className="relative p-5 border-b border-border/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-info/10 via-info/5 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-info/20 to-info/10 backdrop-blur-sm">
                <Bot className="text-info" size={22} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {t('ai_assistant')}
                  </h3>
                  <Sparkles className="w-3.5 h-3.5 text-info animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">24/7 智能分析顾问</p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 relative">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                        : "bg-gradient-to-br from-secondary/80 to-secondary/60 backdrop-blur-sm border border-border/30"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-3.5 h-3.5 text-info" />
                        <span className="text-xs font-semibold text-muted-foreground">AI分析师</span>
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed ${msg.role === "assistant" ? "text-foreground" : ""}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/30 relative bg-card/50 backdrop-blur-sm">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder={t('chat_placeholder')}
                className="flex-1 bg-background/70 border-border/50 focus:border-info/50 placeholder:text-muted-foreground/50 transition-colors"
              />
              <Button 
                onClick={handleSend} 
                size="icon" 
                className="flex-shrink-0 bg-gradient-to-br from-info to-info/80 hover:from-info/90 hover:to-info/70 shadow-lg hover:shadow-info/20 transition-all"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
    </div>
  );
};

export default MatchCenter;

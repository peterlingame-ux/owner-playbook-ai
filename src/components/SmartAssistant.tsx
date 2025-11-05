import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, Calendar, Clock, Trophy, AlertCircle, TrendingUp } from "lucide-react";
import { upcomingMatches, pastMatches } from "@/data/mockData";
import ownerAnalysisBg from "@/assets/owner-analysis-bg.png";

const SmartAssistant = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; type?: "text" | "matches" }>>([
    {
      role: "assistant",
      content: t('chat_welcome'),
      type: "text"
    }
  ]);

  const liveMatches = upcomingMatches.filter(m => m.status === "live");
  const upcoming = upcomingMatches.filter(m => m.status === "upcoming");
  const finished = pastMatches;

  const handleSend = () => {
    if (!message.trim()) return;
    
    const userMessage = message.toLowerCase();
    setMessages(prev => [...prev, { role: "user", content: message, type: "text" }]);
    setMessage("");
    
    // Simulate AI response based on keywords
    setTimeout(() => {
      if (userMessage.includes('赛程') || userMessage.includes('比赛') || userMessage.includes('schedule') || userMessage.includes('match')) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "以下是当前的比赛安排，您可以点击「赛程表」标签查看更多详情：",
          type: "matches"
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: t('chat_ai_response'),
          type: "text"
        }]);
      }
    }, 1000);
  };

  const MatchCompactCard = ({ match, type }: { match: any; type: "live" | "upcoming" | "finished" }) => {
    return (
      <div className="p-3 bg-secondary/30 rounded-lg border border-border/30 hover:border-primary/30 transition-all mb-2">
        <div className="flex items-center justify-between gap-3">
          {/* League & Status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Trophy className="w-3 h-3 text-primary/70" />
            <span className="text-xs text-muted-foreground">{match.league}</span>
            {type === "live" && (
              <Badge className="bg-destructive animate-pulse text-xs px-1.5 py-0">
                {match.currentMinute}'
              </Badge>
            )}
          </div>
          
          {/* Time */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span>{match.time}</span>
          </div>
        </div>
        
        {/* Teams */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={match.homeLogo} alt={match.homeTeam} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              <span className="text-sm font-medium truncate">{match.homeTeam}</span>
            </div>
            {(type === "finished" || type === "live") && (
              <span className="text-lg font-bold tabular-nums ml-2">{match.homeScore}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={match.awayLogo} alt={match.awayTeam} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              <span className="text-sm font-medium truncate">{match.awayTeam}</span>
            </div>
            {(type === "finished" || type === "live") && (
              <span className="text-lg font-bold tabular-nums ml-2">{match.awayScore}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MatchDetailCard = ({ match, type }: { match: any; type: "live" | "upcoming" | "finished" }) => {
    return (
      <Card className="p-4 bg-gradient-to-br from-card/40 to-card/60 border border-border/50 hover:border-primary/30 transition-all mb-3 hover:shadow-lg hover:shadow-primary/5">
        {/* League Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
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

        {/* Teams & Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={match.homeLogo} alt={match.homeTeam} className="w-9 h-9 rounded-full object-cover ring-2 ring-border/30 flex-shrink-0" />
              <span className="text-base font-semibold truncate">{match.homeTeam}</span>
            </div>
            {(type === "finished" || type === "live") && (
              <div className="text-2xl font-bold tabular-nums ml-3">{match.homeScore}</div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 py-1">
            <div className="flex-1 h-px bg-border/30"></div>
            {type === "live" ? (
              <Badge className="bg-destructive/90 text-destructive-foreground animate-pulse px-2 py-0.5 text-xs font-semibold">
                {match.currentMinute}' {t('live').toUpperCase()}
              </Badge>
            ) : type === "finished" ? (
              <Badge variant="outline" className="text-xs px-2 py-0.5">FT</Badge>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">VS</span>
            )}
            <div className="flex-1 h-px bg-border/30"></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={match.awayLogo} alt={match.awayTeam} className="w-9 h-9 rounded-full object-cover ring-2 ring-border/30 flex-shrink-0" />
              <span className="text-base font-semibold truncate">{match.awayTeam}</span>
            </div>
            {(type === "finished" || type === "live") && (
              <div className="text-2xl font-bold tabular-nums ml-3">{match.awayScore}</div>
            )}
          </div>
        </div>

        {type === "live" && (
          <div className="mt-3 pt-2 border-t border-border/30">
            <div className="flex items-center justify-center gap-5 text-xs">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-warning" />
                <span className="text-muted-foreground">{match.homeYellowCards} - {match.awayYellowCards}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">🚩</span>
                <span className="text-muted-foreground">{match.homeCorners} - {match.awayCorners}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <Card className="p-5 bg-card border-border relative overflow-hidden h-full">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `url(${ownerAnalysisBg})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Header */}
      <div className="mb-4 relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="text-primary" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{t('ai_assistant')}</h2>
            <p className="text-xs text-muted-foreground">{t('ai_assistant_subtitle')}</p>
          </div>
          <TrendingUp className="w-5 h-5 text-success animate-pulse" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="grid w-full grid-cols-2 mb-4 h-10 bg-secondary/50">
          <TabsTrigger value="chat" className="text-xs font-semibold">
            💬 智能对话
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs font-semibold">
            📅 赛程表
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-0">
          <ScrollArea className="h-[280px] mb-4 p-3 bg-secondary/20 rounded-lg backdrop-blur-sm border border-border/30">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div key={index}>
                  {msg.type === "matches" ? (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] p-3 rounded-lg bg-accent">
                          <p className="text-sm text-muted-foreground">{msg.content}</p>
                        </div>
                      </div>
                      {liveMatches.slice(0, 2).map(match => (
                        <MatchCompactCard key={match.id} match={match} type="live" />
                      ))}
                    </div>
                  ) : (
                    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent"
                      }`}>
                        <p className={`text-sm ${msg.role === "assistant" ? "text-muted-foreground" : ""}`}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder={t('chat_placeholder')}
              className="flex-1 bg-secondary/50 border-border/50 placeholder:text-muted-foreground/50"
            />
            <Button onClick={handleSend} size="icon" className="flex-shrink-0">
              <Send size={18} />
            </Button>
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-0">
          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3 h-9 bg-secondary/30">
              <TabsTrigger value="live" className="text-xs data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
                直播 ({liveMatches.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs">
                未开始 ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="finished" className="text-xs">
                已结束 ({finished.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[295px] pr-2">
              <TabsContent value="live" className="mt-0">
                {liveMatches.length > 0 ? (
                  liveMatches.map(match => (
                    <MatchDetailCard key={match.id} match={match} type="live" />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-12 px-4">
                    <div className="inline-block p-3 bg-secondary/30 rounded-full mb-2">
                      <Trophy className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm">{t('no_live_matches')}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="mt-0">
                {upcoming.length > 0 ? (
                  upcoming.map(match => (
                    <MatchDetailCard key={match.id} match={match} type="upcoming" />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-12 px-4">
                    <div className="inline-block p-3 bg-secondary/30 rounded-full mb-2">
                      <Clock className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm">{t('no_upcoming_matches')}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="finished" className="mt-0">
                {finished.length > 0 ? (
                  finished.map(match => (
                    <MatchDetailCard key={match.id} match={match} type="finished" />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-12 px-4">
                    <div className="inline-block p-3 bg-secondary/30 rounded-full mb-2">
                      <Trophy className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm">{t('no_finished_matches')}</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default SmartAssistant;

import { useState } from "react";
import { Calendar, Search, Star, ChevronDown, Globe } from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { pastMatches } from "@/data/mockData";

export default function Models() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<string>(pastMatches[0]?.id);
  const [activeTab, setActiveTab] = useState("statistics");

  const matchesByLeague = pastMatches.reduce((acc, match) => {
    const league = match.league;
    if (!acc[league]) {
      acc[league] = [];
    }
    acc[league].push(match);
    return acc;
  }, {} as Record<string, typeof pastMatches>);

  const selectedMatchData = pastMatches.find(m => m.id === selectedMatch);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-4">
          {/* 左侧列表 */}
          <div className="space-y-3">
            {/* 筛选栏 */}
            <div className="flex items-center gap-2 text-sm">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={`h-9 px-5 ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                ALL
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("live")}
                className="h-9 px-4 text-primary hover:text-primary"
              >
                LIVE
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("finished")}
                className="h-9 px-4 text-muted-foreground hover:text-foreground"
              >
                FINISHED
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("upcoming")}
                className="h-9 px-4 text-muted-foreground hover:text-foreground"
              >
                SCHEDULED
              </Button>
              
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 px-3 gap-1">
                  <Calendar className="h-4 w-4" />
                  1 OCT.
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 比赛列表 */}
            <div className="space-y-3">
              {Object.entries(matchesByLeague).map(([league, matches]) => (
                <Card key={league} className="p-0 bg-card border-border/40">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{league}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                      Standings
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="divide-y divide-border/40">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatch(match.id)}
                        className={`px-4 py-2 cursor-pointer transition-colors ${
                          selectedMatch === match.id ? 'bg-primary/5' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 flex flex-col items-center justify-center">
                            {match.status === "finished" && (
                              <Badge className="bg-success text-success-foreground h-5 px-2 text-[10px] font-medium">
                                FT
                              </Badge>
                            )}
                            {match.status === "upcoming" && (
                              <span className="text-xs font-medium">{match.time}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                {match.homeLogo && (
                                  <img src={match.homeLogo} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className="text-sm">{match.homeTeam}</span>
                              </div>
                              {match.homeScore !== undefined && (
                                <span className="text-sm font-bold w-8 text-right">{match.homeScore}</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-1">(0)</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                {match.awayLogo && (
                                  <img src={match.awayLogo} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className="text-sm">{match.awayTeam}</span>
                              </div>
                              {match.awayScore !== undefined && (
                                <span className="text-sm font-bold w-8 text-right">{match.awayScore}</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-1">(0)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 右侧详情 */}
          <div className="lg:sticky lg:top-4 h-fit">
            {selectedMatchData ? (
              <Card className="p-6 bg-card border-border/40">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">World : World Cup</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Round of 16</span>
                </div>

                {/* 比分展示 */}
                <div className="text-center mb-6">
                  <p className="text-xs text-muted-foreground mb-6">
                    {selectedMatchData.date} • {selectedMatchData.time}
                  </p>
                  
                  <div className="flex items-center justify-center gap-20 mb-6">
                    <div className="text-center">
                      {selectedMatchData.homeLogo && (
                        <div className="w-36 h-36 rounded-xl overflow-hidden mx-auto mb-3 bg-card border">
                          <img 
                            src={selectedMatchData.homeLogo} 
                            alt={selectedMatchData.homeTeam}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <p className="font-bold text-lg">{selectedMatchData.homeTeam}</p>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-8xl font-bold mb-2">
                        {selectedMatchData.homeScore} - {selectedMatchData.awayScore}
                      </div>
                      {selectedMatchData.status === "finished" && (
                        <Badge className="bg-success/20 text-success border-success/50 text-xs uppercase">
                          Finished
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-center">
                      {selectedMatchData.awayLogo && (
                        <div className="w-36 h-36 rounded-xl overflow-hidden mx-auto mb-3 bg-card border">
                          <img 
                            src={selectedMatchData.awayLogo} 
                            alt={selectedMatchData.awayTeam}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <p className="font-bold text-lg">{selectedMatchData.awayTeam}</p>
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <span>👤 C. Turpin</span>
                    <span>🏟️ Stadium 974</span>
                  </div>
                </div>

                {/* 标签页 */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList className="w-full grid grid-cols-4 bg-transparent border-b rounded-none h-auto p-0">
                    <TabsTrigger 
                      value="events" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3"
                    >
                      ☰ EVENTS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="statistics"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3"
                    >
                      📊 STATISTICS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="lineups"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3"
                    >
                      ⚽ LINEUPS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="players"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3"
                    >
                      👥 PLAYERS
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="statistics" className="mt-6 space-y-4">
                    {[
                      { home: 9, label: "Shots on Goal", away: 6 },
                      { home: 7, label: "Shots off Goal", away: 2 },
                      { home: 18, label: "Total Shots", away: 8 },
                      { home: 2, label: "Blocked Shots", away: 0 },
                      { home: 14, label: "Shots insidebox", away: 4 },
                      { home: 4, label: "Shots outsidebox", away: 4 },
                      { home: 8, label: "Fouls", away: 13 },
                      { home: 5, label: "Corner Kicks", away: 4 },
                      { home: 0, label: "Offsides", away: 5 },
                      { home: 53, label: "Ball Possession", away: 47 },
                      { home: 0, label: "Yellow Cards", away: 1 },
                      { home: 5, label: "Goalkeeper Saves", away: 5 },
                      { home: 609, label: "Total passes", away: 530 },
                      { home: 544, label: "Passes accurate", away: 458 },
                      { home: 89, label: "Passes %", away: 86 },
                    ].map((stat, index) => {
                      const total = stat.home + stat.away;
                      const homePercent = total > 0 ? (stat.home / total) * 100 : 50;
                      const awayPercent = total > 0 ? (stat.away / total) * 100 : 50;
                      
                      return (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm font-semibold w-12 text-left">{stat.home}</span>
                            <span className="text-sm text-muted-foreground">{stat.label}</span>
                            <span className="text-sm font-semibold w-12 text-right">{stat.away}</span>
                          </div>
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                            <div 
                              className="bg-primary" 
                              style={{ width: `${homePercent}%` }}
                            />
                            <div 
                              className="bg-warning" 
                              style={{ width: `${awayPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="events" className="mt-6 py-8 text-center text-muted-foreground">
                    Event timeline
                  </TabsContent>

                  <TabsContent value="lineups" className="mt-6 py-8 text-center text-muted-foreground">
                    Team lineups
                  </TabsContent>

                  <TabsContent value="players" className="mt-6 py-8 text-center text-muted-foreground">
                    Player statistics
                  </TabsContent>
                </Tabs>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Select a match</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

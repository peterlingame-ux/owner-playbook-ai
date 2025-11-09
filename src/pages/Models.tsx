import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Search, Star, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { pastMatches } from "@/data/mockData";

export default function Models() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<string>(pastMatches[0]?.id);
  const [activeTab, setActiveTab] = useState("statistics");

  // 按联赛分组比赛
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
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* 左侧：比赛列表 */}
          <div className="space-y-3">
            {/* 筛选器 */}
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="text-xs h-8"
              >
                ALL
              </Button>
              <Button
                variant={statusFilter === "live" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("live")}
                className="text-xs h-8 text-success hover:text-success"
              >
                LIVE
              </Button>
              <Button
                variant={statusFilter === "finished" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("finished")}
                className="text-xs h-8"
              >
                FINISHED
              </Button>
              <Button
                variant={statusFilter === "upcoming" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("upcoming")}
                className="text-xs h-8"
              >
                SCHEDULED
              </Button>
              
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <Calendar className="h-3.5 w-3.5" />
                  1 OCT.
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* 比赛列表 */}
            <div className="space-y-3">
              {Object.entries(matchesByLeague).map(([league, matches]) => (
                <Card key={league} className="p-3 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-transparent">
                        <Star className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <span className="text-xs font-semibold">{league}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-6 gap-1 text-muted-foreground hover:text-foreground">
                      Standings
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatch(match.id)}
                        className={`p-2.5 rounded-md cursor-pointer transition-all ${
                          selectedMatch === match.id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'bg-background/50 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-center justify-center min-w-[32px] pt-1">
                            {match.status === "finished" && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-muted text-muted-foreground">
                                FT
                              </Badge>
                            )}
                            {match.status === "upcoming" && (
                              <span className="text-[10px] text-muted-foreground">{match.time}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {match.homeLogo && (
                                  <img src={match.homeLogo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                                )}
                                <span className="text-xs truncate">{match.homeTeam}</span>
                              </div>
                              {match.homeScore !== undefined && (
                                <span className="text-sm font-bold ml-2 w-4 text-right">{match.homeScore}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {match.awayLogo && (
                                  <img src={match.awayLogo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                                )}
                                <span className="text-xs truncate">{match.awayTeam}</span>
                              </div>
                              {match.awayScore !== undefined && (
                                <span className="text-sm font-bold ml-2 w-4 text-right">{match.awayScore}</span>
                              )}
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

          {/* 右侧：比赛详情 */}
          <div className="lg:sticky lg:top-6 h-fit">
            {selectedMatchData ? (
              <Card className="p-6 bg-card">
                {/* 比赛头部 */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    World : {selectedMatchData.league}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">Round of 16</p>
                  
                  <p className="text-xs text-muted-foreground mb-6">
                    {selectedMatchData.date} • {selectedMatchData.time}
                  </p>
                  
                  <div className="flex items-center justify-center gap-16 my-8">
                    <div className="text-center">
                      {selectedMatchData.homeLogo && (
                        <div className="w-32 h-32 mb-3 rounded-lg overflow-hidden mx-auto flex items-center justify-center">
                          <img 
                            src={selectedMatchData.homeLogo} 
                            alt={selectedMatchData.homeTeam}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="font-bold text-base">{selectedMatchData.homeTeam}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-7xl font-bold mb-3">
                        {selectedMatchData.homeScore} - {selectedMatchData.awayScore}
                      </div>
                      {selectedMatchData.status === "finished" && (
                        <Badge className="bg-success/20 text-success border-success/30 text-xs">
                          FINISHED
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-center">
                      {selectedMatchData.awayLogo && (
                        <div className="w-32 h-32 mb-3 rounded-lg overflow-hidden mx-auto flex items-center justify-center">
                          <img 
                            src={selectedMatchData.awayLogo} 
                            alt={selectedMatchData.awayTeam}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="font-bold text-base">{selectedMatchData.awayTeam}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground mb-6">
                    <span>👤 C. Turpin</span>
                    <span>📍 Stadium 974</span>
                  </div>
                </div>

                {/* 标签页 */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                  <TabsList className="w-full grid grid-cols-4 bg-muted/30 h-9">
                    <TabsTrigger value="events" className="text-[11px] uppercase">EVENTS</TabsTrigger>
                    <TabsTrigger value="statistics" className="text-[11px] uppercase">STATISTICS</TabsTrigger>
                    <TabsTrigger value="lineups" className="text-[11px] uppercase">LINEUPS</TabsTrigger>
                    <TabsTrigger value="players" className="text-[11px] uppercase">PLAYERS</TabsTrigger>
                  </TabsList>

                  <TabsContent value="statistics" className="mt-6 space-y-5">
                    {[
                      { home: 9, label: "Shots on Goal", away: 6 },
                      { home: 7, label: "Shots off Goal", away: 2 },
                      { home: 18, label: "Total Shots", away: 8 },
                      { home: 2, label: "Blocked Shots", away: 0 },
                      { home: 14, label: "Shots insidebox", away: 4 },
                      { home: 4, label: "Shots outsidebox", away: 4 },
                      { home: 8, label: "Fouls", away: 13 },
                      { home: 5, label: "Corner Kicks", away: 4 },
                    ].map((stat, index) => {
                      const total = stat.home + stat.away;
                      const homePercent = (stat.home / total) * 100;
                      const awayPercent = (stat.away / total) * 100;
                      
                      return (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold w-8 text-left">{stat.home}</span>
                            <span className="text-xs text-muted-foreground">{stat.label}</span>
                            <span className="text-sm font-bold w-8 text-right">{stat.away}</span>
                          </div>
                          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
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

                  <TabsContent value="events" className="mt-6">
                    <p className="text-center text-muted-foreground text-sm py-12">
                      Event timeline will be displayed here
                    </p>
                  </TabsContent>

                  <TabsContent value="lineups" className="mt-6">
                    <p className="text-center text-muted-foreground text-sm py-12">
                      Team lineups will be displayed here
                    </p>
                  </TabsContent>

                  <TabsContent value="players" className="mt-6">
                    <p className="text-center text-muted-foreground text-sm py-12">
                      Player statistics will be displayed here
                    </p>
                  </TabsContent>
                </Tabs>
              </Card>
            ) : (
              <Card className="p-12 text-center bg-card">
                <p className="text-muted-foreground">
                  Select a match to view details
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

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

  const getStatusBadge = (status: string) => {
    if (status === "finished") return "FT";
    if (status === "live") return "LIVE";
    return "SCHEDULED";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-6">
          {/* 左侧：比赛列表 */}
          <div className="space-y-4">
            {/* 筛选器 */}
            <div className="flex items-center gap-3">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="text-xs"
              >
                ALL
              </Button>
              <Button
                variant={statusFilter === "live" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("live")}
                className="text-xs text-success"
              >
                LIVE
              </Button>
              <Button
                variant={statusFilter === "finished" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("finished")}
                className="text-xs"
              >
                FINISHED
              </Button>
              <Button
                variant={statusFilter === "scheduled" ? "default" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("scheduled")}
                className="text-xs"
              >
                SCHEDULED
              </Button>
              
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  1 OCT.
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* 比赛列表 */}
            <div className="space-y-3">
              {Object.entries(matchesByLeague).map(([league, matches]) => (
                <Card key={league} className="p-4 bg-card/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Star className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-bold uppercase">{league}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                      Standings
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {matches.map((match) => (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatch(match.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border ${
                          selectedMatch === match.id 
                            ? 'bg-primary/10 border-primary/50' 
                            : 'bg-background/50 border-transparent hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {match.status === "finished" && (
                            <Badge variant="outline" className="text-[10px] h-5 bg-muted/50 shrink-0">
                              FT
                            </Badge>
                          )}
                          {match.status === "live" && (
                            <Badge className="text-[10px] h-5 bg-success text-white shrink-0">
                              LIVE
                            </Badge>
                          )}
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                {match.homeLogo && (
                                  <img src={match.homeLogo} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className="text-xs font-medium truncate">{match.homeTeam}</span>
                              </div>
                              {match.homeScore !== undefined && (
                                <span className="text-sm font-bold ml-2">{match.homeScore}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                {match.awayLogo && (
                                  <img src={match.awayLogo} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className="text-xs font-medium truncate">{match.awayTeam}</span>
                              </div>
                              {match.awayScore !== undefined && (
                                <span className="text-sm font-bold ml-2">{match.awayScore}</span>
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
              <Card className="p-6 bg-card/50">
                {/* 比赛头部 */}
                <div className="text-center mb-6">
                  <p className="text-xs text-muted-foreground mb-1">
                    World • {selectedMatchData.league}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">Round of 16</p>
                  
                  <div className="flex items-center justify-center gap-12 my-8">
                    <div className="text-center">
                      {selectedMatchData.homeLogo && (
                        <div className="w-24 h-24 mb-3 bg-card rounded-lg p-2 mx-auto flex items-center justify-center">
                          <img 
                            src={selectedMatchData.homeLogo} 
                            alt={selectedMatchData.homeTeam}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <p className="font-bold text-sm">{selectedMatchData.homeTeam}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-6xl font-bold mb-2">
                        {selectedMatchData.homeScore} - {selectedMatchData.awayScore}
                      </div>
                      {selectedMatchData.status === "finished" && (
                        <Badge className="bg-success/20 text-success border-success/30">
                          FINISHED
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-center">
                      {selectedMatchData.awayLogo && (
                        <div className="w-24 h-24 mb-3 bg-card rounded-lg p-2 mx-auto flex items-center justify-center">
                          <img 
                            src={selectedMatchData.awayLogo} 
                            alt={selectedMatchData.awayTeam}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <p className="font-bold text-sm">{selectedMatchData.awayTeam}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <span>📍 Stadium 974</span>
                    <span>👤 C. Turpin</span>
                  </div>
                </div>

                {/* 标签页 */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList className="w-full grid grid-cols-4 bg-muted/50">
                    <TabsTrigger value="events" className="text-xs">EVENTS</TabsTrigger>
                    <TabsTrigger value="statistics" className="text-xs">STATISTICS</TabsTrigger>
                    <TabsTrigger value="lineups" className="text-xs">LINEUPS</TabsTrigger>
                    <TabsTrigger value="players" className="text-xs">PLAYERS</TabsTrigger>
                  </TabsList>

                  <TabsContent value="statistics" className="mt-6 space-y-4">
                    {/* 射门数 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">{(selectedMatchData.homeScore || 0) * 3 + 3}</span>
                        <span className="text-muted-foreground text-xs">Shots on Goal</span>
                        <span className="font-bold">{(selectedMatchData.awayScore || 0) * 2 + 4}</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary" 
                          style={{ width: `${((selectedMatchData.homeScore || 0) * 3 + 3) / (((selectedMatchData.homeScore || 0) * 3 + 3) + ((selectedMatchData.awayScore || 0) * 2 + 4)) * 100}%` }}
                        />
                        <div 
                          className="bg-warning" 
                          style={{ width: `${((selectedMatchData.awayScore || 0) * 2 + 4) / (((selectedMatchData.homeScore || 0) * 3 + 3) + ((selectedMatchData.awayScore || 0) * 2 + 4)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 偏离射门 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">7</span>
                        <span className="text-muted-foreground text-xs">Shots off Goal</span>
                        <span className="font-bold">2</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary" style={{ width: '78%' }} />
                        <div className="bg-warning" style={{ width: '22%' }} />
                      </div>
                    </div>

                    {/* 总射门 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">18</span>
                        <span className="text-muted-foreground text-xs">Total Shots</span>
                        <span className="font-bold">8</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary" style={{ width: '69%' }} />
                        <div className="bg-warning" style={{ width: '31%' }} />
                      </div>
                    </div>

                    {/* 被封堵射门 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">2</span>
                        <span className="text-muted-foreground text-xs">Blocked Shots</span>
                        <span className="font-bold">0</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary" style={{ width: '100%' }} />
                      </div>
                    </div>

                    {/* 禁区内射门 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">14</span>
                        <span className="text-muted-foreground text-xs">Shots insidebox</span>
                        <span className="font-bold">4</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary" style={{ width: '78%' }} />
                        <div className="bg-warning" style={{ width: '22%' }} />
                      </div>
                    </div>

                    {/* 禁区外射门 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">4</span>
                        <span className="text-muted-foreground text-xs">Shots outsidebox</span>
                        <span className="font-bold">4</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary" style={{ width: '50%' }} />
                        <div className="bg-warning" style={{ width: '50%' }} />
                      </div>
                    </div>

                    {/* 犯规 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">{selectedMatchData.homeYellowCards! + 6}</span>
                        <span className="text-muted-foreground text-xs">Fouls</span>
                        <span className="font-bold">{selectedMatchData.awayYellowCards! + 10}</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary" style={{ width: '38%' }} />
                        <div className="bg-warning" style={{ width: '62%' }} />
                      </div>
                    </div>

                    {/* 角球 */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">{selectedMatchData.homeCorners}</span>
                        <span className="text-muted-foreground text-xs">Corner Kicks</span>
                        <span className="font-bold">{selectedMatchData.awayCorners}</span>
                      </div>
                      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary" 
                          style={{ width: `${(selectedMatchData.homeCorners || 0) / ((selectedMatchData.homeCorners || 0) + (selectedMatchData.awayCorners || 0)) * 100}%` }}
                        />
                        <div 
                          className="bg-warning" 
                          style={{ width: `${(selectedMatchData.awayCorners || 0) / ((selectedMatchData.homeCorners || 0) + (selectedMatchData.awayCorners || 0)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="mt-6">
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Event timeline will be displayed here
                    </p>
                  </TabsContent>

                  <TabsContent value="lineups" className="mt-6">
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Team lineups will be displayed here
                    </p>
                  </TabsContent>

                  <TabsContent value="players" className="mt-6">
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Player statistics will be displayed here
                    </p>
                  </TabsContent>
                </Tabs>
              </Card>
            ) : (
              <Card className="p-12 text-center bg-card/50">
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

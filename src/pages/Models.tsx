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
    <div className="min-h-screen bg-[#1a1a1a]">
      <Header />
      
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-4">
          {/* 左侧 */}
          <div className="space-y-0">
            {/* 筛选栏 */}
            <div className="flex items-center gap-2 mb-4 text-[13px]">
              <Button
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={`h-8 px-4 rounded-md font-medium ${
                  statusFilter === "all" 
                    ? "bg-teal-500 text-black hover:bg-teal-500" 
                    : "bg-transparent text-gray-400 hover:text-white hover:bg-transparent"
                }`}
              >
                ALL
              </Button>
              <Button
                size="sm"
                onClick={() => setStatusFilter("live")}
                className="h-8 px-4 bg-transparent text-teal-400 hover:text-teal-300 hover:bg-transparent font-medium"
              >
                LIVE
              </Button>
              <Button
                size="sm"
                onClick={() => setStatusFilter("finished")}
                className="h-8 px-4 bg-transparent text-gray-400 hover:text-white hover:bg-transparent font-medium"
              >
                FINISHED
              </Button>
              <Button
                size="sm"
                onClick={() => setStatusFilter("upcoming")}
                className="h-8 px-4 bg-transparent text-gray-400 hover:text-white hover:bg-transparent font-medium"
              >
                SCHEDULED
              </Button>
              
              <div className="ml-auto flex items-center gap-1">
                <Button size="icon" className="h-8 w-8 bg-transparent hover:bg-gray-800 text-gray-400">
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <Button size="sm" className="h-8 px-3 gap-1.5 bg-transparent hover:bg-gray-800 text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[13px]">1 OCT.</span>
                </Button>
                <Button size="icon" className="h-8 w-8 bg-transparent hover:bg-gray-800 text-gray-400">
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
                <Button size="icon" className="h-8 w-8 bg-transparent hover:bg-gray-800 text-gray-400">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 比赛列表 */}
            <div className="bg-[#2a2a2a]">
              {Object.entries(matchesByLeague).map(([league, matches], leagueIdx) => (
                <div key={league}>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[#3a3a3a] hover:bg-[#404040] cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-gray-500" />
                      <img src={matches[0].homeLogo} alt="" className="w-5 h-5" />
                      <span className="text-sm text-white font-normal">{league}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Standings</span>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </div>
                  
                  {matches.map((match, idx) => (
                    <div
                      key={match.id}
                      onClick={() => setSelectedMatch(match.id)}
                      className={`px-3 py-2 cursor-pointer hover:bg-[#323232] ${
                        selectedMatch === match.id ? 'bg-[#323232]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-11 flex items-center justify-center pt-1">
                          {match.status === "finished" && idx < 2 && (
                            <Badge className="bg-[#4a9b7f] hover:bg-[#4a9b7f] text-white text-[10px] font-semibold px-1.5 py-0 h-5">
                              FT
                            </Badge>
                          )}
                          {leagueIdx === 1 && (idx === 2 || idx === 4) && (
                            <Badge className="bg-[#c17817] hover:bg-[#c17817] text-white text-[10px] font-semibold px-1.5 py-0 h-5">
                              POST
                            </Badge>
                          )}
                          {match.status === "upcoming" && (
                            <span className="text-sm text-white font-normal">22:00</span>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {match.homeLogo && (
                                <img src={match.homeLogo} alt="" className="w-[18px] h-[18px] object-contain" />
                              )}
                              <span className="text-sm text-white">{match.homeTeam}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {match.homeScore !== undefined ? (
                                <>
                                  <span className="text-base font-bold text-white w-4 text-right">{match.homeScore}</span>
                                  <span className="text-xs text-gray-500">(0)</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base font-bold text-white w-4 text-right">0</span>
                                  <span className="text-xs text-gray-500">(0)</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {match.awayLogo && (
                                <img src={match.awayLogo} alt="" className="w-[18px] h-[18px] object-contain" />
                              )}
                              <span className="text-sm text-white">{match.awayTeam}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {match.awayScore !== undefined ? (
                                <>
                                  <span className="text-base font-bold text-white w-4 text-right">{match.awayScore}</span>
                                  <span className="text-xs text-gray-500">(1)</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-base font-bold text-white w-4 text-right">0</span>
                                  <span className="text-xs text-gray-500">(0)</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 右侧 */}
          <div className="lg:sticky lg:top-4 h-fit">
            {selectedMatchData ? (
              <Card className="p-6 bg-[#252525] border-gray-800">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gray-500" />
                    <Globe className="h-4 w-4 text-teal-400" />
                    <span className="text-[13px] text-gray-300">World : World Cup</span>
                  </div>
                  <span className="text-[13px] text-gray-400">Round of 16</span>
                </div>

                {/* 比分 */}
                <div className="text-center mb-8">
                  <p className="text-[12px] text-gray-400 mb-8">05.12.2022 • 20:00</p>
                  
                  <div className="flex items-center justify-center gap-24 mb-6">
                    <div className="text-center">
                      {selectedMatchData.homeLogo && (
                        <div className="w-40 h-40 rounded-xl mb-3 mx-auto overflow-hidden">
                          <img 
                            src={selectedMatchData.homeLogo} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <Star className="h-4 w-4 text-teal-400" />
                        <span className="text-[15px] font-bold text-white">{selectedMatchData.homeTeam}</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-[90px] font-bold text-white leading-none mb-3">
                        {selectedMatchData.homeScore} - {selectedMatchData.awayScore}
                      </div>
                      <Badge className="bg-teal-600/30 text-teal-400 border-teal-600/50 text-[11px] uppercase px-3 py-1">
                        Finished
                      </Badge>
                    </div>
                    
                    <div className="text-center">
                      {selectedMatchData.awayLogo && (
                        <div className="w-40 h-40 rounded-xl mb-3 mx-auto overflow-hidden">
                          <img 
                            src={selectedMatchData.awayLogo} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[15px] font-bold text-white">{selectedMatchData.awayTeam}</span>
                        <Star className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-8 text-[12px] text-gray-400">
                    <span>👤 C. Turpin</span>
                    <span>🏟️ Stadium 974</span>
                  </div>
                </div>

                {/* 标签页 */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-4 bg-transparent border-b border-gray-700 rounded-none h-auto p-0">
                    <TabsTrigger 
                      value="events"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase"
                    >
                      ≡ EVENTS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="statistics"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase"
                    >
                      ▤ STATISTICS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="lineups"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase"
                    >
                      ≡ LINEUPS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="players"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase"
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
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[14px] font-bold text-white w-12 text-left">{stat.home}</span>
                            <span className="text-[13px] text-gray-400">{stat.label}</span>
                            <span className="text-[14px] font-bold text-white w-12 text-right">{stat.away}</span>
                          </div>
                          <div className="flex h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-teal-500" 
                              style={{ width: `${homePercent}%` }}
                            />
                            <div 
                              className="bg-orange-500" 
                              style={{ width: `${awayPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="events" className="mt-6 py-12 text-center text-gray-500 text-sm">
                    No events data
                  </TabsContent>

                  <TabsContent value="lineups" className="mt-6 py-12 text-center text-gray-500 text-sm">
                    No lineups data
                  </TabsContent>

                  <TabsContent value="players" className="mt-6 py-12 text-center text-gray-500 text-sm">
                    No players data
                  </TabsContent>
                </Tabs>
              </Card>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

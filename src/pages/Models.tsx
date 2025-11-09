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
      
      <main className="container mx-auto px-2 sm:px-4 py-4 safe-area-padding">
        <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-4">
          {/* 左侧 */}
          <div className="space-y-0">
            {/* 筛选栏 */}
            <div className="flex items-center gap-1 sm:gap-2 mb-4 text-[11px] sm:text-[13px] overflow-x-auto pb-2">
              <Button
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={`h-7 sm:h-8 px-3 sm:px-4 rounded-md font-medium text-xs sm:text-sm whitespace-nowrap ${
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
                className="h-7 sm:h-8 px-3 sm:px-4 bg-transparent text-teal-400 hover:text-teal-300 hover:bg-transparent font-medium text-xs sm:text-sm whitespace-nowrap"
              >
                LIVE
              </Button>
              <Button
                size="sm"
                onClick={() => setStatusFilter("finished")}
                className="h-7 sm:h-8 px-3 sm:px-4 bg-transparent text-gray-400 hover:text-white hover:bg-transparent font-medium text-xs sm:text-sm whitespace-nowrap"
              >
                FINISHED
              </Button>
              <Button
                size="sm"
                onClick={() => setStatusFilter("upcoming")}
                className="h-7 sm:h-8 px-3 sm:px-4 bg-transparent text-gray-400 hover:text-white hover:bg-transparent font-medium text-xs sm:text-sm whitespace-nowrap"
              >
                SCHEDULED
              </Button>
              
              <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                <Button size="icon" className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent hover:bg-gray-800 text-gray-400">
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 rotate-90" />
                </Button>
                <Button size="sm" className="h-7 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-1.5 bg-transparent hover:bg-gray-800 text-gray-400">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="text-[11px] sm:text-[13px] hidden sm:inline">1 OCT.</span>
                </Button>
                <Button size="icon" className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent hover:bg-gray-800 text-gray-400">
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 -rotate-90" />
                </Button>
                <Button size="icon" className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent hover:bg-gray-800 text-gray-400">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4" />
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
              <Card className="p-0 bg-[#252525] border-gray-800 overflow-hidden">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-gray-500" />
                    <Globe className="h-4 w-4 text-teal-400" />
                    <span className="text-[13px] text-gray-300">World : World Cup</span>
                  </div>
                  <span className="text-[13px] text-gray-400">Round of 16</span>
                </div>

                {/* 比分区域 */}
                <div className="text-center py-4 sm:py-8 px-3 sm:px-6 bg-[#2a2a2a]">
                  <p className="text-[11px] sm:text-[13px] text-gray-400 mb-4 sm:mb-6">05.12.2022 • 20:00</p>
                  
                  <div className="flex items-center justify-center gap-6 sm:gap-20 mb-4 sm:mb-6">
                    <div className="text-center flex-shrink">
                      <div className="w-20 h-16 sm:w-[150px] sm:h-[100px] rounded-lg mb-2 sm:mb-3 mx-auto overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center">
                        {selectedMatchData.homeLogo ? (
                          <img 
                            src={selectedMatchData.homeLogo} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-2xl sm:text-4xl">🏴</div>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <span className="text-xs sm:text-[15px] font-medium text-white">{selectedMatchData.homeTeam}</span>
                      </div>
                    </div>
                    
                    <div className="text-center flex-shrink-0">
                      <div className="text-4xl sm:text-[80px] font-bold text-white leading-none mb-2 sm:mb-3 tracking-tight">
                        {selectedMatchData.homeScore} <span className="text-gray-700">-</span> {selectedMatchData.awayScore}
                      </div>
                      <Badge className="bg-[#52b788] hover:bg-[#52b788] text-white text-[9px] sm:text-[11px] uppercase font-bold px-3 sm:px-5 py-1 sm:py-1.5 tracking-wide">
                        FINISHED
                      </Badge>
                    </div>
                    
                    <div className="text-center flex-shrink">
                      <div className="w-20 h-16 sm:w-[150px] sm:h-[100px] rounded-lg mb-2 sm:mb-3 mx-auto overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center">
                        {selectedMatchData.awayLogo ? (
                          <img 
                            src={selectedMatchData.awayLogo} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-2xl sm:text-4xl">🏴</div>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <span className="text-xs sm:text-[15px] font-medium text-white">{selectedMatchData.awayTeam}</span>
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 sm:gap-10 text-[10px] sm:text-[12px] text-gray-400 pt-3 sm:pt-4 border-t border-gray-700/50">
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-gray-500">⚽</span> <span className="hidden sm:inline">C. Turpin</span>
                    </span>
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-gray-500">🏟️</span> <span className="hidden sm:inline">Stadium 974</span>
                    </span>
                  </div>
                </div>

                {/* 标签页 */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-[#1e1e1e]">
                  <TabsList className="w-full grid grid-cols-4 bg-transparent border-b border-gray-700 rounded-none h-auto p-0 px-6">
                    <TabsTrigger 
                      value="events"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase font-medium"
                    >
                      ≡ EVENTS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="statistics"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase font-medium"
                    >
                      ▤ STATISTICS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="lineups"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase font-medium"
                    >
                      ≡ LINEUPS
                    </TabsTrigger>
                    <TabsTrigger 
                      value="players"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-400 data-[state=active]:bg-transparent data-[state=active]:text-teal-400 text-gray-400 py-3 text-[12px] uppercase font-medium"
                    >
                      👥 PLAYERS
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="statistics" className="mt-0 space-y-4 px-8 py-6">
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

                  <TabsContent value="events" className="mt-0 px-8 py-12 text-center text-gray-500 text-sm">
                    No events data
                  </TabsContent>

                  <TabsContent value="lineups" className="mt-0 px-8 py-12 text-center text-gray-500 text-sm">
                    No lineups data
                  </TabsContent>

                  <TabsContent value="players" className="mt-0 px-8 py-12 text-center text-gray-500 text-sm">
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

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Search } from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pastMatches } from "@/data/mockData";

export default function Models() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

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
        {/* 筛选器 */}
        <div className="flex items-center justify-between mb-6">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
            <TabsList className="bg-card">
              <TabsTrigger value="all">ALL</TabsTrigger>
              <TabsTrigger value="live">LIVE</TabsTrigger>
              <TabsTrigger value="finished">FINISHED</TabsTrigger>
              <TabsTrigger value="scheduled">SCHEDULED</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              1 OCT.
            </Button>
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：比赛列表 */}
          <div className="space-y-4">
            {Object.entries(matchesByLeague).map(([league, matches]) => (
              <Card key={league} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{league}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Standings
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      onClick={() => setSelectedMatch(match.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMatch === match.id 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {match.status === "finished" && (
                            <Badge variant="outline" className="text-xs bg-muted">
                              FT
                            </Badge>
                          )}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {match.homeLogo && (
                                <img src={match.homeLogo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span className="text-sm">{match.homeTeam}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {match.awayLogo && (
                                <img src={match.awayLogo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span className="text-sm">{match.awayTeam}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {match.homeScore !== undefined ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold">{match.homeScore}</span>
                              <span className="text-sm font-bold">{match.awayScore}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{match.time}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* 右侧：比赛详情 */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            {selectedMatchData ? (
              <Card className="p-6">
                <div className="text-center mb-6">
                  <p className="text-xs text-muted-foreground mb-2">
                    {selectedMatchData.league} • {selectedMatchData.date}
                  </p>
                  <div className="flex items-center justify-center gap-8 my-6">
                    <div className="text-center">
                      {selectedMatchData.homeLogo && (
                        <img 
                          src={selectedMatchData.homeLogo} 
                          alt={selectedMatchData.homeTeam}
                          className="w-20 h-20 object-contain mx-auto mb-2"
                        />
                      )}
                      <p className="font-bold">{selectedMatchData.homeTeam}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-5xl font-bold">
                        {selectedMatchData.homeScore} - {selectedMatchData.awayScore}
                      </div>
                      {selectedMatchData.status === "finished" && (
                        <Badge className="mt-2 bg-success/20 text-success">FINISHED</Badge>
                      )}
                    </div>
                    
                    <div className="text-center">
                      {selectedMatchData.awayLogo && (
                        <img 
                          src={selectedMatchData.awayLogo} 
                          alt={selectedMatchData.awayTeam}
                          className="w-20 h-20 object-contain mx-auto mb-2"
                        />
                      )}
                      <p className="font-bold">{selectedMatchData.awayTeam}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-bold mb-4">STATISTICS</h3>
                  <div className="space-y-4">
                    {/* 射门 */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-mono">{selectedMatchData.homeScore! * 3 + 6}</span>
                        <span className="text-muted-foreground">Shots on Goal</span>
                        <span className="font-mono">{selectedMatchData.awayScore! * 2 + 4}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div 
                          className="bg-primary rounded-l" 
                          style={{ width: `${(selectedMatchData.homeScore! * 3 + 6) / ((selectedMatchData.homeScore! * 3 + 6) + (selectedMatchData.awayScore! * 2 + 4)) * 100}%` }}
                        />
                        <div 
                          className="bg-warning rounded-r" 
                          style={{ width: `${(selectedMatchData.awayScore! * 2 + 4) / ((selectedMatchData.homeScore! * 3 + 6) + (selectedMatchData.awayScore! * 2 + 4)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 角球 */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-mono">{selectedMatchData.homeCorners}</span>
                        <span className="text-muted-foreground">Corner Kicks</span>
                        <span className="font-mono">{selectedMatchData.awayCorners}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div 
                          className="bg-primary rounded-l" 
                          style={{ width: `${selectedMatchData.homeCorners! / (selectedMatchData.homeCorners! + selectedMatchData.awayCorners!) * 100}%` }}
                        />
                        <div 
                          className="bg-warning rounded-r" 
                          style={{ width: `${selectedMatchData.awayCorners! / (selectedMatchData.homeCorners! + selectedMatchData.awayCorners!) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 黄牌 */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-mono">{selectedMatchData.homeYellowCards}</span>
                        <span className="text-muted-foreground">Yellow Cards</span>
                        <span className="font-mono">{selectedMatchData.awayYellowCards}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div 
                          className="bg-primary rounded-l" 
                          style={{ width: `${selectedMatchData.homeYellowCards! / (selectedMatchData.homeYellowCards! + selectedMatchData.awayYellowCards!) * 100}%` }}
                        />
                        <div 
                          className="bg-warning rounded-r" 
                          style={{ width: `${selectedMatchData.awayYellowCards! / (selectedMatchData.homeYellowCards! + selectedMatchData.awayYellowCards!) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  {t('select_match') || '选择一场比赛查看详情'}
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

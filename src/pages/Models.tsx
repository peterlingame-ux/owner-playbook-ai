import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, ChevronDown, ChevronRight, Calendar, Search } from "lucide-react";

// Mock data for template
const mockFixtures = [
  {
    league: {
      id: 1,
      name: "Liga Profesional Argentina",
      country: "Argentina",
      flag: "https://media.api-sports.io/flags/ar.svg"
    },
    matches: [
      {
        id: 1,
        time: "FT",
        home: { name: "Newells Old Boys", logo: "https://media.api-sports.io/football/teams/451.png", score: 1 },
        away: { name: "Estudiantes L.P.", logo: "https://media.api-sports.io/football/teams/450.png", score: 1 }
      }
    ]
  },
  {
    league: {
      id: 2,
      name: "Liga Pro Serie B",
      country: "Ecuador",
      flag: "https://media.api-sports.io/flags/ec.svg"
    },
    matches: [
      {
        id: 2,
        time: "FT",
        home: { name: "8 de Octubre", logo: "https://media.api-sports.io/football/teams/2825.png", score: 1 },
        away: { name: "San Antonio", logo: "https://media.api-sports.io/football/teams/2826.png", score: 1 }
      },
      {
        id: 3,
        time: "POSTPONED",
        home: { name: "Atlético Vinotinto", logo: "https://media.api-sports.io/football/teams/2827.png", score: 0 },
        away: { name: "Imbabura", logo: "https://media.api-sports.io/football/teams/2828.png", score: 0 }
      }
    ]
  },
  {
    league: {
      id: 3,
      name: "Brasileiro U17",
      country: "Brazil",
      flag: "https://media.api-sports.io/flags/br.svg"
    },
    matches: [
      {
        id: 4,
        time: "FT",
        home: { name: "RB Bragantino U17", logo: "https://media.api-sports.io/football/teams/138.png", score: 2 },
        away: { name: "Gremio U17", logo: "https://media.api-sports.io/football/teams/131.png", score: 4 }
      }
    ]
  },
  {
    league: {
      id: 4,
      name: "World Cup - U20",
      country: "World",
      flag: "https://media.api-sports.io/flags/xx.svg"
    },
    matches: [
      {
        id: 5,
        time: "22:00",
        home: { name: "Spain U20", logo: "https://media.api-sports.io/football/teams/9.png", score: null },
        away: { name: "Mexico U20", logo: "https://media.api-sports.io/football/teams/16.png", score: null }
      },
      {
        id: 6,
        time: "22:00",
        home: { name: "Italy U20", logo: "https://media.api-sports.io/football/teams/768.png", score: null },
        away: { name: "Cuba U20", logo: "https://media.api-sports.io/football/teams/1530.png", score: null }
      }
    ]
  },
  {
    league: {
      id: 5,
      name: "Copa de la División Profesional",
      country: "Bolivia",
      flag: "https://media.api-sports.io/flags/bo.svg"
    },
    matches: [
      {
        id: 7,
        time: "21:00",
        home: { name: "Independiente Petrolero", logo: "https://media.api-sports.io/football/teams/1062.png", score: 2 },
        away: { name: "Real Tomayapo", logo: "https://media.api-sports.io/football/teams/1064.png", score: 0 }
      }
    ]
  },
  {
    league: {
      id: 6,
      name: "Major League Soccer",
      country: "USA",
      flag: "https://media.api-sports.io/flags/us.svg"
    },
    matches: [
      {
        id: 8,
        time: "FT",
        home: { name: "Inter Miami", logo: "https://media.api-sports.io/football/teams/1610.png", score: 3 },
        away: { name: "Chicago Fire", logo: "https://media.api-sports.io/football/teams/1614.png", score: 5 }
      }
    ]
  }
];

// Mock match detail data
const mockMatchDetail = {
  home: {
    name: "Brazil",
    flag: "https://media.api-sports.io/flags/br.svg",
    score: 4
  },
  away: {
    name: "South Korea",
    flag: "https://media.api-sports.io/flags/kr.svg",
    score: 1
  },
  date: "05.12.2022 • 20:00",
  status: "FINISHED",
  venue: "Stadium 974",
  referee: "C. Turpin",
  league: "World : World Cup",
  round: "Round of 16",
  statistics: [
    { label: "Shots on Goal", home: 9, away: 6 },
    { label: "Shots off Goal", home: 7, away: 2 },
    { label: "Total Shots", home: 18, away: 8 },
    { label: "Blocked Shots", home: 2, away: 0 },
    { label: "Shots insidebox", home: 14, away: 4 },
    { label: "Shots outsidebox", home: 4, away: 4 },
    { label: "Fouls", home: 8, away: 13 },
    { label: "Corner Kicks", home: 5, away: 4 },
    { label: "Offsides", home: 0, away: 5 },
    { label: "Ball Possession", home: 53, away: 47 },
    { label: "Yellow Cards", home: 0, away: 1 },
    { label: "Goalkeeper Saves", home: 5, away: 5 },
    { label: "Total passes", home: 609, away: 530 },
    { label: "Passes accurate", home: 544, away: 458 },
    { label: "Passes %", home: 89, away: 86 }
  ]
};

export default function Models() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedLeagues, setExpandedLeagues] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMatch, setSelectedMatch] = useState<number | null>(8);

  const toggleLeague = (leagueId: number) => {
    const newExpanded = new Set(expandedLeagues);
    if (newExpanded.has(leagueId)) {
      newExpanded.delete(leagueId);
    } else {
      newExpanded.add(leagueId);
    }
    setExpandedLeagues(newExpanded);
  };

  const getStatusColor = (status: string) => {
    if (status === 'FT') return 'text-green-500';
    if (status === 'POSTPONED') return 'text-amber-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Side - Match List */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="all" className="text-sm">ALL</TabsTrigger>
                  <TabsTrigger value="live" className="text-sm text-green-500">LIVE</TabsTrigger>
                  <TabsTrigger value="finished" className="text-sm">FINISHED</TabsTrigger>
                  <TabsTrigger value="scheduled" className="text-sm">SCHEDULED</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    1 OCT.
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {mockFixtures.map((fixture) => (
                  <Card key={fixture.league.id} className="overflow-hidden bg-card/50 backdrop-blur">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
                      onClick={() => toggleLeague(fixture.league.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        {fixture.league.flag && (
                          <img src={fixture.league.flag} alt="" className="h-4 w-6 object-cover" />
                        )}
                        <span className="font-medium text-sm">
                          {fixture.league.country}: {fixture.league.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                          Standings
                        </Button>
                        {expandedLeagues.has(fixture.league.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {expandedLeagues.has(fixture.league.id) && (
                      <div className="divide-y divide-border/50">
                        {fixture.matches.map((match) => (
                          <div
                            key={match.id}
                            className={`flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors cursor-pointer ${
                              selectedMatch === match.id ? 'bg-muted/50' : ''
                            }`}
                            onClick={() => setSelectedMatch(match.id)}
                          >
                            <div className="w-12 text-center">
                              <span className={`text-xs font-medium ${getStatusColor(match.time)}`}>
                                {match.time}
                              </span>
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <img src={match.home.logo} alt="" className="h-5 w-5" />
                                  <span className="text-sm">{match.home.name}</span>
                                </div>
                                <span className="text-sm font-semibold min-w-[20px] text-center">
                                  {match.home.score ?? '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <img src={match.away.logo} alt="" className="h-5 w-5" />
                                  <span className="text-sm">{match.away.name}</span>
                                </div>
                                <span className="text-sm font-semibold min-w-[20px] text-center">
                                  {match.away.score ?? '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Tabs>
          </div>

          {/* Right Side - Match Detail */}
          <div>
            <Card className="overflow-hidden sticky top-4">
              {/* Match Header */}
              <div className="bg-gradient-to-b from-primary/10 to-background p-6 border-b border-border">
                <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
                  <span>{mockMatchDetail.league}</span>
                  <span className="ml-4">{mockMatchDetail.round}</span>
                </div>

                <div className="flex items-center justify-center gap-8 mb-4">
                  {/* Home Team */}
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[150px]">
                    <img src={mockMatchDetail.home.flag} alt="" className="h-20 w-28 object-contain" />
                    <h2 className="text-lg font-bold text-center">{mockMatchDetail.home.name}</h2>
                  </div>

                  {/* Score */}
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">
                      {mockMatchDetail.date}
                    </div>
                    <div className="text-5xl font-bold mb-2">
                      {mockMatchDetail.home.score} - {mockMatchDetail.away.score}
                    </div>
                    <div className="text-xs px-3 py-1 bg-green-500/20 text-green-500 rounded-full inline-block">
                      {mockMatchDetail.status}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center gap-2 flex-1 max-w-[150px]">
                    <img src={mockMatchDetail.away.flag} alt="" className="h-20 w-28 object-contain" />
                    <h2 className="text-lg font-bold text-center">{mockMatchDetail.away.name}</h2>
                  </div>
                </div>

                {/* Venue Info */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <span>⚽ {mockMatchDetail.referee}</span>
                  <span>📍 {mockMatchDetail.venue}</span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="statistics" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                  <TabsTrigger 
                    value="events" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent"
                  >
                    EVENTS
                  </TabsTrigger>
                  <TabsTrigger 
                    value="statistics"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent"
                  >
                    STATISTICS
                  </TabsTrigger>
                  <TabsTrigger 
                    value="lineups"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent"
                  >
                    LINEUPS
                  </TabsTrigger>
                  <TabsTrigger 
                    value="players"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent"
                  >
                    PLAYERS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="statistics" className="p-6">
                  <div className="space-y-4">
                    {mockMatchDetail.statistics.map((stat, index) => {
                      const total = stat.home + stat.away;
                      const homePercent = total > 0 ? (stat.home / total) * 100 : 50;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-semibold w-12 text-center">{stat.home}</span>
                            <span className="text-muted-foreground flex-1 text-center">{stat.label}</span>
                            <span className="font-semibold w-12 text-center">{stat.away}</span>
                          </div>
                          <div className="flex gap-1 h-2">
                            <div 
                              className="bg-cyan-500 rounded-l" 
                              style={{ width: `${homePercent}%` }}
                            />
                            <div 
                              className="bg-amber-500 rounded-r" 
                              style={{ width: `${100 - homePercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="events" className="p-6">
                  <p className="text-center text-muted-foreground">Events coming soon</p>
                </TabsContent>

                <TabsContent value="lineups" className="p-6">
                  <p className="text-center text-muted-foreground">Lineups coming soon</p>
                </TabsContent>

                <TabsContent value="players" className="p-6">
                  <p className="text-center text-muted-foreground">Players coming soon</p>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

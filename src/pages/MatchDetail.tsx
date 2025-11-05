import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MatchDetailData } from "@/types/footballApi";

// Mock data for template
const mockMatchData: MatchDetailData & { owners: any[] } = {
  fixture: {
    fixture: {
      id: 1,
      referee: "Michael Oliver",
      timezone: "UTC",
      date: "2025-03-15T19:00:00+00:00",
      timestamp: 1710525600,
      venue: {
        id: 508,
        name: "Old Trafford",
        city: "Manchester"
      },
      status: {
        long: "Match Finished",
        short: "FT",
        elapsed: 90
      }
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      flag: "https://media.api-sports.io/flags/gb.svg",
      season: 2024,
      round: "Regular Season - 28"
    },
    teams: {
      home: {
        id: 33,
        name: "Manchester United",
        logo: "https://media.api-sports.io/football/teams/33.png",
        winner: true
      },
      away: {
        id: 40,
        name: "Liverpool",
        logo: "https://media.api-sports.io/football/teams/40.png",
        winner: false
      }
    },
    goals: {
      home: 2,
      away: 1
    },
    score: {
      halftime: { home: 1, away: 0 },
      fulltime: { home: 2, away: 1 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null }
    }
  },
  statistics: [
    {
      team: {
        id: 33,
        name: "Manchester United",
        logo: "https://media.api-sports.io/football/teams/33.png"
      },
      statistics: [
        { type: "Shots on Goal", value: 8 },
        { type: "Shots off Goal", value: 5 },
        { type: "Total Shots", value: 13 },
        { type: "Blocked Shots", value: 3 },
        { type: "Shots insidebox", value: 10 },
        { type: "Shots outsidebox", value: 3 },
        { type: "Fouls", value: 12 },
        { type: "Corner Kicks", value: 7 },
        { type: "Offsides", value: 2 },
        { type: "Ball Possession", value: "48%" },
        { type: "Yellow Cards", value: 2 },
        { type: "Red Cards", value: 0 },
        { type: "Goalkeeper Saves", value: 6 },
        { type: "Total passes", value: 456 },
        { type: "Passes accurate", value: 389 },
        { type: "Passes %", value: "85%" }
      ]
    },
    {
      team: {
        id: 40,
        name: "Liverpool",
        logo: "https://media.api-sports.io/football/teams/40.png"
      },
      statistics: [
        { type: "Shots on Goal", value: 7 },
        { type: "Shots off Goal", value: 4 },
        { type: "Total Shots", value: 11 },
        { type: "Blocked Shots", value: 2 },
        { type: "Shots insidebox", value: 8 },
        { type: "Shots outsidebox", value: 3 },
        { type: "Fouls", value: 10 },
        { type: "Corner Kicks", value: 5 },
        { type: "Offsides", value: 3 },
        { type: "Ball Possession", value: "52%" },
        { type: "Yellow Cards", value: 3 },
        { type: "Red Cards", value: 0 },
        { type: "Goalkeeper Saves", value: 4 },
        { type: "Total passes", value: 512 },
        { type: "Passes accurate", value: 445 },
        { type: "Passes %", value: "87%" }
      ]
    }
  ],
  lineups: [
    {
      team: {
        id: 33,
        name: "Manchester United",
        logo: "https://media.api-sports.io/football/teams/33.png",
        colors: {
          player: { primary: "FF0000", number: "FFFFFF", border: "FF0000" },
          goalkeeper: { primary: "1E90FF", number: "FFFFFF", border: "1E90FF" }
        }
      },
      coach: {
        id: 1,
        name: "Erik ten Hag",
        photo: "https://media.api-sports.io/football/coachs/1.png"
      },
      formation: "4-2-3-1",
      startXI: [
        { player: { id: 1, name: "André Onana", number: 24, pos: "G", grid: "1:1" } },
        { player: { id: 2, name: "Diogo Dalot", number: 20, pos: "D", grid: "2:1" } },
        { player: { id: 3, name: "Raphaël Varane", number: 19, pos: "D", grid: "2:2" } },
        { player: { id: 4, name: "Lisandro Martínez", number: 6, pos: "D", grid: "2:3" } },
        { player: { id: 5, name: "Luke Shaw", number: 23, pos: "D", grid: "2:4" } },
        { player: { id: 6, name: "Casemiro", number: 18, pos: "M", grid: "3:1" } },
        { player: { id: 7, name: "Kobbie Mainoo", number: 37, pos: "M", grid: "3:2" } },
        { player: { id: 8, name: "Bruno Fernandes", number: 8, pos: "M", grid: "4:1" } },
        { player: { id: 9, name: "Marcus Rashford", number: 10, pos: "M", grid: "4:2" } },
        { player: { id: 10, name: "Alejandro Garnacho", number: 17, pos: "M", grid: "4:3" } },
        { player: { id: 11, name: "Rasmus Højlund", number: 11, pos: "F", grid: "5:1" } }
      ],
      substitutes: [
        { player: { id: 12, name: "Altay Bayındır", number: 1, pos: "G", grid: null } },
        { player: { id: 13, name: "Harry Maguire", number: 5, pos: "D", grid: null } },
        { player: { id: 14, name: "Aaron Wan-Bissaka", number: 29, pos: "D", grid: null } }
      ]
    },
    {
      team: {
        id: 40,
        name: "Liverpool",
        logo: "https://media.api-sports.io/football/teams/40.png",
        colors: {
          player: { primary: "DC143C", number: "FFFFFF", border: "DC143C" },
          goalkeeper: { primary: "32CD32", number: "000000", border: "32CD32" }
        }
      },
      coach: {
        id: 2,
        name: "Jürgen Klopp",
        photo: "https://media.api-sports.io/football/coachs/2.png"
      },
      formation: "4-3-3",
      startXI: [
        { player: { id: 101, name: "Alisson", number: 1, pos: "G", grid: "1:1" } },
        { player: { id: 102, name: "Trent Alexander-Arnold", number: 66, pos: "D", grid: "2:1" } },
        { player: { id: 103, name: "Virgil van Dijk", number: 4, pos: "D", grid: "2:2" } },
        { player: { id: 104, name: "Ibrahima Konaté", number: 5, pos: "D", grid: "2:3" } },
        { player: { id: 105, name: "Andy Robertson", number: 26, pos: "D", grid: "2:4" } },
        { player: { id: 106, name: "Alexis Mac Allister", number: 10, pos: "M", grid: "3:1" } },
        { player: { id: 107, name: "Wataru Endo", number: 3, pos: "M", grid: "3:2" } },
        { player: { id: 108, name: "Dominik Szoboszlai", number: 8, pos: "M", grid: "3:3" } },
        { player: { id: 109, name: "Mohamed Salah", number: 11, pos: "F", grid: "4:1" } },
        { player: { id: 110, name: "Darwin Núñez", number: 9, pos: "F", grid: "4:2" } },
        { player: { id: 111, name: "Luis Díaz", number: 7, pos: "F", grid: "4:3" } }
      ],
      substitutes: [
        { player: { id: 112, name: "Caoimhín Kelleher", number: 62, pos: "G", grid: null } },
        { player: { id: 113, name: "Joe Gomez", number: 2, pos: "D", grid: null } },
        { player: { id: 114, name: "Curtis Jones", number: 17, pos: "M", grid: null } }
      ]
    }
  ],
  players: [
    {
      team: {
        id: 33,
        name: "Manchester United",
        logo: "https://media.api-sports.io/football/teams/33.png",
        update: "2025-03-15T21:00:00+00:00"
      },
      players: [
        {
          player: {
            id: 8,
            name: "Bruno Fernandes",
            photo: "https://media.api-sports.io/football/players/8.png"
          },
          statistics: [{
            games: { minutes: 90, number: 8, position: "M", rating: "8.5", captain: true, substitute: false },
            shots: { total: 4, on: 3 },
            goals: { total: 1, conceded: 0, assists: 1, saves: null },
            passes: { total: 65, key: 4, accuracy: "88%" },
            tackles: { total: 3, blocks: 1, interceptions: 2 },
            duels: { total: 12, won: 8 },
            dribbles: { attempts: 5, success: 3, past: null },
            fouls: { drawn: 2, committed: 1 },
            cards: { yellow: 0, red: 0 },
            penalty: { won: null, committed: null, scored: 0, missed: 0, saved: null }
          }]
        },
        {
          player: {
            id: 11,
            name: "Rasmus Højlund",
            photo: "https://media.api-sports.io/football/players/11.png"
          },
          statistics: [{
            games: { minutes: 90, number: 11, position: "F", rating: "8.2", captain: false, substitute: false },
            shots: { total: 5, on: 4 },
            goals: { total: 1, conceded: 0, assists: 0, saves: null },
            passes: { total: 28, key: 1, accuracy: "78%" },
            tackles: { total: 1, blocks: 0, interceptions: 0 },
            duels: { total: 15, won: 9 },
            dribbles: { attempts: 4, success: 2, past: null },
            fouls: { drawn: 3, committed: 2 },
            cards: { yellow: 1, red: 0 },
            penalty: { won: null, committed: null, scored: 0, missed: 0, saved: null }
          }]
        }
      ]
    },
    {
      team: {
        id: 40,
        name: "Liverpool",
        logo: "https://media.api-sports.io/football/teams/40.png",
        update: "2025-03-15T21:00:00+00:00"
      },
      players: [
        {
          player: {
            id: 109,
            name: "Mohamed Salah",
            photo: "https://media.api-sports.io/football/players/109.png"
          },
          statistics: [{
            games: { minutes: 90, number: 11, position: "F", rating: "7.8", captain: false, substitute: false },
            shots: { total: 4, on: 2 },
            goals: { total: 1, conceded: 0, assists: 0, saves: null },
            passes: { total: 42, key: 3, accuracy: "85%" },
            tackles: { total: 1, blocks: 0, interceptions: 1 },
            duels: { total: 10, won: 6 },
            dribbles: { attempts: 6, success: 4, past: null },
            fouls: { drawn: 2, committed: 1 },
            cards: { yellow: 0, red: 0 },
            penalty: { won: null, committed: null, scored: 0, missed: 0, saved: null }
          }]
        }
      ]
    }
  ],
  owners: [
    {
      team: {
        id: 33,
        name: "Manchester United",
        logo: "https://media.api-sports.io/football/teams/33.png"
      },
      owner: {
        name: "Glazer Family",
        photo: "https://via.placeholder.com/150",
        netWorth: "$4.7B",
        country: "United States",
        since: 2005
      },
      recentInvestment: {
        amount: "$85M",
        purpose: "Stadium renovation and youth academy",
        date: "2025-01"
      },
      sentiment: {
        score: 45,
        trend: "declining",
        fanApproval: "35%"
      }
    },
    {
      team: {
        id: 40,
        name: "Liverpool",
        logo: "https://media.api-sports.io/football/teams/40.png"
      },
      owner: {
        name: "Fenway Sports Group",
        photo: "https://via.placeholder.com/150",
        netWorth: "$12.8B",
        country: "United States",
        since: 2010
      },
      recentInvestment: {
        amount: "$120M",
        purpose: "Squad strengthening and facilities",
        date: "2025-01"
      },
      sentiment: {
        score: 78,
        trend: "stable",
        fanApproval: "72%"
      }
    }
  ]
};

const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  // Use mock data for template
  const matchData = mockMatchData;
  const { fixture, statistics, lineups, players, owners } = matchData;

  // Calculate team mood and attack desire based on statistics
  const calculateTeamMood = (stats: any[]) => {
    if (!stats) return 50;
    const possession = parseInt((stats.find((s: any) => s.type === "Ball Possession")?.value as string)?.replace("%", "") || "50");
    const passes = parseInt(stats.find((s: any) => s.type === "Passes accurate")?.value as string || "0");
    return Math.min(100, (possession + passes / 10));
  };

  const calculateAttackDesire = (stats: any[]) => {
    if (!stats) return 50;
    const shotsOn = parseInt(stats.find((s: any) => s.type === "Shots on Goal")?.value as string || "0");
    const totalShots = parseInt(stats.find((s: any) => s.type === "Total Shots")?.value as string || "0");
    return Math.min(100, (shotsOn * 10 + totalShots * 3));
  };

  const teamMoodHome = calculateTeamMood(statistics[0]?.statistics);
  const teamMoodAway = calculateTeamMood(statistics[1]?.statistics);
  const attackDesireHome = calculateAttackDesire(statistics[0]?.statistics);
  const attackDesireAway = calculateAttackDesire(statistics[1]?.statistics);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation */}
        <Button onClick={() => navigate(-1)} variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回赛程表
        </Button>

        {/* Match Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {fixture.league.name} - {fixture.league.round}
            </div>
            <Badge variant={fixture.fixture.status.short === "FT" ? "secondary" : "default"}>
              {fixture.fixture.status.long}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-2">
              <img
                src={fixture.teams.home.logo}
                alt={fixture.teams.home.name}
                className="w-20 h-20 object-contain"
              />
              <h2 className="text-xl font-bold text-center">{fixture.teams.home.name}</h2>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-5xl font-bold">
                {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
              </div>
              {fixture.score.halftime.home !== null && (
                <div className="text-sm text-muted-foreground">
                  半场: {fixture.score.halftime.home} - {fixture.score.halftime.away}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {new Date(fixture.fixture.date).toLocaleString("zh-CN")}
              </div>
              {fixture.fixture.venue.name && (
                <div className="text-xs text-muted-foreground">
                  {fixture.fixture.venue.name}, {fixture.fixture.venue.city}
                </div>
              )}
              {fixture.fixture.referee && (
                <div className="text-xs text-muted-foreground">
                  裁判: {fixture.fixture.referee}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-2">
              <img
                src={fixture.teams.away.logo}
                alt={fixture.teams.away.name}
                className="w-20 h-20 object-contain"
              />
              <h2 className="text-xl font-bold text-center">{fixture.teams.away.name}</h2>
            </div>
          </div>
        </Card>

        {/* Team Mood & Attack Desire */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">团队情绪</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{fixture.teams.home.name}</span>
                  <span className="text-sm font-medium">{teamMoodHome}%</span>
                </div>
                <Progress value={teamMoodHome} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{fixture.teams.away.name}</span>
                  <span className="text-sm font-medium">{teamMoodAway}%</span>
                </div>
                <Progress value={teamMoodAway} className="h-2" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">进攻欲望</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{fixture.teams.home.name}</span>
                  <span className="text-sm font-medium">{attackDesireHome}%</span>
                </div>
                <Progress value={attackDesireHome} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">{fixture.teams.away.name}</span>
                  <span className="text-sm font-medium">{attackDesireAway}%</span>
                </div>
                <Progress value={attackDesireAway} className="h-2" />
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="statistics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="statistics">统计数据</TabsTrigger>
            <TabsTrigger value="lineups">阵容</TabsTrigger>
            <TabsTrigger value="players">球员表现</TabsTrigger>
            <TabsTrigger value="owners">老板信息</TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-4">
            {statistics && statistics.length > 0 ? (
              <Card className="p-6">
                <div className="space-y-4">
                  {statistics[0].statistics.map((stat, idx) => {
                    const homeStat = stat;
                    const awayStat = statistics[1]?.statistics[idx];
                    const homeValue = typeof homeStat.value === "string" ? parseInt(homeStat.value.replace(/[^\d]/g, "")) || 0 : homeStat.value || 0;
                    const awayValue = typeof awayStat?.value === "string" ? parseInt(awayStat.value.replace(/[^\d]/g, "")) || 0 : awayStat?.value || 0;
                    const total = homeValue + awayValue || 1;
                    const homePercent = (homeValue / total) * 100;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{homeStat.value}</span>
                          <span className="text-muted-foreground">{homeStat.type}</span>
                          <span className="font-medium">{awayStat?.value}</span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                            style={{ width: `${homePercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">暂无统计数据</p>
              </Card>
            )}
          </TabsContent>

          {/* Lineups Tab */}
          <TabsContent value="lineups" className="space-y-4">
            {lineups && lineups.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {lineups.map((lineup) => (
                  <Card key={lineup.team.id} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={lineup.team.logo}
                        alt={lineup.team.name}
                        className="w-8 h-8 object-contain"
                      />
                      <h3 className="text-lg font-semibold">{lineup.team.name}</h3>
                      <Badge variant="outline" className="ml-auto">{lineup.formation}</Badge>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">首发阵容</h4>
                        <div className="space-y-2">
                          {lineup.startXI.map((p) => (
                            <div key={p.player.id} className="flex items-center gap-2">
                              <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                                {p.player.number}
                              </Badge>
                              <span className="flex-1">{p.player.name}</span>
                              <Badge variant="outline">{p.player.pos}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">替补</h4>
                        <div className="space-y-2">
                          {lineup.substitutes.map((p) => (
                            <div key={p.player.id} className="flex items-center gap-2 text-muted-foreground">
                              <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                                {p.player.number}
                              </Badge>
                              <span className="flex-1">{p.player.name}</span>
                              <span className="text-xs">{p.player.pos}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">教练:</span>
                          <span className="font-medium">{lineup.coach.name}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">暂无阵容数据</p>
              </Card>
            )}
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-4">
            {players && players.length > 0 ? (
              players.map((teamPlayers) => (
                <Card key={teamPlayers.team.id} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={teamPlayers.team.logo}
                      alt={teamPlayers.team.name}
                      className="w-8 h-8 object-contain"
                    />
                    <h3 className="text-lg font-semibold">{teamPlayers.team.name}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">球员</th>
                          <th className="text-center p-2">评分</th>
                          <th className="text-center p-2">进球</th>
                          <th className="text-center p-2">助攻</th>
                          <th className="text-center p-2">射门</th>
                          <th className="text-center p-2">传球</th>
                          <th className="text-center p-2">黄牌</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPlayers.players.map((player) => {
                          const stats = player.statistics[0];
                          return (
                            <tr key={player.player.id} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={player.player.photo}
                                    alt={player.player.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                  <div>
                                    <div className="font-medium">{player.player.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {stats.games.position} • {stats.games.minutes}'
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center p-2">
                                <Badge variant="outline">{stats.games.rating || "N/A"}</Badge>
                              </td>
                              <td className="text-center p-2">{stats.goals.total || 0}</td>
                              <td className="text-center p-2">{stats.goals.assists || 0}</td>
                              <td className="text-center p-2">
                                {stats.shots.on || 0}/{stats.shots.total || 0}
                              </td>
                              <td className="text-center p-2">
                                {stats.passes.total || 0} ({stats.passes.accuracy || "0%"})
                              </td>
                              <td className="text-center p-2">
                                {stats.cards.yellow > 0 && (
                                  <Badge variant="outline" className="bg-yellow-500/20">
                                    {stats.cards.yellow}
                                  </Badge>
                                )}
                                {stats.cards.red > 0 && (
                                  <Badge variant="destructive">{stats.cards.red}</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">暂无球员数据</p>
              </Card>
            )}
          </TabsContent>

          {/* Owner Information Tab */}
          <TabsContent value="owners" className="space-y-4">
            <TooltipProvider>
              {owners && owners.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {owners.map((ownerData) => (
                    <Card key={ownerData.team.id} className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <img
                          src={ownerData.team.logo}
                          alt={ownerData.team.name}
                          className="w-10 h-10 object-contain"
                        />
                        <div>
                          <h3 className="text-lg font-semibold">{ownerData.team.name}</h3>
                          <p className="text-sm text-muted-foreground">所有者信息</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Owner Basic Info */}
                        <div className="flex items-start gap-4">
                          <img
                            src={ownerData.owner.photo}
                            alt={ownerData.owner.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-xl">{ownerData.owner.name}</h4>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">净资产:</span>
                                <span className="ml-2 font-semibold text-primary">
                                  {ownerData.owner.netWorth}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">国家:</span>
                                <span className="ml-2">{ownerData.owner.country}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">拥有年份:</span>
                                <span className="ml-2">{ownerData.owner.since}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recent Investment */}
                        <div className="border-t pt-4">
                          <h5 className="font-semibold mb-3">最近投资</h5>
                          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">投资金额</span>
                              <span className="font-bold text-lg text-primary">
                                {ownerData.recentInvestment.amount}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">用途</span>
                              <span className="text-sm text-right max-w-[200px]">
                                {ownerData.recentInvestment.purpose}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">日期</span>
                              <span className="text-sm">{ownerData.recentInvestment.date}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sentiment Analysis */}
                        <div className="border-t pt-4">
                          <h5 className="font-semibold mb-3">球迷情绪</h5>
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">情绪指数</span>
                                <div className="flex items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger>
                                      {ownerData.sentiment.trend === "rising" && (
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                      )}
                                      {ownerData.sentiment.trend === "declining" && (
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                      )}
                                      {ownerData.sentiment.trend === "stable" && (
                                        <Minus className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>趋势: {ownerData.sentiment.trend === "rising" ? "上升" : ownerData.sentiment.trend === "declining" ? "下降" : "稳定"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <span className="font-medium">{ownerData.sentiment.score}/100</span>
                                </div>
                              </div>
                              <Progress value={ownerData.sentiment.score} className="h-2" />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">球迷支持率</span>
                              <Badge
                                variant={
                                  parseInt(ownerData.sentiment.fanApproval) > 60
                                    ? "default"
                                    : parseInt(ownerData.sentiment.fanApproval) > 40
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {ownerData.sentiment.fanApproval}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-6">
                  <p className="text-center text-muted-foreground">暂无老板信息</p>
                </Card>
              )}
            </TooltipProvider>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MatchDetail;

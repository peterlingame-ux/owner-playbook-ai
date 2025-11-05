import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { ArrowLeft, Activity, TrendingUp, Trophy, Target, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { MatchDetailData } from "@/types/footballApi";
import { upcomingMatches } from "@/data/mockData";

const MatchDetail = () => {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [matchData, setMatchData] = useState<MatchDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 从mockData中获取基本信息，用于显示和映射fixtureId
  const match = upcomingMatches.find(m => m.id === matchId);

  useEffect(() => {
    const fetchMatchDetail = async () => {
      if (!match) return;
      
      try {
        setLoading(true);
        // 这里使用matchId作为fixtureId，实际应用中可能需要映射
        const { data, error: functionError } = await supabase.functions.invoke('football-match-detail', {
          body: { fixtureId: matchId }
        });

        if (functionError) {
          console.error('Error fetching match detail:', functionError);
          setError(functionError.message);
        } else {
          setMatchData(data);
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetail();
  }, [matchId, match]);
  
  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('match_not_found')}</p>
          <Button onClick={() => navigate("/")} size="sm">
            {t('go_back')}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  const fixture = matchData?.fixture;
  const statistics = matchData?.statistics;
  const lineups = matchData?.lineups;
  const players = matchData?.players;

  // 计算球队情绪和进攻欲望（基于统计数据）
  const calculateTeamMood = (stats: any) => {
    if (!stats) return 50;
    const attacks = parseInt(stats.find((s: any) => s.type === 'Total attacks')?.value || '0');
    const dangerous = parseInt(stats.find((s: any) => s.type === 'Dangerous attacks')?.value || '0');
    return Math.min(100, (attacks + dangerous * 2) / 3);
  };

  const calculateAttackDesire = (stats: any) => {
    if (!stats) return 50;
    const shotsOn = parseInt(stats.find((s: any) => s.type === 'Shots on target')?.value || '0');
    const shotsOff = parseInt(stats.find((s: any) => s.type === 'Shots off target')?.value || '0');
    return Math.min(100, (shotsOn * 10 + shotsOff * 5));
  };

  const homeStats = statistics?.[0]?.statistics;
  const awayStats = statistics?.[1]?.statistics;
  const homeMood = calculateTeamMood(homeStats);
  const awayMood = calculateTeamMood(awayStats);
  const homeAttack = calculateAttackDesire(homeStats);
  const awayAttack = calculateAttackDesire(awayStats);

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">{t('back_to_matches')}</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-6xl">
        {/* 比赛基本信息卡片 */}
        <Card className="mb-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <Badge variant="outline" className="mb-2 text-xs">
                {fixture?.league.name || match.league}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {fixture?.fixture.venue.name || ''} · {fixture?.fixture.venue.city || ''}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(fixture?.fixture.date || match.date).toLocaleString()}
              </div>
            </div>
            
            {/* 比分和队徽 */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center flex-1">
                <img 
                  src={fixture?.teams.home.logo || '/placeholder.svg'} 
                  alt={fixture?.teams.home.name || match.homeTeam}
                  className="w-16 h-16 mx-auto mb-2"
                />
                <div className="text-lg font-bold">{fixture?.teams.home.name || match.homeTeam}</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold font-mono-data">
                  {fixture?.goals.home ?? '-'} - {fixture?.goals.away ?? '-'}
                </div>
                {fixture?.fixture.status.elapsed && (
                  <Badge variant="destructive" className="mt-2 animate-pulse">
                    {fixture.fixture.status.elapsed}'
                  </Badge>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {fixture?.fixture.status.long || t('upcoming')}
                </div>
              </div>
              
              <div className="text-center flex-1">
                <img 
                  src={fixture?.teams.away.logo || '/placeholder.svg'} 
                  alt={fixture?.teams.away.name || match.awayTeam}
                  className="w-16 h-16 mx-auto mb-2"
                />
                <div className="text-lg font-bold">{fixture?.teams.away.name || match.awayTeam}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 球队情绪和进攻欲望 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                球队情绪指数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{fixture?.teams.home.name || match.homeTeam}</span>
                  <span className="font-mono-data">{homeMood.toFixed(0)}%</span>
                </div>
                <Progress value={homeMood} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{fixture?.teams.away.name || match.awayTeam}</span>
                  <span className="font-mono-data">{awayMood.toFixed(0)}%</span>
                </div>
                <Progress value={awayMood} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-destructive" />
                进攻欲望
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{fixture?.teams.home.name || match.homeTeam}</span>
                  <span className="font-mono-data">{homeAttack.toFixed(0)}%</span>
                </div>
                <Progress value={homeAttack} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{fixture?.teams.away.name || match.awayTeam}</span>
                  <span className="font-mono-data">{awayAttack.toFixed(0)}%</span>
                </div>
                <Progress value={awayAttack} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细数据标签页 */}
        <Tabs defaultValue="statistics" className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="statistics">
              <Activity className="h-4 w-4 mr-2" />
              比赛统计
            </TabsTrigger>
            <TabsTrigger value="lineups">
              <Trophy className="h-4 w-4 mr-2" />
              阵容
            </TabsTrigger>
            <TabsTrigger value="players">
              <TrendingUp className="h-4 w-4 mr-2" />
              球员表现
            </TabsTrigger>
          </TabsList>

          {/* 比赛统计 */}
          <TabsContent value="statistics">
            {statistics && statistics.length === 2 ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {homeStats?.map((stat: any, idx: number) => {
                      const awayStat = awayStats?.[idx];
                      const homeValue = typeof stat.value === 'string' ? parseInt(stat.value) || 0 : stat.value || 0;
                      const awayValue = typeof awayStat?.value === 'string' ? parseInt(awayStat.value) || 0 : awayStat?.value || 0;
                      const total = homeValue + awayValue || 1;
                      const homePercent = (homeValue / total) * 100;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-mono-data">{stat.value}</span>
                            <span className="font-medium">{stat.type}</span>
                            <span className="font-mono-data">{awayStat?.value}</span>
                          </div>
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                              style={{ width: `${homePercent}%` }}
                            />
                            <div 
                              className="absolute right-0 top-0 h-full bg-destructive rounded-full transition-all"
                              style={{ width: `${100 - homePercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {error ? `加载错误: ${error}` : '暂无比赛统计数据'}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 阵容 */}
          <TabsContent value="lineups">
            {lineups && lineups.length === 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lineups.map((lineup, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <img src={lineup.team.logo} alt={lineup.team.name} className="w-6 h-6" />
                        {lineup.team.name}
                        <Badge variant="outline" className="ml-auto">{lineup.formation}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold mb-2">首发阵容</p>
                        <div className="space-y-1">
                          {lineup.startXI.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                                {p.player.number}
                              </Badge>
                              <span className="flex-1">{p.player.name}</span>
                              <Badge variant="outline" className="text-xs">{p.player.pos}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-2">替补</p>
                        <div className="space-y-1">
                          {lineup.substitutes.slice(0, 5).map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                                {p.player.number}
                              </Badge>
                              <span className="flex-1">{p.player.name}</span>
                              <span className="text-xs">{p.player.pos}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  暂无阵容数据
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 球员表现 */}
          <TabsContent value="players">
            {players && players.length === 2 ? (
              <div className="space-y-4">
                {players.map((team, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <img src={team.team.logo} alt={team.team.name} className="w-6 h-6" />
                        {team.team.name} - 球员统计
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 pr-2">球员</th>
                              <th className="text-center px-1">评分</th>
                              <th className="text-center px-1">进球</th>
                              <th className="text-center px-1">助攻</th>
                              <th className="text-center px-1">射门</th>
                              <th className="text-center px-1">传球</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.players.slice(0, 11).map((player, i) => {
                              const stats = player.statistics[0];
                              return (
                                <tr key={i} className="border-b">
                                  <td className="py-2 pr-2">
                                    <div className="flex items-center gap-2">
                                      <img src={player.player.photo} alt={player.player.name} className="w-6 h-6 rounded-full" />
                                      <span className="truncate max-w-[120px]">{player.player.name}</span>
                                    </div>
                                  </td>
                                  <td className="text-center px-1 font-mono-data">
                                    {stats?.games.rating ? parseFloat(stats.games.rating).toFixed(1) : '-'}
                                  </td>
                                  <td className="text-center px-1 font-mono-data">{stats?.goals.total || 0}</td>
                                  <td className="text-center px-1 font-mono-data">{stats?.goals.assists || 0}</td>
                                  <td className="text-center px-1 font-mono-data">{stats?.shots.total || 0}</td>
                                  <td className="text-center px-1 font-mono-data">{stats?.passes.accuracy || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  暂无球员数据
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MatchDetail;

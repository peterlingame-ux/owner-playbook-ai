import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { homeTeamId, awayTeamId } = await req.json();
    
    if (!homeTeamId || !awayTeamId) {
      return new Response(
        JSON.stringify({ error: 'Home team ID and away team ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FOOTBALL_API_KEY = Deno.env.get('FOOTBALL_API_KEY');
    if (!FOOTBALL_API_KEY) {
      console.error('FOOTBALL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const API_BASE = 'https://v3.football.api-sports.io';
    const headers = {
      'x-rapidapi-key': FOOTBALL_API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    };

    // 获取历史交锋数据（最多10场）
    const url = `${API_BASE}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=10`;
    
    console.log('Fetching head-to-head data from:', url);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Football API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch head-to-head data' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const fixtures = data.response || [];

    // 统计历史交锋结果
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    fixtures.forEach((fixture: any) => {
      if (fixture.goals?.home === null || fixture.goals?.away === null) {
        return; // 跳过未完成的比赛
      }

      const homeGoals = fixture.goals.home;
      const awayGoals = fixture.goals.away;

      if (homeGoals > awayGoals) {
        homeWins++;
      } else if (homeGoals === awayGoals) {
        draws++;
      } else {
        awayWins++;
      }
    });

    const headToHead = {
      home_wins: homeWins,
      draws: draws,
      away_wins: awayWins,
      total_games: fixtures.filter((f: any) => 
        f.goals?.home !== null && f.goals?.away !== null
      ).length,
      fixtures: fixtures.slice(0, 10).map((fixture: any) => ({
        date: fixture.fixture.date,
        home_team: fixture.teams.home.name,
        away_team: fixture.teams.away.name,
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
        league: fixture.league.name,
      })),
    };

    console.log(`Head-to-head fetched: ${headToHead.total_games} games (${homeWins}W-${draws}D-${awayWins}L)`);

    return new Response(
      JSON.stringify({ headToHead }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in football-head-to-head function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


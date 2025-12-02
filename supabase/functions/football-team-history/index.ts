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
    const { teamId } = await req.json();
    
    if (!teamId) {
      return new Response(
        JSON.stringify({ error: 'Team ID is required' }),
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

    // 获取球队最近 10 场比赛（只获取已完成的比赛）
    const url = `${API_BASE}/fixtures?team=${teamId}&last=10&status=FT`;
    
    console.log('Fetching team history from:', url);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Football API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch team history' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const fixtures = data.response || [];

    // 处理比赛数据，提取胜负信息
    const history = fixtures
      .filter((fixture: any) => 
        fixture.goals?.home !== null && 
        fixture.goals?.away !== null &&
        fixture.fixture.status.short === 'FT'
      )
      .slice(0, 10)
      .map((fixture: any) => {
        const isHome = fixture.teams.home.id === parseInt(teamId);
        const teamGoals = isHome ? fixture.goals.home : fixture.goals.away;
        const opponentGoals = isHome ? fixture.goals.away : fixture.goals.home;
        
        let result: 'W' | 'D' | 'L' = 'D';
        if (teamGoals > opponentGoals) {
          result = 'W';
        } else if (teamGoals < opponentGoals) {
          result = 'L';
        }

        return {
          date: fixture.fixture.date,
          opponent: {
            id: isHome ? fixture.teams.away.id : fixture.teams.home.id,
            name: isHome ? fixture.teams.away.name : fixture.teams.home.name,
            logo: isHome ? fixture.teams.away.logo : fixture.teams.home.logo,
          },
          isHome,
          score: {
            team: teamGoals,
            opponent: opponentGoals,
          },
          result,
          league: {
            id: fixture.league.id,
            name: fixture.league.name,
          },
        };
      })
      .reverse(); // 反转顺序，最新的在最后

    console.log(`Team history fetched for team ${teamId}, ${history.length} matches`);

    return new Response(
      JSON.stringify({ history }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in football-team-history function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


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
    const { fixtureId } = await req.json();
    
    if (!fixtureId) {
      return new Response(
        JSON.stringify({ error: 'Fixture ID is required' }),
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

    // 并行请求多个API端点
    const [fixtureRes, statisticsRes, lineupsRes, playersRes] = await Promise.all([
      fetch(`${API_BASE}/fixtures?id=${fixtureId}`, { headers }),
      fetch(`${API_BASE}/fixtures/statistics?fixture=${fixtureId}`, { headers }),
      fetch(`${API_BASE}/fixtures/lineups?fixture=${fixtureId}`, { headers }),
      fetch(`${API_BASE}/fixtures/players?fixture=${fixtureId}`, { headers })
    ]);

    if (!fixtureRes.ok) {
      console.error('Football API error:', fixtureRes.status, await fixtureRes.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch match data' }),
        { status: fixtureRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fixtureData = await fixtureRes.json();
    const statisticsData = statisticsRes.ok ? await statisticsRes.json() : null;
    const lineupsData = lineupsRes.ok ? await lineupsRes.json() : null;
    const playersData = playersRes.ok ? await playersRes.json() : null;

    // 合并所有数据
    const result = {
      fixture: fixtureData.response?.[0] || null,
      statistics: statisticsData?.response || null,
      lineups: lineupsData?.response || null,
      players: playersData?.response || null,
    };

    console.log('Match detail fetched successfully for fixture:', fixtureId);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in football-match-detail function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

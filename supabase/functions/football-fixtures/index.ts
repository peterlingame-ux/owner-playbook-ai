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
    const { league, season, status } = await req.json();
    
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

    let url = '';
    
    // 根据状态构建不同的 URL
    if (status === 'live') {
      // 获取所有正在进行的比赛
      url = `${API_BASE}/fixtures?live=all`;
    } else if (status === 'all' && !league) {
      // 获取今天所有比赛
      const today = new Date().toISOString().split('T')[0];
      url = `${API_BASE}/fixtures?date=${today}`;
    } else {
      // 获取指定联赛的比赛（最近30天）
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const to = futureDate.toISOString().split('T')[0];
      url = `${API_BASE}/fixtures?league=${league || '39'}&season=${season || '2024'}&from=${today}&to=${to}`;
    }

    console.log('Fetching fixtures from:', url);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Football API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch fixtures data' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Fixtures fetched successfully, count:', data.response?.length || 0);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in football-fixtures function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

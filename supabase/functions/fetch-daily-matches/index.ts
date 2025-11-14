import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildLeagueLookup,
  type LeagueInfo,
} from "../_shared/match-map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type FixtureTeam = {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
};

type FixtureLeague = {
  id: number;
  name: string;
  country: string;
};

type FixtureData = {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    timezone: string;
    venue: {
      id: number | null;
      name: string | null;
      city: string | null;
    };
  };
  league: FixtureLeague;
  teams: {
    home: FixtureTeam;
    away: FixtureTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

type FixtureResponse = {
  response: FixtureData[];
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FOOTBALL_API_KEY = Deno.env.get("FOOTBALL_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[fetch-daily-matches] SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置，数据库写入将失败。",
  );
}

if (!FOOTBALL_API_KEY) {
  console.warn(
    "[fetch-daily-matches] FOOTBALL_API_KEY 未配置，将无法从 Football API 拉取数据。",
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const leagueLookup = buildLeagueLookup();

const buildLeagueKey = (value: string | null | undefined) =>
  value?.toLowerCase().trim() ?? "";

const findLeagueInfo = (
  name: string | null | undefined,
  country?: string | null,
): LeagueInfo | undefined => {
  const key = buildLeagueKey(name);
  if (!key) {
    return undefined;
  }

  const match = leagueLookup.get(key);
  if (match) {
    return match;
  }

  if (country) {
    const combinedKey = buildLeagueKey(`${country} - ${name}`);
    if (combinedKey) {
      return leagueLookup.get(combinedKey);
    }
  }

  return undefined;
};

const getTargetDate = (timezone = "Asia/Shanghai") => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter
    .formatToParts(now)
    .map((part) => part.value)
    .join("")
    .replace(/[^0-9]/g, "")
    .replace(
      /^(\d{4})(\d{2})(\d{2})$/,
      "$1-$2-$3",
    );
};

const normalizeDate = (value: string) => value.slice(0, 10);

const fetchFixturesByDate = async (date: string) => {
  if (!FOOTBALL_API_KEY) {
    throw new Error("FOOTBALL_API_KEY 未配置");
  }

  const url = new URL("https://v3.football.api-sports.io/fixtures");
  url.searchParams.set("date", date);

  const response = await fetch(url, {
    headers: {
      "x-rapidapi-key": FOOTBALL_API_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(
      "[fetch-daily-matches] Football API error:",
      response.status,
      body,
    );
    throw new Error(`Football API 请求失败：${response.status}`);
  }

  const json = await response.json() as FixtureResponse;
  return json.response;
};

const filterFixtures = (fixtures: FixtureData[]) => {
  const filtered: Array<FixtureData & { leagueInfo: LeagueInfo }> = [];

  for (const fixture of fixtures) {
    const { league } = fixture;
    const info = findLeagueInfo(league.name, league.country);
    if (info) {
      filtered.push({ ...fixture, leagueInfo: info });
    }
  }

  return filtered;
};

const upsertFixtures = async (
  date: string,
  fixtures: Array<FixtureData & { leagueInfo: LeagueInfo }>,
) => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化，无法写入数据");
  }

  const records = fixtures.map((fixture) => ({
    date,
    fixture_id: fixture.fixture.id,
    league_id: fixture.league.id,
    league_name: fixture.leagueInfo.name,
    league_country: fixture.leagueInfo.country ?? fixture.league.country ?? null,
    home_team_id: fixture.teams.home.id,
    home_team_name: fixture.teams.home.name,
    away_team_id: fixture.teams.away.id,
    away_team_name: fixture.teams.away.name,
    kickoff_at: new Date(fixture.fixture.date).toISOString(),
    goals_home: fixture.goals.home,
    goals_away: fixture.goals.away,
    raw: fixture,
  }));

  const { error } = await supabase
    .from("daily_matches")
    .upsert(records, { onConflict: "date,fixture_id" });

  if (error) {
    throw error;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date: customDate, timezone } = req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};

    const targetDate = normalizeDate(
      customDate && typeof customDate === "string" && customDate.length >= 10
        ? customDate
        : getTargetDate(timezone),
    );

    console.log("[fetch-daily-matches] fetching fixtures for date:", targetDate);

    const fixtures = await fetchFixturesByDate(targetDate);
    const filtered = filterFixtures(fixtures);
    console.log(
      "[fetch-daily-matches] total fixtures:",
      fixtures.length,
      "filtered:",
      filtered.length,
    );

    if (filtered.length > 0) {
      await upsertFixtures(targetDate, filtered);
    }

    return new Response(
      JSON.stringify({
        date: targetDate,
        total: fixtures.length,
        filtered: filtered.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[fetch-daily-matches] error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


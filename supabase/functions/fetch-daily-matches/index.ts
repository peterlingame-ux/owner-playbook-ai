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
  logo?: string;
};

type FixtureStatus = {
  long: string;
  short: string;
  elapsed: number | null;
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
    status: FixtureStatus;
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
const DEFAULT_TIMEZONE = "Asia/Shanghai";

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

const getTargetDate = (timezone = DEFAULT_TIMEZONE) => {
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

const fetchFixturesByDate = async (
  date: string,
  timezone: string = DEFAULT_TIMEZONE,
) => {
  if (!FOOTBALL_API_KEY) {
    throw new Error("FOOTBALL_API_KEY 未配置");
  }

  const url = new URL("https://v3.football.api-sports.io/fixtures");
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", timezone);

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

const fetchFixturesByIds = async (
  fixtureIds: number[],
  timezone: string = DEFAULT_TIMEZONE,
) => {
  if (!FOOTBALL_API_KEY) {
    throw new Error("FOOTBALL_API_KEY 未配置");
  }

  if (fixtureIds.length === 0) {
    return [];
  }

  const results: FixtureData[] = [];

  // API-Sports 支持 ids 参数（使用短横线分隔），这里做分批以防止 URL 过长
  const chunkSize = 20;
  for (let index = 0; index < fixtureIds.length; index += chunkSize) {
    const chunk = fixtureIds.slice(index, index + chunkSize);
    const url = new URL("https://v3.football.api-sports.io/fixtures");

    if (chunk.length === 1) {
      url.searchParams.set("id", chunk[0].toString());
    } else {
      url.searchParams.set("ids", chunk.join("-"));
    }
    url.searchParams.set("timezone", timezone);

    const response = await fetch(url, {
      headers: {
        "x-rapidapi-key": FOOTBALL_API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        "[fetch-daily-matches] Football API error (by ids):",
        response.status,
        body,
      );
      throw new Error(`Football API 请求失败：${response.status}`);
    }

    const json = await response.json() as FixtureResponse;
    results.push(...json.response);
  }

  return results;
};

const matchTargetDate = (
  fixture: FixtureData,
  timezone: string,
  targetDate: string,
) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const localDate = formatter
    .formatToParts(new Date(fixture.fixture.date))
    .map((part) => part.value)
    .join("")
    .replace(/[^0-9]/g, "")
    .replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");

  return localDate === targetDate;
};

const filterFixtures = (
  fixtures: FixtureData[],
  timezone: string,
  targetDate: string,
) => {
  const filtered: Array<FixtureData & { leagueInfo: LeagueInfo }> = [];

  for (const fixture of fixtures) {
    const { league } = fixture;
    const info = findLeagueInfo(league.name, league.country);
    if (info && matchTargetDate(fixture, timezone, targetDate)) {
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
    league_logo: (fixture.league as any).logo || null, // 联赛 logo
    home_team_id: fixture.teams.home.id,
    home_team_name: fixture.teams.home.name,
    home_logo: fixture.teams.home.logo || null, // 主队 logo
    away_team_id: fixture.teams.away.id,
    away_team_name: fixture.teams.away.name,
    away_logo: fixture.teams.away.logo || null, // 客队 logo
    kickoff_at: new Date(fixture.fixture.date).toISOString(),
    goals_home: fixture.goals.home,
    goals_away: fixture.goals.away,
    status_long: fixture.fixture.status.long,
    status_short: fixture.fixture.status.short,
    status_elapsed: fixture.fixture.status.elapsed,
    raw: fixture,
  }));

  const { error } = await supabase
    .from("daily_matches")
    .upsert(records, { onConflict: "date,fixture_id" });

  if (error) {
    throw error;
  }
};

const COMPLETED_STATUSES = new Set(["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"]);

type ActiveFixtureMeta = {
  fixture_id: number;
  league_name: string | null;
  league_country: string | null;
  status_short: string | null;
};

const getActiveFixturesMeta = async (date: string) => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化，无法查询数据");
  }

  const { data, error } = await supabase
    .from("daily_matches")
    .select("fixture_id, status_short, league_name, league_country")
    .eq("date", date);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ActiveFixtureMeta[]).filter((item) =>
    !item.status_short || !COMPLETED_STATUSES.has(item.status_short)
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date: customDate, timezone, mode } = req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};

    const resolvedTimezone = typeof timezone === "string" && timezone.trim()
      ? timezone.trim()
      : DEFAULT_TIMEZONE;

    const targetDate = normalizeDate(
      customDate && typeof customDate === "string" && customDate.length >= 10
        ? customDate
        : getTargetDate(resolvedTimezone),
    );

    console.log("[fetch-daily-matches] fetching fixtures for date:", targetDate);

    const isRefresh = mode === "refresh";

    const fixtures = await (async () => {
      if (!isRefresh) {
        return await fetchFixturesByDate(targetDate, resolvedTimezone);
      }

      const activeMeta = await getActiveFixturesMeta(targetDate);
      if (activeMeta.length === 0) {
        console.log(
          "[fetch-daily-matches] no active fixtures to refresh for date:",
          targetDate,
        );
        return [];
      }

      const ids = activeMeta.map((item) => item.fixture_id);
      console.log(
        "[fetch-daily-matches] refreshing fixtures:",
        ids.join(","),
      );

      const leagueInfoMap = new Map<number, LeagueInfo>();
      for (const meta of activeMeta) {
        if (meta.league_name) {
          leagueInfoMap.set(meta.fixture_id, {
            name: meta.league_name,
            country: meta.league_country ?? undefined,
          });
        }
      }

      const fixturesById = await fetchFixturesByIds(ids, resolvedTimezone);

      return fixturesById
        .map((fixture) => {
          const info = leagueInfoMap.get(fixture.fixture.id) ??
            findLeagueInfo(fixture.league.name, fixture.league.country);

          if (!info || !matchTargetDate(fixture, resolvedTimezone, targetDate)) {
            return null;
          }

          return {
            ...fixture,
            leagueInfo: info,
          };
        })
        .filter(
          (item): item is FixtureData & { leagueInfo: LeagueInfo } => item !== null,
        );
    })();

    const filtered = isRefresh
      ? fixtures as Array<FixtureData & { leagueInfo: LeagueInfo }>
      : filterFixtures(fixtures as FixtureData[], resolvedTimezone, targetDate);
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


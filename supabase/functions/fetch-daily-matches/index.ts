import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildLeagueLookup,
  type LeagueInfo,
} from "../_shared/match-map.ts";

type LeagueLookup = ReturnType<typeof buildLeagueLookup>;

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

const leagueLookupMap = buildLeagueLookup();
const leagueLookup = leagueLookupMap.nameLookup;
const leagueIdLookup = leagueLookupMap.idLookup;
const englishNameLookup = leagueLookupMap.englishNameLookup;
const DEFAULT_TIMEZONE = "Asia/Shanghai";

const buildLeagueKey = (value: string | null | undefined) =>
  value?.toLowerCase().trim() ?? "";

const findLeagueInfo = (
  name: string | null | undefined,
  country?: string | null,
  leagueId?: number | null,
): LeagueInfo | undefined => {
  // 如果同时提供了ID和名称，只匹配英文名和ID（不匹配中文名）
  if (leagueId != null && name) {
    const nameKey = buildLeagueKey(name);
    
    if (!nameKey) {
      return undefined;
    }
    
    // 只通过英文名查找表查找（不包括中文名），然后验证ID是否匹配
    const matchByEnglishName = englishNameLookup.get(nameKey);
    if (matchByEnglishName && matchByEnglishName.id === leagueId) {
      // 英文名和ID都匹配
      return matchByEnglishName;
    }
    
    // 尝试国家+英文名的组合，然后验证ID
    if (country) {
      const combinedKey = buildLeagueKey(`${country} - ${name}`);
      if (combinedKey) {
        const combinedMatch = englishNameLookup.get(combinedKey);
        if (combinedMatch && combinedMatch.id === leagueId) {
          return combinedMatch;
        }
      }
    }
    
    // 英文名和ID不匹配，返回undefined（不检查中文名）
    return undefined;
  }

  // 只提供了ID，通过ID查找
  if (leagueId != null && !name) {
    return leagueIdLookup.get(leagueId);
  }

  // 只提供了名称，通过全量查找表查找（可以匹配中文名或英文名）
  if (name && leagueId == null) {
    const key = buildLeagueKey(name);
    if (!key) {
      return undefined;
    }

    // 匹配名称（可以是中文名或英文名）
    const match = leagueLookup.get(key);
    if (match) {
      return match;
    }

    // 尝试国家+名称的组合（用于区分同名的不同联赛）
    if (country) {
      const combinedKey = buildLeagueKey(`${country} - ${name}`);
      if (combinedKey) {
        return leagueLookup.get(combinedKey);
      }
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
    // 只匹配英文名和ID（不匹配中文名）
    const info = findLeagueInfo(league.name, league.country, league.id);
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

      // 从数据库中获取联赛ID，用于更准确的匹配
      const leagueInfoMap = new Map<number, LeagueInfo>();
      const leagueIdMap = new Map<number, number>();

      if (supabase) {
        const { data: leagueData, error: leagueError } = await supabase
          .from("daily_matches")
          .select("fixture_id, league_id, league_name, league_country")
          .eq("date", targetDate)
          .in("fixture_id", ids);

        if (leagueError) {
          console.warn("[fetch-daily-matches] 获取联赛ID失败:", leagueError);
        }

        // 构建联赛ID映射
        if (leagueData) {
          for (const item of leagueData) {
            if (item.league_id) {
              leagueIdMap.set(item.fixture_id, item.league_id);
            }
          }
        }
      }

      for (const meta of activeMeta) {
        if (meta.league_name) {
          const leagueId = leagueIdMap.get(meta.fixture_id);
          leagueInfoMap.set(meta.fixture_id, {
            name: meta.league_name,
            country: meta.league_country ?? undefined,
            id: leagueId ?? undefined,
          });
        }
      }

      const fixturesById = await fetchFixturesByIds(ids, resolvedTimezone);

      return fixturesById
        .map((fixture) => {
          // 只匹配英文名和ID（不匹配中文名）
          const info = findLeagueInfo(fixture.league.name, fixture.league.country, fixture.league.id);
          
          // 如果找不到匹配的联赛信息，或者日期不匹配，则过滤掉
          if (!info || !matchTargetDate(fixture, resolvedTimezone, targetDate)) {
            return null;
          }

          // 验证ID是否匹配（如果保存的联赛信息中有ID，必须匹配）
          const savedInfo = leagueInfoMap.get(fixture.fixture.id);
          if (savedInfo?.id && fixture.league.id && savedInfo.id !== fixture.league.id) {
            // ID不匹配，过滤掉
            console.warn(
              `[fetch-daily-matches] 联赛ID不匹配: fixture_id=${fixture.fixture.id}, 保存的ID=${savedInfo.id}, API返回的ID=${fixture.league.id}`,
            );
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

    // 如果是 refresh 模式且更新了比赛数据，自动触发结算
    const responseData: {
      date: string;
      total: number;
      filtered: number;
      completedMatches?: number;
      settlementTriggered?: boolean;
    } = {
      date: targetDate,
      total: fixtures.length,
      filtered: filtered.length,
    };

    if (isRefresh && filtered.length > 0) {
      try {
        // 检查是否有比赛状态变为已完成
        const completedFixtures = filtered.filter((f) =>
          COMPLETED_STATUSES.has(f.fixture.status.short)
        );

        if (completedFixtures.length > 0) {
          const completedMatchIds = completedFixtures.map((f) => f.fixture.id);
          console.log(
            "[fetch-daily-matches] 检测到已完成比赛，触发自动结算:",
            completedMatchIds.join(","),
          );

          // 调用结算函数（异步，不阻塞主流程）
          const settleFunctionUrl = `${SUPABASE_URL}/functions/v1/settle-sim-positions`;
          fetch(settleFunctionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              autoSettle: true,
              matchIds: completedMatchIds,
            }),
          })
            .then(async (response) => {
              if (response.ok) {
                const result = await response.json();
                console.log(
                  "[fetch-daily-matches] 自动结算完成:",
                  result.outcomes?.length || 0,
                  "个仓位",
                );
              } else {
                const errorText = await response.text();
                console.error(
                  "[fetch-daily-matches] 自动结算失败:",
                  response.status,
                  errorText,
                );
              }
            })
            .catch((error) => {
              console.error("[fetch-daily-matches] 自动结算请求失败:", error);
            });

          responseData.completedMatches = completedMatchIds.length;
          responseData.settlementTriggered = true;
        }
      } catch (error) {
        console.error(
          "[fetch-daily-matches] 触发自动结算时出错:",
          error,
        );
        // 不抛出错误，避免影响主流程
      }
    }

    return new Response(
      JSON.stringify(responseData),
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


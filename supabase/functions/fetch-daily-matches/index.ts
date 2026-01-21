import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SPORTNANOAPI_USER = Deno.env.get("SPORTNANOAPI_USER");
const SPORTNANOAPI_SECRET = Deno.env.get("SPORTNANOAPI_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[fetch-daily-matches] SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置，数据库写入将失败。",
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const DEFAULT_TIMEZONE = "Asia/Shanghai";
// 使用本地代理API，避免白名单限制（参考 sportnanoapi.ts 的实现）
// 默认使用 hunsoccer.net/api，也可以通过环境变量配置
const PROXY_API_BASE_URL = Deno.env.get("PROXY_API_BASE_URL") || "https://hunsoccer.net/api";
const SPORTNANOAPI_BASE_URL = "https://open.sportnanoapi.com/api/v5"; // 保留用于参考
const FQTY_API_BASE_URL = "https://api.j7nwyhqg.com/yewu11/v1/m/matchDetail";

// 获取目标日期（UTC+8时区）
const getTargetDate = (timezone = DEFAULT_TIMEZONE): string => {
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

// 获取昨天的日期
const getYesterdayDate = (timezone = DEFAULT_TIMEZONE): string => {
  const yesterday = new Date(getUTC8TimestampMs() - 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter
    .formatToParts(yesterday)
    .map((part) => part.value)
    .join("")
    .replace(/[^0-9]/g, "")
    .replace(
      /^(\d{4})(\d{2})(\d{2})$/,
      "$1-$2-$3",
    );
};

// 获取 UTC+8 时区的当前时间戳（秒级）
// 获取当前 UTC 时间戳（秒级）
// 注意：时间戳本身是 UTC 的，这是标准做法
const getUTC8Timestamp = (): number => {
  // 直接返回当前 UTC 时间戳（秒级）
  // 这是标准做法，因为时间戳本身就是 UTC 的
  return Math.floor(Date.now() / 1000);
};

// 获取当前 UTC 时间戳（毫秒级）
// 注意：时间戳本身是 UTC 的，这是标准做法
const getUTC8TimestampMs = (): number => {
  // 直接返回当前 UTC 时间戳（毫秒级）
  return Date.now();
};

// 统一比赛状态判断函数
// 判断比赛是否已结束
const isMatchCompleted = (match: {
  ended?: number | null;
  status_id?: number;
}): boolean => {
  // ended 是秒级时间戳，> 0 表示已结束
  // status_id = 8 表示完场
  return (match.ended !== null && match.ended !== undefined && match.ended > 0) 
      || match.status_id === 8;
};

// 将日期转换为纳米数据API格式（yyyymmdd）
const formatDateForAPI = (date: string): string => {
  return date.replace(/-/g, "");
};

// 从缓存获取 token
const getTokensFromCache = async (): Promise<{
  fqty_token?: string;
  ybty_token?: string;
} | null> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  const { data, error } = await supabase
    .from("app_cache")
    .select("value")
    .eq("key", "ybty_token_cache")
    .single();

  if (error || !data) {
    console.warn("[fetch-daily-matches] 无法从缓存获取 token:", error?.message);
    return null;
  }

  // 检查是否过期
  const { data: cacheData } = await supabase
    .from("app_cache")
    .select("expires_at")
    .eq("key", "ybty_token_cache")
    .single();

  if (cacheData && cacheData.expires_at) {
    const expiresAt = new Date(cacheData.expires_at);
    if (expiresAt < new Date()) {
      console.warn("[fetch-daily-matches] Token 缓存已过期");
      return null;
    }
  }

  return data.value as { fqty_token?: string; ybty_token?: string };
};

// 解压缩 base64 编码的 gzip 数据
const decompressGzipData = async (compressedData: string): Promise<unknown> => {
  try {
    // 解码 base64
    const binaryString = atob(compressedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 使用 Deno 的 gzip 解压缩
    const decompressed = await new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }).pipeThrough(new DecompressionStream("gzip"))
    ).arrayBuffer();

    const text = new TextDecoder().decode(decompressed);
    return JSON.parse(text);
  } catch (error) {
    console.error("[fetch-daily-matches] 解压缩数据失败:", error);
    throw error;
  }
};

// 获取比赛详细赔率信息（从番茄体育API）
const fetchMatchOddsInfo = async (
  ybtyToken: string,
  mid: string,
  mcid: string = "0",
  cuid: string = "529524126471950857",
  retries: number = 2,
): Promise<unknown | null> => {
  const url = `${FQTY_API_BASE_URL}/getMatchOddsInfoPB?mcid=${mcid}&mid=${mid}&cuid=${cuid}`;
  
  const headers = {
    "requestid": ybtyToken,
    "lang": "zh",
    "origin": "https://www.fqty18.com:35522",
    "referer": "https://www.fqty18.com:35522/",
    "accept": "application/json, text/plain, */*",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const baseDelay = attempt * 1000;
        const randomDelay = Math.floor(Math.random() * 500);
        const delay = baseDelay + randomDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '无法读取错误信息');
        console.warn(`[fetchMatchOddsInfo] 获取比赛 ${mid} 的赔率信息失败: HTTP ${response.status}, ${errorText.substring(0, 200)}`);
        if (attempt >= retries) {
          return null;
        }
        continue;
      }

      const result = await response.json();
      
      // 检查错误码
      if (result && typeof result === "object" && "code" in result) {
        const code = result.code;
        if (code === "0401038") {
          console.warn(`[fetchMatchOddsInfo] 比赛 ${mid} 遇到限流错误 (code: ${code})，${attempt < retries ? '将重试' : '已达到最大重试次数'}`);
          if (attempt >= retries) {
            return null;
          }
          const baseDelay = (attempt + 1) * 2000;
          const randomDelay = Math.floor(Math.random() * 1000);
          const delay = baseDelay + randomDelay;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        if (code === "0000000") {
          if ((result.data === null || result.data === undefined) && attempt < retries) {
            const retryDelay = Math.floor(Math.random() * 700) + 800;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        } else {
          console.warn(`[fetchMatchOddsInfo] 比赛 ${mid} 返回错误码: ${code}, msg: ${(result as { msg?: string }).msg || '未知错误'}`);
        }
      }

      // 如果 data 是 base64 编码的 gzip 压缩字符串，解压缩它
      if (result && typeof result === "object" && "data" in result) {
        const data = result.data;
        if (typeof data === "string" && data.startsWith("H4sI")) {
          result.data = await decompressGzipData(data);
        }
      }

      return result;
    } catch (error) {
      console.error(`[fetchMatchOddsInfo] 获取比赛 ${mid} 的赔率信息出错:`, error);
      if (attempt >= retries) {
        return null;
      }
    }
  }

  return null;
};

// 调用番茄体育API获取比赛列表
const fetchFqtyMatches = async (ybtyToken: string): Promise<Array<{
  mid: string;
  mhn?: string;
  man?: string;
  mgt?: number;
  [key: string]: unknown;
}>> => {
  const url = "https://api.j7nwyhqg.com/yewu11/v1/m/matchesPB";
  
  const headers = {
    "Content-Type": "application/json",
    "requestid": ybtyToken,
    "lang": "zh",
    "origin": "https://www.fqty18.com:35522",
    "referer": "https://www.fqty18.com:35522/",
    "accept": "application/json, text/plain, */*",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  const params = {
    euid: "20203",
    sort: 2,
    type: 3,
    cuid: "529524126471950857",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`番茄体育API请求失败: ${response.status}`);
    }

    const result = await response.json();

    // 如果 data 是 base64 编码的 gzip 压缩字符串，解压缩它
    if (result && typeof result === "object" && "data" in result) {
      const data = result.data;
      if (typeof data === "string" && data.startsWith("H4sI")) {
        result.data = await decompressGzipData(data);
      }
    }

    // 提取 matches 数组
    let matches: Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }> = [];
    
    if (result && result.data) {
      if (typeof result.data === "object" && "matches" in result.data && Array.isArray(result.data.matches)) {
        matches = result.data.matches as Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }>;
      } else if (Array.isArray(result.data)) {
        matches = result.data as Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }>;
      }
    } else if (result && "matches" in result && Array.isArray(result.matches)) {
      matches = result.matches as Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }>;
    }

    return matches;
  } catch (error) {
    console.error("[fetchFqtyMatches] 获取番茄体育比赛列表失败:", error);
    throw error;
  }
};

// 通过球队名称和比赛时间从缓存的比赛列表中匹配番茄体育API的比赛ID（mid）
const findFqtyMatchIdFromCache = (
  homeTeamName: string,
  awayTeamName: string,
  matchTime: number, // 纳米数据API的时间戳（秒）
  fqtyMatches: Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }>,
): string | null => {
  // 匹配逻辑：
  // 1. 时间匹配：必须完全一致（不允许误差）
  const matchTimeMs = matchTime * 1000; // 转换为毫秒（番茄体育API使用毫秒时间戳）
  
  // 2. 球队名称匹配：只要有一个球队名完全匹配即可
  const normalizeTeamName = (name: string): string => {
    // 移除空格、转换为小写、移除特殊字符
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^\w\u4e00-\u9fa5]/g, '');
  };
  
  const normalizedHomeTeam = normalizeTeamName(homeTeamName);
  const normalizedAwayTeam = normalizeTeamName(awayTeamName);
  
  // 查找匹配的比赛
  for (const fqtyMatch of fqtyMatches) {
    if (!fqtyMatch.mid || !fqtyMatch.mhn || !fqtyMatch.man) {
      continue;
    }
    
    // 时间匹配：必须完全一致
    const fqtyMatchTime = typeof fqtyMatch.mgt === "string" ? parseInt(fqtyMatch.mgt) : (fqtyMatch.mgt || 0);
    
    if (fqtyMatchTime !== matchTimeMs) {
      continue; // 时间不一致，跳过
    }
    
    // 球队名称匹配：只要有一个球队名完全匹配即可
    const normalizedFqtyHome = normalizeTeamName(fqtyMatch.mhn);
    const normalizedFqtyAway = normalizeTeamName(fqtyMatch.man);
    
    // 检查是否至少有一个球队名完全匹配
    const homeMatch = normalizedFqtyHome === normalizedHomeTeam;
    const awayMatch = normalizedFqtyAway === normalizedAwayTeam;
    
    if (homeMatch || awayMatch) {
      console.log(`[findFqtyMatchIdFromCache] 找到匹配: 纳米数据 ${homeTeamName} vs ${awayTeamName} (${matchTime}) -> 番茄体育 mid=${fqtyMatch.mid} (${homeMatch ? '主队' : '客队'}匹配)`);
      return fqtyMatch.mid;
    }
  }
  
  console.warn(`[findFqtyMatchIdFromCache] 未找到匹配: 纳米数据 ${homeTeamName} vs ${awayTeamName} (${matchTime})`);
  return null;
};

// 纳米数据API响应类型
type SportNanoAPIDiaryResponse = {
  code: number;
  query: {
    total: number;
    type: string;
    date: string; // yyyymmdd
  };
  results: {
    match: Array<{
      id: number;
      season_id: number;
      competition_id: number;
      home_team_id: number;
      away_team_id: number;
      status_id: number;
      match_time: number;
      neutral: number;
      note: string;
      home_scores: number[];
      away_scores: number[];
      home_position: string;
      away_position: string;
      coverage: {
        mlive: number;
        intelligence: number;
        lineup: number;
      };
      venue_id: number;
      referee_id: number;
      related_id: number;
      agg_score: number[];
      round: {
        stage_id: number;
        group_num: number;
        round_num: number;
      };
      environment?: {
        weather: number;
        pressure: string;
        temperature: string;
        wind: string;
        humidity: string;
      };
      ended?: number;
      updated_at: number;
    }>;
    competition: Array<{
      id: number;
      name: string;
      logo: string;
      [key: string]: unknown;
    }>;
    team: Array<{
      id: number;
      name: string;
      logo: string;
      [key: string]: unknown;
    }>;
  };
};

// 调用纳米数据API获取比赛日程
// 参考 src/lib/sportnanoapi.ts 中的 fetchFixtures 实现
// 使用 /match/schedule/diary 端点（通过 fixtures 端点，date 参数会自动路由到 diary）
const fetchSportNanoAPIDiary = async (
  date: string, // YYYY-MM-DD格式
): Promise<SportNanoAPIDiaryResponse> => {
  if (!SPORTNANOAPI_USER || !SPORTNANOAPI_SECRET) {
    throw new Error("SPORTNANOAPI_USER 或 SPORTNANOAPI_SECRET 未配置");
  }

  // 将日期转换为 yyyymmdd 格式（参考 sportnanoapi.ts 的实现）
  let dateParam = date.replace(/-/g, '');
  if (!dateParam || dateParam.length !== 8) {
    // 如果格式不对，使用当前日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateParam = `${year}${month}${day}`;
  }

  // 参考 sportnanoapi.ts 的实现，使用本地代理API
  // 使用 /fixtures 端点（参考 sportnanoapi.ts 中的 fetchFixtures 实现）
  // 注意：match/schedule/diary 不添加 limit 参数
  const url = `${PROXY_API_BASE_URL}/fixtures`;
  const params = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
    date: dateParam,
    // 不添加 limit 参数（参考 sportnanoapi.ts 注释）
  });


  const response = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`纳米数据API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  // 参考 sportnanoapi.ts 的实现，先读取文本再解析
  const text = await response.text();
  if (!text) {
    throw new Error('纳米数据API返回空响应');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error(`[fetchSportNanoAPIDiary] JSON解析失败，响应文本:`, text.substring(0, 500));
    throw new Error(`纳米数据API返回无效的JSON响应: ${text.substring(0, 200)}`);
  }

  // 参考 sportnanoapi.ts 的实现，验证响应格式
  if (data.code !== undefined && data.code !== 0) {
    const errorMsg = data.msg || data.message || "未知错误";
    throw new Error(`纳米数据API返回错误: code=${data.code} - ${errorMsg}`);
  }


  // 参考 sportnanoapi.ts 的实现，直接返回数据（类型断言）
  // 响应格式应该是：{ code: 0, query: {...}, results: { match: [], competition: [], team: [] } }
  const responseData = data as SportNanoAPIDiaryResponse;

  // 验证 results 字段
  if (!responseData.results || typeof responseData.results !== 'object') {
    console.error(`[fetchSportNanoAPIDiary] API响应格式错误`);
    console.error(`[fetchSportNanoAPIDiary] 完整响应数据:`, JSON.stringify(data, null, 2).substring(0, 1000));
    throw new Error(`纳米数据API返回格式错误: results 字段不存在或格式不正确。响应数据: ${JSON.stringify(data).substring(0, 500)}`);
  }

  // 确保 match, competition, team 都是数组
  if (!Array.isArray(responseData.results.match)) {
    console.warn(`[fetchSportNanoAPIDiary] API返回的 match 字段不是数组，类型: ${typeof responseData.results.match}, 值:`, responseData.results.match);
    responseData.results.match = [];
  }

  if (!Array.isArray(responseData.results.competition)) {
    console.warn(`[fetchSportNanoAPIDiary] API返回的 competition 字段不是数组，类型: ${typeof responseData.results.competition}, 值:`, responseData.results.competition);
    responseData.results.competition = [];
  }

  if (!Array.isArray(responseData.results.team)) {
    console.warn(`[fetchSportNanoAPIDiary] API返回的 team 字段不是数组，类型: ${typeof responseData.results.team}, 值:`, responseData.results.team);
    responseData.results.team = [];
  }


  return responseData;
};

// 获取联赛中文名称（从 multilingual 表）
const getLeagueChineseName = async (competitionId: number): Promise<string | null> => {
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from("leagues_multilingual")
      .select("chinese_name")
      .eq("competition_id", competitionId)
      .single();

    return data?.chinese_name || null;
  } catch (error) {
    console.warn(`[getLeagueChineseName] 获取联赛 ${competitionId} 中文名称失败:`, error);
    return null;
  }
};

// 获取球队中文名称（从 multilingual 表）
const getTeamChineseName = async (teamId: number): Promise<string | null> => {
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from("teams_multilingual")
      .select("chinese_name")
      .eq("team_id", teamId)
      .single();

    return data?.chinese_name || null;
  } catch (error) {
    console.warn(`[getTeamChineseName] 获取球队 ${teamId} 中文名称失败:`, error);
    return null;
  }
};

// 获取联赛常量映射表（用于过滤匹配的联赛）
const getLeagueConstants = async (): Promise<Map<number, string>> => {
  if (!supabase) {
    return new Map();
  }

  try {
    const { data, error } = await supabase
      .from("league_constants")
      .select("chinese_name, english_name");

    if (error || !data) {
      console.warn("[fetch-daily-matches] 无法获取联赛常量:", error?.message);
      return new Map();
    }

    // 创建中文名到英文名的映射
    const leagueMap = new Map<number, string>();
    for (const row of data) {
      // 这里需要根据实际情况匹配，暂时使用中文名作为key
      // 后续可以通过 competition_id 或名称匹配
      leagueMap.set(row.chinese_name as any, row.english_name);
    }

    return leagueMap;
  } catch (error) {
    console.warn("[fetch-daily-matches] 获取联赛常量失败:", error);
    return new Map();
  }
};

// 过滤匹配联赛的比赛
const filterMatchesByLeague = (
  matches: SportNanoAPIDiaryResponse["results"]["match"],
  competitions: SportNanoAPIDiaryResponse["results"]["competition"],
  leagueConstants: Map<number, string>,
): SportNanoAPIDiaryResponse["results"]["match"] => {
  // 如果联赛常量为空，返回所有比赛
  if (leagueConstants.size === 0) {
    return matches;
  }

  // 创建 competition_id 到 competition 的映射
  const competitionMap = new Map<number, SportNanoAPIDiaryResponse["results"]["competition"][0]>();
  for (const comp of competitions) {
    competitionMap.set(comp.id, comp);
  }

  // 过滤比赛：只保留联赛名称在 league_constants 中的比赛
  const filtered: SportNanoAPIDiaryResponse["results"]["match"] = [];

  for (const match of matches) {
    const competition = competitionMap.get(match.competition_id);
    if (competition) {
      const competitionName = competition.name;
      // 检查联赛名称是否在 league_constants 中（通过中文名或英文名匹配）
      // 这里简化处理，实际可能需要更复杂的匹配逻辑
      let isMatched = false;
      for (const [chineseName, englishName] of leagueConstants.entries()) {
        if (competitionName === (chineseName as unknown as string) || competitionName === (englishName as unknown as string)) {
          isMatched = true;
          break;
        }
      }
      if (isMatched) {
        filtered.push(match);
      }
    }
  }

  return filtered;
};

// 将纳米数据API数据转换为数据库记录
const convertToDatabaseRecord = async (
  match: SportNanoAPIDiaryResponse["results"]["match"][0],
  date: string,
  competitions: SportNanoAPIDiaryResponse["results"]["competition"],
  teams: SportNanoAPIDiaryResponse["results"]["team"],
  oddsInfo?: unknown,
): Promise<Record<string, unknown>> => {
  // 查找联赛信息
  const competition = competitions.find((c) => c.id === match.competition_id);
  const competitionName = competition?.name || null;
  const competitionLogo = competition?.logo || null;
  const competitionNameZh = competition ? await getLeagueChineseName(competition.id) : null;

  // 查找主队信息
  const homeTeam = teams.find((t) => t.id === match.home_team_id);
  const homeTeamName = homeTeam?.name || null;
  const homeTeamLogo = homeTeam?.logo || null;
  const homeTeamNameZh = homeTeam ? await getTeamChineseName(homeTeam.id) : null;

  // 查找客队信息
  const awayTeam = teams.find((t) => t.id === match.away_team_id);
  const awayTeamName = awayTeam?.name || null;
  const awayTeamLogo = awayTeam?.logo || null;
  const awayTeamNameZh = awayTeam ? await getTeamChineseName(awayTeam.id) : null;

  return {
    date,
    match_id: match.id,
    season_id: match.season_id,
    competition_id: match.competition_id,
    home_team_id: match.home_team_id,
    away_team_id: match.away_team_id,
    status_id: match.status_id,
    match_time: match.match_time,
    neutral: match.neutral,
    note: match.note || null,
    home_scores: match.home_scores || [],
    away_scores: match.away_scores || [],
    home_position: match.home_position || null,
    away_position: match.away_position || null,
    venue_id: match.venue_id || null,
    referee_id: match.referee_id || null,
    related_id: match.related_id || null,
    agg_score: match.agg_score || [],
    // ended 是秒级时间戳：如果有值（> 0），表示比赛已结束，值为结束时间戳；如果为 null 或 0，表示未结束
    // 如果 API 返回了 ended，使用它；否则根据 status_id 判断（status_id=8 表示完场，使用当前时间戳）
    // 注意：status_id=3 是中场休息，不是比赛结束，所以不设置 ended
    ended: match.ended ?? (match.status_id === 8 ? getUTC8Timestamp() : null),
    updated_at_api: match.updated_at,
    coverage_mlive: match.coverage?.mlive ?? null,
    coverage_intelligence: match.coverage?.intelligence ?? null,
    coverage_lineup: match.coverage?.lineup ?? null,
    round_stage_id: match.round?.stage_id ?? null,
    round_group_num: match.round?.group_num ?? null,
    round_round_num: match.round?.round_num ?? null,
    environment_weather: match.environment?.weather ?? null,
    environment_pressure: match.environment?.pressure || null,
    environment_temperature: match.environment?.temperature || null,
    environment_wind: match.environment?.wind || null,
    environment_humidity: match.environment?.humidity || null,
    competition_name: competitionName,
    competition_name_zh: competitionNameZh,
    competition_logo: competitionLogo,
    home_team_name: homeTeamName,
    home_team_name_zh: homeTeamNameZh,
    home_team_logo: homeTeamLogo,
    away_team_name: awayTeamName,
    away_team_name_zh: awayTeamNameZh,
    away_team_logo: awayTeamLogo,
    odds_info: oddsInfo ? (typeof oddsInfo === 'object' ? oddsInfo : JSON.parse(JSON.stringify(oddsInfo))) : null,
    // odds_requested: 如果 oddsInfo 不为 null，说明已请求过赔率信息
    // 注意：这个字段会在 upsertMatches 中根据实际请求情况更新
    raw: {
      match,
      competition,
      homeTeam,
      awayTeam,
    },
  };
};

// 批量插入比赛数据
const upsertMatches = async (
  date: string,
  matches: SportNanoAPIDiaryResponse["results"]["match"],
  competitions: SportNanoAPIDiaryResponse["results"]["competition"],
  teams: SportNanoAPIDiaryResponse["results"]["team"],
  ybtyToken?: string,
  fetchOdds: boolean = false,
): Promise<{ completedMatchIds: number[]; matchesWithOdds: number[] }> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化，无法写入数据");
  }

  // 从已有记录中获取 odds_info 和 odds_requested 状态（用于所有模式）
  const existingOddsInfoMap = new Map<number, unknown>();
  const existingOddsRequestedMap = new Map<number, boolean>();
  if (matches.length > 0) {
    const matchIds = matches.map(m => m.id);
      const { data: existingRecords } = await supabase
        .from("daily_matches")
      .select("match_id, odds_info, odds_requested")
        .eq("date", date)
      .in("match_id", matchIds);
      
      if (existingRecords) {
        for (const record of existingRecords) {
        if (record.match_id) {
          if (record.odds_info !== null && record.odds_info !== undefined) {
            existingOddsInfoMap.set(record.match_id, record.odds_info);
          }
          // 记录是否已请求过赔率信息
          existingOddsRequestedMap.set(record.match_id, record.odds_requested === true);
        }
      }
    }
  }

  // 如果需要获取赔率，先检查哪些比赛已经被预测过（有 AI 分析记录）
  const predictedMatchIds = new Set<number>();
  if (fetchOdds && matches.length > 0) {
    try {
      const matchIds = matches.map(m => m.id);
      const { data: analysisRecords } = await supabase
        .from("ai_match_analyses")
        .select("match_id")
        .in("match_id", matchIds);
      
      if (analysisRecords) {
        for (const record of analysisRecords) {
          if (record.match_id) {
            predictedMatchIds.add(record.match_id);
          }
        }
      }
    } catch (error) {
      console.warn(`[upsertMatches] 检查 AI 分析记录失败:`, error);
    }
  }

  // 如果需要获取赔率，先获取所有番茄体育比赛列表（只获取一次）
  // 优化：缓存到 app_cache，供 match-analysis 复用
  let fqtyMatchesCache: Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }> | null = null;
  if (fetchOdds && ybtyToken) {
    try {
      fqtyMatchesCache = await fetchFqtyMatches(ybtyToken);
      
      // 缓存到 app_cache，设置5分钟过期时间
      if (fqtyMatchesCache && fqtyMatchesCache.length > 0 && supabase) {
        try {
          const expiresAt = new Date(getUTC8TimestampMs() + 5 * 60 * 1000).toISOString();
          await supabase.from('app_cache').upsert({
            key: 'fqty_matches_cache',
            value: fqtyMatchesCache,
            expires_at: expiresAt,
          }, { onConflict: 'key' });
          console.log(`[upsertMatches] 已缓存番茄体育比赛列表到 app_cache，过期时间: ${expiresAt}`);
        } catch (cacheError) {
          console.warn(`[upsertMatches] 缓存比赛列表失败:`, cacheError);
        }
      }
    } catch (error) {
      console.error(`[upsertMatches] 获取番茄体育比赛列表失败:`, error);
      fqtyMatchesCache = null;
    }
  }
  
  // 限制并发数，避免 API 限流
  const BATCH_SIZE = 5;
  const getRequestDelay = () => Math.floor(Math.random() * 600) + 600; // 600-1200ms
  const getBatchDelay = () => Math.floor(Math.random() * 1000) + 1500; // 1500-2500ms
  const records: Record<string, unknown>[] = [];
  // 收集成功获取赔率的比赛ID
  const matchesWithOdds: number[] = [];
  
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);
    
    const batchRecords: Record<string, unknown>[] = [];
    for (let j = 0; j < batch.length; j++) {
      const match = batch[j];
      let oddsInfo: unknown | null = null;
      
      // 检查该比赛是否已经被预测过（有 AI 分析记录）
      const isPredicted = match.id && predictedMatchIds.has(match.id);
      // 检查是否已经请求过赔率（非 refresh 模式下，如果已请求过，不再更新 odds_info）
      const alreadyRequestedOdds = match.id && fetchOdds && existingOddsRequestedMap.get(match.id) === true;
      // 检查比赛是否已完成（已完成的不需要获取赔率）
      const isCompleted = isMatchCompleted({ ended: match.ended, status_id: match.status_id });
      
      if (fetchOdds && ybtyToken && fqtyMatchesCache && !isPredicted && !alreadyRequestedOdds && !isCompleted) {
        // 非 refresh 模式且未被预测过且未请求过赔率且未完成的比赛，获取新的赔率信息
        try {
          // 尝试通过球队名称和比赛时间匹配番茄体育的比赛ID
          const homeTeam = teams.find((t) => t.id === match.home_team_id);
          const awayTeam = teams.find((t) => t.id === match.away_team_id);
          
          if (homeTeam && awayTeam) {
            // 使用缓存的比赛列表进行匹配
            const fqtyMatchId = await findFqtyMatchIdFromCache(
              homeTeam.name,
              awayTeam.name,
              match.match_time,
              fqtyMatchesCache,
            );
            
            if (fqtyMatchId) {
              console.log(`[upsertMatches] 正在获取比赛 ${match.id} (fqty mid: ${fqtyMatchId}) 的赔率信息...`);
              oddsInfo = await fetchMatchOddsInfo(ybtyToken, fqtyMatchId, "0");
          if (oddsInfo) {
                console.log(`[upsertMatches] ✓ 成功获取比赛 ${match.id} 的赔率信息`);
                // 收集成功获取赔率的比赛ID
                if (match.id) {
                  matchesWithOdds.push(match.id);
                  console.log(`[upsertMatches] 已添加到 matchesWithOdds: ${match.id}, 当前总数: ${matchesWithOdds.length}`);
                }
              } else {
                console.warn(`[upsertMatches] ✗ 比赛 ${match.id} 的赔率信息为空`);
            }
          } else {
              console.warn(`[upsertMatches] 无法找到比赛 ${match.id} 对应的番茄体育比赛ID，跳过赔率获取`);
            }
          }
        } catch (error) {
          // 静默处理单个比赛的赔率获取失败
        }
      } else if (isPredicted) {
        // 已被预测过的比赛，使用已有的 odds_info（如果存在）
        if (match.id && existingOddsInfoMap.has(match.id)) {
          oddsInfo = existingOddsInfoMap.get(match.id)!;
        }
      } else if (alreadyRequestedOdds) {
        // 非 refresh 模式下，如果已经请求过赔率，使用已有的 odds_info（如果存在），但不更新
        if (match.id && existingOddsInfoMap.has(match.id)) {
          oddsInfo = existingOddsInfoMap.get(match.id)!;
        }
      } else if (!fetchOdds) {
        // 刷新模式下，使用已有的 odds_info（如果存在）
        if (match.id && existingOddsInfoMap.has(match.id)) {
          oddsInfo = existingOddsInfoMap.get(match.id)!;
        }
      }
      
      const record = await convertToDatabaseRecord(match, date, competitions, teams, oddsInfo);
      
      // 设置 odds_requested 字段
      // 1. 如果实际请求了赔率（无论成功与否），设置为 true
      // 2. 如果刷新模式下已有记录且已请求过，保留原有状态
      // 3. 如果刷新模式下已有记录但未请求过，保持 false
      // 4. 已完成的比赛保留已有的请求状态，不重新设置
      let oddsRequested: boolean = false;
      
      if (fetchOdds && ybtyToken && fqtyMatchesCache && !isPredicted && !isCompleted) {
        // 实际尝试请求了赔率信息（无论成功与否，只要尝试了就算请求过）
        // 注意：已完成的比赛不会进入这里，因为上面已经过滤了
        oddsRequested = true;
      } else if (match.id && existingOddsRequestedMap.has(match.id)) {
        // 保留已有的请求状态（无论是否有赔率信息）
        oddsRequested = existingOddsRequestedMap.get(match.id)!;
      } else if (isPredicted && match.id && existingOddsRequestedMap.has(match.id)) {
        // 已被预测过的比赛，保留已有的请求状态
        oddsRequested = existingOddsRequestedMap.get(match.id)!;
      } else if (oddsInfo !== null && oddsInfo !== undefined) {
        // 如果有赔率信息，说明之前请求过（可能是从数据库读取的）
        oddsRequested = true;
      }
      
      record.odds_requested = oddsRequested;
      
      // 如果比赛已被预测过，但 oddsInfo 为 null（数据库中没有 odds_info），则删除 odds_info 字段，避免覆盖
      if (isPredicted && oddsInfo === null) {
        delete record.odds_info;
      }
      
      // 在非 refresh 模式下，如果已经请求过赔率（odds_requested=true），不更新 odds_info 字段
      if (fetchOdds && alreadyRequestedOdds) {
        delete record.odds_info;
      }
      
      // 在刷新模式下，如果 oddsInfo 为 null（即没有新的赔率且没有已有的赔率），则删除 odds_info 字段，避免覆盖
      if (!fetchOdds && oddsInfo === null && !isPredicted) {
        delete record.odds_info;
      }
      
      batchRecords.push(record);
      
      // 请求之间添加随机延迟
      if (j < batch.length - 1 && fetchOdds && ybtyToken) {
        const delay = getRequestDelay();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    records.push(...batchRecords);
    
    // 批次之间添加随机延迟
    if (i + BATCH_SIZE < matches.length) {
      const delay = getBatchDelay();
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  

  // 批量插入或更新
  const { error } = await supabase
    .from("daily_matches")
    .upsert(records, { onConflict: "date,match_id" });

  if (error) {
    console.error(`[upsertMatches] 数据库写入失败:`, error);
    throw error;
  }
  

  // 识别已完成的比赛（ended 是秒级时间戳，> 0 表示已结束）
  const now = getUTC8Timestamp(); // 当前时间戳（秒，UTC+8）
  const completedMatchIds: number[] = [];

  for (const record of records) {
    const matchId = record.match_id as number;
    const ended = record.ended as number | null;
    const matchTime = record.match_time as number;
    const statusId = record.status_id as number;

    // 使用统一的比赛状态判断函数
    if (isMatchCompleted({ ended, status_id: statusId })) {
      completedMatchIds.push(matchId);
    }
  }

  if (matchesWithOdds.length > 0) {
    console.log(`[upsertMatches] 成功获取 ${matchesWithOdds.length} 场比赛的赔率信息`);
  }
  
  return { completedMatchIds, matchesWithOdds };
};


// 从 match_live_data 表同步已完结的比赛到 daily_matches 表
// 检查 match_live_data 中已完结（status = 8）但 daily_matches 未更新的比赛
const syncCompletedMatchesFromLiveDataTable = async (
  predictedMatchIdsWithOdds?: Set<number>
): Promise<number[]> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  try {
    // 1. 查询 match_live_data 表中已完结的比赛（score_status = 8）
    let liveDataQuery = supabase
      .from('match_live_data' as any)
      .select('match_id, score_status, score_home_scores, score_away_scores')
      .eq('score_status', 8); // 完场状态
    
    // 如果提供了预测比赛ID集合，只处理这些比赛
    if (predictedMatchIdsWithOdds && predictedMatchIdsWithOdds.size > 0) {
      const matchIdsArray = Array.from(predictedMatchIdsWithOdds);
      liveDataQuery = liveDataQuery.in('match_id', matchIdsArray);
    }
    
    const { data: completedLiveData, error: liveDataError } = await liveDataQuery;
    
    if (liveDataError) {
      console.error(`[syncCompletedMatchesFromLiveDataTable] 查询 match_live_data 失败:`, liveDataError);
      return [];
    }
    
    if (!completedLiveData || completedLiveData.length === 0) {
      console.log(`[syncCompletedMatchesFromLiveDataTable] match_live_data 表中没有已完结的比赛`);
      return [];
    }
    
    console.log(`[syncCompletedMatchesFromLiveDataTable] 在 match_live_data 中发现 ${completedLiveData.length} 场已完结的比赛`);
    
    // 2. 查询对应的 daily_matches 记录，检查是否已更新
    const matchIds = completedLiveData.map((item: any) => item.match_id).filter((id: any) => id != null);
    
    if (matchIds.length === 0) {
      return [];
    }
    
    const { data: dailyMatchesData, error: dailyMatchesError } = await supabase
      .from('daily_matches' as any)
      .select('match_id, date, status_id, ended, home_scores, away_scores')
      .in('match_id', matchIds);
    
    if (dailyMatchesError) {
      console.error(`[syncCompletedMatchesFromLiveDataTable] 查询 daily_matches 失败:`, dailyMatchesError);
      return [];
    }
    
    // 3. 找出需要同步的比赛（match_live_data 已完结，但 daily_matches 未更新）
    const now = getUTC8Timestamp(); // UTC+8 时间戳（秒）
    const matchesToSync: Array<{
      match_id: number;
      date: string;
      status_id: number;
      ended: number;
      home_scores: number[];
      away_scores: number[];
    }> = [];
    
    const dailyMatchesMap = new Map<number, any>();
    (dailyMatchesData || []).forEach((match: any) => {
      if (match.match_id) {
        dailyMatchesMap.set(match.match_id, match);
      }
    });
    
    for (const liveData of completedLiveData) {
      const matchId = liveData.match_id;
      if (!matchId) continue;
      
      const dailyMatch = dailyMatchesMap.get(matchId);
      if (!dailyMatch) {
        console.warn(`[syncCompletedMatchesFromLiveDataTable] 比赛 ${matchId} 在 daily_matches 中不存在，跳过同步`);
        continue;
      }
      
      // 检查 daily_matches 是否已更新为完结状态
      const isAlreadyCompleted = isMatchCompleted({
        ended: dailyMatch.ended as number | null,
        status_id: dailyMatch.status_id as number | null,
      });
      
      if (!isAlreadyCompleted) {
        // 需要同步：match_live_data 已完结，但 daily_matches 未更新
        matchesToSync.push({
          match_id: matchId,
          date: dailyMatch.date,
          status_id: 8, // 完场
          ended: now,
          home_scores: liveData.score_home_scores || [],
          away_scores: liveData.score_away_scores || [],
        });
      }
    }
    
    if (matchesToSync.length === 0) {
      return [];
    }
    
    
    // 4. 批量更新 daily_matches 表
    let successCount = 0;
    for (const update of matchesToSync) {
      const { error: updateError } = await supabase
        .from('daily_matches')
        .update({
          status_id: update.status_id,
          ended: update.ended ?? undefined, // 将 null 转换为 undefined
          home_scores: update.home_scores,
          away_scores: update.away_scores,
          updated_at: new Date().toISOString(),
        })
        .eq('date', update.date)
        .eq('match_id', update.match_id);
      
      if (updateError) {
        console.error(`[syncCompletedMatchesFromLiveDataTable] 更新比赛 ${update.match_id} 失败:`, updateError);
      } else {
        successCount++;
      }
    }
    
    if (successCount > 0) {
      console.log(`[syncCompletedMatchesFromLiveDataTable] 同步完成：成功 ${successCount}/${matchesToSync.length} 场`);
    }
    
    return matchesToSync.map(m => m.match_id);
  } catch (error) {
    console.error(`[syncCompletedMatchesFromLiveDataTable] 同步过程中发生错误:`, error);
    return [];
  }
};

// 根据实时数据更新 daily_matches 表中已结束的比赛
// 在 refresh 模式下，当检测到比赛已结束时，同步更新 daily_matches 表的 ended 和 status_id
// 只更新已被预测过且有赔率信息的比赛（与 refresh 模式的过滤逻辑一致）
const updateCompletedMatchesFromLiveData = async (
  liveDataArray: Array<{
    id: number;
    score: {
      id: number;
      status: number;
      homeScores: number[];
      awayScores: number[];
      kickoffTime: number;
      note: string;
    };
  }>,
  predictedMatchIdsWithOdds?: Set<number>
): Promise<number[]> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  // 过滤：找出已结束的比赛（status = 8 表示完场）
  // 同时检测推迟的比赛（status = 9 或 13），需要更新到数据库
  // 如果提供了 predictedMatchIdsWithOdds，只处理这些比赛
  const completedMatches: typeof liveDataArray = [];
  const postponedMatches: typeof liveDataArray = [];
  
  liveDataArray.forEach(liveData => {
    const status = liveData.score?.status;
    const matchId = liveData.id || liveData.score.id;
    
    // 检测推迟的比赛（status = 9 或 13）
    if (status === 9 || status === 13) {
      // 如果提供了预测比赛ID集合，只处理这些比赛
      if (predictedMatchIdsWithOdds && matchId && predictedMatchIdsWithOdds.has(matchId)) {
        postponedMatches.push(liveData);
      } else if (!predictedMatchIdsWithOdds) {
        postponedMatches.push(liveData);
      }
      return;
    }
    
    // 使用统一判断函数检查是否已结束
    if (!isMatchCompleted({ status_id: status })) {
      return;
    }
    
    // 如果提供了预测比赛ID集合，只处理这些比赛
    if (predictedMatchIdsWithOdds && matchId) {
      if (predictedMatchIdsWithOdds.has(matchId)) {
        completedMatches.push(liveData);
      }
    } else {
      completedMatches.push(liveData);
    }
  });
  
  // 处理推迟的比赛：更新 daily_matches 表的状态
  if (postponedMatches.length > 0) {
    const now = getUTC8Timestamp(); // UTC+8 时间戳（秒）
    
    for (const liveData of postponedMatches) {
      const matchId = liveData.id || liveData.score.id;
      if (!matchId) continue;
      
      try {
        // 查询该比赛的 date
        const { data: existingMatch, error: queryError } = await supabase
          .from("daily_matches")
          .select("date, match_id, status_id")
          .eq("match_id", matchId)
          .limit(1)
          .single();

        if (queryError || !existingMatch) {
          console.warn(`[updateCompletedMatchesFromLiveData] 未找到比赛 ${matchId} 的记录，跳过更新`);
          continue;
        }

        // 检查是否已经是推迟状态
        const currentStatusId = existingMatch.status_id as number | null;
        if (currentStatusId === 9 || currentStatusId === 13) {
          continue;
        }

        // 更新为推迟状态
        const { error: updateError } = await supabase
          .from("daily_matches")
          .update({
            status_id: liveData.score?.status || 9, // 9=推迟, 13=待定
            updated_at: new Date(getUTC8TimestampMs()).toISOString(),
          })
          .eq("date", existingMatch.date)
          .eq("match_id", matchId);

        if (updateError) {
          console.error(`[updateCompletedMatchesFromLiveData] 更新比赛 ${matchId} 为推迟状态失败:`, updateError);
        } else {
        }
      } catch (error) {
        console.error(`[updateCompletedMatchesFromLiveData] 处理推迟比赛 ${matchId} 时出错:`, error);
      }
    }
  }

  if (completedMatches.length === 0) {
    return [];
  }


  const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
  const completedMatchIds: number[] = [];
  const updates: Array<{
    match_id: number;
    status_id: number;
    ended: number;
    home_scores: number[];
    away_scores: number[];
  }> = [];

  for (const liveData of completedMatches) {
    const matchId = liveData.id || liveData.score.id;
    if (!matchId) {
      console.warn('[updateCompletedMatchesFromLiveData] 跳过无效的比赛数据（缺少 match_id）:', liveData);
      continue;
    }

    completedMatchIds.push(matchId);
    updates.push({
      match_id: matchId,
      status_id: 8, // 完场
      ended: now, // 使用当前时间戳作为结束时间
      home_scores: liveData.score.homeScores || [],
      away_scores: liveData.score.awayScores || [],
    });
  }

  if (updates.length === 0) {
    return [];
  }

  // 批量更新 daily_matches 表
  try {
    
    // 逐个更新，因为需要根据 match_id 和 date 进行匹配
    let successCount = 0;
    for (const update of updates) {
      // 查询该比赛的 date（因为 daily_matches 表有 date 和 match_id 的唯一约束）
      const { data: existingMatch, error: queryError } = await supabase
        .from("daily_matches")
        .select("date, match_id, status_id, ended")
        .eq("match_id", update.match_id)
        .limit(1)
        .single();

      if (queryError || !existingMatch) {
        console.warn(`[updateCompletedMatchesFromLiveData] 未找到比赛 ${update.match_id} 的记录，跳过更新`);
        continue;
      }

      // 检查是否已经标记为已结束（使用统一判断函数）
      const isAlreadyCompleted = isMatchCompleted({
        ended: existingMatch.ended as number | null,
        status_id: existingMatch.status_id as number | null,
      });

      if (isAlreadyCompleted) {
        console.log(`[updateCompletedMatchesFromLiveData] 比赛 ${update.match_id} 已经标记为已结束，跳过更新`);
        continue;
      }

      // 更新记录
      const { error: updateError } = await supabase
        .from("daily_matches")
        .update({
          status_id: update.status_id,
          ended: update.ended ?? undefined, // 将 null 转换为 undefined
          home_scores: update.home_scores,
          away_scores: update.away_scores,
          updated_at: new Date().toISOString(),
        })
        .eq("date", existingMatch.date)
        .eq("match_id", update.match_id);

      if (updateError) {
        console.error(`[updateCompletedMatchesFromLiveData] 更新比赛 ${update.match_id} 失败:`, updateError);
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      console.log(`[updateCompletedMatchesFromLiveData] 完成更新：成功 ${successCount}/${updates.length} 场`);
    }
    return completedMatchIds;
  } catch (error) {
    console.error(`[updateCompletedMatchesFromLiveData] 批量更新时发生错误:`, error);
    return completedMatchIds; // 仍然返回已识别的比赛ID，即使更新失败
  }
};

// 调用 settle-sim-positions Edge Function 进行 AI 自动下注结算
// 参考 test-function 的实现方式
const triggerAISettlement = async (matchIds?: number[]): Promise<void> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`[fetch-daily-matches] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，跳过 AI 结算`);
    return;
  }

  try {
    console.log(`[fetch-daily-matches] ========== 开始触发 AI 自动下注结算 ==========`);
    if (matchIds && matchIds.length > 0) {
      console.log(`[fetch-daily-matches] 比赛数量: ${matchIds.length}`);
    } else {
      console.log(`[fetch-daily-matches] 未指定比赛ID，将查询所有已结束的比赛`);
    }

    const functionName = "settle-sim-positions";
    const functionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const payload = {
      autoSettle: true,
      ...(matchIds && matchIds.length > 0 ? { matchIds } : {}),
    };

    console.log(`[fetch-daily-matches] 调用函数: ${functionName}`);
    console.log(`[fetch-daily-matches] URL: ${functionUrl}`);
    console.log(`[fetch-daily-matches] Payload: ${JSON.stringify(payload)}`);

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    let data: any;

    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.warn(`[fetch-daily-matches] 响应解析失败:`, parseError);
      try {
        const errorText = await response.text();
        data = { raw: errorText || "无法读取响应" };
      } catch {
        data = { raw: "无法读取响应" };
      }
    }

    if (!response.ok) {
      console.error(
        `[fetch-daily-matches] AI 结算请求失败: ${functionName}, 状态码: ${status}`,
        data,
      );
      const errorMsg = data?.error || data?.message || `HTTP ${status}`;
      console.error(`[fetch-daily-matches] 错误详情: ${errorMsg}`);
      return;
    }

  } catch (error) {
    console.error(`[fetch-daily-matches] 触发 AI 结算时出错:`, error);
  }
};

// 调用 settle-user-bets Edge Function 进行用户手动下注结算
// 参考 test-function 的实现方式
const triggerUserBetsSettlement = async (): Promise<void> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`[fetch-daily-matches] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，跳过用户结算`);
    return;
  }

  try {
    const functionName = "settle-user-bets";
    const functionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const payload = {};

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    let data: any;

    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.warn(`[fetch-daily-matches] 响应解析失败:`, parseError);
      try {
        const errorText = await response.text();
        data = { raw: errorText || "无法读取响应" };
      } catch {
        data = { raw: "无法读取响应" };
      }
    }

    if (!response.ok) {
      console.error(
        `[fetch-daily-matches] 用户下注结算请求失败: ${functionName}, 状态码: ${status}`,
        data,
      );
      const errorMsg = data?.error || data?.message || `HTTP ${status}`;
      console.error(`[fetch-daily-matches] 错误详情: ${errorMsg}`);
      return;
    }

    console.log(`[fetch-daily-matches] 用户手动下注结算完成`);
    console.log(`[fetch-daily-matches] 结算结果:`, JSON.stringify({
      message: data?.message,
      status,
    }, null, 2));
  } catch (error) {
    console.error(`[fetch-daily-matches] 触发用户下注结算时出错:`, error);
  }
};

// 同时触发 AI 和用户下注结算
const triggerAIAutoBetsSettlement = async (): Promise<void> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`[fetch-daily-matches] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，跳过 AI 自动下注结算`);
    return;
  }

  try {
    console.log(`[fetch-daily-matches] ========== 开始触发 AI 自动下注结算 ==========`);

    const functionName = "settle-ai-auto-bets";
    const functionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;

    console.log(`[fetch-daily-matches] 调用函数: ${functionName}`);
    console.log(`[fetch-daily-matches] URL: ${functionUrl}`);

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    const status = response.status;
    let data: any;

    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.warn(`[fetch-daily-matches] 响应解析失败:`, parseError);
      try {
        const errorText = await response.text();
        data = { raw: errorText || "无法读取响应" };
      } catch {
        data = { raw: "无法读取响应" };
      }
    }

    if (status === 200 || status === 201) {
    } else {
      console.error(`[fetch-daily-matches] AI 自动下注结算失败 (状态码: ${status}):`, data);
    }
  } catch (error) {
    console.error(`[fetch-daily-matches] 触发 AI 自动下注结算时出错:`, error);
  }
};

const triggerAllSettlements = async (matchIds?: number[]): Promise<void> => {
  await Promise.allSettled([
    triggerAISettlement(matchIds),
    triggerAIAutoBetsSettlement(),
    triggerUserBetsSettlement(),
  ]);
};

// 调用 /match/live 接口获取实时比赛数据
const fetchMatchLiveData = async (): Promise<{
  code: number;
  results: Array<{
    id: number;
    score: {
      id: number;
      status: number;
      homeScores: number[];
      awayScores: number[];
      kickoffTime: number;
      note: string;
    };
    stats?: Array<{ type: number; home: number; away: number }>;
    incidents?: Array<{
      type: number;
      position: number;
      time: number;
      second: number;
      player_id?: number;
      player_name?: string;
      home_score?: number;
      away_score?: number;
      var_reason?: number;
      var_result?: number;
      reason_type?: number;
    }>;
    tlive?: Array<{
      main: number;
      type: number;
      position: number;
      time: string;
      data: string;
    }>;
  }>;
} | null> => {
  try {
    // 构建查询参数（如果需要的话）
    const searchParams = new URLSearchParams();
    // 可以根据需要添加查询参数，比如只获取特定比赛的实时数据
    
    // 调用本地代理 API
    const url = `${PROXY_API_BASE_URL}/match/live${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    console.log(`[fetchMatchLiveData] 调用接口: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // 验证响应格式
    if (data.code !== undefined && data.code !== 0) {
      const errorMsg = data.msg || data.message || 'Unknown error';
      throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
    }

    // 转换返回数据格式（参考 sportnanoapi.ts 的实现）
    const transformedResults = (data.results || []).map((item: any) => {
      let id: number;
      let scoreData: any;
      let stats: any;
      let incidents: any;
      let tlive: any;
      
      if (Array.isArray(item)) {
        if (item.length < 2) {
          console.warn('[fetchMatchLiveData] Invalid match live data format (array):', item);
          return null;
        }
        [id, scoreData, stats, incidents, tlive] = item;
      } else if (typeof item === 'object' && item !== null) {
        id = item.id;
        scoreData = item.score;
        stats = item.stats;
        incidents = item.incidents;
        tlive = item.tlive;
      } else {
        console.warn('[fetchMatchLiveData] Invalid match live data format:', item);
                return null;
      }
      
      if (!Array.isArray(scoreData) || scoreData.length < 6) {
        console.warn('[fetchMatchLiveData] Invalid score data format:', scoreData);
        return null;
      }
      
      const [matchIdNum, status, homeScores, awayScores, kickoffTime, note] = scoreData;
      
      return {
        id: id || matchIdNum,
        score: {
          id: matchIdNum,
          status: status || 0,
          homeScores: Array.isArray(homeScores) ? homeScores : [],
          awayScores: Array.isArray(awayScores) ? awayScores : [],
          kickoffTime: kickoffTime || 0,
          note: note || '',
        },
        stats: Array.isArray(stats) && stats.length > 0 ? stats : undefined,
        incidents: Array.isArray(incidents) && incidents.length > 0 ? incidents : undefined,
        tlive: Array.isArray(tlive) && tlive.length > 0 ? tlive : undefined,
      };
    }).filter((item: any) => item !== null);

    return {
      code: data.code || 0,
      results: transformedResults,
    };
      } catch (error) {
    console.error('[fetchMatchLiveData] 获取实时比赛数据失败:', error);
    throw error;
  }
};

// 保存实时比赛数据到数据库
// 在 refresh 模式下，保存所有传入的比赛（包括已结束的，用于结算）
// 在正常模式下，只保存进行中的比赛
const saveMatchLiveData = async (
  liveDataArray: Array<{
    id: number;
    score: {
      id: number;
      status: number;
      homeScores: number[];
      awayScores: number[];
      kickoffTime: number;
      note: string;
    };
    stats?: Array<{ type: number; home: number; away: number }>;
    incidents?: Array<any>;
    tlive?: Array<any>;
  }>,
  includeAllStatuses: boolean = false // refresh 模式下为 true，保存所有状态的比赛
): Promise<number> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  let activeMatches = liveDataArray;
  
  if (!includeAllStatuses) {
    // 正常模式：只处理进行中的比赛（status 2 = 上半场, 4 = 下半场）
    // status 3 = 中场休息，也需要更新
    // status 8 = 完场，不需要更新
    const activeStatuses = [2, 3, 4]; // 进行中或中场休息
    activeMatches = liveDataArray.filter(liveData => {
      const status = liveData.score?.status;
      return status !== undefined && activeStatuses.includes(status);
    });

    if (activeMatches.length === 0) {
      return 0;
    }

  } else {
    // refresh 模式：保存所有状态的比赛（包括已结束的，用于结算）
    console.log(`[saveMatchLiveData] Refresh 模式：保存所有状态的比赛（共 ${liveDataArray.length} 场）`);
  }

  // 批量准备数据
  const rowsToUpsert: Array<{
    match_id: number;
    score_status: number;
    score_home_scores: number[];
    score_away_scores: number[];
    score_kickoff_time: number;
    score_note: string | null;
    stats: Array<{ type: number; home: number; away: number }> | null;
    incidents: Array<any> | null;
    tlive: Array<any> | null;
    raw: any;
  }> = [];

  for (const liveData of activeMatches) {
    const matchId = liveData.id || liveData.score.id;
    if (!matchId) {
      console.warn('[saveMatchLiveData] 跳过无效的比赛数据（缺少 match_id）:', liveData);
      continue;
    }

    rowsToUpsert.push({
      match_id: matchId,
      score_status: liveData.score.status,
      score_home_scores: liveData.score.homeScores,
      score_away_scores: liveData.score.awayScores,
      score_kickoff_time: liveData.score.kickoffTime,
      score_note: liveData.score.note || null,
      stats: liveData.stats || null,
      incidents: liveData.incidents || null,
      tlive: liveData.tlive || null,
      raw: liveData, // 存储完整的原始数据（Supabase 会自动转换为 JSONB）
    });
  }

  if (rowsToUpsert.length === 0) {
    return 0;
  }

  // 批量更新（使用批量 upsert 提高效率）
  try {
    const { error, count } = await supabase
      .from('match_live_data')
      .upsert(rowsToUpsert, {
        onConflict: 'match_id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error(`[saveMatchLiveData] 批量更新失败:`, error);
      // 如果批量更新失败，尝试逐个更新（降级处理）
      let fallbackCount = 0;
      for (const rowData of rowsToUpsert) {
        const { error: singleError } = await supabase
          .from('match_live_data')
          .upsert(rowData, {
            onConflict: 'match_id',
            ignoreDuplicates: false,
          });
        if (!singleError) {
          fallbackCount++;
        } else {
          console.error(`[saveMatchLiveData] 保存比赛 ${rowData.match_id} 失败:`, singleError);
        }
      }
      return fallbackCount;
    }

    const savedCount = count || rowsToUpsert.length;
    if (savedCount > 0) {
      console.log(`[saveMatchLiveData] 成功更新 ${savedCount} 场比赛的实时数据`);
    }
    return savedCount;
  } catch (error) {
    console.error(`[saveMatchLiveData] 批量更新时发生错误:`, error);
    // 降级处理：逐个更新
    let fallbackCount = 0;
    for (const rowData of rowsToUpsert) {
      try {
        const { error: singleError } = await supabase
          .from('match_live_data')
          .upsert(rowData, {
            onConflict: 'match_id',
            ignoreDuplicates: false,
          });
        if (!singleError) {
          fallbackCount++;
        }
      } catch (singleError) {
        console.error(`[saveMatchLiveData] 保存比赛 ${rowData.match_id} 失败:`, singleError);
      }
    }
    return fallbackCount;
  }
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


    const targetDate = customDate && typeof customDate === "string" && customDate.length >= 10
      ? customDate.slice(0, 10)
      : getTargetDate(resolvedTimezone);

    const isRefresh = mode === "refresh";

    console.log(`[fetch-daily-matches] 处理日期: ${targetDate}, 模式: ${isRefresh ? "refresh" : "normal"}`);

    // Refresh 模式：只更新 match_live_data 表，跳过其他所有操作
    // 只更新已被预测过且有赔率信息的比赛
    if (isRefresh) {
      try {
        console.log(`[fetch-daily-matches] Refresh 模式：开始获取实时比赛数据...`);
        
        // 先查询已被预测过且有赔率信息的比赛ID
        const predictedMatchIdsWithOdds = new Set<number>();
        if (supabase) {
          try {
            // 查询有 AI 分析记录的比赛
            const { data: analysisRecords, error: analysisError } = await supabase
              .from("ai_match_analyses")
              .select("match_id")
              .not("match_id", "is", null);
            
            if (analysisError) {
              console.warn(`[fetch-daily-matches] 查询 AI 分析记录失败:`, analysisError);
            } else if (analysisRecords && analysisRecords.length > 0) {
              // 提取并去重 match_id
              const analysisMatchIds = Array.from(new Set(
                analysisRecords
                  .map(r => r.match_id)
                  .filter((id): id is number => id !== null && typeof id === 'number')
              ));
              
              
              // 查询这些比赛中有赔率信息的
              if (analysisMatchIds.length > 0) {
                const { data: matchesWithOdds, error: oddsError } = await supabase
                  .from("daily_matches")
                  .select("match_id")
                  .in("match_id", analysisMatchIds)
                  .not("odds_info", "is", null);
                
                if (oddsError) {
                  console.warn(`[fetch-daily-matches] 查询赔率信息失败:`, oddsError);
                } else if (matchesWithOdds) {
                  // 去重：使用 Set 确保 match_id 唯一
                  const uniqueMatchIds = new Set<number>();
                  for (const record of matchesWithOdds) {
                    if (record.match_id) {
                      uniqueMatchIds.add(record.match_id);
                    }
                  }
                  // 将去重后的 match_id 添加到 predictedMatchIdsWithOdds
                  for (const matchId of uniqueMatchIds) {
                    predictedMatchIdsWithOdds.add(matchId);
                  }
                  console.log(`[fetch-daily-matches] 发现 ${predictedMatchIdsWithOdds.size} 场比赛已被预测且有赔率信息，将只更新这些比赛的实时数据`);
                }
              }
            }
          } catch (queryError) {
            console.error(`[fetch-daily-matches] 查询预测比赛失败:`, queryError);
          }
        }
        
        const liveData = await fetchMatchLiveData();
        let liveDataCount = 0;
        
        if (liveData && liveData.results && liveData.results.length > 0) {
          
          // 过滤：只保留已被预测过且有赔率信息的比赛
          let filteredLiveData = liveData.results;
          if (predictedMatchIdsWithOdds.size > 0) {
            // 调试：打印 predictedMatchIdsWithOdds 中的 match_id
            console.log(`[fetch-daily-matches] 已预测且有赔率的比赛ID列表:`, Array.from(predictedMatchIdsWithOdds).join(', '));
            
            filteredLiveData = liveData.results.filter(liveMatch => {
              // 确保 matchId 是 number 类型，以便与 Set 中的 number 类型匹配
              const matchId = liveMatch.id || liveMatch.score?.id;
              const matchIdNum = typeof matchId === 'number' ? matchId : (typeof matchId === 'string' ? parseInt(matchId, 10) : null);
              
              if (!matchIdNum || isNaN(matchIdNum)) {
                return false;
              }
              
              return predictedMatchIdsWithOdds.has(matchIdNum);
            });
          } else {
            filteredLiveData = [];
          }
          
          if (filteredLiveData.length > 0) {
            // refresh 模式下，保存所有状态的比赛（包括已结束的，用于结算）
            liveDataCount = await saveMatchLiveData(filteredLiveData, true);
          }

          // 检查并更新已结束的比赛到 daily_matches 表
          // 只检查已被预测过且有赔率信息的比赛（与 refresh 模式的过滤逻辑一致）
          if (liveData && liveData.results && liveData.results.length > 0) {
            const completedMatchIds = await updateCompletedMatchesFromLiveData(
              liveData.results,
              predictedMatchIdsWithOdds.size > 0 ? predictedMatchIdsWithOdds : undefined
            );
            
            if (completedMatchIds.length > 0) {
              // 异步触发结算，不阻塞主流程
              await triggerAllSettlements(completedMatchIds).catch(error => {
                console.error(`[fetch-daily-matches] 触发结算失败:`, error);
              });
            }
          }
          
          // 额外检查：从 match_live_data 表中查找已完结但 daily_matches 未更新的比赛
          // 确保数据同步的完整性（即使实时API没有返回，也能从数据库同步）
          const syncedMatchIds = await syncCompletedMatchesFromLiveDataTable(
            predictedMatchIdsWithOdds.size > 0 ? predictedMatchIdsWithOdds : undefined
          );
          
          if (syncedMatchIds.length > 0) {
            // 异步触发结算，不阻塞主流程
            await triggerAllSettlements(syncedMatchIds).catch(error => {
              console.error(`[fetch-daily-matches] 触发结算失败:`, error);
            });
          }
        }

      return new Response(
        JSON.stringify({
          success: true,
            mode: "refresh",
          date: targetDate,
            liveDataCount: liveDataCount,
            message: "仅更新了已被预测且有赔率信息的比赛的 match_live_data 表",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
      } catch (error) {
        console.error(`[fetch-daily-matches] Refresh 模式获取实时比赛数据失败:`, error);
        const message = error instanceof Error ? error.message : "未知错误";
        return new Response(
          JSON.stringify({
            success: false,
            mode: "refresh",
            error: message,
            date: targetDate,
          }),
          {
            status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
      }
    }

    // 正常模式：执行完整的 daily_matches 数据获取和存储流程
    // 检查API密钥配置
    if (!SPORTNANOAPI_USER || !SPORTNANOAPI_SECRET) {
        return new Response(
          JSON.stringify({
            success: false,
          error: "SPORTNANOAPI_USER 或 SPORTNANOAPI_SECRET 未配置，请在 Supabase 项目设置中配置环境变量",
            date: targetDate,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

    // 获取联赛常量（用于过滤）
      const leagueConstants = await getLeagueConstants();
    // 调用纳米数据API获取比赛数据
    const apiResponse = await fetchSportNanoAPIDiary(targetDate);
    
    // 确保 results 存在
    if (!apiResponse.results) {
      throw new Error("纳米数据API返回数据格式错误: results 字段不存在");
    }
    
    const matches = apiResponse.results.match || [];
    const competitions = apiResponse.results.competition || [];
    const teams = apiResponse.results.team || [];
    
    console.log(`[fetch-daily-matches] API返回: 比赛 ${matches.length} 场, 联赛 ${competitions.length} 个, 球队 ${teams.length} 个`);

    // 过滤匹配联赛的比赛
    const filteredMatches = filterMatchesByLeague(
      matches,
      competitions,
          leagueConstants,
        );

    // 优化：过滤掉推迟的比赛（非 refresh 模式）
    // 处理未开始（status_id = 1）、进行中（status_id = 2, 3, 4）和已完成的比赛（status_id = 8）
    // 已完成的比赛也需要更新状态和比分，确保数据同步
    // status_id: 1=未开赛, 2=上半场, 3=中场, 4=下半场, 8=完场, 9=推迟, 11=腰斩, 13=待定
    const activeStatusIds = [1, 2, 3, 4, 8]; // 未开始、进行中或已完成
    const postponedStatusIds = [9, 13]; // 推迟和待定
    const activeMatches = filteredMatches.filter(match => {
      const statusId = match.status_id;
      // 排除推迟的比赛
      if (statusId !== undefined && postponedStatusIds.includes(statusId)) {
        return false;
      }
      return statusId !== undefined && activeStatusIds.includes(statusId);
    });
    
    if (activeMatches.length < filteredMatches.length) {
      const excludedCount = filteredMatches.length - activeMatches.length;
      console.log(`[fetch-daily-matches] 过滤掉 ${excludedCount} 场推迟或待定的比赛`);
    }

    // 使用过滤后的比赛（包括已完成的，用于更新状态）
    const matchesToProcess = activeMatches.length > 0 ? activeMatches : filteredMatches;
    
    if (matchesToProcess.length === 0) {
      console.log(`[fetch-daily-matches] 没有需要处理的比赛（已过滤已完成的比赛）`);
        return new Response(
          JSON.stringify({
            success: true,
          mode: "normal",
            date: targetDate,
          total: matches.length,
          matchedLeagues: filteredMatches.length,
          activeMatches: activeMatches.length,
          saved: 0,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

    // 获取番茄体育API的token（用于获取赔率）
    let ybtyToken: string | undefined;
    try {
      const tokens = await getTokensFromCache();
      ybtyToken = tokens?.ybty_token;
      if (ybtyToken) {
        console.log(`[fetch-daily-matches] 成功获取番茄体育API token`);
      } else {
        console.warn(`[fetch-daily-matches] 无法获取番茄体育API token，将跳过赔率获取`);
      }
    } catch (error) {
      console.warn(`[fetch-daily-matches] 获取番茄体育API token失败:`, error);
    }

    // 存储到数据库（同时获取赔率信息）
    // 使用过滤后的比赛（包括已完成的，用于更新状态和比分）
    const { completedMatchIds, matchesWithOdds } = await upsertMatches(
      targetDate,
      matchesToProcess,
      competitions,
      teams,
      ybtyToken,
      true, // 正常模式获取赔率
    );


    // 如果有已完成的比赛，触发自动结算
        if (completedMatchIds.length > 0) {
          await triggerAllSettlements(completedMatchIds);
        } else {
      console.log(`[fetch-daily-matches] 没有已完成的比赛，跳过结算触发`);
      }
      
      // 额外检查：从 match_live_data 表中查找已完结但 daily_matches 未更新的比赛
      // 确保数据同步的完整性（即使正常模式没有检测到，也能从数据库同步）
      console.log(`[fetch-daily-matches] 检查 match_live_data 表中已完结但 daily_matches 未更新的比赛...`);
      const syncedMatchIds = await syncCompletedMatchesFromLiveDataTable();
      
      if (syncedMatchIds.length > 0) {
        console.log(`[fetch-daily-matches] 从 match_live_data 同步了 ${syncedMatchIds.length} 场已完结的比赛到 daily_matches，准备触发结算`);
        // 异步触发结算，不阻塞主流程
        await triggerAllSettlements(syncedMatchIds).catch(error => {
          console.error(`[fetch-daily-matches] 触发结算失败:`, error);
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "normal",
          date: targetDate,
        total: matches.length,
        matchedLeagues: filteredMatches.length,
        activeMatches: matchesToProcess.length,
        saved: matchesToProcess.length,
        completedMatches: completedMatchIds.length,
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

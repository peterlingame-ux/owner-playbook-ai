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
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
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
        console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 重试 ${attempt}/${retries}，等待 ${delay}ms 后重试...`);
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
            console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 请求成功但 data 为 null，将重试一次...`);
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
          console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据是gzip压缩的，正在解压...`);
          result.data = await decompressGzipData(data);
          console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据解压完成`);
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
  // 1. 时间匹配：允许±2小时的误差（因为时区或数据更新延迟）
  const timeTolerance = 2 * 60 * 60; // 2小时（秒）
  const matchTimeMs = matchTime * 1000; // 转换为毫秒（番茄体育API使用毫秒时间戳）
  
  // 2. 球队名称匹配：使用模糊匹配（包含关系）
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
    
    // 时间匹配
    const fqtyMatchTime = typeof fqtyMatch.mgt === "string" ? parseInt(fqtyMatch.mgt) : (fqtyMatch.mgt || 0);
    const timeDiff = Math.abs(fqtyMatchTime - matchTimeMs);
    
    if (timeDiff > timeTolerance * 1000) {
      continue; // 时间差异太大，跳过
    }
    
    // 球队名称匹配
    const normalizedFqtyHome = normalizeTeamName(fqtyMatch.mhn);
    const normalizedFqtyAway = normalizeTeamName(fqtyMatch.man);
    
    // 检查主队和客队是否匹配（允许部分匹配）
    const homeMatch = normalizedFqtyHome.includes(normalizedHomeTeam) || 
                     normalizedHomeTeam.includes(normalizedFqtyHome);
    const awayMatch = normalizedFqtyAway.includes(normalizedAwayTeam) || 
                     normalizedAwayTeam.includes(normalizedFqtyAway);
    
    if (homeMatch && awayMatch) {
      console.log(`[findFqtyMatchIdFromCache] 找到匹配: 纳米数据 ${homeTeamName} vs ${awayTeamName} (${matchTime}) -> 番茄体育 mid=${fqtyMatch.mid}`);
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

  console.log(`[fetchSportNanoAPIDiary] 通过代理API请求: ${url}?date=${dateParam}`);

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

  // 记录响应结构以便调试
  console.log(`[fetchSportNanoAPIDiary] API响应结构:`, {
    hasCode: 'code' in data,
    code: data.code,
    hasQuery: 'query' in data,
    hasResults: 'results' in data,
    hasData: 'data' in data,
    keys: Object.keys(data),
  });

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

  console.log(`[fetchSportNanoAPIDiary] 解析成功: match=${responseData.results.match.length}, competition=${responseData.results.competition.length}, team=${responseData.results.team.length}`);

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
        if (competitionName === chineseName || competitionName === englishName) {
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
    ended: match.ended ?? (match.status_id === 8 ? Math.floor(Date.now() / 1000) : null),
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
): Promise<{ completedMatchIds: number[] }> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化，无法写入数据");
  }

  // 如果需要获取赔率信息，先尝试从已有记录中获取（刷新模式）
  const existingOddsInfoMap = new Map<number, unknown>();
  if (!fetchOdds && matches.length > 0) {
    const matchIds = matches.map(m => m.id);
      const { data: existingRecords } = await supabase
        .from("daily_matches")
      .select("match_id, odds_info")
        .eq("date", date)
      .in("match_id", matchIds);
      
      if (existingRecords) {
        for (const record of existingRecords) {
        if (record.match_id && record.odds_info !== null && record.odds_info !== undefined) {
          existingOddsInfoMap.set(record.match_id, record.odds_info);
        }
      }
      console.log(`[upsertMatches] 从数据库读取到 ${existingOddsInfoMap.size} 条已有赔率信息，将在刷新模式下保留`);
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
      console.log(`[upsertMatches] 发现 ${predictedMatchIds.size} 场比赛已有 AI 分析记录，将保留其 odds_info`);
    } catch (error) {
      console.warn(`[upsertMatches] 检查 AI 分析记录失败:`, error);
    }
  }

  // 如果需要获取赔率，先获取所有番茄体育比赛列表（只获取一次）
  let fqtyMatchesCache: Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }> | null = null;
  if (fetchOdds && ybtyToken) {
    try {
      console.log(`[upsertMatches] 开始获取番茄体育比赛列表（用于匹配）...`);
      fqtyMatchesCache = await fetchFqtyMatches(ybtyToken);
      console.log(`[upsertMatches] 获取到 ${fqtyMatchesCache.length} 场番茄体育比赛`);
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
  
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);
    console.log(`[upsertMatches] 处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(matches.length / BATCH_SIZE)} (${batch.length} 场比赛)`);
    
    const batchRecords: Record<string, unknown>[] = [];
    for (let j = 0; j < batch.length; j++) {
      const match = batch[j];
      let oddsInfo: unknown | null = null;
      
      // 检查该比赛是否已经被预测过（有 AI 分析记录）
      const isPredicted = match.id && predictedMatchIds.has(match.id);
      
      if (fetchOdds && ybtyToken && fqtyMatchesCache && !isPredicted) {
        // 非 refresh 模式且未被预测过的比赛，获取新的赔率信息
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
              } else {
                console.warn(`[upsertMatches] ✗ 比赛 ${match.id} 的赔率信息为空`);
            }
          } else {
              console.warn(`[upsertMatches] 无法找到比赛 ${match.id} 对应的番茄体育比赛ID，跳过赔率获取`);
            }
          }
        } catch (error) {
          console.error(`[upsertMatches] ✗ 获取比赛 ${match.id} 的赔率信息失败:`, error);
        }
      } else if (isPredicted) {
        // 已被预测过的比赛，使用已有的 odds_info（如果存在）
        if (match.id && existingOddsInfoMap.has(match.id)) {
          oddsInfo = existingOddsInfoMap.get(match.id)!;
          console.log(`[upsertMatches] 比赛 ${match.id} 已有 AI 分析记录，保留现有 odds_info`);
      } else {
          console.log(`[upsertMatches] 比赛 ${match.id} 已有 AI 分析记录，但数据库中没有 odds_info，跳过更新`);
        }
          } else {
          // 刷新模式下，使用已有的 odds_info（如果存在）
        if (match.id && existingOddsInfoMap.has(match.id)) {
          oddsInfo = existingOddsInfoMap.get(match.id)!;
        }
      }
      
      const record = await convertToDatabaseRecord(match, date, competitions, teams, oddsInfo);
      
      // 如果比赛已被预测过，但 oddsInfo 为 null（数据库中没有 odds_info），则删除 odds_info 字段，避免覆盖
      if (isPredicted && oddsInfo === null) {
        delete record.odds_info;
        console.log(`[upsertMatches] 比赛 ${match.id} 已有 AI 分析记录，但无 odds_info，跳过更新 odds_info 字段`);
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
  
  console.log(`[upsertMatches] 准备写入 ${records.length} 条记录到数据库`);

  // 批量插入或更新
  const { error } = await supabase
    .from("daily_matches")
    .upsert(records, { onConflict: "date,match_id" });

  if (error) {
    console.error(`[upsertMatches] 数据库写入失败:`, error);
    throw error;
  }
  
  console.log(`[upsertMatches] 成功写入 ${records.length} 条记录到数据库`);

  // 识别已完成的比赛（ended 是秒级时间戳，> 0 表示已结束）
  const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
  const completedMatchIds: number[] = [];

  for (const record of records) {
    const matchId = record.match_id as number;
    const ended = record.ended as number | null;
    const matchTime = record.match_time as number;
    const statusId = record.status_id as number;

    // 判断比赛是否已结束：
    // 1. ended 有值且 > 0 表示已结束（ended 是秒级时间戳）
    // 2. status_id = 3 表示已结束（中场休息，但比赛未完全结束，不算完成）
    // 3. status_id = 8 表示完场
    // 注意：status_id = 3 是中场休息，不是比赛结束，所以不在这里判断
    if ((ended !== null && ended !== undefined && ended > 0) || statusId === 8) {
          completedMatchIds.push(matchId);
    }
  }

  console.log(`[upsertMatches] 识别到 ${completedMatchIds.length} 场已完成比赛`);
  
  return { completedMatchIds };
};

// 调用 settle-sim-positions Edge Function 进行 AI 自动下注结算
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

    const settleUrl = `${SUPABASE_URL}/functions/v1/settle-sim-positions`;
    const response = await fetch(settleUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        autoSettle: true,
        ...(matchIds && matchIds.length > 0 ? { matchIds } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "无法读取错误信息");
      console.error(`[fetch-daily-matches] AI 结算请求失败: HTTP ${response.status}`);
      console.error(`[fetch-daily-matches] 错误详情:`, errorText.substring(0, 500));
      return;
    }

    const result = await response.json();
    console.log(`[fetch-daily-matches] AI 自动下注结算完成`);
    console.log(`[fetch-daily-matches] 结算结果:`, JSON.stringify({
      message: result?.message,
      settlements_count: result?.settlements?.length || 0,
    }, null, 2));
  } catch (error) {
    console.error(`[fetch-daily-matches] 触发 AI 结算时出错:`, error);
  }
};

// 调用 settle-user-bets Edge Function 进行用户手动下注结算
const triggerUserBetsSettlement = async (): Promise<void> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`[fetch-daily-matches] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，跳过用户结算`);
    return;
  }

  try {
    console.log(`[fetch-daily-matches] ========== 开始触发用户手动下注结算 ==========`);

    const settleUrl = `${SUPABASE_URL}/functions/v1/settle-user-bets`;
    const response = await fetch(settleUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "无法读取错误信息");
      console.error(`[fetch-daily-matches] 用户下注结算请求失败: HTTP ${response.status}`);
      return;
    }

    const result = await response.json();
    console.log(`[fetch-daily-matches] 用户手动下注结算完成`);
      } catch (error) {
    console.error(`[fetch-daily-matches] 触发用户下注结算时出错:`, error);
  }
};

// 同时触发 AI 和用户下注结算
const triggerAllSettlements = async (matchIds?: number[]): Promise<void> => {
  await Promise.allSettled([
    triggerAISettlement(matchIds),
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
  }>
): Promise<number> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  let savedCount = 0;

  for (const liveData of liveDataArray) {
    try {
      const matchId = liveData.id || liveData.score.id;
      if (!matchId) {
        console.warn('[saveMatchLiveData] 跳过无效的比赛数据（缺少 match_id）:', liveData);
      continue;
    }

      // 准备插入/更新的数据
      // JSONB 字段可以直接接受对象，Supabase 会自动转换为 JSONB
      const rowData = {
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
      };

      // 使用 upsert 操作（如果 match_id 已存在则更新，否则插入）
      const { error } = await supabase
        .from('match_live_data')
        .upsert(rowData, {
          onConflict: 'match_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`[saveMatchLiveData] 保存比赛 ${matchId} 的实时数据失败:`, error);
      } else {
        savedCount++;
      }
    } catch (error) {
      console.error(`[saveMatchLiveData] 处理实时比赛数据时出错:`, error);
    }
  }

  return savedCount;
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

    console.log(`[fetch-daily-matches] 使用时区: ${resolvedTimezone}`);

    const targetDate = customDate && typeof customDate === "string" && customDate.length >= 10
      ? customDate.slice(0, 10)
      : getTargetDate(resolvedTimezone);

    const isRefresh = mode === "refresh";

    console.log(`[fetch-daily-matches] 处理日期: ${targetDate}, 模式: ${isRefresh ? "refresh" : "normal"}`);

    // Refresh 模式：只更新 match_live_data 表，跳过其他所有操作
    if (isRefresh) {
      try {
        console.log(`[fetch-daily-matches] Refresh 模式：开始获取实时比赛数据...`);
        const liveData = await fetchMatchLiveData();
        let liveDataCount = 0;
        
        if (liveData && liveData.results && liveData.results.length > 0) {
          console.log(`[fetch-daily-matches] 获取到 ${liveData.results.length} 场实时比赛数据`);
          liveDataCount = await saveMatchLiveData(liveData.results);
          console.log(`[fetch-daily-matches] 成功保存 ${liveDataCount} 场实时比赛数据`);
      } else {
          console.log(`[fetch-daily-matches] 未获取到实时比赛数据`);
      }

      return new Response(
        JSON.stringify({
          success: true,
            mode: "refresh",
          date: targetDate,
            liveDataCount: liveDataCount,
            message: "仅更新了 match_live_data 表",
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
      console.log(`[fetch-daily-matches] 加载了 ${leagueConstants.size} 个联赛常量`);

    // 调用纳米数据API获取比赛数据
    console.log(`[fetch-daily-matches] 开始调用纳米数据API获取比赛数据...`);
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
    console.log(`[fetch-daily-matches] 匹配联赛后剩余 ${filteredMatches.length} 场比赛`);

    if (filteredMatches.length === 0) {
      console.log(`[fetch-daily-matches] 没有匹配的比赛需要存储`);
        return new Response(
          JSON.stringify({
            success: true,
          mode: "normal",
            date: targetDate,
          total: matches.length,
          matchedLeagues: 0,
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
    const { completedMatchIds } = await upsertMatches(
      targetDate,
      filteredMatches,
      competitions,
      teams,
      ybtyToken,
      true, // 正常模式获取赔率
    );

    // 如果有已完成的比赛，触发自动结算
        if (completedMatchIds.length > 0) {
      console.log(`[fetch-daily-matches] 发现 ${completedMatchIds.length} 场已完成的比赛，准备触发自动结算`);
          await triggerAllSettlements(completedMatchIds);
        } else {
      console.log(`[fetch-daily-matches] 没有已完成的比赛，跳过结算触发`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "normal",
          date: targetDate,
        total: matches.length,
        matchedLeagues: filteredMatches.length,
        saved: filteredMatches.length,
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

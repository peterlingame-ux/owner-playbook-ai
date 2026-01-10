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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[fetch-daily-matches] SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置，数据库写入将失败。",
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const DEFAULT_TIMEZONE = "Asia/Shanghai";

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

// 获取昨天的日期（使用指定时区）
const getYesterdayDate = (timezone = DEFAULT_TIMEZONE) => {
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

// 从时间戳获取指定时区的日期字符串
const getDateFromTimestamp = (
  timestamp: number,
  timezone: string = DEFAULT_TIMEZONE,
): string => {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter
    .formatToParts(date)
    .map((part) => part.value)
    .join("")
    .replace(/[^0-9]/g, "")
    .replace(
      /^(\d{4})(\d{2})(\d{2})$/,
      "$1-$2-$3",
    );
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

// 获取比赛详细赔率信息（带重试机制）
const fetchMatchOddsInfo = async (
  ybtyToken: string,
  mid: string,
  mcid: string = "0",
  cuid: string = "529524126471950857",
  retries: number = 2,
): Promise<unknown | null> => {
  const url = `https://api.j7nwyhqg.com/yewu11/v1/m/matchDetail/getMatchOddsInfoPB?mcid=${mcid}&mid=${mid}&cuid=${cuid}`;
  
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
        // 重试前等待，延迟时间递增并添加随机性：1-1.5秒、2-2.5秒
        const baseDelay = attempt * 1000;
        const randomDelay = Math.floor(Math.random() * 500); // 0-500ms 随机
        const delay = baseDelay + randomDelay;
        console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 重试 ${attempt}/${retries}，等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`[fetchMatchOddsInfo] 请求URL: ${url}${attempt > 0 ? ` (重试 ${attempt})` : ''}`);
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '无法读取错误信息');
        console.warn(`[fetchMatchOddsInfo] 获取比赛 ${mid} 的赔率信息失败: HTTP ${response.status}, ${errorText.substring(0, 200)}`);
        // 如果是最后一次尝试，返回 null
        if (attempt >= retries) {
          return null;
        }
        continue; // 继续重试
      }

      const result = await response.json();
      
      // 检查错误码
      if (result && typeof result === "object" && "code" in result) {
        const code = result.code;
        // 检查是否是限流错误 "0401038"
        if (code === "0401038") {
          console.warn(`[fetchMatchOddsInfo] 比赛 ${mid} 遇到限流错误 (code: ${code})，${attempt < retries ? '将重试' : '已达到最大重试次数'}`);
          // 如果是最后一次尝试，返回 null
          if (attempt >= retries) {
            return null;
          }
          // 限流错误需要更长的等待时间（带随机性：2-3秒、4-5秒递增）
          const baseDelay = (attempt + 1) * 2000;
          const randomDelay = Math.floor(Math.random() * 1000); // 0-1000ms 随机
          const delay = baseDelay + randomDelay;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // 继续重试
        }
        
        // 如果 code 是 "0000000"（成功）
        if (code === "0000000") {
          // 如果 data 为 null，可能是请求过快导致，尝试重试一次
          if ((result.data === null || result.data === undefined) && attempt < retries) {
            console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 请求成功但 data 为 null，可能是请求过快，将重试一次...`);
            // 等待一段时间后重试（随机延迟 800-1500ms）
            const retryDelay = Math.floor(Math.random() * 700) + 800;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue; // 继续重试
          } else if (result.data === null || result.data === undefined) {
            console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 请求成功但 data 为 null（重试后仍为 null，可能是比赛确实没有赔率数据）`);
          }
          // 继续执行，返回结果（无论 data 是否为 null）
        } else {
          // 其他错误码，记录日志但不重试（除非是明确的临时错误）
          console.warn(`[fetchMatchOddsInfo] 比赛 ${mid} 返回错误码: ${code}, msg: ${(result as { msg?: string }).msg || '未知错误'}`);
        }
      }

      console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 的API响应类型: ${typeof result}, 包含字段: ${result ? Object.keys(result).join(', ') : 'null'}`);

      // 如果 data 是 base64 编码的 gzip 压缩字符串，解压缩它
      if (result && typeof result === "object" && "data" in result) {
        const data = result.data;
        if (typeof data === "string" && data.startsWith("H4sI")) {
          console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据是gzip压缩的，正在解压...`);
          result.data = await decompressGzipData(data);
          console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据解压完成`);
        } else if (Array.isArray(data)) {
          console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据是数组，包含 ${data.length} 个元素`);
        } else if (typeof data === "object" && data !== null) {
          console.log(`[fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据是对象，包含字段: ${Object.keys(data).join(', ')}`);
        }
      } else {
        console.warn(`[fetchMatchOddsInfo] 比赛 ${mid} 的响应格式异常，缺少 data 字段`);
      }

      return result;
    } catch (error) {
      console.error(`[fetchMatchOddsInfo] 获取比赛 ${mid} 的赔率信息出错:`, error);
      if (error instanceof Error) {
        console.error(`[fetchMatchOddsInfo] 错误详情: ${error.message}, 堆栈: ${error.stack}`);
      }
      // 如果是最后一次尝试，返回 null
      if (attempt >= retries) {
        return null;
      }
      // 继续重试
    }
  }

  return null;
};

// 调用 YBTY API 获取比赛列表
const fetchYBTYMatches = async (ybtyToken: string): Promise<SportsApiMatch[]> => {
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
      throw new Error(`YBTY API 请求失败: ${response.status}`);
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
    // 检查多种可能的数据结构
    let matches: SportsApiMatch[] = [];
    
    if (result && result.data) {
      // 如果 data 是对象且包含 matches 数组
      if (typeof result.data === "object" && "matches" in result.data && Array.isArray(result.data.matches)) {
        matches = result.data.matches as SportsApiMatch[];
      }
      // 如果 data 本身就是数组（解压后可能直接是数组）
      else if (Array.isArray(result.data)) {
        matches = result.data as SportsApiMatch[];
      }
    }
    // 如果 result 直接包含 matches 数组
    else if (result && "matches" in result && Array.isArray(result.matches)) {
      matches = result.matches as SportsApiMatch[];
    }

    console.log(`[fetchYBTYMatches] 提取到 ${matches.length} 场比赛`);
    if (matches.length > 0) {
      console.log(`[fetchYBTYMatches] 第一场比赛示例: mid=${matches[0].mid}, tn=${matches[0].tn || matches[0].tnjc}, mgt=${matches[0].mgt}`);
    }

    return matches;
  } catch (error) {
    console.error("[fetch-daily-matches] 获取 YBTY 比赛列表失败:", error);
    throw error;
  }
};

// 获取联赛常量映射表
const getLeagueConstants = async (): Promise<Map<string, string>> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  const { data, error } = await supabase
    .from("league_constants")
    .select("chinese_name, english_name");

  if (error || !data) {
    console.warn("[fetch-daily-matches] 无法获取联赛常量:", error?.message);
    return new Map();
  }

  // 创建中文名到英文名的映射
  const leagueMap = new Map<string, string>();
  for (const row of data) {
    leagueMap.set(row.chinese_name, row.english_name);
  }

  return leagueMap;
};

// 过滤匹配联赛的比赛
const filterMatchesByLeague = (
  matches: SportsApiMatch[],
  leagueConstants: Map<string, string>,
): SportsApiMatch[] => {
  const filtered: SportsApiMatch[] = [];

  for (const match of matches) {
    // 获取联赛名称（优先使用 tn，如果没有则使用 tnjc）
    const leagueName = match.tn || match.tnjc || "";

    if (!leagueName) {
      continue;
    }

    // 检查联赛名称是否在 league_constants 中（完全匹配）
    if (leagueConstants.has(leagueName)) {
      filtered.push(match);
    }
  }

  return filtered;
};

// 过滤今天的比赛
const filterTodayMatches = (
  matches: SportsApiMatch[],
  targetDate: string,
): SportsApiMatch[] => {
  const filtered: SportsApiMatch[] = [];
  
  // 将目标日期转换为 UTC+8 时区的开始和结束时间戳（毫秒）
  // targetDate 格式: "2025-12-15"
  const targetDateObj = new Date(targetDate + "T00:00:00+08:00"); // UTC+8 时区的开始时间
  const targetDateStart = targetDateObj.getTime();
  const targetDateEnd = targetDateStart + 24 * 60 * 60 * 1000 - 1; // 当天的结束时间戳

  console.log(`[filterTodayMatches] 目标日期: ${targetDate}, 时间范围: ${targetDateStart} - ${targetDateEnd}`);

  for (const match of matches) {
    if (!match.mgt) {
      continue;
    }

    // 转换 mgt (毫秒时间戳) 为数字
    const matchTimestamp = typeof match.mgt === "string"
      ? parseInt(match.mgt)
      : match.mgt;
    
    if (isNaN(matchTimestamp) || matchTimestamp <= 0) {
      continue;
    }

    // 检查比赛时间是否在目标日期的时间范围内
    if (matchTimestamp >= targetDateStart && matchTimestamp < targetDateEnd) {
      filtered.push(match);
    }
  }

  console.log(`[filterTodayMatches] 从 ${matches.length} 场比赛中过滤出 ${filtered.length} 场今天的比赛`);
  if (filtered.length > 0 && filtered.length <= 5) {
    console.log(`[filterTodayMatches] 今天的比赛示例: ${filtered.map(m => `mid=${m.mid}, mgt=${m.mgt}, tn=${m.tn || m.tnjc}`).join('; ')}`);
  }

  return filtered;
};

// 番茄体育 API 数据格式类型
type SportsApiMatch = {
  mid: string;
  mcid?: string;
  tnjc?: string;
  tid?: string;
  tn?: string;
  tlev?: number;
  lurl?: string;
  lvs?: number;
  mhid?: string;
  maid?: string;
  mhn?: string;
  man?: string;
  mhlu?: string[];
  malu?: string[];
  mhlut?: string;
  malut?: string;
  frmhn?: string[];
  frman?: string[];
  mgt?: string | number;
  met?: string | number;
  mlet?: string;
  mle?: number;
  mhs?: number;
  mas?: number;
  msc?: string[];
  gcs?: number;
  mng?: number;
  mmp?: string;
  mc?: number;
  mcg?: number;
  mct?: number;
  mp?: number;
  mo?: number;
  mf?: boolean;
  mft?: number;
  mvs?: number;
  mms?: number;
  pmms?: number;
  mbmty?: number;
  mprmc?: string;
  mrmc?: string;
  mat?: string;
  compose?: boolean;
  hipo?: boolean;
  tf?: boolean;
  th?: number;
  mearlys?: number;
  vf?: string;
  csid?: string;
  csna?: string;
  cds?: string;
  ctt?: number;
  atf?: string;
  st?: string;
  tc?: string;
  seid?: string;
  sort?: number;
  regionIdSort?: number;
  operationTournamentSort?: number;
  cosBold?: boolean;
  cosTBold?: boolean;
  cosCorner?: boolean;
  cosTCorner?: boolean;
  cosPunish?: boolean;
  cosTPunish?: boolean;
  cosOvertime?: boolean;
  cosPenalty?: boolean;
  cosOutright?: boolean;
  cosPromotion?: boolean;
  cos15Minutes?: boolean;
  hps?: unknown[];
  hpsBold?: unknown[];
  hpsCorner?: unknown[];
  hpsPunish?: unknown[];
  hpsOvertime?: unknown[];
  hpsPenalty?: unknown[];
  hpsPromotion?: unknown[];
  hpsOutright?: unknown[];
  betAmount?: string;
  tt?: string;
  mst?: string;
  msts?: string;
  mstst?: string;
  mststr?: string;
  mststi?: string;
  mststs?: number;
  ms?: number;
  mess?: number;
  cmec?: string;
  srid?: string;
};

// 将番茄体育 API 数据转换为数据库记录
const convertSportsApiMatchToRecord = (
  match: SportsApiMatch,
  date: string,
  oddsInfo?: unknown,
): Record<string, unknown> => {
  return {
    date,
    mid: match.mid || null,
    mcid: match.mcid || null,
    srid: match.srid || null,
    mst: match.mst || null,
    msts: match.msts || null,
    mstst: match.mstst || null,
    mststr: match.mststr || null,
    mststi: match.mststi || null,
    mststs: match.mststs ?? null,
    ms: match.ms ?? null,
    mess: match.mess ?? null,
    cmec: match.cmec || null,
    // 联赛信息
    tid: match.tid || null,
    tn: match.tn || null,
    tnjc: match.tnjc || null,
    tlev: match.tlev ?? null,
    lurl: match.lurl || null,
    lvs: match.lvs ?? null,
    // 球队信息
    mhid: match.mhid || null,
    maid: match.maid || null,
    mhn: match.mhn || null,
    man: match.man || null,
    mhlu: match.mhlu || null,
    malu: match.malu || null,
    mhlut: match.mhlut || null,
    malut: match.malut || null,
    frmhn: match.frmhn || null,
    frman: match.frman || null,
    // 比赛时间
    mgt: match.mgt ? (typeof match.mgt === "string" ? parseInt(match.mgt) : match.mgt) : null,
    met: match.met ? (() => {
      const metValue = typeof match.met === "string" ? parseInt(match.met) : match.met;
      // 如果 met 小于 10000000000，说明是秒级时间戳，需要转换为毫秒级
      if (metValue > 0 && metValue < 10000000000) {
        return metValue * 1000;
      }
      return metValue;
    })() : null,
    mlet: match.mlet || null,
    mle: match.mle ?? null,
    // 比分信息
    mhs: match.mhs ?? null,
    mas: match.mas ?? null,
    msc: match.msc || null,
    gcs: match.gcs ?? null,
    mng: match.mng ?? null,
    mmp: match.mmp || null,
    // 比赛配置
    mc: match.mc ?? null,
    mcg: match.mcg ?? null,
    mct: match.mct ?? null,
    mp: match.mp ?? null,
    mo: match.mo ?? null,
    mf: match.mf ?? false,
    mft: match.mft ?? null,
    mvs: match.mvs ?? null,
    mms: match.mms ?? null,
    pmms: match.pmms ?? null,
    mbmty: match.mbmty ?? null,
    mprmc: match.mprmc || null,
    mrmc: match.mrmc || null,
    mat: match.mat || null,
    compose: match.compose ?? null,
    hipo: match.hipo ?? null,
    tf: match.tf ?? false,
    th: match.th ?? null,
    mearlys: match.mearlys ?? null,
    vf: match.vf || null,
    // 分类和排序
    csid: match.csid || null,
    csna: match.csna || null,
    cds: match.cds || null,
    ctt: match.ctt ?? null,
    atf: match.atf || null,
    st: match.st || null,
    tc: match.tc || null,
    seid: match.seid || null,
    sort: match.sort ?? null,
    regionIdSort: match.regionIdSort ?? null,
    operationTournamentSort: match.operationTournamentSort ?? null,
    // 赔率相关标志
    cosBold: match.cosBold ?? null,
    cosTBold: match.cosTBold ?? null,
    cosCorner: match.cosCorner ?? null,
    cosTCorner: match.cosTCorner ?? null,
    cosPunish: match.cosPunish ?? null,
    cosTPunish: match.cosTPunish ?? null,
    cosOvertime: match.cosOvertime ?? null,
    cosPenalty: match.cosPenalty ?? null,
    cosOutright: match.cosOutright ?? null,
    cosPromotion: match.cosPromotion ?? null,
    cos15Minutes: match.cos15Minutes ?? null,
    // 赔率数据 (JSONB)
    hps: match.hps ? JSON.parse(JSON.stringify(match.hps)) : null,
    hpsBold: match.hpsBold ? JSON.parse(JSON.stringify(match.hpsBold)) : null,
    hpsCorner: match.hpsCorner ? JSON.parse(JSON.stringify(match.hpsCorner)) : null,
    hpsPunish: match.hpsPunish ? JSON.parse(JSON.stringify(match.hpsPunish)) : null,
    hpsOvertime: match.hpsOvertime ? JSON.parse(JSON.stringify(match.hpsOvertime)) : null,
    hpsPenalty: match.hpsPenalty ? JSON.parse(JSON.stringify(match.hpsPenalty)) : null,
    hpsPromotion: match.hpsPromotion ? JSON.parse(JSON.stringify(match.hpsPromotion)) : null,
    hpsOutright: match.hpsOutright ? JSON.parse(JSON.stringify(match.hpsOutright)) : null,
    // 其他数据
    betAmount: match.betAmount || null,
    tt: match.tt || null,
    // 详细赔率信息 (JSONB)
    odds_info: oddsInfo ? (typeof oddsInfo === 'object' ? oddsInfo : JSON.parse(JSON.stringify(oddsInfo))) : null,
    // 原始数据
    raw: match,
  };
};

// 调用 settle-sim-positions Edge Function 进行 AI 自动下注结算
// 根据 Supabase 文档，Edge Functions 之间调用应使用 fetch API
const triggerAISettlement = async (matchIds?: number[]): Promise<void> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`[fetch-daily-matches] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，跳过 AI 结算`);
    return;
  }
  
  // 如果没有传入 matchIds 或为空数组，settle-sim-positions 会自动查询所有已结束的比赛
  // 所以这里允许空数组或 undefined

  try {
    console.log(`[fetch-daily-matches] ========== 开始触发 AI 自动下注结算 ==========`);
    if (matchIds && matchIds.length > 0) {
      console.log(`[fetch-daily-matches] 比赛数量: ${matchIds.length}`);
      console.log(`[fetch-daily-matches] 比赛 ID 列表（前20个）: ${matchIds.slice(0, 20).join(', ')}${matchIds.length > 20 ? `... (共 ${matchIds.length} 场)` : ''}`);
    } else {
      console.log(`[fetch-daily-matches] 未指定比赛ID，将查询所有已结束的比赛`);
    }
    console.log(`[fetch-daily-matches] 使用 fetch API 调用 settle-sim-positions Edge Function`);
    console.log(`[fetch-daily-matches] SERVICE_ROLE_KEY 配置状态: ${SUPABASE_SERVICE_ROLE_KEY ? '已配置' : '未配置'}`);
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const keyPreview = SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...';
      const keyLength = SUPABASE_SERVICE_ROLE_KEY.length;
      console.log(`[fetch-daily-matches] SERVICE_ROLE_KEY 预览: ${keyPreview} (长度: ${keyLength})`);
      console.log(`[fetch-daily-matches] SERVICE_ROLE_KEY 是否以 'eyJ' 开头: ${SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')}`);
    }
    
    const requestBody: {
      autoSettle: boolean;
      matchIds?: number[];
    } = {
      autoSettle: true,
    };
    
    // 只有当 matchIds 存在且不为空时才传入
    if (matchIds && matchIds.length > 0) {
      requestBody.matchIds = matchIds;
      console.log(`[fetch-daily-matches] 请求参数:`, JSON.stringify({ ...requestBody, matchIds: `[${matchIds.length} 场比赛]` }, null, 2));
    } else {
      console.log(`[fetch-daily-matches] 请求参数:`, JSON.stringify({ ...requestBody, matchIds: '未指定（将查询所有已结束的比赛）' }, null, 2));
    }
    
    // 使用 fetch 调用 Edge Function（根据 Supabase 文档，这是 Edge Functions 之间调用的正确方式）
    // 对于 verify_jwt = false 的函数，需要 apikey 头，不需要 Authorization Bearer token
    // Service Role Key 不是 JWT 格式，不能用作 Bearer token
    const settleUrl = `${SUPABASE_URL}/functions/v1/settle-sim-positions`;
    const response = await fetch(settleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY, // apikey 头（必需）
        // 注意：即使 verify_jwt = false，网关仍然需要有效的 apikey 头
        // 但不使用 Authorization Bearer token（Service Role Key 不是 JWT）
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[fetch-daily-matches] AI 结算响应状态: HTTP ${response.status} ${response.statusText}`);
    console.log(`[fetch-daily-matches] 请求 URL: ${settleUrl}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "无法读取错误信息");
      console.error(`[fetch-daily-matches] AI 结算请求失败: HTTP ${response.status}`);
      console.error(`[fetch-daily-matches] 错误详情:`, errorText.substring(0, 500));
      
      if (response.status === 401) {
        console.error(`[fetch-daily-matches] ⚠️ 认证失败（401 Invalid JWT）`);
        console.error(`[fetch-daily-matches] 可能的原因：`);
        console.error(`[fetch-daily-matches]   1. SUPABASE_SERVICE_ROLE_KEY 值不正确（应该是 Service Role Key，不是 anon key）`);
        console.error(`[fetch-daily-matches]   2. 请检查在 Supabase Dashboard > Settings > API 中获取正确的 service_role key`);
        console.error(`[fetch-daily-matches]   3. 确保在 Edge Functions Secrets 中配置的是 service_role key，不是 anon key`);
      } else if (response.status === 404) {
        console.error(`[fetch-daily-matches] ⚠️ 函数未找到（404 Not Found）`);
        console.error(`[fetch-daily-matches] 请确保 settle-sim-positions 函数已正确部署`);
        console.error(`[fetch-daily-matches] 使用命令: supabase functions deploy settle-sim-positions`);
      }
      
      return;
    }

    const result = await response.json();
    console.log(`[fetch-daily-matches] AI 自动下注结算完成`);
    console.log(`[fetch-daily-matches] 结算结果摘要:`, JSON.stringify({
      message: result?.message,
      settlements_count: result?.settlements?.length || result?.outcomes?.length || 0,
      outcomes_count: result?.outcomes?.length || 0,
      outcomes_summary: result?.outcomes ? {
        settled: result.outcomes.filter((o: any) => o.status === 'settled').length,
        failed: result.outcomes.filter((o: any) => o.status === 'failed').length,
        skipped: result.outcomes.filter((o: any) => o.status === 'skipped').length,
      } : undefined
    }, null, 2));
    console.log(`[fetch-daily-matches] ========== AI 自动下注结算结束 ==========`);
  } catch (error) {
    console.error(`[fetch-daily-matches] 触发 AI 结算时出错:`, error);
    console.error(`[fetch-daily-matches] 错误堆栈:`, error instanceof Error ? error.stack : "N/A");
    // 不抛出错误，避免影响主流程
  }
};

// 调用 settle-user-bets Edge Function 进行用户手动下注结算
// 根据 Supabase 文档，Edge Functions 之间调用应使用 fetch API
const triggerUserBetsSettlement = async (): Promise<void> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(`[fetch-daily-matches] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，跳过用户结算`);
    return;
  }

  try {
    console.log(`[fetch-daily-matches] ========== 开始触发用户手动下注结算 ==========`);
    console.log(`[fetch-daily-matches] 使用 fetch API 调用 settle-user-bets Edge Function`);
    console.log(`[fetch-daily-matches] SERVICE_ROLE_KEY 配置状态: ${SUPABASE_SERVICE_ROLE_KEY ? '已配置' : '未配置'}`);
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const keyPreview = SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...';
      const keyLength = SUPABASE_SERVICE_ROLE_KEY.length;
      console.log(`[fetch-daily-matches] SERVICE_ROLE_KEY 预览: ${keyPreview} (长度: ${keyLength})`);
      console.log(`[fetch-daily-matches] SERVICE_ROLE_KEY 是否以 'eyJ' 开头: ${SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')}`);
    }
    
    // 使用 fetch 调用 Edge Function（根据 Supabase 文档，这是 Edge Functions 之间调用的正确方式）
    // 对于 verify_jwt = false 的函数，需要 apikey 头，不需要 Authorization Bearer token
    // Service Role Key 不是 JWT 格式，不能用作 Bearer token
    const settleUrl = `${SUPABASE_URL}/functions/v1/settle-user-bets`;
    const response = await fetch(settleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY, // apikey 头（必需）
        // 注意：即使 verify_jwt = false，网关仍然需要有效的 apikey 头
        // 但不使用 Authorization Bearer token（Service Role Key 不是 JWT）
      },
      body: JSON.stringify({}),
    });

    console.log(`[fetch-daily-matches] 用户下注结算响应状态: HTTP ${response.status} ${response.statusText}`);
    console.log(`[fetch-daily-matches] 请求 URL: ${settleUrl}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "无法读取错误信息");
      console.error(`[fetch-daily-matches] 用户下注结算请求失败: HTTP ${response.status}`);
      console.error(`[fetch-daily-matches] 错误详情:`, errorText.substring(0, 500));
      
      if (response.status === 401) {
        console.error(`[fetch-daily-matches] ⚠️ 认证失败（401 Invalid JWT）`);
        console.error(`[fetch-daily-matches] 可能的原因：`);
        console.error(`[fetch-daily-matches]   1. SUPABASE_SERVICE_ROLE_KEY 值不正确（应该是 Service Role Key，不是 anon key）`);
        console.error(`[fetch-daily-matches]   2. 请检查在 Supabase Dashboard > Settings > API 中获取正确的 service_role key`);
        console.error(`[fetch-daily-matches]   3. 确保在 Edge Functions Secrets 中配置的是 service_role key，不是 anon key`);
      } else if (response.status === 404) {
        console.error(`[fetch-daily-matches] ⚠️ 函数未找到（404 Not Found）`);
        console.error(`[fetch-daily-matches] 请确保 settle-user-bets 函数已正确部署`);
        console.error(`[fetch-daily-matches] 使用命令: supabase functions deploy settle-user-bets`);
        console.error(`[fetch-daily-matches] 或者检查函数名称是否正确（区分大小写）`);
      }
      
      return;
    }

    const result = await response.json();
    console.log(`[fetch-daily-matches] 用户手动下注结算完成`);
    console.log(`[fetch-daily-matches] 结算结果:`, JSON.stringify({
      message: result?.message,
      settled: result?.settled,
      total: result?.total,
      errors_count: result?.errors?.length || 0,
      errors: result?.errors?.slice(0, 5) // 只显示前5个错误
    }, null, 2));
    console.log(`[fetch-daily-matches] ========== 用户手动下注结算结束 ==========`);
  } catch (error) {
    console.error(`[fetch-daily-matches] 触发用户下注结算时出错:`, error);
    console.error(`[fetch-daily-matches] 错误堆栈:`, error instanceof Error ? error.stack : "N/A");
    // 不抛出错误，避免影响主流程
  }
};

// 同时触发 AI 和用户下注结算
const triggerAllSettlements = async (matchIds?: number[]): Promise<void> => {
  // 如果没有传入 matchIds 或为空数组，settle-sim-positions 会自动查询所有已结束的比赛
  // 所以这里允许空数组或 undefined，继续执行

  console.log(`[fetch-daily-matches] ========== triggerAllSettlements 开始 ==========`);
  if (matchIds && matchIds.length > 0) {
    console.log(`[fetch-daily-matches] 准备并行触发 AI 和用户下注结算，比赛数量: ${matchIds.length}`);
    console.log(`[fetch-daily-matches] 比赛 ID 列表: ${matchIds.slice(0, 30).join(', ')}${matchIds.length > 30 ? `... (共 ${matchIds.length} 场)` : ''}`);
  } else {
    console.log(`[fetch-daily-matches] 准备并行触发 AI 和用户下注结算，未指定比赛ID（将查询所有已结束的比赛）`);
  }
  
  // 并行执行两个结算，互不影响
  const [aiSettlementResult, userSettlementResult] = await Promise.allSettled([
    triggerAISettlement(matchIds || []),
    triggerUserBetsSettlement(),
  ]);
  
  console.log(`[fetch-daily-matches] ========== triggerAllSettlements 结果 ==========`);
  if (aiSettlementResult.status === 'fulfilled') {
    console.log(`[fetch-daily-matches] AI 结算触发成功`);
  } else {
    console.error(`[fetch-daily-matches] AI 结算触发失败:`, aiSettlementResult.reason);
  }
  
  if (userSettlementResult.status === 'fulfilled') {
    console.log(`[fetch-daily-matches] 用户结算触发成功`);
  } else {
    console.error(`[fetch-daily-matches] 用户结算触发失败:`, userSettlementResult.reason);
  }
  
  console.log(`[fetch-daily-matches] ========== triggerAllSettlements 结束 ==========`);
};

// 批量插入番茄体育 API 数据
const upsertSportsApiMatches = async (
  date: string,
  matches: SportsApiMatch[],
  ybtyToken?: string,
  fetchOdds: boolean = false,
): Promise<{ completedMatchIds: number[] }> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化，无法写入数据");
  }

  // 过滤掉包含 "VS-PANDA独家EAFC24" 的比赛
  const filteredMatches = matches.filter((match) => {
    const leagueName = match.tn || match.tnjc || "";
    return !leagueName.includes("VS-PANDA独家EAFC24");
  });

  console.log(`[upsertSportsApiMatches] 过滤前: ${matches.length} 场, 过滤后: ${filteredMatches.length} 场`);

  // 去除重复的 (date, mid) 组合，只保留每个 mid 的第一个记录
  const seen = new Set<string>();
  const uniqueMatches: SportsApiMatch[] = [];
  
  for (const match of filteredMatches) {
    if (!match.mid) {
      continue; // 跳过没有 mid 的比赛
    }
    
    const key = `${date}-${match.mid}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMatches.push(match);
    }
  }

  console.log(`[upsertSportsApiMatches] 去重前: ${filteredMatches.length} 场, 去重后: ${uniqueMatches.length} 场`);

  // 如果需要获取赔率信息，并行获取（限制并发数避免过载）
  console.log(`[upsertSportsApiMatches] fetchOdds=${fetchOdds}, ybtyToken=${ybtyToken ? 'exists' : 'missing'}, matches=${uniqueMatches.length}`);
  
  // 在刷新模式下（fetchOdds=false），先查询已有的记录以保留 odds_info
  const existingOddsInfoMap = new Map<string, unknown>();
  if (!fetchOdds && uniqueMatches.length > 0) {
    const mids = uniqueMatches.map(m => m.mid).filter(Boolean) as string[];
    if (mids.length > 0) {
      const { data: existingRecords } = await supabase
        .from("daily_matches")
        .select("mid, odds_info")
        .eq("date", date)
        .in("mid", mids);
      
      if (existingRecords) {
        for (const record of existingRecords) {
          if (record.mid && record.odds_info !== null && record.odds_info !== undefined) {
            existingOddsInfoMap.set(record.mid, record.odds_info);
          }
        }
        console.log(`[upsertSportsApiMatches] 从数据库读取到 ${existingOddsInfoMap.size} 条已有赔率信息，将在刷新模式下保留`);
      }
    }
  }
  
  // 限制并发数，避免 API 限流
  const BATCH_SIZE = 5; // 每批处理5个
  // 请求之间的随机延迟（毫秒）- 600-1200ms 随机范围，模拟人类行为
  const getRequestDelay = () => Math.floor(Math.random() * 600) + 600; // 600-1200ms
  // 批次之间的随机延迟（毫秒）- 1500-2500ms 随机范围
  const getBatchDelay = () => Math.floor(Math.random() * 1000) + 1500; // 1500-2500ms
  const records: Record<string, unknown>[] = [];
  
  for (let i = 0; i < uniqueMatches.length; i += BATCH_SIZE) {
    const batch = uniqueMatches.slice(i, i + BATCH_SIZE);
    console.log(`[upsertSportsApiMatches] 处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueMatches.length / BATCH_SIZE)} (${batch.length} 场比赛)`);
    
    // 改为串行处理，而不是并行，以更好地控制请求速率
    const batchRecords: Record<string, unknown>[] = [];
    for (let j = 0; j < batch.length; j++) {
      const match = batch[j];
      let oddsInfo: unknown | null = null;
      
      if (fetchOdds && ybtyToken && match.mid) {
        try {
          console.log(`[upsertSportsApiMatches] 正在获取比赛 ${match.mid} 的赔率信息... (${j + 1}/${batch.length})`);
          oddsInfo = await fetchMatchOddsInfo(
            ybtyToken,
            match.mid,
            "0", // 统一使用默认值 0
          );
          if (oddsInfo) {
            console.log(`[upsertSportsApiMatches] ✓ 成功获取比赛 ${match.mid} 的赔率信息`);
            // 验证数据结构
            if (typeof oddsInfo === 'object' && oddsInfo !== null) {
              const oddsObj = oddsInfo as Record<string, unknown>;
              if (oddsObj.data) {
                console.log(`[upsertSportsApiMatches] 比赛 ${match.mid} 的赔率数据包含 data 字段`);
              } else {
                console.warn(`[upsertSportsApiMatches] 比赛 ${match.mid} 的赔率数据缺少 data 字段:`, Object.keys(oddsObj));
              }
            }
          } else {
            console.warn(`[upsertSportsApiMatches] ✗ 比赛 ${match.mid} 的赔率信息为空`);
          }
        } catch (error) {
          console.error(`[upsertSportsApiMatches] ✗ 获取比赛 ${match.mid} 的赔率信息失败:`, error);
        }
      } else {
        if (!fetchOdds) {
          // 刷新模式下，使用已有的 odds_info（如果存在）
          if (match.mid && existingOddsInfoMap.has(match.mid)) {
            oddsInfo = existingOddsInfoMap.get(match.mid)!;
          } else {
          }
        } else if (!ybtyToken) {
          console.warn(`[upsertSportsApiMatches] 跳过比赛 ${match.mid} 的赔率获取 (ybtyToken缺失)`);
        } else if (!match.mid) {
          console.warn(`[upsertSportsApiMatches] 跳过比赛赔率获取 (mid缺失)`);
        }
      }
      
      const record = convertSportsApiMatchToRecord(match, date, oddsInfo);
      
      // 在刷新模式下，如果 oddsInfo 为 null（即没有新的赔率且没有已有的赔率），则删除 odds_info 字段，避免覆盖
      if (!fetchOdds && oddsInfo === null) {
        delete record.odds_info;
      }
      
      batchRecords.push(record);
      
      // 请求之间添加随机延迟（最后一个请求不需要延迟）
      if (j < batch.length - 1 && fetchOdds && ybtyToken && match.mid) {
        const delay = getRequestDelay();
        console.log(`[upsertSportsApiMatches] 等待 ${delay}ms 后再请求下一个比赛...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    records.push(...batchRecords);
    
    // 批次之间添加随机延迟（最后一个批次不需要延迟）
    if (i + BATCH_SIZE < uniqueMatches.length) {
      const delay = getBatchDelay();
      console.log(`[upsertSportsApiMatches] 批次完成，等待 ${delay}ms 后再处理下一批次...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // 统计有多少记录包含赔率信息
  const recordsWithOdds = records.filter(r => r.odds_info !== null && r.odds_info !== undefined);
  console.log(`[upsertSportsApiMatches] 总计: ${records.length} 条记录, 其中 ${recordsWithOdds.length} 条包含赔率信息`);

  // 验证记录中的 odds_info
  const sampleRecord = records[0];
  if (sampleRecord) {
    console.log(`[upsertSportsApiMatches] 示例记录 - mid: ${sampleRecord.mid}, odds_info存在: ${sampleRecord.odds_info !== null && sampleRecord.odds_info !== undefined}, odds_info类型: ${typeof sampleRecord.odds_info}`);
    if (sampleRecord.odds_info) {
      const oddsInfoStr = JSON.stringify(sampleRecord.odds_info).substring(0, 200);
      console.log(`[upsertSportsApiMatches] 示例记录的 odds_info 预览: ${oddsInfoStr}...`);
    }
  }

  const { error } = await supabase
    .from("daily_matches")
    .upsert(records, { onConflict: "date,mid" });

  if (error) {
    console.error(`[upsertSportsApiMatches] 数据库写入失败:`, error);
    throw error;
  }
  
  console.log(`[upsertSportsApiMatches] 成功写入 ${records.length} 条记录到数据库`);
  
  // 返回已完成的比赛 ID 列表（用于触发结算）
  // 比赛结束逻辑：met != 0 并且 当前时间 > met的时间
  // met 字段是毫秒级时间戳，now 也使用毫秒级
  const now = Date.now(); // 当前时间戳（毫秒）
  console.log(`[upsertSportsApiMatches] 开始识别已完成的比赛，当前时间戳（毫秒）: ${now}, 记录数: ${records.length}`);
  
  const completedMatchIds: number[] = [];
  const completedMatchesDetail: Array<{ mid: string; met: number; metValue: number; now: number }> = [];
  let metZeroCount = 0;
  let metNullCount = 0;
  let metFutureCount = 0;
  let invalidMidCount = 0;
  
  console.log(`[upsertSportsApiMatches] 开始遍历 ${records.length} 条记录，检查哪些比赛已结束...`);
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const met = record.met;
    const mid = record.mid;
    const metValue = typeof met === "string" ? parseInt(met, 10) : (typeof met === "number" ? met : 0);
    
    // 统计各种情况（每100条记录输出一次进度）
    if (i > 0 && i % 100 === 0) {
      console.log(`[upsertSportsApiMatches] 已检查 ${i}/${records.length} 条记录，已识别 ${completedMatchIds.length} 场已完成比赛`);
    }
    
    if (metValue === 0) {
      metZeroCount++;
    } else if (met === null || met === undefined) {
      metNullCount++;
    } else if (typeof metValue === "number" && metValue > now) {
      metFutureCount++;
      // 打印一些未来比赛的示例（只打印前3个）
      if (metFutureCount <= 3 && mid) {
        const minutesUntilEnd = Math.floor((metValue - now) / 1000 / 60);
        console.log(`[upsertSportsApiMatches] 未来比赛示例[${metFutureCount}]: mid=${mid}, met=${metValue}, now=${now}, 距离结束还有约 ${minutesUntilEnd} 分钟`);
      }
    } else if (typeof metValue === "number" && metValue !== 0 && metValue <= now) {
      // met != 0 且 当前时间 >= met 表示比赛已结束（毫秒级比较）
      if (mid && typeof mid === "string") {
        const matchId = parseInt(mid);
        if (!isNaN(matchId)) {
          completedMatchIds.push(matchId);
          completedMatchesDetail.push({
            mid,
            met: metValue,
            metValue,
            now
          });
          // 打印每个已完成的比赛（前20个）
          if (completedMatchIds.length <= 20) {
            const timeDiffMs = now - metValue;
            const timeDiffMinutes = Math.floor(timeDiffMs / 1000 / 60);
            console.log(`[upsertSportsApiMatches] ✓ 识别到已完成比赛[${completedMatchIds.length}]: mid=${mid}, met=${metValue}, now=${now}, 结束于 ${timeDiffMinutes} 分钟前`);
          }
        } else {
          invalidMidCount++;
        }
      } else {
        invalidMidCount++;
      }
    }
  }
  
  console.log(`[upsertSportsApiMatches] ========== 已完成比赛识别统计 ==========`);
  console.log(`[upsertSportsApiMatches] 总记录数: ${records.length}, 当前时间戳(ms): ${now}, 当前时间: ${new Date(now).toISOString()}`);
  console.log(`[upsertSportsApiMatches]   - met = 0 (未结束): ${metZeroCount}`);
  console.log(`[upsertSportsApiMatches]   - met = null/undefined: ${metNullCount}`);
  console.log(`[upsertSportsApiMatches]   - met > now (未来比赛): ${metFutureCount}`);
  console.log(`[upsertSportsApiMatches]   - met != 0 且 met <= now (已结束): ${completedMatchIds.length}`);
  console.log(`[upsertSportsApiMatches]   - mid 无效或缺失: ${invalidMidCount}`);
  
  // 打印前5条记录的 met 值示例
  if (records.length > 0) {
    const metSamples = records.slice(0, Math.min(5, records.length)).map((r, idx) => {
      const met = r.met;
      const metValue = typeof met === "string" ? parseInt(met, 10) : (typeof met === "number" ? met : null);
      const mid = r.mid;
      return {
        index: idx + 1,
        mid: mid || 'null',
        met: met,
        metType: typeof met,
        metValue: metValue,
        metValueStr: metValue !== null ? new Date(metValue).toISOString() : 'null',
        now: now,
        nowStr: new Date(now).toISOString(),
        isCompleted: metValue !== null && metValue !== 0 && metValue <= now,
        timeDiffMs: metValue !== null && metValue > 0 ? now - metValue : null,
        timeDiffMinutes: metValue !== null && metValue > 0 ? Math.floor((now - metValue) / 1000 / 60) : null
      };
    });
    console.log(`[upsertSportsApiMatches] met 值示例（前${Math.min(5, records.length)}条记录）:`, JSON.stringify(metSamples, null, 2));
  }
  
  if (completedMatchIds.length > 0) {
    console.log(`[upsertSportsApiMatches] ========== 已完成比赛详情 ==========`);
    console.log(`[upsertSportsApiMatches] 已完成比赛总数: ${completedMatchIds.length}`);
    console.log(`[upsertSportsApiMatches] 已完成比赛详情（前10场）:`, JSON.stringify(completedMatchesDetail.slice(0, 10).map((m, idx) => ({
      index: idx + 1,
      mid: m.mid,
      met: m.met,
      metValue: m.metValue,
      metValueStr: new Date(m.metValue).toISOString(),
      now: m.now,
      nowStr: new Date(m.now).toISOString(),
      isCompleted: m.metValue <= m.now,
      timeDiffMs: m.now - m.metValue,
      timeDiffMinutes: Math.floor((m.now - m.metValue) / 1000 / 60),
      timeDiffHours: Math.floor((m.now - m.metValue) / 1000 / 60 / 60)
    })), null, 2));
    console.log(`[upsertSportsApiMatches] 已完成比赛 ID 列表（全部 ${completedMatchIds.length} 场）: ${completedMatchIds.join(', ')}`);
  } else {
    console.log(`[upsertSportsApiMatches] ========== 没有已完成的比赛 ==========`);
    console.log(`[upsertSportsApiMatches] 原因: 所有 ${records.length} 场比赛的 met = 0 或 met > 当前时间，无需结算`);
    if (metZeroCount > 0) {
      console.log(`[upsertSportsApiMatches] 提示: 有 ${metZeroCount} 场比赛的 met = 0，表示比赛尚未结束（met=0 表示比赛未结束）`);
    }
    if (metFutureCount > 0) {
      console.log(`[upsertSportsApiMatches] 提示: 有 ${metFutureCount} 场比赛的 met > 当前时间，表示比赛将在未来结束`);
    }
  }
  
  console.log(`[upsertSportsApiMatches] 返回 completedMatchIds: ${completedMatchIds.length} 场`);
  
  return { completedMatchIds };
};

// 获取需要刷新的比赛 mid 列表（今天和昨天的未完成比赛）
// 判断逻辑：met = 0 表示比赛未结束，需要刷新；met != 0 表示比赛已结束，不需要刷新
const getMatchesToRefresh = async (
  dates: string[],
): Promise<Set<string>> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  const { data, error } = await supabase
    .from("daily_matches")
    .select("mid, met")
    .in("date", dates);

  if (error) {
    console.warn("[fetch-daily-matches] 获取需要刷新的比赛失败:", error);
    return new Set();
  }

  // 过滤出未完成的比赛
  // 比赛结束逻辑：met != 0 并且 当前时间 > met的时间
  // met 字段是毫秒级时间戳，now 也使用毫秒级
  const now = Date.now(); // 当前时间戳（毫秒）
  const activeMatches = new Set<string>();

  if (data) {
    for (const match of data) {
      const met = match.met;
      const metValue = typeof met === "string" ? parseInt(met) : (met ?? 0);
      
      // 只保留未结束的比赛：met = 0 或 met 为 null，或者 met != 0 但当前时间 < met
      if (metValue === 0 || met === null || met === undefined) {
        // met = 0 或 null，比赛未结束
        if (match.mid) {
          activeMatches.add(match.mid);
        }
      } else if (now < metValue) {
        // met != 0 但当前时间 < met，比赛还未结束（毫秒级比较）
        if (match.mid) {
          activeMatches.add(match.mid);
        }
      }
      // 如果 met != 0 且 now >= metValue，比赛已结束，不添加到 activeMatches
    }
  }

  return activeMatches;
};

// Refresh 模式：更新已有比赛的数据
const refreshExistingMatches = async (
  ybtyToken: string,
  targetDate: string,
  timezone: string,
  leagueConstants: Map<string, string>,
  fetchOdds: boolean = true,
): Promise<{ refreshed: number; total: number }> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  // 获取昨天和今天的日期
  const yesterdayDate = getYesterdayDate(timezone);
  const datesToRefresh = [yesterdayDate, targetDate];

  console.log(
    `[fetch-daily-matches] Refresh 模式：刷新日期 ${datesToRefresh.join(", ")} 的比赛`,
  );

  // 获取需要刷新的比赛 mid 列表
  const matchesToRefresh = await getMatchesToRefresh(datesToRefresh);
  console.log(`[fetch-daily-matches] 需要刷新的比赛: ${matchesToRefresh.size} 场`);

  if (matchesToRefresh.size === 0) {
    return { refreshed: 0, total: 0 };
  }

  // 调用 API 获取所有比赛
  const allMatches = await fetchYBTYMatches(ybtyToken);
  console.log(`[fetch-daily-matches] 获取到 ${allMatches.length} 场比赛`);

  // 在刷新模式下，先根据 mid 匹配需要刷新的比赛（不过滤联赛）
  // 因为需要刷新的比赛可能不在 league_constants 中，但它们已经在数据库中了
  const matchesToUpdate = allMatches.filter((match) =>
    match.mid && matchesToRefresh.has(match.mid)
  );

  console.log(`[fetch-daily-matches] 从 API 中匹配到 ${matchesToUpdate.length} 场需要更新的比赛（mid: ${Array.from(matchesToRefresh).slice(0, 5).join(', ')}${matchesToRefresh.size > 5 ? '...' : ''}）`);

  // 如果匹配到的比赛数量少于需要刷新的数量，记录日志并检查未找到的比赛是否已结束
  let missingCompletedMatchIds: number[] = [];
  if (matchesToUpdate.length < matchesToRefresh.size) {
    const foundMids = new Set(matchesToUpdate.map(m => m.mid));
    const missingMids = Array.from(matchesToRefresh).filter(mid => !foundMids.has(mid));
    console.log(`[fetch-daily-matches] 警告：有 ${missingMids.length} 场比赛在 API 中未找到: ${missingMids.slice(0, 5).join(', ')}${missingMids.length > 5 ? '...' : ''}`);
    
    // 检查未找到的比赛是否已经结束，如果已结束则触发结算
    if (missingMids.length > 0 && supabase) {
      try {
        const now = Date.now(); // 当前时间戳（毫秒）
        const { data: missingMatches, error: missingError } = await supabase
          .from('daily_matches')
          .select('mid, met')
          .in('mid', missingMids)
          .neq('met', 0) // met != 0 表示比赛已结束
          .not('met', 'is', null); // 排除 met 为 null 的情况
        
        if (!missingError && missingMatches) {
          // 过滤：只保留当前时间 >= met 的比赛（确保比赛确实已经结束）
          // met 字段是毫秒级时间戳，now 也是毫秒级，直接比较
          const completedMissingMatches = missingMatches.filter((match: any) => {
            const met = match.met;
            const metValue = typeof met === "string" ? parseInt(met) : (met ?? 0);
            return metValue !== 0 && metValue <= now; // met != 0 且 当前时间 >= met（毫秒级）
          });
          
          if (completedMissingMatches.length > 0) {
            // 将 mid 转换为数字 ID（如果需要）
            missingCompletedMatchIds = completedMissingMatches
              .map((match: any) => {
                const mid = match.mid;
                if (mid && typeof mid === "string") {
                  const matchId = parseInt(mid);
                  return !isNaN(matchId) ? matchId : null;
                }
                return null;
              })
              .filter((id): id is number => id !== null);
            
            console.log(`[fetch-daily-matches] 检测到 ${missingCompletedMatchIds.length} 场未找到的比赛已结束，将触发结算: ${missingCompletedMatchIds.slice(0, 5).join(', ')}${missingCompletedMatchIds.length > 5 ? '...' : ''}`);
          }
        } else if (missingError) {
          console.error(`[fetch-daily-matches] 查询未找到的比赛状态失败:`, missingError);
        }
      } catch (error) {
        console.error(`[fetch-daily-matches] 检查未找到的比赛状态时出错:`, error);
      }
    }
  }

  // 过滤匹配联赛的比赛（用于统计）
  const filteredByLeague = filterMatchesByLeague(allMatches, leagueConstants);
  console.log(`[fetch-daily-matches] 匹配联赛后剩余 ${filteredByLeague.length} 场比赛`);

  if (matchesToUpdate.length === 0) {
    console.log(`[fetch-daily-matches] Refresh模式: 没有找到需要更新的比赛`);
    if (missingCompletedMatchIds.length > 0) {
      console.log(`[fetch-daily-matches] Refresh模式: 检测到 ${missingCompletedMatchIds.length} 场未找到的比赛已结束，触发结算`);
      console.log(`[fetch-daily-matches] Refresh模式: 未找到但已结束的比赛 ID: ${missingCompletedMatchIds.join(', ')}`);
      await triggerAllSettlements(missingCompletedMatchIds);
    } else {
      console.log(`[fetch-daily-matches] Refresh模式: 没有未找到但已结束的比赛，跳过结算`);
    }
    return { refreshed: 0, total: filteredByLeague.length };
  }

  // 按日期分组并更新
  const matchesByDate = new Map<string, SportsApiMatch[]>();

  for (const match of matchesToUpdate) {
    if (!match.mgt) {
      continue;
    }

    const matchTimestamp = typeof match.mgt === "string"
      ? parseInt(match.mgt)
      : match.mgt;
    // 使用与 filterTodayMatches 相同的时区逻辑计算日期，确保一致性
    const matchDate = getDateFromTimestamp(matchTimestamp, timezone);

    // 只更新昨天和今天的比赛
    if (datesToRefresh.includes(matchDate)) {
      if (!matchesByDate.has(matchDate)) {
        matchesByDate.set(matchDate, []);
      }
      matchesByDate.get(matchDate)!.push(match);
    }
  }

  let totalRefreshed = 0;
  const allCompletedMatchIds: number[] = [];
  
  console.log(`[fetch-daily-matches] Refresh模式: 开始按日期分组更新，共 ${matchesByDate.size} 个日期`);
  for (const [date, matches] of matchesByDate.entries()) {
    console.log(`[fetch-daily-matches] Refresh模式: 更新日期 ${date} 的 ${matches.length} 场比赛`);
    const { completedMatchIds } = await upsertSportsApiMatches(date, matches, ybtyToken, fetchOdds);
    console.log(`[fetch-daily-matches] Refresh模式: 日期 ${date} 识别到 ${completedMatchIds.length} 场已完成比赛`);
    if (completedMatchIds.length > 0) {
      console.log(`[fetch-daily-matches] Refresh模式: 日期 ${date} 已完成比赛 ID: ${completedMatchIds.join(', ')}`);
    }
    allCompletedMatchIds.push(...completedMatchIds);
    totalRefreshed += matches.length;
  }

  const allCompletedMatchIdsCombined = [...allCompletedMatchIds, ...missingCompletedMatchIds];
  console.log(`[fetch-daily-matches] Refresh模式: ========== 结算触发检查 ==========`);
  console.log(`[fetch-daily-matches] Refresh模式: 汇总已完成比赛 - 总计 ${allCompletedMatchIdsCombined.length} 场`);
  console.log(`[fetch-daily-matches] Refresh模式:   - 来自 API 更新: ${allCompletedMatchIds.length} 场`);
  console.log(`[fetch-daily-matches] Refresh模式:   - 来自未找到但已结束: ${missingCompletedMatchIds.length} 场`);
  
  if (allCompletedMatchIdsCombined.length > 0) {
    console.log(`[fetch-daily-matches] Refresh模式: 所有已完成比赛 ID: ${allCompletedMatchIdsCombined.join(', ')}`);
    console.log(`[fetch-daily-matches] Refresh模式: ========== 开始触发自动结算 ==========`);
    console.log(`[fetch-daily-matches] Refresh模式: 调用 triggerAllSettlements(${allCompletedMatchIdsCombined.length})`);
    await triggerAllSettlements(allCompletedMatchIdsCombined);
    console.log(`[fetch-daily-matches] Refresh模式: ========== 自动结算触发完成 ==========`);
  } else {
    console.log(`[fetch-daily-matches] Refresh模式: ========== 跳过结算触发 ==========`);
    console.log(`[fetch-daily-matches] Refresh模式: 原因: 没有已完成的比赛（API更新:${allCompletedMatchIds.length}场, 未找到但已结束:${missingCompletedMatchIds.length}场）`);
    console.log(`[fetch-daily-matches] Refresh模式: 说明: settle-sim-positions 和 settle-user-bets 不会被调用，因为没有已完成的比赛需要结算`);
    console.log(`[fetch-daily-matches] Refresh模式: 提示: 只有当 met != 0 且 当前时间 >= met 时，比赛才会被识别为已完成`);
  }

  return { refreshed: totalRefreshed, total: filteredByLeague.length };
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date: customDate, timezone, matches, autoFetch, mode } = req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};

    const resolvedTimezone = typeof timezone === "string" && timezone.trim()
      ? timezone.trim()
      : DEFAULT_TIMEZONE;

    console.log(`[fetch-daily-matches] 使用时区: ${resolvedTimezone}`);

    const targetDate = normalizeDate(
      customDate && typeof customDate === "string" && customDate.length >= 10
        ? customDate
        : getTargetDate(resolvedTimezone),
    );

    const isRefresh = mode === "refresh";

    console.log(`[fetch-daily-matches] processing matches for date: ${targetDate}, mode: ${isRefresh ? "refresh" : "normal"}`);

      // 如果提供了 matches 数据（番茄体育 API 格式），直接处理
    if (matches && Array.isArray(matches)) {
      console.log(`[fetch-daily-matches] received ${matches.length} matches from SportsApi`);
      
      // 尝试获取 token 以获取赔率信息
      let ybtyToken: string | undefined;
      try {
        const tokens = await getTokensFromCache();
        ybtyToken = tokens?.ybty_token;
      } catch (error) {
        console.warn("[fetch-daily-matches] 无法获取 token，将跳过赔率信息获取:", error);
      }
      
      const { completedMatchIds } = await upsertSportsApiMatches(targetDate, matches as SportsApiMatch[], ybtyToken, true);
      console.log(`[fetch-daily-matches] 直接提供 matches 模式: upsertSportsApiMatches 返回 ${completedMatchIds.length} 场已完成的比赛`);
      
      // 如果有已完成的比赛，触发自动结算（AI 和用户下注）
      if (completedMatchIds.length > 0) {
        console.log(`[fetch-daily-matches] 直接提供 matches 模式: 发现 ${completedMatchIds.length} 场已完成的比赛，准备触发自动结算`);
        console.log(`[fetch-daily-matches] 直接提供 matches 模式: 已完成比赛 ID 列表: ${completedMatchIds.slice(0, 20).join(', ')}${completedMatchIds.length > 20 ? `... (共 ${completedMatchIds.length} 场)` : ''}`);
        await triggerAllSettlements(completedMatchIds);
      } else {
        console.log(`[fetch-daily-matches] 直接提供 matches 模式: 没有已完成的比赛，跳过结算触发`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          date: targetDate,
          count: matches.length,
          completedMatches: completedMatchIds.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 如果启用了自动获取，从 API 获取数据
    if (autoFetch !== false) {
      console.log(`[fetch-daily-matches] 开始${isRefresh ? "刷新" : "自动获取"}比赛数据...`);

      // 1. 从缓存获取 token
      const tokens = await getTokensFromCache();
      if (!tokens || !tokens.ybty_token) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "无法获取 ybty_token，请检查 app_cache 表中的 ybty_token_cache",
            date: targetDate,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("[fetch-daily-matches] 成功获取 token");

      // 2. 获取联赛常量
      const leagueConstants = await getLeagueConstants();
      console.log(`[fetch-daily-matches] 加载了 ${leagueConstants.size} 个联赛常量`);

      // 保存 token 以便后续使用
      const ybtyToken = tokens.ybty_token;

      // 3. 如果是刷新模式，更新已有比赛
      if (isRefresh) {
        const refreshResult = await refreshExistingMatches(
          ybtyToken,
          targetDate,
          resolvedTimezone,
          leagueConstants,
          false, // 刷新模式不更新赔率信息
        );

        return new Response(
          JSON.stringify({
            success: true,
            mode: "refresh",
            date: targetDate,
            refreshed: refreshResult.refreshed,
            total: refreshResult.total,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // 4. 正常模式：获取新比赛
      // 调用 YBTY API 获取比赛列表
      const allMatches = await fetchYBTYMatches(tokens.ybty_token);
      console.log(`[fetch-daily-matches] 获取到 ${allMatches.length} 场比赛`);

      // 5. 过滤匹配联赛的比赛
      const filteredByLeague = filterMatchesByLeague(allMatches, leagueConstants);
      console.log(`[fetch-daily-matches] 匹配联赛后剩余 ${filteredByLeague.length} 场比赛`);

      // 6. 过滤今天的比赛
      const todayMatches = filterTodayMatches(filteredByLeague, targetDate);
      console.log(`[fetch-daily-matches] 今天的比赛: ${todayMatches.length} 场`);

      // 7. 存储到数据库（同时获取赔率信息）
      if (todayMatches.length > 0) {
        console.log(`[fetch-daily-matches] 正常模式: 准备存储 ${todayMatches.length} 场比赛到数据库...`);
        const { completedMatchIds } = await upsertSportsApiMatches(targetDate, todayMatches, ybtyToken, true);
        console.log(`[fetch-daily-matches] 正常模式: 成功存储 ${todayMatches.length} 场比赛（包含赔率信息）`);
        console.log(`[fetch-daily-matches] 正常模式: upsertSportsApiMatches 返回 ${completedMatchIds.length} 场已完成的比赛`);
        
        // 如果有已完成的比赛，触发自动结算（AI 和用户下注）
        if (completedMatchIds.length > 0) {
          console.log(`[fetch-daily-matches] 正常模式: 发现 ${completedMatchIds.length} 场已完成的比赛，准备触发自动结算`);
          console.log(`[fetch-daily-matches] 正常模式: 已完成比赛 ID 列表: ${completedMatchIds.slice(0, 20).join(', ')}${completedMatchIds.length > 20 ? `... (共 ${completedMatchIds.length} 场)` : ''}`);
          await triggerAllSettlements(completedMatchIds);
        } else {
          console.log(`[fetch-daily-matches] 正常模式: 没有已完成的比赛，跳过结算触发`);
        }
      } else {
        console.log(`[fetch-daily-matches] 正常模式: 没有今天的比赛需要存储`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "normal",
          date: targetDate,
          total: allMatches.length,
          matchedLeagues: filteredByLeague.length,
          todayMatches: todayMatches.length,
          saved: todayMatches.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 如果没有提供数据且未启用自动获取，返回提示
    return new Response(
      JSON.stringify({
        success: false,
        error: "请提供 matches 数据（番茄体育 API 格式）或设置 autoFetch: true",
        date: targetDate,
      }),
      {
        status: 400,
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


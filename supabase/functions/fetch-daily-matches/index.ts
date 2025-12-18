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

// 获取比赛详细赔率信息
const fetchMatchOddsInfo = async (
  ybtyToken: string,
  mid: string,
  mcid: string = "0",
  cuid: string = "529524126471950857",
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

  try {
    console.log(`[fetchMatchOddsInfo] 请求URL: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法读取错误信息');
      console.warn(`[fetchMatchOddsInfo] 获取比赛 ${mid} 的赔率信息失败: HTTP ${response.status}, ${errorText.substring(0, 200)}`);
      return null;
    }

    const result = await response.json();
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
    return null;
  }
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
    met: match.met ? (typeof match.met === "string" ? parseInt(match.met) : match.met) : null,
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

// 批量插入番茄体育 API 数据
const upsertSportsApiMatches = async (
  date: string,
  matches: SportsApiMatch[],
  ybtyToken?: string,
  fetchOdds: boolean = false,
) => {
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
  
  // 限制并发数，避免 API 限流
  const BATCH_SIZE = 5; // 每批处理5个
  const records: Record<string, unknown>[] = [];
  
  for (let i = 0; i < uniqueMatches.length; i += BATCH_SIZE) {
    const batch = uniqueMatches.slice(i, i + BATCH_SIZE);
    console.log(`[upsertSportsApiMatches] 处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueMatches.length / BATCH_SIZE)} (${batch.length} 场比赛)`);
    
    const batchRecords = await Promise.all(
      batch.map(async (match, index) => {
        let oddsInfo: unknown | null = null;
        
        if (fetchOdds && ybtyToken && match.mid) {
          try {
            console.log(`[upsertSportsApiMatches] 正在获取比赛 ${match.mid} 的赔率信息...`);
            oddsInfo = await fetchMatchOddsInfo(
              ybtyToken,
              match.mid,
              match.mcid || "0",
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
            console.log(`[upsertSportsApiMatches] 跳过比赛 ${match.mid} 的赔率获取 (fetchOdds=false)`);
          } else if (!ybtyToken) {
            console.warn(`[upsertSportsApiMatches] 跳过比赛 ${match.mid} 的赔率获取 (ybtyToken缺失)`);
          } else if (!match.mid) {
            console.warn(`[upsertSportsApiMatches] 跳过比赛赔率获取 (mid缺失)`);
          }
        }
        
        // 添加小延迟避免请求过快
        if (index < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms 延迟
        }
        
        return convertSportsApiMatchToRecord(match, date, oddsInfo);
      })
    );
    
    records.push(...batchRecords);
    
    // 批次之间添加延迟
    if (i + BATCH_SIZE < uniqueMatches.length) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms 延迟
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
};

// 已完成比赛状态（用于判断是否需要刷新）
const COMPLETED_STATUSES = new Set(["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"]);

// 获取需要刷新的比赛 mid 列表（今天和昨天的未完成比赛）
const getMatchesToRefresh = async (
  dates: string[],
): Promise<Set<string>> => {
  if (!supabase) {
    throw new Error("Supabase 客户端未初始化");
  }

  const { data, error } = await supabase
    .from("daily_matches")
    .select("mid, mst")
    .in("date", dates);

  if (error) {
    console.warn("[fetch-daily-matches] 获取需要刷新的比赛失败:", error);
    return new Set();
  }

  // 过滤出未完成的比赛（状态不是已完成）
  const activeMatches = new Set<string>();

  if (data) {
    for (const match of data) {
      // 如果没有状态或状态不是已完成，则需要刷新
      if (!match.mst || !COMPLETED_STATUSES.has(match.mst)) {
        if (match.mid) {
          activeMatches.add(match.mid);
        }
      }
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

  // 如果匹配到的比赛数量少于需要刷新的数量，记录日志
  if (matchesToUpdate.length < matchesToRefresh.size) {
    const foundMids = new Set(matchesToUpdate.map(m => m.mid));
    const missingMids = Array.from(matchesToRefresh).filter(mid => !foundMids.has(mid));
    console.log(`[fetch-daily-matches] 警告：有 ${missingMids.length} 场比赛在 API 中未找到: ${missingMids.slice(0, 5).join(', ')}${missingMids.length > 5 ? '...' : ''}`);
  }

  // 过滤匹配联赛的比赛（用于统计）
  const filteredByLeague = filterMatchesByLeague(allMatches, leagueConstants);
  console.log(`[fetch-daily-matches] 匹配联赛后剩余 ${filteredByLeague.length} 场比赛`);

  if (matchesToUpdate.length === 0) {
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

  // 分别更新每个日期的比赛
  let totalRefreshed = 0;
  for (const [date, matches] of matchesByDate.entries()) {
    console.log(`[fetch-daily-matches] 更新 ${date} 的 ${matches.length} 场比赛`);
    await upsertSportsApiMatches(date, matches, ybtyToken, fetchOdds);
    totalRefreshed += matches.length;
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
      
      await upsertSportsApiMatches(targetDate, matches as SportsApiMatch[], ybtyToken, true);

      return new Response(
        JSON.stringify({
          success: true,
          date: targetDate,
          count: matches.length,
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
        await upsertSportsApiMatches(targetDate, todayMatches, ybtyToken, true);
        console.log(`[fetch-daily-matches] 成功存储 ${todayMatches.length} 场比赛（包含赔率信息）`);
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


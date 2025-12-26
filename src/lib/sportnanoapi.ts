import type { CompetitionListResponse, Competition, FixtureResponse, FixturesListResponse, DiaryMatch, DiaryTeam, MatchLiveResponse, MatchLiveData } from "@/types/footballApi";

// API 基础 URL 配置
// 开发环境：使用 Vite 代理
// 生产环境：可通过环境变量 VITE_SPORTNANOAPI_DIRECT=true 启用直接请求（需要 API 支持 CORS）
// 否则使用 Supabase Edge Function 避免 CORS 问题
const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "/api/sportnanoapi/api/v5";
  }
  // 生产环境：检查是否启用直接请求
  if (import.meta.env.VITE_SPORTNANOAPI_DIRECT === 'true') {
    return "https://open.sportnanoapi.com/api/v5"; // 直接请求（需要 API 支持 CORS）
  }
  // 默认使用 Edge Function
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-competitions`;
};

const SPORTNANOAPI_BASE_URL = getBaseUrl();
const SPORTNANOAPI_USER = "nacctsaw";
const SPORTNANOAPI_SECRET = "f0b904438d488e4c3d686b36f69339a6";

// 本地存储键名
const STORAGE_KEY_LAST_UPDATE_TIME = "competitions_last_update_time";
const STORAGE_KEY_MAX_ID = "competitions_max_id";
const STORAGE_KEY_COMPETITIONS = "competitions_cache";

export interface FetchCompetitionsParams {
  id?: number;
  time?: number;
  limit?: number;
}

export interface CompetitionCache {
  competitions: Competition[];
  lastUpdateTime: number;
  maxId: number;
}

/**
 * 获取赛事列表
 * @param params 查询参数
 * @returns 赛事列表响应
 * 
 * 使用说明：
 * 1. 首次全量更新：使用 id 参数（从 0 开始）
 * 2. 后续增量更新：使用 time 参数（时间戳，建议 1 分钟/次）
 * 
 * 注意：id 和 time 不能同时使用
 */
export const fetchCompetitions = async (
  params: FetchCompetitionsParams = {}
): Promise<CompetitionListResponse> => {
  const searchParams = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
  });

  // id 和 time 不能同时使用
  if (params.id !== undefined && params.time !== undefined) {
    throw new Error("Cannot use both 'id' and 'time' parameters at the same time");
  }

  if (params.id !== undefined) {
    searchParams.append("id", params.id.toString());
  }
  if (params.time !== undefined) {
    searchParams.append("time", params.time.toString());
  }
  if (params.limit !== undefined) {
    searchParams.append("limit", Math.min(params.limit, 1000).toString()); // 最大1000
  }

  // 构建 URL：判断是 Edge Function 还是直接请求
  const isEdgeFunction = SPORTNANOAPI_BASE_URL.includes("/functions/v1/");
  const url = isEdgeFunction
    ? `${SPORTNANOAPI_BASE_URL}?${searchParams.toString()}`
    : `${SPORTNANOAPI_BASE_URL}/football/competition/list?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    // 如果使用 Edge Function，需要添加认证头（如果需要）
    ...(isEdgeFunction && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      : {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch competitions: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // 验证响应格式
  if (data.code !== 0) {
    throw new Error(`API returned error code: ${data.code}`);
  }

  return data as CompetitionListResponse;
};

/**
 * 获取缓存的赛事数据
 */
export const getCachedCompetitions = (): CompetitionCache | null => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_COMPETITIONS);
    if (cached) {
      return JSON.parse(cached) as CompetitionCache;
    }
  } catch (error) {
    console.error("Failed to read cached competitions:", error);
  }
  return null;
};

/**
 * 保存赛事数据到缓存
 */
export const saveCompetitionsCache = (competitions: Competition[], lastUpdateTime: number, maxId: number): void => {
  try {
    const cache: CompetitionCache = {
      competitions,
      lastUpdateTime,
      maxId,
    };
    localStorage.setItem(STORAGE_KEY_COMPETITIONS, JSON.stringify(cache));
    localStorage.setItem(STORAGE_KEY_LAST_UPDATE_TIME, lastUpdateTime.toString());
    localStorage.setItem(STORAGE_KEY_MAX_ID, maxId.toString());
  } catch (error) {
    console.error("Failed to save competitions cache:", error);
  }
};

/**
 * 获取全量赛事数据（首次加载）
 * 根据 id 参数获取全量数据，自动处理分页
 * @returns 所有赛事数据
 */
export const fetchAllCompetitions = async (): Promise<Competition[]> => {
  const allCompetitions: Competition[] = [];
  let currentId = 0;
  const limit = 1000;

  while (true) {
    const response = await fetchCompetitions({ id: currentId, limit });
    const { results, query } = response;

    if (!results || results.length === 0) {
      break;
    }

    allCompetitions.push(...results);

    // 如果返回的数据少于limit，说明已经获取完所有数据
    if (results.length < limit || !query.max_id) {
      break;
    }

    // 更新currentId为返回的最大ID+1，继续获取下一批
    // 使用 max_id + 1 确保获取所有数据
    currentId = (query.max_id || 0) + 1;
  }

  return allCompetitions;
};

/**
 * 获取增量赛事数据（根据时间戳）
 * 根据 time 参数增量获取变动数据，建议请求频次：1分钟/次
 * @param lastUpdateTime 上次更新时间戳
 * @returns 增量赛事数据
 */
export const fetchIncrementalCompetitions = async (lastUpdateTime: number): Promise<Competition[]> => {
  const allCompetitions: Competition[] = [];
  let currentTime = lastUpdateTime;
  const limit = 1000;

  while (true) {
    const response = await fetchCompetitions({ time: currentTime, limit });
    const { results, query } = response;

    if (!results || results.length === 0) {
      break;
    }

    allCompetitions.push(...results);

    // 如果返回的数据少于limit，说明已经获取完所有数据
    if (results.length < limit || !query.max_time) {
      break;
    }

    // 更新currentTime为返回的最大时间+1，继续获取下一批
    // 使用 max_time + 1 确保获取所有更新的数据
    currentTime = (query.max_time || 0) + 1;
  }

  return allCompetitions;
};

/**
 * 合并赛事数据（处理新增和更新）
 * 新数据会覆盖旧数据（基于 id）
 * @param existing 现有赛事数据
 * @param newCompetitions 新的赛事数据
 * @returns 合并后的赛事数据（按 id 排序）
 */
export const mergeCompetitions = (
  existing: Competition[],
  newCompetitions: Competition[]
): Competition[] => {
  const competitionMap = new Map<number, Competition>();

  // 先添加现有数据
  existing.forEach((comp) => {
    competitionMap.set(comp.id, comp);
  });

  // 用新数据更新或添加（新数据会覆盖旧数据）
  newCompetitions.forEach((comp) => {
    competitionMap.set(comp.id, comp);
  });

  // 转换为数组并按 id 排序
  return Array.from(competitionMap.values()).sort((a, b) => a.id - b.id);
};

/**
 * 智能获取赛事数据
 * 自动判断是首次全量更新还是增量更新
 * @param forceFullUpdate 强制全量更新
 * @returns 赛事数据和更新信息
 */
export const fetchCompetitionsSmart = async (forceFullUpdate = false): Promise<{
  competitions: Competition[];
  isFullUpdate: boolean;
  lastUpdateTime: number;
  maxId: number;
}> => {
  const cached = getCachedCompetitions();

  // 如果没有缓存或强制全量更新，执行全量更新
  if (!cached || forceFullUpdate) {
    const allCompetitions = await fetchAllCompetitions();
    const maxId = allCompetitions.length > 0 
      ? Math.max(...allCompetitions.map(c => c.id))
      : 0;
    const lastUpdateTime = Date.now();

    saveCompetitionsCache(allCompetitions, lastUpdateTime, maxId);

    return {
      competitions: allCompetitions,
      isFullUpdate: true,
      lastUpdateTime,
      maxId,
    };
  }

  // 执行增量更新
  const incrementalCompetitions = await fetchIncrementalCompetitions(cached.lastUpdateTime);
  
  if (incrementalCompetitions.length === 0) {
    // 没有新数据，返回缓存的数据
    return {
      competitions: cached.competitions,
      isFullUpdate: false,
      lastUpdateTime: cached.lastUpdateTime,
      maxId: cached.maxId,
    };
  }

  // 合并数据
  const mergedCompetitions = mergeCompetitions(cached.competitions, incrementalCompetitions);
  const maxId = Math.max(cached.maxId, ...incrementalCompetitions.map(c => c.id));
  const lastUpdateTime = Date.now();

  saveCompetitionsCache(mergedCompetitions, lastUpdateTime, maxId);

  return {
    competitions: mergedCompetitions,
    isFullUpdate: false,
    lastUpdateTime,
    maxId,
  };
};

/**
 * 获取比赛列表（Fixtures）
 * @param params 查询参数
 * @returns 比赛列表响应
 * 
 * 请求参数说明：
 * - user: 必填，string，用户名
 * - secret: 必填，string，用户密钥
 * - id: 可选，integer，查询大于等于id的记录，根据id排序
 * - time: 可选，integer，查询大于等于更新时间的记录(时间戳)，根据更新时间排序
 * - limit: 可选，integer，返回数据最大数，默认为1000，最大为1000
 * 
 * 注意：id 和 time 不能同时使用
 */
export interface FetchFixturesParams {
  id?: number; // 查询大于等于id的记录，根据id排序
  time?: number; // 查询大于等于更新时间的记录(时间戳)，根据更新时间排序
  limit?: number; // 返回数据最大数，默认为1000，最大为1000
  date?: string; // 日期，格式：yyyymmdd（如：20200101），必填
  league?: number; // 联赛ID
  season?: number; // 赛季
  team?: number; // 球队ID
  live?: string; // 'all' | 'id-id' (比赛ID范围)
  timezone?: string; // 时区
}


export const fetchFixtures = async (
  params: FetchFixturesParams = {}
): Promise<FixturesListResponse> => {
  // 使用统一的 baseUrl 配置
  const baseUrl = getBaseUrl();
  
  const searchParams = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
    endpoint: "match/schedule/diary", // 指定使用比赛日程端点
  });

  // id 和 time 不能同时使用
  if (params.id !== undefined && params.time !== undefined) {
    throw new Error("Cannot use both 'id' and 'time' parameters at the same time");
  }

  // 核心参数：id, time, limit
  if (params.id !== undefined) {
    searchParams.append("id", params.id.toString());
  }
  if (params.time !== undefined) {
    searchParams.append("time", params.time.toString());
  }
  if (params.limit !== undefined) {
    searchParams.append("limit", Math.min(params.limit, 1000).toString()); // 最大1000
  }

  // date 参数是必填的，格式：yyyymmdd
  let dateParam = params.date;
  if (!dateParam) {
    // 如果没有提供 date，使用当前日期，格式转换为 yyyymmdd
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateParam = `${year}${month}${day}`;
  } else {
    // 如果提供了 date，确保格式是 yyyymmdd（移除可能的连字符）
    dateParam = dateParam.replace(/-/g, '');
  }
  searchParams.append("date", dateParam);
  if (params.league) {
    searchParams.append("league", params.league.toString());
  }
  if (params.season) {
    searchParams.append("season", params.season.toString());
  }
  if (params.team) {
    searchParams.append("team", params.team.toString());
  }
  if (params.live) {
    searchParams.append("live", params.live);
  }
  if (params.timezone) {
    searchParams.append("timezone", params.timezone);
  }

  // 构建 URL：开发环境使用代理，生产环境使用 Edge Function
  const isEdgeFunction = baseUrl.includes("/functions/v1/");
  const url = isEdgeFunction
    ? `${baseUrl}?${searchParams.toString()}`
    : `${baseUrl}/football/match/schedule/diary?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    // 如果使用 Edge Function，需要添加认证头（如果需要）
    ...(isEdgeFunction && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      : {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch fixtures: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // 验证响应格式
  if (data.code != 0) {
    const errorMsg = data.msg || data.message || 'Unknown error';
    throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
  }

  return data as FixturesListResponse;
};

/**
 * 根据比赛ID获取单个比赛详情
 * @param matchId 比赛ID
 * @returns 比赛详情数据
 */
export const fetchMatchDetail = async (matchId: string | number): Promise<{
  match: DiaryMatch | null;
  teams: DiaryTeam[];
  competitions: Competition[];
}> => {
  // 先尝试从今天的比赛列表中查找
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  try {
    const response = await fetchFixtures({ 
      date: dateStr,
      limit: 1000
    });
    
    if (response?.results?.match) {
      const matchIdNum = typeof matchId === 'string' ? parseInt(matchId) : matchId;
      const foundMatch = response.results.match.find((m: DiaryMatch) => m.id === matchIdNum);
      
      if (foundMatch) {
        return {
          match: foundMatch,
          teams: Array.isArray(response.results.team) ? response.results.team : [],
          competitions: Array.isArray(response.results.competition) ? response.results.competition : []
        };
      }
    }
    
    // 如果今天没找到，尝试查找昨天和明天的数据
    const datesToTry = [
      dateStr, // 今天
      // 可以添加昨天和明天的日期
    ];
    
    for (const date of datesToTry) {
      try {
        const response = await fetchFixtures({ 
          date,
          limit: 1000
        });
        
        if (response?.results?.match) {
          const matchIdNum = typeof matchId === 'string' ? parseInt(matchId) : matchId;
          const foundMatch = response.results.match.find((m: DiaryMatch) => m.id === matchIdNum);
          
          if (foundMatch) {
            return {
              match: foundMatch,
              teams: Array.isArray(response.results.team) ? response.results.team : [],
              competitions: Array.isArray(response.results.competition) ? response.results.competition : []
            };
          }
        }
      } catch (error) {
        // 继续尝试下一个日期
        continue;
      }
    }
    
    return {
      match: null,
      teams: [],
      competitions: []
    };
  } catch (error) {
    console.error('Failed to fetch match detail:', error);
    throw error;
  }
};

/**
 * 获取实时比赛数据
 * @param matchId 比赛ID（可选，如果不提供则返回所有实时比赛）
 * @returns 实时比赛数据响应
 */
export const fetchMatchLive = async (matchId?: string | number): Promise<MatchLiveResponse> => {
  const baseUrl = getBaseUrl();

  const searchParams = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
  });

  // 如果提供了 matchId，可以添加到参数中（根据 API 文档，可能需要 id 参数）
  if (matchId !== undefined) {
    searchParams.append("id", matchId.toString());
  }

  // 构建 URL：开发环境使用代理，生产环境使用 Edge Function
  const isEdgeFunction = baseUrl.includes("/functions/v1/");
  const url = isEdgeFunction
    ? `${baseUrl}?endpoint=match/live&${searchParams.toString()}`
    : `${baseUrl}/football/match/live?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch match live data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // 检查 API 返回的错误
  if (data.code !== undefined && data.code !== 0) {
    const errorMsg = data.msg || data.message || 'Unknown error';
    throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
  }

  // 转换返回数据格式
  // API 可能返回两种格式：
  // 1. 数组格式: [id, score, stats?, incidents?, tlive?]
  // 2. 对象格式: { id, score, stats, incidents, tlive }
  // 其中 score 本身也是一个数组: [纳米比赛id, 比赛状态, [主队比分数组], [客队比分数组], 开球时间戳, 备注]
  const transformedResults: MatchLiveData[] = (data.results || []).map((item: any) => {
    let id: number;
    let scoreData: any;
    let stats: any;
    let incidents: any;
    let tlive: any;
    
    // 判断是对象格式还是数组格式
    if (Array.isArray(item)) {
      // 数组格式: [id, score, stats?, incidents?, tlive?]
      if (item.length < 2) {
        console.warn('Invalid match live data format (array):', item);
        return null;
      }
      [id, scoreData, stats, incidents, tlive] = item;
    } else if (typeof item === 'object' && item !== null) {
      // 对象格式: { id, score, stats, incidents, tlive }
      id = item.id;
      scoreData = item.score;
      stats = item.stats;
      incidents = item.incidents;
      tlive = item.tlive;
    } else {
      console.warn('Invalid match live data format:', item);
      return null;
    }
    
    // 解析 score 数据
    // scoreData 的结构: [纳米比赛id, 比赛状态, [主队比分数组], [客队比分数组], 开球时间戳, 备注]
    if (!Array.isArray(scoreData) || scoreData.length < 6) {
      console.warn('Invalid score data format:', scoreData);
      return null;
    }
    
    const [matchId, status, homeScores, awayScores, kickoffTime, note] = scoreData;
    
    return {
      id: id || matchId,
      score: {
        id: matchId,
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
  }).filter((item): item is MatchLiveData => item !== null);

  return {
    code: data.code || 0,
    results: transformedResults,
  };
};

/**
 * 根据比赛ID获取单个比赛的实时数据
 * @param matchId 比赛ID
 * @returns 实时比赛数据，如果未找到则返回 null
 */
export const fetchMatchLiveById = async (matchId: string | number): Promise<MatchLiveData | null> => {
  const response = await fetchMatchLive(matchId);
  
  if (response.results && response.results.length > 0) {
    const matchIdNum = typeof matchId === 'string' ? parseInt(matchId) : matchId;
    return response.results.find(m => m.id === matchIdNum) || null;
  }
  
  return null;
};

/**
 * 指数数据项类型
 */
export type OddsLiveResultItem = [
  number, // 比赛id
  string, // 指数类型：asia-亚盘、eu-欧赔、bs-大小球、cr-角球
  [
    number, // 变化时间
    string, // 比赛进行时间，未开始为空
    string, // 主胜/大球/大,和局/盘口,客胜/小球/小,是否封盘：1-封盘,0-未封盘
    number  // 比赛状态
  ],
  string   // 进球比分/角球比(cr)，主队-客队
];

/**
 * 指数数据响应类型
 * results 是一个对象，key 为公司ID（字符串），value 为该公司的数据数组
 */
export interface OddsLiveResponse {
  code: number;
  results: Record<string, OddsLiveResultItem[]>;
}

/**
 * 指数公司ID映射
 */
export const ODDS_COMPANY_NAMES: Record<number, string> = {
  2: 'BET365',
  3: '皇冠',
  4: '10BET',
  5: '立博',
  6: '明陞',
  7: '澳彩',
  8: 'SNAI',
  9: '威廉希尔',
  10: '易胜博',
  11: '韦德',
  12: 'EuroBet',
  13: 'Inter wetten',
  14: '12bet',
  15: '利记',
  16: '盈禾',
  17: '18Bet',
  18: 'Fun88',
  19: '竞彩官方',
  20: 'onex',
  21: '188',
  22: '平博',
  136: '马会',
};

/**
 * 获取实时指数数据
 * @param matchId 比赛ID
 * @param companyIds 指数公司ID数组，如果不提供则获取常用公司数据（默认：澳彩、皇冠、BET365、韦德、易胜博）
 * @returns 指数数据响应
 */
export const fetchOddsLive = async (
  matchId: string | number,
  companyIds: number[] = [7, 3, 2, 11, 10] // 默认：澳彩、皇冠、BET365、韦德、易胜博
): Promise<OddsLiveResponse> => {
  const baseUrl = getBaseUrl();

  const searchParams = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
  });

  // 根据API文档，公司ID是数组参数
  // 尝试使用数组格式：company[]=7&company[]=3（PHP风格的数组参数）
  if (companyIds.length > 0) {
    companyIds.forEach(id => {
      searchParams.append('company[]', id.toString());
    });
  }

  // 构建 URL
  const isEdgeFunction = baseUrl.includes("/functions/v1/");
  const url = isEdgeFunction
    ? `${baseUrl}?endpoint=odds/live&${searchParams.toString()}`
    : `${baseUrl}/football/odds/live?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: "GET",
    ...(isEdgeFunction && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      : {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch odds live data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // 检查 API 返回的错误
  if (data.code !== undefined && data.code !== 0) {
    const errorMsg = data.msg || data.message || 'Unknown error';
    throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
  }

  // 确保返回的数据格式正确
  if (!data.results || typeof data.results !== 'object' || Array.isArray(data.results)) {
    return { code: data.code || 0, results: {} };
  }

  return data as OddsLiveResponse;
};

/**
 * 比赛趋势数据响应类型
 */
export interface MatchTrendResponse {
  code: number;
  results: Array<{
    match_id: number;
    trend: {
      count: number; // 半场数
      per: number;   // 半场时长
      data: Array<number[]>; // [上半场趋势数组, 下半场趋势数组]
    };
    incidents: Array<{
      type: number;      // 类型，详见状态码->技术统计
      time: string;     // 时间(分钟)，可能包含 "+" 符号，如 "45+3"
      position: number; // 事件发生方 1-主队、2-客队
    }>;
  }>;
}

/**
 * 获取比赛趋势数据
 * @param matchId 比赛ID
 * @returns 趋势数据响应
 */
export const fetchMatchTrend = async (
  matchId: string | number
): Promise<MatchTrendResponse> => {
  const baseUrl = getBaseUrl();

  const searchParams = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
  });

  // 构建 URL
  const isEdgeFunction = baseUrl.includes("/functions/v1/");
  const url = isEdgeFunction
    ? `${baseUrl}?endpoint=match/trend/live&${searchParams.toString()}`
    : `${baseUrl}/football/match/trend/live?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    ...(isEdgeFunction && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      : {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch match trend data: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // 检查 API 返回的错误
  if (data.code !== undefined && data.code !== 0) {
    const errorMsg = data.msg || data.message || 'Unknown error';
    throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
  }

  // 确保返回的数据格式正确
  if (!data.results || !Array.isArray(data.results)) {
    return { code: data.code || 0, results: [] };
  }

  return data as MatchTrendResponse;
};

/**
 * 获取比赛趋势详情数据（用于查缺补漏）
 * 当实时趋势数据有缺失或未获取到时，使用此接口进行补充
 * @param matchId 比赛ID
 * @returns 趋势数据响应（格式与实时接口相同）
 */
export const fetchMatchTrendDetail = async (
  matchId: string | number
): Promise<MatchTrendResponse> => {
  const baseUrl = getBaseUrl();

  const searchParams = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
    id: matchId.toString(),
  });

  // 构建 URL
  const isEdgeFunction = baseUrl.includes("/functions/v1/");
  const url = isEdgeFunction
    ? `${baseUrl}?endpoint=match/trend/detail&${searchParams.toString()}`
    : `${baseUrl}/football/match/trend/detail?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    ...(isEdgeFunction && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      : {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch match trend detail: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // 检查 API 返回的错误
  if (data.code !== undefined && data.code !== 0) {
    const errorMsg = data.msg || data.message || 'Unknown error';
    throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
  }

  // 详情接口的返回格式与实时接口不同
  // 详情接口：{ code: 0, results: { count, per, data, incidents } }
  // 实时接口：{ code: 0, results: [{ match_id, trend: { count, per, data }, incidents }] }
  // 需要转换为统一格式
  if (data.results && typeof data.results === 'object' && !Array.isArray(data.results)) {
    // 详情接口格式：results 是对象，包含 trend 数据
    const detailResults = data.results;
    if (detailResults.data && Array.isArray(detailResults.data)) {
      // 转换为实时接口格式
      const matchIdNum = typeof matchId === 'string' ? parseInt(matchId) : matchId;
      return {
        code: data.code || 0,
        results: [{
          match_id: matchIdNum,
          trend: {
            count: detailResults.count || 2,
            per: detailResults.per || 45,
            data: detailResults.data,
          },
          incidents: detailResults.incidents || [],
        }],
      } as MatchTrendResponse;
    }
  }

  // 如果已经是数组格式（实时接口格式），直接返回
  if (data.results && Array.isArray(data.results)) {
    return data as MatchTrendResponse;
  }

  // 格式不正确，返回空结果
  return { code: data.code || 0, results: [] };
};

/**
 * 阵容数据响应类型
 */
export interface MatchLineupResponse {
  code: number;
  results: {
    confirmed: number; // 正式阵容 1-是、0-不是
    home_formation: string; // 主队阵型
    away_formation: string; // 客队阵型
    home_coach_id: number; // 主队带队教练
    away_coach_id: number; // 客队带队教练
    home_color: string; // 主队球衣颜色
    away_color: string; // 客队球衣颜色
    home: Array<{
      id: number; // 球员id
      team_id: number; // 球队id
      first: number; // 是否首发，1-是、0-否
      captain: number; // 是否队长，1-是、0-否
      name: string; // 球员名称
      logo: string; // 球员logo
      national_logo: string; // 球员logo(国家队)
      shirt_number: number; // 球衣号
      position: string; // 球员位置，F前锋、M中场、D后卫、G守门员、其他为未知
      x: number; // 阵容x坐标，总共100
      y: number; // 阵容y坐标，总共100
      rating: string; // 评分，10为满分
      incidents?: Array<{
        type: number; // 事件类型
        time: string; // 事件发生时间（含加时时间，'A+B':A-比赛时间,B-加时时间）
        belong: number; // 发生方，0-中立、1-主队、2-客队
        home_score: number; // 主队比分
        away_score: number; // 客队比分
        player?: {
          id: number; // 球员id
          name: string; // 中文名称
          reason_type?: number; // 红黄牌、换人事件原因
        };
        assist1?: {
          id: number;
          name: string;
        };
        assist2?: {
          id: number;
          name: string;
        };
        in_player?: {
          id: number;
          name: string;
        };
        out_player?: {
          id: number;
          name: string;
        };
      }>;
    }>;
    away: Array<{
      id: number;
      team_id: number;
      first: number;
      captain: number;
      name: string;
      logo: string;
      national_logo: string;
      shirt_number: number;
      position: string;
      x: number;
      y: number;
      rating: string;
      incidents?: Array<{
        type: number;
        time: string;
        belong: number;
        home_score: number;
        away_score: number;
        player?: {
          id: number;
          name: string;
          reason_type?: number;
        };
        assist1?: {
          id: number;
          name: string;
        };
        assist2?: {
          id: number;
          name: string;
        };
        in_player?: {
          id: number;
          name: string;
        };
        out_player?: {
          id: number;
          name: string;
        };
      }>;
    }>;
  };
}

/**
 * 获取比赛阵容数据
 * @param matchId 比赛ID
 * @returns 阵容数据响应
 */
export const fetchMatchLineup = async (
  matchId: string | number
): Promise<MatchLineupResponse> => {
  const baseUrl = getBaseUrl();

  const searchParams = new URLSearchParams({
    user: SPORTNANOAPI_USER,
    secret: SPORTNANOAPI_SECRET,
    id: matchId.toString(),
  });

  // 构建 URL
  const isEdgeFunction = baseUrl.includes("/functions/v1/");
  const url = isEdgeFunction
    ? `${baseUrl}?endpoint=match/lineup/detail&${searchParams.toString()}`
    : `${baseUrl}/football/match/lineup/detail?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    ...(isEdgeFunction && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ? {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      : {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch match lineup: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // 检查 API 返回的错误
  if (data.code !== undefined && data.code !== 0) {
    const errorMsg = data.msg || data.message || 'Unknown error';
    throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
  }

  // 确保返回的数据格式正确
  if (!data.results || typeof data.results !== 'object') {
    throw new Error('Invalid lineup response format');
  }

  return data as MatchLineupResponse;
};


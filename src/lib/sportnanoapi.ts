import type { CompetitionListResponse, Competition, FixtureResponse, FixturesListResponse, DiaryMatch, DiaryTeam, MatchLiveResponse, MatchLiveData } from "@/types/footballApi";

// 开发环境使用 Vite 代理，生产环境使用 Supabase Edge Function 避免 CORS 问题
const SPORTNANOAPI_BASE_URL = import.meta.env.DEV
  ? "/api/sportnanoapi/api/v5"
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-competitions`;
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

  // 构建 URL：开发环境使用代理，生产环境使用 Edge Function
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
  // 开发环境使用 Vite 代理，生产环境使用 Supabase Edge Function 避免 CORS 问题
  const baseUrl = import.meta.env.DEV
    ? "/api/sportnanoapi/api/v5"
    : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-competitions`;
  
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
  const baseUrl = import.meta.env.DEV
    ? "/api/sportnanoapi/api/v5"
    : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-competitions`;

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
  const baseUrl = import.meta.env.DEV
    ? "/api/sportnanoapi/api/v5"
    : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-competitions`;

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
  
  console.log('Fetching odds live data:', { matchId, companyIds, url });

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
  console.log('Odds API raw response:', data);

  // 检查 API 返回的错误
  if (data.code !== undefined && data.code !== 0) {
    const errorMsg = data.msg || data.message || 'Unknown error';
    throw new Error(`API returned error code: ${data.code} - ${errorMsg}`);
  }

  // 确保返回的数据格式正确
  if (!data.results || typeof data.results !== 'object' || Array.isArray(data.results)) {
    console.warn('Invalid odds response format:', data);
    return { code: data.code || 0, results: {} };
  }

  return data as OddsLiveResponse;
};


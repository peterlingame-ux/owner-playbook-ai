import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const ANALYSIS_TABLE = "ai_match_analyses";
const AUTO_BET_TABLE = "ai_auto_bets";
const AI_BALANCES_TABLE = "ai_balances";
const SIM_POSITIONS_TABLE = "sim_positions";
const DAILY_MATCHES_TABLE = "daily_matches";

// 番茄体育API相关常量
const FQTY_API_BASE_URL = "https://api.j7nwyhqg.com/yewu11/v1/m/matchDetail";

// AI 虚拟资金初始值
const INITIAL_AI_BALANCE = 10000;

type ModelConfig = {
  id: string;
  displayName: string;
  model: string;
};

type MatchInfo = {
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
};

type BetInfo = {
  betType: string;
  prediction: string;
  confidence: number;
  odds: number;
  betAmount: number;
  handicapLine?: number;
  overUnderLine?: number;
  overUnderPick?: string;
};

type AllPredictions = {
  moneyline?: {
    prediction: string;
    confidence: number;
    odds?: number;
  };
  overUnder?: {
    prediction: string;
    line: number;
    confidence: number;
    odds?: number;
  };
  handicap?: {
    prediction: string;
    line: number;
    confidence: number;
    odds?: number;
  };
  primaryBet?: BetInfo; // 主要投注（用于下注决策）
  allMarketOdds?: MarketOdds; // 所有市场赔率（大小球和让球盘的所有盘口）
};

type StrategyConfig = {
  minConfidence?: number;
  baseStake?: number;
  stakeMultiplier?: number;
  maxStake?: number;
  forceBet?: boolean;
  balanceId?: string;
};

type AiBetRequest = {
  aiId?: string;
  aiDisplayName?: string;
  betInfo: BetInfo;
  strategy?: StrategyConfig;
  autoBet?: boolean;
};

type MatchRequest = {
  matchId?: number;
  matchInfo: MatchInfo;
  aiBets: AiBetRequest[];
};

type RequestBody = {
  matches?: MatchRequest[];
  strategy?: StrategyConfig;
  autoBet?: boolean;
  matchId?: number;
  matchInfo?: MatchInfo;
  betInfo?: BetInfo;
  aiModel?: string;
  aiId?: string;
};

type ModelAnalysisResult = ModelConfig & {
  analysis?: string;
  error?: string;
  latencyMs?: number;
};

type StoredAnalysisResult = {
  id: number | null;
  modelId: string;
};

type AutoBetResult = {
  placed: boolean;
  reason?: string;
  recordId?: number;
  stake?: number;
  positionId?: number | null;
};

type BalanceRecord = {
  id: number;
  ai_id: string | null;
  available_balance: number;
  locked_balance: number;
  currency: string;
  updated_at: string;
  last_position_id?: number | null;
};

type PositionRecord = {
  id: number;
};

const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "deepseek",
    displayName: "DeepSeek Terminus",
    model: "deepseek/deepseek-v3.1-terminus",
  },
  { id: "gpt5", displayName: "OpenAI GPT-5", model: "openai/gpt-5" },
  {
    id: "claude",
    displayName: "Claude 4.5 Sonnet",
    model: "anthropic/claude-sonnet-4.5",
  },
  { id: "grok", displayName: "xAI Grok 4", model: "x-ai/grok-4" },
  {
    id: "gemini",
    displayName: "Gemini 2.5 Pro",
    model: "google/gemini-2.5-pro",
  },
  {
    id: "hunsoccermax",
    displayName: "HUNSOCCER MAX",
    model: "qwen/qwen3-235b-a22b-2507", // 使用 DeepSeek 作为基础模型，或根据实际情况配置
  },
];

const buildSystemPrompt = (userTrainingData?: string[]) => {
  let prompt = `你是一位专业的足球赛事分析专家。请从以下三个维度进行深度分析：

1. **球队老板层面分析**：分析球队投资、战略布局、近期管理层动态
2. **球员技术面拆解**：分析关键球员状态、战术体系、阵容配置
3. **异常赔率监测**：分析赔率波动、市场热度、投注趋势

最后给出综合判断和投注建议。请用专业、简洁的语言，重点突出关键信息。`;

  // 如果有用户训练数据，注入到系统提示词中
  if (userTrainingData && userTrainingData.length > 0) {
    prompt += `\n\n**重要：您的专属分析偏好与知识库**\n`;
    prompt += `以下是从您之前的训练数据中提取的关键观点和分析偏好，请在分析时重点参考这些内容：\n\n`;
    userTrainingData.forEach((data, index) => {
      prompt += `${index + 1}. ${data}\n`;
    });
    prompt += `\n请结合以上您的专属知识，给出更符合您分析风格的预测。`;
  }

  return prompt;
};

type MarketOdds = {
  overUnder?: Array<{ line: number | string; over: number; under: number }>; // line 可以是数字或字符串（如 "2.5/3", "2/2.5"）
  handicap?: Array<{ line: number | string; home: number; away: number }>; // line 可以是数字或字符串（如 "-1/1.5"）
};

// 赔率范围限制：只选择大于等于 1.7 的赔率（无上限）
const MIN_ODDS = 1.7;

// 检查赔率是否在有效范围内（只检查最小值，无上限）
const isOddsInRange = (odds: number): boolean => {
  return odds >= MIN_ODDS;
};

const buildUserPrompt = (
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  aiModel: string,
  isDefaultBetInfo: boolean = false,
  marketOdds?: MarketOdds,
) => {
  const basePrompt = `请分析以下比赛：

**比赛信息**
- 联赛：${matchInfo.league}
- 主队：${matchInfo.homeTeam}
- 客队：${matchInfo.awayTeam}
- 当前比分：${matchInfo.homeScore ?? 0} - ${matchInfo.awayScore ?? 0}
- 比赛状态：${matchInfo.status === "live" ? "进行中" : "即将开始"}`;

  // 构建赔率信息部分
  let oddsInfo = '';
  if (marketOdds) {
    oddsInfo = '\n\n**市场赔率信息**\n';
    
    if (marketOdds.overUnder && marketOdds.overUnder.length > 0) {
      oddsInfo += '\n大小球赔率：\n';
      marketOdds.overUnder.forEach(ou => {
        oddsInfo += `- ${ou.line}球：大球 ${ou.over.toFixed(2)} | 小球 ${ou.under.toFixed(2)}\n`;
      });
    }
    
    if (marketOdds.handicap && marketOdds.handicap.length > 0) {
      oddsInfo += '\n让球盘赔率：\n';
      marketOdds.handicap.forEach(h => {
        // line 可能是数字或字符串（如 "-1/1.5"），直接转换为字符串显示
        let lineStr: string;
        if (typeof h.line === 'number') {
          lineStr = h.line > 0 ? `+${h.line}` : h.line.toString();
        } else {
          lineStr = String(h.line);
        }
        oddsInfo += `- ${lineStr}：主队 ${h.home.toFixed(2)} | 客队 ${h.away.toFixed(2)}\n`;
      });
    }
  }

  if (isDefaultBetInfo) {
    return `${basePrompt}${oddsInfo}

请从老板层面、技术层面、赔率层面进行全面分析，并给出最终投注建议。

IMPORTANT: 在分析的最后，请直接提供你的预测（不要添加任何标题如"### 最后的预测输出"），格式如下（必须同时提供输赢、大小球和让球盘预测）：

1. 输赢预测：
PREDICTION_MONEYLINE: [HOME_WIN/AWAY_WIN/DRAW] [confidence 0-100]

2. 大小球预测：
PREDICTION_OVER_UNDER: [OVER/UNDER] [line 2.5/3.0/3.5等] [confidence 0-100]
注意：请从上面提供的市场赔率中选择合适的 line 值，确保该 line 在市场赔率中存在。

3. 让球盘预测：
PREDICTION_HANDICAP: [HOME/AWAY] [line -1.5/-0.5/0.5/1.5等] [confidence 0-100]
注意：请从上面提供的市场赔率中选择合适的 line 值，确保该 line 在市场赔率中存在。

例如：
PREDICTION_MONEYLINE: HOME_WIN 75
PREDICTION_OVER_UNDER: OVER 2.5 68
PREDICTION_HANDICAP: HOME 0.5 72

或
PREDICTION_MONEYLINE: AWAY_WIN 70
PREDICTION_OVER_UNDER: UNDER 3.0 72
PREDICTION_HANDICAP: AWAY -0.5 65

注意：
- 如果对某个投注类型没有信心（置信度低于50），可以不提供该预测
- 输赢预测：HOME_WIN 表示主队获胜，AWAY_WIN 表示客队获胜，DRAW 表示平局
- 大小球的 line 值必须从上面提供的市场赔率中选择
- 让球盘的 line 值必须从上面提供的市场赔率中选择
- HOME 表示主队让球，AWAY 表示客队让球
- 请直接在分析内容后输出预测，不要添加任何标题或分隔符`;
  }

  return `${basePrompt}

**AI模型预测**
- AI模型：${aiModel}
- 投注类型：${betInfo.betType === "handicap" ? "让球盘" : betInfo.betType === "over_under" ? "大小球" : "独赢"}
- 预测：${betInfo.prediction}
- 置信度：${betInfo.confidence}%
- 赔率：${betInfo.odds}
- 投注金额：${betInfo.betAmount}

请从老板层面、技术层面、赔率层面进行全面分析，并给出最终投注建议。`;
};

// 格式化分析结果：去除"### 最后的预测输出"部分，只保留置信度最高的预测，用中文显示
const formatAnalysisResult = (
  analysis: string | null,
  allPredictions?: AllPredictions
): string | null => {
  if (!analysis) {
    return null;
  }

  // 去除 "### 最后的预测输出" 及其之后的内容
  const lines = analysis.split('\n');
  let formattedLines: string[] = [];
  let foundPredictionSection = false;

  for (const line of lines) {
    // 检查是否是 "### 最后的预测输出" 或类似标题
    if (line.trim().match(/^###\s*最后的预测输出/i) || 
        line.trim().match(/^###\s*预测输出/i) ||
        line.trim().match(/^##\s*最后的预测输出/i) ||
        line.trim().match(/^##\s*预测输出/i)) {
      foundPredictionSection = true;
      break;
    }
    formattedLines.push(line);
  }

  // 如果找到了预测部分，使用格式化后的内容；否则使用原始内容
  let baseAnalysis = foundPredictionSection 
    ? formattedLines.join('\n').trim()
    : analysis.trim();

  // 如果有预测信息，添加置信度最高的预测（中文显示）
  if (allPredictions) {
    const predictions: Array<{
      type: string;
      prediction: string;
      confidence: number;
      line?: number | string;
    }> = [];

    if (allPredictions.overUnder) {
      predictions.push({
        type: '大小球',
        prediction: allPredictions.overUnder.prediction === 'OVER' ? '大' : '小',
        confidence: allPredictions.overUnder.confidence,
        line: allPredictions.overUnder.line,
      });
    }

    if (allPredictions.handicap) {
      predictions.push({
        type: '让球盘',
        prediction: allPredictions.handicap.prediction === 'HOME' ? '主队' : '客队',
        confidence: allPredictions.handicap.confidence,
        line: allPredictions.handicap.line,
      });
    }

    if (allPredictions.moneyline) {
      let moneylinePrediction = '';
      if (allPredictions.moneyline.prediction === 'HOME_WIN') {
        moneylinePrediction = '主队胜';
      } else if (allPredictions.moneyline.prediction === 'AWAY_WIN') {
        moneylinePrediction = '客队胜';
      } else if (allPredictions.moneyline.prediction === 'DRAW') {
        moneylinePrediction = '平局';
      }
      
      if (moneylinePrediction) {
        predictions.push({
          type: '输赢',
          prediction: moneylinePrediction,
          confidence: allPredictions.moneyline.confidence,
        });
      }
    }

    // 选择置信度最高的预测
    if (predictions.length > 0) {
      const bestPrediction = predictions.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      // 格式化预测文本
      let predictionText = '';
      if (bestPrediction.type === '大小球') {
        predictionText = `大小球：${bestPrediction.prediction} ${bestPrediction.line}，置信度：${bestPrediction.confidence}%`;
      } else if (bestPrediction.type === '让球盘') {
        predictionText = `让球盘：${bestPrediction.prediction} ${bestPrediction.line}，置信度：${bestPrediction.confidence}%`;
      } else if (bestPrediction.type === '输赢') {
        predictionText = `输赢：${bestPrediction.prediction}，置信度：${bestPrediction.confidence}%`;
      }

      if (predictionText) {
        return `${baseAnalysis}\n\n${predictionText}`;
      }
    }
  }

  return baseAnalysis;
};

const DEFAULT_STRATEGY: Required<Pick<StrategyConfig, "minConfidence" | "baseStake">> &
  StrategyConfig = {
    minConfidence: 60,
    baseStake: 800,
    stakeMultiplier: 1.2,
    maxStake: 5000,
    forceBet: false,
  };

const resolveStrategy = (
  globalStrategy?: StrategyConfig,
  aiStrategy?: StrategyConfig,
): StrategyConfig => ({
  ...DEFAULT_STRATEGY,
  ...globalStrategy,
  ...aiStrategy,
});

// 获取当天的比赛
// 获取 UTC+8 时区的日期字符串（YYYY-MM-DD）
const getUTC8DateString = (date: Date): string => {
  // 使用 Intl.DateTimeFormat 获取 UTC+8 时区的日期
  // 格式化为 YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', // UTC+8 时区
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

const getTodayMatches = async () => {
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  // 获取今天和昨天的日期（使用 UTC+8 时区，与数据库存储一致）
  const now = new Date();
  const today = getUTC8DateString(now);
  
  // 计算昨天的日期（UTC+8）
  // 先获取 UTC+8 的当前时间，然后减去 24 小时
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getUTC8DateString(yesterdayDate);
  
  console.log(`[getTodayMatches] 查询比赛: 昨天=${yesterdayStr}, 今天=${today}`);
  
  // 计算时间范围：当前时间往后120分钟内
  const nowSeconds = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
  const maxTimeSeconds = nowSeconds + (120 * 60); // 当前时间 + 120分钟（秒）
  
  console.log(`[getTodayMatches] 时间范围: 当前=${nowSeconds} (${new Date(nowSeconds * 1000).toISOString()}), 最大=${maxTimeSeconds} (${new Date(maxTimeSeconds * 1000).toISOString()})`);
  
  // 查询比赛，过滤未完成的比赛（基于 ended 字段）
  // ended = 0 或 ended 为 null 表示比赛未结束，需要查询
  // ended = 1 表示比赛已结束，不需要查询
  // 不再过滤赔率信息，将在 AI 分析之前获取赔率
  // 只查询当前时间往后120分钟内的比赛
  // 排除推迟的比赛：status_id = 9（推迟）或 13（待定）
  const { data, error } = await supabase
    .from(DAILY_MATCHES_TABLE)
    .select('*')
    .in('date', [yesterdayStr, today])
    .or('ended.is.null,ended.eq.0') // ended 为 null 或 0 表示未结束
    .gte('match_time', nowSeconds) // match_time >= 当前时间
    .lte('match_time', maxTimeSeconds) // match_time <= 当前时间 + 120分钟
    .not('status_id', 'in', '(9,13)') // 排除推迟（9）和待定（13）的比赛
    .order('match_time', { ascending: true }); // 使用 match_time (比赛开始时间戳，秒) 排序

  if (error) {
    console.error('[getTodayMatches] 查询失败:', error);
    throw error;
  }

  // 额外过滤：确保排除推迟的比赛（双重保险）
  const filteredData = (data || []).filter((m: any) => {
    const statusId = m.status_id;
    // status_id = 9（推迟）或 13（待定）的比赛不分析
    if (statusId === 9 || statusId === 13) {
      console.log(`[getTodayMatches] 跳过推迟的比赛: match_id=${m.match_id}, status_id=${statusId}`);
      return false;
    }
    return true;
  });

  console.log(`[getTodayMatches] 查询成功: 找到 ${filteredData.length} 场比赛（当前时间往后120分钟内，已排除推迟的比赛）`);
  if (filteredData.length > 0) {
    console.log(`[getTodayMatches] 比赛详情: ${filteredData.map((m: any) => {
      const matchTime = m.match_time ? new Date(m.match_time * 1000).toISOString() : 'N/A';
      return `match_id=${m.match_id}, ${m.home_team_name || 'N/A'} vs ${m.away_team_name || 'N/A'}, match_time=${matchTime}, status_id=${m.status_id || 'N/A'}`;
    }).join('; ')}`);
  }

  return filteredData;
};

// ========== 赔率获取相关函数（从 fetch-daily-matches/index.ts 复制）==========

// 指数退避重试工具函数
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = '操作'
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error(`[retryWithBackoff] ${operationName} 重试 ${maxRetries} 次后仍然失败:`, error);
        throw error;
      }
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.warn(`[retryWithBackoff] ${operationName} 失败，${delay}ms 后重试 (${i + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${operationName} 重试次数超限`);
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
    console.warn("[match-analysis] 无法从缓存获取 token:", error?.message);
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
      console.warn("[match-analysis] Token 缓存已过期");
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
    console.error("[match-analysis] 解压缩数据失败:", error);
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
        console.log(`[match-analysis] [fetchMatchOddsInfo] 比赛 ${mid} 重试 ${attempt}/${retries}，等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '无法读取错误信息');
        console.warn(`[match-analysis] [fetchMatchOddsInfo] 获取比赛 ${mid} 的赔率信息失败: HTTP ${response.status}, ${errorText.substring(0, 200)}`);
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
          console.warn(`[match-analysis] [fetchMatchOddsInfo] 比赛 ${mid} 遇到限流错误 (code: ${code})，${attempt < retries ? '将重试' : '已达到最大重试次数'}`);
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
            console.log(`[match-analysis] [fetchMatchOddsInfo] 比赛 ${mid} 请求成功但 data 为 null，将重试一次...`);
            const retryDelay = Math.floor(Math.random() * 700) + 800;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        } else {
          console.warn(`[match-analysis] [fetchMatchOddsInfo] 比赛 ${mid} 返回错误码: ${code}, msg: ${(result as { msg?: string }).msg || '未知错误'}`);
        }
      }

      // 如果 data 是 base64 编码的 gzip 压缩字符串，解压缩它
      if (result && typeof result === "object" && "data" in result) {
        const data = result.data;
        if (typeof data === "string" && data.startsWith("H4sI")) {
          console.log(`[match-analysis] [fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据是gzip压缩的，正在解压...`);
          result.data = await decompressGzipData(data);
          console.log(`[match-analysis] [fetchMatchOddsInfo] 比赛 ${mid} 的赔率数据解压完成`);
        }
      }

      return result;
    } catch (error) {
      console.error(`[match-analysis] [fetchMatchOddsInfo] 获取比赛 ${mid} 的赔率信息出错:`, error);
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
    console.error("[match-analysis] [fetchFqtyMatches] 获取番茄体育比赛列表失败:", error);
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
      console.log(`[match-analysis] [findFqtyMatchIdFromCache] 找到匹配: 纳米数据 ${homeTeamName} vs ${awayTeamName} (${matchTime}) -> 番茄体育 mid=${fqtyMatch.mid}`);
      return fqtyMatch.mid;
    }
  }
  
  console.warn(`[match-analysis] [findFqtyMatchIdFromCache] 未找到匹配: 纳米数据 ${homeTeamName} vs ${awayTeamName} (${matchTime})`);
  return null;
};

// ========== 赔率获取相关函数结束 ==========

// 为比赛生成默认的 betInfo（基于 AI 预测）
const generateDefaultBetInfo = (prediction: string, confidence: number): BetInfo => {
  return {
    betType: 'over_under', // 默认使用大小球类型
    prediction: prediction.toUpperCase(),
    confidence: confidence,
    odds: 0, // 默认值为 0，将从数据库 odds_info 中获取真实赔率
    betAmount: 0, // 初始为 0，由策略计算
  };
};

const normalizeMatchesPayload = async (body: RequestBody): Promise<{ matches: MatchRequest[]; error?: string }> => {
  // 获取今天和昨天的日期（使用 UTC+8 时区，与数据库存储一致）
  const now = new Date();
  const today = getUTC8DateString(now);
  // 计算昨天的日期（UTC+8）
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getUTC8DateString(yesterdayDate);
  
  // 如果提供了 matches 数组，过滤出昨天和今天的比赛
  if (Array.isArray(body.matches) && body.matches.length > 0) {
    // 验证比赛是否是昨天或今天的（通过检查 matchId 是否在昨天和今天的比赛中）
    if (supabase) {
      // matchId 是 number 格式（纳米数据API的match_id）
      const matchIds = body.matches.map(m => m.matchId).filter(Boolean);
      if (matchIds.length > 0) {
        // 作为 match_id (INTEGER) 查询
        const { data: todayMatches } = await supabase
          .from(DAILY_MATCHES_TABLE)
          .select('match_id')
          .in('date', [yesterdayStr, today])
          .in('match_id', matchIds.map(id => typeof id === 'string' ? parseInt(id) : id).filter((id): id is number => typeof id === 'number' && !isNaN(id)));
        
        const validMatchIds = new Set((todayMatches || []).map((m: any) => m.match_id));
        const filteredMatches = body.matches.filter(m => {
          if (!m.matchId) return true;
          // 支持 number 格式的 matchId
          const matchIdNum = typeof m.matchId === 'string' ? parseInt(m.matchId) : m.matchId;
          return !isNaN(matchIdNum) && validMatchIds.has(matchIdNum);
        });
        
        if (filteredMatches.length === 0) {
          return {
            matches: [],
            error: "提供的比赛不是昨天或今天的比赛，只分析昨天和今天的比赛数据"
          };
        }
        
        return { matches: filteredMatches };
      }
    }
    return { matches: body.matches };
  }

  // 如果提供了 matchInfo 和 betInfo，验证是否是昨天或今天的比赛
  if (body.matchInfo && body.betInfo) {
    if (body.matchId && supabase) {
      const matchIdNum = typeof body.matchId === 'string' ? parseInt(body.matchId) : body.matchId;
      const { data: matchData } = await supabase
        .from(DAILY_MATCHES_TABLE)
        .select('date')
        .eq('match_id', matchIdNum)
        .single();
      
      if (matchData && matchData.date !== today && matchData.date !== yesterdayStr) {
        return {
          matches: [],
          error: "提供的比赛不是昨天或今天的比赛，只分析昨天和今天的比赛数据"
        };
      }
    }
    
    return {
      matches: [{
        matchId: body.matchId,
        matchInfo: body.matchInfo,
        aiBets: [{
          aiId: body.aiId ?? "manual",
          aiDisplayName: body.aiModel ?? body.aiId ?? "Manual Strategy",
          betInfo: body.betInfo,
          strategy: body.strategy,
          autoBet: body.autoBet,
        }],
      }]
    };
  }

  // 如果都没有提供，查询当天的比赛
  console.log(`[normalizeMatchesPayload] 请求体为空，开始查询当天比赛`);
  try {
    const todayMatches = await getTodayMatches();
    console.log(`[normalizeMatchesPayload] 查询到 ${todayMatches.length} 场当天比赛`);
    
    if (todayMatches.length === 0) {
      console.log(`[normalizeMatchesPayload] 今天没有可用的比赛`);
      return {
        matches: [],
        error: "今天没有可用的比赛。请提供 matchInfo 和 betInfo，或提供 matches 数组。"
      };
    }

    // 限制同时处理的比赛数量，避免 CPU 时间超限
    // Supabase Edge Functions 默认 CPU 时间限制为 60 秒
    // 每场比赛需要调用多个 AI 模型，限制为最多 10 场比赛
    const MAX_MATCHES = 10;
    const selectedMatches = todayMatches.slice(0, MAX_MATCHES);
    if (todayMatches.length > MAX_MATCHES) {
      console.warn(`[normalizeMatchesPayload] 比赛数量 ${todayMatches.length} 超过限制 ${MAX_MATCHES}，只处理前 ${MAX_MATCHES} 场`);
    }
    console.log(`[normalizeMatchesPayload] 处理 ${selectedMatches.length} 场比赛（共 ${todayMatches.length} 场）`);

    // 为每场比赛生成默认的 MatchRequest
    const matches: MatchRequest[] = selectedMatches.map((match) => {
      // 判断比赛状态：根据 status_id 字段判断是否为进行中
      // status_id: 0-未开始, 1-进行中, 2-暂停, 3-已结束, 4-取消, 5-延期
      const isLive = match.status_id === 1 || match.status_id === 2;
      
      // 获取比分：home_scores[0] 和 away_scores[0] 是常规时间比分
      const homeScore = (match.home_scores && Array.isArray(match.home_scores) && match.home_scores.length > 0) 
        ? match.home_scores[0] 
        : 0;
      const awayScore = (match.away_scores && Array.isArray(match.away_scores) && match.away_scores.length > 0) 
        ? match.away_scores[0] 
        : 0;
      
      const matchInfo: MatchInfo = {
        league: match.competition_name || match.competition_name_zh || 'Unknown League',
        homeTeam: match.home_team_name || match.home_team_name_zh || 'Unknown Home Team',
        awayTeam: match.away_team_name || match.away_team_name_zh || 'Unknown Away Team',
        homeScore: homeScore,
        awayScore: awayScore,
        status: isLive ? 'live' : 'upcoming',
      };

      // 为每个 AI 模型生成一个默认的 betInfo
      const aiBets: AiBetRequest[] = MODEL_CONFIGS.map((model) => ({
        aiId: model.id,
        aiDisplayName: model.displayName,
        betInfo: generateDefaultBetInfo('HOME_WIN', 50), // 初始预测，会被 AI 分析覆盖
        strategy: body.strategy,
        autoBet: body.autoBet ?? false,
      }));

      // matchId 使用 match_id (number)
      const matchId: number | undefined = match.match_id;

      return {
        matchId,
        matchInfo,
        aiBets,
      };
    });

    return { matches };
  } catch (error) {
    return {
      matches: [],
      error: `查询当天比赛失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

const calculateStake = (betInfo: BetInfo, strategy: StrategyConfig) => {
  const base = strategy.baseStake ?? DEFAULT_STRATEGY.baseStake;
  const multiplier = strategy.stakeMultiplier ?? DEFAULT_STRATEGY.stakeMultiplier!;
  const maxStake = strategy.maxStake ?? DEFAULT_STRATEGY.maxStake!;
  const minStake = Math.max(Math.round(base * 0.3), 50);
  const rawStake = Math.round(base * (betInfo.confidence / 100) * multiplier);
  return Math.min(Math.max(rawStake, minStake), maxStake);
};

const shouldPlaceBet = (betInfo: BetInfo, strategy: StrategyConfig) => {
  const minConfidence = strategy.minConfidence ?? DEFAULT_STRATEGY.minConfidence;
  return betInfo.confidence >= minConfidence || strategy.forceBet === true;
};

// 检查是否已有分析记录
const checkExistingAnalysis = async (
  matchId: number | undefined,
  aiId: string | undefined,
): Promise<StoredAnalysisResult[] | null> => {
  if (!supabase || !matchId || !aiId) {
    return null;
  }

  try {
    // 使用 UTC+8 时区获取今天的日期（与数据库存储一致）
    const today = getUTC8DateString(new Date());
    
    // 查询今天是否有该AI对该比赛的分析记录
    // 注意：inserted_at 是 TIMESTAMPTZ，需要转换为 UTC+8 时区的开始时间
    const todayStartUTC8 = new Date(`${today}T00:00:00+08:00`).toISOString();
    // matchId 现在是 number 类型（纳米数据API的match_id）
    const matchIdNum = typeof matchId === 'string' ? parseInt(matchId) : matchId;
    if (isNaN(matchIdNum)) {
      return null;
    }
    const { data, error } = await supabase
      .from(ANALYSIS_TABLE)
      .select('id, provider_model_id, analysis, bet_snapshot')
      .eq('match_id', matchIdNum)
      .eq('ai_id', aiId)
      .gte('inserted_at', todayStartUTC8)
      .order('inserted_at', { ascending: false })
      .limit(1);

    if (error) {
      return null;
    }

    if (data && data.length > 0 && data[0].analysis) {
      // 找到已有分析记录，返回引用
      return [{
        id: data[0].id,
        modelId: data[0].provider_model_id || aiId,
      }];
    }

    return null;
  } catch (error) {
    console.error(`[checkExistingAnalysis] 检查失败:`, error);
    return null;
  }
};

const persistAnalyses = async (
  matchId: number | undefined,
  aiId: string | undefined,
  aiDisplayName: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  analyses: ModelAnalysisResult[],
  allPredictions?: AllPredictions, // 可选的完整预测信息
): Promise<StoredAnalysisResult[]> => {
  if (!supabase) {
    console.warn("[match-analysis] Supabase 客户端未配置，跳过写入");
    return analyses.map((item) => ({ id: null, modelId: item.id }));
  }

  // 构建完整的 bet_snapshot，包含所有预测类型（格式1：完整预测信息）
  // 确保始终使用完整格式，如果没有提供 allPredictions，创建一个最小结构
  const betSnapshot = allPredictions ? {
    ...allPredictions,
    primaryBet: betInfo, // 主要投注信息
  } : {
    primaryBet: betInfo, // 如果没有提供完整预测，至少包含主要投注信息
  };

  const rows = analyses.map((item) => ({
    match_id: matchId ?? null,
    ai_id: aiId ?? null,
    ai_display_name: aiDisplayName,
    provider_model_id: item.id,
    provider_model_name: item.displayName,
    model_identifier: item.model,
    analysis: item.analysis ?? null,
    error: item.error ?? null,
    latency_ms: item.latencyMs ?? null,
    match_snapshot: matchInfo,
    bet_snapshot: betSnapshot,
  }));

  console.log(`[persistAnalyses] 准备保存分析记录: matchId=${matchId}, aiId=${aiId}, aiDisplayName=${aiDisplayName}, rows=${rows.length}`);
  console.log(`[persistAnalyses] 分析结果: ${analyses.map(a => `${a.id}(${a.analysis ? '有分析' : '无分析'}, ${a.error ? '有错误' : '无错误'})`).join(', ')}`);

  // 在保存之前，再次检查是否已有分析记录（防止竞态条件导致的重复插入）
  if (matchId && aiId) {
    const today = getUTC8DateString(new Date());
    const todayStartUTC8 = new Date(`${today}T00:00:00+08:00`).toISOString();
    // matchId 现在是 number 类型（纳米数据API的match_id）
    const matchIdNum = typeof matchId === 'string' ? parseInt(matchId) : matchId;
    if (isNaN(matchIdNum)) {
      return analyses.map((item) => ({ id: null, modelId: item.id }));
    }
    const { data: existingData } = await supabase
      .from(ANALYSIS_TABLE)
      .select('id, provider_model_id, analysis')
      .eq('match_id', matchIdNum)
      .eq('ai_id', aiId)
      .gte('inserted_at', todayStartUTC8)
      .order('inserted_at', { ascending: false })
      .limit(1);
    
    if (existingData && existingData.length > 0 && existingData[0].analysis) {
      // 已有分析记录，返回已有记录的引用
      console.log(`[persistAnalyses] 发现已有分析记录，跳过重复保存: matchId=${matchId}, aiId=${aiId}, existingId=${existingData[0].id}`);
      return [{
        id: existingData[0].id,
        modelId: existingData[0].provider_model_id || rows[0]?.provider_model_id || aiId,
      }];
    }
  }

  const { data, error } = await supabase
    .from(ANALYSIS_TABLE)
    .insert(rows)
    .select("id, provider_model_id");

  if (error) {
    console.error("[persistAnalyses] 写入分析表失败", {
      error,
      matchId,
      aiId,
      aiDisplayName,
      rowsCount: rows.length,
      errorDetails: JSON.stringify(error),
    });
    return analyses.map((item) => ({ id: null, modelId: item.id }));
  }

  console.log(`[persistAnalyses] 成功保存分析记录: ${data?.length || 0} 条记录, IDs: ${data?.map(r => r.id).join(', ') || 'none'}`);
  return data?.map((row) => ({
    id: row.id,
    modelId: row.provider_model_id,
  })) ?? [];
};

const createSimPosition = async (
  matchId: number | undefined,
  aiId: string | undefined,
  aiDisplayName: string,
  betInfo: BetInfo,
  stake: number,
) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(SIM_POSITIONS_TABLE)
    .insert({
      match_id: matchId ?? null,
      ai_id: aiId ?? null,
      ai_display_name: aiDisplayName,
      bet_type: betInfo.betType,
      prediction: betInfo.prediction,
      odds: betInfo.odds,
      stake_amount: stake,
      status: "open",
      metadata: betInfo,
    })
    .select("id")
    .single<PositionRecord>();

  if (error) {
    console.error("[match-analysis] 创建模拟仓位失败", error);
    return null;
  }

  return data?.id ?? null;
};

// 更新余额（锁定投注金额），返回更新结果
const updateBalanceWithStake = async (
  balance: BalanceRecord,
  stake: number,
  positionId: number | null,
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: "Supabase 未配置" };
  }

  // 检查余额是否充足（双重检查，防止并发问题）
  if ((balance.available_balance ?? 0) < stake) {
    return { success: false, error: "余额不足" };
  }

  const newAvailable = (balance.available_balance ?? 0) - stake;
  const newLocked = (balance.locked_balance ?? 0) + stake;

  // 使用乐观锁：检查余额是否被其他操作修改
  const { data: updatedBalance, error } = await supabase
    .from(AI_BALANCES_TABLE)
    .update({
      available_balance: newAvailable,
      locked_balance: newLocked,
      updated_at: new Date().toISOString(),
      last_position_id: positionId,
    })
    .eq("id", balance.id)
    .eq("available_balance", balance.available_balance) // 乐观锁：确保余额未被其他操作修改
    .select()
    .single();

  if (error) {
    console.error("[match-analysis] 更新余额失败", error);
    return { success: false, error: error.message || "更新余额失败" };
  }

  if (!updatedBalance) {
    // 余额被其他操作修改，更新失败
    console.warn(`[match-analysis] 余额更新冲突: balance_id=${balance.id}, 余额可能已被其他操作修改`);
    return { success: false, error: "余额更新冲突，请重试" };
  }

  return { success: true };
};

const createAutoBet = async (
  matchId: number | undefined,
  aiId: string | undefined,
  aiDisplayName: string,
  betInfo: BetInfo,
  stake: number,
  strategy: StrategyConfig,
  analysisRefs: StoredAnalysisResult[],
) => {
  if (!supabase) {
    return {
      placed: false,
      reason: "Supabase 未配置，无法记录下注",
    };
  }

  // 检查是否已经为同一场比赛下过注（防止重复下注）
  if (matchId && aiId) {
    const { data: existingBets } = await supabase
      .from(AUTO_BET_TABLE)
      .select("id, bet_type")
      .eq("match_id", matchId)
      .eq("ai_id", aiId)
      .in("status", ["pending", "won", "lost"]); // 只检查未结算或已结算的投注

    if (existingBets && existingBets.length > 0) {
      console.log(`[match-analysis] 比赛 ${matchId} 已存在投注记录，跳过重复下注`);
      return {
        placed: false,
        reason: `该比赛已存在投注记录（${existingBets.map(b => b.bet_type).join(', ')}）`,
      };
    }
  }

  const { data: balance, error: balanceError } = await supabase
    .from(AI_BALANCES_TABLE)
    .select("*")
    .eq("ai_id", aiId ?? aiDisplayName)
    .single<BalanceRecord>();

  if (balanceError || !balance) {
    console.error("[match-analysis] 查询余额失败或不存在", balanceError);
    return {
      placed: false,
      reason: "账户余额不存在",
    };
  }

  if ((balance?.available_balance ?? 0) < stake) {
    return {
      placed: false,
      reason: "账户余额不足",
    };
  }

  const { data, error } = await supabase
    .from(AUTO_BET_TABLE)
    .insert({
      match_id: matchId ?? null,
      ai_id: aiId ?? null,
      ai_display_name: aiDisplayName,
      bet_type: betInfo.betType,
      prediction: betInfo.prediction,
      confidence: betInfo.confidence,
      odds: betInfo.odds,
      stake_amount: stake,
      status: "pending",
      strategy_config: strategy,
      analysis_reference_ids: analysisRefs
        .map((ref) => ref.id)
        .filter(Boolean),
      // 添加大小球和让球盘相关字段
      handicap_line: betInfo.handicapLine ?? null,
      over_under_line: betInfo.overUnderLine ?? null,
      over_under_pick: betInfo.overUnderPick ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[match-analysis] 记录自动下注失败", error);
    return {
      placed: false,
      reason: "记录自动下注失败",
    };
  }

  // 使用数据库事务确保创建仓位和更新余额的原子性
  try {
    // 先创建仓位
    const positionId = await createSimPosition(
      matchId,
      aiId,
      aiDisplayName,
      betInfo,
      stake,
    );

    if (!positionId) {
      console.error(`[match-analysis] 创建仓位失败，回滚自动下注记录 ${data?.id}`);
      // 删除已创建的自动下注记录
      if (data?.id) {
        await supabase.from(AUTO_BET_TABLE).delete().eq('id', data.id);
      }
      return {
        placed: false,
        reason: "创建仓位失败",
      };
    }

    // 更新余额（锁定投注金额）
    const balanceUpdateResult = await updateBalanceWithStake(balance, stake, positionId);
    
    if (!balanceUpdateResult.success) {
      console.error(`[match-analysis] 更新余额失败，回滚仓位 ${positionId} 和自动下注记录 ${data?.id}`);
      // 回滚：删除仓位和自动下注记录
      if (positionId) {
        await supabase.from(SIM_POSITIONS_TABLE).delete().eq('id', positionId);
      }
      if (data?.id) {
        await supabase.from(AUTO_BET_TABLE).delete().eq('id', data.id);
      }
      return {
        placed: false,
        reason: balanceUpdateResult.error || "更新余额失败",
      };
    }

    console.log(`[match-analysis] 成功下注: match_id=${matchId}, ai_id=${aiId}, bet_type=${betInfo.betType}, stake=${stake}, position_id=${positionId}`);
    
    return {
      placed: true,
      recordId: data?.id,
      stake,
      positionId,
    };
  } catch (error) {
    console.error(`[match-analysis] 下注过程中发生错误:`, error);
    // 回滚：删除已创建的记录
    if (data?.id) {
      await supabase.from(AUTO_BET_TABLE).delete().eq('id', data.id).catch(err => {
        console.error(`[match-analysis] 回滚自动下注记录失败:`, err);
      });
    }
    return {
      placed: false,
      reason: error instanceof Error ? error.message : "下注过程中发生未知错误",
    };
  }
};

// 获取用户的训练数据
const getUserTrainingData = async (userId?: string, limit: number = 10): Promise<string[]> => {
  if (!userId || !supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('ai_training_history' as any)
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[getUserTrainingData] Error fetching training data:', error);
      return [];
    }
    
    return (data || []).map((item: any) => item.content);
  } catch (error) {
    console.error('[getUserTrainingData] Unexpected error:', error);
    return [];
  }
};

// 单个模型分析（用于每个AI独立分析）
const analyzeWithSingleModel = async (
  OPENROUTER_API_KEY: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  modelConfig: ModelConfig,
  isDefaultBetInfo: boolean = false,
  marketOdds?: MarketOdds,
  userId?: string, // 添加可选的 userId 参数
): Promise<ModelAnalysisResult> => {
  // 如果是专属模型且有 userId，获取用户的训练数据
  let userTrainingData: string[] = [];
  if (modelConfig.id === 'hunsoccermax' && userId) {
    userTrainingData = await getUserTrainingData(userId, 10); // 获取最近10条训练数据
  }
  
  const systemPrompt = buildSystemPrompt(userTrainingData.length > 0 ? userTrainingData : undefined);
  const userPrompt = buildUserPrompt(matchInfo, betInfo, modelConfig.displayName, isDefaultBetInfo, marketOdds);
  
  const startedAt = performance.now();
  const API_TIMEOUT = 10000; // 10 秒超时
  
  try {
    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI API 调用超时 (${API_TIMEOUT}ms)`)), API_TIMEOUT);
    });
    
    // 创建 API 请求 Promise
    const fetchPromise = fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://owner-playbook.ai",
        "X-Title": "Owner Playbook AI",
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    
    // 使用 Promise.race 实现超时控制
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `OpenRouter error [${modelConfig.model}]`,
        response.status,
        errorText,
      );

      if (response.status === 429) {
        return {
          ...modelConfig,
          error: "请求过于频繁，请稍后再试",
          latencyMs: performance.now() - startedAt,
        };
      }
      if (response.status === 402) {
        return {
          ...modelConfig,
          error: "额度不足，请充值后继续使用",
          latencyMs: performance.now() - startedAt,
        };
      }

      return {
        ...modelConfig,
        error: "AI分析服务暂时不可用",
        latencyMs: performance.now() - startedAt,
      };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      return {
        ...modelConfig,
        error: "AI未能生成分析结果",
        latencyMs: performance.now() - startedAt,
      };
    }

    return {
      ...modelConfig,
      analysis,
      latencyMs: performance.now() - startedAt,
    };
  } catch (error) {
    console.error(
      `Unexpected error while calling ${modelConfig.model}`,
      error,
    );
    return {
      ...modelConfig,
      error: "AI分析调用失败，请稍后重试",
      latencyMs: performance.now() - startedAt,
    };
  }
};

const analyzeBetWithModels = async (
  OPENROUTER_API_KEY: string,
  matchInfo: MatchInfo,
  betInfo: BetInfo,
  aiModel: string,
  isDefaultBetInfo: boolean = false,
) => {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(matchInfo, betInfo, aiModel, isDefaultBetInfo);

  const analyzeWithModel = async (modelConfig: ModelConfig) => {
    const startedAt = performance.now();
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://owner-playbook.ai",
          "X-Title": "Owner Playbook AI",
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `OpenRouter error [${modelConfig.model}]`,
          response.status,
          errorText,
        );

        if (response.status === 429) {
          return {
            ...modelConfig,
            error: "请求过于频繁，请稍后再试",
            latencyMs: performance.now() - startedAt,
          };
        }
        if (response.status === 402) {
          return {
            ...modelConfig,
            error: "额度不足，请充值后继续使用",
            latencyMs: performance.now() - startedAt,
          };
        }

        return {
          ...modelConfig,
          error: "AI分析服务暂时不可用",
          latencyMs: performance.now() - startedAt,
        };
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content;

      if (!analysis) {
        return {
          ...modelConfig,
          error: "AI未能生成分析结果",
          latencyMs: performance.now() - startedAt,
        };
      }

      return {
        ...modelConfig,
        analysis,
        latencyMs: performance.now() - startedAt,
      };
    } catch (error) {
      console.error(
        `Unexpected error while calling ${modelConfig.model}`,
        error,
      );
      return {
        ...modelConfig,
        error: "AI分析调用失败，请稍后重试",
        latencyMs: performance.now() - startedAt,
      };
    }
  };

  return Promise.all(MODEL_CONFIGS.map(analyzeWithModel));
};

serve(async (req) => {
  console.log(`[match-analysis] ========== 函数被调用 ==========`);
  console.log(`[match-analysis] 请求方法: ${req.method}`);
  console.log(`[match-analysis] 请求URL: ${req.url}`);
  
  if (req.method === "OPTIONS") {
    console.log(`[match-analysis] OPTIONS 请求，返回 CORS 头`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: RequestBody;
    try {
      body = await req.json();
      console.log(`[match-analysis] 请求体解析成功: ${JSON.stringify(body).substring(0, 200)}...`);
    } catch (jsonError) {
      // 如果 JSON 解析失败，使用空对象（将自动查询当天比赛）
      console.warn('[match-analysis] Failed to parse request body, using empty object:', jsonError);
      body = {};
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "OPENROUTER_API_KEY 未配置",
          message: "请在 Supabase 项目设置中配置 OPENROUTER_API_KEY"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[match-analysis] 开始规范化请求体...`);
    const payloadResult = await normalizeMatchesPayload(body);
    console.log(`[match-analysis] 规范化结果: matches数量=${payloadResult.matches?.length || 0}, error=${payloadResult.error || '无'}`);
    
    if (payloadResult.error) {
      // 如果是"今天没有可用的比赛"，返回 200 而不是 400（这是正常情况）
      if (payloadResult.error.includes("今天没有可用的比赛")) {
        return new Response(
          JSON.stringify({ 
            message: payloadResult.error,
            analyses: [],
            results: []
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: payloadResult.error,
          message: "请求格式不正确。请提供 matchInfo 和 betInfo，或提供 matches 数组。如果没有提供，将自动查询当天的比赛。"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matchesPayload = payloadResult.matches;
    
    console.log(`[match-analysis] 准备处理的比赛数量: ${matchesPayload.length}`);
    if (matchesPayload.length > 0) {
      console.log(`[match-analysis] 比赛列表: ${matchesPayload.map(m => `matchId=${m.matchId}, ${m.matchInfo.homeTeam} vs ${m.matchInfo.awayTeam}`).join('; ')}`);
    }
    
    if (matchesPayload.length === 0) {
      console.log(`[match-analysis] 没有找到需要分析的比赛，返回空结果`);
      return new Response(
        JSON.stringify({ 
          message: "没有找到需要分析的比赛",
          analyses: [],
          results: []
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 获取或创建每个 AI 的余额
    const getOrCreateBalance = async (aiId: string, aiDisplayName: string) => {
      if (!supabase) return null;
      
      const { data: existing } = await supabase
        .from(AI_BALANCES_TABLE)
        .select('*')
        .eq('ai_id', aiId)
        .single();
      
      if (existing) return existing;
      
      const { data: newBalance } = await supabase
        .from(AI_BALANCES_TABLE)
        .insert({
          ai_id: aiId,
          ai_display_name: aiDisplayName,
          available_balance: INITIAL_AI_BALANCE,
          locked_balance: 0,
          currency: 'USD',
        })
        .select()
        .single();
      
      return newBalance;
    };

    // 获取今天已下注次数
    const getTodayBetsCount = async (aiId: string) => {
      if (!supabase) return 0;
      // 使用 UTC+8 时区获取今天的日期（与数据库存储一致）
      const today = getUTC8DateString(new Date());
      // inserted_at 是 TIMESTAMPTZ，需要转换为 UTC+8 时区的开始时间
      const todayStartUTC8 = new Date(`${today}T00:00:00+08:00`).toISOString();
      const { count } = await supabase
        .from(AUTO_BET_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('ai_id', aiId)
        .eq('status', 'pending')
        .gte('inserted_at', todayStartUTC8);
      return count || 0;
    };

    const results: Array<{
      matchId?: number;
      aiId?: string;
      aiDisplayName: string;
      analyses: ModelAnalysisResult[];
      analysisRefs: StoredAnalysisResult[];
      primaryAnalysis: string | null;
      autoBet?: AutoBetResult;
    }> = [];

    // 对每个 AI 模型处理所有比赛（并行处理以提高性能）
    const processAIModel = async (modelConfig: ModelConfig) => {
      const aiResults: Array<{
        matchId?: number;
        aiId?: string;
        aiDisplayName: string;
        analyses: ModelAnalysisResult[];
        analysisRefs: StoredAnalysisResult[];
        primaryAnalysis: string | null;
        autoBet?: AutoBetResult;
      }> = [];
      
      try {
        const aiId = modelConfig.id;
        const aiDisplayName = modelConfig.displayName;
        
        // 获取或创建余额
        const balance = await getOrCreateBalance(aiId, aiDisplayName);
        if (!balance) {
          console.error(`[${aiDisplayName}] 无法获取或创建余额`);
          return [];
        }

        const todayBetsCount = await getTodayBetsCount(aiId);
        const strategy = resolveStrategy(body.strategy);
        
        // 从数据库获取赔率信息（纳米数据API的diary接口不包含赔率，需要从其他API获取）
        // 注意：当前实现中，daily_matches表不包含odds_info字段，赔率信息需要从其他API获取
        // 如果需要赔率信息，可以调用纳米数据API的odds相关接口
        const parseOddsInfoFromDB = (oddsInfo: unknown): MarketOdds | null => {
          if (!oddsInfo || typeof oddsInfo !== 'object') {
            return null;
          }

          const marketOdds: MarketOdds = {};
          const oddsData = oddsInfo as any;

          try {
            // 检查数据结构：可能是 { data: [...] } 或直接是数组
            const markets = Array.isArray(oddsData.data) ? oddsData.data : 
                           Array.isArray(oddsData) ? oddsData : [];

            if (markets.length === 0) {
              console.warn(`[parseOddsInfoFromDB] 没有找到市场数据`);
              return null;
            }

            // 解析大小球赔率（Over/Under）
            // hpt=5 且 hpn="全场大小" 或 hpn="全场大小-附加盘"
            const overUnderMarkets = markets.filter((market: any) => {
              const marketType = market.hpt || market.marketType || market.market_type;
              const marketName = market.hpn || market.name || market.marketName || '';
              // 严格限制：只接受 hpt=5，且 hpn 精确匹配"全场大小"或"全场大小-附加盘"
              if (marketType === 5) {
                return marketName === '全场大小' || marketName === '全场大小-附加盘';
              }
              return false;
            });

            if (overUnderMarkets.length > 0) {
              // 使用 string | number 作为 key，保留原始格式（如 "2.5/3", "2/2.5"）
              const overUnderMap = new Map<string | number, { over?: number; under?: number }>();
              
              for (const market of overUnderMarkets) {
                const hl = market.hl || market.handicapLines || [];
                
                for (const lineData of hl) {
                  // hv 是盘口值，如 "3", "3.5", "2.5", "2.5/3", "2/2.5" 等
                  const hv = lineData.hv || lineData.handicapValue || lineData.line;
                  if (hv === null || hv === undefined || hv === '') continue;
                  
                  // 保留原始格式：如果是数字则保持数字，如果是字符串则保持字符串（包括 "2.5/3" 等格式）
                  const line: string | number = typeof hv === 'number' ? hv : String(hv);
                  
                  const ol = lineData.ol || lineData.outcomes || lineData.options || [];
                  
                  for (const outcome of ol) {
                    // ot 是选项类型："Over" 或 "Under"
                    const ot = outcome.ot || outcome.outcomeType || outcome.type || '';
                    // ov 是赔率值（整数，需要除以100000转换为小数）
                    const ovRaw = outcome.ov || outcome.odds || outcome.price || 0;
                    const odd = typeof ovRaw === 'number' ? ovRaw / 100000 : parseFloat(ovRaw) / 100000;
                    
                    if (isNaN(odd) || odd <= 0) continue;

                    if (!overUnderMap.has(line)) {
                      overUnderMap.set(line, {});
                    }
                    
                    const entry = overUnderMap.get(line)!;
                    const otLower = String(ot).toLowerCase();
                    
                    if (otLower === 'over' || otLower.includes('大')) {
                      entry.over = odd;
                    } else if (otLower === 'under' || otLower.includes('小')) {
                      entry.under = odd;
                    }
                  }
                }
              }

              // 转换为数组格式，只保留同时有 over 和 under 的，且两个赔率都大于等于1.7
              marketOdds.overUnder = Array.from(overUnderMap.entries())
                .filter(([_, odds]) => {
                  if (!odds.over || !odds.under) return false;
                  return isOddsInRange(odds.over) && isOddsInRange(odds.under);
                })
                .map(([line, odds]) => ({
                  line,
                  over: odds.over!,
                  under: odds.under!,
                }))
                .sort((a, b) => {
                  // 排序：数字优先，然后按字符串排序
                  const aNum = typeof a.line === 'number' ? a.line : parseFloat(String(a.line)) || Infinity;
                  const bNum = typeof b.line === 'number' ? b.line : parseFloat(String(b.line)) || Infinity;
                  if (aNum !== Infinity && bNum !== Infinity) {
                    return aNum - bNum;
                  }
                  return String(a.line).localeCompare(String(b.line));
                });
              
              if (marketOdds.overUnder.length > 0) {
                console.log(`[parseOddsInfoFromDB] 解析到 ${marketOdds.overUnder.length} 个大小球盘口`);
              }
            }

            // 解析让球盘赔率（Asian Handicap）
            // hpt=2 且 hpn="全场让球" 或 hpn="全场让球-附加盘"
            const handicapMarkets = markets.filter((market: any) => {
              const marketType = market.hpt || market.marketType || market.market_type;
              const marketName = market.hpn || market.name || market.marketName || '';
              // 严格限制：只接受 hpt=2，且 hpn 精确匹配"全场让球"或"全场让球-附加盘"
              if (marketType === 2) {
                return marketName === '全场让球' || marketName === '全场让球-附加盘';
              }
              return false;
            });

            if (handicapMarkets.length > 0) {
              // 使用 string | number 作为 key，保留原始格式（如 "-1/1.5"）
              const handicapMap = new Map<string | number, { home?: number; away?: number }>();
              
              for (const market of handicapMarkets) {
                const hl = market.hl || market.handicapLines || [];
                
                for (const lineData of hl) {
                  // hv 是盘口值，如 "-1.5", "+0.5", "-1/1.5" 等
                  // 直接保留原始值，不进行转换
                  const hv = lineData.hv || lineData.handicapValue || lineData.line;
                  if (hv === null || hv === undefined || hv === '') continue;
                  
                  // 保留原始格式：如果是数字则保持数字，如果是字符串则保持字符串
                  const line: string | number = typeof hv === 'number' ? hv : String(hv);
                  
                  const ol = lineData.ol || lineData.outcomes || lineData.options || [];
                  
                  for (const outcome of ol) {
                    // ot 是选项类型："1" 表示主队，"2" 表示客队
                    const ot = outcome.ot || outcome.outcomeType || outcome.type || '';
                    // ov 是赔率值（整数，需要除以100000转换为小数）
                    const ovRaw = outcome.ov || outcome.odds || outcome.price || 0;
                    const odd = typeof ovRaw === 'number' ? ovRaw / 100000 : parseFloat(ovRaw) / 100000;
                    
                    if (isNaN(odd) || odd <= 0) continue;

                    if (!handicapMap.has(line)) {
                      handicapMap.set(line, {});
                    }
                    
                    const entry = handicapMap.get(line)!;
                    const otStr = String(ot);
                    
                    // "1" 表示主队（home），"2" 表示客队（away）
                    if (otStr === '1' || otStr.toLowerCase().includes('home') || otStr.includes('主')) {
                      entry.home = odd;
                    } else if (otStr === '2' || otStr.toLowerCase().includes('away') || otStr.includes('客')) {
                      entry.away = odd;
                    }
                  }
                }
              }

              // 转换为数组格式，只保留同时有 home 和 away 的，且两个赔率都大于等于1.7
              marketOdds.handicap = Array.from(handicapMap.entries())
                .filter(([_, odds]) => {
                  if (!odds.home || !odds.away) return false;
                  return isOddsInRange(odds.home) && isOddsInRange(odds.away);
                })
                .map(([line, odds]) => ({
                  line,
                  home: odds.home!,
                  away: odds.away!,
                }))
                .sort((a, b) => {
                  // 排序：数字优先，然后按字符串排序
                  const aNum = typeof a.line === 'number' ? a.line : parseFloat(String(a.line)) || Infinity;
                  const bNum = typeof b.line === 'number' ? b.line : parseFloat(String(b.line)) || Infinity;
                  if (aNum !== Infinity && bNum !== Infinity) {
                    return aNum - bNum;
                  }
                  return String(a.line).localeCompare(String(b.line));
                });
              
              if (marketOdds.handicap.length > 0) {
                console.log(`[parseOddsInfoFromDB] 解析到 ${marketOdds.handicap.length} 个让球盘盘口`);
              }
            }

            return (marketOdds.overUnder && marketOdds.overUnder.length > 0) || 
                   (marketOdds.handicap && marketOdds.handicap.length > 0)
              ? marketOdds
              : null;
          } catch (error) {
            console.error(`[parseOddsInfoFromDB] 解析赔率信息出错:`, error);
            if (error instanceof Error) {
              console.error(`[parseOddsInfoFromDB] 错误详情: ${error.message}, 堆栈: ${error.stack}`);
            }
            return null;
          }
        };

        // 解析所有赔率信息（不过滤赔率范围，用于保存到 bet_snapshot）
        const parseAllOddsInfoFromDB = (oddsInfo: unknown): MarketOdds | null => {
          if (!oddsInfo || typeof oddsInfo !== 'object') {
            return null;
          }

          const marketOdds: MarketOdds = {};
          const oddsData = oddsInfo as any;

          try {
            // 检查数据结构：可能是 { data: [...] } 或直接是数组
            const markets = Array.isArray(oddsData.data) ? oddsData.data : 
                           Array.isArray(oddsData) ? oddsData : [];

            if (markets.length === 0) {
              return null;
            }

            // 解析大小球赔率（Over/Under）
            // hpt=5 且 hpn="全场大小" 或 hpn="全场大小-附加盘"
            const overUnderMarkets = markets.filter((market: any) => {
              const marketType = market.hpt || market.marketType || market.market_type;
              const marketName = market.hpn || market.name || market.marketName || '';
              if (marketType === 5) {
                return marketName === '全场大小' || marketName === '全场大小-附加盘';
              }
              return false;
            });

            if (overUnderMarkets.length > 0) {
              const overUnderMap = new Map<string | number, { over?: number; under?: number }>();
              
              for (const market of overUnderMarkets) {
                const hl = market.hl || market.handicapLines || [];
                
                for (const lineData of hl) {
                  const hv = lineData.hv || lineData.handicapValue || lineData.line;
                  if (hv === null || hv === undefined || hv === '') continue;
                  
                  const line: string | number = typeof hv === 'number' ? hv : String(hv);
                  const ol = lineData.ol || lineData.outcomes || lineData.options || [];
                  
                  for (const outcome of ol) {
                    const ot = outcome.ot || outcome.outcomeType || outcome.type || '';
                    const ovRaw = outcome.ov || outcome.odds || outcome.price || 0;
                    const odd = typeof ovRaw === 'number' ? ovRaw / 100000 : parseFloat(ovRaw) / 100000;
                    
                    if (isNaN(odd) || odd <= 0) continue;

                    if (!overUnderMap.has(line)) {
                      overUnderMap.set(line, {});
                    }
                    
                    const entry = overUnderMap.get(line)!;
                    const otLower = String(ot).toLowerCase();
                    
                    if (otLower === 'over' || otLower.includes('大')) {
                      entry.over = odd;
                    } else if (otLower === 'under' || otLower.includes('小')) {
                      entry.under = odd;
                    }
                  }
                }
              }

              // 转换为数组格式，只保留同时有 over 和 under 的，不做赔率范围过滤
              marketOdds.overUnder = Array.from(overUnderMap.entries())
                .filter(([_, odds]) => {
                  return odds.over && odds.under;
                })
                .map(([line, odds]) => ({
                  line,
                  over: odds.over!,
                  under: odds.under!,
                }))
                .sort((a, b) => {
                  const aNum = typeof a.line === 'number' ? a.line : parseFloat(String(a.line)) || Infinity;
                  const bNum = typeof b.line === 'number' ? b.line : parseFloat(String(b.line)) || Infinity;
                  if (aNum !== Infinity && bNum !== Infinity) {
                    return aNum - bNum;
                  }
                  return String(a.line).localeCompare(String(b.line));
                });
            }

            // 解析让球盘赔率（Asian Handicap）
            // hpt=2 且 hpn="全场让球" 或 hpn="全场让球-附加盘"
            const handicapMarkets = markets.filter((market: any) => {
              const marketType = market.hpt || market.marketType || market.market_type;
              const marketName = market.hpn || market.name || market.marketName || '';
              if (marketType === 2) {
                return marketName === '全场让球' || marketName === '全场让球-附加盘';
              }
              return false;
            });

            if (handicapMarkets.length > 0) {
              const handicapMap = new Map<string | number, { home?: number; away?: number }>();
              
              for (const market of handicapMarkets) {
                const hl = market.hl || market.handicapLines || [];
                
                for (const lineData of hl) {
                  const hv = lineData.hv || lineData.handicapValue || lineData.line;
                  if (hv === null || hv === undefined || hv === '') continue;
                  
                  const line: string | number = typeof hv === 'number' ? hv : String(hv);
                  const ol = lineData.ol || lineData.outcomes || lineData.options || [];
                  
                  for (const outcome of ol) {
                    const ot = outcome.ot || outcome.outcomeType || outcome.type || '';
                    const ovRaw = outcome.ov || outcome.odds || outcome.price || 0;
                    const odd = typeof ovRaw === 'number' ? ovRaw / 100000 : parseFloat(ovRaw) / 100000;
                    
                    if (isNaN(odd) || odd <= 0) continue;

                    if (!handicapMap.has(line)) {
                      handicapMap.set(line, {});
                    }
                    
                    const entry = handicapMap.get(line)!;
                    const otStr = String(ot);
                    
                    if (otStr === '1' || otStr.toLowerCase().includes('home') || otStr.includes('主')) {
                      entry.home = odd;
                    } else if (otStr === '2' || otStr.toLowerCase().includes('away') || otStr.includes('客')) {
                      entry.away = odd;
                    }
                  }
                }
              }

              // 转换为数组格式，只保留同时有 home 和 away 的，不做赔率范围过滤
              marketOdds.handicap = Array.from(handicapMap.entries())
                .filter(([_, odds]) => {
                  return odds.home && odds.away;
                })
                .map(([line, odds]) => ({
                  line,
                  home: odds.home!,
                  away: odds.away!,
                }))
                .sort((a, b) => {
                  const aNum = typeof a.line === 'number' ? a.line : parseFloat(String(a.line)) || Infinity;
                  const bNum = typeof b.line === 'number' ? b.line : parseFloat(String(b.line)) || Infinity;
                  if (aNum !== Infinity && bNum !== Infinity) {
                    return aNum - bNum;
                  }
                  return String(a.line).localeCompare(String(b.line));
                });
            }

            return (marketOdds.overUnder && marketOdds.overUnder.length > 0) || 
                   (marketOdds.handicap && marketOdds.handicap.length > 0)
              ? marketOdds
              : null;
          } catch (error) {
            console.error(`[parseAllOddsInfoFromDB] 解析赔率信息出错:`, error);
            return null;
          }
        };

        // 从数据库获取所有可用的市场赔率（只读取大小球和让球盘）
        // 从 daily_matches 表的 odds_info 字段读取赔率信息（从番茄体育API获取）
        const getAllMarketOdds = async (matchId?: number, includeAllOdds: boolean = false): Promise<MarketOdds | null> => {
          if (!matchId || !supabase) return null;
          
          try {
            // 从 daily_matches 表查询 odds_info 字段
            const { data: matchData, error } = await supabase
              .from(DAILY_MATCHES_TABLE)
              .select('odds_info')
              .eq('match_id', matchId)
              .not('odds_info', 'is', null)
              .single();

            if (error) {
              console.warn(`[getAllMarketOdds] 查询比赛 ${matchId} 的赔率信息失败:`, error.message);
              return null;
            }

            if (!matchData || !matchData.odds_info) {
              console.warn(`[getAllMarketOdds] 比赛 ${matchId} 没有赔率信息（odds_info 为空）`);
              return null;
            }

            // 根据 includeAllOdds 参数选择使用过滤或不过滤的解析函数
            const parsedOdds = includeAllOdds 
              ? parseAllOddsInfoFromDB(matchData.odds_info)
              : parseOddsInfoFromDB(matchData.odds_info);
            
            if (parsedOdds) {
              console.log(`[getAllMarketOdds] 从数据库成功读取比赛 ${matchId} 的赔率信息`);
              console.log(`[getAllMarketOdds] 大小球盘口: ${parsedOdds.overUnder?.length || 0} 个, 让球盘盘口: ${parsedOdds.handicap?.length || 0} 个`);
              return parsedOdds;
            } else {
              console.warn(`[getAllMarketOdds] 比赛 ${matchId} 的赔率信息解析失败或格式不正确`);
              return null;
            }
          } catch (error) {
            console.error(`[getAllMarketOdds] 从数据库读取比赛 ${matchId} 的赔率信息失败:`, error);
            if (error instanceof Error) {
              console.error(`[getAllMarketOdds] 错误详情: ${error.message}, 堆栈: ${error.stack}`);
            }
            return null;
          }
        };


        // 处理所有比赛，不进行数量限制
        console.log(`[${aiDisplayName}] 开始处理 ${matchesPayload.length} 场比赛`);
        
        // 优化：批量预获取赔率（在分析开始前）
        const preFetchOddsForMatches = async (matchIds: number[]) => {
          if (!supabase || matchIds.length === 0) return;
          
          try {
            // 1. 查询哪些比赛没有赔率
            const { data: matchesWithoutOdds } = await supabase
              .from(DAILY_MATCHES_TABLE)
              .select('match_id, home_team_name, away_team_name, match_time, odds_info, odds_requested')
              .in('match_id', matchIds)
              .or('odds_info.is.null,odds_requested.eq.false');
            
            if (!matchesWithoutOdds || matchesWithoutOdds.length === 0) {
              console.log(`[${aiDisplayName}] 所有比赛已有赔率信息，跳过预获取`);
              return;
            }
            
            console.log(`[${aiDisplayName}] 发现 ${matchesWithoutOdds.length} 场比赛需要获取赔率，开始批量预获取...`);
            
            // 2. 获取 token 和比赛列表缓存
            const tokens = await getTokensFromCache();
            const ybtyToken = tokens?.ybty_token;
            
            if (!ybtyToken) {
              console.warn(`[${aiDisplayName}] 无法获取 token，跳过赔率预获取`);
              return;
            }
            
            // 优化：先从缓存读取比赛列表
            let fqtyMatchesCache: Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }> | null = null;
            if (supabase) {
              try {
                const { data: cache } = await supabase
                  .from('app_cache')
                  .select('value, expires_at')
                  .eq('key', 'fqty_matches_cache')
                  .gt('expires_at', new Date().toISOString())
                  .single();
                
                if (cache && cache.value) {
                  fqtyMatchesCache = cache.value as Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }>;
                  console.log(`[${aiDisplayName}] 从缓存读取到 ${fqtyMatchesCache.length} 场番茄体育比赛`);
                }
              } catch (cacheError) {
                console.warn(`[${aiDisplayName}] 读取比赛列表缓存失败:`, cacheError);
              }
            }
            
            // 如果缓存不存在或已过期，从API获取
            if (!fqtyMatchesCache) {
              console.log(`[${aiDisplayName}] 缓存不存在或已过期，从API获取比赛列表...`);
              fqtyMatchesCache = await fetchFqtyMatches(ybtyToken);
              console.log(`[${aiDisplayName}] 从API获取到 ${fqtyMatchesCache.length} 场番茄体育比赛`);
              
              // 更新缓存
              if (supabase && fqtyMatchesCache && fqtyMatchesCache.length > 0) {
                try {
                  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
                  await supabase.from('app_cache').upsert({
                    key: 'fqty_matches_cache',
                    value: fqtyMatchesCache,
                    expires_at: expiresAt,
                  }, { onConflict: 'key' });
                } catch (cacheError) {
                  console.warn(`[${aiDisplayName}] 更新比赛列表缓存失败:`, cacheError);
                }
              }
            }
            
            // 3. 批量获取赔率（限制并发和总数，避免超时）
            // 限制最多预获取 20 场比赛的赔率，避免消耗过多时间
            const MAX_ODDS_PREFETCH = 20;
            const matchesToFetch = matchesWithoutOdds.slice(0, MAX_ODDS_PREFETCH);
            if (matchesWithoutOdds.length > MAX_ODDS_PREFETCH) {
              console.warn(`[${aiDisplayName}] 需要获取赔率的比赛数量 ${matchesWithoutOdds.length} 超过限制 ${MAX_ODDS_PREFETCH}，只预获取前 ${MAX_ODDS_PREFETCH} 场`);
            }
            
            const BATCH_SIZE = 3; // 降低并发数，避免限流
            const getRequestDelay = () => Math.floor(Math.random() * 800) + 800; // 800-1600ms
            
            for (let i = 0; i < matchesToFetch.length; i += BATCH_SIZE) {
              const batch = matchesToFetch.slice(i, i + BATCH_SIZE);
              console.log(`[${aiDisplayName}] 批量预获取赔率: 批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(matchesToFetch.length / BATCH_SIZE)} (${batch.length} 场比赛)`);
              
              const batchPromises = batch.map(async (matchData) => {
                if (!matchData.match_id || !matchData.home_team_name || !matchData.away_team_name || !matchData.match_time) {
                  return;
                }
                
                try {
                  // 查找匹配的番茄体育比赛ID
                  const fqtyMatchId = findFqtyMatchIdFromCache(
                    matchData.home_team_name,
                    matchData.away_team_name,
                    matchData.match_time,
                    fqtyMatchesCache || [],
                  );
                  
                  if (fqtyMatchId) {
                    // 获取赔率信息
                    const oddsInfo = await fetchMatchOddsInfo(ybtyToken, fqtyMatchId, "0");
                    
                    if (oddsInfo) {
                      // 更新数据库
                      await supabase
                        .from(DAILY_MATCHES_TABLE)
                        .update({
                          odds_info: oddsInfo,
                          odds_requested: true,
                        })
                        .eq('match_id', matchData.match_id);
                      
                      console.log(`[${aiDisplayName}] ✓ 预获取比赛 ${matchData.match_id} 的赔率成功`);
                    } else {
                      // 即使获取失败，也设置 odds_requested = true
                      await supabase
                        .from(DAILY_MATCHES_TABLE)
                        .update({
                          odds_requested: true,
                        })
                        .eq('match_id', matchData.match_id);
                    }
                  }
                } catch (error) {
                  console.error(`[${aiDisplayName}] ✗ 预获取比赛 ${matchData.match_id} 的赔率失败:`, error);
                  // 设置 odds_requested = true，避免重复尝试
                  if (supabase && matchData.match_id) {
                    await supabase
                      .from(DAILY_MATCHES_TABLE)
                      .update({
                        odds_requested: true,
                      })
                      .eq('match_id', matchData.match_id);
                  }
                }
              });
              
              await Promise.all(batchPromises);
              
              // 批次之间添加延迟
              if (i + BATCH_SIZE < matchesWithoutOdds.length) {
                const delay = getRequestDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
            
            console.log(`[${aiDisplayName}] 批量预获取赔率完成`);
          } catch (error) {
            console.error(`[${aiDisplayName}] 批量预获取赔率失败:`, error);
          }
        };
        
        // 提取所有比赛ID
        const allMatchIds = matchesPayload
          .map(m => m.matchId)
          .filter((id): id is number => id !== undefined && typeof id === 'number');
        
        // 批量预获取赔率
        if (allMatchIds.length > 0) {
          await preFetchOddsForMatches(allMatchIds);
        }
        
        // 第一步：分批并行分析比赛，避免同时处理太多比赛导致超时
        // 每批最多处理 5 场比赛，确保在时间限制内完成
        const BATCH_SIZE_ANALYSIS = 5;
        const matchBatches: MatchRequest[][] = [];
        for (let i = 0; i < matchesPayload.length; i += BATCH_SIZE_ANALYSIS) {
          matchBatches.push(matchesPayload.slice(i, i + BATCH_SIZE_ANALYSIS));
        }
        
        console.log(`[${aiDisplayName}] 将 ${matchesPayload.length} 场比赛分成 ${matchBatches.length} 批处理，每批最多 ${BATCH_SIZE_ANALYSIS} 场`);
        
        const allMatchAnalyses: Array<{
          match: MatchRequest;
          analyses: ModelAnalysisResult[];
          analysisRefs: StoredAnalysisResult[];
          moneylineBetInfo: BetInfo | null;
          overUnderBetInfo: BetInfo | null;
          handicapBetInfo: BetInfo | null;
          allPredictions?: AllPredictions;
        }> = [];
        
        // 分批处理比赛
        for (let batchIndex = 0; batchIndex < matchBatches.length; batchIndex++) {
          const batch = matchBatches[batchIndex];
          console.log(`[${aiDisplayName}] 处理批次 ${batchIndex + 1}/${matchBatches.length} (${batch.length} 场比赛)`);
          
          const analysisPromises: Promise<{
            match: MatchRequest;
            analyses: ModelAnalysisResult[];
            analysisRefs: StoredAnalysisResult[];
            moneylineBetInfo: BetInfo | null;
            overUnderBetInfo: BetInfo | null;
            handicapBetInfo: BetInfo | null;
            allPredictions?: AllPredictions;
          }>[] = batch.map(async (match) => {
          const matchInfo = match.matchInfo;
          const defaultBetInfo = generateDefaultBetInfo('OVER', 50);
          
          // 检查是否已有分析记录
          const existingAnalysisRefs = await checkExistingAnalysis(match.matchId, aiId);
          
          if (existingAnalysisRefs && existingAnalysisRefs.length > 0) {
            // 已有分析记录，直接使用
            
            // 从数据库获取已有的分析结果
            if (!supabase) {
              return {
                match,
                analyses: [],
                analysisRefs: existingAnalysisRefs,
                moneylineBetInfo: null,
                overUnderBetInfo: null,
                handicapBetInfo: null,
              };
            }
            
            const { data: existingData } = await supabase
              .from(ANALYSIS_TABLE)
              .select('analysis, bet_snapshot')
              .eq('id', existingAnalysisRefs[0].id)
              .single();
            
            if (existingData && existingData.analysis) {
              // 构建已有的分析结果
              const existingAnalysis: ModelAnalysisResult = {
                ...modelConfig,
                analysis: existingData.analysis,
                latencyMs: 0,
              };
              
              // 从 bet_snapshot 中提取预测信息
              const betSnapshot = existingData.bet_snapshot as any;
              let moneylineBetInfo: BetInfo | null = null;
              let overUnderBetInfo: BetInfo | null = null;
              let handicapBetInfo: BetInfo | null = null;
              
              if (betSnapshot) {
                // 提取主要投注信息
                if (betSnapshot.primaryBet) {
                  const primary = betSnapshot.primaryBet;
                  if (primary.betType === 'over_under') {
                    overUnderBetInfo = primary;
                  } else if (primary.betType === 'handicap') {
                    handicapBetInfo = primary;
                  }
                }
                
                // 提取所有预测信息
                if (betSnapshot.overUnder) {
                  overUnderBetInfo = {
                    betType: 'over_under',
                    prediction: betSnapshot.overUnder.prediction,
                    confidence: betSnapshot.overUnder.confidence,
                    odds: betSnapshot.overUnder.odds || 0,
                    betAmount: 0,
                    overUnderLine: betSnapshot.overUnder.line,
                    overUnderPick: betSnapshot.overUnder.prediction.toLowerCase(),
                  };
                }
                
                if (betSnapshot.handicap) {
                  handicapBetInfo = {
                    betType: 'handicap',
                    prediction: betSnapshot.handicap.prediction,
                    confidence: betSnapshot.handicap.confidence,
                    odds: betSnapshot.handicap.odds || 0,
                    betAmount: 0,
                    handicapLine: betSnapshot.handicap.line,
                  };
                }
              }
              
              return {
                match,
                analyses: [existingAnalysis],
                analysisRefs: existingAnalysisRefs,
                moneylineBetInfo,
                overUnderBetInfo,
                handicapBetInfo,
              };
            } else {
              // 已有记录但 analysis 为空，继续执行新分析
              console.log(`[${aiDisplayName}] 比赛 ${match.matchId} 已有记录但 analysis 为空，继续执行新分析`);
            }
          }
          
          // 没有已有分析，进行新分析
          // 在分析之前，再次检查是否已有分析（防止竞态条件）
          const doubleCheckAnalysis = await checkExistingAnalysis(match.matchId, aiId);
          if (doubleCheckAnalysis && doubleCheckAnalysis.length > 0) {
            // 在检查和分析之间，其他请求已经创建了分析，直接使用已有分析
            console.log(`[${aiDisplayName}] 比赛 ${match.matchId} 在分析前发现已有分析记录，跳过重复分析`);
            if (!supabase) {
              return {
                match,
                analyses: [],
                analysisRefs: doubleCheckAnalysis,
                moneylineBetInfo: null,
                overUnderBetInfo: null,
                handicapBetInfo: null,
              };
            }
            
            const { data: existingData } = await supabase
              .from(ANALYSIS_TABLE)
              .select('analysis, bet_snapshot')
              .eq('id', doubleCheckAnalysis[0].id)
              .single();
            
            if (existingData && existingData.analysis) {
              const existingAnalysis: ModelAnalysisResult = {
                ...modelConfig,
                analysis: existingData.analysis,
                latencyMs: 0,
              };
              
              const betSnapshot = existingData.bet_snapshot as any;
              let moneylineBetInfo: BetInfo | null = null;
              let overUnderBetInfo: BetInfo | null = null;
              let handicapBetInfo: BetInfo | null = null;
              
              if (betSnapshot) {
                if (betSnapshot.primaryBet) {
                  const primary = betSnapshot.primaryBet;
                  if (primary.betType === 'over_under') {
                    overUnderBetInfo = primary;
                  } else if (primary.betType === 'handicap') {
                    handicapBetInfo = primary;
                  }
                }
                
                if (betSnapshot.overUnder) {
                  overUnderBetInfo = {
                    betType: 'over_under',
                    prediction: betSnapshot.overUnder.prediction,
                    confidence: betSnapshot.overUnder.confidence,
                    odds: betSnapshot.overUnder.odds || 0,
                    betAmount: 0,
                    overUnderLine: betSnapshot.overUnder.line,
                    overUnderPick: betSnapshot.overUnder.prediction.toLowerCase(),
                  };
                }
                
                if (betSnapshot.handicap) {
                  handicapBetInfo = {
                    betType: 'handicap',
                    prediction: betSnapshot.handicap.prediction,
                    confidence: betSnapshot.handicap.confidence,
                    odds: betSnapshot.handicap.odds || 0,
                    betAmount: 0,
                    handicapLine: betSnapshot.handicap.line,
                  };
                }
              }
              
              return {
                match,
                analyses: [existingAnalysis],
                analysisRefs: doubleCheckAnalysis,
                moneylineBetInfo,
                overUnderBetInfo,
                handicapBetInfo,
              };
            }
          }
          
          // 在分析之前，检查并获取市场赔率
          const matchMid = match.matchId;
          
          // 首先检查比赛是否有赔率信息
          if (matchMid && supabase) {
            const { data: matchData } = await supabase
              .from(DAILY_MATCHES_TABLE)
              .select('odds_info, home_team_name, away_team_name, match_time, odds_requested')
              .eq('match_id', matchMid)
              .single();
            
            // 如果没有赔率信息，尝试从番茄体育API获取
            if (matchData && (!matchData.odds_info || matchData.odds_info === null)) {
              console.log(`[${aiDisplayName}] 比赛 ${matchMid} 没有赔率信息，尝试从番茄体育API获取...`);
              
              try {
                // 获取 ybty_token
                const tokens = await getTokensFromCache();
                const ybtyToken = tokens?.ybty_token;
                
                if (ybtyToken && matchData.home_team_name && matchData.away_team_name && matchData.match_time) {
                  // 优化：先从缓存读取比赛列表
                  let fqtyMatchesCache: Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }> | null = null;
                  
                  if (supabase) {
                    try {
                      const { data: cache } = await supabase
                        .from('app_cache')
                        .select('value, expires_at')
                        .eq('key', 'fqty_matches_cache')
                        .gt('expires_at', new Date().toISOString())
                        .single();
                      
                      if (cache && cache.value) {
                        fqtyMatchesCache = cache.value as Array<{ mid: string; mhn?: string; man?: string; mgt?: number; [key: string]: unknown }>;
                        console.log(`[${aiDisplayName}] 从缓存读取到 ${fqtyMatchesCache.length} 场番茄体育比赛`);
                      }
                    } catch (cacheError) {
                      console.warn(`[${aiDisplayName}] 读取比赛列表缓存失败:`, cacheError);
                    }
                  }
                  
                  // 如果缓存不存在或已过期，从API获取
                  if (!fqtyMatchesCache) {
                    console.log(`[${aiDisplayName}] 缓存不存在或已过期，从API获取比赛列表...`);
                    fqtyMatchesCache = await fetchFqtyMatches(ybtyToken);
                    console.log(`[${aiDisplayName}] 从API获取到 ${fqtyMatchesCache.length} 场番茄体育比赛`);
                    
                    // 更新缓存
                    if (supabase && fqtyMatchesCache && fqtyMatchesCache.length > 0) {
                      try {
                        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
                        await supabase.from('app_cache').upsert({
                          key: 'fqty_matches_cache',
                          value: fqtyMatchesCache,
                          expires_at: expiresAt,
                        }, { onConflict: 'key' });
                      } catch (cacheError) {
                        console.warn(`[${aiDisplayName}] 更新比赛列表缓存失败:`, cacheError);
                      }
                    }
                  }
                  
                  // 查找匹配的番茄体育比赛ID
                  const fqtyMatchId = findFqtyMatchIdFromCache(
                    matchData.home_team_name,
                    matchData.away_team_name,
                    matchData.match_time,
                    fqtyMatchesCache || [],
                  );
                  
                  if (fqtyMatchId) {
                    console.log(`[${aiDisplayName}] 找到比赛 ${matchMid} 对应的番茄体育ID: ${fqtyMatchId}`);
                    
                    // 获取赔率信息
                    const oddsInfo = await fetchMatchOddsInfo(ybtyToken, fqtyMatchId, "0");
                    
                    if (oddsInfo) {
                      console.log(`[${aiDisplayName}] ✓ 成功获取比赛 ${matchMid} 的赔率信息`);
                      
                      // 更新数据库中的 odds_info 和 odds_requested
                      await supabase
                        .from(DAILY_MATCHES_TABLE)
                        .update({
                          odds_info: oddsInfo,
                          odds_requested: true,
                        })
                        .eq('match_id', matchMid);
                      
                      console.log(`[${aiDisplayName}] ✓ 成功更新比赛 ${matchMid} 的赔率信息到数据库`);
                    } else {
                      console.warn(`[${aiDisplayName}] ✗ 比赛 ${matchMid} 的赔率信息为空`);
                      // 即使获取失败，也设置 odds_requested = true（表示已尝试过）
                      await supabase
                        .from(DAILY_MATCHES_TABLE)
                        .update({
                          odds_requested: true,
                        })
                        .eq('match_id', matchMid);
                    }
                  } else {
                    console.warn(`[${aiDisplayName}] 无法找到比赛 ${matchMid} 对应的番茄体育比赛ID`);
                    // 设置 odds_requested = true，避免重复尝试
                    await supabase
                      .from(DAILY_MATCHES_TABLE)
                      .update({
                        odds_requested: true,
                      })
                      .eq('match_id', matchMid);
                  }
                } else {
                  console.warn(`[${aiDisplayName}] 无法获取赔率：缺少 token 或比赛信息`);
                }
              } catch (error) {
                console.error(`[${aiDisplayName}] ✗ 获取比赛 ${matchMid} 的赔率信息失败:`, error);
              }
            }
          }
          
          // 从数据库获取市场赔率（只读取大小球和让球盘）
          // 从 daily_matches 表的 odds_info 字段读取（可能刚从API获取）
          // 获取过滤后的赔率（用于投注决策）
          const marketOdds = matchMid ? await getAllMarketOdds(matchMid, false) : null;
          // 获取所有赔率（不过滤，用于保存到 bet_snapshot）
          const allMarketOdds = matchMid ? await getAllMarketOdds(matchMid, true) : null;
          
          if (marketOdds) {
            console.log(`[${aiDisplayName}] 比赛 ${matchMid} 获取到赔率信息: 大小球=${marketOdds.overUnder?.length || 0}个, 让球盘=${marketOdds.handicap?.length || 0}个`);
          } else {
            console.warn(`[${aiDisplayName}] 比赛 ${matchMid} 没有可用的赔率信息，将使用默认赔率`);
          }
          
          // 调用当前 AI 模型进行分析（只调用自己的模型）
          const analysis = await analyzeWithSingleModel(
            OPENROUTER_API_KEY,
            matchInfo,
            defaultBetInfo,
            modelConfig,
            true, // 使用默认 betInfo，让 AI 自己生成预测
            marketOdds || undefined, // 传递市场赔率信息
          );

          const analyses = [analysis]; // 包装成数组以保持兼容性
          const successfulAnalysis = analysis.analysis && !analysis.error ? analysis : null;
          
          // 保存 marketOdds 以便后续使用
          const savedMarketOdds = marketOdds; // 用于投注决策的过滤后赔率
          const savedAllMarketOdds = allMarketOdds; // 所有赔率（用于保存到 bet_snapshot）
          
          if (!successfulAnalysis) {
            // 保存失败的分析记录（使用完整格式，即使分析失败也保存结构）
            const emptyPredictions: AllPredictions = {
              primaryBet: defaultBetInfo,
            };
            const analysisRefs = await persistAnalyses(
              match.matchId,
              aiId,
              aiDisplayName,
              matchInfo,
              defaultBetInfo,
              analyses,
              emptyPredictions, // 使用完整格式
            );
            return {
              match,
              analyses,
              analysisRefs,
              moneylineBetInfo: null,
              overUnderBetInfo: null,
              handicapBetInfo: null,
            };
          }

          // 从分析结果中提取预测
          const analysisText = successfulAnalysis.analysis;
          if (!analysisText) {
            // 保存没有分析文本的记录（使用完整格式）
            const emptyPredictions: AllPredictions = {
              primaryBet: defaultBetInfo,
            };
            const analysisRefs = await persistAnalyses(
              match.matchId,
              aiId,
              aiDisplayName,
              matchInfo,
              defaultBetInfo,
              analyses,
              emptyPredictions, // 使用完整格式
            );
            return {
              match,
              analyses,
              analysisRefs,
              moneylineBetInfo: null,
              overUnderBetInfo: null,
              handicapBetInfo: null,
            };
          }
          
          // 解析输赢预测（增加容错性，支持多种格式）
          const moneylinePatterns = [
            /PREDICTION_MONEYLINE:\s*(HOME_WIN|AWAY_WIN|DRAW)\s*(\d+)/i,
            /MONEYLINE[:\s]+(HOME_WIN|AWAY_WIN|DRAW)[:\s]+(\d+)/i,
            /输赢[预测预测结果]*[:\s]+(HOME_WIN|AWAY_WIN|DRAW)[:\s]+(\d+)/i,
          ];
          let moneylinePick: string | undefined;
          let moneylineConfidence: number | undefined;
          let moneylineMatch: RegExpMatchArray | null = null;
          
          for (const pattern of moneylinePatterns) {
            moneylineMatch = analysisText.match(pattern);
            if (moneylineMatch) break;
          }
          
          if (moneylineMatch) {
            moneylinePick = moneylineMatch[1].toUpperCase();
            moneylineConfidence = parseInt(moneylineMatch[2]);
            if (isNaN(moneylineConfidence) || moneylineConfidence < 0 || moneylineConfidence > 100) {
              console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 输赢预测置信度无效: ${moneylineMatch[2]}`);
              moneylineConfidence = undefined;
            }
          }

          // 解析大小球预测（增加容错性，支持多种格式）
          const overUnderPatterns = [
            /PREDICTION_OVER_UNDER:\s*(OVER|UNDER)\s*([\d.]+)\s*(\d+)/i,
            /OVER_UNDER[:\s]+(OVER|UNDER)[:\s]+([\d.]+)[:\s]+(\d+)/i,
            /大小球[预测预测结果]*[:\s]+(OVER|UNDER|大|小)[:\s]+([\d.]+)[:\s]+(\d+)/i,
          ];
          let overUnderPick: string | undefined;
          let overUnderLine: number | undefined;
          let overUnderConfidence: number | undefined;
          let overUnderMatch: RegExpMatchArray | null = null;
          
          for (const pattern of overUnderPatterns) {
            overUnderMatch = analysisText.match(pattern);
            if (overUnderMatch) break;
          }
          
          if (overUnderMatch) {
            overUnderPick = overUnderMatch[1].toUpperCase();
            // 处理中文"大"/"小"
            if (overUnderPick === '大') overUnderPick = 'OVER';
            if (overUnderPick === '小') overUnderPick = 'UNDER';
            
            overUnderLine = parseFloat(overUnderMatch[2]);
            if (isNaN(overUnderLine) || overUnderLine <= 0) {
              console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 大小球预测line值无效: ${overUnderMatch[2]}`);
              overUnderLine = undefined;
            }
            
            overUnderConfidence = parseInt(overUnderMatch[3]);
            if (isNaN(overUnderConfidence) || overUnderConfidence < 0 || overUnderConfidence > 100) {
              console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 大小球预测置信度无效: ${overUnderMatch[3]}`);
              overUnderConfidence = undefined;
            }
          }

          // 解析让球盘预测（增加容错性，支持多种格式）
          const handicapPatterns = [
            /PREDICTION_HANDICAP:\s*(HOME|AWAY)\s*([-\d.]+)\s*(\d+)/i,
            /HANDICAP[:\s]+(HOME|AWAY|主|客)[:\s]+([-\d.]+)[:\s]+(\d+)/i,
            /让球[盘预测预测结果]*[:\s]+(HOME|AWAY|主|客)[:\s]+([-\d.]+)[:\s]+(\d+)/i,
          ];
          let handicapPick: string | undefined;
          let handicapLine: number | undefined;
          let handicapConfidence: number | undefined;
          let handicapMatch: RegExpMatchArray | null = null;
          
          for (const pattern of handicapPatterns) {
            handicapMatch = analysisText.match(pattern);
            if (handicapMatch) break;
          }
          
          if (handicapMatch) {
            handicapPick = handicapMatch[1].toUpperCase();
            // 处理中文"主"/"客"
            if (handicapPick === '主') handicapPick = 'HOME';
            if (handicapPick === '客') handicapPick = 'AWAY';
            
            handicapLine = parseFloat(handicapMatch[2]);
            if (isNaN(handicapLine)) {
              console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 让球盘预测line值无效: ${handicapMatch[2]}`);
              handicapLine = undefined;
            }
            
            handicapConfidence = parseInt(handicapMatch[3]);
            if (isNaN(handicapConfidence) || handicapConfidence < 0 || handicapConfidence > 100) {
              console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 让球盘预测置信度无效: ${handicapMatch[3]}`);
              handicapConfidence = undefined;
            }
          }
          
          // 如果所有预测都解析失败，记录警告
          if (!moneylinePick && !overUnderPick && !handicapPick) {
            console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 未能从AI分析中解析出任何有效预测，分析文本长度: ${analysisText.length}`);
          }

          // 保存分析记录（包含输赢、大小球和让球盘预测）
          // 从数据库的市场赔率中查找真实赔率（只使用大小球和让球盘）
          
          // 输赢赔率：数据库中没有存储，使用默认值
          const moneylineBetInfo: BetInfo | null = moneylinePick && moneylineConfidence
            ? {
                betType: 'moneyline',
                prediction: moneylinePick, // HOME_WIN, AWAY_WIN, 或 DRAW
                confidence: moneylineConfidence,
                odds: 0, // 使用默认值
                betAmount: 0,
              }
            : null;

          // 从数据库市场赔率中获取大小球真实赔率
          let overUnderRealOdds: number | null = null;
          if (overUnderPick && overUnderLine !== undefined && savedMarketOdds?.overUnder) {
            const matchedOdds = savedMarketOdds.overUnder.find(ou => {
              const lineDiff = typeof ou.line === 'number' && typeof overUnderLine === 'number' 
                ? Math.abs(ou.line - overUnderLine) 
                : Infinity;
              return lineDiff < 0.01;
            });
            if (matchedOdds) {
              const selectedOdds = overUnderPick.toUpperCase() === 'OVER' ? matchedOdds.over : matchedOdds.under;
              // 确保选择的赔率在范围内
              if (selectedOdds && isOddsInRange(selectedOdds)) {
                overUnderRealOdds = selectedOdds;
              }
            }
          }

          // 只有在赔率匹配成功且有效时才创建betInfo，否则跳过该投注
          const overUnderBetInfo: BetInfo | null = overUnderPick && overUnderLine && overUnderConfidence && overUnderRealOdds && overUnderRealOdds > 0 && isOddsInRange(overUnderRealOdds)
            ? {
                betType: 'over_under',
                prediction: overUnderPick,
                confidence: overUnderConfidence,
                odds: overUnderRealOdds, // 使用匹配成功的真实赔率
                betAmount: 0,
                overUnderLine,
                overUnderPick: overUnderPick.toLowerCase(),
              }
            : null;
          
          // 如果AI选择了不存在的line值，记录警告日志
          if (overUnderPick && overUnderLine && overUnderConfidence && (!overUnderRealOdds || overUnderRealOdds <= 0 || !isOddsInRange(overUnderRealOdds))) {
            console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 大小球预测匹配失败: AI选择了line=${overUnderLine}，但在市场赔率中不存在或赔率无效，跳过该投注`);
          }

          // 从数据库市场赔率中获取让球盘真实赔率
          let handicapRealOdds: number | null = null;
          if (handicapPick && handicapLine !== undefined && savedMarketOdds?.handicap) {
            // 匹配逻辑：支持数字和字符串的 line 值
            const matchedOdds = savedMarketOdds.handicap.find(h => {
              // 如果 line 是数字，使用数值比较
              if (typeof h.line === 'number' && typeof handicapLine === 'number') {
                return Math.abs(h.line - handicapLine) < 0.01;
              }
              // 如果 line 是字符串，尝试转换为数字比较，或直接字符串匹配
              if (typeof h.line === 'string') {
                const lineNum = parseFloat(h.line);
                if (!isNaN(lineNum) && typeof handicapLine === 'number') {
                  return Math.abs(lineNum - handicapLine) < 0.01;
                }
                // 字符串精确匹配
                return String(h.line) === String(handicapLine);
              }
              // 如果 handicapLine 是字符串，尝试匹配
              if (typeof handicapLine === 'string') {
                return String(h.line) === String(handicapLine);
              }
              return false;
            });
            if (matchedOdds) {
              const selectedOdds = handicapPick.toUpperCase() === 'HOME' ? matchedOdds.home : matchedOdds.away;
              // 确保选择的赔率在范围内
              if (selectedOdds && isOddsInRange(selectedOdds)) {
                handicapRealOdds = selectedOdds;
              }
            }
          }

          // 只有在赔率匹配成功且有效时才创建betInfo，否则跳过该投注
          const handicapBetInfo: BetInfo | null = handicapPick && handicapLine !== undefined && handicapConfidence && handicapRealOdds && handicapRealOdds > 0 && isOddsInRange(handicapRealOdds)
            ? {
                betType: 'handicap',
                prediction: handicapPick, // HOME 或 AWAY
                confidence: handicapConfidence,
                odds: handicapRealOdds, // 使用匹配成功的真实赔率
                betAmount: 0,
                handicapLine,
              }
            : null;
          
          // 如果AI选择了不存在的line值，记录警告日志
          if (handicapPick && handicapLine !== undefined && handicapConfidence && (!handicapRealOdds || handicapRealOdds <= 0 || !isOddsInRange(handicapRealOdds))) {
            console.warn(`[${aiDisplayName}] 比赛 ${match.matchId} 让球盘预测匹配失败: AI选择了line=${handicapLine}，但在市场赔率中不存在或赔率无效，跳过该投注`);
          }

          // 保存分析记录（使用大小球或让球盘作为主要记录，优先级：大小球 > 让球盘，投注时不考虑输赢）
          const finalBetInfo: BetInfo = overUnderBetInfo || handicapBetInfo || defaultBetInfo;
          
          // 构建完整的预测信息，包含所有三种预测类型和所有市场赔率
          const allPredictions: AllPredictions = {
            moneyline: moneylineBetInfo ? {
              prediction: moneylineBetInfo.prediction,
              confidence: moneylineBetInfo.confidence,
              odds: moneylineBetInfo.odds,
            } : undefined,
            overUnder: overUnderBetInfo ? {
              prediction: overUnderBetInfo.overUnderPick || overUnderBetInfo.prediction,
              line: overUnderBetInfo.overUnderLine!,
              confidence: overUnderBetInfo.confidence,
              odds: overUnderBetInfo.odds,
            } : undefined,
            handicap: handicapBetInfo ? {
              prediction: handicapBetInfo.prediction,
              line: handicapBetInfo.handicapLine!,
              confidence: handicapBetInfo.confidence,
              odds: handicapBetInfo.odds,
            } : undefined,
            primaryBet: finalBetInfo,
            allMarketOdds: savedAllMarketOdds || undefined, // 记录所有市场赔率（包括所有盘口，不过滤）
          };
          
          const analysisRefs = await persistAnalyses(
            match.matchId,
            aiId,
            aiDisplayName,
            matchInfo,
            finalBetInfo,
            analyses,
            allPredictions, // 传递完整的预测信息
          );

          return {
            match,
            analyses,
            analysisRefs,
            // 输赢、大小球和让球盘预测
            moneylineBetInfo,
            overUnderBetInfo,
            handicapBetInfo,
            allPredictions, // 添加完整预测信息
          };
        });

          // 等待当前批次的所有分析完成
          const batchAnalyses = await Promise.all(analysisPromises);
          allMatchAnalyses.push(...batchAnalyses);
          
          // 批次之间添加短暂延迟，避免 API 限流
          if (batchIndex < matchBatches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        const matchAnalyses = allMatchAnalyses;

        // 第二步：为每场比赛选择置信度最高的一个投注（只考虑大小球或让球盘，不考虑输赢预测）
        // 注意：虽然AI会预测输赢（moneyline），但在投注决策时不使用输赢预测
        const allBetsToConsider: Array<{
          match: MatchRequest;
          betInfo: BetInfo;
          analysisRefs: StoredAnalysisResult[];
        }> = [];

        // 对每场比赛，选择置信度更高的投注（只比较大小球和让球盘，不考虑输赢）
        for (const matchAnalysis of matchAnalyses) {
          const overUnderConfidence = matchAnalysis.overUnderBetInfo?.confidence ?? 0;
          const handicapConfidence = matchAnalysis.handicapBetInfo?.confidence ?? 0;

          // 选择置信度更高的投注
          if (overUnderConfidence > handicapConfidence && overUnderConfidence >= (strategy.minConfidence ?? 60)) {
            allBetsToConsider.push({
              match: matchAnalysis.match,
              betInfo: matchAnalysis.overUnderBetInfo!,
              analysisRefs: matchAnalysis.analysisRefs,
            });
          } else if (handicapConfidence > overUnderConfidence && handicapConfidence >= (strategy.minConfidence ?? 60)) {
            allBetsToConsider.push({
              match: matchAnalysis.match,
              betInfo: matchAnalysis.handicapBetInfo!,
              analysisRefs: matchAnalysis.analysisRefs,
            });
          } else if (overUnderConfidence === handicapConfidence && overUnderConfidence >= (strategy.minConfidence ?? 60)) {
            // 如果置信度相同，优先选择大小球
            allBetsToConsider.push({
              match: matchAnalysis.match,
              betInfo: matchAnalysis.overUnderBetInfo!,
              analysisRefs: matchAnalysis.analysisRefs,
            });
          }
        }

        // 如果没有符合条件的，选择置信度最高的投注（不限制最低置信度）
        if (allBetsToConsider.length === 0) {
          for (const matchAnalysis of matchAnalyses) {
            const overUnderConfidence = matchAnalysis.overUnderBetInfo?.confidence ?? 0;
            const handicapConfidence = matchAnalysis.handicapBetInfo?.confidence ?? 0;

            // 选择置信度更高的投注
            if (overUnderConfidence > handicapConfidence && overUnderConfidence > 0) {
              allBetsToConsider.push({
                match: matchAnalysis.match,
                betInfo: matchAnalysis.overUnderBetInfo!,
                analysisRefs: matchAnalysis.analysisRefs,
              });
            } else if (handicapConfidence > overUnderConfidence && handicapConfidence > 0) {
              allBetsToConsider.push({
                match: matchAnalysis.match,
                betInfo: matchAnalysis.handicapBetInfo!,
                analysisRefs: matchAnalysis.analysisRefs,
              });
            } else if (overUnderConfidence === handicapConfidence && overUnderConfidence > 0) {
              // 如果置信度相同，优先选择大小球
              allBetsToConsider.push({
                match: matchAnalysis.match,
                betInfo: matchAnalysis.overUnderBetInfo!,
                analysisRefs: matchAnalysis.analysisRefs,
              });
            }
          }
        }

        // 限制下注数量（避免全买也不能一个不买）
        const availableBalance = balance.available_balance || 0;
        const baseStake = strategy.baseStake || 800;
        const maxBetsByBalance = Math.floor(availableBalance / baseStake);
        const maxBetsByStrategy = 10; // 每天最多下注次数
        const maxBets = Math.min(maxBetsByBalance, maxBetsByStrategy, allBetsToConsider.length);
        const minBets = Math.min(2, allBetsToConsider.length); // 至少下注 2 个

        // 按置信度排序，选择最佳的 N 个
        const sortedForBetting = allBetsToConsider
          .sort((a, b) => (b.betInfo.confidence || 0) - (a.betInfo.confidence || 0));

        // 去重：确保每场比赛只选择一个投注（选择置信度最高的）
        const uniqueMatchesMap = new Map<number, typeof sortedForBetting[0]>();
        for (const bet of sortedForBetting) {
          const matchId = bet.match.matchId;
          if (matchId) {
            const existing = uniqueMatchesMap.get(matchId);
            if (!existing || (bet.betInfo.confidence || 0) > (existing.betInfo.confidence || 0)) {
              uniqueMatchesMap.set(matchId, bet);
            }
          }
        }
        const uniqueBets = Array.from(uniqueMatchesMap.values());

        // 确保至少下注 minBets 个，但不超过 maxBets 个
        const targetBetsCount = Math.max(minBets, Math.min(maxBets, uniqueBets.length));
        const betsToPlace = uniqueBets.slice(0, targetBetsCount);

        // 第三步：执行下注
        let actualBetsPlaced = 0;
        for (const betToPlace of betsToPlace) {
          // 检查今天已下注次数
          const currentBetsCount = await getTodayBetsCount(aiId);
          if (currentBetsCount >= maxBets) {
            break;
          }
          
          // 重新获取最新余额
          if (!supabase) continue;
          
          const { data: latestBalance } = await supabase
            .from(AI_BALANCES_TABLE)
            .select('*')
            .eq('ai_id', aiId)
            .single();
          
          if (!latestBalance) continue;
          
          // 使用数据库中已保存的赔率（从分析阶段获取并保存的）
          const savedOdds = betToPlace.betInfo.odds;
          
          // 只使用数据库中的赔率，如果不在范围内则跳过该投注
          if (!savedOdds || savedOdds <= 0 || !isOddsInRange(savedOdds)) {
            // 如果赔率不在范围内，跳过这个投注
            continue;
          }
          
          const finalOdds = savedOdds;
          
          // 更新 betInfo 的赔率
          const finalBetInfo: BetInfo = {
            ...betToPlace.betInfo,
            odds: finalOdds,
          };
          
          // 检查余额
          const stake = calculateStake(finalBetInfo, strategy);
          
          if ((latestBalance.available_balance || 0) < stake) {
            continue;
          }
          
          // 更新 betInfo 的投注金额
          finalBetInfo.betAmount = stake;

          const autoBetResult = await createAutoBet(
            betToPlace.match.matchId,
            aiId,
            aiDisplayName,
            finalBetInfo,
            stake,
            strategy,
            betToPlace.analysisRefs,
          );

          if (autoBetResult.placed) {
            actualBetsPlaced++;
          }
        }

        // 添加未下注的分析结果（每场比赛只选择一个投注，所以检查该比赛是否下注）
        for (const matchAnalysis of matchAnalyses) {
          const wasBetPlaced = betsToPlace.some(btp => 
            btp.match.matchId === matchAnalysis.match.matchId
          );
          
          // 如果该比赛没有下注，记录分析结果
          if (!wasBetPlaced) {
            const overUnderConfidence = matchAnalysis.overUnderBetInfo?.confidence ?? 0;
            const handicapConfidence = matchAnalysis.handicapBetInfo?.confidence ?? 0;
            const maxConfidence = Math.max(overUnderConfidence, handicapConfidence);
            
            let reason = '未能提取有效预测';
            if (maxConfidence > 0) {
              const betType = overUnderConfidence >= handicapConfidence ? '大小球' : '让球盘';
              reason = `置信度(${betType}: ${maxConfidence}%) 未达到下注标准或未被选中`;
            }
            
            const rawAnalysis = matchAnalysis.analyses.find((a) => a.analysis)?.analysis ?? null;
            aiResults.push({
              matchId: matchAnalysis.match.matchId,
              aiId,
              aiDisplayName,
              analyses: matchAnalysis.analyses,
              analysisRefs: matchAnalysis.analysisRefs,
              primaryAnalysis: formatAnalysisResult(rawAnalysis, matchAnalysis.allPredictions),
              autoBet: {
                placed: false,
                reason,
              },
            });
          }
        }

        return aiResults;
      } catch (aiError) {
        console.error(`[${modelConfig.displayName}] 处理失败:`, aiError);
        return [];
      }
    };

    console.log(`[match-analysis] 开始处理 ${MODEL_CONFIGS.length} 个 AI 模型`);
    
    // 优化：限制并发模型数量，避免同时处理太多导致超时
    // 每次最多并行处理 3 个模型
    const MAX_CONCURRENT_MODELS = 3;
    const allResults: any[][] = [];
    
    for (let i = 0; i < MODEL_CONFIGS.length; i += MAX_CONCURRENT_MODELS) {
      const modelBatch = MODEL_CONFIGS.slice(i, i + MAX_CONCURRENT_MODELS);
      console.log(`[match-analysis] 处理模型批次 ${Math.floor(i / MAX_CONCURRENT_MODELS) + 1}/${Math.ceil(MODEL_CONFIGS.length / MAX_CONCURRENT_MODELS)} (${modelBatch.length} 个模型)`);
      
      const batchResults = await Promise.all(
        modelBatch.map(modelConfig => processAIModel(modelConfig))
      );
      allResults.push(...batchResults);
      
      // 批次之间添加短暂延迟
      if (i + MAX_CONCURRENT_MODELS < MODEL_CONFIGS.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`[match-analysis] 所有 AI 模型处理完成，结果数量: ${allResults.map(r => r.length).join(', ')}`);

    // 展平结果数组
    for (const aiResults of allResults) {
      results.push(...aiResults);
    }
    
    console.log(`[match-analysis] 最终结果总数: ${results.length}`);

    const fallbackResult = results.find((item) => item.primaryAnalysis);

    return new Response(
      JSON.stringify({
        analysis: fallbackResult?.primaryAnalysis ?? null,
        analyses: fallbackResult?.analyses ?? [],
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in match-analysis function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "分析失败，请稍后重试",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

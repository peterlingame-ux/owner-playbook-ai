import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

type SettlementResult = "win" | "loss" | "push" | "half_win" | "half_loss" | "void";

type SettlementItem = {
  positionId: number;
  result: SettlementResult;
  payoutAmount?: number;
  notes?: string;
  score?: {
    home: number;
    away: number;
  };
};

type SettlementRequest = {
  settlements?: SettlementItem[];
  dryRun?: boolean;
  autoSettle?: boolean; // 自动结算模式
  matchIds?: number[]; // 可选：指定要结算的比赛ID
};

// 根据 supabase/migrations/20250125000000_redesign_daily_matches_for_sportnanoapi.sql 定义
// match_id 是 INTEGER 类型（纳米数据API的比赛ID）
// home_scores 和 away_scores 是 INTEGER[] 数组，[0] 是常规时间比分
type MatchResult = {
  match_id: number; // 使用 match_id 而不是 fixture_id，与数据库表结构一致
  goals_home: number | null; // 来自 home_scores[0]
  goals_away: number | null; // 来自 away_scores[0]
  status_short: string | null; // 根据 status_id 计算得出
};

type PositionRow = {
  id: number;
  match_id: number | null;
  ai_id: string | null;
  ai_display_name: string;
  bet_type: string;
  prediction: string;
  odds: number;
  stake_amount: number;
  status: string;
  metadata: Record<string, unknown> | null;
  auto_bet_id: number | null;
};

type BalanceRow = {
  id: number;
  ai_id: string | null;
  available_balance: number;
  locked_balance: number;
  currency: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[settle-sim-positions] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，无法写入数据库。",
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const SIM_POSITIONS_TABLE = "sim_positions";
const AI_BALANCES_TABLE = "ai_balances";
const AI_BALANCE_LEDGER_TABLE = "ai_balance_ledger";
const AUTO_BET_TABLE = "ai_auto_bets";
const DAILY_MATCHES_TABLE = "daily_matches";

// 使用新的数据库字段判断比赛是否结束：
// ended > 0（秒级时间戳）或 status_id = 8（完场）表示比赛已结束

const VALID_RESULTS: SettlementResult[] = [
  "win",
  "loss",
  "push",
  "half_win",
  "half_loss",
  "void",
];

const computePayout = (
  item: SettlementItem,
  position: PositionRow,
): { payout: number; pnl: number; status: string } => {
  if (typeof item.payoutAmount === "number" && !Number.isNaN(item.payoutAmount)) {
    const pnl = item.payoutAmount - position.stake_amount;
    const status = item.result === "void" ? "cancelled" : "settled";
    return { payout: item.payoutAmount, pnl, status };
  }

  let payout = 0;
  switch (item.result) {
    case "win":
      payout = position.stake_amount * position.odds;
      break;
    case "half_win":
      // 赢一半：本金 + 一半利润 = stake * (1 + (odds-1)/2) = stake * (1 + odds) / 2
      payout = (position.stake_amount * (1 + position.odds)) / 2;
      break;
    case "half_loss":
      // 输一半：退回一半本金
      payout = position.stake_amount / 2;
      break;
    case "push":
    case "void":
      payout = position.stake_amount;
      break;
    case "loss":
    default:
      payout = 0;
      break;
  }

  const pnl = payout - position.stake_amount;
  const status = item.result === "void" ? "cancelled" : "settled";
  return { payout, pnl, status };
};

const updatePosition = async (
  position: PositionRow,
  settlement: SettlementItem,
  payout: number,
  pnl: number,
  status: string,
) => {
  if (!supabase) return { error: "Supabase client missing" };

  const metadata = {
    ...(position.metadata ?? {}),
    settlement: {
      result: settlement.result,
      payout,
      pnl,
      notes: settlement.notes ?? null,
      score: settlement.score ?? null,
      settledAt: new Date(getUTC8TimestampMs()).toISOString(),
    },
  };

  const { error } = await supabase
    .from(SIM_POSITIONS_TABLE)
    .update({
      status,
      payout_amount: payout,
      pnl,
      settled_at: new Date(getUTC8TimestampMs()).toISOString(),
      metadata,
    })
    .eq("id", position.id);

  return { error };
};

const updateAutoBetStatus = async (
  autoBetId: number | null,
  status: string,
  pnl: number,
) => {
  if (!supabase || !autoBetId) return { error: null };

  const { error } = await supabase
    .from(AUTO_BET_TABLE)
    .update({
      status,
      pnl,
      settled_at: new Date(getUTC8TimestampMs()).toISOString(),
    })
    .eq("id", autoBetId);

  return { error };
};

const updateBalances = async (
  balance: BalanceRow,
  position: PositionRow,
  payout: number,
  settlement: SettlementItem,
) => {
  if (!supabase) {
    return { error: "Supabase client missing" };
  }

  const newAvailable = (balance.available_balance ?? 0) + payout;
  const newLocked = Math.max(
    (balance.locked_balance ?? 0) - position.stake_amount,
    0,
  );

  const { error } = await supabase
    .from(AI_BALANCES_TABLE)
    .update({
      available_balance: newAvailable,
      locked_balance: newLocked,
      updated_at: new Date(getUTC8TimestampMs()).toISOString(),
    })
    .eq("id", balance.id);

  if (error) {
    return { error };
  }

  // 检查是否已经存在该仓位的结算记录，防止重复插入
  if (position.id) {
    const { data: existingLedger, error: checkError } = await supabase
      .from(AI_BALANCE_LEDGER_TABLE)
      .select("id")
      .eq("position_id", position.id)
      .eq("change_type", "settlement")
      .limit(1);

    if (checkError) {
      console.warn(`[settle-sim-positions] 检查余额流水记录失败: ${checkError.message}`);
      // 继续执行插入，因为检查失败不应该阻止结算
    } else if (existingLedger && existingLedger.length > 0) {
      console.log(`[settle-sim-positions] 仓位 ${position.id} 的结算记录已存在，跳过重复插入`);
      return { error: null }; // 已存在记录，返回成功（避免重复插入）
    }
  }

  const ledgerEntry = {
    balance_id: balance.id,
    ai_id: balance.ai_id,
    change_amount: payout,
    change_type: "settlement",
    position_id: position.id,
    auto_bet_id: position.auto_bet_id,
    note: settlement.notes ?? `Settlement: ${settlement.result}`,
  };

  const { error: ledgerError } = await supabase
    .from(AI_BALANCE_LEDGER_TABLE)
    .insert(ledgerEntry);

  return { error: ledgerError };
};

const fetchPositions = async (ids: number[]) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const { data, error } = await supabase
    .from(SIM_POSITIONS_TABLE)
    .select("*")
    .in("id", ids);

  if (error) {
    throw error;
  }

  return data as PositionRow[];
};

const fetchBalances = async (aiIds: (string | null)[]) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const uniqueIds = Array.from(
    new Set(
      aiIds
        .filter((id): id is string => Boolean(id))
        .map((id) => id!),
    ),
  );

  if (uniqueIds.length === 0) {
    return [] as BalanceRow[];
  }

  const { data, error } = await supabase
    .from(AI_BALANCES_TABLE)
    .select("*")
    .in("ai_id", uniqueIds);

  if (error) {
    throw error;
  }

  return data as BalanceRow[];
};

// 查询所有状态为 open 的仓位
const fetchOpenPositions = async (matchIds?: number[]) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  let query = supabase
    .from(SIM_POSITIONS_TABLE)
    .select("*")
    .eq("status", "open");

  if (matchIds && matchIds.length > 0) {
    query = query.in("match_id", matchIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as PositionRow[];
};

// 查询所有已结束的比赛（不限制 matchIds）
// 使用新的数据库字段：match_id, home_scores, away_scores, ended
const fetchAllCompletedMatches = async () => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const now = getUTC8Timestamp(); // 当前时间戳（秒，UTC+8）
  const { data: allMatches, error } = await supabase
    .from(DAILY_MATCHES_TABLE)
    .select("match_id, home_scores, away_scores, ended, status_id")
    .or("ended.gt.0,status_id.eq.8"); // ended > 0 或 status_id = 8（完场）

  if (error) {
    throw error;
  }

  const completedMatches = (allMatches || []).filter((match: any) => {
    const ended = match.ended;
    const endedValue = ended !== null && ended !== undefined 
      ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
      : 0;
    const statusId = match.status_id !== null && match.status_id !== undefined
      ? (typeof match.status_id === 'string' ? parseInt(match.status_id, 10) : Number(match.status_id))
      : null;
    
    // 比赛已结束：ended > 0（秒级时间戳）或 status_id = 8（完场）
    return (!isNaN(endedValue) && endedValue > 0) || (!isNaN(statusId) && statusId === 8);
  });

  return completedMatches.map((match: any) => ({
    match_id: match.match_id ?? 0, // 使用 match_id 与数据库表结构一致
    goals_home: match.home_scores?.[0] ?? 0, // home_scores[0] 是常规时间比分
    goals_away: match.away_scores?.[0] ?? 0, // away_scores[0] 是常规时间比分
    status_short: match.status_id === 8 ? "FT" : null,
  })) as MatchResult[];
};

// 查询已完成的比赛（使用 ended 字段和 status_id 判断）
// 比赛结束逻辑：ended > 0（秒级时间戳）或 status_id = 8（完场）
const fetchCompletedMatches = async (matchIds: number[]) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  if (matchIds.length === 0) {
    return [] as MatchResult[];
  }

  // match_id 是 INTEGER 类型，直接使用数字数组
  const now = getUTC8Timestamp(); // 当前时间戳（秒，UTC+8）
  const { data: allMatches, error } = await supabase
    .from(DAILY_MATCHES_TABLE)
    .select("match_id, home_scores, away_scores, ended, status_id")
    .in("match_id", matchIds)
    .or("ended.gt.0,status_id.eq.8"); // ended > 0 或 status_id = 8（完场）

  if (error) {
    throw error;
  }

  // 过滤：只保留已结束的比赛
  // 比赛结束逻辑：ended > 0（秒级时间戳）或 status_id = 8（完场）
  const completedMatches = (allMatches || []).filter((match: any) => {
    const ended = match.ended;
    const endedValue = ended !== null && ended !== undefined 
      ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
      : 0;
    const statusId = match.status_id !== null && match.status_id !== undefined
      ? (typeof match.status_id === 'string' ? parseInt(match.status_id, 10) : Number(match.status_id))
      : null;
    
    // 比赛已结束：ended > 0（秒级时间戳）或 status_id = 8（完场）
    return (!isNaN(endedValue) && endedValue > 0) || (!isNaN(statusId) && statusId === 8);
  });

  // 转换数据格式以保持兼容性
  return completedMatches.map((match: any) => ({
    match_id: match.match_id ?? 0, // 使用 match_id 与数据库表结构一致
    goals_home: match.home_scores?.[0] ?? 0, // home_scores[0] 是常规时间比分
    goals_away: match.away_scores?.[0] ?? 0, // away_scores[0] 是常规时间比分
    status_short: match.status_id === 8 ? "FT" : null,
  })) as MatchResult[];
};

// 解析让球盘字符串格式（如 "-0.5/1" 或 "-1/1.5"）
// 返回两个盘口值的数组，如果不是分盘格式则返回单个值
const parseHandicapLine = (handicapLine: number | string | null | undefined): number[] => {
  if (handicapLine === null || handicapLine === undefined) {
    return [];
  }
  
  // 如果是数字，直接返回
  if (typeof handicapLine === 'number') {
    return [handicapLine];
  }
  
  // 如果是字符串，尝试解析
  const str = String(handicapLine).trim();
  
  // 检查是否是分盘格式（包含 "/"）
  if (str.includes('/')) {
    const parts = str.split('/').map(part => part.trim());
    if (parts.length === 2) {
      let line1 = parseFloat(parts[0]);
      let line2 = parseFloat(parts[1]);
      if (!isNaN(line1) && !isNaN(line2)) {
        // 亚洲盘分盘规则：第二个数若未带符号，则继承第一个数的符号
        // 如 "-2.5/3" 表示 -2.5 和 -3；"-2/2.5" 表示 -2 和 -2.5
        const part2 = parts[1];
        if (line1 < 0 && !part2.startsWith('+') && !part2.startsWith('-')) {
          line2 = -Math.abs(line2);
        }
        return [line1, line2];
      }
    }
  }
  
  // 尝试解析为单个数字
  const singleLine = parseFloat(str);
  if (!isNaN(singleLine)) {
    return [singleLine];
  }
  
  console.warn(`[settle-sim-positions] 无法解析让球盘格式: ${handicapLine}`);
  return [];
};

// 计算单个让球盘的结果
const calculateSingleHandicapResult = (
  homeScore: number,
  awayScore: number,
  handicapLine: number,
  isHomeBet: boolean,
): "win" | "loss" | "push" => {
  if (isHomeBet) {
    // 主队让球：主队得分 + 让球数 vs 客队得分
    const adjustedHomeScore = homeScore + handicapLine;
    if (adjustedHomeScore > awayScore) {
      return "win";
    } else if (adjustedHomeScore < awayScore) {
      return "loss";
    } else {
      return "push";
    }
  } else {
    // 客队让球：客队得分 + 让球数 vs 主队得分
    const adjustedAwayScore = awayScore + handicapLine;
    if (adjustedAwayScore > homeScore) {
      return "win";
    } else if (adjustedAwayScore < homeScore) {
      return "loss";
    } else {
      return "push";
    }
  }
};

// 根据投注类型和比赛结果计算输赢
const calculateBetResult = (
  position: PositionRow,
  matchResult: MatchResult,
): SettlementResult => {
  const metadata = position.metadata as Record<string, unknown> | null;
  const betType = position.bet_type;
  const prediction = position.prediction;

  // 如果比分为 null，使用默认值 0（允许比分为 null 的比赛也能结算）
  const homeScore = matchResult.goals_home !== null && matchResult.goals_home !== undefined ? matchResult.goals_home : 0;
  const awayScore = matchResult.goals_away !== null && matchResult.goals_away !== undefined ? matchResult.goals_away : 0;
  const totalGoals = homeScore + awayScore;

  // 如果比赛被取消或无效，返回 void
  if (matchResult.status_short === "CANC" || matchResult.status_short === "ABD") {
    return "void";
  }

  if (betType === "handicap") {
    const handicapLine = metadata?.handicapLine as number | string | undefined;
    if (handicapLine === undefined) {
      console.warn(`[settle-sim-positions] 仓位 ${position.id} 缺少 handicapLine`);
      return "void";
    }

    // 解析让球盘（支持数字和字符串格式，如 "-0.5/1"）
    const handicapLines = parseHandicapLine(handicapLine);
    if (handicapLines.length === 0) {
      console.warn(`[settle-sim-positions] 仓位 ${position.id} 无法解析 handicapLine: ${handicapLine}`);
      return "void";
    }

    const isHomeBet = prediction === "HOME" || prediction === "HOME_WIN";

    // 如果是分盘格式（两个盘口值）
    if (handicapLines.length === 2) {
      const [line1, line2] = handicapLines;
      const result1 = calculateSingleHandicapResult(homeScore, awayScore, line1, isHomeBet);
      const result2 = calculateSingleHandicapResult(homeScore, awayScore, line2, isHomeBet);
      
      // 亚洲让球盘分盘规则：
      // - 两个都赢 = win；两个都输 = loss
      // - 一赢一输 = push（退本金）
      // - 一赢一 push = half_win（赢一半）；一输一 push = half_loss（输一半）
      // - 两个都 push = push
      if (result1 === "win" && result2 === "win") return "win";
      if (result1 === "loss" && result2 === "loss") return "loss";
      if (result1 === "push" && result2 === "push") return "push";
      if ((result1 === "win" && result2 === "loss") || (result1 === "loss" && result2 === "win")) return "push";
      if ((result1 === "win" && result2 === "push") || (result1 === "push" && result2 === "win")) return "half_win";
      if ((result1 === "loss" && result2 === "push") || (result1 === "push" && result2 === "loss")) return "half_loss";
      return "push"; // fallback
    } else {
      // 单个盘口值
      return calculateSingleHandicapResult(homeScore, awayScore, handicapLines[0], isHomeBet);
    }
  } else if (betType === "over_under") {
    const overUnderLine = metadata?.overUnderLine as number | string | undefined;
    const overUnderPick = metadata?.overUnderPick as string | undefined;

    if (overUnderLine === undefined || !overUnderPick) {
      console.warn(`[settle-sim-positions] 仓位 ${position.id} 缺少 overUnderLine 或 overUnderPick`);
      return "void";
    }

    // 解析大小球盘口（支持数字和字符串格式，如 "2.5/3"）
    const overUnderLines = parseHandicapLine(overUnderLine);
    if (overUnderLines.length === 0) {
      console.warn(`[settle-sim-positions] 仓位 ${position.id} 无法解析 overUnderLine: ${overUnderLine}`);
      return "void";
    }

    const pick = overUnderPick.toLowerCase();

    // 如果是分盘格式（两个盘口值）
    if (overUnderLines.length === 2) {
      const [line1, line2] = overUnderLines;
      let result1: "win" | "loss" | "push";
      let result2: "win" | "loss" | "push";
      
      if (pick === "over") {
        result1 = totalGoals > line1 ? "win" : totalGoals < line1 ? "loss" : "push";
        result2 = totalGoals > line2 ? "win" : totalGoals < line2 ? "loss" : "push";
      } else if (pick === "under") {
        result1 = totalGoals < line1 ? "win" : totalGoals > line1 ? "loss" : "push";
        result2 = totalGoals < line2 ? "win" : totalGoals > line2 ? "loss" : "push";
      } else {
        console.warn(`[settle-sim-positions] 仓位 ${position.id} 无效的 overUnderPick: ${overUnderPick}`);
        return "void";
      }
      
      // 亚洲大小球分盘规则：同上
      if (result1 === "win" && result2 === "win") return "win";
      if (result1 === "loss" && result2 === "loss") return "loss";
      if (result1 === "push" && result2 === "push") return "push";
      if ((result1 === "win" && result2 === "loss") || (result1 === "loss" && result2 === "win")) return "push";
      if ((result1 === "win" && result2 === "push") || (result1 === "push" && result2 === "win")) return "half_win";
      if ((result1 === "loss" && result2 === "push") || (result1 === "push" && result2 === "loss")) return "half_loss";
      return "push";
    } else {
      // 单个盘口值
      const line = overUnderLines[0];
      if (pick === "over") {
        if (totalGoals > line) {
          return "win";
        } else if (totalGoals < line) {
          return "loss";
        } else {
          return "push";
        }
      } else if (pick === "under") {
        if (totalGoals < line) {
          return "win";
        } else if (totalGoals > line) {
          return "loss";
        } else {
          return "push";
        }
      } else {
        console.warn(`[settle-sim-positions] 仓位 ${position.id} 无效的 overUnderPick: ${overUnderPick}`);
        return "void";
      }
    }
  } else if (betType === "moneyline") {
    // 输赢投注
    if (prediction === "HOME_WIN") {
      return homeScore > awayScore ? "win" : "loss";
    } else if (prediction === "AWAY_WIN") {
      return awayScore > homeScore ? "win" : "loss";
    } else if (prediction === "DRAW") {
      return homeScore === awayScore ? "win" : "loss";
    }
  }

  console.warn(`[settle-sim-positions] 无法计算仓位 ${position.id} 的结果，betType: ${betType}, prediction: ${prediction}`);
  return "void";
};

// 自动结算功能
const autoSettlePositions = async (matchIds?: number[]) => {
  if (!supabase) {
    throw new Error("Supabase 服务未配置，无法自动结算");
  }

  console.log(`[settle-sim-positions] 开始自动结算，指定比赛ID: ${matchIds ? JSON.stringify(matchIds.slice(0, 10)) + (matchIds.length > 10 ? `... (共 ${matchIds.length} 场)` : '') : '全部'}`);

  let completedMatches: MatchResult[];
  let matchIdsToCheck: number[];

  // 如果没有指定 matchIds，先查询所有已结束的比赛，然后找到这些比赛的 open 仓位
  if (!matchIds || matchIds.length === 0) {
    console.log(`[settle-sim-positions] 未指定比赛ID，查询所有已结束的比赛...`);
    completedMatches = await fetchAllCompletedMatches();
    console.log(`[settle-sim-positions] 查询到 ${completedMatches.length} 场已结束的比赛`);
    
    if (completedMatches.length === 0) {
      console.log(`[settle-sim-positions] 没有已结束的比赛，结束自动结算`);
      return {
        settlements: [],
        message: "没有已结束的比赛",
      };
    }

    matchIdsToCheck = completedMatches.map(m => m.match_id).filter(id => id > 0);
    console.log(`[settle-sim-positions] 从已结束比赛中提取到 ${matchIdsToCheck.length} 个有效的 match_id`);
  } else {
    // 如果指定了 matchIds，使用原有逻辑
    matchIdsToCheck = matchIds;
    console.log(`[settle-sim-positions] 步骤2: 查询已完成的比赛（met != 0 且 当前时间 >= met）...`);
    completedMatches = await fetchCompletedMatches(matchIdsToCheck);
    console.log(`[settle-sim-positions] 查询到 ${completedMatches.length} 场已完成的比赛（共检查 ${matchIdsToCheck.length} 场）`);
    
    if (completedMatches.length === 0) {
      console.log(`[settle-sim-positions] 没有已完成的比赛，结束自动结算`);
      return {
        settlements: [],
        message: `没有已完成的比赛（检查了 ${matchIdsToCheck.length} 场比赛）`,
      };
    }
  }

  // 1. 查询所有状态为 open 的仓位
  console.log(`[settle-sim-positions] 步骤1: 查询所有状态为 open 的仓位...`);
  const openPositions = await fetchOpenPositions(matchIdsToCheck.length > 0 ? matchIdsToCheck : undefined);
  console.log(`[settle-sim-positions] 查询到 ${openPositions.length} 个 open 状态的仓位`);
  
  if (openPositions.length === 0) {
    console.log(`[settle-sim-positions] 没有需要结算的仓位，结束自动结算`);
    return {
      settlements: [],
      message: "没有需要结算的仓位",
    };
  }

  // 打印仓位详情
  const positionDetails = openPositions.slice(0, 5).map(p => ({
    id: p.id,
    match_id: p.match_id,
    ai_id: p.ai_id,
    bet_type: p.bet_type,
    prediction: p.prediction
  }));
  console.log(`[settle-sim-positions] 仓位详情（前5个）:`, JSON.stringify(positionDetails, null, 2));

  // 打印已完成比赛详情（此时 completedMatches 已经确定被赋值）
  const matchDetails = (completedMatches || []).slice(0, 5).map(m => ({
    match_id: m.match_id,
    goals_home: m.goals_home,
    goals_away: m.goals_away,
    status_short: m.status_short
  }));
  console.log(`[settle-sim-positions] 已完成比赛详情（前5场）:`, JSON.stringify(matchDetails, null, 2));

  const matchMap = new Map<number, MatchResult>();
  (completedMatches || []).forEach((match) => {
    matchMap.set(match.match_id, match);
  });

  // 4. 为每个仓位计算结算结果
  console.log(`[settle-sim-positions] 步骤4: 为每个仓位计算结算结果...`);
  const settlements: SettlementItem[] = [];
  let skippedCount = 0;
  let noMatchResultCount = 0;

  for (const position of openPositions) {
    if (!position.match_id) {
      skippedCount++;
      console.log(`[settle-sim-positions] 跳过仓位 ${position.id}: match_id 为 null`);
      continue;
    }

    const matchResult = matchMap.get(position.match_id);
    if (!matchResult) {
      // 比赛尚未完成，跳过
      noMatchResultCount++;
      continue;
    }

    const result = calculateBetResult(position, matchResult);
    const homeScore = matchResult.goals_home ?? 0;
    const awayScore = matchResult.goals_away ?? 0;

    console.log(`[settle-sim-positions] 仓位 ${position.id} 结算结果: match_id=${position.match_id}, bet_type=${position.bet_type}, prediction=${position.prediction}, 比分=${homeScore}-${awayScore}, 结果=${result}`);

    settlements.push({
      positionId: position.id,
      result,
      notes: `自动结算：${position.bet_type} - ${position.prediction}`,
      score: {
        home: homeScore,
        away: awayScore,
      },
    });
  }

  console.log(`[settle-sim-positions] 自动结算完成: 总计 ${openPositions.length} 个仓位，成功计算 ${settlements.length} 个，跳过 ${skippedCount} 个（无 match_id），${noMatchResultCount} 个比赛未完成`);

  return {
    settlements,
    message: `找到 ${settlements.length} 个需要结算的仓位`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!supabase) {
      throw new Error("Supabase 服务未配置，无法结算");
    }

    const body = await req.json() as SettlementRequest;
    console.log(`[settle-sim-positions] 收到结算请求:`, JSON.stringify({
      autoSettle: body.autoSettle,
      matchIds_count: body.matchIds?.length || 0,
      settlements_count: body.settlements?.length || 0,
      dryRun: body.dryRun
    }, null, 2));
    
    // 自动结算模式
    if (body.autoSettle) {
      console.log(`[settle-sim-positions] 自动结算模式已启用，开始自动结算...`);
      const autoSettleResult = await autoSettlePositions(body.matchIds);
      
      console.log(`[settle-sim-positions] 自动结算结果:`, JSON.stringify({
        message: autoSettleResult.message,
        settlements_count: autoSettleResult.settlements.length
      }, null, 2));
      
      if (autoSettleResult.settlements.length === 0) {
        console.log(`[settle-sim-positions] 没有需要结算的仓位，返回空结果`);
        return new Response(
          JSON.stringify({
            message: autoSettleResult.message,
            settlements: [],
            outcomes: [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // 使用自动生成的结算数据继续处理
      body.settlements = autoSettleResult.settlements;
      console.log(`[settle-sim-positions] 使用自动生成的结算数据继续处理，共 ${body.settlements.length} 个结算项`);
    }

    if (!Array.isArray(body.settlements) || body.settlements.length === 0) {
      return new Response(
        JSON.stringify({ error: "缺少 settlements 数据" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const invalidItem = body.settlements.find((item) =>
      !VALID_RESULTS.includes(item.result)
    );
    if (invalidItem) {
      return new Response(
        JSON.stringify({
          error: `存在非法 result：${invalidItem.result}`,
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    const positionIds = Array.from(
      new Set(body.settlements.map((item) => item.positionId)),
    );
    const positions = await fetchPositions(positionIds);

    const positionMap = new Map<number, PositionRow>();
    positions.forEach((position) => {
      positionMap.set(position.id, position);
    });

    const missingPositions = positionIds.filter((id) =>
      !positionMap.has(id)
    );
    if (missingPositions.length > 0) {
      return new Response(
        JSON.stringify({
          error: "部分仓位不存在",
          missingPositionIds: missingPositions,
        }),
        { status: 404, headers: corsHeaders },
      );
    }

    const balances = await fetchBalances(
      positions.map((pos) => pos.ai_id ?? pos.ai_display_name),
    );
    const balanceMap = new Map<string, BalanceRow>();
    balances.forEach((balance) => {
      if (balance.ai_id) {
        balanceMap.set(balance.ai_id, balance);
      }
    });

    const outcomes: Array<{
      positionId: number;
      status: string;
      reason?: string;
      payout?: number;
      pnl?: number;
      error?: unknown;
    }> = [];

    console.log(`[settle-sim-positions] 开始处理 ${body.settlements.length} 个结算项...`);
    let processedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let settledCount = 0;

    for (const settlement of body.settlements) {
      processedCount++;
      const position = positionMap.get(settlement.positionId)!;

      console.log(`[settle-sim-positions] 处理结算项 ${processedCount}/${body.settlements.length}: position_id=${settlement.positionId}, result=${settlement.result}`);

      if (position.status !== "open") {
        console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 跳过（状态=${position.status}，非 open）`);
        outcomes.push({
          positionId: position.id,
          status: "skipped",
          reason: "仓位非 open 状态",
        });
        skippedCount++;
        continue;
      }

      const balanceKey = position.ai_id ?? position.ai_display_name;
      const balance = balanceMap.get(balanceKey);

      if (!balance) {
        console.warn(`[settle-sim-positions] 仓位 ${settlement.positionId}: 跳过（未找到余额账户，ai_id=${position.ai_id}, ai_display_name=${position.ai_display_name}）`);
        outcomes.push({
          positionId: position.id,
          status: "skipped",
          reason: "未找到对应余额账户",
        });
        skippedCount++;
        continue;
      }

      const { payout, pnl, status } = computePayout(settlement, position);
      console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 计算结果 - payout=${payout}, pnl=${pnl}, status=${status}, stake_amount=${position.stake_amount}, odds=${position.odds}`);

      if (body.dryRun) {
        console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 试运行模式，跳过实际更新`);
        outcomes.push({
          positionId: position.id,
          status: "dry_run",
          payout,
          pnl,
        });
        continue;
      }

      console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 开始更新仓位记录...`);
      const positionUpdate = await updatePosition(
        position,
        settlement,
        payout,
        pnl,
        status,
      );
      if (positionUpdate.error) {
        console.error(`[settle-sim-positions] 仓位 ${settlement.positionId}: 更新仓位记录失败`, positionUpdate.error);
        outcomes.push({
          positionId: position.id,
          status: "failed",
          error: positionUpdate.error,
        });
        failedCount++;
        continue;
      }
      console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 仓位记录更新成功`);

      if (position.auto_bet_id) {
        console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 开始更新 AI 自动下注记录 (auto_bet_id=${position.auto_bet_id})...`);
        const autoBetUpdate = await updateAutoBetStatus(
          position.auto_bet_id,
          status,
          pnl,
        );
        if (autoBetUpdate.error) {
          console.error(`[settle-sim-positions] 仓位 ${settlement.positionId}: 更新 AI 自动下注记录失败`, autoBetUpdate.error);
          outcomes.push({
            positionId: position.id,
            status: "failed",
            error: autoBetUpdate.error,
          });
          failedCount++;
          continue;
        }
        console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: AI 自动下注记录更新成功`);
      }

      const oldBalance = balance.available_balance;
      const oldLocked = balance.locked_balance;
      const newBalance = oldBalance + payout;
      const newLocked = Math.max(oldLocked - position.stake_amount, 0);
      
      console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 开始更新余额 (ai_id=${balance.ai_id}) - 旧可用余额=${oldBalance}, 新可用余额=${newBalance}, 旧锁定余额=${oldLocked}, 新锁定余额=${newLocked}`);
      
      const balanceUpdate = await updateBalances(
        balance,
        position,
        payout,
        settlement,
      );
      if (balanceUpdate.error) {
        console.error(`[settle-sim-positions] 仓位 ${settlement.positionId}: 更新余额失败`, balanceUpdate.error);
        outcomes.push({
          positionId: position.id,
          status: "failed",
          error: balanceUpdate.error,
        });
        failedCount++;
        continue;
      }
      console.log(`[settle-sim-positions] 仓位 ${settlement.positionId}: 余额更新成功`);

      settledCount++;
      outcomes.push({
        positionId: position.id,
        status: "settled",
        payout,
        pnl,
      });
      console.log(`[settle-sim-positions] 仓位 ${settlement.positionId} 结算完成: status=settled, payout=${payout}, pnl=${pnl}, 进度=${settledCount}/${body.settlements.length}`);
    }

    console.log(`[settle-sim-positions] ========== 结算处理完成 ==========`);
    console.log(`[settle-sim-positions] 总计: ${body.settlements.length} 个结算项`);
    console.log(`[settle-sim-positions] 成功结算: ${settledCount}`);
    console.log(`[settle-sim-positions] 跳过: ${skippedCount}`);
    console.log(`[settle-sim-positions] 失败: ${failedCount}`);
    console.log(`[settle-sim-positions] 试运行: ${outcomes.filter(o => o.status === 'dry_run').length}`);

    return new Response(
      JSON.stringify({ outcomes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[settle-sim-positions] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "结算失败",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});


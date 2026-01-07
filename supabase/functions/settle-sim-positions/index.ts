import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SettlementResult = "win" | "loss" | "push" | "void";

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

type MatchResult = {
  fixture_id: number;
  goals_home: number | null;
  goals_away: number | null;
  status_short: string | null;
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

// 不再使用 COMPLETED_STATUSES，改用 met 字段判断
// met != 0 且 met 不为 null 表示比赛已结束

const VALID_RESULTS: SettlementResult[] = [
  "win",
  "loss",
  "push",
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
      settledAt: new Date().toISOString(),
    },
  };

  const { error } = await supabase
    .from(SIM_POSITIONS_TABLE)
    .update({
      status,
      payout_amount: payout,
      pnl,
      settled_at: new Date().toISOString(),
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
      settled_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", balance.id);

  if (error) {
    return { error };
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

// 查询已完成的比赛（使用 met 字段判断）
const fetchCompletedMatches = async (matchIds: number[]) => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  if (matchIds.length === 0) {
    return [] as MatchResult[];
  }

  // 将 matchIds 转换为字符串数组（因为 mid 是 TEXT 类型）
  const matchIdsStr = matchIds.map(id => String(id));

  const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
  const { data: allMatches, error } = await supabase
    .from(DAILY_MATCHES_TABLE)
    .select("mid, mhs, mas, met")
    .in("mid", matchIdsStr)
    .neq("met", 0) // met != 0 表示比赛已结束
    .not("met", "is", null); // 排除 met 为 null 的情况

  if (error) {
    throw error;
  }

  // 过滤：只保留当前时间 > met 的比赛（确保比赛确实已经结束）
  const completedMatches = (allMatches || []).filter((match: any) => {
    const met = match.met;
    const metValue = typeof met === "string" ? parseInt(met) : (met ?? 0);
    return metValue !== 0 && metValue <= now; // met != 0 且 当前时间 >= met
  });

  // 转换数据格式以保持兼容性
  return completedMatches.map((match: any) => ({
    fixture_id: match.mid ? parseInt(match.mid) || 0 : 0,
    goals_home: match.mhs ?? null,
    goals_away: match.mas ?? null,
    status_short: match.met ? "FT" : null, // 保持兼容性，但实际不再使用
  })) as MatchResult[];
};

// 根据投注类型和比赛结果计算输赢
const calculateBetResult = (
  position: PositionRow,
  matchResult: MatchResult,
): SettlementResult => {
  const metadata = position.metadata as Record<string, unknown> | null;
  const betType = position.bet_type;
  const prediction = position.prediction;

  const homeScore = matchResult.goals_home ?? 0;
  const awayScore = matchResult.goals_away ?? 0;
  const totalGoals = homeScore + awayScore;

  // 如果比赛被取消或无效，返回 void
  if (matchResult.status_short === "CANC" || matchResult.status_short === "ABD") {
    return "void";
  }

  if (betType === "handicap") {
    const handicapLine = metadata?.handicapLine as number | undefined;
    if (handicapLine === undefined) {
      console.warn(`[settle-sim-positions] 仓位 ${position.id} 缺少 handicapLine`);
      return "void";
    }

    if (prediction === "HOME") {
      // 主队让球：主队得分 + 让球数 > 客队得分
      const adjustedHomeScore = homeScore + handicapLine;
      if (adjustedHomeScore > awayScore) {
        return "win";
      } else if (adjustedHomeScore < awayScore) {
        return "loss";
      } else {
        return "push";
      }
    } else if (prediction === "AWAY") {
      // 客队让球：客队得分 + 让球数 > 主队得分
      const adjustedAwayScore = awayScore + handicapLine;
      if (adjustedAwayScore > homeScore) {
        return "win";
      } else if (adjustedAwayScore < homeScore) {
        return "loss";
      } else {
        return "push";
      }
    }
  } else if (betType === "over_under") {
    const overUnderLine = metadata?.overUnderLine as number | undefined;
    const overUnderPick = metadata?.overUnderPick as string | undefined;

    if (overUnderLine === undefined || !overUnderPick) {
      console.warn(`[settle-sim-positions] 仓位 ${position.id} 缺少 overUnderLine 或 overUnderPick`);
      return "void";
    }

    const pick = overUnderPick.toLowerCase();
    if (pick === "over") {
      if (totalGoals > overUnderLine) {
        return "win";
      } else if (totalGoals < overUnderLine) {
        return "loss";
      } else {
        return "push";
      }
    } else if (pick === "under") {
      if (totalGoals < overUnderLine) {
        return "win";
      } else if (totalGoals > overUnderLine) {
        return "loss";
      } else {
        return "push";
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

  // 1. 查询所有状态为 open 的仓位
  const openPositions = await fetchOpenPositions(matchIds);
  
  if (openPositions.length === 0) {
    return {
      settlements: [],
      message: "没有需要结算的仓位",
    };
  }

  // 2. 获取所有相关的 match_id
  const matchIdsToCheck = Array.from(
    new Set(
      openPositions
        .map((p) => p.match_id)
        .filter((id): id is number => id !== null),
    ),
  );

  if (matchIdsToCheck.length === 0) {
    return {
      settlements: [],
      message: "没有有效的比赛ID",
    };
  }

  // 3. 查询已完成的比赛
  const completedMatches = await fetchCompletedMatches(matchIdsToCheck);
  const matchMap = new Map<number, MatchResult>();
  completedMatches.forEach((match) => {
    matchMap.set(match.fixture_id, match);
  });

  // 4. 为每个仓位计算结算结果
  const settlements: SettlementItem[] = [];

  for (const position of openPositions) {
    if (!position.match_id) {
      continue;
    }

    const matchResult = matchMap.get(position.match_id);
    if (!matchResult) {
      // 比赛尚未完成，跳过
      continue;
    }

    const result = calculateBetResult(position, matchResult);
    const homeScore = matchResult.goals_home ?? 0;
    const awayScore = matchResult.goals_away ?? 0;

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
    
    // 自动结算模式
    if (body.autoSettle) {
      const autoSettleResult = await autoSettlePositions(body.matchIds);
      
      if (autoSettleResult.settlements.length === 0) {
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

    for (const settlement of body.settlements) {
      const position = positionMap.get(settlement.positionId)!;

      if (position.status !== "open") {
        outcomes.push({
          positionId: position.id,
          status: "skipped",
          reason: "仓位非 open 状态",
        });
        continue;
      }

      const balanceKey = position.ai_id ?? position.ai_display_name;
      const balance = balanceMap.get(balanceKey);

      if (!balance) {
        outcomes.push({
          positionId: position.id,
          status: "skipped",
          reason: "未找到对应余额账户",
        });
        continue;
      }

      const { payout, pnl, status } = computePayout(settlement, position);

      if (body.dryRun) {
        outcomes.push({
          positionId: position.id,
          status: "dry_run",
          payout,
          pnl,
        });
        continue;
      }

      const positionUpdate = await updatePosition(
        position,
        settlement,
        payout,
        pnl,
        status,
      );
      if (positionUpdate.error) {
        outcomes.push({
          positionId: position.id,
          status: "failed",
          error: positionUpdate.error,
        });
        continue;
      }

      const autoBetUpdate = await updateAutoBetStatus(
        position.auto_bet_id,
        status,
        pnl,
      );
      if (autoBetUpdate.error) {
        outcomes.push({
          positionId: position.id,
          status: "failed",
          error: autoBetUpdate.error,
        });
        continue;
      }

      const balanceUpdate = await updateBalances(
        balance,
        position,
        payout,
        settlement,
      );
      if (balanceUpdate.error) {
        outcomes.push({
          positionId: position.id,
          status: "failed",
          error: balanceUpdate.error,
        });
        continue;
      }

      outcomes.push({
        positionId: position.id,
        status: "settled",
        payout,
        pnl,
      });
    }

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


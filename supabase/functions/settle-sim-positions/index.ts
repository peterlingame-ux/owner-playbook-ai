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
  settlements: SettlementItem[];
  dryRun?: boolean;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!supabase) {
      throw new Error("Supabase 服务未配置，无法结算");
    }

    const body = await req.json() as SettlementRequest;
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

    const outcomes = [];

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


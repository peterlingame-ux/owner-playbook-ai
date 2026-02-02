/**
 * 每日随机用户下注（仅种子用户）
 * 1. 仅对 is_seed_user=true 的种子用户下注，不触碰真实用户
 * 2. 比赛数据来源：ai_auto_bets 表中 HUNSOCCER 模型（ai_id=hunsoccermax）的待结算下注
 * 3. 随机挑选比赛、随机挑选种子用户；同一场比赛允许多个用户各下 1 注，每人每场比赛只能下注一次，下注内容与 HUNSOCCER 该场一致
 */
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
    "[daily-random-user-bets] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，无法执行。",
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const USERS_TABLE = "users";
const USER_BALANCES_TABLE = "user_balances";
const DAILY_MATCHES_TABLE = "daily_matches";
const AI_AUTO_BETS_TABLE = "ai_auto_bets";

/** HUNSOCCER 模型在 ai_auto_bets 中的 ai_id（与 match-analysis 一致） */
const HUNSOCCER_AI_ID = "hunsoccermax";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomDecimal(min: number, max: number, decimals = 2): number {
  const v = min + Math.random() * (max - min);
  return Number(v.toFixed(decimals));
}

/** 获取 UTC+8 日期 YYYY-MM-DD（与 daily_matches、AI今日赛事预测一致） */
function getUTC8DateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 盘口转 decimal（人工预测/place_bet 用）：支持数字或 "2.5/3" 取首段 */
function lineToDecimal(line: number | string): number {
  if (typeof line === "number" && !isNaN(line)) return line;
  const s = String(line).trim();
  if (s.includes("/")) {
    const first = parseFloat(s.split("/")[0].trim());
    return !isNaN(first) ? first : 2.5;
  }
  const n = parseFloat(s);
  return !isNaN(n) ? n : 2.5;
}

/** ai_auto_bets 表中一行（HUNSOCCER 的让球/大小球下注），用于种子用户跟同场同选项 */
type HunSoccerBetRow = {
  match_id: number;
  bet_type: string;
  prediction: string;
  odds: number;
  handicap_line: string | null;
  over_under_line: string | null;
  over_under_pick: string | null;
  confidence: number | null;
};
type RunOptions = {
  maxUsers: number;
  maxMatches: number;
  maxUsersPerMatch: number; // 同一场比赛最多多少名用户各下 1 注（每人每场仍仅 1 注）
  minBetAmount: number;
  maxBetAmount: number;
};

async function runDailyRandomUserBets(options: RunOptions): Promise<{
  placed: number;
  failed: number;
  usersProcessed: number;
  matchesAvailable: number;
  message: string;
}> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const { maxUsers, maxMatches, maxUsersPerMatch, minBetAmount, maxBetAmount } = options;

  const today = getUTC8DateString(new Date());
  console.log(`[daily-random-user-bets] 日期: ${today}（仅今日，与用户模型一致）`);

  // ---------- 用户数据（带错误与空判断） ----------
  // 仅种子用户：is_seed_user = true，且余额 >= 最小下注金额（不触碰真实用户）
  const { data: seedUsersData, error: seedError } = await supabase
    .from(USERS_TABLE)
    .select("id")
    .eq("is_seed_user", true)
    .limit(maxUsers * 2);

  if (seedError) {
    throw seedError;
  }

  const seedIds = (seedUsersData || []).map((r: { id: string }) => r.id);
  if (seedIds.length === 0) {
    console.log("[daily-random-user-bets] 无种子用户（is_seed_user=true）");
    return {
      placed: 0,
      failed: 0,
      usersProcessed: 0,
      matchesAvailable: 0,
      message: "No seed users (is_seed_user=true)",
    };
  }

  const { data: balancesData, error: balError } = await supabase
    .from(USER_BALANCES_TABLE)
    .select("user_id")
    .in("user_id", seedIds)
    .gte("balance", minBetAmount)
    .limit(maxUsers * 2);

  if (balError) {
    throw balError;
  }

  const userIds = shuffle((balancesData || []).map((r: { user_id: string }) => r.user_id)).slice(0, maxUsers);

  if (userIds.length === 0) {
    console.log("[daily-random-user-bets] 无满足余额条件的种子用户");
    return {
      placed: 0,
      failed: 0,
      usersProcessed: 0,
      matchesAvailable: 0,
      message: "No seed users with sufficient balance",
    };
  }

  // ---------- 比赛数据：来自 ai_auto_bets（HUNSOCCER 模型），只取「今天」的数据 ----------
  const todayStartUTC8 = new Date(`${today}T00:00:00+08:00`).toISOString();
  const { data: autoBetsData, error: autoBetsError } = await supabase
    .from(AI_AUTO_BETS_TABLE)
    .select("match_id, bet_type, prediction, odds, handicap_line, over_under_line, over_under_pick, confidence")
    .eq("ai_id", HUNSOCCER_AI_ID)
    .eq("status", "pending")
    .in("bet_type", ["handicap", "over_under"])
    .gte("inserted_at", todayStartUTC8) // 判断：只取今天（UTC+8 0 点及之后）插入的记录
    .order("inserted_at", { ascending: false })
    .limit(maxMatches * 2);

  if (autoBetsError) {
    throw autoBetsError;
  }

  const autoBets = (autoBetsData || []) as HunSoccerBetRow[];
  // 每场比赛只保留一条；校验 match_id 有效、odds>0、bet_type 为 handicap/over_under
  const seenMatchIds = new Set<number>();
  const oneBetPerMatch: HunSoccerBetRow[] = [];
  for (const row of autoBets) {
    const matchId = row?.match_id;
    if (matchId == null || typeof matchId !== "number" || isNaN(matchId)) continue;
    if (seenMatchIds.has(matchId)) continue;
    const oddsNum = Number(row.odds);
    if (row.odds == null || isNaN(oddsNum) || oddsNum <= 0) continue;
    if (row.bet_type !== "handicap" && row.bet_type !== "over_under") continue;
    seenMatchIds.add(matchId);
    oneBetPerMatch.push(row);
  }
  const bettableBets = shuffle(oneBetPerMatch);

  if (bettableBets.length === 0) {
    console.log("[daily-random-user-bets] 无 HUNSOCCER 模型今日待结算下注（ai_auto_bets）");
    return {
      placed: 0,
      failed: 0,
      usersProcessed: userIds.length,
      matchesAvailable: 0,
      message: "No HUNSOCCER pending bets today",
    };
  }

  // 从 daily_matches 取 match_time 用于 match_date（带错误判断）
  const matchIds = bettableBets.map((b) => b.match_id);
  const { data: matchesData, error: matchesErr } = await supabase
    .from(DAILY_MATCHES_TABLE)
    .select("match_id, match_time")
    .in("match_id", matchIds);
  if (matchesErr) {
    console.warn("[daily-random-user-bets] 获取 daily_matches 失败，match_date 将用当前时间:", matchesErr.message);
  }
  const matchTimeByMatchId: Record<number, number> = {};
  for (const m of matchesData || []) {
    const mid = (m as { match_id: number; match_time: number | null }).match_id;
    const mt = (m as { match_id: number; match_time: number | null }).match_time;
    if (mid != null && mt != null && !isNaN(Number(mt))) matchTimeByMatchId[mid] = Number(mt);
  }

  console.log(
    `[daily-random-user-bets] HUNSOCCER 下注比赛数: ${bettableBets.length}，同一场最多 ${maxUsersPerMatch} 名用户各下 1 注`,
  );

  let placed = 0;
  let failed = 0;
  const shuffledUsers = shuffle([...userIds]);
  // 同一场比赛允许多个用户各下 1 注；每人每场比赛只能下注一次
  for (const row of bettableBets) {
    const matchId = row.match_id;
    if (matchId == null || typeof matchId !== "number" || isNaN(matchId)) continue;
    const matchTime = matchTimeByMatchId[matchId] ?? Math.floor(Date.now() / 1000);
    const matchDate = new Date(matchTime * 1000).toISOString();
    const k = Math.min(
      shuffledUsers.length,
      Math.max(1, randomInt(1, maxUsersPerMatch)),
    );
    const usersForThisMatch = shuffle([...shuffledUsers]).slice(0, k);

    const predictionType = row.bet_type === "over_under" ? "over_under" : "handicap";
    let prediction: string;
    if (predictionType === "over_under") {
      prediction = (row.over_under_pick || row.prediction || "").toLowerCase();
      if (prediction !== "over" && prediction !== "under") {
        prediction = String(row.prediction || "").toUpperCase() === "OVER" ? "over" : "under";
      }
    } else {
      prediction = (row.prediction || "").toLowerCase();
      if (prediction !== "home" && prediction !== "away") {
        prediction = String(row.prediction || "").toUpperCase() === "HOME" ? "home" : "away";
      }
    }
    const handicapLine =
      row.handicap_line != null ? lineToDecimal(row.handicap_line) : null;
    const overUnderLine =
      row.over_under_line != null ? lineToDecimal(row.over_under_line) : null;
    const odds = Number(row.odds);
    const confidence = row.confidence != null ? Math.round(Number(row.confidence)) : randomInt(60, 95);

    if (!Number.isFinite(odds) || odds <= 0) continue;

    for (const userId of usersForThisMatch) {
      const betAmount = randomDecimal(minBetAmount, maxBetAmount);
      const potentialPayout = Number((betAmount * odds).toFixed(2));

      const { data: rpcData, error: rpcError } = await supabase.rpc("place_bet", {
        p_user_id: userId,
        p_match_id: String(matchId),
        p_prediction_type: predictionType,
        p_prediction: prediction,
        p_bet_amount: betAmount,
        p_potential_payout: potentialPayout,
        p_match_date: matchDate,
        p_handicap_line: handicapLine,
        p_over_under_line: overUnderLine,
        p_confidence: confidence,
      });

      if (rpcError) {
        console.warn(`[daily-random-user-bets] place_bet 失败: ${rpcError.message}`);
        failed++;
        continue;
      }

      const result = rpcData as { success?: boolean };
      if (result?.success) {
        placed++;
      } else {
        failed++;
      }
    }
  }

  console.log(
    `[daily-random-user-bets] 完成: 成功=${placed}, 失败=${failed}, 用户数=${userIds.length}, 比赛数=${bettableBets.length}`,
  );

  return {
    placed,
    failed,
    usersProcessed: userIds.length,
    matchesAvailable: bettableBets.length,
    message: `成功下注 ${placed} 笔`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" && req.headers.get("content-type")?.includes("application/json")
      ? await req.json().catch(() => ({}))
      : {};

    const result = await runDailyRandomUserBets({
      maxUsers: body.max_users ?? 50,
      maxMatches: body.max_matches ?? 50,
      maxUsersPerMatch: body.max_users_per_match ?? 10,
      minBetAmount: body.min_bet_amount ?? 50,
      maxBetAmount: body.max_bet_amount ?? 500,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[daily-random-user-bets] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

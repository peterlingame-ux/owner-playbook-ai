import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SettlementResult = "win" | "loss" | "push" | "void";

type MatchResult = {
  match_id: number;
  goals_home: number | null;
  goals_away: number | null;
  status_short: string | null;
};

type AutoBet = {
  id: number;
  match_id: number | null;
  ai_id: string | null;
  bet_type: string;
  prediction: string;
  odds: number;
  stake_amount: number;
  status: string;
  handicap_line: number | null;
  over_under_line: number | null;
  over_under_pick: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[settle-ai-auto-bets] SUPABASE_URL 或 SERVICE_ROLE_KEY 未配置，无法写入数据库。",
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const AUTO_BET_TABLE = "ai_auto_bets";
const DAILY_MATCHES_TABLE = "daily_matches";

// 查询所有已结束的比赛
const fetchCompletedMatches = async (): Promise<MatchResult[]> => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const { data: allMatches, error } = await supabase
    .from(DAILY_MATCHES_TABLE)
    .select("match_id, home_scores, away_scores, ended, status_id")
    .or("ended.gt.0,status_id.eq.8"); // ended > 0 或 status_id = 8（完场）

  if (error) {
    throw error;
  }

  // 过滤：只保留已结束的比赛
  const completedMatches = (allMatches || []).filter((match: any) => {
    const ended = match.ended;
    const endedValue = ended !== null && ended !== undefined 
      ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
      : 0;
    const statusId = match.status_id !== null && match.status_id !== undefined
      ? (typeof statusId === 'string' ? parseInt(statusId, 10) : Number(statusId))
      : null;
    
    // 比赛已结束：ended > 0（秒级时间戳）或 status_id = 8（完场）
    return (!isNaN(endedValue) && endedValue > 0) || (!isNaN(statusId) && statusId === 8);
  });

  return completedMatches.map((match: any) => ({
    match_id: match.match_id ?? 0,
    goals_home: match.home_scores?.[0] ?? null, // home_scores[0] 是常规时间比分
    goals_away: match.away_scores?.[0] ?? null, // away_scores[0] 是常规时间比分
    status_short: match.status_id === 8 ? "FT" : null,
  })) as MatchResult[];
};

// 根据投注类型和比赛结果计算输赢
const calculateBetResult = (
  bet: AutoBet,
  matchResult: MatchResult,
): SettlementResult => {
  const betType = bet.bet_type;
  const prediction = bet.prediction;

  // 如果比分为 null，使用默认值 0
  const homeScore = matchResult.goals_home !== null && matchResult.goals_home !== undefined ? matchResult.goals_home : 0;
  const awayScore = matchResult.goals_away !== null && matchResult.goals_away !== undefined ? matchResult.goals_away : 0;
  const totalGoals = homeScore + awayScore;

  // 如果比赛被取消或无效，返回 void
  if (matchResult.status_short === "CANC" || matchResult.status_short === "ABD") {
    return "void";
  }

  if (betType === "handicap") {
    const handicapLine = bet.handicap_line;
    if (handicapLine === null || handicapLine === undefined) {
      console.warn(`[settle-ai-auto-bets] 投注 ${bet.id} 缺少 handicap_line`);
      return "void";
    }

    if (prediction === "HOME" || prediction === "HOME_WIN") {
      // 主队让球：主队得分 + 让球数 > 客队得分
      const adjustedHomeScore = homeScore + handicapLine;
      if (adjustedHomeScore > awayScore) {
        return "win";
      } else if (adjustedHomeScore < awayScore) {
        return "loss";
      } else {
        return "push";
      }
    } else if (prediction === "AWAY" || prediction === "AWAY_WIN") {
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
    const overUnderLine = bet.over_under_line;
    const overUnderPick = bet.over_under_pick;

    if (overUnderLine === null || overUnderLine === undefined || !overUnderPick) {
      console.warn(`[settle-ai-auto-bets] 投注 ${bet.id} 缺少 over_under_line 或 over_under_pick`);
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
    if (prediction === "HOME_WIN" || prediction === "HOME") {
      return homeScore > awayScore ? "win" : "loss";
    } else if (prediction === "AWAY_WIN" || prediction === "AWAY") {
      return awayScore > homeScore ? "win" : "loss";
    } else if (prediction === "DRAW") {
      return homeScore === awayScore ? "win" : "loss";
    }
  }

  console.warn(`[settle-ai-auto-bets] 无法计算投注 ${bet.id} 的结果，betType: ${betType}, prediction: ${prediction}`);
  return "void";
};

// 计算盈亏
const calculatePnl = (bet: AutoBet, result: SettlementResult): number => {
  if (result === "win") {
    // 盈利 = (赔率 * 投注金额) - 投注金额
    return (bet.odds * bet.stake_amount) - bet.stake_amount;
  } else if (result === "loss") {
    // 亏损 = -投注金额
    return -bet.stake_amount;
  } else {
    // push 或 void：盈亏为 0
    return 0;
  }
};

// 自动结算功能
const autoSettleBets = async () => {
  if (!supabase) {
    throw new Error("Supabase 服务未配置，无法自动结算");
  }

  console.log(`[settle-ai-auto-bets] 开始自动结算 AI 自动下注...`);

  // 1. 查询所有已结束的比赛
  console.log(`[settle-ai-auto-bets] 步骤1: 查询所有已结束的比赛...`);
  const completedMatches = await fetchCompletedMatches();
  console.log(`[settle-ai-auto-bets] 查询到 ${completedMatches.length} 场已结束的比赛`);

  if (completedMatches.length === 0) {
    console.log(`[settle-ai-auto-bets] 没有已结束的比赛，结束自动结算`);
    return {
      settled: 0,
      message: "没有已结束的比赛",
    };
  }

  const matchIds = completedMatches.map(m => m.match_id).filter(id => id > 0);
  console.log(`[settle-ai-auto-bets] 提取到 ${matchIds.length} 个有效的 match_id`);

  // 2. 查询这些比赛中待结算的投注
  console.log(`[settle-ai-auto-bets] 步骤2: 查询待结算的投注（status = 'pending' 或 'confirmed'）...`);
  const { data: pendingBets, error: betsError } = await supabase
    .from(AUTO_BET_TABLE)
    .select("*")
    .in("match_id", matchIds)
    .in("status", ["pending", "confirmed"]);

  if (betsError) {
    console.error(`[settle-ai-auto-bets] 查询待结算投注失败:`, betsError);
    throw betsError;
  }

  console.log(`[settle-ai-auto-bets] 查询到 ${pendingBets?.length || 0} 个待结算的投注`);

  if (!pendingBets || pendingBets.length === 0) {
    console.log(`[settle-ai-auto-bets] 没有需要结算的投注，结束自动结算`);
    return {
      settled: 0,
      message: "没有需要结算的投注",
    };
  }

  // 3. 构建比赛结果映射
  const matchMap = new Map<number, MatchResult>();
  completedMatches.forEach((match) => {
    matchMap.set(match.match_id, match);
  });

  // 4. 为每个投注计算结算结果并更新
  console.log(`[settle-ai-auto-bets] 步骤3: 为每个投注计算结算结果...`);
  let settledCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const bet of pendingBets as unknown as AutoBet[]) {
    try {
      if (!bet.match_id) {
        console.log(`[settle-ai-auto-bets] 跳过投注 ${bet.id}: match_id 为 null`);
        skippedCount++;
        continue;
      }

      const matchResult = matchMap.get(bet.match_id);
      if (!matchResult) {
        console.log(`[settle-ai-auto-bets] 跳过投注 ${bet.id}: 比赛 ${bet.match_id} 尚未完成`);
        skippedCount++;
        continue;
      }

      const result = calculateBetResult(bet, matchResult);
      const pnl = calculatePnl(bet, result);
      
      // 根据结果设置 status
      let status: string;
      if (result === "win") {
        status = "won";
      } else if (result === "loss") {
        status = "lost";
      } else if (result === "push") {
        status = "settled"; // push 视为 settled
      } else {
        status = "cancelled"; // void 视为 cancelled
      }

      console.log(`[settle-ai-auto-bets] 投注 ${bet.id} 结算结果: match_id=${bet.match_id}, bet_type=${bet.bet_type}, prediction=${bet.prediction}, 比分=${matchResult.goals_home}-${matchResult.goals_away}, 结果=${result}, status=${status}, pnl=${pnl}`);

      // 更新投注记录
      const { error: updateError } = await supabase
        .from(AUTO_BET_TABLE)
        .update({
          status,
          pnl,
          settled_at: new Date().toISOString(),
        })
        .eq("id", bet.id);

      if (updateError) {
        console.error(`[settle-ai-auto-bets] 投注 ${bet.id} 更新失败:`, updateError);
        errors.push(`Bet ${bet.id}: ${updateError.message}`);
        continue;
      }

      settledCount++;
      console.log(`[settle-ai-auto-bets] 投注 ${bet.id} 结算完成: status=${status}, pnl=${pnl}, 进度=${settledCount}/${pendingBets.length}`);
    } catch (error) {
      console.error(`[settle-ai-auto-bets] 处理投注 ${bet.id} 时出错:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Bet ${bet.id}: ${errorMessage}`);
    }
  }

  console.log(`[settle-ai-auto-bets] ========== 结算汇总 ==========`);
  console.log(`[settle-ai-auto-bets] 总投注数: ${pendingBets.length}`);
  console.log(`[settle-ai-auto-bets] 成功结算: ${settledCount}`);
  console.log(`[settle-ai-auto-bets] 跳过数量: ${skippedCount}`);
  console.log(`[settle-ai-auto-bets] 失败数量: ${errors.length}`);
  if (errors.length > 0) {
    console.error(`[settle-ai-auto-bets] 错误列表:`, errors.slice(0, 10));
  }
  console.log(`[settle-ai-auto-bets] ========== 结算结束 ==========`);

  return {
    settled: settledCount,
    skipped: skippedCount,
    errors: errors.length,
    message: `成功结算 ${settledCount} 个投注`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const result = await autoSettleBets();
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[settle-ai-auto-bets] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

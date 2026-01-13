import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserPrediction {
  id: string;
  user_id: string;
  match_id: string;
  prediction: string;
  prediction_type: string;
  bet_amount: number;
  potential_payout: number;
  handicap_line?: number;
  over_under_line?: number;
}

interface Match {
  match_id?: number; // 新的字段名（INTEGER）
  home_scores?: number[]; // 主队得分数组 [常规时间比分, 半场比分, ...]
  away_scores?: number[]; // 客队得分数组 [常规时间比分, 半场比分, ...]
  ended?: number; // 结束时间戳（秒级）
  status_id?: number; // 比赛状态ID
  status_short?: string;
  // 兼容旧字段（如果存在）
  fixture_id?: number;
  mid?: string;
  goals_home?: number;
  goals_away?: number;
  mhs?: number;
  mas?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting user bet settlement process...');

    // 获取所有已完成但未结算的比赛（使用 ended 字段和 status_id 判断）
    // 比赛结束逻辑：ended > 0（秒级时间戳）或 status_id = 8（完场）
    const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
    console.log(`[settle-user-bets] 开始自动结算用户下注，当前时间戳（秒）: ${now}`);
    
    console.log(`[settle-user-bets] 步骤1: 查询所有已结束的比赛（ended > 0 或 status_id = 8）...`);
    const { data: allMatches, error: matchesError } = await supabase
      .from('daily_matches')
      .select('match_id, home_scores, away_scores, ended, status_id, home_team_name, away_team_name, home_team_name_zh, away_team_name_zh')
      .or('ended.gt.0,status_id.eq.8'); // ended > 0 或 status_id = 8（完场）

    if (matchesError) {
      console.error('[settle-user-bets] Error fetching matches:', matchesError);
      throw matchesError;
    }

    console.log(`[settle-user-bets] 查询到 ${allMatches?.length || 0} 场已结束的比赛`);

    // 过滤：只保留已结束的比赛
    // 比赛结束逻辑：ended > 0（秒级时间戳）或 status_id = 8（完场）
    console.log(`[settle-user-bets] 步骤2: 过滤已结束的比赛...`);
    const completedMatches = (allMatches || []).filter((match: any) => {
      const ended = match.ended;
      const endedValue = ended !== null && ended !== undefined 
        ? (typeof ended === 'string' ? parseInt(ended, 10) : Number(ended))
        : 0;
      const statusId = match.status_id !== null && match.status_id !== undefined
        ? (typeof match.status_id === 'string' ? parseInt(match.status_id, 10) : (typeof match.status_id === 'number' ? match.status_id : null))
        : null;
      
      // 比赛已结束：ended > 0（秒级时间戳）或 status_id = 8（完场）
      return (!isNaN(endedValue) && endedValue > 0) || (!isNaN(statusId) && statusId === 8);
    });

    console.log(`[settle-user-bets] 过滤后得到 ${completedMatches.length} 场已完成的比赛`);

    if (completedMatches.length > 0) {
      const matchDetails = completedMatches.slice(0, 5).map((m: any) => ({
        match_id: m.match_id,
        ended: m.ended,
        status_id: m.status_id,
        home_scores: m.home_scores,
        away_scores: m.away_scores,
        home_team: m.home_team_name_zh || m.home_team_name,
        away_team: m.away_team_name_zh || m.away_team_name
      }));
      console.log(`[settle-user-bets] 已完成比赛详情（前5场）:`, JSON.stringify(matchDetails, null, 2));
    }

    if (!completedMatches || completedMatches.length === 0) {
      console.log('[settle-user-bets] No completed matches to settle');
      return new Response(
        JSON.stringify({ message: 'No completed matches to settle', settled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[settle-user-bets] Found ${completedMatches.length} completed matches`);

    // 使用 match_id 字段（INTEGER 类型），转换为字符串数组（因为 user_predictions.match_id 是 TEXT 类型）
    const matchIds = completedMatches.map(m => String(m.match_id || '')).filter(id => id !== '');
    console.log(`[settle-user-bets] 步骤3: 提取比赛 ID，共 ${matchIds.length} 场: ${matchIds.slice(0, 10).join(', ')}${matchIds.length > 10 ? '...' : ''}`);
    
    // 获取这些比赛的待结算用户投注
    console.log(`[settle-user-bets] 步骤4: 查询待结算的用户投注（result = 'pending'）...`);
    const { data: pendingBets, error: betsError } = await supabase
      .from('user_predictions')
      .select('*')
      .in('match_id', matchIds)
      .eq('result', 'pending');

    if (betsError) {
      console.error('[settle-user-bets] Error fetching pending bets:', betsError);
      throw betsError;
    }

    if (!pendingBets || pendingBets.length === 0) {
      console.log('[settle-user-bets] No pending bets to settle');
      return new Response(
        JSON.stringify({ message: 'No pending bets to settle', settled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[settle-user-bets] Found ${pendingBets.length} pending user bets to settle`);
    const betDetails = (pendingBets as unknown as any[]).slice(0, 5).map(bet => ({
      id: bet.id,
      user_id: bet.user_id,
      match_id: bet.match_id,
      prediction_type: bet.prediction_type,
      prediction: bet.prediction,
      bet_amount: bet.bet_amount,
      potential_payout: bet.potential_payout
    }));
    console.log(`[settle-user-bets] 待结算投注详情（前5个）:`, JSON.stringify(betDetails, null, 2));

    let settledCount = 0;
    const errors: string[] = [];

    // 处理每个投注
    console.log(`[settle-user-bets] 步骤5: 开始处理 ${pendingBets.length} 个投注...`);
    for (const bet of pendingBets as unknown as UserPrediction[]) {
      try {
        console.log(`[settle-user-bets] 处理投注 ${bet.id}: user_id=${bet.user_id}, match_id=${bet.match_id}, prediction_type=${bet.prediction_type}, prediction=${bet.prediction}`);
        
        // 使用 match_id 字段匹配（match_id 是 INTEGER 类型，需要转换为字符串比较）
        const match = completedMatches.find(m => 
          m.match_id && String(m.match_id) === bet.match_id
        ) as unknown as Match;
        
        if (!match) {
          console.log(`[settle-user-bets] 投注 ${bet.id}: 未找到匹配的比赛（match_id=${bet.match_id}），跳过`);
          continue;
        }

        // 优先使用新字段：home_scores[0] 和 away_scores[0]
        // 兼容旧字段：mhs, mas, goals_home, goals_away
        const homeScore = match.home_scores?.[0] ?? match.mhs ?? match.goals_home ?? 0;
        const awayScore = match.away_scores?.[0] ?? match.mas ?? match.goals_away ?? 0;
        console.log(`[settle-user-bets] 投注 ${bet.id}: 找到匹配的比赛，比分=${homeScore}-${awayScore}`);

        const result = determineBetResult(bet, match);
        const actualPayout = result === 'win' ? bet.potential_payout : 0;
        console.log(`[settle-user-bets] 投注 ${bet.id}: 计算结果=${result}, 实际赔付=${actualPayout}, 投注金额=${bet.bet_amount}`);

        // 更新投注记录
        console.log(`[settle-user-bets] 投注 ${bet.id}: 开始更新投注记录...`);
        const { error: updateError } = await supabase
          .from('user_predictions')
          .update({
            result,
            actual_payout: actualPayout,
            actual_result: getMatchResult(match)
          })
          .eq('id', bet.id);

        if (updateError) {
          console.error(`[settle-user-bets] 投注 ${bet.id}: 更新投注记录失败`, updateError);
          errors.push(`Bet ${bet.id}: ${updateError.message}`);
          continue;
        }
        console.log(`[settle-user-bets] 投注 ${bet.id}: 投注记录更新成功，result=${result}, actual_payout=${actualPayout}`);

        // 更新用户余额
        if (result === 'win') {
          console.log(`[settle-user-bets] 投注 ${bet.id}: 结果为 win，开始更新用户余额...`);
          // 先获取当前余额
          const { data: balanceData } = await supabase
            .from('user_balances')
            .select('balance, total_won')
            .eq('user_id', bet.user_id)
            .single();
          
          if (balanceData) {
            const oldBalance = balanceData.balance;
            const oldTotalWon = balanceData.total_won;
            const newBalance = balanceData.balance + actualPayout;
            const profit = actualPayout - bet.bet_amount;
            const newTotalWon = balanceData.total_won + profit;
            
            console.log(`[settle-user-bets] 投注 ${bet.id}: 用户 ${bet.user_id} 余额信息 - 旧余额=${oldBalance}, 新余额=${newBalance}, 利润=${profit}, 旧总盈利=${oldTotalWon}, 新总盈利=${newTotalWon}`);
            
            const { error: balanceError } = await supabase
              .from('user_balances')
              .update({
                balance: newBalance,
                total_won: newTotalWon
              })
              .eq('user_id', bet.user_id);

            if (balanceError) {
              console.error(`[settle-user-bets] 投注 ${bet.id}: 更新用户余额失败`, balanceError);
              errors.push(`Balance update ${bet.user_id}: ${balanceError.message}`);
              continue;
            }
            console.log(`[settle-user-bets] 投注 ${bet.id}: 用户余额更新成功`);
          } else {
            console.warn(`[settle-user-bets] 投注 ${bet.id}: 用户 ${bet.user_id} 的余额记录不存在`);
          }
        } else if (result === 'loss') {
          console.log(`[settle-user-bets] 投注 ${bet.id}: 结果为 loss，更新总亏损...`);
          const { data: balanceData } = await supabase
            .from('user_balances')
            .select('total_lost')
            .eq('user_id', bet.user_id)
            .single();
          
          if (balanceData) {
            const oldTotalLost = balanceData.total_lost;
            const newTotalLost = balanceData.total_lost + bet.bet_amount;
            console.log(`[settle-user-bets] 投注 ${bet.id}: 用户 ${bet.user_id} 亏损信息 - 旧总亏损=${oldTotalLost}, 新总亏损=${newTotalLost}, 本次亏损=${bet.bet_amount}`);
            
            const { error: balanceError } = await supabase
              .from('user_balances')
              .update({
                total_lost: newTotalLost
              })
              .eq('user_id', bet.user_id);

            if (balanceError) {
              console.error(`[settle-user-bets] 投注 ${bet.id}: 更新总亏损失败`, balanceError);
            } else {
              console.log(`[settle-user-bets] 投注 ${bet.id}: 总亏损更新成功`);
            }
          } else {
            console.warn(`[settle-user-bets] 投注 ${bet.id}: 用户 ${bet.user_id} 的余额记录不存在`);
          }
        } else if (result === 'push') {
          console.log(`[settle-user-bets] 投注 ${bet.id}: 结果为 push，无需更新余额`);
        }

        settledCount++;
        console.log(`[settle-user-bets] 投注 ${bet.id} 结算完成: user_id=${bet.user_id}, match_id=${bet.match_id}, result=${result}, settled_count=${settledCount}/${pendingBets.length}`);
      } catch (error) {
        console.error(`Error processing bet ${bet.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Bet ${bet.id}: ${errorMessage}`);
      }
    }

    const response = {
      message: `Settlement completed`,
      settled: settledCount,
      total: pendingBets.length,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`[settle-user-bets] ========== 结算汇总 ==========`);
    console.log(`[settle-user-bets] 总投注数: ${pendingBets.length}`);
    console.log(`[settle-user-bets] 成功结算: ${settledCount}`);
    console.log(`[settle-user-bets] 失败数量: ${errors.length}`);
    if (errors.length > 0) {
      console.error(`[settle-user-bets] 错误列表:`, errors.slice(0, 10)); // 只显示前10个错误
    }
    console.log(`[settle-user-bets] 结算详情:`, JSON.stringify(response, null, 2));
    console.log(`[settle-user-bets] ========== 结算结束 ==========`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in settle-user-bets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// 判断投注结果
function determineBetResult(bet: UserPrediction, match: Match): 'win' | 'loss' | 'push' {
  // 优先使用新字段：home_scores[0] 和 away_scores[0]
  // 兼容旧字段：mhs, mas, goals_home, goals_away
  // 如果比分为 null，使用默认值 0（允许比分为 null 的比赛也能结算）
  const homeScore = match.home_scores?.[0] ?? match.mhs ?? match.goals_home ?? 0;
  const awayScore = match.away_scores?.[0] ?? match.mas ?? match.goals_away ?? 0;
  
  if (bet.prediction_type === 'moneyline') {
    // 独赢盘
    if (bet.prediction === 'HOME_WIN' || bet.prediction === '主队胜') {
      return homeScore > awayScore ? 'win' : 'loss';
    } else if (bet.prediction === 'AWAY_WIN' || bet.prediction === '客队胜') {
      return awayScore > homeScore ? 'win' : 'loss';
    } else if (bet.prediction === 'DRAW' || bet.prediction === '平局') {
      return homeScore === awayScore ? 'win' : 'loss';
    }
  } else if (bet.prediction_type === 'handicap' && bet.handicap_line !== undefined) {
    // 让分盘
    const adjustedHomeScore = homeScore + bet.handicap_line;
    if (bet.prediction.includes('HOME') || bet.prediction.includes('主队')) {
      if (adjustedHomeScore > awayScore) return 'win';
      if (adjustedHomeScore === awayScore) return 'push';
      return 'loss';
    } else {
      if (awayScore > adjustedHomeScore) return 'win';
      if (awayScore === adjustedHomeScore) return 'push';
      return 'loss';
    }
  } else if (bet.prediction_type === 'over_under' && bet.over_under_line !== undefined) {
    // 大小球
    const totalGoals = homeScore + awayScore;
    if (bet.prediction.includes('Over') || bet.prediction.includes('大球')) {
      if (totalGoals > bet.over_under_line) return 'win';
      if (totalGoals === bet.over_under_line) return 'push';
      return 'loss';
    } else {
      if (totalGoals < bet.over_under_line) return 'win';
      if (totalGoals === bet.over_under_line) return 'push';
      return 'loss';
    }
  }
  
  return 'loss';
}

// 获取比赛结果
function getMatchResult(match: Match): string {
  // 优先使用新字段：home_scores[0] 和 away_scores[0]
  // 兼容旧字段：mhs, mas, goals_home, goals_away
  // 如果比分为 null，使用默认值 0（允许比分为 null 的比赛也能结算）
  const homeScore = match.home_scores?.[0] ?? match.mhs ?? match.goals_home ?? 0;
  const awayScore = match.away_scores?.[0] ?? match.mas ?? match.goals_away ?? 0;
  if (homeScore > awayScore) return 'HOME_WIN';
  if (awayScore > homeScore) return 'AWAY_WIN';
  return 'DRAW';
}

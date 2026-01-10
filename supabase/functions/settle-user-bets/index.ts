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
  fixture_id?: number;
  mid?: string;
  goals_home?: number;
  goals_away?: number;
  mhs?: number; // 主队得分（新字段名）
  mas?: number; // 客队得分（新字段名）
  status_short?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting user bet settlement process...');

    // 获取所有已完成但未结算的比赛（使用 met 字段判断）
    // 比赛结束逻辑：met != 0 并且 当前时间 > met的时间
    // met 字段是毫秒级时间戳，now 也使用毫秒级
    const now = Date.now(); // 当前时间戳（毫秒）
    console.log(`[settle-user-bets] 开始自动结算用户下注，当前时间戳（毫秒）: ${now}`);
    
    console.log(`[settle-user-bets] 步骤1: 查询所有 met != 0 的比赛...`);
    const { data: allMatches, error: matchesError } = await supabase
      .from('daily_matches')
      .select('*')
      .neq('met', 0) // met != 0 表示比赛已结束
      .not('met', 'is', null); // 排除 met 为 null 的情况
      // 移除对 mhs 和 mas 的限制，允许比分为 null 的比赛也能结算（使用默认值 0）

    if (matchesError) {
      console.error('[settle-user-bets] Error fetching matches:', matchesError);
      throw matchesError;
    }

    console.log(`[settle-user-bets] 查询到 ${allMatches?.length || 0} 场 met != 0 的比赛`);

    // 过滤：只保留当前时间 >= met 的比赛（确保比赛确实已经结束）
    // 比赛结束逻辑：met != 0 并且 当前时间 > met（毫秒级比较）
    console.log(`[settle-user-bets] 步骤2: 过滤当前时间 >= met 的比赛...`);
    const completedMatches = (allMatches || []).filter((match: any) => {
      const met = match.met;
      const metValue = typeof met === "string" ? parseInt(met) : (met ?? 0);
      // met != 0 且 当前时间 >= met，比赛已结束（毫秒级比较）
      return metValue !== 0 && metValue <= now;
    });

    console.log(`[settle-user-bets] 过滤后得到 ${completedMatches.length} 场已完成的比赛（当前时间 >= met）`);

    if (completedMatches.length > 0) {
      const matchDetails = completedMatches.slice(0, 5).map((m: any) => ({
        mid: m.mid,
        met: m.met,
        mhs: m.mhs,
        mas: m.mas,
        home_team: m.home_team_name || m.mhn,
        away_team: m.away_team_name || m.man
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

    // 使用 mid 字段（TEXT 类型）而不是 fixture_id
    const matchIds = completedMatches.map(m => m.mid || String(m.fixture_id || ''));
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
        
        // 使用 mid 字段匹配（mid 是 TEXT 类型）
        const match = completedMatches.find(m => 
          (m.mid && m.mid === bet.match_id) || 
          (m.fixture_id && String(m.fixture_id) === bet.match_id)
        ) as unknown as Match;
        
        if (!match) {
          console.log(`[settle-user-bets] 投注 ${bet.id}: 未找到匹配的比赛（match_id=${bet.match_id}），跳过`);
          continue;
        }

        const homeScore = match.mhs !== null && match.mhs !== undefined ? match.mhs : (match.goals_home ?? 0);
        const awayScore = match.mas !== null && match.mas !== undefined ? match.mas : (match.goals_away ?? 0);
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
  // 优先使用新字段名，兼容旧字段名
  // 如果比分为 null，使用默认值 0（允许比分为 null 的比赛也能结算）
  const homeScore = match.mhs !== null && match.mhs !== undefined ? match.mhs : (match.goals_home !== null && match.goals_home !== undefined ? match.goals_home : 0);
  const awayScore = match.mas !== null && match.mas !== undefined ? match.mas : (match.goals_away !== null && match.goals_away !== undefined ? match.goals_away : 0);
  
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
  // 优先使用新字段名，兼容旧字段名
  // 如果比分为 null，使用默认值 0（允许比分为 null 的比赛也能结算）
  const homeScore = match.mhs !== null && match.mhs !== undefined ? match.mhs : (match.goals_home !== null && match.goals_home !== undefined ? match.goals_home : 0);
  const awayScore = match.mas !== null && match.mas !== undefined ? match.mas : (match.goals_away !== null && match.goals_away !== undefined ? match.goals_away : 0);
  if (homeScore > awayScore) return 'HOME_WIN';
  if (awayScore > homeScore) return 'AWAY_WIN';
  return 'DRAW';
}

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
  fixture_id: number;
  goals_home: number;
  goals_away: number;
  status_short: string;
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

    // 获取所有已完成但未结算的比赛
    const completedStatuses = ['FT', 'AET', 'PEN'];
    const { data: completedMatches, error: matchesError } = await supabase
      .from('daily_matches')
      .select('*')
      .in('status_short', completedStatuses)
      .not('goals_home', 'is', null)
      .not('goals_away', 'is', null);

    if (matchesError) {
      console.error('Error fetching completed matches:', matchesError);
      throw matchesError;
    }

    if (!completedMatches || completedMatches.length === 0) {
      console.log('No completed matches to settle');
      return new Response(
        JSON.stringify({ message: 'No completed matches to settle', settled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${completedMatches.length} completed matches`);

    const matchIds = completedMatches.map(m => m.fixture_id.toString());
    
    // 获取这些比赛的待结算用户投注
    const { data: pendingBets, error: betsError } = await supabase
      .from('user_predictions')
      .select('*')
      .in('match_id', matchIds)
      .eq('result', 'pending');

    if (betsError) {
      console.error('Error fetching pending bets:', betsError);
      throw betsError;
    }

    if (!pendingBets || pendingBets.length === 0) {
      console.log('No pending bets to settle');
      return new Response(
        JSON.stringify({ message: 'No pending bets to settle', settled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingBets.length} pending user bets to settle`);

    let settledCount = 0;
    const errors: string[] = [];

    // 处理每个投注
    for (const bet of pendingBets as unknown as UserPrediction[]) {
      try {
        const match = completedMatches.find(m => m.fixture_id.toString() === bet.match_id) as unknown as Match;
        if (!match) continue;

        const result = determineBetResult(bet, match);
        const actualPayout = result === 'win' ? bet.potential_payout : 0;

        // 更新投注记录
        const { error: updateError } = await supabase
          .from('user_predictions')
          .update({
            result,
            actual_payout: actualPayout,
            actual_result: getMatchResult(match)
          })
          .eq('id', bet.id);

        if (updateError) {
          console.error(`Error updating bet ${bet.id}:`, updateError);
          errors.push(`Bet ${bet.id}: ${updateError.message}`);
          continue;
        }

        // 更新用户余额
        if (result === 'win') {
          // 先获取当前余额
          const { data: balanceData } = await supabase
            .from('user_balances')
            .select('balance, total_won')
            .eq('user_id', bet.user_id)
            .single();
          
          if (balanceData) {
            const { error: balanceError } = await supabase
              .from('user_balances')
              .update({
                balance: balanceData.balance + actualPayout,
                total_won: balanceData.total_won + (actualPayout - bet.bet_amount)
              })
              .eq('user_id', bet.user_id);

            if (balanceError) {
              console.error(`Error updating balance for user ${bet.user_id}:`, balanceError);
              errors.push(`Balance update ${bet.user_id}: ${balanceError.message}`);
              continue;
            }
          }
        } else if (result === 'loss') {
          const { data: balanceData } = await supabase
            .from('user_balances')
            .select('total_lost')
            .eq('user_id', bet.user_id)
            .single();
          
          if (balanceData) {
            const { error: balanceError } = await supabase
              .from('user_balances')
              .update({
                total_lost: balanceData.total_lost + bet.bet_amount
              })
              .eq('user_id', bet.user_id);

            if (balanceError) {
              console.error(`Error updating lost total for user ${bet.user_id}:`, balanceError);
            }
          }
        }

        settledCount++;
        console.log(`Settled bet ${bet.id} for user ${bet.user_id}: ${result}`);
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

    console.log('Settlement summary:', response);

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
  const homeScore = match.goals_home;
  const awayScore = match.goals_away;
  
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
  if (match.goals_home > match.goals_away) return 'HOME_WIN';
  if (match.goals_away > match.goals_home) return 'AWAY_WIN';
  return 'DRAW';
}

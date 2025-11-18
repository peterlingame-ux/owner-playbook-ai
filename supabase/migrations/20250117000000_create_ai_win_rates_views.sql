-- 创建 AI 胜率统计视图
-- 用于前端直接查询，无需通过 Edge Function

-- 1. 每日胜率视图（用于图表展示）
-- 按日期和 AI 分组，计算每日的累计胜率
CREATE OR REPLACE VIEW ai_win_rates_daily AS
WITH settled_positions AS (
  SELECT 
    ai_id,
    DATE(settled_at) AS settlement_date,
    CASE 
      WHEN metadata->>'settlement' IS NOT NULL 
        AND (metadata->'settlement'->>'result')::text IN ('win', 'loss')
      THEN (metadata->'settlement'->>'result')::text
      ELSE NULL
    END AS result
  FROM sim_positions
  WHERE status = 'settled'
    AND settled_at IS NOT NULL
    AND metadata IS NOT NULL
    AND metadata->>'settlement' IS NOT NULL
    AND (metadata->'settlement'->>'result')::text NOT IN ('push', 'void')
),
daily_stats AS (
  SELECT 
    ai_id,
    settlement_date,
    COUNT(*) AS total_bets,
    COUNT(*) FILTER (WHERE result = 'win') AS wins
  FROM settled_positions
  WHERE result IS NOT NULL
  GROUP BY ai_id, settlement_date
),
cumulative_stats AS (
  SELECT 
    ai_id,
    settlement_date,
    total_bets,
    wins,
    SUM(total_bets) OVER (
      PARTITION BY ai_id 
      ORDER BY settlement_date 
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_total,
    SUM(wins) OVER (
      PARTITION BY ai_id 
      ORDER BY settlement_date 
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_wins
  FROM daily_stats
)
SELECT 
  ai_id,
  settlement_date,
  total_bets,
  wins,
  cumulative_total,
  cumulative_wins,
  CASE 
    WHEN cumulative_total > 0 
    THEN ROUND((cumulative_wins::numeric / cumulative_total::numeric * 100)::numeric, 1)
    ELSE 0
  END AS win_rate
FROM cumulative_stats
ORDER BY ai_id, settlement_date;

-- 2. 总体胜率视图（用于 ModelCard 等组件）
CREATE OR REPLACE VIEW ai_win_rates_overall AS
WITH settled_positions AS (
  SELECT 
    ai_id,
    CASE 
      WHEN metadata->>'settlement' IS NOT NULL 
        AND (metadata->'settlement'->>'result')::text IN ('win', 'loss')
      THEN (metadata->'settlement'->>'result')::text
      ELSE NULL
    END AS result
  FROM sim_positions
  WHERE status = 'settled'
    AND metadata IS NOT NULL
    AND metadata->>'settlement' IS NOT NULL
    AND (metadata->'settlement'->>'result')::text NOT IN ('push', 'void')
)
SELECT 
  ai_id,
  COUNT(*) AS total_predictions,
  COUNT(*) FILTER (WHERE result = 'win') AS correct_predictions,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE result = 'win')::numeric / COUNT(*)::numeric * 100)::numeric, 2)
    ELSE 0
  END AS win_rate
FROM settled_positions
WHERE result IS NOT NULL
GROUP BY ai_id;

-- 3. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_sim_positions_status_settled_at 
ON sim_positions(status, settled_at) 
WHERE status = 'settled';

CREATE INDEX IF NOT EXISTS idx_sim_positions_ai_id_status 
ON sim_positions(ai_id, status) 
WHERE status = 'settled';

-- 4. 添加注释
COMMENT ON VIEW ai_win_rates_daily IS 'AI每日胜率统计视图，包含累计胜率计算';
COMMENT ON VIEW ai_win_rates_overall IS 'AI总体胜率统计视图，用于展示总体表现';


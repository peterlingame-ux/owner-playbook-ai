-- 创建 AI 统计数据视图
-- 包含连胜/连败、平均置信度等统计信息

CREATE OR REPLACE VIEW ai_statistics AS
WITH settled_positions AS (
  SELECT 
    ai_id,
    settled_at,
    (metadata->'settlement'->>'result')::text AS result,
    (metadata->>'confidence')::numeric AS confidence,
    ROW_NUMBER() OVER (PARTITION BY ai_id ORDER BY settled_at) AS seq
  FROM sim_positions
  WHERE status = 'settled'
    AND settled_at IS NOT NULL
    AND metadata IS NOT NULL
    AND (metadata->'settlement'->>'result')::text IN ('win', 'loss')
),
-- 添加前一个结果用于计算连续序列
with_prev_result AS (
  SELECT 
    ai_id,
    result,
    settled_at,
    seq,
    LAG(result) OVER (PARTITION BY ai_id ORDER BY seq) AS prev_result
  FROM settled_positions
),
-- 为每个结果分配连续组ID（相同结果连续时属于同一组）
with_streak_groups AS (
  SELECT 
    ai_id,
    result,
    seq,
    SUM(CASE WHEN result = prev_result THEN 0 ELSE 1 END) 
      OVER (PARTITION BY ai_id ORDER BY seq) AS streak_group
  FROM with_prev_result
),
-- 计算每个连续组的长度
streak_lengths AS (
  SELECT 
    ai_id,
    result,
    streak_group,
    COUNT(*) AS streak_length,
    MAX(seq) AS max_seq
  FROM with_streak_groups
  GROUP BY ai_id, result, streak_group
),
-- 计算当前连胜/连败（最新结果的连续长度）
current_streaks AS (
  SELECT DISTINCT ON (ai_id)
    ai_id,
    CASE 
      WHEN result = 'win' THEN streak_length::integer
      ELSE -streak_length::integer
    END AS current_streak
  FROM streak_lengths
  WHERE max_seq = (SELECT MAX(seq) FROM settled_positions sp WHERE sp.ai_id = streak_lengths.ai_id)
  ORDER BY ai_id, max_seq DESC
),
-- 计算最佳连胜
best_streaks AS (
  SELECT 
    ai_id,
    COALESCE(MAX(streak_length), 0)::integer AS best_streak
  FROM streak_lengths
  WHERE result = 'win'
  GROUP BY ai_id
),
-- 计算最差连败（负数）
worst_streaks AS (
  SELECT 
    ai_id,
    COALESCE(-MAX(streak_length), 0)::integer AS worst_streak
  FROM streak_lengths
  WHERE result = 'loss'
  GROUP BY ai_id
),
-- 计算平均置信度
avg_confidence AS (
  SELECT 
    ai_id,
    ROUND(AVG(confidence)::numeric, 1) AS avg_confidence
  FROM settled_positions
  WHERE confidence IS NOT NULL AND confidence > 0
  GROUP BY ai_id
)
SELECT 
  COALESCE(cs.ai_id, bs.ai_id, ws.ai_id, ac.ai_id) AS ai_id,
  COALESCE(cs.current_streak, 0) AS current_streak,
  COALESCE(bs.best_streak, 0) AS best_streak,
  COALESCE(ws.worst_streak, 0) AS worst_streak,
  COALESCE(ac.avg_confidence, 0) AS avg_confidence
FROM current_streaks cs
FULL OUTER JOIN best_streaks bs ON cs.ai_id = bs.ai_id
FULL OUTER JOIN worst_streaks ws ON COALESCE(cs.ai_id, bs.ai_id) = ws.ai_id
FULL OUTER JOIN avg_confidence ac ON COALESCE(cs.ai_id, bs.ai_id, ws.ai_id) = ac.ai_id;

-- 添加注释
COMMENT ON VIEW ai_statistics IS 'AI统计数据视图，包含当前连胜/连败、最佳连胜、最差连败和平均置信度';


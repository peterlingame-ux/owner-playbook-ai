-- =============================================================================
-- 在 SQL Editor 中执行：为 match-analysis 下注阶段（phase=bet）创建定时任务
-- 从当日全部分析中按「重要联赛优先 + 置信度」选比赛下注，仅受余额限制。
-- =============================================================================

-- 1. 启用所需扩展（Supabase 项目通常已默认启用；若报错可跳过对应句）
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. 创建定时任务：name + schedule + 要执行的 SQL
--    name: 任务名称，同一 name 再次 schedule 会覆盖原任务
--    schedule: 使用 UTC 时间；下面为每天 12:00、15:00、18:00 北京时间 = 04:00、07:00、10:00 UTC
SELECT cron.schedule(
  'match-analysis-bet',        -- name：下注任务名称
  '0 4,7,10 * * *',            -- schedule：每天 04:00、07:00、10:00 UTC（即北京 12:00、15:00、18:00）
  $$
  select net.http_post(
    url := 'https://vpkmbibrpjcjpycyrnfd.functions.supabase.co/match-analysis',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwa21iaWJycGpjanB5Y3lybmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjQyMjMsImV4cCI6MjA3ODYwMDIyM30.EKsG3oQtyahQpYdqfS0On02hmySwF4yVqbgwq-6V9nQ'),
    body := jsonb_build_object('phase', 'bet')
  ) as request_id;$$
);

-- 可选：仅每天 12:00 北京执行一次，把上面 schedule 改为 '0 4 * * *'
-- 可选：查看已创建任务 SELECT * FROM cron.job;
-- 可选：删除任务 SELECT cron.unschedule('match-analysis-bet');

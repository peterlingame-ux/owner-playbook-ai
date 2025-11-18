-- 启用 Supabase Realtime 订阅
-- 确保 sim_positions 和 ai_balances 表可以实时监听变化

-- 1. 为 sim_positions 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sim_positions;

-- 2. 为 ai_balances 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_balances;

-- 3. 设置表的 REPLICA IDENTITY（用于 UPDATE 和 DELETE 事件）
-- 这对于 Realtime 订阅是必需的
ALTER TABLE sim_positions REPLICA IDENTITY FULL;
ALTER TABLE ai_balances REPLICA IDENTITY FULL;

-- 4. 确保 RLS 策略允许匿名用户读取（如果需要）
-- 注意：如果你的表已经有 RLS 策略，可能需要调整
-- 这里只是示例，根据你的实际安全需求调整

-- 为 sim_positions 表添加读取策略（如果还没有）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sim_positions' 
    AND policyname = 'Allow public read access for realtime'
  ) THEN
    CREATE POLICY "Allow public read access for realtime"
    ON sim_positions
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- 为 ai_balances 表添加读取策略（如果还没有）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_balances' 
    AND policyname = 'Allow public read access for realtime'
  ) THEN
    CREATE POLICY "Allow public read access for realtime"
    ON ai_balances
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- 注释说明
COMMENT ON TABLE sim_positions IS '模拟投注仓位表，已启用 Realtime 订阅';
COMMENT ON TABLE ai_balances IS 'AI 余额表，已启用 Realtime 订阅';


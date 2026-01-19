-- 创建模拟仓位表（sim_positions）
-- 用于存储 AI 模型的模拟投注记录

CREATE TABLE IF NOT EXISTS public.sim_positions (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER, -- 比赛ID（来自 daily_matches.match_id）
  ai_id TEXT, -- AI模型ID（如 'deepseek', 'claude'）
  ai_display_name TEXT NOT NULL, -- AI模型显示名称
  bet_type TEXT NOT NULL, -- 投注类型（handicap/over_under/moneyline）
  prediction TEXT NOT NULL, -- 预测结果
  odds NUMERIC NOT NULL, -- 赔率
  stake_amount NUMERIC NOT NULL, -- 投注金额
  status TEXT NOT NULL DEFAULT 'open', -- 状态（open/settled/cancelled）
  metadata JSONB, -- 元数据（存储完整的 betInfo 和结算信息）
  auto_bet_id BIGINT, -- 关联的自动下注ID（来自 ai_auto_bets）
  payout_amount NUMERIC, -- 结算金额（结算时更新）
  pnl NUMERIC, -- 盈亏金额（结算时更新）
  settled_at TIMESTAMPTZ, -- 结算时间（结算时更新）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sim_positions_match_id ON public.sim_positions(match_id);
CREATE INDEX IF NOT EXISTS idx_sim_positions_ai_id ON public.sim_positions(ai_id);
CREATE INDEX IF NOT EXISTS idx_sim_positions_status ON public.sim_positions(status);
CREATE INDEX IF NOT EXISTS idx_sim_positions_auto_bet_id ON public.sim_positions(auto_bet_id);
CREATE INDEX IF NOT EXISTS idx_sim_positions_created_at ON public.sim_positions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_positions_settled_at ON public.sim_positions(settled_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_positions_ai_status ON public.sim_positions(ai_id, status);

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_sim_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_sim_positions_updated_at_trigger ON public.sim_positions;
CREATE TRIGGER update_sim_positions_updated_at_trigger
  BEFORE UPDATE ON public.sim_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sim_positions_updated_at();

-- 添加注释
COMMENT ON TABLE public.sim_positions IS '模拟仓位表，存储 AI 模型的模拟投注记录';
COMMENT ON COLUMN public.sim_positions.match_id IS '比赛ID（来自 daily_matches.match_id）';
COMMENT ON COLUMN public.sim_positions.ai_id IS 'AI模型ID（如 deepseek, claude）';
COMMENT ON COLUMN public.sim_positions.ai_display_name IS 'AI模型显示名称';
COMMENT ON COLUMN public.sim_positions.bet_type IS '投注类型（handicap/over_under/moneyline）';
COMMENT ON COLUMN public.sim_positions.prediction IS '预测结果';
COMMENT ON COLUMN public.sim_positions.odds IS '赔率';
COMMENT ON COLUMN public.sim_positions.stake_amount IS '投注金额';
COMMENT ON COLUMN public.sim_positions.status IS '状态（open/settled/cancelled）';
COMMENT ON COLUMN public.sim_positions.metadata IS '元数据（JSONB格式，存储完整的 betInfo 和结算信息）';
COMMENT ON COLUMN public.sim_positions.auto_bet_id IS '关联的自动下注ID（来自 ai_auto_bets）';
COMMENT ON COLUMN public.sim_positions.payout_amount IS '结算金额（结算时更新）';
COMMENT ON COLUMN public.sim_positions.pnl IS '盈亏金额（结算时更新）';
COMMENT ON COLUMN public.sim_positions.settled_at IS '结算时间（结算时更新）';

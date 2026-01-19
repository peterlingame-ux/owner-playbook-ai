-- 创建 AI 余额表（ai_balances）
-- 用于存储 AI 模型的账户余额信息

CREATE TABLE IF NOT EXISTS public.ai_balances (
  id BIGSERIAL PRIMARY KEY,
  ai_id TEXT, -- AI模型ID（如 'deepseek', 'claude'）
  ai_display_name TEXT NOT NULL, -- AI模型显示名称
  available_balance NUMERIC NOT NULL DEFAULT 0, -- 可用余额
  locked_balance NUMERIC NOT NULL DEFAULT 0, -- 锁定余额（已下注但未结算）
  currency TEXT NOT NULL DEFAULT 'USD', -- 货币类型
  last_position_id BIGINT, -- 最后操作的仓位ID（用于乐观锁）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 确保每个 AI 模型只有一个余额账户
  UNIQUE(ai_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_ai_balances_ai_id ON public.ai_balances(ai_id);
CREATE INDEX IF NOT EXISTS idx_ai_balances_ai_display_name ON public.ai_balances(ai_display_name);
CREATE INDEX IF NOT EXISTS idx_ai_balances_created_at ON public.ai_balances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_balances_updated_at ON public.ai_balances(updated_at DESC);

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_ai_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_ai_balances_updated_at_trigger ON public.ai_balances;
CREATE TRIGGER update_ai_balances_updated_at_trigger
  BEFORE UPDATE ON public.ai_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_balances_updated_at();

-- 添加注释
COMMENT ON TABLE public.ai_balances IS 'AI 余额表，存储 AI 模型的账户余额信息';
COMMENT ON COLUMN public.ai_balances.ai_id IS 'AI模型ID（如 deepseek, claude）';
COMMENT ON COLUMN public.ai_balances.ai_display_name IS 'AI模型显示名称';
COMMENT ON COLUMN public.ai_balances.available_balance IS '可用余额（可用于下注的金额）';
COMMENT ON COLUMN public.ai_balances.locked_balance IS '锁定余额（已下注但未结算的金额）';
COMMENT ON COLUMN public.ai_balances.currency IS '货币类型（默认 USD）';
COMMENT ON COLUMN public.ai_balances.last_position_id IS '最后操作的仓位ID（用于乐观锁机制）';

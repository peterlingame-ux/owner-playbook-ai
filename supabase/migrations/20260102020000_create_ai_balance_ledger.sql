-- 为 ai_balance_ledger 表添加唯一约束，防止重复插入相同仓位的结算记录
-- 如果表不存在，先创建表；如果表已存在，添加唯一约束

-- 检查表是否存在，如果不存在则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_balance_ledger'
  ) THEN
    -- 创建 ai_balance_ledger 表
    CREATE TABLE public.ai_balance_ledger (
      id BIGSERIAL PRIMARY KEY,
      balance_id BIGINT NOT NULL,
      ai_id TEXT,
      change_amount NUMERIC NOT NULL,
      change_type TEXT NOT NULL,
      position_id BIGINT,
      auto_bet_id BIGINT,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    -- 创建索引
    CREATE INDEX idx_ai_balance_ledger_balance_id ON public.ai_balance_ledger(balance_id);
    CREATE INDEX idx_ai_balance_ledger_ai_id ON public.ai_balance_ledger(ai_id);
    CREATE INDEX idx_ai_balance_ledger_position_id ON public.ai_balance_ledger(position_id);
    CREATE INDEX idx_ai_balance_ledger_created_at ON public.ai_balance_ledger(created_at DESC);

    -- 添加外键约束（如果相关表存在）
    -- 注意：如果 ai_balances 表存在，可以添加外键
    -- ALTER TABLE public.ai_balance_ledger 
    --   ADD CONSTRAINT fk_ai_balance_ledger_balance_id 
    --   FOREIGN KEY (balance_id) REFERENCES public.ai_balances(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 添加唯一约束，防止同一仓位的结算记录重复插入
-- 使用 position_id 和 change_type 的组合作为唯一约束
-- 只有当 position_id 不为 NULL 且 change_type = 'settlement' 时才应用约束
DO $$
BEGIN
  -- 检查唯一约束是否已存在
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_balance_ledger_position_settlement_unique'
  ) THEN
    -- 创建唯一索引（只对 position_id 不为 NULL 且 change_type = 'settlement' 的记录生效）
    -- 使用部分唯一索引（partial unique index）
    CREATE UNIQUE INDEX ai_balance_ledger_position_settlement_unique 
    ON public.ai_balance_ledger(position_id, change_type) 
    WHERE position_id IS NOT NULL AND change_type = 'settlement';
    
    COMMENT ON INDEX ai_balance_ledger_position_settlement_unique IS 
    '防止同一仓位的结算记录重复插入';
  END IF;
END $$;

-- 添加注释
COMMENT ON TABLE public.ai_balance_ledger IS 'AI 余额变动流水账表，记录所有余额变化历史';
COMMENT ON COLUMN public.ai_balance_ledger.balance_id IS '关联的余额账户ID';
COMMENT ON COLUMN public.ai_balance_ledger.ai_id IS 'AI模型ID';
COMMENT ON COLUMN public.ai_balance_ledger.change_amount IS '变动金额';
COMMENT ON COLUMN public.ai_balance_ledger.change_type IS '变动类型（如：settlement）';
COMMENT ON COLUMN public.ai_balance_ledger.position_id IS '关联的仓位ID';
COMMENT ON COLUMN public.ai_balance_ledger.auto_bet_id IS '关联的自动下注ID';
COMMENT ON COLUMN public.ai_balance_ledger.note IS '备注信息';

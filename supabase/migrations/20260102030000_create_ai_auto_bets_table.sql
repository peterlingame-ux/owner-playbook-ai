-- 创建 ai_auto_bets 表（AI 自动下注记录表）
-- 如果表已存在，则跳过创建

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets'
  ) THEN
    CREATE TABLE public.ai_auto_bets (
      id BIGSERIAL PRIMARY KEY,
      match_id BIGINT,
      ai_id TEXT,
      ai_display_name TEXT NOT NULL,
      bet_type TEXT NOT NULL,
      prediction TEXT NOT NULL,
      confidence NUMERIC NOT NULL,
      odds NUMERIC NOT NULL,
      stake_amount NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      strategy_config JSONB,
      analysis_reference_ids BIGINT[],
      handicap_line NUMERIC,
      over_under_line NUMERIC,
      over_under_pick TEXT,
      pnl NUMERIC,
      settled_at TIMESTAMP WITH TIME ZONE,
      inserted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- 创建索引
    CREATE INDEX idx_ai_auto_bets_match_id ON public.ai_auto_bets(match_id);
    CREATE INDEX idx_ai_auto_bets_ai_id ON public.ai_auto_bets(ai_id);
    CREATE INDEX idx_ai_auto_bets_status ON public.ai_auto_bets(status);
    CREATE INDEX idx_ai_auto_bets_inserted_at ON public.ai_auto_bets(inserted_at DESC);
    CREATE INDEX idx_ai_auto_bets_match_ai_status ON public.ai_auto_bets(match_id, ai_id, status);

    -- 添加注释
    COMMENT ON TABLE public.ai_auto_bets IS 'AI 自动下注记录表，记录所有 AI 模型的自动下注';
    COMMENT ON COLUMN public.ai_auto_bets.match_id IS '比赛ID';
    COMMENT ON COLUMN public.ai_auto_bets.ai_id IS 'AI模型ID';
    COMMENT ON COLUMN public.ai_auto_bets.ai_display_name IS 'AI模型显示名称';
    COMMENT ON COLUMN public.ai_auto_bets.bet_type IS '投注类型（handicap/over_under/moneyline）';
    COMMENT ON COLUMN public.ai_auto_bets.prediction IS '预测结果';
    COMMENT ON COLUMN public.ai_auto_bets.confidence IS '置信度（0-100）';
    COMMENT ON COLUMN public.ai_auto_bets.odds IS '赔率';
    COMMENT ON COLUMN public.ai_auto_bets.stake_amount IS '投注金额';
    COMMENT ON COLUMN public.ai_auto_bets.status IS '状态（pending/settled/cancelled/won/lost）';
    COMMENT ON COLUMN public.ai_auto_bets.strategy_config IS '策略配置（JSON格式）';
    COMMENT ON COLUMN public.ai_auto_bets.analysis_reference_ids IS '关联的分析记录ID数组';
    COMMENT ON COLUMN public.ai_auto_bets.handicap_line IS '让球盘盘口';
    COMMENT ON COLUMN public.ai_auto_bets.over_under_line IS '大小球盘口';
    COMMENT ON COLUMN public.ai_auto_bets.over_under_pick IS '大小球选择（over/under）';
    COMMENT ON COLUMN public.ai_auto_bets.pnl IS '盈亏金额';
    COMMENT ON COLUMN public.ai_auto_bets.settled_at IS '结算时间';
  END IF;
END $$;

-- 如果表已存在，检查并添加缺失的字段
DO $$
BEGIN
  -- 检查并添加 strategy_config 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'strategy_config'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN strategy_config JSONB;
  END IF;

  -- 检查并添加 analysis_reference_ids 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'analysis_reference_ids'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN analysis_reference_ids BIGINT[];
  END IF;

  -- 检查并添加 handicap_line 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'handicap_line'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN handicap_line NUMERIC;
  END IF;

  -- 检查并添加 over_under_line 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'over_under_line'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN over_under_line NUMERIC;
  END IF;

  -- 检查并添加 over_under_pick 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'over_under_pick'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN over_under_pick TEXT;
  END IF;

  -- 检查并添加 pnl 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'pnl'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN pnl NUMERIC;
  END IF;

  -- 检查并添加 settled_at 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'settled_at'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN settled_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- 检查并添加 updated_at 字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_auto_bets' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.ai_auto_bets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
  END IF;
END $$;

-- 创建或更新 updated_at 字段的触发器
CREATE OR REPLACE FUNCTION public.update_ai_auto_bets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ai_auto_bets_updated_at ON public.ai_auto_bets;
CREATE TRIGGER trigger_update_ai_auto_bets_updated_at
  BEFORE UPDATE ON public.ai_auto_bets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_auto_bets_updated_at();

-- 创建 AI 比赛分析表（ai_match_analyses）
-- 用于存储 AI 模型对比赛的分析结果

CREATE TABLE IF NOT EXISTS public.ai_match_analyses (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER, -- 比赛ID（来自 daily_matches.match_id）
  ai_id TEXT, -- AI模型ID（如 'deepseek', 'claude'）
  ai_display_name TEXT NOT NULL, -- AI模型显示名称
  provider_model_id TEXT NOT NULL, -- 提供商的模型ID（如 'deepseek', 'claude'）
  provider_model_name TEXT NOT NULL, -- 提供商的模型显示名称
  model_identifier TEXT NOT NULL, -- 模型标识符（用于 API 调用）
  analysis TEXT, -- AI 分析内容
  error TEXT, -- 错误信息（如果有）
  latency_ms INTEGER, -- 分析延迟（毫秒）
  match_snapshot JSONB, -- 比赛快照（存储比赛信息）
  bet_snapshot JSONB, -- 投注快照（存储投注信息）
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 插入时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 创建时间
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 更新时间
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_ai_match_analyses_match_id ON public.ai_match_analyses(match_id);
CREATE INDEX IF NOT EXISTS idx_ai_match_analyses_ai_id ON public.ai_match_analyses(ai_id);
CREATE INDEX IF NOT EXISTS idx_ai_match_analyses_match_ai ON public.ai_match_analyses(match_id, ai_id);
CREATE INDEX IF NOT EXISTS idx_ai_match_analyses_provider_model_id ON public.ai_match_analyses(provider_model_id);
CREATE INDEX IF NOT EXISTS idx_ai_match_analyses_inserted_at ON public.ai_match_analyses(inserted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_match_analyses_created_at ON public.ai_match_analyses(created_at DESC);

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_ai_match_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_ai_match_analyses_updated_at_trigger ON public.ai_match_analyses;
CREATE TRIGGER update_ai_match_analyses_updated_at_trigger
  BEFORE UPDATE ON public.ai_match_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_match_analyses_updated_at();

-- 添加注释
COMMENT ON TABLE public.ai_match_analyses IS 'AI 比赛分析表，存储 AI 模型对比赛的分析结果';
COMMENT ON COLUMN public.ai_match_analyses.match_id IS '比赛ID（来自 daily_matches.match_id）';
COMMENT ON COLUMN public.ai_match_analyses.ai_id IS 'AI模型ID（如 deepseek, claude）';
COMMENT ON COLUMN public.ai_match_analyses.ai_display_name IS 'AI模型显示名称';
COMMENT ON COLUMN public.ai_match_analyses.provider_model_id IS '提供商的模型ID（如 deepseek, claude）';
COMMENT ON COLUMN public.ai_match_analyses.provider_model_name IS '提供商的模型显示名称';
COMMENT ON COLUMN public.ai_match_analyses.model_identifier IS '模型标识符（用于 API 调用）';
COMMENT ON COLUMN public.ai_match_analyses.analysis IS 'AI 分析内容';
COMMENT ON COLUMN public.ai_match_analyses.error IS '错误信息（如果有）';
COMMENT ON COLUMN public.ai_match_analyses.latency_ms IS '分析延迟（毫秒）';
COMMENT ON COLUMN public.ai_match_analyses.match_snapshot IS '比赛快照（JSONB格式，存储比赛信息）';
COMMENT ON COLUMN public.ai_match_analyses.bet_snapshot IS '投注快照（JSONB格式，存储投注信息）';
COMMENT ON COLUMN public.ai_match_analyses.inserted_at IS '插入时间（用于查询当天分析）';

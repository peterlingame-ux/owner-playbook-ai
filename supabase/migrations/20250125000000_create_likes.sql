-- 创建点赞表
-- 支持多种实体类型的点赞：AI模型、玩家等

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'ai_model' 或 'player'
  entity_id TEXT NOT NULL, -- AI模型ID（如 'deepseek', 'claude'）或玩家用户ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 确保同一用户对同一实体只能点赞一次
  UNIQUE(user_id, entity_type, entity_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_entity ON public.likes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_likes_entity_id ON public.likes(entity_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON public.likes(created_at DESC);

-- 添加表注释
COMMENT ON TABLE public.likes IS '点赞表，支持多种实体类型的点赞（AI模型、玩家等）';
COMMENT ON COLUMN public.likes.entity_type IS '实体类型：ai_model（AI模型）或 player（玩家）';
COMMENT ON COLUMN public.likes.entity_id IS '实体ID：AI模型ID（如 deepseek, claude）或玩家用户ID';

-- 启用 RLS (Row Level Security)
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以查看所有点赞记录（用于显示点赞数）
CREATE POLICY "Anyone can view likes"
ON public.likes
FOR SELECT
USING (true);

-- RLS 策略：用户只能插入自己的点赞记录
CREATE POLICY "Users can insert own likes"
ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能删除自己的点赞记录
CREATE POLICY "Users can delete own likes"
ON public.likes
FOR DELETE
USING (auth.uid() = user_id);

-- 创建更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION public.update_likes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_likes_updated_at
  BEFORE UPDATE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_likes_updated_at();

-- 创建视图：按实体统计点赞数
CREATE OR REPLACE VIEW public.like_counts AS
SELECT 
  entity_type,
  entity_id,
  COUNT(*) as like_count
FROM public.likes
GROUP BY entity_type, entity_id;

COMMENT ON VIEW public.like_counts IS '点赞数统计视图，按实体类型和ID分组统计';

-- 创建视图：用户点赞状态（用于快速查询用户是否已点赞）
CREATE OR REPLACE VIEW public.user_likes AS
SELECT 
  user_id,
  entity_type,
  entity_id,
  created_at
FROM public.likes;

COMMENT ON VIEW public.user_likes IS '用户点赞状态视图，用于快速查询用户是否已点赞某个实体';

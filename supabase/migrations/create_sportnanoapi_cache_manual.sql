-- ============================================
-- 手动创建 sportnanoapi 缓存表
-- ============================================
-- 如果迁移文件没有自动运行，可以在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- ============================================

-- 创建 sportnanoapi 缓存表
CREATE TABLE IF NOT EXISTS public.sportnanoapi_cache (
  cache_key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sportnanoapi_cache_expires_at ON public.sportnanoapi_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_sportnanoapi_cache_updated_at ON public.sportnanoapi_cache(updated_at);

-- 创建清理过期缓存的函数
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sportnanoapi_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON TABLE public.sportnanoapi_cache IS '存储 sportnanoapi API 响应缓存，减少 API 调用次数';
COMMENT ON COLUMN public.sportnanoapi_cache.cache_key IS '缓存键，格式：endpoint';
COMMENT ON COLUMN public.sportnanoapi_cache.response IS 'API 响应数据（JSONB）';
COMMENT ON COLUMN public.sportnanoapi_cache.expires_at IS '缓存过期时间';
COMMENT ON COLUMN public.sportnanoapi_cache.updated_at IS '缓存更新时间';

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用 Row Level Security
ALTER TABLE public.sportnanoapi_cache ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Everyone can read cache" ON public.sportnanoapi_cache;
DROP POLICY IF EXISTS "Authenticated users can read cache" ON public.sportnanoapi_cache;
DROP POLICY IF EXISTS "Authenticated users can write cache" ON public.sportnanoapi_cache;
DROP POLICY IF EXISTS "Authenticated users can update cache" ON public.sportnanoapi_cache;
DROP POLICY IF EXISTS "Authenticated users can delete cache" ON public.sportnanoapi_cache;

-- 策略1: 所有人都可以读取缓存（公共数据）
CREATE POLICY "Everyone can read cache"
  ON public.sportnanoapi_cache
  FOR SELECT
  USING (true);

-- 策略2: 所有认证用户都可以写入缓存
CREATE POLICY "Authenticated users can write cache"
  ON public.sportnanoapi_cache
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 策略3: 所有认证用户都可以更新缓存
CREATE POLICY "Authenticated users can update cache"
  ON public.sportnanoapi_cache
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 策略4: 所有认证用户都可以删除缓存
CREATE POLICY "Authenticated users can delete cache"
  ON public.sportnanoapi_cache
  FOR DELETE
  USING (auth.uid() IS NOT NULL);


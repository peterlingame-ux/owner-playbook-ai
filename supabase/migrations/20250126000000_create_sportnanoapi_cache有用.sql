-- 创建 sportnanoapi 缓存表
CREATE TABLE IF NOT EXISTS sportnanoapi_cache (
  cache_key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sportnanoapi_cache_expires_at ON sportnanoapi_cache(expires_at);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sportnanoapi_cache_updated_at ON sportnanoapi_cache(updated_at);

-- 创建清理过期缓存的函数
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM sportnanoapi_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 创建定时清理任务（需要 pg_cron 扩展）
-- 注意：这需要数据库管理员权限，如果不可用，可以在应用层定期清理
SELECT cron.schedule('cleanup-sportnanoapi-cache', '*/5 * * * *', 'SELECT cleanup_expired_cache()');

-- 添加注释
COMMENT ON TABLE sportnanoapi_cache IS '存储 sportnanoapi API 响应缓存，减少 API 调用次数';
COMMENT ON COLUMN sportnanoapi_cache.cache_key IS '缓存键，格式：endpoint:param1=value1&param2=value2';
COMMENT ON COLUMN sportnanoapi_cache.response IS 'API 响应数据（JSONB）';
COMMENT ON COLUMN sportnanoapi_cache.expires_at IS '缓存过期时间';
COMMENT ON COLUMN sportnanoapi_cache.updated_at IS '缓存更新时间';


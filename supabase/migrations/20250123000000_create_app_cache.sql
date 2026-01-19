-- 创建缓存表，用于存储需要定期刷新的变量
-- 支持24小时自动刷新机制

CREATE TABLE IF NOT EXISTS app_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_app_cache_expires_at ON app_cache(expires_at);

-- 创建函数自动更新 updated_at
CREATE OR REPLACE FUNCTION update_app_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_app_cache_updated_at_trigger
  BEFORE UPDATE ON app_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_app_cache_updated_at();

-- 创建清理过期缓存的函数
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM app_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE app_cache IS '应用缓存表，用于存储需要定期刷新的数据';
COMMENT ON COLUMN app_cache.key IS '缓存键，唯一标识符';
COMMENT ON COLUMN app_cache.value IS '缓存值，JSON格式';
COMMENT ON COLUMN app_cache.expires_at IS '过期时间，超过此时间需要刷新';

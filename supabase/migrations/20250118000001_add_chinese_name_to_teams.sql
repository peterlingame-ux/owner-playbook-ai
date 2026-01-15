-- 为已存在的 teams_multilingual 表添加 chinese_name 字段
-- 如果表已经存在但没有 chinese_name 字段，运行此迁移

ALTER TABLE IF EXISTS public.teams_multilingual 
  ADD COLUMN IF NOT EXISTS chinese_name TEXT;

COMMENT ON COLUMN public.teams_multilingual.chinese_name IS '球队中文名称（可选，可通过翻译或映射表填充）';


-- 为已存在的 leagues_multilingual 表添加开始和结束日期字段
-- 如果表已经存在但没有这些字段，运行此迁移

ALTER TABLE IF EXISTS public.leagues_multilingual 
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE IF EXISTS public.leagues_multilingual 
  ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN public.leagues_multilingual.start_date IS '联赛开始日期';
COMMENT ON COLUMN public.leagues_multilingual.end_date IS '联赛结束日期';


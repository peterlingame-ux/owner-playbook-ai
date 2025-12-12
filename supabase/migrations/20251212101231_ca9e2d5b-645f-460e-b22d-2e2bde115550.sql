-- 添加个性签名字段到用户表
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS signature text DEFAULT '预测玩家';

-- 添加字段注释
COMMENT ON COLUMN public.users.signature IS '用户个性签名';
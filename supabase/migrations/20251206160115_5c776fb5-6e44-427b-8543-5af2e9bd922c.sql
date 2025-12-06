-- 添加密码哈希字段到 users 表
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;

-- 添加索引以提高手机号查询性能
CREATE INDEX IF NOT EXISTS idx_users_phone_lookup ON public.users (id);

-- 更新 RLS 策略允许用户更新自己的密码
DROP POLICY IF EXISTS "Users can update own password" ON public.users;
CREATE POLICY "Users can update own password" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
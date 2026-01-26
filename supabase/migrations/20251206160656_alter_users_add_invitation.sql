-- 添加邀请码字段到 users 表
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS invitation_code TEXT UNIQUE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invited_by TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invited_count INTEGER DEFAULT 0;

-- 创建生成随机邀请码的函数（5位）
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 更新现有用户，为他们生成邀请码
UPDATE public.users 
SET invitation_code = public.generate_invitation_code()
WHERE invitation_code IS NULL;

-- 创建触发器函数，自动为新用户生成邀请码
CREATE OR REPLACE FUNCTION public.set_user_invitation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- 生成唯一邀请码
  LOOP
    new_code := public.generate_invitation_code();
    SELECT EXISTS(SELECT 1 FROM public.users WHERE invitation_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.invitation_code := new_code;
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS set_invitation_code_trigger ON public.users;
CREATE TRIGGER set_invitation_code_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
WHEN (NEW.invitation_code IS NULL)
EXECUTE FUNCTION public.set_user_invitation_code();

-- 添加邀请码索引
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users (invitation_code);
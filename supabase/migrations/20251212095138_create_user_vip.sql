-- 创建VIP订阅表
CREATE TABLE public.user_vip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.user_vip ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的VIP状态
CREATE POLICY "Users can view own VIP status"
ON public.user_vip
FOR SELECT
USING (auth.uid() = user_id);

-- 创建开通VIP的函数
CREATE OR REPLACE FUNCTION public.purchase_vip(
  p_user_id UUID,
  p_duration_days INTEGER DEFAULT 30,
  p_cost NUMERIC DEFAULT 500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance DECIMAL;
  new_expires_at TIMESTAMP WITH TIME ZONE;
  existing_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 获取当前余额
  SELECT balance INTO current_balance
  FROM public.user_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 检查余额是否足够
  IF current_balance IS NULL OR current_balance < p_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;

  -- 检查是否已有VIP
  SELECT expires_at INTO existing_expires_at
  FROM public.user_vip
  WHERE user_id = p_user_id AND is_active = true AND expires_at > NOW();

  -- 计算新的到期时间
  IF existing_expires_at IS NOT NULL THEN
    -- 如果已有VIP，在现有基础上延长
    new_expires_at := existing_expires_at + (p_duration_days || ' days')::INTERVAL;
  ELSE
    -- 新开通VIP
    new_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
  END IF;

  -- 扣除费用
  UPDATE public.user_balances
  SET 
    balance = balance - p_cost,
    total_wagered = total_wagered + p_cost,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 插入或更新VIP记录
  INSERT INTO public.user_vip (user_id, is_active, started_at, expires_at)
  VALUES (p_user_id, true, NOW(), new_expires_at)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_active = true,
    expires_at = new_expires_at,
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'expires_at', new_expires_at,
    'new_balance', current_balance - p_cost
  );
END;
$$;
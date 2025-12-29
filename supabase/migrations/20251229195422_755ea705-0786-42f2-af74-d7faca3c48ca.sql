-- 创建私信表
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- 创建函数检查是否互相关注
CREATE OR REPLACE FUNCTION public.are_mutually_following(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_follows 
    WHERE follower_id = user_a AND following_id = user_b
  ) AND EXISTS (
    SELECT 1 FROM public.user_follows 
    WHERE follower_id = user_b AND following_id = user_a
  );
$$;

-- RLS策略: 用户可以查看自己发送或接收的消息
CREATE POLICY "Users can view own messages"
ON public.direct_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- RLS策略: 互相关注后才能发送消息
CREATE POLICY "Users can send messages to mutual followers"
ON public.direct_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.are_mutually_following(sender_id, receiver_id)
);

-- RLS策略: 接收者可以更新消息已读状态
CREATE POLICY "Receivers can update read status"
ON public.direct_messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- 创建索引优化查询
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);

-- 启用实时更新
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
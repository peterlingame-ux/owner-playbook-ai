-- Create table for model follows
CREATE TABLE public.model_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, model_id)
);

-- Enable RLS
ALTER TABLE public.model_follows ENABLE ROW LEVEL SECURITY;

-- Users can view their own follows
CREATE POLICY "Users can view own model follows"
ON public.model_follows
FOR SELECT
USING (auth.uid() = user_id);

-- Users can follow models
CREATE POLICY "Users can follow models"
ON public.model_follows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unfollow models
CREATE POLICY "Users can unfollow models"
ON public.model_follows
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.model_follows;
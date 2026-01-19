-- Create table for AI training history
CREATE TABLE public.ai_training_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ai_training_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own training history" 
ON public.ai_training_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training history" 
ON public.ai_training_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training history" 
ON public.ai_training_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_ai_training_history_user_id ON public.ai_training_history(user_id);
CREATE INDEX idx_ai_training_history_created_at ON public.ai_training_history(created_at DESC);
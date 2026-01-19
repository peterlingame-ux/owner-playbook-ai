-- Create user predictions table
CREATE TABLE public.user_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('handicap', 'over_under', 'moneyline')),
  prediction TEXT NOT NULL,
  handicap_line DECIMAL,
  over_under_line DECIMAL,
  confidence INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  result TEXT CHECK (result IN ('win', 'loss', 'pending')),
  actual_result TEXT
);

-- Enable RLS
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;

-- Users can view their own predictions
CREATE POLICY "Users can view own predictions"
ON public.user_predictions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own predictions
CREATE POLICY "Users can insert own predictions"
ON public.user_predictions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions
CREATE POLICY "Users can update own predictions"
ON public.user_predictions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_user_predictions_user_id ON public.user_predictions(user_id);
CREATE INDEX idx_user_predictions_match_id ON public.user_predictions(match_id);
CREATE INDEX idx_user_predictions_result ON public.user_predictions(result);
-- Create user balances table
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL NOT NULL DEFAULT 10000.00 CHECK (balance >= 0),
  total_wagered DECIMAL NOT NULL DEFAULT 0.00,
  total_won DECIMAL NOT NULL DEFAULT 0.00,
  total_lost DECIMAL NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Users can view their own balance
CREATE POLICY "Users can view own balance"
ON public.user_balances
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own balance (for system operations)
CREATE POLICY "Users can update own balance"
ON public.user_balances
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_user_balances_user_id ON public.user_balances(user_id);

-- Add bet_amount to user_predictions if not exists
ALTER TABLE public.user_predictions ADD COLUMN IF NOT EXISTS bet_amount DECIMAL NOT NULL DEFAULT 100.00;
ALTER TABLE public.user_predictions ADD COLUMN IF NOT EXISTS potential_payout DECIMAL;
ALTER TABLE public.user_predictions ADD COLUMN IF NOT EXISTS actual_payout DECIMAL;

-- Function to initialize user balance
CREATE OR REPLACE FUNCTION public.initialize_user_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_balances (user_id, balance)
  VALUES (NEW.id, 10000.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to initialize balance when user is created
DROP TRIGGER IF EXISTS on_user_balance_init ON auth.users;
CREATE TRIGGER on_user_balance_init
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_balance();

-- Function to place bet and update balance
CREATE OR REPLACE FUNCTION public.place_bet(
  p_user_id UUID,
  p_match_id TEXT,
  p_prediction_type TEXT,
  p_prediction TEXT,
  p_bet_amount DECIMAL,
  p_potential_payout DECIMAL,
  p_match_date TIMESTAMP WITH TIME ZONE,
  p_handicap_line DECIMAL DEFAULT NULL,
  p_over_under_line DECIMAL DEFAULT NULL,
  p_confidence INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance DECIMAL;
  prediction_id UUID;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM public.user_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user has enough balance
  IF current_balance < p_bet_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;

  -- Deduct bet amount from balance
  UPDATE public.user_balances
  SET 
    balance = balance - p_bet_amount,
    total_wagered = total_wagered + p_bet_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert prediction
  INSERT INTO public.user_predictions (
    user_id,
    match_id,
    prediction_type,
    prediction,
    bet_amount,
    potential_payout,
    match_date,
    handicap_line,
    over_under_line,
    confidence,
    result
  ) VALUES (
    p_user_id,
    p_match_id,
    p_prediction_type,
    p_prediction,
    p_bet_amount,
    p_potential_payout,
    p_match_date,
    p_handicap_line,
    p_over_under_line,
    p_confidence,
    'pending'
  )
  RETURNING id INTO prediction_id;

  RETURN json_build_object(
    'success', true,
    'prediction_id', prediction_id,
    'new_balance', current_balance - p_bet_amount
  );
END;
$$;
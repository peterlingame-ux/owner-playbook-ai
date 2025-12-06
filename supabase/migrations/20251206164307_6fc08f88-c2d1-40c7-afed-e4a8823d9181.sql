-- Create withdrawal_records table
CREATE TABLE public.withdrawal_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  network TEXT NOT NULL DEFAULT 'TRC20',
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.withdrawal_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own withdrawal records"
ON public.withdrawal_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawal records"
ON public.withdrawal_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to request withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_address TEXT,
  p_network TEXT DEFAULT 'TRC20'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance DECIMAL;
  withdrawal_id UUID;
BEGIN
  -- Get current USDT balance
  SELECT balance INTO current_balance
  FROM public.usdt_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user has enough balance
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient USDT balance'
    );
  END IF;

  -- Check minimum withdrawal amount
  IF p_amount < 10 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Minimum withdrawal is 10 USDT'
    );
  END IF;

  -- Deduct amount from USDT wallet
  UPDATE public.usdt_wallets
  SET 
    balance = balance - p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert withdrawal record
  INSERT INTO public.withdrawal_records (
    user_id,
    amount,
    network,
    wallet_address,
    status
  ) VALUES (
    p_user_id,
    p_amount,
    p_network,
    p_wallet_address,
    'pending'
  )
  RETURNING id INTO withdrawal_id;

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', withdrawal_id,
    'new_balance', current_balance - p_amount
  );
END;
$$;
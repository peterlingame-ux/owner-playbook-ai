-- Create USDT wallet balance table
CREATE TABLE public.usdt_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.usdt_wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet
CREATE POLICY "Users can view own usdt wallet"
ON public.usdt_wallets
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_usdt_wallets_user_id ON public.usdt_wallets(user_id);

-- Create trigger to initialize USDT wallet when user signs up
CREATE OR REPLACE FUNCTION public.initialize_usdt_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usdt_wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on users table to create USDT wallet
CREATE TRIGGER on_user_created_init_usdt_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_usdt_wallet();

-- Function to confirm deposit and update USDT balance (for admin use)
CREATE OR REPLACE FUNCTION public.confirm_deposit(p_deposit_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount DECIMAL;
  v_status TEXT;
BEGIN
  -- Get deposit info
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM public.deposit_records
  WHERE id = p_deposit_id;

  -- Check if deposit exists and is pending
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Deposit not found');
  END IF;

  IF v_status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Deposit already processed');
  END IF;

  -- Update deposit status
  UPDATE public.deposit_records
  SET status = 'confirmed', confirmed_at = NOW()
  WHERE id = p_deposit_id;

  -- Update or insert USDT wallet balance
  INSERT INTO public.usdt_wallets (user_id, balance, updated_at)
  VALUES (v_user_id, v_amount, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = usdt_wallets.balance + v_amount,
    updated_at = NOW();

  RETURN json_build_object('success', true, 'new_balance', (SELECT balance FROM public.usdt_wallets WHERE user_id = v_user_id));
END;
$$;

-- Create withdrawal_records table
CREATE TABLE public.withdrawal_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  network TEXT NOT NULL DEFAULT 'TRC20',
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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
    updated_at = NOW()
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

-- Create USDT wallet balance table
CREATE TABLE public.usdt_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
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
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = p_deposit_id;

  -- Update or insert USDT wallet balance
  INSERT INTO public.usdt_wallets (user_id, balance, updated_at)
  VALUES (v_user_id, v_amount, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = usdt_wallets.balance + v_amount,
    updated_at = now();

  RETURN json_build_object('success', true, 'new_balance', (SELECT balance FROM public.usdt_wallets WHERE user_id = v_user_id));
END;
$$;
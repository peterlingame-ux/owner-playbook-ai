-- Create deposit records table for USDT deposits
CREATE TABLE public.deposit_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL NOT NULL,
  network TEXT NOT NULL DEFAULT 'TRC20',
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.deposit_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposit records
CREATE POLICY "Users can view own deposit records"
ON public.deposit_records
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own deposit records
CREATE POLICY "Users can insert own deposit records"
ON public.deposit_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_deposit_records_user_id ON public.deposit_records(user_id);
CREATE INDEX idx_deposit_records_created_at ON public.deposit_records(created_at DESC);
-- Create daily prize winners table
CREATE TABLE public.daily_prize_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 31),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  winner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  prize_name TEXT NOT NULL,
  prize_image_url TEXT,
  is_drawn BOOLEAN NOT NULL DEFAULT false,
  drawn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (day_number, month, year)
);

-- Enable RLS
ALTER TABLE public.daily_prize_winners ENABLE ROW LEVEL SECURITY;

-- Everyone can view prize winners (public information)
CREATE POLICY "Anyone can view prize winners"
ON public.daily_prize_winners
FOR SELECT
USING (true);

-- Only admins can insert/update (managed by system)
-- For now we'll use service role for these operations
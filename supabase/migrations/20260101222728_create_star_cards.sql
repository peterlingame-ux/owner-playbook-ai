-- Create star_cards table for user's star card collection
CREATE TABLE public.star_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_name TEXT NOT NULL,
  card_image TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  obtained_via TEXT NOT NULL DEFAULT 'invitation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.star_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view own star cards" 
ON public.star_cards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own star cards" 
ON public.star_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_star_cards_user_id ON public.star_cards(user_id);
-- Create users table for storing user profiles
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '/avatars/avatar-1.png',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to view all profiles
CREATE POLICY "Users can view all profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to generate random username
CREATE OR REPLACE FUNCTION public.generate_random_username()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  adjectives TEXT[] := ARRAY['Quick', 'Smart', 'Brave', 'Clever', 'Swift', 'Bold', 'Wise', 'Lucky', 'Noble', 'Epic'];
  nouns TEXT[] := ARRAY['Tiger', 'Eagle', 'Dragon', 'Phoenix', 'Lion', 'Wolf', 'Falcon', 'Panther', 'Hawk', 'Bear'];
  random_num TEXT;
BEGIN
  random_num := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN adjectives[1 + FLOOR(RANDOM() * array_length(adjectives, 1))] || 
         nouns[1 + FLOOR(RANDOM() * array_length(nouns, 1))] || 
         random_num;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  random_avatar_num INT;
BEGIN
  -- Generate random avatar number (1-6)
  random_avatar_num := 1 + FLOOR(RANDOM() * 6);
  
  -- Insert new user profile with random username and avatar
  INSERT INTO public.users (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    generate_random_username(),
    '/avatars/avatar-' || random_avatar_num || '.png'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
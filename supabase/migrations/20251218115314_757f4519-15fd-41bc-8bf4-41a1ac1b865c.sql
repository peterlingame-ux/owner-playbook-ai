-- Create user_online_time table to track accumulated online time
CREATE TABLE public.user_online_time (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_online_time ENABLE ROW LEVEL SECURITY;

-- Users can view their own online time
CREATE POLICY "Users can view own online time"
ON public.user_online_time
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own online time
CREATE POLICY "Users can update own online time"
ON public.user_online_time
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger to initialize online time record when user is created
CREATE OR REPLACE FUNCTION public.initialize_user_online_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_online_time (user_id, total_minutes)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_init_online_time
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_online_time();
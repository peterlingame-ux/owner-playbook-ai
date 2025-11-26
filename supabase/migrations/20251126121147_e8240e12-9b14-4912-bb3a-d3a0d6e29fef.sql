-- Fix security warning by setting search_path for generate_random_username function
CREATE OR REPLACE FUNCTION public.generate_random_username()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
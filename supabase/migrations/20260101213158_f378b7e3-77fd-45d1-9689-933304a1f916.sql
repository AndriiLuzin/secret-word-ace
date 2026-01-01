-- Add guesser_index to whoami_games (the player who sees "Who am I?")
ALTER TABLE public.whoami_games 
ADD COLUMN guesser_index integer DEFAULT 0;

-- Add views_count to track how many players viewed
ALTER TABLE public.whoami_games 
ADD COLUMN views_count integer DEFAULT 0;

-- Create table to track which players have viewed (like player_views for impostor)
CREATE TABLE public.whoami_player_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid NOT NULL,
  player_index integer NOT NULL,
  viewed_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whoami_player_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can insert whoami player views"
ON public.whoami_player_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read whoami player views"
ON public.whoami_player_views
FOR SELECT
USING (true);

-- Enable realtime for game updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.whoami_games;
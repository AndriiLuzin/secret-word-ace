-- Create crocodile_players table for tracking players in crocodile games
CREATE TABLE IF NOT EXISTS public.crocodile_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.crocodile_games(id) ON DELETE CASCADE,
  player_index INTEGER NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(game_id, player_index)
);

-- Enable RLS
ALTER TABLE public.crocodile_players ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read crocodile players" ON public.crocodile_players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert crocodile players" ON public.crocodile_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete crocodile players" ON public.crocodile_players FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crocodile_players;
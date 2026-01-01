-- Create mafia_games table
CREATE TABLE public.mafia_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  player_count INTEGER NOT NULL,
  mafia_count INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mafia_players table for role assignments
CREATE TABLE public.mafia_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.mafia_games(id) ON DELETE CASCADE,
  player_index INTEGER NOT NULL,
  role TEXT NOT NULL, -- 'mafia' or 'civilian'
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(game_id, player_index)
);

-- Enable RLS
ALTER TABLE public.mafia_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mafia_players ENABLE ROW LEVEL SECURITY;

-- Policies for mafia_games
CREATE POLICY "Anyone can read mafia games" 
ON public.mafia_games FOR SELECT USING (true);

CREATE POLICY "Anyone can insert mafia games" 
ON public.mafia_games FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update mafia games" 
ON public.mafia_games FOR UPDATE USING (true);

-- Policies for mafia_players
CREATE POLICY "Anyone can read mafia players" 
ON public.mafia_players FOR SELECT USING (true);

CREATE POLICY "Anyone can insert mafia players" 
ON public.mafia_players FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update mafia players" 
ON public.mafia_players FOR UPDATE USING (true);

-- Enable realtime for mafia_players
ALTER PUBLICATION supabase_realtime ADD TABLE public.mafia_players;
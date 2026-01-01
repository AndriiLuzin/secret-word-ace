-- Create casino games table
CREATE TABLE public.casino_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  player_count INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  guesser_index INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 1,
  current_combination TEXT[] DEFAULT '{}',
  guesses_in_round INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create casino players table
CREATE TABLE public.casino_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.casino_games(id) ON DELETE CASCADE,
  player_index INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.casino_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casino_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for casino_games
CREATE POLICY "Anyone can read casino games" ON public.casino_games FOR SELECT USING (true);
CREATE POLICY "Anyone can insert casino games" ON public.casino_games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update casino games" ON public.casino_games FOR UPDATE USING (true);

-- RLS policies for casino_players
CREATE POLICY "Anyone can read casino players" ON public.casino_players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert casino players" ON public.casino_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update casino players" ON public.casino_players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete casino players" ON public.casino_players FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_players;
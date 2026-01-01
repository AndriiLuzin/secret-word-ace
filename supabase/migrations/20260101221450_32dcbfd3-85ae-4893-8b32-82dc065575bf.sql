-- Enable realtime for crocodile_games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.crocodile_games;

-- Add column for current guesser (who is guessing now)
ALTER TABLE public.crocodile_games ADD COLUMN IF NOT EXISTS current_guesser integer DEFAULT 0;

-- Add column for tracking showing player (who shows the word)
ALTER TABLE public.crocodile_games ADD COLUMN IF NOT EXISTS showing_player integer DEFAULT 0;
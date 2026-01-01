-- Add unique constraint to casino_players to prevent duplicates
ALTER TABLE public.casino_players ADD CONSTRAINT casino_players_game_player_unique UNIQUE(game_id, player_index);
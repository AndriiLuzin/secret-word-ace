-- Add starting_player column to games table
ALTER TABLE public.games 
ADD COLUMN starting_player integer DEFAULT NULL;
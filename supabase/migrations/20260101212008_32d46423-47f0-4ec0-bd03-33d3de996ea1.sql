-- Create table for "Who Am I" characters
CREATE TABLE public.whoami_characters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text DEFAULT 'general'
);

-- Enable RLS
ALTER TABLE public.whoami_characters ENABLE ROW LEVEL SECURITY;

-- Anyone can read characters
CREATE POLICY "Anyone can read whoami characters"
ON public.whoami_characters
FOR SELECT
USING (true);

-- Create whoami games table
CREATE TABLE public.whoami_games (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  player_count integer NOT NULL,
  status text DEFAULT 'waiting',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whoami_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read whoami games"
ON public.whoami_games FOR SELECT USING (true);

CREATE POLICY "Anyone can insert whoami games"
ON public.whoami_games FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update whoami games"
ON public.whoami_games FOR UPDATE USING (true);

-- Create whoami players table (stores each player's assigned character)
CREATE TABLE public.whoami_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid REFERENCES public.whoami_games(id) ON DELETE CASCADE NOT NULL,
  player_index integer NOT NULL,
  character_id uuid REFERENCES public.whoami_characters(id),
  guessed boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.whoami_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read whoami players"
ON public.whoami_players FOR SELECT USING (true);

CREATE POLICY "Anyone can insert whoami players"
ON public.whoami_players FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update whoami players"
ON public.whoami_players FOR UPDATE USING (true);

-- Insert some initial characters
INSERT INTO public.whoami_characters (name, category) VALUES
('Шрек', 'мультфильмы'),
('Эльза', 'мультфильмы'),
('Микки Маус', 'мультфильмы'),
('Губка Боб', 'мультфильмы'),
('Пушкин', 'писатели'),
('Шекспир', 'писатели'),
('Эйнштейн', 'учёные'),
('Ньютон', 'учёные'),
('Наполеон', 'история'),
('Клеопатра', 'история'),
('Бэтмен', 'супергерои'),
('Человек-паук', 'супергерои'),
('Супермен', 'супергерои'),
('Гарри Поттер', 'книги'),
('Шерлок Холмс', 'книги'),
('Джеймс Бонд', 'фильмы'),
('Терминатор', 'фильмы'),
('Джокер', 'фильмы'),
('Пикачу', 'игры'),
('Марио', 'игры'),
('Илон Маск', 'знаменитости'),
('Месси', 'спорт'),
('Роналду', 'спорт'),
('Моцарт', 'музыканты');
-- Create table for crocodile game words
CREATE TABLE public.crocodile_words (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word text NOT NULL,
  category text DEFAULT 'general'
);

-- Enable RLS
ALTER TABLE public.crocodile_words ENABLE ROW LEVEL SECURITY;

-- Anyone can read words
CREATE POLICY "Anyone can read crocodile words"
ON public.crocodile_words
FOR SELECT
USING (true);

-- Create crocodile games table
CREATE TABLE public.crocodile_games (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  player_count integer NOT NULL,
  current_player integer DEFAULT 0,
  current_word_id uuid REFERENCES public.crocodile_words(id),
  status text DEFAULT 'waiting',
  round integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crocodile_games ENABLE ROW LEVEL SECURITY;

-- Anyone can read games
CREATE POLICY "Anyone can read crocodile games"
ON public.crocodile_games
FOR SELECT
USING (true);

-- Anyone can insert games
CREATE POLICY "Anyone can insert crocodile games"
ON public.crocodile_games
FOR INSERT
WITH CHECK (true);

-- Anyone can update games
CREATE POLICY "Anyone can update crocodile games"
ON public.crocodile_games
FOR UPDATE
USING (true);

-- Insert some initial words
INSERT INTO public.crocodile_words (word, category) VALUES
('Кошка', 'животные'),
('Собака', 'животные'),
('Слон', 'животные'),
('Танцевать', 'действия'),
('Готовить', 'действия'),
('Плавать', 'действия'),
('Пилот', 'профессии'),
('Врач', 'профессии'),
('Учитель', 'профессии'),
('Пицца', 'еда'),
('Мороженое', 'еда'),
('Бургер', 'еда'),
('Футбол', 'спорт'),
('Баскетбол', 'спорт'),
('Теннис', 'спорт'),
('Телефон', 'предметы'),
('Компьютер', 'предметы'),
('Зонтик', 'предметы'),
('Дождь', 'природа'),
('Солнце', 'природа'),
('Снег', 'природа'),
('Супергерой', 'персонажи'),
('Робот', 'персонажи'),
('Принцесса', 'персонажи');
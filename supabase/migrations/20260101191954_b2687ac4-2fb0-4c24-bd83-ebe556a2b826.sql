-- Words for the game
CREATE TABLE public.game_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL
);

-- Games table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  player_count INTEGER NOT NULL,
  word_id UUID REFERENCES public.game_words(id),
  impostor_index INTEGER,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'playing')),
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Player views (who has seen their role)
CREATE TABLE public.player_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  player_index INTEGER NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(game_id, player_index)
);

-- Enable RLS
ALTER TABLE public.game_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_views ENABLE ROW LEVEL SECURITY;

-- Public read policies (no auth required for this game)
CREATE POLICY "Anyone can read words" ON public.game_words FOR SELECT USING (true);
CREATE POLICY "Anyone can read games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Anyone can insert games" ON public.games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON public.games FOR UPDATE USING (true);
CREATE POLICY "Anyone can read player views" ON public.player_views FOR SELECT USING (true);
CREATE POLICY "Anyone can insert player views" ON public.player_views FOR INSERT WITH CHECK (true);

-- Enable realtime for games and player_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_views;

-- Insert some Russian words for the game
INSERT INTO public.game_words (word) VALUES 
  ('Больница'),
  ('Школа'),
  ('Аэропорт'),
  ('Пляж'),
  ('Казино'),
  ('Цирк'),
  ('Банк'),
  ('Библиотека'),
  ('Ресторан'),
  ('Кинотеатр'),
  ('Музей'),
  ('Зоопарк'),
  ('Стадион'),
  ('Поезд'),
  ('Корабль'),
  ('Космос'),
  ('Полиция'),
  ('Супермаркет'),
  ('Ферма'),
  ('Замок'),
  ('Пирамида'),
  ('Подводная лодка'),
  ('Тюрьма'),
  ('Посольство'),
  ('Спа-салон');
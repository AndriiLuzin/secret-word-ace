import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Eye, EyeOff, Home, Check, X, Timer, Users } from "lucide-react";
import { playNotificationSound } from "@/lib/audio";

interface CrocodileGame {
  id: string;
  code: string;
  player_count: number;
  current_player: number;
  current_word_id: string;
  current_guesser: number;
  showing_player: number;
  status: string;
  round: number;
}

interface CrocodileWord {
  id: string;
  word: string;
  category: string;
}

interface PlayerView {
  player_index: number;
}

const CrocodileGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<CrocodileGame | null>(null);
  const [word, setWord] = useState<CrocodileWord | null>(null);
  const [views, setViews] = useState<PlayerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWord, setShowWord] = useState(false);
  const [allPlayersJoined, setAllPlayersJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevViewsCountRef = useRef<number>(0);
  const prevGuesserRef = useRef<number | null>(null);

  const gameUrl = `${window.location.origin}/crocodile-play/${code}`;
  const adminIndex = game ? game.player_count - 1 : 0;

  const isMyTurnToGuess = game && 
    game.current_guesser === adminIndex && 
    game.showing_player !== adminIndex;

  const isShowingWord = game && game.showing_player === adminIndex;

  const fetchGame = async () => {
    if (!code) return;

    const { data, error } = await supabase
      .from("crocodile_games")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error || !data) {
      toast.error("Игра не найдена");
      navigate("/");
      return;
    }

    setGame(data as CrocodileGame);

    // Fetch current word
    if (data.current_word_id) {
      const { data: wordData } = await supabase
        .from("crocodile_words")
        .select("*")
        .eq("id", data.current_word_id)
        .maybeSingle();

      if (wordData) {
        setWord(wordData);
      }
    }

    return data;
  };

  const fetchViews = async (gameId: string) => {
    const { data: viewsData } = await supabase
      .from("player_views")
      .select("player_index")
      .eq("game_id", gameId);

    if (viewsData) {
      // Check if new player joined
      if (viewsData.length > prevViewsCountRef.current && prevViewsCountRef.current > 0) {
        playNotificationSound();
      }
      prevViewsCountRef.current = viewsData.length;
      setViews(viewsData);
    }
  };

  const registerAdmin = async (gameId: string, playerCount: number) => {
    const adminIdx = playerCount - 1;
    
    const { data: existing } = await supabase
      .from("player_views")
      .select("player_index")
      .eq("game_id", gameId)
      .eq("player_index", adminIdx)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("player_views")
        .insert({
          game_id: gameId,
          player_index: adminIdx,
        });
    }
  };

  useEffect(() => {
    if (!code) return;

    const initGame = async () => {
      const gameData = await fetchGame();
      if (!gameData) return;

      await registerAdmin(gameData.id, gameData.player_count);
      await fetchViews(gameData.id);
      setLoading(false);
    };

    initGame();
  }, [code]);

  // Poll for views
  useEffect(() => {
    if (!game) return;

    const interval = setInterval(() => {
      fetchViews(game.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [game]);

  // Check if all players joined
  useEffect(() => {
    if (game && views.length >= game.player_count) {
      if (!allPlayersJoined) {
        playNotificationSound();
        setAllPlayersJoined(true);
      }
    }
  }, [views, game, allPlayersJoined]);

  // Listen for game updates
  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel(`crocodile-admin-${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crocodile_games",
          filter: `id=eq.${game.id}`,
        },
        async (payload) => {
          const newGame = payload.new as CrocodileGame;
          setGame(newGame);
          
          // Play sound when it's my turn
          if (newGame.current_guesser === adminIndex && 
              newGame.showing_player !== adminIndex &&
              prevGuesserRef.current !== newGame.current_guesser) {
            playNotificationSound();
          }
          prevGuesserRef.current = newGame.current_guesser;
          
          // Fetch new word
          if (newGame.current_word_id) {
            const { data: wordData } = await supabase
              .from("crocodile_words")
              .select("*")
              .eq("id", newGame.current_word_id)
              .maybeSingle();

            if (wordData) {
              setWord(wordData);
              setShowWord(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game, code, adminIndex]);

  // Timer logic for admin guessing
  useEffect(() => {
    if (!isMyTurnToGuess || !game || game.status !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setTimeLeft(10);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNotGuessed();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isMyTurnToGuess, game?.current_guesser, game?.status]);

  const startGame = async () => {
    if (!game) return;

    // Set showing player to 0 (first player), guesser to 1 (second player)
    await supabase
      .from("crocodile_games")
      .update({
        status: "playing",
        showing_player: 0,
        current_guesser: 1,
      })
      .eq("id", game.id);

    toast.success("Игра началась!");
  };

  const handleGuessed = async () => {
    if (!game) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Get new word
    const { data: words } = await supabase
      .from("crocodile_words")
      .select("id");

    if (!words?.length) return;

    const randomWord = words[Math.floor(Math.random() * words.length)];

    // Admin who guessed becomes the new showing player
    const nextShowingPlayer = adminIndex;
    const nextGuesser = (adminIndex + 1) % game.player_count;

    await supabase
      .from("crocodile_games")
      .update({
        showing_player: nextShowingPlayer,
        current_guesser: nextGuesser,
        current_word_id: randomWord.id,
        round: game.round + 1,
      })
      .eq("id", game.id);

    toast.success("Теперь ты показываешь!");
  };

  const handleNotGuessed = async () => {
    if (!game) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Move to next guesser, skip showing player
    let nextGuesser = (game.current_guesser + 1) % game.player_count;
    if (nextGuesser === game.showing_player) {
      nextGuesser = (nextGuesser + 1) % game.player_count;
    }

    await supabase
      .from("crocodile_games")
      .update({
        current_guesser: nextGuesser,
      })
      .eq("id", game.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!game) return null;

  // Waiting for players phase
  if (!allPlayersJoined || game.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="absolute top-4 left-4"
        >
          <Home className="w-5 h-5" />
        </Button>
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
              КРОКОДИЛ
            </h1>
            <p className="text-muted-foreground text-sm">
              {views.length} / {game.player_count} игроков подключились
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-secondary p-6 flex flex-col items-center justify-center mb-6">
            <QRCodeSVG
              value={gameUrl}
              size={200}
              bgColor="transparent"
              fgColor="hsl(var(--foreground))"
              level="M"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Код игры: <span className="font-mono font-bold text-foreground">{code}</span>
            </p>
          </div>

          <div className="text-center mb-8">
            <p className="text-xs text-muted-foreground break-all">{gameUrl}</p>
          </div>

          {!allPlayersJoined && (
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground">
                Ожидание игроков...
              </p>
            </div>
          )}

          {/* Player indicators - square like Impostor */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {Array.from({ length: game.player_count }).map((_, i) => {
              const hasJoined = views.some((v) => v.player_index === i);
              return (
                <div
                  key={i}
                  className={`aspect-square flex items-center justify-center text-sm font-bold transition-colors ${
                    hasJoined
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>

          {/* Start button */}
          {allPlayersJoined && game.status === "waiting" && (
            <Button
              onClick={startGame}
              className="w-full h-14 text-lg font-bold uppercase tracking-wider"
            >
              Начать игру
            </Button>
          )}

          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full mt-4 text-muted-foreground"
          >
            Новая игра
          </Button>
        </div>
      </div>
    );
  }

  // Game is playing - Admin is showing word
  if (isShowingWord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <Home className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              КРОКОДИЛ
            </h1>
            <div className="w-10" />
          </div>

          {/* Round info */}
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-accent rounded-lg mb-4">
              <span className="text-sm text-muted-foreground">Раунд </span>
              <span className="text-xl font-bold text-foreground">{game.round}</span>
            </div>
            <div className="inline-block px-4 py-2 bg-primary/20 border border-primary/40 rounded-lg animate-pulse">
              <p className="text-xl font-bold text-primary">
                🎭 Ты показываешь!
              </p>
            </div>
          </div>

          {/* Word Display */}
          <div className="bg-accent/50 rounded-xl p-8 mb-8">
            {showWord ? (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {word?.category}
                </p>
                <h3 className="text-4xl font-bold text-foreground">
                  {word?.word}
                </h3>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Нажми чтобы увидеть слово
                </p>
                <p className="text-xs text-muted-foreground">
                  (Только ты смотришь!)
                </p>
              </div>
            )}
          </div>

          {/* Show/Hide button */}
          <Button
            onClick={() => setShowWord(!showWord)}
            variant={showWord ? "outline" : "default"}
            className="w-full h-14 text-lg font-bold mb-4"
          >
            {showWord ? (
              <>
                <EyeOff className="w-5 h-5 mr-2" />
                Скрыть слово
              </>
            ) : (
              <>
                <Eye className="w-5 h-5 mr-2" />
                Показать слово
              </>
            )}
          </Button>

          {/* Current guesser info */}
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Сейчас угадывает:
            </p>
            <p className="text-xl font-bold text-foreground">
              Игрок {game.current_guesser + 1}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Admin is guessing
  if (isMyTurnToGuess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <Home className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              КРОКОДИЛ
            </h1>
            <div className="w-10" />
          </div>

          {/* Timer */}
          <div className="flex justify-center mb-8">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${
              timeLeft <= 3 ? 'bg-destructive/20 text-destructive animate-pulse' : 'bg-muted'
            }`}>
              <Timer className="w-5 h-5" />
              <span className="text-3xl font-bold">{timeLeft}</span>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-foreground text-center mb-4">
            УГАДЫВАЙ!
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Игрок {game.showing_player + 1} показывает слово
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleGuessed}
              className="h-20 text-xl font-bold bg-green-600 hover:bg-green-700"
            >
              <Check className="w-6 h-6 mr-2" />
              Угадал!
            </Button>
            <Button
              onClick={handleNotGuessed}
              variant="outline"
              className="h-20 text-xl font-bold border-destructive text-destructive hover:bg-destructive/10"
            >
              <X className="w-6 h-6 mr-2" />
              Не угадал
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Admin is waiting for turn
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <Home className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            КРОКОДИЛ
          </h1>
          <div className="w-10" />
        </div>

        <div className="text-center">
          <div className="inline-block px-4 py-2 bg-accent rounded-lg mb-6">
            <span className="text-sm text-muted-foreground">Раунд </span>
            <span className="text-xl font-bold text-foreground">{game.round}</span>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Жди свою очередь
          </h2>
          
          <div className="p-4 bg-muted/50 rounded-lg mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Игрок {game.showing_player + 1} показывает
            </p>
            <p className="text-lg font-bold text-foreground">
              Угадывает: Игрок {game.current_guesser + 1}
            </p>
          </div>
          
          <p className="text-muted-foreground text-sm">
            Смотри и готовься!
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrocodileGame;

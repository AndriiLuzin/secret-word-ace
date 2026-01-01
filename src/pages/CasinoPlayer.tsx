import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const CASINO_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "🔔", "7️⃣", "💎"];

interface CasinoGame {
  id: string;
  code: string;
  player_count: number;
  status: string;
  guesser_index: number;
  current_round: number;
  current_combination: string[];
  guesses_in_round: number;
}

interface CasinoPlayer {
  id: string;
  player_index: number;
  symbol: string;
}

const CasinoPlayer = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<CasinoGame | null>(null);
  const [myPlayer, setMyPlayer] = useState<CasinoPlayer | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const assignPlayer = useCallback(async (gameData: CasinoGame) => {
    // Check existing players
    const { data: existingPlayers } = await supabase
      .from("casino_players")
      .select("*")
      .eq("game_id", gameData.id);

    const usedIndices = existingPlayers?.map((p) => p.player_index) || [];

    if (usedIndices.length >= gameData.player_count) {
      setError("Все места заняты");
      setIsLoading(false);
      return null;
    }

    // Find available index
    let availableIndex = -1;
    for (let i = 0; i < gameData.player_count; i++) {
      if (!usedIndices.includes(i)) {
        availableIndex = i;
        break;
      }
    }

    if (availableIndex === -1) {
      setError("Все места заняты");
      setIsLoading(false);
      return null;
    }

    // Assign random symbol
    const usedSymbols = existingPlayers?.map((p) => p.symbol) || [];
    const availableSymbols = CASINO_SYMBOLS.filter((s) => !usedSymbols.includes(s));
    const randomSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)] || CASINO_SYMBOLS[availableIndex % CASINO_SYMBOLS.length];

    // Register player
    const { data: newPlayer, error: insertError } = await supabase
      .from("casino_players")
      .insert({
        game_id: gameData.id,
        player_index: availableIndex,
        symbol: randomSymbol,
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      setError("Ошибка регистрации");
      setIsLoading(false);
      return null;
    }

    setSearchParams({ p: String(availableIndex) });
    return { index: availableIndex, player: newPlayer };
  }, [setSearchParams]);

  const fetchPlayer = useCallback(async (gameData: CasinoGame, idx: number) => {
    setPlayerIndex(idx);

    const { data: player } = await supabase
      .from("casino_players")
      .select("*")
      .eq("game_id", gameData.id)
      .eq("player_index", idx)
      .maybeSingle();

    if (player) {
      setMyPlayer(player);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!code) return;

    const init = async () => {
      const { data: gameData, error: gameError } = await supabase
        .from("casino_games")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (gameError || !gameData) {
        setError("Игра не найдена");
        setIsLoading(false);
        return;
      }

      setGame(gameData);

      // Check if already has assigned index
      const existingIndex = searchParams.get("p");

      if (existingIndex !== null) {
        const idx = parseInt(existingIndex);
        await fetchPlayer(gameData, idx);
        return;
      }

      // Assign new player
      const result = await assignPlayer(gameData);
      if (result) {
        setPlayerIndex(result.index);
        setMyPlayer(result.player);
        setIsLoading(false);
      }
    };

    init();
  }, [code, searchParams, assignPlayer, fetchPlayer]);

  // Listen for game updates
  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel(`casino-player-${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "casino_games",
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          setGame(payload.new as CasinoGame);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "casino_players",
        },
        async () => {
          if (playerIndex === null) return;
          const { data: player } = await supabase
            .from("casino_players")
            .select("*")
            .eq("game_id", game.id)
            .eq("player_index", playerIndex)
            .maybeSingle();

          if (player) {
            setMyPlayer(player);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game, code, playerIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <p className="text-foreground font-bold mb-2">{error}</p>
          <p className="text-muted-foreground text-sm">Попросите ссылку у организатора</p>
        </div>
      </div>
    );
  }

  if (!game || !myPlayer) return null;

  const isGuesser = game.guesser_index === playerIndex;

  // Waiting for game to start
  if (game.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="absolute top-4 left-4"
        >
          <Home className="w-5 h-5" />
        </Button>
        <div className="text-center animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Игрок #{playerIndex !== null ? playerIndex + 1 : "?"}
          </p>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            КАЗИНО
          </h1>
          <p className="text-muted-foreground">
            Ожидание начала игры...
          </p>
        </div>
      </div>
    );
  }

  // Game is active - show role
  if (!isRevealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="absolute top-4 left-4"
        >
          <Home className="w-5 h-5" />
        </Button>
        <div className="text-center animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Игрок #{playerIndex !== null ? playerIndex + 1 : "?"}
          </p>
          <Button
            onClick={() => setIsRevealed(true)}
            className="h-20 px-12 text-xl font-bold uppercase tracking-wider"
          >
            Показать роль
          </Button>
          <p className="text-xs text-muted-foreground mt-6">
            Никому не показывайте экран
          </p>
        </div>
      </div>
    );
  }

  // Guesser view
  if (isGuesser) {
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

        <div className="text-center animate-scale-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Твоя роль
          </p>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            УГАДЫВАЮЩИЙ
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Крути автомат на телефоне организатора
            <br />
            и показывай на игроков с символами
          </p>

          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground">
              Раунд {game.current_round} • Попытка {game.guesses_in_round + 1}/3
            </p>
          </div>

          <Button
            onClick={() => setIsRevealed(false)}
            variant="outline"
            className="mt-8"
          >
            Скрыть
          </Button>
        </div>
      </div>
    );
  }

  // Regular player - show symbol
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

      <div className="text-center animate-scale-in">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
          Твой символ
        </p>
        <div className="text-8xl mb-8">{myPlayer.symbol}</div>
        
        <p className="text-muted-foreground text-sm">
          Игрок #{game.guesser_index + 1} угадывает
        </p>

        <div className="mt-8 p-4 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground">
            Раунд {game.current_round} • Попытка {game.guesses_in_round + 1}/3
          </p>
        </div>

        <Button
          onClick={() => setIsRevealed(false)}
          variant="outline"
          className="mt-8"
        >
          Скрыть
        </Button>
      </div>
    </div>
  );
};

export default CasinoPlayer;

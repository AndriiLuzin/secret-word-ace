import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

interface WhoAmIGame {
  id: string;
  code: string;
  player_count: number;
  guesser_index: number;
  status: string;
}

interface WhoAmIPlayer {
  id: string;
  player_index: number;
  character_id: string;
  character?: {
    name: string;
    category: string;
  };
}

const WhoAmIPlayer = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<WhoAmIGame | null>(null);
  const [guesserPlayer, setGuesserPlayer] = useState<WhoAmIPlayer | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [isGuesser, setIsGuesser] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuesserCharacter = useCallback(async (gameId: string, guesserIdx: number) => {
    const { data } = await supabase
      .from("whoami_players")
      .select(`
        id,
        player_index,
        character_id,
        whoami_characters (
          name,
          category
        )
      `)
      .eq("game_id", gameId)
      .eq("player_index", guesserIdx)
      .maybeSingle();

    if (data) {
      setGuesserPlayer({
        ...data,
        character: (data as any).whoami_characters,
      });
    }
  }, []);

  const assignRole = useCallback(async (gameData: WhoAmIGame) => {
    const { data: existingViews } = await supabase
      .from("whoami_player_views")
      .select("player_index")
      .eq("game_id", gameData.id);

    const usedIndices = existingViews?.map((v) => v.player_index) || [];

    if (usedIndices.length >= gameData.player_count) {
      setError("Все места заняты");
      setIsLoading(false);
      return null;
    }

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

    const { error: insertError } = await supabase
      .from("whoami_player_views")
      .insert({
        game_id: gameData.id,
        player_index: availableIndex,
      });

    if (insertError) {
      console.error(insertError);
      setError("Ошибка регистрации");
      setIsLoading(false);
      return null;
    }

    setSearchParams({ p: String(availableIndex) });
    return availableIndex;
  }, [setSearchParams]);

  const setupPlayer = useCallback(async (gameData: WhoAmIGame, idx: number) => {
    setPlayerIndex(idx);
    setIsGuesser(idx === gameData.guesser_index);
    
    if (idx !== gameData.guesser_index) {
      await fetchGuesserCharacter(gameData.id, gameData.guesser_index);
    }
    
    setIsLoading(false);
  }, [fetchGuesserCharacter]);

  useEffect(() => {
    if (!code) return;

    const init = async () => {
      const { data: gameData, error: gameError } = await supabase
        .from("whoami_games")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (gameError || !gameData) {
        setError("Игра не найдена");
        setIsLoading(false);
        return;
      }

      setGame(gameData);

      const existingIndex = searchParams.get("p");
      
      if (existingIndex !== null) {
        const idx = parseInt(existingIndex);
        const { data: view } = await supabase
          .from("whoami_player_views")
          .select("player_index")
          .eq("game_id", gameData.id)
          .eq("player_index", idx)
          .maybeSingle();

        if (view) {
          await setupPlayer(gameData, idx);
          return;
        }
      }

      const newIndex = await assignRole(gameData);
      if (newIndex !== null) {
        await setupPlayer(gameData, newIndex);
      }
    };

    init();
  }, [code, searchParams, assignRole, setupPlayer]);

  // Listen for game updates (new round)
  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel(`whoami-player-${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whoami_games",
          filter: `id=eq.${game.id}`,
        },
        async (payload) => {
          const newGame = payload.new as WhoAmIGame;
          setGame(newGame);
          setIsRevealed(false);
          
          const existingIndex = searchParams.get("p");
          if (existingIndex !== null) {
            const idx = parseInt(existingIndex);
            
            const { data: view } = await supabase
              .from("whoami_player_views")
              .select("player_index")
              .eq("game_id", newGame.id)
              .eq("player_index", idx)
              .maybeSingle();

            if (!view) {
              await supabase
                .from("whoami_player_views")
                .insert({
                  game_id: newGame.id,
                  player_index: idx,
                });
            }

            await setupPlayer(newGame, idx);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game, code, searchParams, setupPlayer]);

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
            Показать
          </Button>
          <p className="text-xs text-muted-foreground mt-6">
            Никому не показывайте экран
          </p>
        </div>
      </div>
    );
  }

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
          {isGuesser ? "Твоя задача" : `Персонаж игрока #${(game?.guesser_index ?? 0) + 1}`}
        </p>
        <h1 className="text-4xl font-bold text-foreground">
          {isGuesser ? "КТО Я?" : guesserPlayer?.character?.name}
        </h1>
        {!isGuesser && guesserPlayer?.character?.category && (
          <p className="text-muted-foreground text-sm mt-2">
            {guesserPlayer.character.category}
          </p>
        )}
        <p className="text-muted-foreground text-sm mt-6">
          {isGuesser ? (
            <>
              Ты не знаешь своего персонажа.
              <br />
              Задавай вопросы с ответами Да/Нет.
            </>
          ) : (
            <>
              Игрок #{(game?.guesser_index ?? 0) + 1} не знает кто он.
              <br />
              Помоги ему угадать, отвечая на вопросы.
            </>
          )}
        </p>

        <Button
          onClick={() => setIsRevealed(false)}
          variant="outline"
          className="mt-12"
        >
          Скрыть
        </Button>
      </div>
    </div>
  );
};

export default WhoAmIPlayer;
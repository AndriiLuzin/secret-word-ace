import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Game {
  id: string;
  code: string;
  player_count: number;
  word_id: string;
  impostor_index: number;
}

const PlayerView = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [game, setGame] = useState<Game | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [isImpostor, setIsImpostor] = useState(false);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const assignRole = useCallback(async (gameData: Game) => {
    // Check how many have already viewed
    const { data: existingViews } = await supabase
      .from("player_views")
      .select("player_index")
      .eq("game_id", gameData.id);

    const usedIndices = existingViews?.map((v) => v.player_index) || [];

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

    // Register this player
    const { error: insertError } = await supabase
      .from("player_views")
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

    // Save to URL
    setSearchParams({ p: String(availableIndex) });
    return availableIndex;
  }, [setSearchParams]);

  const fetchRole = useCallback(async (gameData: Game, idx: number) => {
    setPlayerIndex(idx);

    if (idx === gameData.impostor_index) {
      setIsImpostor(true);
      setWord(null);
    } else {
      setIsImpostor(false);
      const { data: wordData } = await supabase
        .from("game_words")
        .select("word")
        .eq("id", gameData.word_id)
        .single();

      setWord(wordData?.word || null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!code) return;

    const init = async () => {
      const { data: gameData, error: gameError } = await supabase
        .from("games")
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
        // Verify this player still exists
        const { data: view } = await supabase
          .from("player_views")
          .select("player_index")
          .eq("game_id", gameData.id)
          .eq("player_index", idx)
          .maybeSingle();

        if (view) {
          await fetchRole(gameData, idx);
          return;
        }
      }

      // Assign new role
      const newIndex = await assignRole(gameData);
      if (newIndex !== null) {
        await fetchRole(gameData, newIndex);
      }
    };

    init();
  }, [code, searchParams, assignRole, fetchRole]);

  // Listen for new round
  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel(`player-${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${game.id}`,
        },
        async (payload) => {
          const newGame = payload.new as Game;
          setGame(newGame);
          setIsRevealed(false);
          
          // Re-register for new round
          const existingIndex = searchParams.get("p");
          if (existingIndex !== null) {
            const idx = parseInt(existingIndex);
            
            // Check if still registered
            const { data: view } = await supabase
              .from("player_views")
              .select("player_index")
              .eq("game_id", newGame.id)
              .eq("player_index", idx)
              .maybeSingle();

            if (!view) {
              // Re-register
              await supabase
                .from("player_views")
                .insert({
                  game_id: newGame.id,
                  player_index: idx,
                });
            }

            await fetchRole(newGame, idx);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game, code, searchParams, fetchRole]);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
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

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors ${
        isImpostor ? "bg-impostor" : "bg-background"
      }`}
    >
      <div className="text-center animate-scale-in">
        {isImpostor ? (
          <>
            <p className="text-6xl mb-4">🕵️</p>
            <h1 className="text-4xl font-bold text-primary-foreground mb-2">
              САМОЗВАНЕЦ
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              Ты не знаешь слово.
              <br />
              Притворяйся, что знаешь.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              Секретное слово
            </p>
            <h1 className="text-4xl font-bold text-foreground">{word}</h1>
            <p className="text-muted-foreground text-sm mt-6">
              Один из игроков — самозванец.
              <br />
              Он не знает это слово.
            </p>
          </>
        )}

        <Button
          onClick={() => setIsRevealed(false)}
          variant={isImpostor ? "secondary" : "outline"}
          className="mt-12"
        >
          Скрыть
        </Button>
      </div>
    </div>
  );
};

export default PlayerView;

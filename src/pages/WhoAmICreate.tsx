import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const WhoAmICreate = () => {
  const [playerCount, setPlayerCount] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createGame = async () => {
    const count = parseInt(playerCount);
    if (isNaN(count) || count < 2 || count > 20) {
      toast.error("Укажите от 2 до 20 игроков");
      return;
    }

    setIsCreating(true);

    try {
      // Get random characters for all players
      const { data: characters, error: charsError } = await supabase
        .from("whoami_characters")
        .select("id");

      if (charsError || !characters?.length) {
        throw new Error("Не удалось загрузить персонажей");
      }

      const code = generateCode();

      // Create game
      const { data: game, error: gameError } = await supabase
        .from("whoami_games")
        .insert({
          code,
          player_count: count,
          status: "playing",
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Assign random characters to each player
      const shuffledChars = [...characters].sort(() => Math.random() - 0.5);
      const playerInserts = [];

      for (let i = 0; i < count; i++) {
        playerInserts.push({
          game_id: game.id,
          player_index: i,
          character_id: shuffledChars[i % shuffledChars.length].id,
          guessed: false,
        });
      }

      const { error: playersError } = await supabase
        .from("whoami_players")
        .insert(playerInserts);

      if (playersError) throw playersError;

      navigate(`/whoami/${code}`);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка создания игры");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2 text-center">
          КТО Я?
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-12">
          Угадай своего персонажа
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Количество игроков
            </label>
            <Input
              type="number"
              min={2}
              max={20}
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
              placeholder="2-20"
              className="text-center text-2xl h-16 font-bold"
            />
          </div>

          <Button
            onClick={createGame}
            disabled={isCreating || !playerCount}
            className="w-full h-14 text-lg font-bold uppercase tracking-wider"
          >
            {isCreating ? "Создание..." : "Создать игру"}
          </Button>
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">
            Каждый игрок получает персонажа,
            <br />
            которого видят все кроме него самого.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhoAmICreate;

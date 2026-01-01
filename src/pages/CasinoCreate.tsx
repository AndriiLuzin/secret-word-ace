import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const CASINO_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "🔔", "7️⃣", "💎"];

const CasinoCreate = () => {
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
    if (isNaN(count) || count < 3 || count > 20) {
      toast.error("Укажите от 3 до 20 игроков");
      return;
    }

    setIsCreating(true);

    try {
      const code = generateCode();

      // Create game
      const { data: game, error: gameError } = await supabase
        .from("casino_games")
        .insert({
          code,
          player_count: count,
          status: "waiting",
          guesser_index: 0,
          current_round: 1,
          guesses_in_round: 0,
          current_combination: [],
        })
        .select()
        .single();

      if (gameError) throw gameError;

      navigate(`/casino/${code}`);
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
          КАЗИНО
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-12">
          Угадай комбинацию символов
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Количество игроков
            </label>
            <Input
              type="number"
              min={3}
              max={20}
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
              placeholder="3-20"
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

        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          className="w-full mt-4 text-muted-foreground"
        >
          На главную
        </Button>

        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">
            Один игрок угадывает комбинацию.
            <br />
            Остальные — символы казино.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CasinoCreate;

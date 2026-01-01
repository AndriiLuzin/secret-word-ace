import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const MafiaCreate = () => {
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

  const getMafiaCount = (players: number): number => {
    if (players <= 6) return 1;
    if (players <= 9) return 2;
    if (players <= 12) return 3;
    return Math.floor(players / 4);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const createGame = async () => {
    const count = parseInt(playerCount);
    if (isNaN(count) || count < 4 || count > 20) {
      toast.error("Укажите от 4 до 20 игроков");
      return;
    }

    setIsCreating(true);

    try {
      const code = generateCode();
      const mafiaCount = getMafiaCount(count);

      // Create game
      const { data: game, error: gameError } = await supabase
        .from("mafia_games")
        .insert({
          code,
          player_count: count,
          mafia_count: mafiaCount,
          status: "waiting",
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Generate roles
      const roles: string[] = [];
      for (let i = 0; i < mafiaCount; i++) {
        roles.push("mafia");
      }
      for (let i = 0; i < count - mafiaCount; i++) {
        roles.push("civilian");
      }

      const shuffledRoles = shuffleArray(roles);

      // Create player entries with assigned roles
      const players = shuffledRoles.map((role, index) => ({
        game_id: game.id,
        player_index: index,
        role,
      }));

      const { error: playersError } = await supabase
        .from("mafia_players")
        .insert(players);

      if (playersError) throw playersError;

      navigate(`/mafia/${code}`);
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
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Link>

        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2 text-center">
          МАФИЯ
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-12">
          Город засыпает, просыпается мафия
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Количество игроков
            </label>
            <Input
              type="number"
              min={4}
              max={20}
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
              placeholder="4-20"
              className="text-center text-2xl h-16 font-bold"
            />
            {playerCount && parseInt(playerCount) >= 4 && (
              <p className="text-xs text-muted-foreground text-center">
                Мафии: {getMafiaCount(parseInt(playerCount))} | Мирных:{" "}
                {parseInt(playerCount) - getMafiaCount(parseInt(playerCount))}
              </p>
            )}
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
            Мафия убивает мирных жителей.
            <br />
            Мирные должны найти и казнить мафию.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MafiaCreate;

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { playNotificationSound } from "@/lib/audio";

interface MafiaGame {
  id: string;
  code: string;
  player_count: number;
  mafia_count: number;
  status: string;
}

interface MafiaPlayer {
  id: string;
  player_index: number;
  role: string;
  viewed_at: string | null;
}

const MafiaAdmin = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<MafiaGame | null>(null);
  const [players, setPlayers] = useState<MafiaPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      if (!code) return;

      const { data: gameData, error: gameError } = await supabase
        .from("mafia_games")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (gameError || !gameData) {
        toast.error("Игра не найдена");
        navigate("/");
        return;
      }

      setGame(gameData);

      const { data: playersData } = await supabase
        .from("mafia_players")
        .select("*")
        .eq("game_id", gameData.id)
        .order("player_index", { ascending: true });

      if (playersData) {
        setPlayers(playersData);
      }

      setLoading(false);
    };

    fetchGame();
  }, [code, navigate]);

  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel("mafia-players")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mafia_players",
          filter: `game_id=eq.${game.id}`,
        },
        (payload) => {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === payload.new.id ? (payload.new as MafiaPlayer) : p
            )
          );
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game]);

  useEffect(() => {
    const viewedCount = players.filter((p) => p.viewed_at).length;
    if (game && viewedCount >= game.player_count && !isRevealed) {
      setIsRevealed(true);
    }
  }, [players, game, isRevealed]);

  const startNewGame = async () => {
    if (!game) return;

    try {
      // Reset all player views
      const { error: resetError } = await supabase
        .from("mafia_players")
        .delete()
        .eq("game_id", game.id);

      if (resetError) throw resetError;

      // Shuffle and assign new roles
      const roles: string[] = [];
      for (let i = 0; i < game.mafia_count; i++) {
        roles.push("mafia");
      }
      for (let i = 0; i < game.player_count - game.mafia_count; i++) {
        roles.push("civilian");
      }

      const shuffled = [...roles].sort(() => Math.random() - 0.5);

      const newPlayers = shuffled.map((role, index) => ({
        game_id: game.id,
        player_index: index,
        role,
      }));

      const { error: insertError } = await supabase
        .from("mafia_players")
        .insert(newPlayers);

      if (insertError) throw insertError;

      // Fetch updated players
      const { data: playersData } = await supabase
        .from("mafia_players")
        .select("*")
        .eq("game_id", game.id)
        .order("player_index", { ascending: true });

      if (playersData) {
        setPlayers(playersData);
      }

      setIsRevealed(false);
      toast.success("Новый раунд начат!");
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при создании нового раунда");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!game) return null;

  const viewedCount = players.filter((p) => p.viewed_at).length;
  const allViewed = viewedCount >= game.player_count;
  const playerUrl = `${window.location.origin}/mafia-play/${code}`;

  // Admin role reveal screen
  const adminPlayer = players[game.player_count - 1];
  const isAdminMafia = adminPlayer?.role === "mafia";

  if (allViewed && isRevealed) {
    const mafiaPlayers = players.filter((p) => p.role === "mafia");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center animate-scale-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            {isAdminMafia ? "Твоя роль" : "Твоя роль"}
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            {isAdminMafia ? "МАФИЯ" : "МИРНЫЙ ЖИТЕЛЬ"}
          </h1>
          <p className="text-muted-foreground text-sm mt-6">
            {isAdminMafia ? (
              <>
                Ты знаешь, кто в твоей команде.
                <br />
                Убей всех мирных жителей.
              </>
            ) : (
              <>
                Найди и разоблачи мафию.
                <br />
                Не дай себя обмануть.
              </>
            )}
          </p>

          {!isAdminMafia && (
            <div className="mt-6 p-4 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                Мафия ({mafiaPlayers.length}):
              </p>
              <p className="text-sm font-medium">
                {mafiaPlayers.map((p) => `Игрок #${p.player_index + 1}`).join(", ")}
              </p>
            </div>
          )}

          {isAdminMafia && (
            <div className="mt-6 p-4 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                Твоя команда:
              </p>
              <p className="text-sm font-medium">
                {mafiaPlayers.map((p) => `Игрок #${p.player_index + 1}`).join(", ")}
              </p>
            </div>
          )}

          <Button
            onClick={() => setIsRevealed(false)}
            variant="outline"
            className="mt-8"
          >
            Скрыть
          </Button>

          <Button onClick={startNewGame} className="mt-4 w-full">
            Новый раунд
          </Button>

          <Link
            to="/"
            className="block mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Новая игра
          </Link>
        </div>
      </div>
    );
  }

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

        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Код игры
          </p>
          <h1 className="text-4xl font-bold tracking-widest text-foreground">
            {code}
          </h1>
        </div>

        <div className="flex justify-center mb-8">
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG value={playerUrl} size={200} />
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-xs text-muted-foreground break-all">{playerUrl}</p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Подключено игроков:{" "}
            <span className="font-bold text-foreground">
              {viewedCount} / {game.player_count}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Мафии: {game.mafia_count} | Мирных: {game.player_count - game.mafia_count}
          </p>

          {allViewed && (
            <Button onClick={() => setIsRevealed(true)} className="mt-6 w-full">
              Показать роли
            </Button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-5 gap-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`aspect-square rounded flex items-center justify-center text-xs font-bold ${
                player.viewed_at
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {player.player_index + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MafiaAdmin;

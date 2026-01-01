import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Home } from "lucide-react";
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
  const [showMyRole, setShowMyRole] = useState(false);

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

        // Auto-register admin as last player if not viewed
        const adminIndex = gameData.player_count - 1;
        const adminPlayer = playersData.find((p) => p.player_index === adminIndex);
        
        if (adminPlayer && !adminPlayer.viewed_at) {
          await supabase
            .from("mafia_players")
            .update({ viewed_at: new Date().toISOString() })
            .eq("id", adminPlayer.id);

          // Refetch players
          const { data: updatedPlayers } = await supabase
            .from("mafia_players")
            .select("*")
            .eq("game_id", gameData.id)
            .order("player_index", { ascending: true });

          if (updatedPlayers) {
            setPlayers(updatedPlayers);
            
            const viewedCount = updatedPlayers.filter((p) => p.viewed_at).length;
            if (viewedCount >= gameData.player_count) {
              setIsRevealed(true);
              playNotificationSound();
            }
          }
        } else {
          const viewedCount = playersData.filter((p) => p.viewed_at).length;
          if (viewedCount >= gameData.player_count) {
            setIsRevealed(true);
          }
        }
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
      playNotificationSound();
    }
  }, [players, game, isRevealed]);

  const startNewGame = async () => {
    if (!game) return;

    try {
      const { error: resetError } = await supabase
        .from("mafia_players")
        .delete()
        .eq("game_id", game.id);

      if (resetError) throw resetError;

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

      const { data: playersData } = await supabase
        .from("mafia_players")
        .select("*")
        .eq("game_id", game.id)
        .order("player_index", { ascending: true });

      if (playersData) {
        setPlayers(playersData);
      }

      setIsRevealed(false);
      setShowMyRole(false);
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

  const adminIndex = game.player_count - 1;
  const adminPlayer = players.find((p) => p.player_index === adminIndex);
  const isAdminMafia = adminPlayer?.role === "mafia";
  const mafiaPlayers = players.filter((p) => p.role === "mafia");

  // Show role screen when all viewed and revealed
  if (allViewed && isRevealed) {
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

          <div className="mt-6 p-4 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">
              {isAdminMafia ? "Твоя команда:" : `Мафия (${mafiaPlayers.length}):`}
            </p>
            <p className="text-sm font-medium">
              {mafiaPlayers.map((p) => `Игрок #${p.player_index + 1}`).join(", ")}
            </p>
          </div>

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

  // Admin wants to see their role before all joined
  if (showMyRole && adminPlayer) {
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
            onClick={() => setShowMyRole(false)}
            variant="outline"
            className="mt-8"
          >
            Скрыть
          </Button>
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
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
            МАФИЯ {code}
          </h1>
          <p className="text-muted-foreground text-sm">
            {viewedCount} / {game.player_count} игроков посмотрели
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Мафии: {game.mafia_count} | Мирных: {game.player_count - game.mafia_count}
          </p>
        </div>

        {/* Show Role Button */}
        <Button
          onClick={() => setShowMyRole(true)}
          className="w-full h-14 text-lg font-bold uppercase tracking-wider mb-6"
        >
          Показать мою роль
        </Button>

        <div className="bg-secondary p-6 flex items-center justify-center mb-6">
          <QRCodeSVG
            value={playerUrl}
            size={200}
            bgColor="transparent"
            fgColor="hsl(var(--foreground))"
            level="M"
          />
        </div>

        <div className="text-center mb-8">
          <p className="text-xs text-muted-foreground break-all">{playerUrl}</p>
        </div>

        {!allViewed && (
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">
              Ожидание игроков...
            </p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-2 mb-8">
          {players.map((player) => (
            <div
              key={player.id}
              className={`aspect-square flex items-center justify-center text-sm font-bold transition-colors ${
                player.viewed_at
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {player.player_index + 1}
            </div>
          ))}
        </div>

        <Button
          onClick={startNewGame}
          variant="outline"
          className="w-full h-12 font-bold uppercase tracking-wider"
        >
          Новый раунд
        </Button>

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
};

export default MafiaAdmin;

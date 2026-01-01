import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Home, Check, RotateCcw, Eye, EyeOff } from "lucide-react";

interface WhoAmIGame {
  id: string;
  code: string;
  player_count: number;
  status: string;
}

interface WhoAmIPlayer {
  id: string;
  player_index: number;
  character_id: string;
  guessed: boolean;
  character?: {
    name: string;
    category: string;
  };
}

const WhoAmIGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<WhoAmIGame | null>(null);
  const [players, setPlayers] = useState<WhoAmIPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [revealedPlayers, setRevealedPlayers] = useState<Set<number>>(new Set());

  const fetchGame = async () => {
    if (!code) return;

    const { data: gameData, error: gameError } = await supabase
      .from("whoami_games")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (gameError || !gameData) {
      toast.error("Игра не найдена");
      navigate("/");
      return;
    }

    setGame(gameData);

    // Fetch players with their characters
    const { data: playersData } = await supabase
      .from("whoami_players")
      .select(`
        id,
        player_index,
        character_id,
        guessed,
        whoami_characters (
          name,
          category
        )
      `)
      .eq("game_id", gameData.id)
      .order("player_index");

    if (playersData) {
      const formattedPlayers = playersData.map((p: any) => ({
        ...p,
        character: p.whoami_characters,
      }));
      setPlayers(formattedPlayers);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGame();
  }, [code]);

  const toggleReveal = (playerIndex: number) => {
    setRevealedPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerIndex)) {
        newSet.delete(playerIndex);
      } else {
        newSet.add(playerIndex);
      }
      return newSet;
    });
  };

  const markGuessed = async (playerId: string, playerIndex: number) => {
    await supabase
      .from("whoami_players")
      .update({ guessed: true })
      .eq("id", playerId);

    toast.success(`Игрок ${playerIndex + 1} угадал!`);
    fetchGame();
  };

  const newGame = async () => {
    if (!game) return;

    // Get new random characters
    const { data: characters } = await supabase
      .from("whoami_characters")
      .select("id");

    if (!characters?.length) return;

    const shuffledChars = [...characters].sort(() => Math.random() - 0.5);

    // Update each player with new character
    for (let i = 0; i < players.length; i++) {
      await supabase
        .from("whoami_players")
        .update({
          character_id: shuffledChars[i % shuffledChars.length].id,
          guessed: false,
        })
        .eq("id", players[i].id);
    }

    setRevealedPlayers(new Set());
    toast.success("Новая игра началась!");
    fetchGame();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!game) return null;

  const gameUrl = `${window.location.origin}/whoami/${code}`;
  const allGuessed = players.every((p) => p.guessed);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <Home className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            КТО Я?
          </h1>
          <div className="w-10" />
        </div>

        {/* Game Info */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Код игры: <span className="font-mono font-bold">{code}</span>
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-accent/50 rounded-xl p-4 mb-6">
          <p className="text-sm text-center text-muted-foreground">
            Покажи персонажа другим игрокам,
            <br />
            но не показывай владельцу!
          </p>
        </div>

        {/* Players Grid */}
        <div className="space-y-3 mb-6">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-4 border rounded-lg ${
                player.guessed
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold">
                    {player.player_index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Игрок {player.player_index + 1}
                    </p>
                    {revealedPlayers.has(player.player_index) ? (
                      <div>
                        <p className="text-lg font-bold text-foreground">
                          {player.character?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {player.character?.category}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {player.guessed ? "Угадал!" : "Персонаж скрыт"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleReveal(player.player_index)}
                  >
                    {revealedPlayers.has(player.player_index) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  {!player.guessed && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => markGuessed(player.id, player.player_index)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* All Guessed Message */}
        {allGuessed && (
          <div className="text-center p-4 bg-green-500/20 rounded-xl mb-6">
            <p className="text-lg font-bold text-green-600">
              🎉 Все угадали!
            </p>
          </div>
        )}

        {/* New Game Button */}
        <Button onClick={newGame} className="w-full h-12 mb-4">
          <RotateCcw className="w-4 h-4 mr-2" />
          Новая игра
        </Button>

        {/* QR Code Toggle */}
        <Button
          variant="ghost"
          onClick={() => setShowQR(!showQR)}
          className="w-full text-muted-foreground"
        >
          {showQR ? "Скрыть QR-код" : "Показать QR-код для друзей"}
        </Button>

        {showQR && (
          <div className="mt-4 flex flex-col items-center p-6 border border-border rounded-lg">
            <QRCodeSVG value={gameUrl} size={160} />
          </div>
        )}

        {/* Rules */}
        <div className="mt-8 p-4 border border-border rounded-lg">
          <h4 className="font-bold text-foreground mb-2">Правила:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Каждый игрок видит персонажей других</li>
            <li>• Но не видит своего персонажа</li>
            <li>• Задавай вопросы с ответами Да/Нет</li>
            <li>• Угадай кто ты раньше других!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WhoAmIGame;

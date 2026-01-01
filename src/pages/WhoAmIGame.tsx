import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Home, RotateCcw, Users } from "lucide-react";

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
  const [guesserPlayer, setGuesserPlayer] = useState<WhoAmIPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(true);
  const [viewedCount, setViewedCount] = useState(0);

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

    // Fetch guesser player with character
    const { data: playerData } = await supabase
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
      .eq("player_index", gameData.guesser_index)
      .maybeSingle();

    if (playerData) {
      setGuesserPlayer({
        ...playerData,
        character: (playerData as any).whoami_characters,
      });
    }

    // Get view count
    const { data: views } = await supabase
      .from("whoami_player_views")
      .select("player_index")
      .eq("game_id", gameData.id);

    setViewedCount(views?.length || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchGame();
  }, [code]);

  // Listen for new players joining
  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel(`whoami-admin-${code}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whoami_player_views",
        },
        async () => {
          const { data: views } = await supabase
            .from("whoami_player_views")
            .select("player_index")
            .eq("game_id", game.id);

          setViewedCount(views?.length || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game, code]);

  const newRound = async () => {
    if (!game) return;

    // Get new random character
    const { data: characters } = await supabase
      .from("whoami_characters")
      .select("id");

    if (!characters?.length) return;

    // Pick new random guesser (different from current if possible)
    let newGuesserIndex = Math.floor(Math.random() * game.player_count);
    if (game.player_count > 1 && newGuesserIndex === game.guesser_index) {
      newGuesserIndex = (newGuesserIndex + 1) % game.player_count;
    }

    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];

    // Delete old player views
    await supabase
      .from("whoami_player_views")
      .delete()
      .eq("game_id", game.id);

    // Update or create guesser player
    const { data: existingPlayer } = await supabase
      .from("whoami_players")
      .select("id")
      .eq("game_id", game.id)
      .eq("player_index", newGuesserIndex)
      .maybeSingle();

    if (existingPlayer) {
      await supabase
        .from("whoami_players")
        .update({
          character_id: randomCharacter.id,
          guessed: false,
        })
        .eq("id", existingPlayer.id);
    } else {
      await supabase
        .from("whoami_players")
        .insert({
          game_id: game.id,
          player_index: newGuesserIndex,
          character_id: randomCharacter.id,
          guessed: false,
        });
    }

    // Update game with new guesser
    await supabase
      .from("whoami_games")
      .update({
        guesser_index: newGuesserIndex,
        status: "playing",
      })
      .eq("id", game.id);

    setViewedCount(0);
    toast.success(`Новый раунд! Теперь угадывает игрок #${newGuesserIndex + 1}`);
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

  const playerUrl = `${window.location.origin}/whoami/${code}/play`;

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
          <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {viewedCount} / {game.player_count} игроков присоединилось
            </span>
          </div>
        </div>

        {/* Current Guesser Info */}
        <div className="bg-accent/50 rounded-xl p-6 mb-6 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Угадывает игрок
          </p>
          <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-2xl mx-auto mb-3">
            {game.guesser_index + 1}
          </div>
          <p className="text-lg font-bold text-foreground">
            {guesserPlayer?.character?.name}
          </p>
          {guesserPlayer?.character?.category && (
            <p className="text-sm text-muted-foreground">
              {guesserPlayer.character.category}
            </p>
          )}
        </div>

        {/* QR Code */}
        {showQR && (
          <div className="flex flex-col items-center p-6 border border-border rounded-lg mb-6">
            <p className="text-sm text-muted-foreground mb-4">
              Сканируйте чтобы присоединиться
            </p>
            <QRCodeSVG value={playerUrl} size={180} />
          </div>
        )}

        <Button
          variant="ghost"
          onClick={() => setShowQR(!showQR)}
          className="w-full text-muted-foreground mb-4"
        >
          {showQR ? "Скрыть QR-код" : "Показать QR-код"}
        </Button>

        {/* New Round Button */}
        <Button onClick={newRound} className="w-full h-12 mb-4">
          <RotateCcw className="w-4 h-4 mr-2" />
          Угадал! Новый раунд
        </Button>

        {/* Rules */}
        <div className="mt-4 p-4 border border-border rounded-lg">
          <h4 className="font-bold text-foreground mb-2">Правила:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Один игрок видит "Кто я?"</li>
            <li>• Остальные видят его персонажа</li>
            <li>• Задавай вопросы с ответами Да/Нет</li>
            <li>• Угадал — жми кнопку для нового раунда!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WhoAmIGame;

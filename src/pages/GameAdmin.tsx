import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/audio";
import { Home } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Game {
  id: string;
  code: string;
  player_count: number;
  word_id: string;
  impostor_index: number;
  status: string;
  views_count: number;
  starting_player: number | null;
}

interface PlayerView {
  player_index: number;
}

const GameAdmin = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [game, setGame] = useState<Game | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [views, setViews] = useState<PlayerView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [startingPlayer, setStartingPlayer] = useState<number | null>(null);
  const [showMyRole, setShowMyRole] = useState(false);

  const gameUrl = `${window.location.origin}/play/${code}`;

  useEffect(() => {
    if (!code) return;

    const fetchGame = async () => {
      const { data: gameData, error } = await supabase
        .from("games")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (error || !gameData) {
        toast.error(t.gameNotFound);
        navigate("/");
        return;
      }

      setGame(gameData);

      // Fetch views
      const { data: viewsData } = await supabase
        .from("player_views")
        .select("player_index")
        .eq("game_id", gameData.id);

      // Auto-register admin as the last player (player_count - 1)
      const adminIndex = gameData.player_count - 1;
      const adminViewed = viewsData?.some((v) => v.player_index === adminIndex);
      if (!adminViewed) {
        await supabase.from("player_views").insert({
          game_id: gameData.id,
          player_index: adminIndex,
        });
        // Refetch views after registering admin
        const { data: updatedViews } = await supabase
          .from("player_views")
          .select("player_index")
          .eq("game_id", gameData.id);
        setViews(updatedViews || []);

        // Check if all viewed after adding admin
        if (updatedViews && updatedViews.length >= gameData.player_count) {
          const { data: wordData } = await supabase
            .from("game_words")
            .select("word")
            .eq("id", gameData.word_id)
            .single();

          setWord(wordData?.word || null);
          setIsRevealed(true);
          // Select random starting player (not impostor) and save to DB
          const validPlayers = Array.from({ length: gameData.player_count }, (_, i) => i)
            .filter(i => i !== gameData.impostor_index);
          const selectedPlayer = validPlayers[Math.floor(Math.random() * validPlayers.length)];
          setStartingPlayer(selectedPlayer);
          // Save to database so players can see it
          await supabase
            .from("games")
            .update({ starting_player: selectedPlayer })
            .eq("id", gameData.id);
          playNotificationSound();
        }
      } else {
        setViews(viewsData || []);

        // Fetch word and auto-reveal if all players have viewed
        if (viewsData && viewsData.length >= gameData.player_count) {
          const { data: wordData } = await supabase
            .from("game_words")
            .select("word")
            .eq("id", gameData.word_id)
            .single();

          setWord(wordData?.word || null);
          setIsRevealed(true);
          // Select random starting player (not impostor) and save to DB
          const validPlayers = Array.from({ length: gameData.player_count }, (_, i) => i)
            .filter(i => i !== gameData.impostor_index);
          const selectedPlayer = validPlayers[Math.floor(Math.random() * validPlayers.length)];
          setStartingPlayer(selectedPlayer);
          await supabase
            .from("games")
            .update({ starting_player: selectedPlayer })
            .eq("id", gameData.id);
          playNotificationSound();
        }
      }

      setIsLoading(false);
    };

    fetchGame();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`game-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_views",
        },
        async () => {
          // Refetch views
          if (!game) return;
          const { data: viewsData } = await supabase
            .from("player_views")
            .select("player_index")
            .eq("game_id", game.id);

          setViews(viewsData || []);

          // Check if all viewed and auto-reveal
          if (viewsData && game && viewsData.length >= game.player_count) {
            const { data: wordData } = await supabase
              .from("game_words")
              .select("word")
              .eq("id", game.word_id)
              .single();

            setWord(wordData?.word || null);
            setIsRevealed(true);
            // Select random starting player (not impostor) and save to DB
            const validPlayers = Array.from({ length: game.player_count }, (_, i) => i)
              .filter(i => i !== game.impostor_index);
            const selectedPlayer = validPlayers[Math.floor(Math.random() * validPlayers.length)];
            setStartingPlayer(selectedPlayer);
            await supabase
              .from("games")
              .update({ starting_player: selectedPlayer })
              .eq("id", game.id);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, navigate, game?.id, game?.player_count, game?.word_id, t]);

  const startNewRound = async () => {
    if (!game) return;

    try {
      // Get new random word
      const { data: words } = await supabase.from("game_words").select("id");

      if (!words?.length) throw new Error("No words");

      const randomWord = words[Math.floor(Math.random() * words.length)];
      const newImpostorIndex = Math.floor(Math.random() * game.player_count);

      // Delete old views
      await supabase.from("player_views").delete().eq("game_id", game.id);

      // Update game (reset starting_player)
      await supabase
        .from("games")
        .update({
          word_id: randomWord.id,
          impostor_index: newImpostorIndex,
          views_count: 0,
          starting_player: null,
        })
        .eq("id", game.id);

      setWord(null);
      setViews([]);
      setIsRevealed(false);
      setStartingPlayer(null);
      setGame({ ...game, word_id: randomWord.id, impostor_index: newImpostorIndex });
      
      toast.success(t.newRound + "!");
    } catch (error) {
      toast.error(t.error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  if (!game) return null;

  const allViewed = views.length >= game.player_count;
  const adminIndex = game.player_count - 1;
  const isAdminImpostor = game.impostor_index === adminIndex;

  // Show role screen when all viewed and revealed
  if (allViewed && isRevealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
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
            {isAdminImpostor ? t.yourRole : t.secretWord}
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            {isAdminImpostor ? t.impostorRole : word}
          </h1>
          <p className="text-muted-foreground text-sm mt-6">
            {isAdminImpostor ? t.impostorHint : t.playerHint}
          </p>

          {startingPlayer !== null && (
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground">{t.startsFirst}</p>
              <p className="text-2xl font-bold text-primary">
                {t.player} #{startingPlayer + 1}
              </p>
            </div>
          )}

          <Button
            onClick={() => setIsRevealed(false)}
            variant="outline"
            className="mt-12"
          >
            {t.hide}
          </Button>

          <Button
            onClick={startNewRound}
            variant="outline"
            className="w-full mt-4 h-12 font-bold uppercase tracking-wider"
          >
            {t.newRound}
          </Button>
        </div>
      </div>
    );
  }

  // Admin wants to see their role
  if (showMyRole) {
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
            {isAdminImpostor ? t.yourRole : t.secretWord}
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            {isAdminImpostor ? t.impostorRole : word}
          </h1>
          <p className="text-muted-foreground text-sm mt-6">
            {isAdminImpostor ? t.impostorHint : t.playerHint}
          </p>

          <Button
            onClick={() => setShowMyRole(false)}
            variant="outline"
            className="mt-12"
          >
            {t.hide}
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
            {t.impostor.toUpperCase()} {code}
          </h1>
          <p className="text-muted-foreground text-sm">
            {views.length} / {game.player_count} {t.playersViewed}
          </p>
        </div>

        {/* Show Role Button */}
        <Button
          onClick={() => setShowMyRole(true)}
          className="w-full h-14 text-lg font-bold uppercase tracking-wider mb-6"
        >
          {t.showMyRole}
        </Button>

        <div className="bg-secondary p-6 flex items-center justify-center mb-6">
          <QRCodeSVG
            value={gameUrl}
            size={200}
            bgColor="transparent"
            fgColor="hsl(var(--foreground))"
            level="M"
          />
        </div>

        <div className="text-center mb-8">
          <p className="text-xs text-muted-foreground break-all">{gameUrl}</p>
        </div>

        {!allViewed && (
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">
              {t.waitingForPlayers}
            </p>
          </div>
        )}

        <div className="grid grid-cols-5 gap-2 mb-8">
          {Array.from({ length: game.player_count }).map((_, i) => {
            const hasViewed = views.some((v) => v.player_index === i);
            return (
              <div
                key={i}
                className={`aspect-square flex items-center justify-center text-sm font-bold transition-colors ${
                  hasViewed
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>

        <Button
          onClick={startNewRound}
          variant="outline"
          className="w-full h-12 font-bold uppercase tracking-wider"
        >
          {t.newRound}
        </Button>

        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          className="w-full mt-4 text-muted-foreground"
        >
          {t.newGame}
        </Button>
      </div>
    </div>
  );
};

export default GameAdmin;

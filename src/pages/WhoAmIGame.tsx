import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Home } from "lucide-react";
import { playNotificationSound } from "@/lib/audio";
import { useLanguage } from "@/lib/i18n";

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
  character?: { name: string; category: string; };
}

interface PlayerView {
  player_index: number;
}

const WhoAmIGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [game, setGame] = useState<WhoAmIGame | null>(null);
  const [guesserPlayer, setGuesserPlayer] = useState<WhoAmIPlayer | null>(null);
  const [views, setViews] = useState<PlayerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showMyRole, setShowMyRole] = useState(false);
  const playerUrl = `${window.location.origin}/whoami/${code}/play`;

  const fetchGuesserCharacter = async (gameId: string, guesserIdx: number) => {
    const { data: playerData } = await supabase
      .from("whoami_players")
      .select(`id, player_index, character_id, guessed, whoami_characters (name, category)`)
      .eq("game_id", gameId)
      .eq("player_index", guesserIdx)
      .maybeSingle();

    if (playerData) {
      setGuesserPlayer({ ...playerData, character: (playerData as any).whoami_characters });
    }
  };

  useEffect(() => {
    if (!code) return;

    const fetchGame = async () => {
      const { data: gameData, error: gameError } = await supabase.from("whoami_games").select("*").eq("code", code).maybeSingle();

      if (gameError || !gameData) {
        toast.error(t.gameNotFound);
        navigate("/");
        return;
      }

      setGame(gameData);
      await fetchGuesserCharacter(gameData.id, gameData.guesser_index);

      const { data: viewsData } = await supabase.from("whoami_player_views").select("player_index").eq("game_id", gameData.id);

      const adminIndex = gameData.player_count - 1;
      const adminViewed = viewsData?.some((v) => v.player_index === adminIndex);
      
      if (!adminViewed) {
        await supabase.from("whoami_player_views").insert({ game_id: gameData.id, player_index: adminIndex });
        const { data: updatedViews } = await supabase.from("whoami_player_views").select("player_index").eq("game_id", gameData.id);
        setViews(updatedViews || []);
        if (updatedViews && updatedViews.length >= gameData.player_count) {
          setIsRevealed(true);
          playNotificationSound();
        }
      } else {
        setViews(viewsData || []);
        if (viewsData && viewsData.length >= gameData.player_count) setIsRevealed(true);
      }

      setLoading(false);
    };

    fetchGame();

    const channel = supabase.channel(`whoami-admin-${code}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whoami_player_views" },
        async () => {
          if (!game) return;
          const { data: viewsData } = await supabase.from("whoami_player_views").select("player_index").eq("game_id", game.id);
          setViews(viewsData || []);
          if (viewsData && game && viewsData.length >= game.player_count) {
            setIsRevealed(true);
            playNotificationSound();
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [code, navigate, game?.id, game?.player_count, t]);

  const newRound = async () => {
    if (!game) return;

    try {
      const { data: characters } = await supabase.from("whoami_characters").select("id");
      if (!characters?.length) throw new Error("No characters");

      let newGuesserIndex = Math.floor(Math.random() * game.player_count);
      if (game.player_count > 1 && newGuesserIndex === game.guesser_index) {
        newGuesserIndex = (newGuesserIndex + 1) % game.player_count;
      }

      const randomCharacter = characters[Math.floor(Math.random() * characters.length)];

      await supabase.from("whoami_player_views").delete().eq("game_id", game.id);

      const { data: existingPlayer } = await supabase.from("whoami_players").select("id").eq("game_id", game.id).eq("player_index", newGuesserIndex).maybeSingle();

      if (existingPlayer) {
        await supabase.from("whoami_players").update({ character_id: randomCharacter.id, guessed: false }).eq("id", existingPlayer.id);
      } else {
        await supabase.from("whoami_players").insert({ game_id: game.id, player_index: newGuesserIndex, character_id: randomCharacter.id, guessed: false });
      }

      await supabase.from("whoami_games").update({ guesser_index: newGuesserIndex, status: "playing" }).eq("id", game.id);

      setViews([]);
      setIsRevealed(false);
      setGame({ ...game, guesser_index: newGuesserIndex });
      await fetchGuesserCharacter(game.id, newGuesserIndex);
      
      toast.success(t.newRound + "!");
    } catch (error) {
      toast.error(t.error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">{t.loading}</div></div>;
  }

  if (!game) return null;

  const allViewed = views.length >= game.player_count;
  const adminIndex = game.player_count - 1;
  const isAdminGuesser = game.guesser_index === adminIndex;

  if (allViewed && isRevealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="text-center animate-scale-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            {isAdminGuesser ? t.yourTask : `${t.characterOfPlayer} #${game.guesser_index + 1}`}
          </p>
          <h1 className="text-4xl font-bold text-foreground">{isAdminGuesser ? t.whoAmI : guesserPlayer?.character?.name}</h1>
          {!isAdminGuesser && guesserPlayer?.character?.category && <p className="text-muted-foreground text-sm mt-2">{guesserPlayer.character.category}</p>}
          <p className="text-muted-foreground text-sm mt-6">
            {isAdminGuesser ? (
              <>{t.youDontKnowCharacter}<br />{t.askYesNoQuestions}</>
            ) : (
              <>{t.player} #{game.guesser_index + 1} {t.playerDoesntKnowWhoHeIs}<br />{t.helpGuess}</>
            )}
          </p>
          <Button onClick={() => setIsRevealed(false)} variant="outline" className="mt-12">{t.hide}</Button>
          <Button onClick={newRound} variant="outline" className="w-full mt-4 h-12 font-bold uppercase tracking-wider">{t.guessedNewRound}</Button>
        </div>
      </div>
    );
  }

  if (showMyRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="text-center animate-scale-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
            {isAdminGuesser ? t.yourTask : `${t.characterOfPlayer} #${game.guesser_index + 1}`}
          </p>
          <h1 className="text-4xl font-bold text-foreground">{isAdminGuesser ? t.whoAmI : guesserPlayer?.character?.name}</h1>
          {!isAdminGuesser && guesserPlayer?.character?.category && <p className="text-muted-foreground text-sm mt-2">{guesserPlayer.character.category}</p>}
          <p className="text-muted-foreground text-sm mt-6">
            {isAdminGuesser ? (
              <>{t.youDontKnowCharacter}<br />{t.askYesNoQuestions}</>
            ) : (
              <>{t.player} #{game.guesser_index + 1} {t.playerDoesntKnowWhoHeIs}<br />{t.helpGuess}</>
            )}
          </p>
          <Button onClick={() => setShowMyRole(false)} variant="outline" className="mt-12">{t.hide}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">{t.whoAmI} {code}</h1>
          <p className="text-muted-foreground text-sm">{views.length} / {game.player_count} {t.playersViewed}</p>
        </div>

        <Button onClick={() => setShowMyRole(true)} className="w-full h-14 text-lg font-bold uppercase tracking-wider mb-6">{t.showMyRole}</Button>

        <div className="bg-secondary p-6 flex items-center justify-center mb-6">
          <QRCodeSVG value={playerUrl} size={200} bgColor="transparent" fgColor="hsl(var(--foreground))" level="M" />
        </div>

        <div className="text-center mb-8"><p className="text-xs text-muted-foreground break-all">{playerUrl}</p></div>

        {!allViewed && <div className="text-center mb-8"><p className="text-sm text-muted-foreground">{t.waitingForPlayers}</p></div>}

        <div className="grid grid-cols-5 gap-2 mb-8">
          {Array.from({ length: game.player_count }).map((_, i) => {
            const hasViewed = views.some((v) => v.player_index === i);
            return (
              <div key={i} className={`aspect-square flex items-center justify-center text-sm font-bold transition-colors ${hasViewed ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                {i + 1}
              </div>
            );
          })}
        </div>

        <Button onClick={newRound} variant="outline" className="w-full h-12 font-bold uppercase tracking-wider">{t.newRound}</Button>
        <Button onClick={() => navigate("/")} variant="ghost" className="w-full mt-4 text-muted-foreground">{t.newGame}</Button>
      </div>
    </div>
  );
};

export default WhoAmIGame;

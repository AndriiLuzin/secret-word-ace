import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

interface MafiaGame {
  id: string;
  code: string;
  player_count: number;
  mafia_count: number;
}

interface MafiaPlayer {
  id: string;
  player_index: number;
  role: string;
  viewed_at: string | null;
}

const MafiaPlayer = () => {
  const { code } = useParams<{ code: string }>();
  const { t } = useLanguage();
  const [game, setGame] = useState<MafiaGame | null>(null);
  const [players, setPlayers] = useState<MafiaPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<MafiaPlayer | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      if (!code) return;

      const { data: gameData, error: gameError } = await supabase.from("mafia_games").select("*").eq("code", code).maybeSingle();

      if (gameError || !gameData) {
        setError(t.gameNotFound);
        setLoading(false);
        return;
      }

      setGame(gameData);

      const { data: playersData } = await supabase.from("mafia_players").select("*").eq("game_id", gameData.id).order("player_index", { ascending: true });

      if (playersData) {
        setPlayers(playersData);
        const unviewedPlayer = playersData.find((p) => !p.viewed_at);
        if (unviewedPlayer) setCurrentPlayer(unviewedPlayer);
      }

      setLoading(false);
    };

    fetchGame();
  }, [code, t]);

  const revealRole = async () => {
    if (!currentPlayer) return;

    const { error } = await supabase.from("mafia_players").update({ viewed_at: new Date().toISOString() }).eq("id", currentPlayer.id);

    if (error) {
      toast.error(t.error);
      return;
    }

    setIsRevealed(true);
  };

  const hideRole = async () => {
    setIsRevealed(false);
    setCurrentPlayer(null);

    if (game) {
      const { data: playersData } = await supabase.from("mafia_players").select("*").eq("game_id", game.id).order("player_index", { ascending: true });

      if (playersData) {
        setPlayers(playersData);
        const unviewedPlayer = playersData.find((p) => !p.viewed_at);
        if (unviewedPlayer) setCurrentPlayer(unviewedPlayer);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">{t.loading}</p></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link to="/" className="text-sm text-foreground hover:underline">{t.toHome}</Link>
      </div>
    );
  }

  if (!game) return null;

  const viewedCount = players.filter((p) => p.viewed_at).length;
  const allViewed = viewedCount >= game.player_count;

  if (allViewed && !currentPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-4">{t.allPlayersGotRoles}</h1>
          <p className="text-muted-foreground text-sm">{t.cityFallsAsleep}</p>
        </div>
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-4">{t.waiting}</h1>
          <p className="text-muted-foreground text-sm">{t.allRolesDistributed}</p>
        </div>
      </div>
    );
  }

  if (isRevealed) {
    const isMafia = currentPlayer.role === "mafia";
    const mafiaPlayers = players.filter((p) => p.role === "mafia");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center animate-scale-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.player} #{currentPlayer.player_index + 1}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.yourRole}</p>
          <h1 className="text-4xl font-bold text-foreground">{isMafia ? t.mafiaRole : t.civilian}</h1>
          <p className="text-muted-foreground text-sm mt-6">{isMafia ? t.mafiaHint : t.civilianHint}</p>

          {isMafia && (
            <div className="mt-6 p-4 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">{t.mafiaTeam}:</p>
              <p className="text-sm font-medium">{mafiaPlayers.map((p) => `${t.player} #${p.player_index + 1}`).join(", ")}</p>
            </div>
          )}

          <Button onClick={hideRole} className="mt-8 w-full">{t.hideAndPass}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="text-center animate-fade-in">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.player} #{currentPlayer.player_index + 1}</p>
        <h1 className="text-3xl font-bold text-foreground mb-8">{t.findOutRole}</h1>
        <Button onClick={revealRole} className="w-full h-14 text-lg font-bold">{t.showRole}</Button>
        <p className="text-xs text-muted-foreground mt-8">{t.pressWhenReady}<br />{t.dontShowScreen}</p>
      </div>
    </div>
  );
};

export default MafiaPlayer;

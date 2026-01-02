import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const MafiaCreate = () => {
  const [playerCount, setPlayerCount] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

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
      toast.error(t.specifyPlayers4to20);
      return;
    }

    setIsCreating(true);

    try {
      const code = generateCode();
      const mafiaCount = getMafiaCount(count);

      const { data: game, error: gameError } = await supabase
        .from("mafia_games")
        .insert({ code, player_count: count, mafia_count: mafiaCount, status: "waiting" })
        .select()
        .single();

      if (gameError) throw gameError;

      const roles: string[] = [];
      for (let i = 0; i < mafiaCount; i++) roles.push("mafia");
      for (let i = 0; i < count - mafiaCount; i++) roles.push("civilian");

      const shuffledRoles = shuffleArray(roles);
      const players = shuffledRoles.map((role, index) => ({ game_id: game.id, player_index: index, role }));

      const { error: playersError } = await supabase.from("mafia_players").insert(players);
      if (playersError) throw playersError;

      navigate(`/mafia/${code}`);
    } catch (error) {
      console.error(error);
      toast.error(t.errorCreatingGame);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </Link>

        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2 text-center">{t.mafia.toUpperCase()}</h1>
        <p className="text-muted-foreground text-sm text-center mb-12">{t.mafiaDesc}</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">{t.playerCount}</label>
            <Input type="number" min={4} max={20} value={playerCount} onChange={(e) => setPlayerCount(e.target.value)} placeholder="4-20" className="text-center text-2xl h-16 font-bold" />
            {playerCount && parseInt(playerCount) >= 4 && (
              <p className="text-xs text-muted-foreground text-center">
                {t.mafiaCount}: {getMafiaCount(parseInt(playerCount))} | {t.civiliansCount}: {parseInt(playerCount) - getMafiaCount(parseInt(playerCount))}
              </p>
            )}
          </div>
          <Button onClick={createGame} disabled={isCreating || !playerCount} className="w-full h-14 text-lg font-bold uppercase tracking-wider">
            {isCreating ? t.creating : t.createGame}
          </Button>
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">{t.mafiaCreateHint1}<br />{t.mafiaCreateHint2}</p>
        </div>
      </div>
    </div>
  );
};

export default MafiaCreate;

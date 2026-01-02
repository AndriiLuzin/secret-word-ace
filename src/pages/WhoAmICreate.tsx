import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Home } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const WhoAmICreate = () => {
  const [playerCount, setPlayerCount] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const createGame = async () => {
    const count = parseInt(playerCount);
    if (isNaN(count) || count < 2 || count > 20) {
      toast.error(t.specifyPlayers2to20);
      return;
    }

    setIsCreating(true);
    try {
      const { data: characters, error: charsError } = await supabase.from("whoami_characters").select("id");
      if (charsError || !characters?.length) throw new Error(t.errorLoadingCharacters);

      const code = generateCode();
      const guesserIndex = Math.floor(Math.random() * count);
      const randomCharacter = characters[Math.floor(Math.random() * characters.length)];

      const { data: game, error: gameError } = await supabase
        .from("whoami_games")
        .insert({ code, player_count: count, guesser_index: guesserIndex, status: "playing" })
        .select().single();
      if (gameError) throw gameError;

      const { error: playerError } = await supabase.from("whoami_players").insert({
        game_id: game.id, player_index: guesserIndex, character_id: randomCharacter.id, guessed: false
      });
      if (playerError) throw playerError;

      navigate(`/whoami/${code}/admin`);
    } catch (error) {
      console.error(error);
      toast.error(t.errorCreatingGame);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4">
        <Home className="w-5 h-5" />
      </Button>
      
      <div className="w-full max-w-sm animate-fade-in">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2 text-center">{t.whoAmI}</h1>
        <p className="text-muted-foreground text-sm text-center mb-12">{t.guessYourCharacter}</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">{t.playerCount}</label>
            <Input type="number" min={2} max={20} value={playerCount} onChange={(e) => setPlayerCount(e.target.value)} placeholder="2-20" className="text-center text-2xl h-16 font-bold" />
          </div>
          <Button onClick={createGame} disabled={isCreating || !playerCount} className="w-full h-14 text-lg font-bold uppercase tracking-wider">
            {isCreating ? t.creating : t.createGame}
          </Button>
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">{t.onePlayerGetsWhoAmI}<br />{t.othersWillSeeCharacter}</p>
        </div>
      </div>
    </div>
  );
};

export default WhoAmICreate;

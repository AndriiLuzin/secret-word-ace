import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

const CrocodileCreate = () => {
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
      const { data: words, error: wordsError } = await supabase.from("crocodile_words").select("id");
      if (wordsError || !words?.length) throw new Error(t.errorLoadingWords);

      const randomWord = words[Math.floor(Math.random() * words.length)];
      const code = generateCode();

      const { error: gameError } = await supabase.from("crocodile_games").insert({
        code, player_count: count, current_word_id: randomWord.id, current_player: 0, showing_player: 0, current_guesser: 1, status: "waiting", round: 1
      });
      if (gameError) throw gameError;

      navigate(`/crocodile/${code}`);
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
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2 text-center">{t.crocodile.toUpperCase()}</h1>
        <p className="text-muted-foreground text-sm text-center mb-12">{t.crocodileDesc}</p>

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
          <p className="text-xs text-muted-foreground">{t.crocodileCreateHint1}<br />{t.crocodileCreateHint2}</p>
        </div>
      </div>
    </div>
  );
};

export default CrocodileCreate;

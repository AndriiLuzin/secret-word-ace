import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

const CASINO_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "🔔", "7️⃣", "💎"];

interface CasinoGame {
  id: string;
  code: string;
  player_count: number;
  status: string;
  guesser_index: number;
  current_round: number;
  current_combination: string[];
  guesses_in_round: number;
}

interface CasinoPlayer {
  id: string;
  player_index: number;
  symbol: string;
}

const CasinoPlayer = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [game, setGame] = useState<CasinoGame | null>(null);
  const [myPlayer, setMyPlayer] = useState<CasinoPlayer | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showCombination, setShowCombination] = useState(false);

  const assignPlayer = useCallback(async (gameData: CasinoGame) => {
    const { data: existingPlayers } = await supabase.from("casino_players").select("*").eq("game_id", gameData.id);
    const usedIndices = existingPlayers?.map((p) => p.player_index) || [];

    if (usedIndices.length >= gameData.player_count) {
      setError(t.allSlotsTaken);
      setIsLoading(false);
      return null;
    }

    let availableIndex = -1;
    for (let i = 0; i < gameData.player_count; i++) {
      if (!usedIndices.includes(i)) { availableIndex = i; break; }
    }

    if (availableIndex === -1) {
      setError(t.allSlotsTaken);
      setIsLoading(false);
      return null;
    }

    const usedSymbols = existingPlayers?.map((p) => p.symbol) || [];
    const availableSymbols = CASINO_SYMBOLS.filter((s) => !usedSymbols.includes(s));
    const randomSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)] || CASINO_SYMBOLS[availableIndex % CASINO_SYMBOLS.length];

    const { data: newPlayer, error: insertError } = await supabase
      .from("casino_players")
      .insert({ game_id: gameData.id, player_index: availableIndex, symbol: randomSymbol })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      setError(t.registrationError);
      setIsLoading(false);
      return null;
    }

    setSearchParams({ p: String(availableIndex) });
    return { index: availableIndex, player: newPlayer };
  }, [setSearchParams, t]);

  const fetchPlayer = useCallback(async (gameData: CasinoGame, idx: number) => {
    setPlayerIndex(idx);
    const { data: player } = await supabase.from("casino_players").select("*").eq("game_id", gameData.id).eq("player_index", idx).maybeSingle();
    if (player) setMyPlayer(player);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!code) return;

    const init = async () => {
      const { data: gameData, error: gameError } = await supabase.from("casino_games").select("*").eq("code", code).maybeSingle();

      if (gameError || !gameData) {
        setError(t.gameNotFound);
        setIsLoading(false);
        return;
      }

      setGame(gameData);
      const existingIndex = searchParams.get("p");

      if (existingIndex !== null) {
        const idx = parseInt(existingIndex);
        await fetchPlayer(gameData, idx);
        return;
      }

      const result = await assignPlayer(gameData);
      if (result) {
        setPlayerIndex(result.index);
        setMyPlayer(result.player);
        setIsLoading(false);
      }
    };

    init();
  }, [code, searchParams, assignPlayer, fetchPlayer, t]);

  useEffect(() => {
    if (!game) return;

    const channel = supabase.channel(`casino-player-${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "casino_games", filter: `id=eq.${game.id}` },
        (payload) => { setGame(payload.new as CasinoGame); }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "casino_players" },
        async () => {
          if (playerIndex === null) return;
          const { data: player } = await supabase.from("casino_players").select("*").eq("game_id", game.id).eq("player_index", playerIndex).maybeSingle();
          if (player) setMyPlayer(player);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game, code, playerIndex]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-muted-foreground animate-pulse">{t.loading}</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <p className="text-foreground font-bold mb-2">{error}</p>
          <p className="text-muted-foreground text-sm">{t.askForLink}</p>
        </div>
      </div>
    );
  }

  if (!game || !myPlayer) return null;

  const isGuesser = game.guesser_index === playerIndex;

  if (game.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="text-center animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.player} #{playerIndex !== null ? playerIndex + 1 : "?"}</p>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t.casino.toUpperCase()}</h1>
          <p className="text-muted-foreground">{t.waitingForGame}</p>
        </div>
      </div>
    );
  }

  if (!isRevealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="text-center animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.player} #{playerIndex !== null ? playerIndex + 1 : "?"}</p>
          <Button onClick={() => setIsRevealed(true)} className="h-20 px-12 text-xl font-bold uppercase tracking-wider">{t.showRole}</Button>
          <p className="text-xs text-muted-foreground mt-6">{t.dontShowScreen}</p>
        </div>
      </div>
    );
  }

  const spinSlot = async () => {
    if (!game) return;
    setIsSpinning(true);
    
    const { data: playersData } = await supabase.from("casino_players").select("*").eq("game_id", game.id);
    const nonGuesserPlayers = (playersData || []).filter((p) => p.player_index !== game.guesser_index);
    const availableSymbols = nonGuesserPlayers.map((p) => p.symbol);
    
    if (availableSymbols.length === 0) {
      toast.error(t.noAvailableSymbols);
      setIsSpinning(false);
      return;
    }
    
    const combinationSize = game.player_count <= 3 ? 1 : game.player_count === 4 ? 2 : 3;
    const combination: string[] = [];
    for (let i = 0; i < combinationSize; i++) {
      const randomSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
      combination.push(randomSymbol);
    }

    await supabase.from("casino_games").update({ current_combination: combination }).eq("id", game.id);
    setGame({ ...game, current_combination: combination });
    
    setTimeout(() => { setIsSpinning(false); setShowCombination(true); }, 1000);
  };

  const handlePlayerConfirmResult = async (correct: boolean) => {
    if (!game) return;

    if (correct) {
      toast.success(t.guessedNewCombination);
    } else {
      const newFailures = game.guesses_in_round + 1;
      
      if (newFailures >= 3) {
        const newGuesserIndex = (game.guesser_index + 1) % game.player_count;
        await supabase.from("casino_games").update({ guesser_index: newGuesserIndex, guesses_in_round: 0, current_combination: [], current_round: game.current_round + 1 }).eq("id", game.id);
        toast.info(t.threeErrorsTurnPasses);
        return;
      } else {
        toast.error(`${t.wrongGuess} ${t.attempt} ${newFailures + 1}/3`);
      }
    }

    const { data: playersData } = await supabase.from("casino_players").select("*").eq("game_id", game.id);
    const nonGuesserPlayers = (playersData || []).filter((p) => p.player_index !== game.guesser_index);
    const availableSymbols = nonGuesserPlayers.map((p) => p.symbol);
    
    const combinationSize = game.player_count <= 3 ? 1 : game.player_count === 4 ? 2 : 3;
    const combination: string[] = [];
    for (let i = 0; i < combinationSize; i++) {
      const randomSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
      combination.push(randomSymbol);
    }

    await supabase.from("casino_games").update({ guesses_in_round: correct ? game.guesses_in_round : game.guesses_in_round + 1, current_combination: combination }).eq("id", game.id);
  };

  if (isGuesser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>

        <div className="w-full max-w-sm text-center animate-scale-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.round} {game.current_round} • {t.attempt} {game.guesses_in_round + 1}/3</p>
          <h1 className="text-2xl font-bold text-foreground mb-8">{t.youAreGuessing}</h1>

          {!showCombination && !isSpinning && !game.current_combination?.length && (
            <Button onClick={spinSlot} className="w-full h-20 text-xl font-bold uppercase tracking-wider">{t.spinRoulette}</Button>
          )}

          {isSpinning && (
            <div className="flex justify-center gap-4 text-6xl animate-pulse"><span>❓</span><span>❓</span><span>❓</span></div>
          )}

          {(showCombination || (game.current_combination && game.current_combination.length > 0)) && (
            <div className="space-y-8">
              <div className="flex justify-center gap-4 text-6xl">
                {game.current_combination?.map((symbol, i) => (
                  <span key={i} className="animate-scale-in" style={{ animationDelay: `${i * 0.1}s` }}>{symbol}</span>
                ))}
              </div>
              <p className="text-muted-foreground">{t.pointToPlayers}<br /><span className="text-xs">{t.playerConfirmsResult}</span></p>
            </div>
          )}

          <Button onClick={() => setIsRevealed(false)} variant="outline" className="mt-8">{t.hide}</Button>
        </div>
      </div>
    );
  }

  const hasCombination = game.current_combination && game.current_combination.length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>

      <div className="text-center animate-scale-in w-full max-w-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.yourSymbol}</p>
        <div className="text-8xl mb-8">{myPlayer.symbol}</div>
        <p className="text-muted-foreground text-sm">{t.player} #{game.guesser_index + 1} {t.youAreGuessing.toLowerCase()}</p>

        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground">{t.round} {game.current_round} • {t.attempt} {game.guesses_in_round + 1}/3</p>
        </div>

        {hasCombination && (
          <div className="mt-8 space-y-4 p-6 bg-primary/10 rounded-xl border border-primary/20">
            <p className="text-foreground font-semibold">{t.playerPointedAtYou}</p>
            <p className="text-sm text-muted-foreground">{t.didHeGuessSymbol}</p>
            <div className="flex gap-4">
              <Button onClick={() => handlePlayerConfirmResult(true)} className="flex-1 h-14 text-lg font-bold bg-green-600 hover:bg-green-700">✓ {t.correct}</Button>
              <Button onClick={() => handlePlayerConfirmResult(false)} variant="destructive" className="flex-1 h-14 text-lg font-bold">✗ {t.incorrect}</Button>
            </div>
          </div>
        )}

        <Button onClick={() => setIsRevealed(false)} variant="outline" className="mt-8">{t.hide}</Button>
      </div>
    </div>
  );
};

export default CasinoPlayer;

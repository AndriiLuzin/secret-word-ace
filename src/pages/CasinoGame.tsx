import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/audio";
import { Home, RefreshCw } from "lucide-react";
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

const CasinoGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [game, setGame] = useState<CasinoGame | null>(null);
  const [players, setPlayers] = useState<CasinoPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCombination, setShowCombination] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const gameUrl = `${window.location.origin}/casino-play/${code}`;
  const adminIndex = game ? game.player_count - 1 : 0;

  const fetchGame = useCallback(async () => {
    if (!code) return;

    const { data: gameData, error } = await supabase.from("casino_games").select("*").eq("code", code).maybeSingle();

    if (error || !gameData) {
      toast.error(t.gameNotFound);
      navigate("/");
      return;
    }

    setGame(gameData);

    const { data: playersData } = await supabase.from("casino_players").select("*").eq("game_id", gameData.id).order("player_index");

    const adminExists = playersData?.some((p) => p.player_index === gameData.player_count - 1);
    
    if (!adminExists) {
      const usedSymbols = playersData?.map((p) => p.symbol) || [];
      const availableSymbols = CASINO_SYMBOLS.filter((s) => !usedSymbols.includes(s));
      const randomSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)] || CASINO_SYMBOLS[0];

      await supabase.from("casino_players").insert({ game_id: gameData.id, player_index: gameData.player_count - 1, symbol: randomSymbol });

      const { data: updatedPlayers } = await supabase.from("casino_players").select("*").eq("game_id", gameData.id).order("player_index");
      setPlayers(updatedPlayers || []);
      if (updatedPlayers && updatedPlayers.length >= gameData.player_count) playNotificationSound();
    } else {
      setPlayers(playersData || []);
    }

    setIsLoading(false);
  }, [code, navigate, t]);

  useEffect(() => {
    fetchGame();

    const channel = supabase.channel(`casino-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "casino_players" },
        async () => {
          if (!game) return;
          const { data: playersData } = await supabase.from("casino_players").select("*").eq("game_id", game.id).order("player_index");
          setPlayers(playersData || []);
          if (playersData && game && playersData.length >= game.player_count) playNotificationSound();
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "casino_games", filter: `code=eq.${code}` },
        (payload) => { setGame(payload.new as CasinoGame); }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [code, fetchGame, game?.id, game?.player_count]);

  const startGame = async () => {
    if (!game) return;
    await supabase.from("casino_games").update({ status: "playing" }).eq("id", game.id);
  };

  const spinSlot = async () => {
    if (!game) return;
    setIsSpinning(true);
    
    const nonGuesserPlayers = players.filter((p) => p.player_index !== game.guesser_index);
    const availableSymbols = nonGuesserPlayers.map((p) => p.symbol);
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

  const handleGuessResult = async (correct: boolean) => {
    if (!game) return;

    if (correct) {
      toast.success(t.guessedNewCombination);
      setShowCombination(false);
    } else {
      const newRound = game.guesses_in_round + 1;
      
      if (newRound >= 3) {
        const newGuesserIndex = (game.guesser_index + 1) % game.player_count;
        await supabase.from("casino_games").update({ guesser_index: newGuesserIndex, guesses_in_round: 0, current_combination: [], current_round: game.current_round + 1 }).eq("id", game.id);
        toast.info(t.turnPassesToNext);
      } else {
        await supabase.from("casino_games").update({ guesses_in_round: newRound, current_combination: [] }).eq("id", game.id);
        toast.error(`${t.wrongGuess} ${t.attempt} ${newRound + 1}/3`);
      }
      setShowCombination(false);
    }
  };

  const startNewRound = async () => {
    if (!game) return;
    const shuffledSymbols = [...CASINO_SYMBOLS].sort(() => Math.random() - 0.5);
    for (const player of players) {
      await supabase.from("casino_players").update({ symbol: shuffledSymbols[player.player_index % shuffledSymbols.length] }).eq("id", player.id);
    }
    await supabase.from("casino_games").update({ current_combination: [], guesses_in_round: 0 }).eq("id", game.id);
    setShowCombination(false);
    toast.success(t.symbolsShuffled);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-muted-foreground">{t.loading}</div></div>;
  }

  if (!game) return null;

  const allPlayersJoined = players.length >= game.player_count;
  const isGuesser = game.guesser_index === adminIndex;

  if (!allPlayersJoined || game.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">{t.casino.toUpperCase()}</h1>
            <p className="text-muted-foreground text-sm">{players.length} / {game.player_count} {t.playersConnected}</p>
          </div>

          <div className="bg-secondary p-6 flex flex-col items-center justify-center mb-6">
            <QRCodeSVG value={gameUrl} size={200} bgColor="transparent" fgColor="hsl(var(--foreground))" level="M" />
            <p className="mt-4 text-sm text-muted-foreground">{t.gameCode}: <span className="font-mono font-bold text-foreground">{code}</span></p>
          </div>

          <div className="text-center mb-8"><p className="text-xs text-muted-foreground break-all">{gameUrl}</p></div>

          {!allPlayersJoined && <div className="text-center mb-8"><p className="text-sm text-muted-foreground">{t.waitingForPlayers}</p></div>}

          <div className="grid grid-cols-5 gap-2 mb-8">
            {Array.from({ length: game.player_count }).map((_, i) => {
              const hasJoined = players.some((p) => p.player_index === i);
              return (
                <div key={i} className={`aspect-square flex items-center justify-center text-sm font-bold transition-colors ${hasJoined ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                  {i + 1}
                </div>
              );
            })}
          </div>

          {allPlayersJoined && game.status === "waiting" && (
            <Button onClick={startGame} className="w-full h-14 text-lg font-bold uppercase tracking-wider">{t.startGame}</Button>
          )}

          <Button onClick={() => navigate("/")} variant="ghost" className="w-full mt-4 text-muted-foreground">{t.newGame}</Button>
        </div>
      </div>
    );
  }

  const mySymbol = players.find((p) => p.player_index === adminIndex)?.symbol;

  if (isGuesser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>

        <div className="w-full max-w-sm animate-fade-in text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.round} {game.current_round} • {t.attempt} {game.guesses_in_round + 1}/3</p>
          <h1 className="text-2xl font-bold text-foreground mb-8">{t.youAreGuessing}</h1>

          {!showCombination && !isSpinning && (
            <Button onClick={spinSlot} className="w-full h-20 text-xl font-bold uppercase tracking-wider">🎰 {t.spin}</Button>
          )}

          {isSpinning && (
            <div className="flex justify-center gap-4 text-6xl animate-pulse"><span>❓</span><span>❓</span><span>❓</span></div>
          )}

          {showCombination && game.current_combination.length > 0 && (
            <div className="space-y-8">
              <div className="flex justify-center gap-4 text-6xl">
                {game.current_combination.map((symbol, i) => (
                  <span key={i} className="animate-scale-in" style={{ animationDelay: `${i * 0.1}s` }}>{symbol}</span>
                ))}
              </div>
              <p className="text-muted-foreground">{t.pointToPlayers}</p>
              <div className="flex gap-4">
                <Button onClick={() => handleGuessResult(true)} className="flex-1 h-14 text-lg font-bold bg-green-600 hover:bg-green-700">✓ {t.correct}</Button>
                <Button onClick={() => handleGuessResult(false)} variant="destructive" className="flex-1 h-14 text-lg font-bold">✗ {t.incorrect}</Button>
              </div>
            </div>
          )}

          <Button onClick={startNewRound} variant="outline" className="w-full mt-8"><RefreshCw className="w-4 h-4 mr-2" />{t.shuffleSymbols}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>

      <div className="text-center animate-fade-in">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.player} #{adminIndex + 1}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.yourSymbol}</p>
        <div className="text-8xl mb-8">{mySymbol}</div>
        <p className="text-muted-foreground text-sm">{t.player} #{game.guesser_index + 1} {t.youAreGuessing.toLowerCase()}</p>
        <div className="mt-8 p-4 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground">{t.round} {game.current_round} • {t.attempt} {game.guesses_in_round + 1}/3</p>
        </div>
      </div>
    </div>
  );
};

export default CasinoGame;

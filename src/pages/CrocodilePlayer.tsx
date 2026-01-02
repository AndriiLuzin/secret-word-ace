import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, Check, X, Timer } from "lucide-react";
import { playNotificationSound } from "@/lib/audio";
import { useLanguage } from "@/lib/i18n";

interface CrocodileGame {
  id: string;
  code: string;
  player_count: number;
  current_player: number;
  current_word_id: string;
  current_guesser: number;
  showing_player: number;
  status: string;
  round: number;
}

const CrocodilePlayer = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [game, setGame] = useState<CrocodileGame | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevGuesserRef = useRef<number | null>(null);

  const isMyTurnToGuess = game && playerIndex !== null && game.current_guesser === playerIndex && game.showing_player !== playerIndex;
  const isShowingWord = game && playerIndex !== null && game.showing_player === playerIndex;

  const assignPlayer = useCallback(async (gameData: CrocodileGame) => {
    const { data: existingViews } = await supabase.from("crocodile_players" as any).select("player_index").eq("game_id", gameData.id);
    const usedIndices = (existingViews as any[])?.map((v) => v.player_index) || [];

    if (usedIndices.length >= gameData.player_count) {
      setError(t.allSlotsTaken);
      setIsLoading(false);
      return null;
    }

    let availableIndex = -1;
    for (let i = 0; i < gameData.player_count - 1; i++) {
      if (!usedIndices.includes(i)) { availableIndex = i; break; }
    }

    if (availableIndex === -1) {
      setError(t.allSlotsTaken);
      setIsLoading(false);
      return null;
    }

    const { error: insertError } = await supabase.from("crocodile_players" as any).insert({ game_id: gameData.id, player_index: availableIndex });
    if (insertError && insertError.code !== "23505") {
      console.error(insertError);
      setError(t.registrationError);
      setIsLoading(false);
      return null;
    }

    setSearchParams({ p: String(availableIndex) });
    return availableIndex;
  }, [setSearchParams, t]);

  const fetchGame = useCallback(async () => {
    if (!code) return null;
    const { data, error } = await supabase.from("crocodile_games").select("*").eq("code", code).maybeSingle();
    if (error || !data) {
      setError(t.gameNotFound);
      setIsLoading(false);
      return null;
    }
    return data as CrocodileGame;
  }, [code, t]);

  useEffect(() => {
    if (!code) return;
    const init = async () => {
      const gameData = await fetchGame();
      if (!gameData) return;
      setGame(gameData);

      const existingIndex = searchParams.get("p");
      if (existingIndex !== null) {
        const idx = parseInt(existingIndex);
        const { data: view } = await supabase.from("crocodile_players" as any).select("player_index").eq("game_id", gameData.id).eq("player_index", idx).maybeSingle();
        if (view) { setPlayerIndex(idx); setIsLoading(false); return; }
      }

      const newIndex = await assignPlayer(gameData);
      if (newIndex !== null) { setPlayerIndex(newIndex); setIsLoading(false); }
    };
    init();
  }, [code, searchParams, assignPlayer, fetchGame]);

  useEffect(() => {
    if (!game) return;

    const channel = supabase.channel(`crocodile-player-${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "crocodile_games", filter: `id=eq.${game.id}` },
        (payload) => {
          const newGame = payload.new as CrocodileGame;
          setGame(newGame);
          if (playerIndex !== null && newGame.current_guesser === playerIndex && newGame.showing_player !== playerIndex && prevGuesserRef.current !== newGame.current_guesser) {
            playNotificationSound();
          }
          prevGuesserRef.current = newGame.current_guesser;
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game, code, playerIndex]);

  useEffect(() => {
    if (!isMyTurnToGuess || !game) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    setTimeLeft(10);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { handleNotGuessed(); return 10; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [isMyTurnToGuess, game?.current_guesser]);

  const handleGuessed = async () => {
    if (!game || playerIndex === null) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const { data: words } = await supabase.from("crocodile_words").select("id");
    if (!words?.length) return;
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const nextShowingPlayer = playerIndex;
    const nextGuesser = (playerIndex + 1) % game.player_count;
    await supabase.from("crocodile_games").update({ showing_player: nextShowingPlayer, current_guesser: nextGuesser, current_word_id: randomWord.id, round: game.round + 1 }).eq("id", game.id);
  };

  const handleNotGuessed = async () => {
    if (!game || playerIndex === null) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    let nextGuesser = (game.current_guesser + 1) % game.player_count;
    if (nextGuesser === game.showing_player) nextGuesser = (nextGuesser + 1) % game.player_count;
    await supabase.from("crocodile_games").update({ current_guesser: nextGuesser }).eq("id", game.id);
  };

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

  if (!game) return null;

  if (game.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="text-center animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.player} #{playerIndex !== null ? playerIndex + 1 : "?"}</p>
          <h2 className="text-2xl font-bold text-foreground mb-4">{t.waitingForOtherPlayers}</h2>
          <p className="text-muted-foreground">{t.gameWillStartSoon}</p>
        </div>
      </div>
    );
  }

  if (isShowingWord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="text-center animate-fade-in">
          <div className="inline-block px-4 py-2 bg-primary/20 border border-primary/40 rounded-lg mb-6 animate-pulse">
            <p className="text-xl font-bold text-primary">{t.youAreShowing}</p>
          </div>
          <p className="text-muted-foreground mb-8">{t.showWordWithGestures}</p>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">{t.currentlyGuessing}:</p>
            <p className="text-xl font-bold text-foreground">{t.player} {game.current_guesser + 1}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isMyTurnToGuess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="mb-8">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${timeLeft <= 3 ? 'bg-destructive/20 text-destructive animate-pulse' : 'bg-muted'}`}>
              <Timer className="w-5 h-5" />
              <span className="text-3xl font-bold">{timeLeft}</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">{t.guessing}</h1>
          <p className="text-muted-foreground mb-8">{t.player} {game.showing_player + 1} {t.playerShowing}</p>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleGuessed} className="h-20 text-xl font-bold bg-green-600 hover:bg-green-700"><Check className="w-6 h-6 mr-2" />{t.guessed}</Button>
            <Button onClick={handleNotGuessed} variant="outline" className="h-20 text-xl font-bold border-destructive text-destructive hover:bg-destructive/10"><X className="w-6 h-6 mr-2" />{t.notGuessed}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
      <div className="text-center animate-fade-in">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.player} #{playerIndex !== null ? playerIndex + 1 : "?"}</p>
        <h2 className="text-2xl font-bold text-foreground mb-4">{t.waitYourTurn}</h2>
        <div className="p-4 bg-muted/50 rounded-lg mb-4">
          <p className="text-sm text-muted-foreground mb-2">{t.player} {game.showing_player + 1} {t.playerShowing}</p>
          <p className="text-lg font-bold text-foreground">{t.currentlyGuessing}: {t.player} {game.current_guesser + 1}</p>
        </div>
        <p className="text-muted-foreground text-sm">{t.watchAndPrepare}</p>
      </div>
    </div>
  );
};

export default CrocodilePlayer;

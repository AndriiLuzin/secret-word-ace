import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Eye, EyeOff, Home, Check, X, Timer } from "lucide-react";
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

interface CrocodileWord {
  id: string;
  word: string;
  category: string;
}

interface PlayerView {
  player_index: number;
}

const CrocodileGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [game, setGame] = useState<CrocodileGame | null>(null);
  const [word, setWord] = useState<CrocodileWord | null>(null);
  const [views, setViews] = useState<PlayerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWord, setShowWord] = useState(false);
  const [allPlayersJoined, setAllPlayersJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevViewsCountRef = useRef<number>(0);
  const prevGuesserRef = useRef<number | null>(null);

  const gameUrl = `${window.location.origin}/crocodile-play/${code}`;
  const adminIndex = game ? game.player_count - 1 : 0;
  const isMyTurnToGuess = game && game.current_guesser === adminIndex && game.showing_player !== adminIndex;
  const isShowingWord = game && game.showing_player === adminIndex;

  const fetchGame = async () => {
    if (!code) return;

    const { data, error } = await supabase.from("crocodile_games").select("*").eq("code", code).maybeSingle();

    if (error || !data) {
      toast.error(t.gameNotFound);
      navigate("/");
      return;
    }

    setGame(data as CrocodileGame);

    if (data.current_word_id) {
      const { data: wordData } = await supabase.from("crocodile_words").select("*").eq("id", data.current_word_id).maybeSingle();
      if (wordData) setWord(wordData);
    }

    return data;
  };

  const fetchViews = async (gameId: string) => {
    const { data: viewsData } = await supabase.from("crocodile_players" as any).select("player_index").eq("game_id", gameId);
    if (viewsData) {
      if (viewsData.length > prevViewsCountRef.current && prevViewsCountRef.current > 0) playNotificationSound();
      prevViewsCountRef.current = viewsData.length;
      setViews(viewsData as unknown as PlayerView[]);
    }
  };

  const registerAdmin = async (gameId: string, playerCount: number) => {
    const adminIdx = playerCount - 1;
    const { data: existing } = await supabase.from("crocodile_players" as any).select("player_index").eq("game_id", gameId).eq("player_index", adminIdx).maybeSingle();
    if (!existing) {
      await supabase.from("crocodile_players" as any).insert({ game_id: gameId, player_index: adminIdx });
    }
  };

  useEffect(() => {
    if (!code) return;
    const initGame = async () => {
      const gameData = await fetchGame();
      if (!gameData) return;
      await registerAdmin(gameData.id, gameData.player_count);
      await fetchViews(gameData.id);
      setLoading(false);
    };
    initGame();
  }, [code]);

  useEffect(() => {
    if (!game) return;
    const interval = setInterval(() => { fetchViews(game.id); }, 2000);
    return () => clearInterval(interval);
  }, [game]);

  useEffect(() => {
    if (game && views.length >= game.player_count) {
      if (!allPlayersJoined) {
        playNotificationSound();
        setAllPlayersJoined(true);
      }
    }
  }, [views, game, allPlayersJoined]);

  useEffect(() => {
    if (!game) return;

    const channel = supabase.channel(`crocodile-admin-${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "crocodile_games", filter: `id=eq.${game.id}` },
        async (payload) => {
          const newGame = payload.new as CrocodileGame;
          setGame(newGame);
          if (newGame.current_guesser === adminIndex && newGame.showing_player !== adminIndex && prevGuesserRef.current !== newGame.current_guesser) {
            playNotificationSound();
          }
          prevGuesserRef.current = newGame.current_guesser;
          if (newGame.current_word_id) {
            const { data: wordData } = await supabase.from("crocodile_words").select("*").eq("id", newGame.current_word_id).maybeSingle();
            if (wordData) { setWord(wordData); setShowWord(false); }
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game, code, adminIndex]);

  useEffect(() => {
    if (!isMyTurnToGuess || !game || game.status !== "playing") {
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
  }, [isMyTurnToGuess, game?.current_guesser, game?.status]);

  const startGame = async () => {
    if (!game) return;
    await supabase.from("crocodile_games").update({ status: "playing", showing_player: 0, current_guesser: 1 }).eq("id", game.id);
    toast.success(t.startGame + "!");
  };

  const handleGuessed = async () => {
    if (!game) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const { data: words } = await supabase.from("crocodile_words").select("id");
    if (!words?.length) return;
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const nextShowingPlayer = adminIndex;
    const nextGuesser = (adminIndex + 1) % game.player_count;
    await supabase.from("crocodile_games").update({ showing_player: nextShowingPlayer, current_guesser: nextGuesser, current_word_id: randomWord.id, round: game.round + 1 }).eq("id", game.id);
    toast.success(t.nowYouShow);
  };

  const handleNotGuessed = async () => {
    if (!game) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    let nextGuesser = (game.current_guesser + 1) % game.player_count;
    if (nextGuesser === game.showing_player) nextGuesser = (nextGuesser + 1) % game.player_count;
    await supabase.from("crocodile_games").update({ current_guesser: nextGuesser }).eq("id", game.id);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">{t.loading}</div></div>;
  }

  if (!game) return null;

  if (!allPlayersJoined || game.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">{t.crocodile.toUpperCase()}</h1>
            <p className="text-muted-foreground text-sm">{views.length} / {game.player_count} {t.playersConnected}</p>
          </div>

          <div className="bg-secondary p-6 flex flex-col items-center justify-center mb-6">
            <QRCodeSVG value={gameUrl} size={200} bgColor="transparent" fgColor="hsl(var(--foreground))" level="M" />
            <p className="mt-4 text-sm text-muted-foreground">{t.gameCode}: <span className="font-mono font-bold text-foreground">{code}</span></p>
          </div>

          <div className="text-center mb-8"><p className="text-xs text-muted-foreground break-all">{gameUrl}</p></div>

          {!allPlayersJoined && <div className="text-center mb-8"><p className="text-sm text-muted-foreground">{t.waitingForPlayers}</p></div>}

          <div className="grid grid-cols-5 gap-2 mb-8">
            {Array.from({ length: game.player_count }).map((_, i) => {
              const hasJoined = views.some((v) => v.player_index === i);
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

  if (isShowingWord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><Home className="w-5 h-5" /></Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.crocodile.toUpperCase()}</h1>
            <div className="w-10" />
          </div>

          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-accent rounded-lg mb-4">
              <span className="text-sm text-muted-foreground">{t.round} </span>
              <span className="text-xl font-bold text-foreground">{game.round}</span>
            </div>
            <div className="inline-block px-4 py-2 bg-primary/20 border border-primary/40 rounded-lg animate-pulse">
              <p className="text-xl font-bold text-primary">{t.youAreShowing}</p>
            </div>
          </div>

          <div className="bg-accent/50 rounded-xl p-8 mb-8">
            {showWord ? (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{word?.category}</p>
                <h3 className="text-4xl font-bold text-foreground">{word?.word}</h3>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">{t.pressToSeeWord}</p>
                <p className="text-xs text-muted-foreground">{t.onlyYouSee}</p>
              </div>
            )}
          </div>

          <Button onClick={() => setShowWord(!showWord)} variant={showWord ? "outline" : "default"} className="w-full h-14 text-lg font-bold mb-4">
            {showWord ? <><EyeOff className="w-5 h-5 mr-2" />{t.hideWord}</> : <><Eye className="w-5 h-5 mr-2" />{t.showWord}</>}
          </Button>

          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">{t.currentlyGuessing}:</p>
            <p className="text-xl font-bold text-foreground">{t.player} {game.current_guesser + 1}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isMyTurnToGuess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><Home className="w-5 h-5" /></Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.crocodile.toUpperCase()}</h1>
            <div className="w-10" />
          </div>

          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${timeLeft <= 3 ? 'bg-destructive/20 text-destructive animate-pulse' : 'bg-muted'}`}>
              <Timer className="w-5 h-5" />
              <span className="text-3xl font-bold">{timeLeft}</span>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-foreground text-center mb-4">{t.guessing}</h2>
          <p className="text-muted-foreground text-center mb-8">{t.player} {game.showing_player + 1} {t.playerShowing}</p>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleGuessed} className="h-20 text-xl font-bold bg-green-600 hover:bg-green-700"><Check className="w-6 h-6 mr-2" />{t.guessed}</Button>
            <Button onClick={handleNotGuessed} variant="outline" className="h-20 text-xl font-bold border-destructive text-destructive hover:bg-destructive/10"><X className="w-6 h-6 mr-2" />{t.notGuessed}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative">
      <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute top-4 left-4"><Home className="w-5 h-5" /></Button>
      <div className="text-center animate-fade-in">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">{t.player} #{adminIndex + 1}</p>
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

export default CrocodileGame;

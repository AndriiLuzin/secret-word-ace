import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Eye, EyeOff, RotateCcw, ArrowRight, Home } from "lucide-react";

interface CrocodileGame {
  id: string;
  code: string;
  player_count: number;
  current_player: number;
  current_word_id: string;
  status: string;
  round: number;
}

interface CrocodileWord {
  id: string;
  word: string;
  category: string;
}

const CrocodileGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<CrocodileGame | null>(null);
  const [word, setWord] = useState<CrocodileWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWord, setShowWord] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fetchGame = async () => {
    if (!code) return;

    const { data, error } = await supabase
      .from("crocodile_games")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error || !data) {
      toast.error("Игра не найдена");
      navigate("/");
      return;
    }

    setGame(data);

    // Fetch current word
    if (data.current_word_id) {
      const { data: wordData } = await supabase
        .from("crocodile_words")
        .select("*")
        .eq("id", data.current_word_id)
        .maybeSingle();

      if (wordData) {
        setWord(wordData);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGame();
  }, [code]);

  const nextWord = async () => {
    if (!game) return;

    // Get new random word
    const { data: words } = await supabase
      .from("crocodile_words")
      .select("id");

    if (!words?.length) return;

    const randomWord = words[Math.floor(Math.random() * words.length)];

    await supabase
      .from("crocodile_games")
      .update({ current_word_id: randomWord.id })
      .eq("id", game.id);

    setShowWord(false);
    fetchGame();
    toast.success("Новое слово!");
  };

  const nextPlayer = async () => {
    if (!game) return;

    const nextPlayerIndex = (game.current_player + 1) % game.player_count;
    
    // Get new random word
    const { data: words } = await supabase
      .from("crocodile_words")
      .select("id");

    if (!words?.length) return;

    const randomWord = words[Math.floor(Math.random() * words.length)];

    await supabase
      .from("crocodile_games")
      .update({
        current_player: nextPlayerIndex,
        current_word_id: randomWord.id,
        round: nextPlayerIndex === 0 ? game.round + 1 : game.round,
      })
      .eq("id", game.id);

    setShowWord(false);
    fetchGame();
    toast.success(`Ход переходит к Игроку ${nextPlayerIndex + 1}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!game) return null;

  const gameUrl = `${window.location.origin}/crocodile/${code}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <Home className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            КРОКОДИЛ
          </h1>
          <div className="w-10" />
        </div>

        {/* Game Info */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-2 bg-accent rounded-lg mb-4">
            <span className="text-sm text-muted-foreground">Раунд </span>
            <span className="text-xl font-bold text-foreground">{game.round}</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Игрок {game.current_player + 1}
          </h2>
          <p className="text-muted-foreground">показывает слово</p>
        </div>

        {/* Word Display */}
        <div className="bg-accent/50 rounded-xl p-8 mb-8">
          {showWord ? (
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {word?.category}
              </p>
              <h3 className="text-4xl font-bold text-foreground">
                {word?.word}
              </h3>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Нажми чтобы увидеть слово
              </p>
              <p className="text-xs text-muted-foreground">
                (Только показывающий смотрит!)
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => setShowWord(!showWord)}
            variant={showWord ? "outline" : "default"}
            className="w-full h-14 text-lg font-bold"
          >
            {showWord ? (
              <>
                <EyeOff className="w-5 h-5 mr-2" />
                Скрыть слово
              </>
            ) : (
              <>
                <Eye className="w-5 h-5 mr-2" />
                Показать слово
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={nextWord}
              variant="outline"
              className="h-12"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Другое слово
            </Button>
            <Button
              onClick={nextPlayer}
              className="h-12"
            >
              Угадали!
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* QR Code Toggle */}
        <div className="mt-8">
          <Button
            variant="ghost"
            onClick={() => setShowQR(!showQR)}
            className="w-full text-muted-foreground"
          >
            {showQR ? "Скрыть QR-код" : "Показать QR-код для друзей"}
          </Button>

          {showQR && (
            <div className="mt-4 flex flex-col items-center p-6 border border-border rounded-lg">
              <QRCodeSVG value={gameUrl} size={160} />
              <p className="mt-4 text-sm text-muted-foreground">
                Код игры: <span className="font-mono font-bold">{code}</span>
              </p>
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="mt-8 p-4 border border-border rounded-lg">
          <h4 className="font-bold text-foreground mb-2">Правила:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Покажи слово жестами или мимикой</li>
            <li>• Нельзя говорить и показывать на предметы</li>
            <li>• Когда угадали — нажми "Угадали!"</li>
            <li>• Ход переходит угадавшему игроку</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CrocodileGame;

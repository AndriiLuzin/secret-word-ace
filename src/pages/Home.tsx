import { Link } from "react-router-dom";
import { Users, Skull, Hand, HelpCircle, Dice5 } from "lucide-react";
import { useLanguage, languageNames, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const Home = () => {
  const { t, language, setLanguage } = useLanguage();

  const games = [
    {
      id: "impostor",
      title: t.impostor,
      description: t.impostorDesc,
      icon: Users,
      path: "/impostor",
      players: "3-20",
    },
    {
      id: "mafia",
      title: t.mafia,
      description: t.mafiaDesc,
      icon: Skull,
      path: "/mafia",
      players: "4-20",
    },
    {
      id: "crocodile",
      title: t.crocodile,
      description: t.crocodileDesc,
      icon: Hand,
      path: "/crocodile",
      players: "2-20",
    },
    {
      id: "whoami",
      title: t.whoami,
      description: t.whoamiDesc,
      icon: HelpCircle,
      path: "/whoami",
      players: "2-20",
    },
    {
      id: "casino",
      title: t.casino,
      description: t.casinoDesc,
      icon: Dice5,
      path: "/casino",
      players: "3-20",
    },
  ];

  const languages: Language[] = ["ru", "en", "kk"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        {/* Language Selector */}
        <div className="flex justify-center gap-2 mb-8">
          {languages.map((lang) => (
            <Button
              key={lang}
              variant={language === lang ? "default" : "outline"}
              size="sm"
              onClick={() => setLanguage(lang)}
              className="min-w-[80px]"
            >
              {languageNames[lang]}
            </Button>
          ))}
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2 text-center">
          {t.games}
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-12">
          {t.chooseGame}
        </p>

        <div className="space-y-4">
          {games.map((game) => (
            <Link
              key={game.id}
              to={game.path}
              className="block p-6 border border-border rounded-lg hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-foreground text-background rounded-lg group-hover:scale-105 transition-transform">
                  <game.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground">
                    {game.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {game.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {game.players} {t.players}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">
            {t.moreGamesSoon}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;

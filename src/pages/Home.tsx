import { Link } from "react-router-dom";
import { Users } from "lucide-react";

const games = [
  {
    id: "impostor",
    title: "Самозванец",
    description: "Найди того, кто не знает слово",
    icon: Users,
    path: "/impostor",
    players: "3-20",
  },
];

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2 text-center">
          ИГРЫ
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-12">
          Выбери игру для компании
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
                  {game.players} игроков
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-muted-foreground">
            Больше игр скоро появится
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;

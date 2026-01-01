import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ImpostorCreate from "./pages/ImpostorCreate";
import GameAdmin from "./pages/GameAdmin";
import PlayerView from "./pages/PlayerView";
import MafiaCreate from "./pages/MafiaCreate";
import MafiaAdmin from "./pages/MafiaAdmin";
import MafiaPlayer from "./pages/MafiaPlayer";
import CrocodileCreate from "./pages/CrocodileCreate";
import CrocodileGame from "./pages/CrocodileGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/impostor" element={<ImpostorCreate />} />
          <Route path="/game/:code" element={<GameAdmin />} />
          <Route path="/play/:code" element={<PlayerView />} />
          <Route path="/mafia" element={<MafiaCreate />} />
          <Route path="/mafia/:code" element={<MafiaAdmin />} />
          <Route path="/mafia-play/:code" element={<MafiaPlayer />} />
          <Route path="/crocodile" element={<CrocodileCreate />} />
          <Route path="/crocodile/:code" element={<CrocodileGame />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

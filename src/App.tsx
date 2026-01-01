import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import FloatingAIChat from "./components/FloatingAIChat";
import PageTransition from "./components/PageTransition";
import Index from "./pages/Index";
import Leaderboard from "./pages/Leaderboard";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import PlayerDetail from "./pages/PlayerDetail";
import MatchDetail from "./pages/MatchDetail";
import Blog from "./pages/Blog";
import Auth from "./pages/Auth";
import Waitlist from "./pages/Waitlist";
import History from "./pages/History";
import MyPredictions from "./pages/MyPredictions";
import MyFollowing from "./pages/MyFollowing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
        <Route path="/models" element={<PageTransition><Models /></PageTransition>} />
        <Route path="/model/:modelId" element={<PageTransition><ModelDetail /></PageTransition>} />
        <Route path="/player/:playerId" element={<PageTransition><PlayerDetail /></PageTransition>} />
        <Route path="/match/:matchId" element={<PageTransition><MatchDetail /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
        <Route path="/history" element={<PageTransition><History /></PageTransition>} />
        <Route path="/my-predictions" element={<PageTransition><MyPredictions /></PageTransition>} />
        <Route path="/my-following" element={<PageTransition><MyFollowing /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/waitlist" element={<PageTransition><Waitlist /></PageTransition>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
            {/* Global Floating AI Chat */}
            <FloatingAIChat />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

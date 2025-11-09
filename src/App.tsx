import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import FloatingAIChat from "./components/FloatingAIChat";
import Index from "./pages/Index";
import Leaderboard from "./pages/Leaderboard";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import MatchDetail from "./pages/MatchDetail";
import Blog from "./pages/Blog";
import Auth from "./pages/Auth";
import Waitlist from "./pages/Waitlist";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/models" element={<Models />} />
            <Route path="/model/:modelId" element={<ModelDetail />} />
            <Route path="/match/:matchId" element={<MatchDetail />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/history" element={<History />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/waitlist" element={<Waitlist />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          {/* Global Floating AI Chat */}
          <FloatingAIChat />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

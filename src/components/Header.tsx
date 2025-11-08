import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import OnlineUsers from "@/components/OnlineUsers";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import boosportLogo from "@/assets/boosport-logo-pixel.png";

const Header = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed Out",
        description: "See you again soon",
      });
      navigate("/");
    }
  };
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="font-pixel text-[10px] sm:text-sm md:text-base text-foreground hover:text-primary transition-colors tracking-wider">
            HUNSOCCER
          </h1>
        </Link>
        
        <nav className="flex items-center gap-1.5 sm:gap-3 md:gap-6">
          <Link to="/" className="font-pixel text-[8px] sm:text-[10px] md:text-xs text-foreground hover:text-primary transition-colors tracking-wider">
            LIVE
          </Link>
          <Link to="/leaderboard" className="font-pixel text-[8px] sm:text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider">
            RANK
          </Link>
          <Link to="/blog" className="font-pixel text-[8px] sm:text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider">
            BLOG
          </Link>
          <Link to="/models" className="font-pixel text-[8px] sm:text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider">
            MODELS
          </Link>
        </nav>
        
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <OnlineUsers />
          <LanguageSwitcher />
          {user ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="inline-flex items-center gap-0.5 sm:gap-1 font-pixel text-[8px] sm:text-[10px] md:text-xs px-1.5 sm:px-2 md:px-3 h-7 sm:h-8"
            >
              <LogOut size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">OUT</span>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/auth")}
              className="inline-flex font-pixel text-[8px] sm:text-[10px] md:text-xs px-1.5 sm:px-2 md:px-3 h-7 sm:h-8"
            >
              LOGIN
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

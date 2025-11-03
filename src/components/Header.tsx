import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, ExternalLink } from "lucide-react";
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
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="font-pixel text-sm md:text-base text-foreground hover:text-primary transition-colors tracking-wider">
            BOOSPORT ARENA
          </h1>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="font-pixel text-xs text-foreground hover:text-primary transition-colors tracking-wider">
            LIVE
          </Link>
          <Link to="/leaderboard" className="font-pixel text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider">
            LEADERBOARD
          </Link>
          <Link to="/blog" className="font-pixel text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider">
            {t('blog').toUpperCase()}
          </Link>
          <Link to="/models" className="font-pixel text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider">
            {t('models_performance').toUpperCase()}
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <OnlineUsers />
          <LanguageSwitcher />
          {user ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="hidden md:inline-flex items-center gap-2 font-pixel text-xs"
            >
              <LogOut size={16} />
              {t('sign_out').toUpperCase()}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/auth")}
              className="hidden md:inline-flex font-pixel text-xs"
            >
              {t('login').toUpperCase()}
            </Button>
          )}
          <Link 
            to="/waitlist" 
            className="hidden md:inline-flex items-center gap-1 text-xs font-pixel text-foreground hover:text-primary transition-colors underline underline-offset-4 tracking-wider"
          >
            {t('join_waitlist').toUpperCase()}
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

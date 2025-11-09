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
  const { t, i18n } = useTranslation();
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
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 safe-area-top">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <h1 className="font-pixel text-[10px] sm:text-base md:text-lg text-foreground hover:text-primary transition-colors tracking-wider leading-tight">
            HUNSOCCER ALPHA
          </h1>
        </Link>
        
        <nav className="flex items-center gap-2 sm:gap-5 md:gap-8 flex-shrink">
          <Link to="/" className={`text-sm sm:text-lg md:text-xl font-bold text-foreground hover:text-primary transition-colors ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''} whitespace-nowrap`}>
            {t('nav_live')}
          </Link>
          <Link to="/leaderboard" className={`text-sm sm:text-lg md:text-xl font-bold text-muted-foreground hover:text-foreground transition-colors ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''} whitespace-nowrap`}>
            {t('nav_rank')}
          </Link>
          <Link to="/history" className={`text-sm sm:text-lg md:text-xl font-bold text-muted-foreground hover:text-foreground transition-colors ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''} whitespace-nowrap hidden sm:inline`}>
            {t('nav_history')}
          </Link>
          <Link to="/blog" className={`text-sm sm:text-lg md:text-xl font-bold text-muted-foreground hover:text-foreground transition-colors ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''} whitespace-nowrap hidden lg:inline`}>
            {t('nav_blog')}
          </Link>
          <Link to="/models" className={`text-sm sm:text-lg md:text-xl font-bold text-muted-foreground hover:text-foreground transition-colors ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''} whitespace-nowrap hidden md:inline`}>
            {t('nav_models')}
          </Link>
        </nav>
        
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
          <OnlineUsers />
          <LanguageSwitcher />
          {user ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className={`inline-flex items-center gap-1 text-xs sm:text-lg px-2 sm:px-4 h-8 sm:h-10 font-bold ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''}`}
            >
              <LogOut size={14} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">OUT</span>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/auth")}
              className={`inline-flex text-xs sm:text-lg px-2 sm:px-4 h-8 sm:h-10 font-bold ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''}`}
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

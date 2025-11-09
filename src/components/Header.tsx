import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import OnlineUsers from "@/components/OnlineUsers";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger, SheetOverlay } from "@/components/ui/sheet";
import { useState } from "react";
import boosportLogo from "@/assets/boosport-logo-pixel.png";

const Header = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-2">
        <Link to="/" className="flex items-center flex-shrink-0 min-w-0">
          <h1 className="font-pixel text-[8px] xs:text-[10px] sm:text-base md:text-lg text-foreground hover:text-primary transition-colors tracking-wider leading-tight truncate">
            <span className="hidden xs:inline">HUNSOCCER ALPHA</span>
            <span className="xs:hidden">HUNSOCCER</span>
          </h1>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-3 md:gap-5 flex-shrink min-w-0">
          <Link to="/" className={`font-bold text-foreground hover:text-primary transition-colors whitespace-nowrap ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm md:text-base' : 'text-base md:text-lg'}`}>
            {t('nav_live')}
          </Link>
          <Link to="/leaderboard" className={`font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm md:text-base' : 'text-base md:text-lg'}`}>
            {t('nav_rank')}
          </Link>
          <Link to="/history" className={`font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm md:text-base' : 'text-base md:text-lg'}`}>
            {t('nav_history')}
          </Link>
          <Link to="/blog" className={`font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap hidden lg:inline ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm md:text-base' : 'text-base md:text-lg'}`}>
            {t('nav_blog')}
          </Link>
          <Link to="/models" className={`font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm md:text-base' : 'text-base md:text-lg'}`}>
            {t('nav_models')}
          </Link>
        </nav>
        
        <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 flex-shrink-0">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="sm:hidden h-7 w-7 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetOverlay className="bg-black/60 backdrop-blur-sm animate-fade-in" />
            <SheetContent side="right" className="w-[280px] sm:w-[400px] animate-slide-in-right">
              <nav className="flex flex-col gap-2 mt-6">
                <Link 
                  to="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-bold text-foreground hover:text-primary transition-colors py-3 px-2 border-b border-border ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                >
                  {t('nav_live')}
                </Link>
                <Link 
                  to="/leaderboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-bold text-muted-foreground hover:text-foreground transition-colors py-3 px-2 border-b border-border ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                >
                  {t('nav_rank')}
                </Link>
                <Link 
                  to="/history" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-bold text-muted-foreground hover:text-foreground transition-colors py-3 px-2 border-b border-border ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                >
                  {t('nav_history')}
                </Link>
                <Link 
                  to="/blog" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-bold text-muted-foreground hover:text-foreground transition-colors py-3 px-2 border-b border-border ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                >
                  {t('nav_blog')}
                </Link>
                <Link 
                  to="/models" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-bold text-muted-foreground hover:text-foreground transition-colors py-3 px-2 border-b border-border ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                >
                  {t('nav_models')}
                </Link>
                
                <div className="mt-8 pt-6 border-t border-border">
                  {user ? (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 h-12 font-bold ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                    >
                      <LogOut size={16} />
                      <span>OUT</span>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => {
                        navigate("/auth");
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full h-12 font-bold ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                    >
                      LOGIN
                    </Button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          
          <LanguageSwitcher />
          
          {/* Desktop Auth Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            {user ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className={`inline-flex items-center gap-1 text-base px-3 h-9 font-bold ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''}`}
              >
                <LogOut size={16} />
                <span>OUT</span>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/auth")}
                className={`inline-flex text-base px-3 h-9 font-bold ${i18n.language === 'en' ? 'font-pixel tracking-wider' : ''}`}
              >
                LOGIN
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

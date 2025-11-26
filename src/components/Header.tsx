import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Sun, Moon } from "lucide-react";
import OnlineUsers from "@/components/OnlineUsers";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger, SheetOverlay } from "@/components/ui/sheet";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserPredictionsDialog } from "@/components/UserPredictionsDialog";
import boosportLogo from "@/assets/boosport-logo-pixel.png";

const Header = () => {
  const { t, i18n } = useTranslation();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const { theme, setTheme } = useTheme();
  const languageClassDesktop = i18n.language === "en" ? "font-pixel tracking-wider text-sm md:text-base" : "text-base md:text-lg";
  const languageClassMobile = i18n.language === "en" ? "font-pixel tracking-wider text-sm" : "text-base";
  const getDesktopNavClass = (isActive: boolean) =>
    `font-bold transition-colors whitespace-nowrap hover:text-primary ${languageClassDesktop} ${
      isActive ? "text-foreground" : "text-muted-foreground"
    }`;
  const getMobileNavClass = (isActive: boolean) =>
    `font-bold transition-colors py-3 px-2 border-b border-border hover:text-primary ${languageClassMobile} ${
      isActive ? "text-foreground" : "text-muted-foreground"
    }`;

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
          <NavLink to="/" className={({ isActive }) => getDesktopNavClass(isActive)}>
            {t('nav_live')}
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => getDesktopNavClass(isActive)}>
            {t('nav_rank')}
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => getDesktopNavClass(isActive)}>
            {t('nav_history')}
          </NavLink>
          <NavLink to="/blog" className={({ isActive }) => `${getDesktopNavClass(isActive)} hidden lg:inline`}>
            {t('nav_blog')}
          </NavLink>
          <NavLink to="/models" className={({ isActive }) => getDesktopNavClass(isActive)}>
            {t('nav_models')}
          </NavLink>
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
                <NavLink 
                  to="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => getMobileNavClass(isActive)}
                >
                  {t('nav_live')}
                </NavLink>
                <NavLink 
                  to="/leaderboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => getMobileNavClass(isActive)}
                >
                  {t('nav_rank')}
                </NavLink>
                <NavLink 
                  to="/history" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => getMobileNavClass(isActive)}
                >
                  {t('nav_history')}
                </NavLink>
                <NavLink 
                  to="/blog" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => getMobileNavClass(isActive)}
                >
                  {t('nav_blog')}
                </NavLink>
                <NavLink 
                  to="/models" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => getMobileNavClass(isActive)}
                >
                  {t('nav_models')}
                </NavLink>
                
                <div className="mt-8 pt-6 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 justify-between">
                    <span className="text-sm text-muted-foreground">{theme === "dark" ? t('dark_mode') || "夜间模式" : t('light_mode') || "日间模式"}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="h-9 w-9"
                    >
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                        <Avatar 
                          className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => {
                            setShowPredictions(true);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.display_name || 'User'} />
                          <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                            {userProfile?.display_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {userProfile?.display_name || 'User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
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
                    </>
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
          
          <OnlineUsers />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hidden sm:flex h-8 w-8"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          
          <LanguageSwitcher />
          
          {/* Desktop Auth Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            {user ? (
              <div className="flex items-center gap-2">
                <Avatar 
                  className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all" 
                  onClick={() => setShowPredictions(true)}
                >
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.display_name || 'User'} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {userProfile?.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                  {userProfile?.display_name || 'User'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="h-8 w-8 p-0"
                >
                  <LogOut size={16} />
                </Button>
              </div>
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

      {user && (
        <UserPredictionsDialog 
          open={showPredictions} 
          onOpenChange={setShowPredictions}
          userId={user.id}
        />
      )}
    </header>
  );
};

export default Header;

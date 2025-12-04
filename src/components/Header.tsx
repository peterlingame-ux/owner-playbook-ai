import { Link, NavLink, useNavigate } from "react-router-dom";
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
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <h1 className="font-pixel text-[10px] xs:text-xs sm:text-base md:text-lg text-foreground hover:text-primary transition-colors tracking-wider leading-tight">
              <span className="hidden xs:inline">HUNSOCCER ALPHA</span>
              <span className="xs:hidden">HUNSOCCER</span>
            </h1>
          </Link>
          
          {/* Center: Platform Introduction */}
          <nav className="hidden md:flex items-center flex-1 justify-center">
            <NavLink 
              to="/blog" 
              className={({ isActive }) => `${getDesktopNavClass(isActive)} text-lg font-bold`}
            >
              {t('nav_blog')}
            </NavLink>
          </nav>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 flex-shrink-0">
            {/* Mobile Menu - 仅用于设置和账户信息 */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden h-7 w-7 p-0"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetOverlay className="bg-black/60 backdrop-blur-sm animate-fade-in" />
              <SheetContent side="right" className="w-[280px] sm:w-[400px] animate-slide-in-right">
                <nav className="flex flex-col gap-2 mt-6">
                  <div className="space-y-3">
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

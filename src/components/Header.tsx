import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
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

import { motion } from "framer-motion";

const Header = () => {
  const { t, i18n } = useTranslation();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/", label: t('nav_live') },
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
    { to: "/waitlist", label: t('nav_prize') },
  ];

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
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 safe-area-top w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <h1 className="font-pixel text-[10px] xs:text-xs sm:text-base md:text-lg text-foreground hover:text-primary transition-colors tracking-wider leading-tight">
              <span className="hidden xs:inline">HUNSOCCER ALPHA</span>
              <span className="xs:hidden">HUNSOCCER</span>
            </h1>
          </Link>
          
          {/* Center: Navigation - Modern Glassmorphism Style */}
          <nav className="hidden md:flex items-center bg-white/[0.04] backdrop-blur-xl rounded-2xl p-1.5 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {/* Top glow effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" />
            
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative"
              >
                {({ isActive }) => (
                  <motion.div
                    className={`relative flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 text-sm font-medium
                      ${isActive 
                        ? 'text-white' 
                        : 'text-white/50 hover:text-white/80'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Active background pill with animation */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavTab"
                        className="absolute inset-0 bg-white/[0.12] rounded-xl border border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    
                    {/* Label */}
                    <span className={`relative z-10 whitespace-nowrap ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>
                      {item.label}
                    </span>
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 flex-shrink-0">
            {/* Mobile Menu */}
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
                  {/* Mobile Navigation Links */}
                  <div className="space-y-1 mb-4">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-3 rounded-full text-base font-medium transition-all duration-300
                          ${isActive 
                            ? 'bg-[#2a2a2a] text-white' 
                            : 'text-[#888888] hover:text-foreground hover:bg-accent/30'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
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
                          <span>{t('auth.logout')}</span>
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="lg" 
                        onClick={() => {
                          navigate("/auth");
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full h-12 font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 ${i18n.language === 'en' ? 'font-pixel tracking-wider text-sm' : 'text-base'}`}
                      >
                        {t('auth.login')}
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
                  size="sm" 
                  onClick={() => navigate("/auth")}
                    className={`bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground px-5 h-9 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 ${i18n.language === 'en' ? 'font-pixel tracking-wider' : 'text-base'}`}
                  >
                    {t('auth.login')}
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

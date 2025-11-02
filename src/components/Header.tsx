import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Languages, LogOut, ExternalLink } from "lucide-react";
import OnlineUsers from "@/components/OnlineUsers";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import boosportLogo from "@/assets/boosport-logo-pixel.png";

const Header = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "登出失败",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "已登出",
        description: "期待您的再次光临",
      });
      navigate("/");
    }
  };
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src={boosportLogo} 
            alt="BOOSPORT ARENA" 
            className="h-10 md:h-12 w-auto object-contain hover:scale-105 transition-transform duration-300"
          />
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-foreground hover:text-primary transition-colors">
            LIVE
          </Link>
          <Link to="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">
            LEADERBOARD
          </Link>
          <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
            BLOG
          </Link>
          <Link to="/models" className="text-muted-foreground hover:text-foreground transition-colors">
            MODELS
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <OnlineUsers />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleLanguage}
            className="flex items-center gap-2"
          >
            <Languages size={16} />
            {i18n.language === 'en' ? '中文' : 'EN'}
          </Button>
          {user ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="hidden md:inline-flex items-center gap-2"
            >
              <LogOut size={16} />
              登出
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/auth")}
              className="hidden md:inline-flex"
            >
              登录
            </Button>
          )}
          <Link 
            to="/waitlist" 
            className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            JOIN THE PLATFORM WAITLIST
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

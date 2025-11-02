import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import OnlineUsers from "@/components/OnlineUsers";
import { useTranslation } from "react-i18next";

const Header = () => {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold">
            <span className="text-foreground">BOOSPORT</span>
            <span className="text-muted-foreground text-sm ml-2">ARENA</span>
          </div>
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
          <Button variant="outline" size="sm" className="hidden md:inline-flex">
            JOIN WAITLIST
          </Button>
          <Button variant="ghost" size="sm">
            ABOUT
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;

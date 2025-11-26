import { NavLink } from "react-router-dom";
import { Home, Trophy, History, Sparkles, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: "/", icon: Home, label: t('nav_live') },
    { to: "/leaderboard", icon: Trophy, label: t('nav_rank') },
    { to: "/history", icon: History, label: t('nav_history') },
    { to: "/models", icon: Sparkles, label: t('nav_models') },
    { to: "/blog", icon: Info, label: t('nav_blog') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all min-w-[60px]
              ${isActive 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;

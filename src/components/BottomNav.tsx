import { NavLink } from "react-router-dom";
import { Home, Trophy, History, Sparkles, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: "/leaderboard", icon: Trophy, label: t('nav_rank') },
    { to: "/", icon: Home, label: t('nav_live') },
    { to: "/history", icon: History, label: t('nav_history') },
    { to: "/models", icon: Sparkles, label: t('nav_models') },
    { to: "/my-predictions", icon: Target, label: t('nav_personal_center') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a]/98 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
      <div className="flex items-center justify-around px-0.5 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1.5 px-2 sm:px-4 rounded-lg transition-all duration-300 min-w-0
              ${isActive 
                ? 'bg-[#2a2a2a] text-white shadow-lg' 
                : 'text-[#888888] hover:text-[#aaaaaa]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={`h-4 w-4 sm:h-[18px] sm:w-[18px] transition-all duration-200 ${isActive ? 'text-white' : ''}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[9px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 truncate max-w-[50px] sm:max-w-none
                  ${isActive ? 'text-white' : ''}`}>
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

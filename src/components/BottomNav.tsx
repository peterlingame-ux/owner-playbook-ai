import { NavLink } from "react-router-dom";
import { Home, Trophy, History, Sparkles, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: "/", icon: Home, label: t('nav_live') },
    { to: "/leaderboard", icon: Trophy, label: t('nav_rank') },
    { to: "/history", icon: History, label: t('nav_history') },
    { to: "/models", icon: Sparkles, label: t('nav_models') },
    { to: "/my-predictions", icon: Target, label: "我的" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a]/98 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-2.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 py-2.5 px-4 rounded-full transition-all duration-300 min-w-fit
              ${isActive 
                ? 'bg-[#2a2a2a] text-white shadow-lg' 
                : 'text-[#888888] hover:text-[#aaaaaa]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={`h-[18px] w-[18px] transition-all duration-200 ${isActive ? 'text-white' : ''}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-xs font-medium whitespace-nowrap transition-all duration-200
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

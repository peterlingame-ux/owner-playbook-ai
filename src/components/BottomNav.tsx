import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Trophy, Clock, Bot, User } from "lucide-react";

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank'), icon: Trophy },
    { to: "/history", label: t('nav_history'), icon: Clock },
    { to: "/", label: t('nav_live'), icon: Home, isCenter: true },
    { to: "/models", label: t('nav_models'), icon: Bot },
    { to: "/my-predictions", label: t('nav_personal_center'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/98 via-black/90 to-black/70 backdrop-blur-xl" />
      
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      <div className="relative flex items-center justify-around px-1 py-1 pb-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex-1 flex justify-center touch-manipulation"
            >
              <div
                className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl min-w-[60px] min-h-[52px]
                  active:scale-90 transition-transform duration-100
                  ${item.isCenter ? 'mt-[-6px]' : ''}`}
              >
                {/* Center button special styling */}
                {item.isCenter && (
                  <div
                    className={`absolute inset-0 rounded-2xl ${
                      isActive 
                        ? 'bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
                        : 'bg-gradient-to-br from-cyan-600/80 via-blue-600/80 to-purple-600/80'
                    }`}
                  />
                )}
                
                {/* Active background for non-center items */}
                {isActive && !item.isCenter && (
                  <div className="absolute inset-0 rounded-2xl bg-white/10" />
                )}
                
                {/* Icon */}
                <div className="relative z-10">
                  <Icon 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      item.isCenter 
                        ? 'text-white' 
                        : isActive 
                          ? 'text-cyan-400' 
                          : 'text-white/50'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                
                {/* Label */}
                <span 
                  className={`relative z-10 text-[10px] font-medium mt-1 whitespace-nowrap transition-colors duration-200
                    ${item.isCenter 
                      ? 'text-white' 
                      : isActive 
                        ? 'text-cyan-400 font-semibold' 
                        : 'text-white/50'
                    }`}
                >
                  {item.label}
                </span>
                
                {/* Active indicator dot */}
                {isActive && !item.isCenter && (
                  <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/history", label: t('nav_history') },
    { to: "/", label: t('nav_live'), isCenter: true },
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/98 via-black/90 to-black/70 backdrop-blur-xl" />
      
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      <div className="relative flex items-center justify-around px-1 py-3 pb-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex-1 flex justify-center touch-manipulation min-w-0"
            >
              <div
                className={`relative flex items-center justify-center py-2 px-2 sm:px-4 rounded-xl min-h-[40px]
                  active:scale-95 transition-all duration-150`}
              >
                {/* Active glow background */}
                {isActive && (
                  <div 
                    className={`absolute inset-0 rounded-xl ${
                      item.isCenter 
                        ? 'bg-gradient-to-br from-cyan-500/30 via-blue-500/30 to-purple-500/30' 
                        : 'bg-cyan-500/15'
                    }`}
                  />
                )}
                
                {/* Label with glow effect when active - auto-shrink for long text */}
                <span 
                  className={`relative z-10 text-[10px] xs:text-xs sm:text-sm font-medium transition-all duration-200 text-center leading-tight truncate max-w-full
                    ${isActive 
                      ? item.isCenter
                        ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                        : 'text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                      : 'text-white/40'
                    }`}
                >
                  {item.label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

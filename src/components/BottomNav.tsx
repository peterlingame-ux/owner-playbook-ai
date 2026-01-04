import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/", label: t('nav_live'), isCenter: true },
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Solid dark background matching AI prediction cards */}
      <div className="absolute inset-0 bg-[#1a1f2e] border-t border-white/10" />
      
      <div className="relative flex items-stretch justify-around px-1 py-3 pb-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex-1 flex justify-center touch-manipulation min-w-0 overflow-hidden"
            >
              <div
                className="relative flex items-center justify-center py-2 px-1 rounded-xl min-h-[40px] w-full
                  active:scale-95 transition-all duration-150"
              >
                {/* Active gradient background - AI预测风格 */}
                {isActive && (
                  <div 
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#4a5568] via-[#3d4a5c] to-[#2d3748] shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(79, 70, 229, 0.5) 50%, rgba(67, 56, 202, 0.6) 100%)',
                    }}
                  />
                )}
                
                {/* Label with glow effect when active - auto-shrink for long text */}
                <span 
                  className={`relative z-10 text-[9px] xs:text-[10px] sm:text-xs font-medium transition-all duration-200 text-center leading-tight line-clamp-2 break-words px-0.5
                    ${isActive 
                      ? 'text-white font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]' 
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

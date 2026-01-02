import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { UserPredictionsDialog } from "@/components/UserPredictionsDialog";
import { toast } from "sonner";

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [autoPredict, setAutoPredict] = useState(true);
  const [showPredictionDialog, setShowPredictionDialog] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/", label: t('nav_live'), isCenter: true },
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
  ];

  const handleToggleAutoPredict = () => {
    if (autoPredict) {
      // Turning OFF - show manual prediction dialog or demo
      setAutoPredict(false);
      if (user) {
        setShowPredictionDialog(true);
      } else {
        // Demo mode for non-logged in users
        setDemoMode(true);
        toast.info(t('auto_predict_disabled'));
      }
    } else {
      // Turning ON - enable auto predict
      setAutoPredict(true);
      setDemoMode(false);
      toast.success(t('auto_predict_enabled'));
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/98 via-black/90 to-black/70 backdrop-blur-xl" />
        
        {/* Top border glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        <div className="relative flex items-center justify-around px-2 py-3 pb-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex-1 flex justify-center touch-manipulation min-w-0"
              >
                <div
                  className="relative flex items-center justify-center py-2 px-1 rounded-xl min-h-[40px] w-full
                    active:scale-95 transition-all duration-150"
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
                  
                  {/* Label with glow effect when active */}
                  <span 
                    className={`relative z-10 text-[9px] xs:text-[10px] sm:text-xs font-medium transition-all duration-200 text-center leading-tight line-clamp-2 break-words px-0.5
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

          {/* ON/OFF Toggle Button - separate from nav items */}
          <button
            onClick={handleToggleAutoPredict}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
              transition-all duration-300 active:scale-90
              ${autoPredict 
                ? 'bg-gradient-to-br from-cyan-500/30 via-blue-500/30 to-purple-500/30 shadow-[0_0_12px_rgba(34,211,238,0.4)]' 
                : 'bg-gradient-to-br from-gray-600/50 to-gray-700/50'
              }`}
          >
            <span className={`text-[10px] font-bold leading-none
              ${autoPredict ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'text-gray-400'}`}>
              {autoPredict ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </nav>

      {/* Manual Prediction Dialog */}
      {user && (
        <UserPredictionsDialog
          open={showPredictionDialog}
          onOpenChange={setShowPredictionDialog}
          userId={user.id}
        />
      )}

      {/* Demo Mode Indicator for non-logged users */}
      {demoMode && !user && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/90 to-amber-500/90 text-white text-xs font-medium shadow-lg animate-pulse">
          {t('please_login_first')} - Demo Mode
        </div>
      )}
    </>
  );
};

export default BottomNav;

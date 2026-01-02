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

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/", label: t('nav_live'), isCenter: true },
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
  ];

  const handleToggleAutoPredict = () => {
    if (autoPredict) {
      // Turning OFF - show manual prediction dialog
      if (!user) {
        toast.error(t('please_login_first'));
        return;
      }
      setAutoPredict(false);
      setShowPredictionDialog(true);
    } else {
      // Turning ON - enable auto predict
      setAutoPredict(true);
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
        
        <div className="relative flex items-stretch justify-around px-1 py-3 pb-4">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.to;
            
            return (
              <div key={item.to} className="relative flex-1 flex justify-center items-center min-w-0 overflow-hidden">
                <NavLink
                  to={item.to}
                  className="flex-1 flex justify-center touch-manipulation"
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
                    
                    {/* Label with glow effect when active - auto-shrink for long text */}
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

                {/* ON/OFF Toggle Button - placed after center item (AI预测) */}
                {item.isCenter && (
                  <button
                    onClick={handleToggleAutoPredict}
                    className={`ml-1 flex-shrink-0 w-10 h-10 rounded-full flex flex-col items-center justify-center
                      transition-all duration-300 active:scale-90 border-2
                      ${autoPredict 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]' 
                        : 'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.3)]'
                      }`}
                  >
                    <span className={`text-[8px] font-bold leading-none
                      ${autoPredict ? 'text-white' : 'text-gray-300'}`}>
                      {autoPredict ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
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
    </>
  );
};

export default BottomNav;

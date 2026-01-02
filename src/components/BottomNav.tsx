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

  // Split nav items into left and right groups
  const leftItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/", label: t('nav_live') },
  ];
  
  const rightItems = [
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
  ];

  const handleToggleAutoPredict = () => {
    if (autoPredict) {
      // Turning OFF - show manual prediction dialog
      setAutoPredict(false);
      if (user) {
        setShowPredictionDialog(true);
      } else {
        // For demo, still show the dialog effect
        setShowPredictionDialog(true);
      }
      toast.info(t('auto_predict_disabled'));
    } else {
      // Turning ON - enable auto predict
      setAutoPredict(true);
      toast.success(t('auto_predict_enabled'));
    }
  };

  const renderNavItem = (item: { to: string; label: string }) => {
    const isActive = location.pathname === item.to;
    const isLive = item.to === "/";
    
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
          {isActive && (
            <div 
              className={`absolute inset-0 rounded-xl ${
                isLive 
                  ? 'bg-gradient-to-br from-cyan-500/30 via-blue-500/30 to-purple-500/30' 
                  : 'bg-cyan-500/15'
              }`}
            />
          )}
          
          <span 
            className={`relative z-10 text-[9px] xs:text-[10px] sm:text-xs font-medium transition-all duration-200 text-center leading-tight line-clamp-2 break-words px-0.5
              ${isActive 
                ? isLive
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
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/98 via-black/90 to-black/70 backdrop-blur-xl" />
        
        {/* Top border glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        <div className="relative flex items-center justify-between px-2 py-3 pb-4">
          {/* Left nav items */}
          <div className="flex items-center flex-1">
            {leftItems.map(renderNavItem)}
          </div>

          {/* Center ON/OFF Toggle Button with floating effect */}
          <div className="relative flex-shrink-0 mx-2 -mt-6">
            {/* Outer glow ring animation */}
            <div 
              className={`absolute inset-0 rounded-full transition-all duration-500
                ${autoPredict 
                  ? 'animate-pulse bg-gradient-to-br from-cyan-400/40 via-blue-400/40 to-purple-400/40 scale-125 blur-md' 
                  : 'bg-gray-500/20 scale-110 blur-sm'
                }`}
            />
            
            {/* Secondary glow layer */}
            {autoPredict && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 scale-150 blur-xl animate-[pulse_2s_ease-in-out_infinite]" />
            )}
            
            {/* Main button */}
            <button
              onClick={handleToggleAutoPredict}
              className={`relative w-14 h-14 rounded-full flex items-center justify-center
                transition-all duration-300 active:scale-90
                ${autoPredict 
                  ? 'bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 shadow-[0_4px_20px_rgba(34,211,238,0.7),0_0_40px_rgba(139,92,246,0.5)]' 
                  : 'bg-gradient-to-br from-gray-500 to-gray-600 shadow-[0_4px_15px_rgba(107,114,128,0.5)]'
                }`}
            >
              {/* Inner highlight */}
              <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
              
              <span className={`relative text-sm font-bold leading-none
                ${autoPredict ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]' : 'text-gray-300'}`}>
                {autoPredict ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Right nav items */}
          <div className="flex items-center flex-1">
            {rightItems.map(renderNavItem)}
          </div>
        </div>
      </nav>

      {/* Manual Prediction Dialog - works for both logged in and demo */}
      <UserPredictionsDialog
        open={showPredictionDialog}
        onOpenChange={setShowPredictionDialog}
        userId={user?.id || "demo-user"}
      />
    </>
  );
};

export default BottomNav;

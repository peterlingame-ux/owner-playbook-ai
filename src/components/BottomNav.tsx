import { NavLink } from "react-router-dom";
import { Home, Trophy, History, Sparkles, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/60 backdrop-blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.05] to-white/[0.02]" />
      
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="relative flex items-center justify-center px-3 py-2.5">
        <div className="flex items-center gap-1 sm:gap-2 bg-white/[0.04] backdrop-blur-xl rounded-2xl p-1.5 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative"
            >
              {({ isActive }) => (
                <motion.div
                  className={`relative flex items-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 rounded-xl transition-all duration-300 min-w-0
                    ${isActive 
                      ? 'text-white' 
                      : 'text-white/40 hover:text-white/70'
                    }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Active background pill with dynamic glow */}
                  {isActive && (
                    <>
                      {/* Animated glow layer */}
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-md"
                        animate={{
                          opacity: [0.4, 0.8, 0.4],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      {/* Main pill */}
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-white/[0.15] via-white/[0.08] to-white/[0.15] rounded-xl border border-white/20 shadow-[0_0_25px_rgba(100,200,255,0.3)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    </>
                  )}
                  
                  {/* Icon with glow effect */}
                  <div className="relative z-10">
                    <item.icon 
                      className={`h-4 w-4 sm:h-[18px] sm:w-[18px] transition-all duration-300 ${
                        isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  </div>
                  
                  {/* Label - shown on active or on larger screens */}
                  <span className={`relative z-10 text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300
                    ${isActive ? 'opacity-100 max-w-[60px] sm:max-w-none' : 'hidden sm:block opacity-70'}`}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;

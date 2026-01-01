import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const BottomNav = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/", label: t('nav_live') },
    { to: "/history", label: t('nav_history') },
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/60 backdrop-blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.05] to-white/[0.02]" />
      
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="relative flex items-center justify-center px-2 py-2">
        <div className="flex items-center gap-0.5 bg-white/[0.04] backdrop-blur-xl rounded-2xl p-1 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative"
            >
              {({ isActive }) => (
                <motion.div
                  className={`relative flex items-center justify-center py-2 px-3 sm:px-4 rounded-xl transition-all duration-300
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
                  
                  {/* Label only - no icons */}
                  <span className={`relative z-10 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300
                    ${isActive ? 'opacity-100' : 'opacity-70'}`}>
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

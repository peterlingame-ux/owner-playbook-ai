import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.nav 
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/98 via-black/90 to-black/70 backdrop-blur-xl" />
      
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      <div className="relative flex items-center justify-around px-2 py-1.5 pb-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex-1 flex justify-center"
            >
              <motion.div
                className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl min-w-[56px]
                  ${item.isCenter ? 'mt-[-8px]' : ''}`}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Center button special styling */}
                {item.isCenter && (
                  <motion.div
                    className={`absolute inset-0 rounded-2xl ${
                      isActive 
                        ? 'bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500' 
                        : 'bg-gradient-to-br from-cyan-600/80 via-blue-600/80 to-purple-600/80'
                    }`}
                    animate={isActive ? {
                      boxShadow: [
                        "0 0 20px rgba(59, 130, 246, 0.5)",
                        "0 0 30px rgba(59, 130, 246, 0.7)",
                        "0 0 20px rgba(59, 130, 246, 0.5)"
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                
                {/* Active background for non-center items */}
                <AnimatePresence>
                  {isActive && !item.isCenter && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-white/10"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </AnimatePresence>
                
                {/* Icon with bounce animation */}
                <motion.div
                  className="relative z-10"
                  animate={isActive ? { 
                    y: [0, -3, 0],
                  } : { y: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    ease: "easeOut",
                  }}
                >
                  <Icon 
                    className={`h-5 w-5 transition-all duration-300 ${
                      item.isCenter 
                        ? 'text-white' 
                        : isActive 
                          ? 'text-cyan-400' 
                          : 'text-white/40'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>
                
                {/* Label with fade animation */}
                <motion.span 
                  className={`relative z-10 text-[10px] font-medium mt-0.5 whitespace-nowrap transition-all duration-300
                    ${item.isCenter 
                      ? 'text-white' 
                      : isActive 
                        ? 'text-cyan-400' 
                        : 'text-white/40'
                    }`}
                  animate={isActive ? { 
                    scale: 1.05,
                    fontWeight: 600
                  } : { 
                    scale: 1,
                    fontWeight: 500
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
                
                {/* Active indicator dot */}
                <AnimatePresence>
                  {isActive && !item.isCenter && (
                    <motion.div
                      className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-cyan-400"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNav;

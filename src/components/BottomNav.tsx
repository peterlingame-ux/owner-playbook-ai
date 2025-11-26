import { NavLink } from "react-router-dom";
import { Home, Trophy, History, Sparkles, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const BottomNav = () => {
  const { t } = useTranslation();
  const [activeRipple, setActiveRipple] = useState<string | null>(null);

  const navItems = [
    { to: "/", icon: Home, label: t('nav_live') },
    { to: "/leaderboard", icon: Trophy, label: t('nav_rank') },
    { to: "/history", icon: History, label: t('nav_history') },
    { to: "/models", icon: Sparkles, label: t('nav_models') },
    { to: "/blog", icon: Info, label: t('nav_blog') },
  ];

  // 触觉反馈函数
  const triggerHaptic = () => {
    // 检查是否支持触觉反馈
    if ('vibrate' in navigator) {
      // 轻微震动反馈
      navigator.vibrate(10);
    }
    
    // iOS设备的触觉反馈（Safari支持）
    if (window.navigator && (window.navigator as any).vibrate) {
      (window.navigator as any).vibrate(10);
    }
  };

  const handleClick = (to: string) => {
    triggerHaptic();
    setActiveRipple(to);
    setTimeout(() => setActiveRipple(null), 600);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => handleClick(item.to)}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all min-w-[60px] overflow-hidden
              ${isActive 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }
              active:scale-95`
            }
          >
            {({ isActive }) => (
              <>
                {/* 波纹效果 */}
                {activeRipple === item.to && (
                  <span className="absolute inset-0 animate-ping bg-primary/30 rounded-lg" />
                )}
                
                {/* 图标容器 - 带弹跳动画 */}
                <span className={`
                  transition-all duration-300
                  ${isActive ? 'animate-bounce-subtle' : ''}
                `}>
                  <item.icon 
                    className={`
                      h-5 w-5 transition-all duration-200
                      ${isActive ? 'scale-110' : ''}
                    `} 
                  />
                </span>
                
                {/* 文字标签 */}
                <span className={`
                  text-[10px] font-medium transition-all duration-200
                  ${isActive ? 'font-bold scale-105' : ''}
                `}>
                  {item.label}
                </span>

                {/* 激活指示器 */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full animate-slide-down" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;


import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import OnlineUsers from "@/components/OnlineUsers";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserPredictionsDialog } from "@/components/UserPredictionsDialog";
import VipSubscriptionDialog from "@/components/VipSubscriptionDialog";
import { MembershipCountdown } from "@/components/MembershipCountdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

const formatExpiryDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
};

const Header = () => {
  const { t, i18n } = useTranslation();
  const { user, userProfile, userVip, refreshUserProfile, refreshUserVip } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPredictions, setShowPredictions] = useState(false);
  const [showVipDialog, setShowVipDialog] = useState(false);
  
  // 确保头像显示最新选择的图片（监听 userProfile 变化）
  useEffect(() => {
    // 当 userProfile 更新时，确保头像能正确显示
    // 这里可以添加额外的逻辑，比如强制刷新头像图片
  }, [userProfile?.avatar_url]);

  const navItems = [
    { to: "/leaderboard", label: t('nav_rank') },
    { to: "/", label: t('nav_live') },
    { to: "/models", label: t('nav_models') },
    { to: "/my-predictions", label: t('nav_personal_center') },
  ];

  const handleSignOut = async () => {
    try {
      // 先尝试全局登出（清除服务器端 session）
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      // 如果错误是 session_not_found，说明 session 已经不存在了，可以视为登出成功
      if (error) {
        const isSessionNotFound = 
          error.message?.includes('session_not_found') || 
          error.message?.includes('Session from session_id claim in JWT does not exist') ||
          error.status === 403;
        
        if (isSessionNotFound) {
          // Session 已经不存在或已过期，这是正常情况，不需要显示错误
          console.log('Session already expired or not found, clearing local state');
        } else {
          // 其他错误，记录但不阻止登出流程
          console.warn('Sign out error (non-critical):', error.message);
        }
      }
    } catch (err) {
      // 捕获全局登出的异常，但不阻止后续流程
      console.warn('Global sign out error (non-critical):', err);
    }
    
    // 无论全局登出是否成功，都清除本地 session
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (localError) {
      // 即使清除本地 session 失败，也继续登出流程
      console.warn('Local sign out error (non-critical):', localError);
    }
    
    // 显示成功提示并跳转
    toast({
      title: t('auth.logout') || "登出",
      description: i18n.language.startsWith('zh') ? "已成功登出" : "Signed out successfully",
    });
    navigate("/");
  };
  
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 safe-area-top w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo + AI Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Link to="/" className="flex items-center">
              <h1 className="font-pixel text-[10px] xs:text-xs sm:text-base md:text-lg text-foreground hover:text-primary transition-colors tracking-wider leading-tight">
                HUNSOCCER
              </h1>
            </Link>
            
            {/* AI Chat Button - 放在logo右边 */}
            <div id="header-ai-chat-slot" className="md:hidden" />
          </div>
          
          {/* Center: Navigation - Modern Glassmorphism Style */}
          <nav className="hidden md:flex items-center bg-white/[0.04] backdrop-blur-xl rounded-2xl p-1.5 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {/* Top glow effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" />
            
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative"
              >
                {({ isActive }) => (
                  <motion.div
                    className={`relative flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 text-sm font-medium
                      ${isActive 
                        ? 'text-white' 
                        : 'text-white/50 hover:text-white/80'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Active background pill with animation */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavTab"
                        className="absolute inset-0 bg-white/[0.12] rounded-xl border border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    
                    {/* Label */}
                    <span className={`relative z-10 whitespace-nowrap ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>
                      {item.label}
                    </span>
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 flex-shrink-0">
            <OnlineUsers />

            
            <LanguageSwitcher />
            
            {/* Mobile Avatar - 移动端显示头像 */}
            {user && (
              <div className="flex sm:hidden items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full focus:outline-none focus:ring-0">
                      <Avatar className="h-7 w-7 cursor-pointer transition-all">
                        <AvatarImage
                          src={userProfile?.avatar_url || "/avatars/avatar-1.png"}
                          alt={userProfile?.display_name || "User"}
                          key={userProfile?.avatar_url}
                        />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {userProfile?.display_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={userProfile?.avatar_url || "/avatars/avatar-1.png"} />
                            <AvatarFallback className="text-xs">{userProfile?.display_name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate min-w-0">{userProfile?.display_name || "User"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* VIP 图标 - 与我的页面逻辑一致 */}
                          <span
                            className={`flex items-center justify-center !px-1.5 !py-0.5 !min-w-0 rounded text-[9px] font-bold shrink-0 h-5 ${userVip?.isActive ? "animate-pulse text-white" : "text-gray-400"}`}
                            style={userVip?.isActive ? {
                              background: "linear-gradient(135deg, hsl(195 85% 55%) 0%, hsl(210 90% 65%) 50%, hsl(195 80% 60%) 100%)",
                              boxShadow: "0 1px 6px rgba(80, 180, 220, 0.5)",
                            } : {
                              background: "linear-gradient(135deg, hsl(0 0% 25%) 0%, hsl(0 0% 35%) 100%)",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            VIP
                          </span>
                          {userVip?.expiresAt ? (
                            <div className="text-xs text-muted-foreground space-y-0.5 min-w-0 flex-1">
                              <div>{t("membership_expires")}: {formatExpiryDate(userVip.expiresAt)}</div>
                              <div className="text-foreground">
                                {t("membership_remaining")}: <MembershipCountdown expiresAt={userVip.expiresAt} isActive={userVip.isActive} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t("not_vip")}，{t("invite_to_get_vip")}</span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("auth.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Desktop Auth Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              {user ? (
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-full focus:outline-none focus:ring-0 flex items-center gap-2">
                        <Avatar className="h-8 w-8 cursor-pointer transition-all">
                          <AvatarImage
                            src={userProfile?.avatar_url || "/avatars/avatar-1.png"}
                            alt={userProfile?.display_name || "User"}
                            key={userProfile?.avatar_url}
                          />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {userProfile?.display_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                          {userProfile?.display_name || "User"}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={userProfile?.avatar_url || "/avatars/avatar-1.png"} />
                              <AvatarFallback className="text-xs">{userProfile?.display_name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate min-w-0">{userProfile?.display_name || "User"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* VIP 图标 - 与我的页面逻辑一致 */}
                            <span
                              className={`flex items-center justify-center !px-1.5 !py-0.5 !min-w-0 rounded text-[9px] font-bold shrink-0 h-5 ${userVip?.isActive ? "animate-pulse text-white" : "text-gray-400"}`}
                              style={userVip?.isActive ? {
                                background: "linear-gradient(135deg, hsl(195 85% 55%) 0%, hsl(210 90% 65%) 50%, hsl(195 80% 60%) 100%)",
                                boxShadow: "0 1px 6px rgba(80, 180, 220, 0.5)",
                              } : {
                                background: "linear-gradient(135deg, hsl(0 0% 25%) 0%, hsl(0 0% 35%) 100%)",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
                              }}
                            >
                              VIP
                            </span>
                            {userVip?.expiresAt ? (
                              <div className="text-xs text-muted-foreground space-y-0.5 min-w-0 flex-1">
                                <div>{t("membership_expires")}: {formatExpiryDate(userVip.expiresAt)}</div>
                                <div className="text-foreground">
                                  {t("membership_remaining")}: <MembershipCountdown expiresAt={userVip.expiresAt} isActive={userVip.isActive} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("not_vip")}，{t("invite_to_get_vip")}</span>
                            )}
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("auth.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 w-8 p-0">
                    <LogOut size={16} />
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  onClick={() => navigate("/auth")}
                    className={`bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground px-5 h-9 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 ${i18n.language === 'en' ? 'font-pixel tracking-wider' : 'text-base'}`}
                  >
                    {t('auth.login')}
                  </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {user && (
        <>
          <UserPredictionsDialog
            open={showPredictions}
            onOpenChange={setShowPredictions}
            userId={user.id}
          />
          <VipSubscriptionDialog
            open={showVipDialog}
            onOpenChange={setShowVipDialog}
            isVipActive={userVip?.isActive ?? false}
            onVipPurchased={refreshUserVip}
          />
        </>
      )}
    </header>
  );
};

export default Header;

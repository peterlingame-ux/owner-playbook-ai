import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Eye, EyeOff, Lock, Phone, Home, Sparkles } from "lucide-react";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/hunnsoccer-alpha-logo.png";
import authBg from "@/assets/auth-football-bg.jpg";
import aiBluewhale from "@/assets/ai-icon-bluewhale.png";
import aiGemini from "@/assets/ai-icon-gemini.png";
import aiChatgpt from "@/assets/ai-icon-chatgpt.png";
import aiClaude from "@/assets/ai-icon-claude.png";
import aiGrok from "@/assets/ai-icon-grok.png";
import aiHunsoccer from "@/assets/ai-icon-hunsoccer.png";
import type { User } from "@supabase/supabase-js";

// Validation schemas - error messages will be handled by toast using translations
const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{1,4}$/, "invalid_country_code");
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{5,15}$/, "invalid_phone");
const otpSchema = z.string().length(6, "invalid_otp");
const passwordSchema = z.string().min(6, "invalid_password");

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("+86");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"phone" | "otp" | "set-password" | "password-login" | "forgot-password">("phone");
  const [countdown, setCountdown] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"sms" | "password">("sms");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationBonus, setInvitationBonus] = useState<number>(0);
  const [forgotPasswordPhone, setForgotPasswordPhone] = useState("");

  useEffect(() => {
    if (user) {
      // 检查用户是否已设置密码
      checkUserHasPassword(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const normalizedCountryCode = useMemo(
    () => (countryCode.startsWith("+") ? countryCode : `+${countryCode}`),
    [countryCode],
  );

  const checkUserHasPassword = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("auth-password", {
        body: { action: "check-password", userId },
      });

      if (!error && data?.success && !data?.hasPassword) {
        // 用户尚未设置密码，提示设置
        setPendingUserId(userId);
        setStep("set-password");
      } else if (!error && data?.success && data?.hasPassword) {
        // 已有密码，直接跳转
        navigate("/");
      }
    } catch (err) {
      console.error("Check password error:", err);
      navigate("/");
    }
  };

  const syncUserProfile = async (user: User, withInvitation?: string) => {
    const formattedPhone = user.phone ?? `${normalizedCountryCode}${phone}`;

    const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-user", {
      body: {
        phoneNumber: formattedPhone,
        displayName:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : undefined,
        avatarUrl:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : undefined,
        metadata: user.user_metadata ?? undefined,
        invitationCode: withInvitation || invitationCode || undefined,
      },
    });

    if (syncError) {
      toast({
        title: t("auth.user_sync_failed"),
        description: syncError.message,
        variant: "destructive",
      });
    } else if (syncData?.bonusReceived) {
      setInvitationBonus(syncData.bonusReceived);
    }
  };

  const validateCountryCode = () => {
    try {
      countryCodeSchema.parse(countryCode);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("auth.validation_failed"),
          description: t("auth.valid_country_code"),
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const validatePhone = () => {
    try {
      phoneSchema.parse(phone);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("auth.validation_failed"),
          description: t("auth.valid_phone"),
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const validateOtp = () => {
    try {
      otpSchema.parse(otp);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("auth.validation_failed"),
          description: t("auth.valid_otp"),
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const validatePassword = () => {
    try {
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("auth.validation_failed"),
          description: t("auth.valid_password"),
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCountryCode() || !validatePhone()) return;

    // 注册时需要验证密码
    if (isSignUp && loginMethod === "sms") {
      if (!validatePassword()) return;
      if (password !== confirmPassword) {
        toast({
          title: t("auth.password_mismatch"),
          description: t("auth.password_mismatch_desc"),
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: `${normalizedCountryCode}${phone}`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: t("auth.send_failed"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("auth.code_sent"),
        description: t("auth.check_sms"),
      });
      setStep("otp");
      setCountdown(60);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCountryCode() || !validateOtp()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: `${normalizedCountryCode}${phone}`,
      token: otp,
      type: 'sms',
    });

    if (error) {
      setLoading(false);
      toast({
        title: t("auth.verify_failed"),
        description: error.message === "Token has expired or is invalid" 
          ? t("auth.code_expired") 
          : error.message,
        variant: "destructive",
      });
    } else {
      if (data?.user) {
        await syncUserProfile(data.user);
        setPendingUserId(data.user.id);
        
        // 如果是注册流程且已设置密码，直接保存密码
        if (isSignUp && password) {
          try {
            await supabase.functions.invoke("auth-password", {
              body: {
                action: "set-password",
                userId: data.user.id,
                password,
              },
            });
            setLoading(false);
            toast({
              title: t("auth.register_success"),
              description: t("auth.welcome"),
            });
            navigate("/");
          } catch (err) {
            setLoading(false);
            toast({
              title: t("auth.register_success"),
              description: t("auth.password_set_failed"),
            });
            navigate("/");
          }
        } else if (forgotPasswordPhone) {
          // 忘记密码流程 - 验证成功后进入重置密码
          setLoading(false);
          setStep("set-password");
          toast({
            title: t("auth.verify_success"),
            description: t("auth.please_set_new_password"),
          });
        } else {
          // 登录流程 - 检查是否需要设置密码
          const { data: pwdData } = await supabase.functions.invoke("auth-password", {
            body: { action: "check-password", userId: data.user.id },
          });
          
          setLoading(false);
          
          if (pwdData?.success && !pwdData?.hasPassword) {
            setStep("set-password");
            toast({
              title: t("auth.login_success"),
              description: t("auth.please_set_password"),
            });
          } else {
            toast({
              title: t("auth.login_success"),
              description: t("auth.welcome_back"),
            });
            navigate("/");
          }
        }
      } else {
        setLoading(false);
        navigate("/");
      }
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    if (password !== confirmPassword) {
      toast({
        title: t("auth.password_mismatch"),
        description: t("auth.password_mismatch_desc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("auth-password", {
        body: {
          action: "set-password",
          userId: pendingUserId || user?.id,
          password,
        },
      });

      setLoading(false);

      if (error || !data?.success) {
        toast({
          title: t("auth.set_failed"),
          description: data?.error || t("auth.set_password_failed"),
          variant: "destructive",
        });
      } else {
        // 如果是忘记密码流程，返回登录页面
        if (forgotPasswordPhone) {
          toast({
            title: t("auth.password_reset_success"),
            description: t("auth.login_with_new_password"),
          });
          setStep("phone");
          setLoginMethod("password");
          setPassword("");
          setConfirmPassword("");
          setForgotPasswordPhone("");
        } else {
          toast({
            title: t("auth.password_set_success"),
            description: t("auth.login_with_password"),
          });
          navigate("/");
        }
      }
    } catch (err) {
      setLoading(false);
      toast({
        title: t("auth.set_failed"),
        description: t("auth.network_error"),
        variant: "destructive",
      });
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCountryCode() || !validatePhone() || !validatePassword()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("auth-password", {
        body: {
          action: "login-with-password",
          phone: `${normalizedCountryCode}${phone}`,
          password,
        },
      });

      if (error || !data?.success) {
        setLoading(false);
        if (data?.needSmsLogin) {
          toast({
            title: t("auth.need_sms_verify"),
            description: t("auth.login_and_set_password"),
          });
          setLoginMethod("sms");
        } else {
          toast({
            title: t("auth.login_failed"),
            description: data?.error || t("auth.phone_or_password_error"),
            variant: "destructive",
          });
        }
        return;
      }

      // 密码验证成功，使用 OTP 完成登录
      if (data.useDirectLogin && data.userId) {
        // 发送一个静默的 OTP 来完成登录流程
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: `${normalizedCountryCode}${phone}`,
        });

        setLoading(false);

        if (otpError) {
          toast({
            title: t("auth.login_success"),
            description: t("auth.check_sms"),
          });
          setStep("otp");
          setCountdown(60);
        } else {
          toast({
            title: t("auth.code_sent"),
            description: t("auth.check_sms"),
          });
          setStep("otp");
          setCountdown(60);
        }
      }
    } catch (err) {
      setLoading(false);
      toast({
        title: t("auth.login_failed"),
        description: t("auth.network_error"),
        variant: "destructive",
      });
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSkipSetPassword = () => {
    navigate("/");
  };

  // 处理忘记密码 - 发送验证码
  const handleForgotPasswordSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCountryCode() || !validatePhone()) return;

    setLoading(true);
    setForgotPasswordPhone(`${normalizedCountryCode}${phone}`);

    const { error } = await supabase.auth.signInWithOtp({
      phone: `${normalizedCountryCode}${phone}`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: t("auth.send_failed"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("auth.code_sent"),
        description: t("auth.check_sms"),
      });
      setStep("otp");
      setCountdown(60);
    }
  };

  // 处理忘记密码 - 验证码验证后重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    if (password !== confirmPassword) {
      toast({
        title: t("auth.password_mismatch"),
        description: t("auth.password_mismatch_desc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("auth-password", {
        body: {
          action: "set-password",
          userId: pendingUserId,
          password,
        },
      });

      setLoading(false);

      if (error || !data?.success) {
        toast({
          title: t("auth.reset_failed"),
          description: data?.error || t("auth.reset_password_failed"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("auth.password_reset_success"),
          description: t("auth.login_with_new_password"),
        });
        setStep("phone");
        setLoginMethod("password");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setLoading(false);
      toast({
        title: t("auth.reset_failed"),
        description: t("auth.network_error"),
        variant: "destructive",
      });
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "phone":
        return loginMethod === "password" ? t("auth.password_login") : (isSignUp ? t("auth.register") : t("auth.login"));
      case "otp":
        return t("auth.enter_code");
      case "set-password":
        return isSignUp ? t("auth.set_password") : t("auth.reset_password");
      case "forgot-password":
        return t("auth.forgot_password");
      case "password-login":
        return t("auth.password_login");
      default:
        return t("auth.login");
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "phone":
        return loginMethod === "password" 
          ? t("auth.enter_phone_password") 
          : (isSignUp ? t("auth.enter_phone_set_password") : t("auth.enter_phone_get_code"));
      case "otp":
        return t("auth.code_sent_to", { phone: `${normalizedCountryCode} ${phone}` });
      case "set-password":
        return isSignUp ? t("auth.set_password_desc") : t("auth.reset_password_desc");
      case "forgot-password":
        return t("auth.forgot_password_desc");
      default:
        return "";
    }
  };

  return (
    <div 
      className="min-h-screen relative flex flex-col overflow-hidden bg-cover bg-center"
      style={{ 
        backgroundImage: `url(${authBg})`
      }}
    >
      {/* 动态渐变叠加层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-teal-900/30" />
      
      {/* 动态光效背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            rotate: [0, 360],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* 顶部导航栏 */}
      <motion.header 
        className="relative z-20 w-full px-4 py-3 flex items-center justify-between bg-black/30 backdrop-blur-xl border-b border-white/10"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step === "otp" || step === "set-password" || step === "forgot-password" ? handleBackToPhone() : navigate("/")}
            className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 group"
          >
            {step === "phone" ? (
              <>
                <Home className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                {t("auth.home")}
              </>
            ) : (
              <>
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                {t("auth.back")}
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </motion.header>

      {/* 主内容区域 */}
      <div className="flex-1 flex items-start justify-center px-3 sm:px-4 pb-6 sm:pb-10 pt-8 sm:pt-16">
        {/* 主卡片 - 高级玻璃态效果 */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <Card className="w-full max-w-md relative z-10 bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/30 overflow-hidden">
            {/* 卡片顶部光效 */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
            <div className="absolute top-0 left-1/4 right-1/4 h-24 bg-gradient-to-b from-teal-400/10 to-transparent blur-xl" />
            
            <CardHeader className="text-center space-y-4 sm:space-y-6 pb-4 sm:pb-6 pt-6 sm:pt-12 relative">
              {/* Logo with glow effect */}
              <motion.div 
                className="flex justify-center h-20 sm:h-32 overflow-visible relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 sm:w-48 sm:h-48 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
                </div>
                <img
                  src={logo}
                  alt="Logo"
                  className="h-full w-auto object-contain scale-[1.5] sm:scale-[2] origin-center relative z-10 drop-shadow-[0_0_30px_rgba(20,184,166,0.3)]"
                />
              </motion.div>
              
              <motion.div 
                className="space-y-1 sm:space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <CardTitle className="text-xl sm:text-3xl font-bold text-white flex items-center justify-center gap-2">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={getStepTitle()}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {getStepTitle()}
                    </motion.span>
                  </AnimatePresence>
                </CardTitle>
                <motion.p 
                  className="text-xs sm:text-sm text-white/70 px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {getStepDescription()}
                </motion.p>
              </motion.div>
            </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-8 pb-6 sm:pb-10">
          {step === "phone" && (
            <form onSubmit={loginMethod === "password" ? handlePasswordLogin : handleSendCode} className="space-y-4 sm:space-y-6">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phone" className="text-white/90 text-xs sm:text-sm font-medium">
                  {t("auth.phone_number")}
                </Label>
                <div className="flex gap-1.5 sm:gap-2">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t("auth.enter_phone")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={15}
                    className="flex-1 h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              {/* 密码输入框 - 仅在密码登录模式显示 */}
              {loginMethod === "password" && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-white/90 text-xs sm:text-sm font-medium">
                    {t("auth.login_password")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.enter_password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg pr-10 sm:pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* 注册时显示密码设置 */}
              {isSignUp && loginMethod === "sms" && (
                <>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-password" className="text-white/90 text-xs sm:text-sm font-medium">
                      {t("auth.set_password")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("auth.enter_password_hint")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg pr-10 sm:pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-white/90 text-xs sm:text-sm font-medium">
                      {t("auth.confirm_password")}
                    </Label>
                    <Input
                      id="signup-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.enter_confirm_password")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="invitationCode" className="text-white/90 text-xs sm:text-sm font-medium">
                      {t("auth.invitation_code")} <span className="text-white/50 text-[10px] sm:text-xs">{t("auth.invitation_code_hint")}</span>
                    </Label>
                    <Input
                      id="invitationCode"
                      type="text"
                      placeholder={t("auth.enter_invitation_code")}
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                      maxLength={10}
                      className="h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg uppercase tracking-widest"
                    />
                  </div>
                </>
              )}

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit" 
                  className="w-full h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 relative overflow-hidden group" 
                  disabled={loading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading && (
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {loading ? t("auth.processing") : (loginMethod === "password" ? t("auth.login") : (isSignUp ? t("auth.register") : t("auth.get_code")))}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </motion.div>

              {/* 切换登录方式和忘记密码 */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod(loginMethod === "sms" ? "password" : "sms");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-teal-400 hover:text-teal-300 font-medium"
                >
                  {loginMethod === "sms" ? (
                    <>
                      <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t("auth.password_login_switch")}
                    </>
                  ) : (
                    <>
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t("auth.sms_login")}
                    </>
                  )}
                </button>
                
                {loginMethod === "password" && (
                  <span className="text-white/30">|</span>
                )}
                
                {loginMethod === "password" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("forgot-password");
                      setPassword("");
                    }}
                    className="text-xs sm:text-sm text-white/60 hover:text-white/80"
                  >
                    {t("auth.forgot_password_link")}
                  </button>
                )}
              </div>

              <div className="text-center space-y-1.5 sm:space-y-2">
                {loginMethod === "sms" && (
                  <p className="text-xs sm:text-sm text-white/70">
                    {isSignUp ? t("auth.have_account") : t("auth.no_account")}{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-teal-400 hover:text-teal-300 font-medium"
                    >
                      {isSignUp ? t("auth.login_now") : t("auth.register_now")}
                    </button>
                  </p>
                )}
                
                {/* AI 模型图标 - 带动画 */}
                <motion.div 
                  className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-white/10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-[10px] sm:text-xs text-white/50 text-center mb-2 sm:mb-3 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {t("auth.ai_models")}
                  </p>
                  <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                    {[
                      { src: aiBluewhale, alt: "Bluewhale AI", delay: 0 },
                      { src: aiGemini, alt: "Gemini", delay: 0.1 },
                      { src: aiChatgpt, alt: "ChatGPT", delay: 0.2, special: true },
                      { src: aiClaude, alt: "Claude", delay: 0.3 },
                      { src: aiGrok, alt: "Grok", delay: 0.4 },
                      { src: aiHunsoccer, alt: "HunSoccer", delay: 0.5 },
                    ].map((ai, index) => (
                      <motion.img 
                        key={ai.alt}
                        src={ai.src} 
                        alt={ai.alt} 
                        className={`h-7 w-7 sm:h-10 sm:w-10 object-contain cursor-pointer transition-all duration-300 ${
                          ai.special ? 'bg-emerald-500/60 rounded-full p-0.5 sm:p-1' : ''
                        }`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 0.8, scale: 1 }}
                        transition={{ delay: 0.7 + ai.delay, type: "spring", stiffness: 200 }}
                        whileHover={{ 
                          opacity: 1, 
                          scale: 1.2,
                          filter: "drop-shadow(0 0 8px rgba(20, 184, 166, 0.6))"
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </form>
          )}

          {step === "otp" && (
            <motion.form 
              onSubmit={handleVerifyOtp} 
              className="space-y-4 sm:space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="space-y-3 sm:space-y-4">
                <Label htmlFor="otp" className="text-white/90 text-xs sm:text-sm font-medium block text-center">
                  {t("auth.valid_otp")}
                </Label>
                <motion.div 
                  className="flex justify-center"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot 
                          key={index}
                          index={index} 
                          className="w-10 h-12 sm:w-12 sm:h-14 bg-white/10 border-white/20 text-white text-lg sm:text-xl font-semibold rounded-xl focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition-all" 
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 relative overflow-hidden group" 
                  disabled={loading || otp.length !== 6}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading && (
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {loading ? t("auth.verifying") : t("auth.confirm_login")}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </motion.div>

              <div className="text-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="text-xs sm:text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    {countdown > 0 ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          key={countdown}
                          initial={{ scale: 1.3, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-teal-400 font-mono"
                        >
                          {countdown}
                        </motion.span>
                        <span>{t("auth.resend_in", { seconds: "" }).replace("{{seconds}}", "").replace("秒", "").trim()}</span>
                      </span>
                    ) : t("auth.resend_code")}
                  </Button>
                </motion.div>
              </div>
            </motion.form>
          )}

          {step === "set-password" && (
            <motion.form 
              onSubmit={handleSetPassword} 
              className="space-y-4 sm:space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="space-y-3 sm:space-y-4">
                <motion.div 
                  className="space-y-1.5 sm:space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label htmlFor="new-password" className="text-white/90 text-xs sm:text-sm font-medium">
                    {t("auth.set_password")}
                  </Label>
                  <div className="relative group">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.enter_password_hint")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 rounded-xl pr-10 sm:pr-12 transition-all"
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 p-1 rounded-lg hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </motion.button>
                  </div>
                  {/* 密码强度指示器 */}
                  {password.length > 0 && (
                    <motion.div 
                      className="flex gap-1 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            password.length >= level * 3
                              ? level <= 2
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                              : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>

                <motion.div 
                  className="space-y-1.5 sm:space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label htmlFor="confirm-password" className="text-white/90 text-xs sm:text-sm font-medium">
                    {t("auth.confirm_password")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.enter_confirm_password")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className={`h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 rounded-xl transition-all ${
                        confirmPassword && password !== confirmPassword ? 'border-red-400/50' : ''
                      } ${confirmPassword && password === confirmPassword ? 'border-emerald-400/50' : ''}`}
                    />
                    {confirmPassword && (
                      <motion.div 
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {password === confirmPassword ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={loading || password.length < 6 || password !== confirmPassword}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading && (
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {loading ? t("auth.setting") : t("auth.confirm_set")}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </motion.div>

              <div className="text-center">
                <motion.button
                  type="button"
                  onClick={handleSkipSetPassword}
                  className="text-xs sm:text-sm text-white/60 hover:text-white/80 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("auth.skip_set_later")}
                </motion.button>
              </div>
            </motion.form>
          )}

          {/* 忘记密码页面 */}
          {step === "forgot-password" && (
            <form onSubmit={handleForgotPasswordSendCode} className="space-y-4 sm:space-y-6">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="forgot-phone" className="text-white/90 text-xs sm:text-sm font-medium">
                  {t("auth.phone_number")}
                </Label>
                <div className="flex gap-1.5 sm:gap-2">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <Input
                    id="forgot-phone"
                    type="tel"
                    placeholder={t("auth.enter_phone")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={15}
                    className="flex-1 h-10 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              <Button
                type="submit" 
                className="w-full h-10 sm:h-12 text-sm sm:text-base bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading}
              >
                {loading ? t("auth.sending") : t("auth.send_code")}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setLoginMethod("password");
                    setForgotPasswordPhone("");
                  }}
                  className="text-xs sm:text-sm text-teal-400 hover:text-teal-300"
                >
                  {t("auth.back_to_login")}
                </button>
              </div>
            </form>
          )}
        </CardContent>
          </Card>
        </motion.div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(0px) translateX(20px); }
          75% { transform: translateY(20px) translateX(10px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(20px) translateX(-10px); }
          50% { transform: translateY(0px) translateX(-20px); }
          75% { transform: translateY(-20px) translateX(-10px); }
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Auth;

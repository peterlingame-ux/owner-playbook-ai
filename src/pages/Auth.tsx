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
import { ArrowLeft, Eye, EyeOff, Lock, Phone, Home } from "lucide-react";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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

  // 禁用页面滚动，防止背景露出
  useEffect(() => {
    // 禁用 body 滚动
    document.body.style.overflow = 'hidden';
    // 禁用 html 滚动（某些浏览器需要）
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // 组件卸载时恢复滚动
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

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

    const fullPhone = `${normalizedCountryCode}${phone}`;

      // 检查用户是否存在（区分注册和登录）
      try {
        const { data: checkData, error: checkError } = await supabase.functions.invoke("check-user-exists", {
          body: { phone: fullPhone, action: "check" },
        });

        // 处理网络错误或函数调用错误
        if (checkError) {
          console.error("Check user exists error:", checkError);
          // 如果检查失败，继续原有流程（允许自动注册）
        } 
        // 处理函数返回的错误（success: false）
        else if (checkData && !checkData.success) {
          console.error("Check user exists failed:", checkData.error);
          // 如果是系统错误，继续原有流程（允许自动注册）
          // 如果是参数错误，也应该继续流程，避免阻塞用户
        }
        // 处理成功返回（success: true）
        else if (checkData?.success === true) {
          // 如果是登录模式但用户不存在
          if (!isSignUp && checkData.exists === false) {
            setLoading(false);
            toast({
              title: t("auth.user_not_found"),
              description: t("auth.please_register_first"),
              variant: "destructive",
            });
            return;
          }
          // 如果是注册模式但用户已存在
          if (isSignUp && checkData.exists === true) {
            setLoading(false);
            toast({
              title: t("auth.user_already_exists"),
              description: t("auth.please_login"),
              variant: "destructive",
            });
            return;
          }
          // 如果检查成功且符合预期（登录时用户存在，注册时用户不存在），继续发送验证码
        }
        // 如果没有返回数据，继续原有流程
      } catch (err) {
        console.error("Check user exists exception:", err);
        // 如果检查失败，继续原有流程（允许自动注册）
      }

    // 发送验证码
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
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
        // 检查用户是否为新创建（通过检查创建时间）
        const userCreatedAt = new Date(data.user.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - userCreatedAt.getTime();
        const isNewlyCreated = timeDiff < 60000; // 1分钟内创建的视为新用户

        // 如果是登录模式但用户是新创建的，说明第一道防线失效了
        // 不删除用户（因为用户已经通过 OTP 验证了手机号），而是提示用户完成注册
        if (!isSignUp && isNewlyCreated && !forgotPasswordPhone) {
          // 登出当前 session
          await supabase.auth.signOut();
          
          setLoading(false);
          toast({
            title: t("auth.detected_new_user"),
            description: t("auth.complete_registration"),
            variant: "default",
          });
          // 自动切换到注册模式
          setIsSignUp(true);
          setStep("phone");
          return;
        }

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
          // 根据错误代码显示多语言错误信息
          let errorMessage = t("auth.phone_or_password_error");
          if (data?.errorCode === "USER_NOT_FOUND") {
            errorMessage = t("auth.user_not_found");
          } else if (data?.errorCode === "INVALID_PASSWORD") {
            errorMessage = t("auth.invalid_password") || "密码错误";
          } else if (data?.errorCode === "NO_PASSWORD_SET") {
            errorMessage = t("auth.no_password_set") || "请先设置密码";
          } else if (data?.error) {
            // 如果错误信息是中文，尝试翻译
            if (data.error === "用户不存在") {
              errorMessage = t("auth.user_not_found");
            } else if (data.error === "密码错误") {
              errorMessage = t("auth.invalid_password") || "密码错误";
            } else {
              errorMessage = data.error;
            }
          }
          
          toast({
            title: t("auth.login_failed"),
            description: errorMessage,
            variant: "destructive",
          });
        }
        return;
      }

      // 密码验证成功，直接完成登录（不需要 OTP）
      if (data.directLogin && data.magicLink) {
        // 使用 magic link 直接完成登录
        // 从 magic link 中提取 token，然后手动验证完成登录
        try {
          const url = new URL(data.magicLink);
          const token = url.searchParams.get('token') || url.searchParams.get('token_hash') || data.hashedToken;
          
          if (data.hashedToken) {
            // 使用 hashedToken 完成登录（magic link 方式）
            const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
              token_hash: data.hashedToken,
              type: 'magiclink',
            } as any);

            setLoading(false);

            if (sessionError) {
              console.error("Magic link verification error:", sessionError);
              // 如果验证失败，回退到 OTP 方式
              const { error: otpError } = await supabase.auth.signInWithOtp({
                phone: `${normalizedCountryCode}${phone}`,
              });

              if (otpError) {
                toast({
                  title: t("auth.login_failed"),
                  description: otpError.message || t("auth.network_error"),
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
            } else {
              // 登录成功，同步用户资料
              if (sessionData?.user) {
                await syncUserProfile(sessionData.user);
              }
              
              toast({
                title: t("auth.login_success"),
                description: t("auth.welcome_back"),
              });
              navigate("/");
            }
          } else {
            // 如果没有 hashedToken，直接跳转到 magic link（让 Supabase 处理）
            // 但需要确保 redirectTo 指向正确的前端地址
            setLoading(false);
            window.location.href = data.magicLink;
          }
        } catch (linkError) {
          console.error("Magic link processing error:", linkError);
          // 如果处理失败，直接跳转到 magic link
          setLoading(false);
          window.location.href = data.magicLink;
        }
        return;
      } else if (data.fallbackToOtp || (data.useDirectLogin && data.userId && !data.magicLink)) {
        // 如果 magic link 生成失败，回退到 OTP 方式
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: `${normalizedCountryCode}${phone}`,
        });

        setLoading(false);
        if (otpError) {
          toast({
            title: t("auth.login_failed"),
            description: otpError.message || t("auth.network_error"),
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
      className="fixed inset-0 w-screen relative flex flex-col overflow-hidden auth-bg-container"
      style={{ 
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: '#000000' // 后备颜色，防止背景图片未加载时显示灰色
      }}
    >
      {/* 深色叠加层 */}
      <div className="absolute inset-0 bg-black/30" />

      {/* 顶部导航栏 - 紧凑 */}
      <header className="relative z-20 w-full px-2 py-1.5 sm:px-4 sm:py-3 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => step === "otp" || step === "set-password" || step === "forgot-password" ? handleBackToPhone() : navigate("/")}
            className="text-white/80 hover:text-white hover:bg-white/10 transition-all h-7 px-2 text-[10px] sm:text-sm sm:h-9 sm:px-3 shrink-0 whitespace-nowrap touch-manipulation"
          >
            {step === "phone" ? (
              <>
                <Home className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                {t("auth.home")}
              </>
            ) : (
              <>
                <ArrowLeft className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                {t("auth.back")}
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </header>

      {/* 主内容区域 - 固定高度不滚动 */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-4 py-2 sm:py-10 overflow-hidden shrink-0">
        {/* 主卡片 - 透明玻璃效果 */}
        <Card className="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/20 max-h-full overflow-y-auto">
        <CardHeader className="text-center space-y-1 sm:space-y-6 pb-2 sm:pb-6 pt-3 sm:pt-12 px-3 sm:px-6">
          {/* Logo - 文本标题 */}
          <div className="flex justify-center">
            <h1 className="font-pixel text-[10px] sm:text-xs md:text-base lg:text-lg text-foreground hover:text-primary transition-colors tracking-wider leading-tight">
              HUNSOCCER
            </h1>
          </div>
          
          <div className="space-y-0 sm:space-y-2">
            <CardTitle className="text-base sm:text-3xl font-bold text-white">
              {getStepTitle()}
            </CardTitle>
            <p className="text-[10px] sm:text-sm text-white/70 px-1 leading-tight line-clamp-1">
              {getStepDescription()}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 sm:space-y-6 px-3 sm:px-8 pb-3 sm:pb-10 shrink-0">
          {step === "phone" && (
            <form onSubmit={loginMethod === "password" ? handlePasswordLogin : handleSendCode} className="space-y-2 sm:space-y-6">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="phone" className="text-white/90 text-[10px] sm:text-sm font-medium">
                  {t("auth.phone_number")}
                </Label>
                <div className="flex gap-1 sm:gap-2 shrink-0">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={t("auth.enter_phone")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={15}
                    className="flex-1 h-9 sm:h-11 text-base bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              {/* 密码输入框 - 仅在密码登录模式显示 */}
              {loginMethod === "password" && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="password" className="text-white/90 text-[10px] sm:text-sm font-medium">
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
                      className="h-9 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg pr-9 sm:pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-5 sm:w-5" /> : <Eye className="h-3.5 w-3.5 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* 注册时显示密码设置 */}
              {isSignUp && loginMethod === "sms" && (
                <>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="signup-password" className="text-white/90 text-[10px] sm:text-sm font-medium">
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
                        className="h-9 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg pr-9 sm:pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-5 sm:w-5" /> : <Eye className="h-3.5 w-3.5 sm:h-5 sm:w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-white/90 text-[10px] sm:text-sm font-medium">
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
                      className="h-9 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="invitationCode" className="text-white/90 text-[10px] sm:text-sm font-medium">
                      {t("auth.invitation_code")} <span className="text-white/50 text-[8px] sm:text-xs">{t("auth.invitation_code_hint")}</span>
                    </Label>
                    <Input
                      id="invitationCode"
                      type="text"
                      placeholder={t("auth.enter_invitation_code")}
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                      maxLength={5}
                      className="h-9 sm:h-12 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg uppercase tracking-widest"
                    />
                  </div>
                </>
              )}

              <Button
                type="submit" 
                className="w-full h-8 sm:h-12 text-xs sm:text-base bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading}
              >
                {loading ? t("auth.processing") : (loginMethod === "password" ? t("auth.login") : (isSignUp ? t("auth.register") : t("auth.get_code")))}
              </Button>

              {/* 切换登录方式和忘记密码 */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod(loginMethod === "sms" ? "password" : "sms");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-teal-400 hover:text-teal-300 font-medium shrink-0 whitespace-nowrap touch-manipulation"
                >
                  {loginMethod === "sms" ? (
                    <>
                      <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                      {t("auth.password_login_switch")}
                    </>
                  ) : (
                    <>
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
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
                    className="text-[10px] sm:text-sm text-white/60 hover:text-white/80 shrink-0 whitespace-nowrap touch-manipulation"
                  >
                    {t("auth.forgot_password_link")}
                  </button>
                )}
              </div>

              <div className="text-center space-y-1 sm:space-y-2">
                {loginMethod === "sms" && (
                  <p className="text-[10px] sm:text-sm text-white/70 shrink-0 whitespace-nowrap">
                    {isSignUp ? t("auth.have_account") : t("auth.no_account")}{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-teal-400 hover:text-teal-300 font-medium shrink-0 whitespace-nowrap touch-manipulation"
                    >
                      {isSignUp ? t("auth.login_now") : t("auth.register_now")}
                    </button>
                  </p>
                )}
                
                {/* AI 模型图标 - 手机端更紧凑 */}
                <div className="pt-1.5 sm:pt-4 mt-1.5 sm:mt-4 border-t border-white/10">
                  <p className="text-[8px] sm:text-xs text-white/50 text-center mb-1 sm:mb-3">{t("auth.ai_models")}</p>
                  <div className="flex items-center justify-center gap-1 sm:gap-4 flex-wrap">
                    <img src={aiBluewhale} alt="Bluewhale AI" className="h-5 w-5 sm:h-10 sm:w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img src={aiGemini} alt="Gemini" className="h-5 w-5 sm:h-10 sm:w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img
                      src={aiChatgpt}
                      alt="ChatGPT"
                      className="h-5 w-5 sm:h-10 sm:w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer bg-emerald-500/60 rounded-full p-0.5 sm:p-1"
                    />
                    <img src={aiClaude} alt="Claude" className="h-5 w-5 sm:h-10 sm:w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img src={aiGrok} alt="Grok" className="h-5 w-5 sm:h-10 sm:w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img src={aiHunsoccer} alt="HunSoccer" className="h-5 w-5 sm:h-10 sm:w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                  </div>
                </div>
              </div>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-2 sm:space-y-6">
              <div className="space-y-1.5 sm:space-y-4">
                <Label htmlFor="otp" className="text-white/90 text-[10px] sm:text-sm font-medium block text-center">
                  {t("auth.valid_otp")}
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup className="gap-0.5 sm:gap-2">
                      <InputOTPSlot index={0} className="w-7 h-9 sm:w-12 sm:h-14 bg-white/10 border-white/20 text-white text-sm sm:text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={1} className="w-7 h-9 sm:w-12 sm:h-14 bg-white/10 border-white/20 text-white text-sm sm:text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={2} className="w-7 h-9 sm:w-12 sm:h-14 bg-white/10 border-white/20 text-white text-sm sm:text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={3} className="w-7 h-9 sm:w-12 sm:h-14 bg-white/10 border-white/20 text-white text-sm sm:text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={4} className="w-7 h-9 sm:w-12 sm:h-14 bg-white/10 border-white/20 text-white text-sm sm:text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={5} className="w-7 h-9 sm:w-12 sm:h-14 bg-white/10 border-white/20 text-white text-sm sm:text-xl font-semibold rounded-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-8 sm:h-12 text-xs sm:text-base bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? t("auth.verifying") : t("auth.confirm_login")}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="text-[10px] sm:text-sm text-white/70 hover:text-white hover:bg-white/10 h-7 sm:h-10"
                >
                  {countdown > 0 ? t("auth.resend_in", { seconds: countdown }) : t("auth.resend_code")}
                </Button>
              </div>
            </form>
          )}

          {step === "set-password" && (
            <form onSubmit={handleSetPassword} className="space-y-3 sm:space-y-6">
              <div className="space-y-2 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="new-password" className="text-white/90 text-[11px] sm:text-sm font-medium">
                    {t("auth.set_password")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.enter_password_hint")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-10 sm:h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg pr-10 sm:pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="confirm-password" className="text-white/90 text-[11px] sm:text-sm font-medium">
                    {t("auth.confirm_password")}
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.enter_confirm_password")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10 sm:h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-9 sm:h-12 text-sm sm:text-base bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading || password.length < 6 || password !== confirmPassword}
              >
                {loading ? t("auth.setting") : t("auth.confirm_set")}
              </Button>

              <div className="text-center shrink-0">
                <button
                  type="button"
                  onClick={handleSkipSetPassword}
                  className="text-[11px] sm:text-sm text-white/60 hover:text-white/80 shrink-0 whitespace-nowrap touch-manipulation"
                >
                  {t("auth.skip_set_later")}
                </button>
              </div>
            </form>
          )}

          {/* 忘记密码页面 */}
          {step === "forgot-password" && (
            <form onSubmit={handleForgotPasswordSendCode} className="space-y-3 sm:space-y-6">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="forgot-phone" className="text-white/90 text-[11px] sm:text-sm font-medium">
                  {t("auth.phone_number")}
                </Label>
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <Input
                    id="forgot-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={t("auth.enter_phone")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={15}
                    className="flex-1 h-9 sm:h-11 text-base bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              <Button
                type="submit" 
                className="w-full h-9 sm:h-12 text-sm sm:text-base bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading}
              >
                {loading ? t("auth.sending") : t("auth.send_code")}
              </Button>

              <div className="text-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setLoginMethod("password");
                    setForgotPasswordPhone("");
                  }}
                  className="text-[11px] sm:text-sm text-teal-400 hover:text-teal-300 shrink-0 whitespace-nowrap touch-manipulation"
                >
                  {t("auth.back_to_login")}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
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
        
        /* 确保背景完全覆盖，包括移动设备的安全区域 */
        .auth-bg-container {
          height: 100vh;
          height: 100dvh; /* 使用动态视口高度，适配移动设备 */
          min-height: 100vh;
          min-height: 100dvh;
        }
        
        /* 确保背景延伸到安全区域 */
        @supports (height: 100dvh) {
          .auth-bg-container {
            height: 100dvh;
            min-height: 100dvh;
          }
        }
      `}</style>
    </div>
  );
};

export default Auth;

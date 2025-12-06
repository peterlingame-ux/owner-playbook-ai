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
import { ArrowLeft, Eye, EyeOff, Lock, Phone } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/hunnsoccer-alpha-logo.png";
import authBg from "@/assets/auth-football-bg.jpg";
import aiBluewhale from "@/assets/ai-icon-bluewhale.png";
import aiGemini from "@/assets/ai-icon-gemini.png";
import aiChatgpt from "@/assets/ai-icon-chatgpt.png";
import aiClaude from "@/assets/ai-icon-claude.png";
import aiGrok from "@/assets/ai-icon-grok.png";
import aiHunsoccer from "@/assets/ai-icon-hunsoccer.png";
import type { User } from "@supabase/supabase-js";

const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{1,4}$/, "请输入有效的国际区号");
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{5,15}$/, "请输入有效的手机号码");
const otpSchema = z.string().length(6, "验证码必须是6位数字");
const passwordSchema = z.string().min(6, "密码至少需要6位");

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("+852");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"phone" | "otp" | "set-password" | "password-login">("phone");
  const [countdown, setCountdown] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"sms" | "password">("sms");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

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

  const syncUserProfile = async (user: User) => {
    const formattedPhone = user.phone ?? `${normalizedCountryCode}${phone}`;

    const { error: syncError } = await supabase.functions.invoke("sync-user", {
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
      },
    });

    if (syncError) {
      toast({
        title: "用户信息同步失败",
        description: syncError.message,
        variant: "destructive",
      });
    }
  };

  const validateCountryCode = () => {
    try {
      countryCodeSchema.parse(countryCode);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "验证失败",
          description: error.errors[0].message,
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
          title: "验证失败",
          description: error.errors[0].message,
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
          title: "验证失败",
          description: error.errors[0].message,
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
          title: "验证失败",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCountryCode() || !validatePhone()) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: `${normalizedCountryCode}${phone}`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "发送失败",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "验证码已发送",
        description: "请查收短信验证码",
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
        title: "验证失败",
        description: error.message === "Token has expired or is invalid" 
          ? "验证码已过期或无效" 
          : error.message,
        variant: "destructive",
      });
    } else {
      if (data?.user) {
        await syncUserProfile(data.user);
        // 检查是否需要设置密码
        setPendingUserId(data.user.id);
        const { data: pwdData } = await supabase.functions.invoke("auth-password", {
          body: { action: "check-password", userId: data.user.id },
        });
        
        setLoading(false);
        
        if (pwdData?.success && !pwdData?.hasPassword) {
          // 需要设置密码
          setStep("set-password");
          toast({
            title: "登录成功",
            description: "请设置您的登录密码",
          });
        } else {
          toast({
            title: "登录成功",
            description: "欢迎回来！",
          });
          navigate("/");
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
        title: "密码不匹配",
        description: "两次输入的密码不一致",
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
          title: "设置失败",
          description: data?.error || "设置密码失败，请重试",
          variant: "destructive",
        });
      } else {
        toast({
          title: "密码设置成功",
          description: "下次可以使用手机号和密码直接登录",
        });
        navigate("/");
      }
    } catch (err) {
      setLoading(false);
      toast({
        title: "设置失败",
        description: "网络错误，请重试",
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
            title: "需要短信验证",
            description: "请先使用短信验证码登录并设置密码",
          });
          setLoginMethod("sms");
        } else {
          toast({
            title: "登录失败",
            description: data?.error || "手机号或密码错误",
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
            title: "登录成功",
            description: "请输入验证码完成登录",
          });
          setStep("otp");
          setCountdown(60);
        } else {
          toast({
            title: "验证码已发送",
            description: "请输入验证码完成登录",
          });
          setStep("otp");
          setCountdown(60);
        }
      }
    } catch (err) {
      setLoading(false);
      toast({
        title: "登录失败",
        description: "网络错误，请重试",
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

  const getStepTitle = () => {
    switch (step) {
      case "phone":
        return loginMethod === "password" ? "密码登录" : (isSignUp ? "注册账号" : "登录账号");
      case "otp":
        return "输入验证码";
      case "set-password":
        return "设置登录密码";
      case "password-login":
        return "密码登录";
      default:
        return "登录";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "phone":
        return loginMethod === "password" 
          ? "请输入手机号码和密码登录" 
          : "请输入手机号码获取验证码";
      case "otp":
        return `验证码已发送至 ${normalizedCountryCode} ${phone}`;
      case "set-password":
        return "设置密码后，下次可直接使用密码登录";
      default:
        return "";
    }
  };

  return (
    <div 
      className="min-h-screen relative flex items-start justify-center px-4 pb-10 pt-44 overflow-hidden bg-cover bg-center"
      style={{ 
        backgroundImage: `url(${authBg})`
      }}
    >
      {/* 深色叠加层 */}
      <div className="absolute inset-0 bg-black/30" />

      {/* 返回按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => step === "otp" || step === "set-password" ? handleBackToPhone() : navigate("/")}
        className="absolute top-8 left-8 text-white/80 hover:text-white hover:bg-white/10 transition-all z-10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>

      {/* 主卡片 - 透明玻璃效果 */}
      <Card className="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/20">
        <CardHeader className="text-center space-y-6 pb-6 pt-12">
          {/* Logo */}
          <div className="flex justify-center h-32 overflow-visible">
            <img
              src={logo}
              alt="Logo"
              className="h-full w-auto object-contain scale-[2] origin-center"
            />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-white">
              {getStepTitle()}
            </CardTitle>
            <p className="text-sm text-white/70">
              {getStepDescription()}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-8 pb-10">
          {step === "phone" && (
            <form onSubmit={loginMethod === "password" ? handlePasswordLogin : handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/90 text-sm font-medium">
                  手机号码
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="countryCode"
                    type="text"
                    inputMode="tel"
                    placeholder="+852"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    required
                    maxLength={5}
                    className="w-24 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={11}
                    className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              {/* 密码输入框 - 仅在密码登录模式显示 */}
              {loginMethod === "password" && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                    登录密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading}
              >
                {loading ? "处理中..." : (loginMethod === "password" ? "登录" : (isSignUp ? "注册" : "获取验证码"))}
              </Button>

              {/* 切换登录方式 */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod(loginMethod === "sms" ? "password" : "sms");
                    setPassword("");
                  }}
                  className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 font-medium"
                >
                  {loginMethod === "sms" ? (
                    <>
                      <Lock className="h-4 w-4" />
                      密码登录
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" />
                      短信验证码登录
                    </>
                  )}
                </button>
              </div>

              <div className="text-center space-y-2">
                {loginMethod === "sms" && (
                  <p className="text-sm text-white/70">
                    {isSignUp ? "已有账号？" : "还没有账号？"}{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-teal-400 hover:text-teal-300 font-medium"
                    >
                      {isSignUp ? "立即登录" : "立即注册！"}
                    </button>
                  </p>
                )}
                
                {/* AI 模型图标 */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <p className="text-xs text-white/50 text-center mb-3">AI 预测模型</p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <img src={aiBluewhale} alt="Bluewhale AI" className="h-10 w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img src={aiGemini} alt="Gemini" className="h-10 w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img
                      src={aiChatgpt}
                      alt="ChatGPT"
                      className="h-10 w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer bg-emerald-500/60 rounded-full p-1"
                    />
                    <img src={aiClaude} alt="Claude" className="h-10 w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img src={aiGrok} alt="Grok" className="h-10 w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                    <img src={aiHunsoccer} alt="HunSoccer" className="h-10 w-10 object-contain opacity-80 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                  </div>
                </div>
              </div>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="otp" className="text-white/90 text-sm font-medium block text-center">
                  请输入 6 位验证码
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={1} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={2} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={3} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={4} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-semibold rounded-lg" />
                      <InputOTPSlot index={5} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-semibold rounded-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? "验证中..." : "确认登录"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="text-sm text-white/70 hover:text-white hover:bg-white/10"
                >
                  {countdown > 0 ? `${countdown}s 后重新发送` : "重新发送验证码"}
                </Button>
              </div>
            </form>
          )}

          {step === "set-password" && (
            <form onSubmit={handleSetPassword} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-white/90 text-sm font-medium">
                    设置登录密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码（至少6位）"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-white/90 text-sm font-medium">
                    确认密码
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading || password.length < 6 || password !== confirmPassword}
              >
                {loading ? "设置中..." : "确认设置"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSkipSetPassword}
                  className="text-sm text-white/60 hover:text-white/80"
                >
                  跳过，稍后设置
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

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

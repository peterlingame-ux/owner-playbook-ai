import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Phone } from "lucide-react";
import { z } from "zod";
import authBg from "@/assets/auth-football-bg.jpg";

const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号码");
const otpSchema = z.string().length(6, "验证码必须是6位数字");

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone()) return;
    
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: `+86${phone}`,
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
    
    if (!validateOtp()) return;
    
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone: `+86${phone}`,
      token: otp,
      type: 'sms',
    });

    setLoading(false);

    if (error) {
      toast({
        title: "验证失败",
        description: error.message === "Token has expired or is invalid" 
          ? "验证码已过期或无效" 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      });
      navigate("/");
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* 背景 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${authBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] via-[#16213e] to-[#0a0e27]" />
      
      {/* 动态背景元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => step === "otp" ? handleBackToPhone() : navigate("/")}
        className="absolute top-8 left-8 text-white/70 hover:text-white hover:bg-white/10 transition-all z-10 backdrop-blur-sm border border-white/10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>

      <Card className="w-full max-w-md relative z-10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/50 animate-fade-in">
        <CardHeader className="text-center space-y-6 pb-8 pt-10">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary via-accent to-primary rounded-3xl flex items-center justify-center shadow-lg shadow-primary/50 animate-pulse">
            <Phone className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-white tracking-tight">
              {step === "phone" ? "手机号登录" : "输入验证码"}
            </CardTitle>
            <p className="text-sm text-white/70">
              {step === "phone" ? "请输入手机号码获取验证码" : `验证码已发送至 +86 ${phone}`}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 px-8 pb-10">
          {step === "phone" ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-white/90 text-sm font-medium">
                  手机号码
                </Label>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center px-5 bg-white/10 border border-white/20 rounded-xl text-white font-medium backdrop-blur-sm">
                    +86
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={11}
                    className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary focus:bg-white/15 transition-all rounded-xl backdrop-blur-sm"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-primary via-accent to-primary hover:shadow-lg hover:shadow-primary/50 text-white text-base font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    发送中...
                  </span>
                ) : (
                  "获取验证码"
                )}
              </Button>

              <p className="text-xs text-white/50 text-center leading-relaxed">
                登录即表示同意 <span className="text-white/70 underline cursor-pointer">用户协议</span> 和 <span className="text-white/70 underline cursor-pointer">隐私政策</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-6">
                <Label htmlFor="otp" className="text-white/90 text-sm font-medium block text-center">
                  请输入 6 位验证码
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup className="gap-3">
                      <InputOTPSlot index={0} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-bold rounded-xl backdrop-blur-sm" />
                      <InputOTPSlot index={1} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-bold rounded-xl backdrop-blur-sm" />
                      <InputOTPSlot index={2} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-bold rounded-xl backdrop-blur-sm" />
                      <InputOTPSlot index={3} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-bold rounded-xl backdrop-blur-sm" />
                      <InputOTPSlot index={4} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-bold rounded-xl backdrop-blur-sm" />
                      <InputOTPSlot index={5} className="w-12 h-14 bg-white/10 border-white/20 text-white text-xl font-bold rounded-xl backdrop-blur-sm" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-primary via-accent to-primary hover:shadow-lg hover:shadow-primary/50 text-white text-base font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    验证中...
                  </span>
                ) : (
                  "确认登录"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all rounded-lg px-4 py-2"
                >
                  {countdown > 0 ? `${countdown}s 后重新发送` : "重新发送验证码"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

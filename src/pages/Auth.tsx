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
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${authBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/80 to-black/90 backdrop-blur-sm" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => step === "otp" ? handleBackToPhone() : navigate("/")}
        className="absolute top-8 left-8 text-white/80 hover:text-white transition-colors z-10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>

      <Card className="w-full max-w-md relative z-10 bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {step === "phone" ? "手机号登录" : "输入验证码"}
          </CardTitle>
          <p className="text-sm text-white/60">
            {step === "phone" ? "请输入手机号码获取验证码" : `验证码已发送至 +86 ${phone}`}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "phone" ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-white/80 text-sm">
                  手机号码
                </Label>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center px-4 bg-white/5 border border-white/10 rounded-lg text-white/60">
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
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium rounded-lg transition-all hover:scale-[1.02]" 
                disabled={loading}
              >
                {loading ? "发送中..." : "获取验证码"}
              </Button>

              <p className="text-xs text-white/40 text-center leading-relaxed">
                登录即表示同意用户协议和隐私政策
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="otp" className="text-white/80 text-sm block text-center">
                  6位验证码
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="bg-white/5 border-white/10 text-white text-lg" />
                      <InputOTPSlot index={1} className="bg-white/5 border-white/10 text-white text-lg" />
                      <InputOTPSlot index={2} className="bg-white/5 border-white/10 text-white text-lg" />
                      <InputOTPSlot index={3} className="bg-white/5 border-white/10 text-white text-lg" />
                      <InputOTPSlot index={4} className="bg-white/5 border-white/10 text-white text-lg" />
                      <InputOTPSlot index={5} className="bg-white/5 border-white/10 text-white text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium rounded-lg transition-all hover:scale-[1.02]" 
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
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {countdown > 0 ? `重新发送 (${countdown}s)` : "重新发送验证码"}
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

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
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/hunnsoccer-alpha-logo.png";
import authBg from "@/assets/auth-football-bg.jpg";
import aiBluewhale from "@/assets/ai-icon-bluewhale.png";
import aiGemini from "@/assets/ai-icon-gemini.png";
import aiChatgpt from "@/assets/ai-icon-chatgpt.png";
import aiClaude from "@/assets/ai-icon-claude.png";
import aiGrok from "@/assets/ai-icon-grok.png";
import aiHunnsoccer from "@/assets/ai-icon-hunnsoccer.png";
import aiOpenai from "@/assets/ai-icon-openai.png";

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
  const [isSignUp, setIsSignUp] = useState(false);

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
    <div 
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-cover bg-center"
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
        onClick={() => step === "otp" ? handleBackToPhone() : navigate("/")}
        className="absolute top-8 left-8 text-white/80 hover:text-white hover:bg-white/10 transition-all z-10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>

      {/* 主卡片 - 透明玻璃效果 */}
      <Card className="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/20">
        <CardHeader className="text-center space-y-6 pb-6 pt-12">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-32 w-auto object-contain" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-white">
              {step === "phone" ? (isSignUp ? "注册账号" : "登录账号") : "输入验证码"}
            </CardTitle>
            <p className="text-sm text-white/70">
              {step === "phone" 
                ? "请输入手机号码获取验证码" 
                : `验证码已发送至 +86 ${phone}`}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-8 pb-10">
          {step === "phone" ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/90 text-sm font-medium">
                  手机号码
                </Label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center px-4 bg-white/10 border border-white/20 rounded-lg text-white font-medium">
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
                    className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
                  />
                </div>
              </div>

              {/* reCAPTCHA 占位 */}
              <div className="flex items-center justify-center p-4 bg-white/5 border border-white/20 rounded-lg">
                <p className="text-xs text-white/60">验证码验证已启用</p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-teal-500/30" 
                disabled={loading}
              >
                {loading ? "发送中..." : "登录"}
              </Button>

              <div className="text-center space-y-2">
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
                <button
                  type="button"
                  className="text-sm text-white/60 hover:text-white/80"
                >
                  忘记密码？
                </button>
                
                {/* AI 模型图标 */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <p className="text-xs text-white/50 text-center mb-3">AI 预测模型</p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <img src={aiBluewhale} alt="Bluewhale AI" className="h-8 w-8 object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                    <img src={aiGemini} alt="Gemini" className="h-8 w-8 object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                    <img src={aiChatgpt} alt="ChatGPT" className="h-8 w-8 object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                    <img src={aiClaude} alt="Claude" className="h-8 w-8 object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                    <img src={aiGrok} alt="Grok" className="h-8 w-8 object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                    <img src={aiOpenai} alt="OpenAI" className="h-8 w-8 object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                    <img src={aiHunnsoccer} alt="HunSoccer" className="h-8 w-8 object-contain opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
                  </div>
                </div>
              </div>
            </form>
          ) : (
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

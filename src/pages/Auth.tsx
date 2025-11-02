import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("请输入有效的邮箱地址");
const passwordSchema = z.string().min(6, "密码至少需要6个字符");
const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的中国手机号");

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateEmailForm = () => {
    try {
      emailSchema.parse(email);
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

  const validatePhoneForm = () => {
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

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm()) return;
    
    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "注册失败",
        description: error.message === "User already registered" 
          ? "该邮箱已被注册" 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "注册成功！",
        description: "请查收邮件进行验证",
      });
    }
  };

  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneForm()) return;
    
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone: `+86${phone}`,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "发送验证码失败",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "验证码已发送",
        description: "请查收短信验证码",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Google登录失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm()) return;
    
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "登录失败",
        description: error.message === "Invalid login credentials" 
          ? "邮箱或密码错误" 
          : error.message === "Email not confirmed"
          ? "请先验证您的邮箱"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "登录成功！",
        description: "欢迎回来",
      });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">BOOSPORT ARENA</CardTitle>
          <CardDescription>登录或注册以查看AI分析结果</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="signup">注册</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              {/* Google Login */}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                使用 Google 登录
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">或使用邮箱</span>
                </div>
              </div>

              {/* Email Login */}
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">邮箱</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              {/* Google Signup */}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                使用 Google 注册
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">或选择注册方式</span>
                </div>
              </div>

              {/* Signup Method Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={signupMethod === "email" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSignupMethod("email")}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  邮箱
                </Button>
                <Button
                  type="button"
                  variant={signupMethod === "phone" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSignupMethod("phone")}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  手机号
                </Button>
              </div>

              {/* Email Signup Form */}
              {signupMethod === "email" && (
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">邮箱</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">密码</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="至少6个字符"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "注册中..." : "注册"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    注册后请查收验证邮件
                  </p>
                </form>
              )}

              {/* Phone Signup Form */}
              {signupMethod === "phone" && (
                <form onSubmit={handlePhoneSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">手机号</Label>
                    <div className="flex gap-2">
                      <Input
                        className="w-20"
                        value="+86"
                        disabled
                      />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="13800138000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        maxLength={11}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "发送验证码..." : "获取验证码"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    我们会向您的手机发送验证码
                  </p>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

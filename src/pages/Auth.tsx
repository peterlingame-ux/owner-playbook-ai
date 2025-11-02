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
import { Mail, Phone, ArrowLeft } from "lucide-react";
import { z } from "zod";
import authBg from "@/assets/auth-football-bg.jpg";

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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${authBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-primary/30 backdrop-blur-sm" />
      
      {/* Animated football elements */}
      <div className="absolute top-20 left-20 w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
      <div className="absolute bottom-40 right-32 w-24 h-24 rounded-full bg-primary/10 animate-pulse delay-75" />
      <div className="absolute top-1/3 right-20 w-12 h-12 rounded-full bg-accent/20 animate-pulse delay-150" />

      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="absolute top-8 left-8 text-white hover:text-primary transition-colors z-10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回首页
      </Button>

      {/* Main card */}
      <Card className="w-full max-w-md relative z-10 bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
            BOOSPORT ARENA
          </CardTitle>
          <CardDescription className="text-base">
            登录或注册以查看AI分析结果
          </CardDescription>
        </CardHeader>
        <CardContent className="animate-fade-in delay-75">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                登录
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                注册
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 animate-fade-in">
              {/* Google Login */}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full hover-scale border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                使用 Google 登录
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-primary/20" />
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
                    className="border-primary/20 focus:border-primary transition-colors"
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
                    className="border-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full hover-scale bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                  disabled={loading}
                >
                  {loading ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 animate-fade-in">
              {/* Google Signup */}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full hover-scale border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                使用 Google 注册
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-primary/20" />
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
                  className="flex-1 hover-scale transition-all"
                  onClick={() => setSignupMethod("email")}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  邮箱
                </Button>
                <Button
                  type="button"
                  variant={signupMethod === "phone" ? "default" : "outline"}
                  className="flex-1 hover-scale transition-all"
                  onClick={() => setSignupMethod("phone")}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  手机号
                </Button>
              </div>

              {/* Email Signup Form */}
              {signupMethod === "email" && (
                <form onSubmit={handleEmailSignUp} className="space-y-4 animate-fade-in">
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
                      className="border-primary/20 focus:border-primary transition-colors"
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
                      className="border-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full hover-scale bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                    disabled={loading}
                  >
                    {loading ? "注册中..." : "注册"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    注册后请查收验证邮件
                  </p>
                </form>
              )}

              {/* Phone Signup Form */}
              {signupMethod === "phone" && (
                <form onSubmit={handlePhoneSignUp} className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">手机号</Label>
                    <div className="flex gap-2">
                      <Input
                        className="w-20 border-primary/20"
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
                        className="border-primary/20 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full hover-scale bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
                    disabled={loading}
                  >
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

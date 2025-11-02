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

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, "Please enter a valid phone number");

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
          title: "Validation Failed",
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
          title: "Validation Failed",
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
        title: "Sign Up Failed",
        description: error.message === "User already registered" 
          ? "This email is already registered" 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sign Up Successful!",
        description: "Please check your email for verification",
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
        title: "Failed to Send Code",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verification Code Sent",
        description: "Please check your SMS",
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
        title: "Google Sign In Failed",
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
        title: "Sign In Failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password" 
          : error.message === "Email not confirmed"
          ? "Please verify your email first"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sign In Successful!",
        description: "Welcome back",
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
        className="absolute top-8 left-8 text-white hover:text-primary transition-colors z-10 font-pixel text-xs"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        BACK HOME
      </Button>

      {/* Main card */}
      <Card className="w-full max-w-md relative z-10 bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in font-pixel">
            BOOSPORT ARENA
          </CardTitle>
          <CardDescription className="text-base font-pixel text-xs">
            LOGIN OR SIGN UP TO VIEW AI ANALYSIS
          </CardDescription>
        </CardHeader>
        <CardContent className="animate-fade-in delay-75">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-pixel text-xs">
                LOGIN
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-pixel text-xs">
                SIGN UP
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 animate-fade-in">
              {/* Google Login */}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full hover-scale border-primary/30 hover:border-primary hover:bg-primary/10 transition-all font-pixel text-xs"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                SIGN IN WITH GOOGLE
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-primary/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-pixel">OR USE EMAIL</span>
                </div>
              </div>

              {/* Email Login */}
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="font-pixel text-xs">EMAIL</Label>
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
                  <Label htmlFor="login-password" className="font-pixel text-xs">PASSWORD</Label>
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
                  className="w-full hover-scale bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 font-pixel text-xs" 
                  disabled={loading}
                >
                  {loading ? "SIGNING IN..." : "SIGN IN"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 animate-fade-in">
              {/* Google Signup */}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full hover-scale border-primary/30 hover:border-primary hover:bg-primary/10 transition-all font-pixel text-xs"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                SIGN UP WITH GOOGLE
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-primary/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-pixel">OR CHOOSE METHOD</span>
                </div>
              </div>

              {/* Signup Method Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={signupMethod === "email" ? "default" : "outline"}
                  className="flex-1 hover-scale transition-all font-pixel text-xs"
                  onClick={() => setSignupMethod("email")}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  EMAIL
                </Button>
                <Button
                  type="button"
                  variant={signupMethod === "phone" ? "default" : "outline"}
                  className="flex-1 hover-scale transition-all font-pixel text-xs"
                  onClick={() => setSignupMethod("phone")}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  PHONE
                </Button>
              </div>

              {/* Email Signup Form */}
              {signupMethod === "email" && (
                <form onSubmit={handleEmailSignUp} className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="font-pixel text-xs">EMAIL</Label>
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
                    <Label htmlFor="signup-password" className="font-pixel text-xs">PASSWORD</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="border-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full hover-scale bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 font-pixel text-xs" 
                    disabled={loading}
                  >
                    {loading ? "SIGNING UP..." : "SIGN UP"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center font-pixel">
                    CHECK YOUR EMAIL AFTER SIGNUP
                  </p>
                </form>
              )}

              {/* Phone Signup Form */}
              {signupMethod === "phone" && (
                <form onSubmit={handlePhoneSignUp} className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="font-pixel text-xs">PHONE NUMBER</Label>
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
                    className="w-full hover-scale bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 font-pixel text-xs" 
                    disabled={loading}
                  >
                    {loading ? "SENDING CODE..." : "GET CODE"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center font-pixel">
                    WE WILL SEND YOU A CODE
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

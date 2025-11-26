import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trophy, TrendingUp, Target, DollarSign, History, Wallet, Edit2, Check } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UserProfile {
  display_name: string;
  avatar_url: string;
}

interface PredictionStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  recentPredictions: Array<{
    id: string;
    match_id: string;
    prediction: string;
    result: string;
    bet_amount: number;
    actual_payout: number;
    created_at: string;
  }>;
}

const AVATAR_OPTIONS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
];

const MyPredictions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!user) {
        // 模拟登录后的数据，用于演示
        setUserProfile({
          display_name: "QuickTiger1234",
          avatar_url: "/avatars/avatar-1.png"
        });
        setEditDisplayName("QuickTiger1234");
        setSelectedAvatar("/avatars/avatar-1.png");
        setStats({
          totalPredictions: 15,
          correctPredictions: 10,
          winRate: 66.67,
          balance: 12500,
          profit: 2500,
          recentPredictions: [
            {
              id: "1",
              match_id: "m1",
              prediction: "主队胜",
              result: "win",
              bet_amount: 500,
              actual_payout: 950,
              created_at: new Date().toISOString()
            },
            {
              id: "2",
              match_id: "m2",
              prediction: "大球 2.5",
              result: "win",
              bet_amount: 300,
              actual_payout: 600,
              created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: "3",
              match_id: "m3",
              prediction: "平局",
              result: "loss",
              bet_amount: 400,
              actual_payout: 0,
              created_at: new Date(Date.now() - 172800000).toISOString()
            },
            {
              id: "4",
              match_id: "m4",
              prediction: "客队胜",
              result: "win",
              bet_amount: 600,
              actual_payout: 1200,
              created_at: new Date(Date.now() - 259200000).toISOString()
            }
          ]
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;

        // 获取用户资料
        const { data: profileData } = await supabase
          .from('users')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
          setEditDisplayName(profileData.display_name);
          setSelectedAvatar(profileData.avatar_url);
        }

        // 获取余额
        const { data: balanceData } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        // 获取预测记录
        const { data: predictionsData } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const totalPredictions = predictionsData?.length || 0;
        const correctPredictions = predictionsData?.filter(p => p.result === 'win').length || 0;
        const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
        const balance = balanceData?.balance || INITIAL_BALANCE;
        const profit = balance - INITIAL_BALANCE;

        setStats({
          totalPredictions,
          correctPredictions,
          winRate,
          balance,
          profit,
          recentPredictions: predictionsData || []
        });
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) {
      // 演示模式：模拟保存
      setUserProfile({
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
      });
      setIsEditDialogOpen(false);
      toast.success("演示模式：个人资料已更新！");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editDisplayName,
          avatar_url: selectedAvatar,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUserProfile({
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
      });
      
      setIsEditDialogOpen(false);
      toast.success("个人资料已更新！");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("更新失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user && !stats) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">登录后查看您的预测统计</p>
          <Button onClick={() => navigate('/auth')}>
            立即登录
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            我的预测
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">您还没有任何预测记录</p>
          <Button onClick={() => navigate('/')}>
            开始预测
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 球星卡片 - 用户资料 */}
      <Card className="border-none overflow-hidden relative bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-2xl">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        
        <CardContent className="p-8 relative z-10">
          {/* 顶部装饰条 */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-warning via-success to-info"></div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            {/* 头像区域 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-warning to-success rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <Avatar className="h-32 w-32 border-4 border-white shadow-2xl relative z-10 ring-4 ring-white/20">
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.display_name} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary-foreground text-white">
                  {userProfile?.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              
              {/* 编辑按钮 */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="icon" 
                    className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-white text-primary shadow-lg hover:scale-110 transition-transform z-20"
                  >
                    <Edit2 className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>编辑个人资料</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* 昵称编辑 */}
                    <div className="space-y-2">
                      <Label htmlFor="display-name">昵称</Label>
                      <Input
                        id="display-name"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="输入你的昵称"
                        maxLength={20}
                      />
                    </div>
                    
                    {/* 头像选择 */}
                    <div className="space-y-3">
                      <Label>选择头像</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {AVATAR_OPTIONS.map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`
                              relative rounded-lg p-2 transition-all
                              ${selectedAvatar === avatar 
                                ? 'ring-2 ring-primary bg-primary/10' 
                                : 'hover:bg-muted border border-border'
                              }
                            `}
                          >
                            <Avatar className="h-16 w-16 mx-auto">
                              <AvatarImage src={avatar} />
                            </Avatar>
                            {selectedAvatar === avatar && (
                              <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSaveProfile}
                      disabled={isSaving || !editDisplayName.trim()}
                    >
                      {isSaving ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* 用户名 */}
            <div>
              <h2 className="text-3xl font-black text-white mb-1 tracking-tight drop-shadow-lg">
                {userProfile?.display_name}
              </h2>
              <div className="flex items-center justify-center gap-2 text-white/90 text-sm">
                <Trophy className="h-4 w-4" />
                <span className="font-semibold">预测大师</span>
              </div>
            </div>
            
            {/* 钱包余额 - 突出显示 */}
            <div className="bg-white/20 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/30 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="bg-warning/20 p-3 rounded-xl">
                  <Wallet className="h-6 w-6 text-warning" />
                </div>
                <div className="text-left">
                  <p className="text-white/80 text-xs font-medium mb-1">虚拟钱包余额</p>
                  <p className="text-3xl font-black text-white font-mono-data tracking-tight">
                    ${stats?.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 核心统计数据 - 三联卡 */}
            <div className="grid grid-cols-3 gap-3 w-full mt-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all">
                <div className="bg-success/20 w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Trophy className="h-5 w-5 text-success" />
                </div>
                <p className="text-white/70 text-xs mb-1">胜率</p>
                <AnimatedWinRate 
                  value={stats?.winRate || 0}
                  className="text-2xl font-black text-white font-mono-data"
                />
              </div>
              
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all">
                <div className="bg-info/20 w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="h-5 w-5 text-info" />
                </div>
                <p className="text-white/70 text-xs mb-1">总预测</p>
                <p className="text-2xl font-black text-white font-mono-data">{stats?.totalPredictions}</p>
              </div>
              
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all">
                <div className={`${stats?.profit && stats.profit >= 0 ? 'bg-success/20' : 'bg-destructive/20'} w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <Target className={`h-5 w-5 ${stats?.profit && stats.profit >= 0 ? 'text-success' : 'text-destructive'}`} />
                </div>
                <p className="text-white/70 text-xs mb-1">收益</p>
                <p className={`text-2xl font-black font-mono-data ${stats?.profit && stats.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {stats?.profit && stats.profit >= 0 ? '+' : ''}{stats?.profit?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计详情卡片 */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            详细统计
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-success/10 to-transparent p-4 rounded-xl border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-success/20 p-2 rounded-lg">
                  <Trophy className="h-4 w-4 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">命中预测</span>
              </div>
              <p className="text-2xl font-bold font-mono-data text-success">{stats?.correctPredictions}</p>
            </div>
            
            <div className="bg-gradient-to-br from-warning/10 to-transparent p-4 rounded-xl border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-warning/20 p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 text-warning" />
                </div>
                <span className="text-sm text-muted-foreground">总投注</span>
              </div>
              <p className="text-2xl font-bold font-mono-data">
                {stats && stats.recentPredictions ? 
                  stats.recentPredictions.reduce((sum, p) => sum + p.bet_amount, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                  : '0'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 预测历史记录卡片 */}
      {stats.recentPredictions.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                预测历史
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/history')}
                className="text-xs"
              >
                查看全部
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentPredictions.map((pred) => (
                <div 
                  key={pred.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(pred.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-medium">
                      预测: {pred.prediction}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                      pred.result === 'win' 
                        ? 'bg-success/20 text-success' 
                        : pred.result === 'loss'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {pred.result === 'win' ? '✓ 胜' : pred.result === 'loss' ? '✗ 负' : '待定'}
                    </span>
                    {pred.result === 'win' && pred.actual_payout > 0 && (
                      <p className="text-xs text-success mt-1 font-mono-data">
                        +${(pred.actual_payout - pred.bet_amount).toFixed(0)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyPredictions;

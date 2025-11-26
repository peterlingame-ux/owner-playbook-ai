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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* AI预测球星卡 */}
      <div className="relative">
        {/* 外层发光效果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-warning to-success rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
        
        <Card className="relative border-4 border-gradient-to-br from-primary via-warning to-success rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* 顶部装饰带 */}
          <div className="h-3 bg-gradient-to-r from-primary via-warning to-success"></div>
          
          {/* 背景图案 */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-warning/30 rounded-full blur-3xl"></div>
          </div>
          
          <CardContent className="p-8 relative z-10">
            {/* 卡片标题 */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full border border-white/20">
                <Target className="h-4 w-4 text-warning" />
                <span className="text-white font-bold text-sm tracking-wider">AI PREDICTION MASTER</span>
              </div>
            </div>
            
            {/* 头像区域 */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* 头像外圈装饰 */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-warning to-success rounded-full animate-spin-slow" style={{ padding: '3px' }}>
                  <div className="w-full h-full bg-slate-900 rounded-full"></div>
                </div>
                
                {/* 头像容器 */}
                <div className="relative">
                  <Avatar className="h-40 w-40 border-8 border-slate-900 shadow-2xl ring-4 ring-white/20">
                    <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.display_name} />
                    <AvatarFallback className="text-5xl bg-gradient-to-br from-primary to-warning text-white font-black">
                      {userProfile?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* 编辑按钮 */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="icon" 
                        className="absolute -bottom-3 -right-3 h-12 w-12 rounded-full bg-gradient-to-r from-primary to-warning shadow-lg hover:scale-110 transition-transform z-20 border-4 border-slate-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>编辑个人资料</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
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
              </div>
            </div>
            
            {/* 用户名和头衔 */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-white mb-2 tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                {userProfile?.display_name}
              </h2>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-warning/20 to-success/20 px-4 py-1.5 rounded-full border border-warning/30">
                <Trophy className="h-4 w-4 text-warning" />
                <span className="text-warning font-bold text-sm">预测精英</span>
              </div>
            </div>
            
            {/* 核心数据展示区 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* 胜率 */}
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-4 border-2 border-primary/30 backdrop-blur-sm">
                <div className="text-center">
                  <div className="bg-primary/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">Win Rate</p>
                  <AnimatedWinRate 
                    value={stats?.winRate || 0}
                    className="text-3xl font-black text-primary font-mono-data"
                  />
                </div>
              </div>
              
              {/* 总预测 */}
              <div className="bg-gradient-to-br from-info/20 to-info/5 rounded-2xl p-4 border-2 border-info/30 backdrop-blur-sm">
                <div className="text-center">
                  <div className="bg-info/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-info" />
                  </div>
                  <p className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">Predictions</p>
                  <p className="text-3xl font-black text-info font-mono-data">{stats?.totalPredictions || 0}</p>
                </div>
              </div>
              
              {/* 收益 */}
              <div className={`bg-gradient-to-br ${stats?.profit && stats.profit >= 0 ? 'from-success/20 to-success/5 border-success/30' : 'from-destructive/20 to-destructive/5 border-destructive/30'} rounded-2xl p-4 border-2 backdrop-blur-sm`}>
                <div className="text-center">
                  <div className={`${stats?.profit && stats.profit >= 0 ? 'bg-success/20' : 'bg-destructive/20'} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <DollarSign className={`h-6 w-6 ${stats?.profit && stats.profit >= 0 ? 'text-success' : 'text-destructive'}`} />
                  </div>
                  <p className="text-white/60 text-xs font-semibold mb-2 uppercase tracking-wider">Profit</p>
                  <p className={`text-3xl font-black font-mono-data ${stats?.profit && stats.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {stats?.profit && stats.profit >= 0 ? '+' : ''}{stats?.profit?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 钱包余额 - 特殊展示 */}
            <div className="relative bg-gradient-to-r from-warning/30 via-warning/20 to-success/30 rounded-2xl p-6 border-2 border-warning/40 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-warning/30 p-4 rounded-xl">
                    <Wallet className="h-8 w-8 text-warning" />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-semibold mb-1 uppercase tracking-wide">Virtual Wallet</p>
                    <p className="text-4xl font-black text-white font-mono-data">
                      ${stats?.balance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 10000}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          
          {/* 底部装饰带 */}
          <div className="h-3 bg-gradient-to-r from-success via-warning to-primary"></div>
        </Card>
      </div>

      {/* 预测历史记录 */}
      {stats && stats.recentPredictions && stats.recentPredictions.length > 0 && (
        <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-transparent to-warning/10 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <span className="bg-gradient-to-r from-primary to-warning bg-clip-text text-transparent font-black">
                  预测历史
                </span>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/history')}
                className="text-xs hover:bg-primary/10"
              >
                查看全部
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {stats.recentPredictions.map((pred) => (
                <div 
                  key={pred.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all border border-border/50 hover:border-primary/30"
                >
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                      {new Date(pred.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm font-bold mb-1">
                      预测: <span className="text-primary">{pred.prediction}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      投注: ${pred.bet_amount}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                      pred.result === 'win' 
                        ? 'bg-success/20 text-success border border-success/30' 
                        : pred.result === 'loss'
                        ? 'bg-destructive/20 text-destructive border border-destructive/30'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {pred.result === 'win' ? '✓ 命中' : pred.result === 'loss' ? '✗ 未中' : '待定'}
                    </span>
                    {pred.result === 'win' && pred.actual_payout > 0 && (
                      <p className="text-sm text-success font-bold font-mono-data">
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

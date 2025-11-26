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
      {/* 用户预测球星卡 - 仿照AI模型卡设计 */}
      <Card 
        className="relative p-6 bg-card border-primary hover:border-opacity-50 transition-all overflow-hidden"
        style={{
          borderColor: 'hsl(var(--primary) / 0.3)',
          borderWidth: '2px'
        }}
      >
        {/* 用户头像背景 */}
        <div 
          className="absolute inset-0 opacity-10 transition-opacity duration-300"
          style={{
            backgroundImage: `url(${userProfile?.avatar_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        {/* 品牌色彩叠加层 */}
        <div 
          className="absolute inset-0 opacity-30 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle at 30% 50%, hsl(var(--primary)), transparent 70%)'
          }}
        />
        
        {/* 渐变遮罩确保内容可读 */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
        
        {/* 内容区域 */}
        <div className="relative z-10">
          {/* 顶部：头像和用户名 */}
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative">
                <Avatar 
                  className="h-20 w-20 border-4 shrink-0"
                  style={{
                    borderColor: 'hsl(var(--primary))'
                  }}
                >
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.display_name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-warning text-white font-black">
                    {userProfile?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                {/* 编辑按钮 */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="icon" 
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary shadow-lg hover:scale-110 transition-transform z-20"
                    >
                      <Edit2 className="h-4 w-4" />
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
              
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg leading-tight truncate text-white">
                  {userProfile?.display_name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Trophy className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs text-muted-foreground">预测精英</span>
                </div>
              </div>
            </div>
            
            {/* 收益徽章 */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">模拟收益</span>
              <div className={`px-3 py-1.5 rounded-full font-mono-data font-bold text-xs ${
                (stats?.profit || 0) >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
              }`}>
                {(stats?.profit || 0) >= 0 ? '+' : ''}{stats?.profit?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* 胜率显示 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">胜率</span>
                <span className="text-2xl font-bold font-mono-data text-primary">
                  <AnimatedWinRate value={stats?.winRate || 0} />%
                </span>
              </div>
              
              {/* 胜率进度条 */}
              <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 bg-primary"
                  style={{
                    width: `${stats?.winRate || 0}%`
                  }}
                />
              </div>
            </div>
            
            {/* 统计数据 */}
            <div className="flex items-center justify-between pt-2.5 border-t border-border/50 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">命中</p>
                <p className="text-base font-bold font-mono-data text-success">
                  {stats?.correctPredictions || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">总预测</p>
                <p className="text-base font-bold font-mono-data">
                  {stats?.totalPredictions || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground mb-0.5">未中</p>
                <p className="text-base font-bold font-mono-data text-destructive">
                  {(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0)}
                </p>
              </div>
            </div>
            
            {/* 钱包余额显示 */}
            <div className="pt-2.5 border-t border-border/50">
              <div className="bg-gradient-to-r from-warning/20 to-warning/10 rounded-lg p-4 border border-warning/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-warning/30 p-2.5 rounded-lg">
                      <Wallet className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">虚拟钱包</p>
                      <p className="text-2xl font-black text-white font-mono-data">
                        ${stats?.balance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 10000}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 查看历史按钮 */}
            <div className="pt-2.5 border-t border-border/50">
              <Button 
                onClick={() => navigate('/history')}
                className="w-full h-10 relative overflow-hidden group/btn border font-bold text-xs hover:scale-105 transition-transform bg-gradient-to-r from-primary/20 to-primary/10"
                style={{
                  borderColor: 'hsl(var(--primary) / 0.3)',
                  color: 'hsl(255 100% 100%)'
                }}
              >
                <div className="relative flex items-center justify-center gap-2">
                  <History className="w-4 h-4 group-hover/btn:animate-pulse" />
                  <span>查看完整历史记录</span>
                </div>
                
                {/* 动画闪光效果 */}
                <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

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

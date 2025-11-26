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
    if (!user) return;
    
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

  if (!user) {
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
      {/* 用户资料卡片 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-primary/20">
              <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.display_name} />
              <AvatarFallback className="text-2xl">
                {userProfile?.display_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl font-bold">{userProfile?.display_name}</h2>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
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
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">虚拟钱包</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <DollarSign className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold font-mono-data text-warning">
                  {stats?.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计数据卡片 */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            预测统计
          </CardTitle>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Trophy className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-xs text-muted-foreground mb-1">胜率</p>
            <AnimatedWinRate 
              value={stats.winRate}
              className="text-lg font-bold font-mono-data text-primary"
            />
          </div>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-success" />
            <p className="text-xs text-muted-foreground mb-1">总预测</p>
            <p className="text-lg font-bold font-mono-data">{stats.totalPredictions}</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Target className="h-5 w-5 mx-auto mb-2 text-info" />
            <p className="text-xs text-muted-foreground mb-1">收益</p>
            <p className={`text-lg font-bold font-mono-data ${stats.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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

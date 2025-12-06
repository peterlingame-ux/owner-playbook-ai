import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, Wallet, Edit2, Check, ArrowLeft, History, Users, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface UserProfile {
  display_name: string;
  avatar_url: string;
}

interface MatchInfo {
  fixture_id: number;
  home_team_name: string;
  away_team_name: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  goals_home?: number;
  goals_away?: number;
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
    match?: MatchInfo;
  }>;
}

interface CopyTradeRecord {
  id: string;
  followed_player_id: string;
  followed_player_name: string;
  followed_player_avatar: string;
  match_id: string;
  match_home_team: string;
  match_away_team: string;
  prediction: string;
  bet_amount: number;
  result: 'win' | 'loss' | 'pending';
  pnl: number;
  created_at: string;
}

const AVATAR_OPTIONS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
  '/avatars/avatar-7.png',
  '/avatars/avatar-8.png',
  '/avatars/avatar-9.png',
];

const MyPredictions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchesMap, setMatchesMap] = useState<Map<string, MatchInfo>>(new Map());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copyTradeRecords, setCopyTradeRecords] = useState<CopyTradeRecord[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

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
        
        // 模拟比赛数据
        const mockMatches = new Map<string, MatchInfo>();
        mockMatches.set("m1", {
          fixture_id: 1,
          home_team_name: "曼联",
          away_team_name: "利物浦",
          home_logo: "/src/assets/team-manchester-united.png",
          away_logo: "/src/assets/team-liverpool.png",
          league_name: "英超",
          goals_home: 2,
          goals_away: 1
        });
        mockMatches.set("m2", {
          fixture_id: 2,
          home_team_name: "巴塞罗那",
          away_team_name: "皇家马德里",
          home_logo: "/src/assets/team-barcelona.png",
          away_logo: "/src/assets/team-real-madrid.png",
          league_name: "西甲",
          goals_home: 3,
          goals_away: 2
        });
        mockMatches.set("m3", {
          fixture_id: 3,
          home_team_name: "拜仁",
          away_team_name: "多特蒙德",
          home_logo: "/src/assets/team-bayern.png",
          away_logo: "/src/assets/team-dortmund.png",
          league_name: "德甲",
          goals_home: 1,
          goals_away: 1
        });
        mockMatches.set("m4", {
          fixture_id: 4,
          home_team_name: "巴黎圣日耳曼",
          away_team_name: "马赛",
          home_logo: "/src/assets/team-psg.png",
          away_logo: "/src/assets/team-marseille.png",
          league_name: "法甲",
          goals_home: 0,
          goals_away: 2
        });
        setMatchesMap(mockMatches);
        
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
              created_at: new Date().toISOString(),
              match: mockMatches.get("m1")
            },
            {
              id: "2",
              match_id: "m2",
              prediction: "大球 2.5",
              result: "win",
              bet_amount: 300,
              actual_payout: 600,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              match: mockMatches.get("m2")
            },
            {
              id: "3",
              match_id: "m3",
              prediction: "平局",
              result: "loss",
              bet_amount: 400,
              actual_payout: 0,
              created_at: new Date(Date.now() - 172800000).toISOString(),
              match: mockMatches.get("m3")
            },
            {
              id: "4",
              match_id: "m4",
              prediction: "客队胜",
              result: "win",
              bet_amount: 600,
              actual_payout: 1200,
              created_at: new Date(Date.now() - 259200000).toISOString(),
              match: mockMatches.get("m4")
            }
          ]
        });
        
        // 模拟跟单记录
        setCopyTradeRecords([
          {
            id: "ct1",
            followed_player_id: "p1",
            followed_player_name: "GoldenAce7788",
            followed_player_avatar: "/avatars/avatar-3.png",
            match_id: "m1",
            match_home_team: "曼联",
            match_away_team: "利物浦",
            prediction: "主队胜",
            bet_amount: 200,
            result: 'win',
            pnl: 180,
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: "ct2",
            followed_player_id: "p2",
            followed_player_name: "LuckyDragon9999",
            followed_player_avatar: "/avatars/avatar-5.png",
            match_id: "m2",
            match_home_team: "巴塞罗那",
            match_away_team: "皇家马德里",
            prediction: "大球 2.5",
            bet_amount: 300,
            result: 'loss',
            pnl: -300,
            created_at: new Date(Date.now() - 172800000).toISOString()
          },
          {
            id: "ct3",
            followed_player_id: "p1",
            followed_player_name: "GoldenAce7788",
            followed_player_avatar: "/avatars/avatar-3.png",
            match_id: "m3",
            match_home_team: "拜仁",
            match_away_team: "多特蒙德",
            prediction: "平局",
            bet_amount: 150,
            result: 'win',
            pnl: 270,
            created_at: new Date(Date.now() - 259200000).toISOString()
          }
        ]);
        
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
          setEditDisplayName(profileData.display_name || '');
          setSelectedAvatar(profileData.avatar_url || '');
        }

        // 获取余额
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        // 如果查询出错且不是"无记录"错误，记录错误
        if (balanceError && balanceError.code !== 'PGRST116') {
          console.error('Error fetching balance:', balanceError);
        }

        // 获取预测记录
        const { data: predictionsData } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        // 获取所有唯一的 match_id
        const matchIds = [...new Set(predictionsData?.map(p => p.match_id).filter(Boolean) || [])];
        
        // 获取比赛详情
        const matchesDataMap = new Map<string, MatchInfo>();
        if (matchIds.length > 0) {
          const { data: matchesData } = await supabase
            .from('daily_matches' as any)
            .select('fixture_id, home_team_name, away_team_name, home_logo, away_logo, league_name, goals_home, goals_away')
            .in('fixture_id', matchIds.map(id => parseInt(id)));
          
          if (matchesData) {
            matchesData.forEach((match: any) => {
              matchesDataMap.set(match.fixture_id.toString(), match as MatchInfo);
            });
          }
        }
        setMatchesMap(matchesDataMap);

        const totalPredictions = predictionsData?.length || 0;
        const correctPredictions = predictionsData?.filter(p => p.result === 'win').length || 0;
        const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
        const balance = balanceData?.balance ?? INITIAL_BALANCE;
        const profit = balance - INITIAL_BALANCE;

        // 关联比赛信息到预测记录
        const predictionsWithMatches = predictionsData?.map(pred => ({
          ...pred,
          match: matchesDataMap.get(pred.match_id)
        })) || [];

        setStats({
          totalPredictions,
          correctPredictions,
          winRate,
          balance,
          profit,
          recentPredictions: predictionsWithMatches
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
      {/* 返回按钮 */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>返回</span>
      </Button>

      {/* 用户预测球星卡 - 仿照AI模型卡设计 */}
      <Card 
        className="relative p-6 bg-card border-primary hover:border-opacity-50 transition-all overflow-hidden"
        style={{
          borderColor: 'hsl(var(--primary) / 0.3)',
          borderWidth: '2px'
        }}
      >
        {/* 用户头像背景 */}
        {userProfile?.avatar_url && (
          <div 
            className="absolute inset-0 opacity-10 transition-opacity duration-300"
            style={{
              backgroundImage: `url(${userProfile.avatar_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        )}
        
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
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || '用户'} />
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
                        disabled={isSaving || !editDisplayName || !editDisplayName.trim()}
                      >
                        {isSaving ? "保存中..." : "保存"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg leading-tight truncate text-white">
                  {userProfile?.display_name || '玩家'}
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
            
          </div>
        </div>
      </Card>

      {/* 标签页：历史购买记录和跟单记录 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('purchase_history') || '购买记录'}</span>
            <span className="sm:hidden">记录</span>
          </TabsTrigger>
          <TabsTrigger value="copy-trade" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('copy_trade_records') || '跟单记录'}</span>
            <span className="sm:hidden">跟单</span>
          </TabsTrigger>
        </TabsList>

        {/* 购买记录标签页 */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" />
                {t('my_purchase_history') || '我的购买记录'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentPredictions && stats.recentPredictions.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentPredictions.map((pred) => (
                    <div 
                      key={pred.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        pred.result === 'win' 
                          ? 'bg-success/10 border-success/30' 
                          : pred.result === 'loss'
                            ? 'bg-destructive/10 border-destructive/30'
                            : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(pred.created_at), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                          pred.result === 'win' 
                            ? 'bg-success/20 text-success' 
                            : pred.result === 'loss'
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {pred.result === 'win' ? '胜' : pred.result === 'loss' ? '负' : '进行中'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {pred.match?.home_team_name || '主队'} vs {pred.match?.away_team_name || '客队'}
                        </div>
                        {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined && (
                          <div className="text-sm font-mono-data">
                            {pred.match.goals_home} : {pred.match.goals_away}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          预测: <span className="text-foreground font-medium">{pred.prediction}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            投注: <span className="font-mono-data">${pred.bet_amount}</span>
                          </span>
                          <span className={pred.result === 'win' ? 'text-success font-bold' : 'text-destructive font-bold'}>
                            {pred.result === 'win' ? '+' : ''}{(pred.actual_payout - pred.bet_amount).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无购买记录
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 跟单记录标签页 */}
        <TabsContent value="copy-trade" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                {t('my_copy_trade_records') || '我的跟单记录'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {copyTradeRecords.length > 0 ? (
                <div className="space-y-3">
                  {/* 跟单统计摘要 */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">跟单次数</p>
                      <p className="text-xl font-bold font-mono-data">{copyTradeRecords.length}</p>
                    </div>
                    <div className="bg-success/10 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">盈利次数</p>
                      <p className="text-xl font-bold font-mono-data text-success">
                        {copyTradeRecords.filter(r => r.result === 'win').length}
                      </p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${
                      copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 
                        ? 'bg-success/10' 
                        : 'bg-destructive/10'
                    }`}>
                      <p className="text-xs text-muted-foreground mb-1">总盈亏</p>
                      <p className={`text-xl font-bold font-mono-data ${
                        copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 
                          ? 'text-success' 
                          : 'text-destructive'
                      }`}>
                        {copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 ? '+' : ''}
                        ${copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* 跟单记录列表 */}
                  {copyTradeRecords.map((record) => (
                    <div 
                      key={record.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        record.result === 'win' 
                          ? 'bg-success/10 border-success/30' 
                          : record.result === 'loss'
                            ? 'bg-destructive/10 border-destructive/30'
                            : 'bg-muted/30 border-border'
                      }`}
                    >
                      {/* 跟单的玩家信息 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={record.followed_player_avatar} />
                            <AvatarFallback>{record.followed_player_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{record.followed_player_name}</p>
                            <p className="text-xs text-muted-foreground">跟单对象</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                          record.result === 'win' 
                            ? 'bg-success/20 text-success' 
                            : record.result === 'loss'
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {record.result === 'win' ? (
                            <><TrendingUp className="h-3 w-3" /> 盈利</>
                          ) : record.result === 'loss' ? (
                            <><TrendingDown className="h-3 w-3" /> 亏损</>
                          ) : (
                            '进行中'
                          )}
                        </div>
                      </div>
                      
                      {/* 比赛信息 */}
                      <div className="bg-background/50 rounded-md p-2 mb-2">
                        <div className="font-medium text-sm">
                          {record.match_home_team} vs {record.match_away_team}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          预测: <span className="text-foreground">{record.prediction}</span>
                        </div>
                      </div>
                      
                      {/* 投注和盈亏信息 */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs">
                            投注: <span className="font-mono-data">${record.bet_amount}</span>
                          </span>
                          <span className={`font-bold font-mono-data ${
                            record.pnl >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {record.pnl >= 0 ? '+' : ''}${record.pnl}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>暂无跟单记录</p>
                  <p className="text-xs mt-2">前往排行榜跟单其他玩家</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/leaderboard')}
                  >
                    查看排行榜
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyPredictions;

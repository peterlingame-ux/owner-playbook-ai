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

      {/* 用户资料卡片 - 专业简洁设计 */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* 顶部用户信息 */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-primary/30">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || '用户'} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                    {userProfile?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                {/* 编辑按钮 */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="outline"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background shadow-sm"
                    >
                      <Edit2 className="h-3 w-3" />
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
              
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {userProfile?.display_name || '玩家'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">预测玩家</p>
              </div>
            </div>
            
            {/* 胜率徽章 */}
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground font-mono">
                <AnimatedWinRate value={stats?.winRate || 0} />%
              </div>
              <p className="text-xs text-muted-foreground">胜率</p>
            </div>
          </div>
        </div>

        {/* 统计数据网格 */}
        <div className="grid grid-cols-4 divide-x divide-border">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{stats?.totalPredictions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">总预测</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-success font-mono">{stats?.correctPredictions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">命中</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive font-mono">
              {(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">未中</p>
          </div>
          <div className="p-4 text-center">
            <p className={`text-2xl font-bold font-mono ${(stats?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {(stats?.profit || 0) >= 0 ? '+' : ''}{stats?.profit?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">盈亏</p>
          </div>
        </div>

        {/* 钱包余额 */}
        <div className="p-4 bg-muted/30 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">虚拟钱包余额</p>
                <p className="text-xl font-bold text-foreground font-mono">
                  ${stats?.balance?.toLocaleString() || 10000}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              开始预测
            </Button>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="history" className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            购买记录
          </TabsTrigger>
          <TabsTrigger value="copy-trade" className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            跟单记录
          </TabsTrigger>
        </TabsList>

        {/* 购买记录标签页 */}
        <TabsContent value="history" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">购买记录</h3>
              <p className="text-xs text-muted-foreground mt-1">您的预测历史</p>
            </div>
            <div className="divide-y divide-border">
              {stats?.recentPredictions && stats.recentPredictions.length > 0 ? (
                stats.recentPredictions.map((pred) => (
                  <div key={pred.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(pred.created_at), 'MM-dd HH:mm')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        pred.result === 'win' 
                          ? 'bg-success/10 text-success' 
                          : pred.result === 'loss'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {pred.result === 'win' ? '胜' : pred.result === 'loss' ? '负' : '进行中'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground text-sm">
                        {pred.match?.home_team_name || '主队'} vs {pred.match?.away_team_name || '客队'}
                      </span>
                      {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined && (
                        <span className="text-sm font-mono text-muted-foreground">
                          {pred.match.goals_home} : {pred.match.goals_away}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        预测: <span className="text-foreground">{pred.prediction}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-mono text-xs">
                          ${pred.bet_amount}
                        </span>
                        <span className={`font-bold font-mono ${
                          pred.result === 'win' ? 'text-success' : 'text-destructive'
                        }`}>
                          {pred.result === 'win' ? '+' : ''}{(pred.actual_payout - pred.bet_amount).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  暂无购买记录
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 跟单记录标签页 */}
        <TabsContent value="copy-trade" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">跟单记录</h3>
              <p className="text-xs text-muted-foreground mt-1">您跟随其他玩家的预测</p>
            </div>
            
            {copyTradeRecords.length > 0 ? (
              <>
                {/* 跟单统计 */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  <div className="p-3 text-center">
                    <p className="text-lg font-bold font-mono text-foreground">{copyTradeRecords.length}</p>
                    <p className="text-xs text-muted-foreground">跟单次数</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-lg font-bold font-mono text-success">
                      {copyTradeRecords.filter(r => r.result === 'win').length}
                    </p>
                    <p className="text-xs text-muted-foreground">盈利次数</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className={`text-lg font-bold font-mono ${
                      copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 ? '+' : ''}
                      ${copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">总盈亏</p>
                  </div>
                </div>

                {/* 跟单列表 */}
                <div className="divide-y divide-border">
                  {copyTradeRecords.map((record) => (
                    <div key={record.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={record.followed_player_avatar} />
                            <AvatarFallback className="text-xs">{record.followed_player_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{record.followed_player_name}</p>
                            <p className="text-xs text-muted-foreground">跟单对象</p>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          record.result === 'win' 
                            ? 'bg-success/10 text-success' 
                            : record.result === 'loss'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {record.result === 'win' ? (
                            <><TrendingUp className="h-3 w-3" /> 盈利</>
                          ) : record.result === 'loss' ? (
                            <><TrendingDown className="h-3 w-3" /> 亏损</>
                          ) : (
                            '进行中'
                          )}
                        </span>
                      </div>
                      
                      <div className="text-sm mb-2">
                        <span className="text-foreground font-medium">
                          {record.match_home_team} vs {record.match_away_team}
                        </span>
                        <span className="text-muted-foreground ml-2">· {record.prediction}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(record.created_at), 'MM-dd HH:mm')}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-mono">${record.bet_amount}</span>
                          <span className={`font-bold font-mono ${
                            record.pnl >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {record.pnl >= 0 ? '+' : ''}${record.pnl}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-1">暂无跟单记录</p>
                <p className="text-xs text-muted-foreground mb-4">前往排行榜跟单其他玩家</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/leaderboard')}>
                  查看排行榜
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyPredictions;

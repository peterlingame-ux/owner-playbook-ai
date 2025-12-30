import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import USDTWalletDialog from "./USDTWalletDialog";
import PlaceBetDialog from "./PlaceBetDialog";
import DirectMessageDialog from "./DirectMessageDialog";
import { Target, Wallet, Check, ArrowLeft, History, Users, TrendingUp, TrendingDown, BarChart3, CheckCircle2, Plus, Receipt, Crown, Sparkles, Copy, Zap, Award, XCircle, Clock, MessageCircle, DollarSign } from "lucide-react";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineTracking } from "@/hooks/useOnlineTracking";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface UserProfile {
  display_name: string;
  avatar_url: string;
  invitation_code?: string;
  invited_count?: number;
  signature?: string;
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
  totalWagered: number;
  totalWon: number;
  recentPredictions: Array<{
    id: string;
    match_id: string;
    prediction: string;
    prediction_type?: string;
    result: string;
    bet_amount: number;
    actual_payout: number;
    potential_payout?: number;
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
  prediction_type: 'handicap' | 'over_under';
  odds: number;
  bet_amount: number;
  result: 'win' | 'loss' | 'pending';
  pnl: number;
  created_at: string;
}

interface DepositRecord {
  id: string;
  amount: number;
  status: string;
  network: string;
  wallet_address: string;
  created_at: string;
  confirmed_at: string | null;
}

interface VipStatus {
  is_active: boolean;
  expires_at: string | null;
}

interface FollowUser {
  id: string;
  display_name: string;
  avatar_url: string;
  signature?: string;
  followed_at: string;
}

const VIP_COST = 500;

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

// 简洁的性能图表
const PerformanceChart = ({ predictions }: { predictions: Array<{ result: string; created_at: string }> }) => {
  const chartData = useMemo(() => {
    if (!predictions || predictions.length === 0) {
      return Array.from({ length: 7 }, (_, i) => ({
        date: format(subDays(new Date(), 6 - i), 'dd'),
        winRate: Math.round(50 + Math.random() * 30),
      }));
    }

    const dateGroups = new Map<string, { wins: number; total: number }>();
    
    predictions.forEach(pred => {
      if (pred.result === 'pending') return;
      const dateKey = format(new Date(pred.created_at), 'dd');
      const current = dateGroups.get(dateKey) || { wins: 0, total: 0 };
      current.total += 1;
      if (pred.result === 'win') current.wins += 1;
      dateGroups.set(dateKey, current);
    });

    const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'dd'));
    
    let cumulativeWins = 0;
    let cumulativeTotal = 0;
    
    return days.map(date => {
      const dayData = dateGroups.get(date) || { wins: 0, total: 0 };
      cumulativeWins += dayData.wins;
      cumulativeTotal += dayData.total;
      const winRate = cumulativeTotal > 0 ? Math.round((cumulativeWins / cumulativeTotal) * 100) : 0;
      return { date, winRate };
    });
  }, [predictions]);

  return (
    <div className="h-[80px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="winRate"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#performanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const MyPredictions = () => {
  const { t } = useTranslation();
  const { user, userProfile: authUserProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const { level, totalMinutes, getNextLevelProgress, formatOnlineTime } = useOnlineTracking();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchesMap, setMatchesMap] = useState<Map<string, MatchInfo>>(new Map());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [editSignature, setEditSignature] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copyTradeRecords, setCopyTradeRecords] = useState<CopyTradeRecord[]>([]);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [isPurchasingVip, setIsPurchasingVip] = useState(false);
  const [showVipConfirmDialog, setShowVipConfirmDialog] = useState(false);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [followersList, setFollowersList] = useState<FollowUser[]>([]);
  const [isLoadingFollows, setIsLoadingFollows] = useState(false);
  const [isPredictionHistoryOpen, setIsPredictionHistoryOpen] = useState(false);
  const [isSpendingRecordsOpen, setIsSpendingRecordsOpen] = useState(false);
  const [isInvitedUsersOpen, setIsInvitedUsersOpen] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string; created_at: string }>>([]);
  const [isLoadingInvitedUsers, setIsLoadingInvitedUsers] = useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'history'>('overview');
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageTargetUser, setMessageTargetUser] = useState<{ id: string; display_name: string; avatar_url: string } | null>(null);
  const [messageIsMutualFollow, setMessageIsMutualFollow] = useState(false);

  useEffect(() => {
    if (authUserProfile) {
      setUserProfile(prev => {
        const baseProfile: UserProfile = {
          display_name: authUserProfile.display_name || '',
          avatar_url: authUserProfile.avatar_url || '/avatars/avatar-1.png',
        };
        if (prev) {
          return { ...prev, ...baseProfile };
        }
        return baseProfile;
      });
      setEditDisplayName(authUserProfile.display_name || '');
      setSelectedAvatar(authUserProfile.avatar_url || '/avatars/avatar-1.png');
    }
  }, [authUserProfile]);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!user) {
        setUserProfile({
          display_name: "QuickTiger1234",
          avatar_url: "/avatars/avatar-1.png",
          signature: "Prediction Expert",
          invitation_code: "TIGER88",
          invited_count: 12
        });
        setEditDisplayName("QuickTiger1234");
        setSelectedAvatar("/avatars/avatar-1.png");
        setEditSignature("Prediction Expert");
        
        const mockMatches = new Map<string, MatchInfo>();
        mockMatches.set("m1", {
          fixture_id: 1,
          home_team_name: "Man United",
          away_team_name: "Liverpool",
          league_name: "Premier League",
          goals_home: 2,
          goals_away: 1
        });
        mockMatches.set("m2", {
          fixture_id: 2,
          home_team_name: "Barcelona",
          away_team_name: "Real Madrid",
          league_name: "La Liga",
          goals_home: 3,
          goals_away: 2
        });
        setMatchesMap(mockMatches);
        
        setStats({
          totalPredictions: 156,
          correctPredictions: 98,
          winRate: 62.8,
          balance: 12500,
          profit: 2500,
          totalWagered: 8000,
          totalWon: 10500,
          recentPredictions: [
            { id: "1", match_id: "m1", prediction: "Home +0.5", prediction_type: 'handicap', result: "win", bet_amount: 500, actual_payout: 950, created_at: new Date().toISOString(), match: mockMatches.get("m1") },
            { id: "2", match_id: "m2", prediction: "Over 2.5", prediction_type: 'over_under', result: "win", bet_amount: 300, actual_payout: 600, created_at: new Date(Date.now() - 86400000).toISOString(), match: mockMatches.get("m2") },
          ]
        });
        
        setCopyTradeRecords([
          { id: 'ct1', followed_player_id: 'p1', followed_player_name: 'ProTrader88', followed_player_avatar: '/avatars/avatar-3.png', match_id: 'm1', match_home_team: 'Man United', match_away_team: 'Liverpool', prediction: 'Home +0.5', prediction_type: 'handicap', odds: 1.85, bet_amount: 100, result: 'win', pnl: 85, created_at: new Date().toISOString() },
        ]);
        
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;

        const { data: profileData } = await supabase
          .from('users')
          .select('display_name, avatar_url, invitation_code, invited_count, signature')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData as UserProfile);
          setEditDisplayName(profileData.display_name || '');
          setSelectedAvatar(profileData.avatar_url || '');
          setEditSignature((profileData as any).signature || '');
        }

        const { data: balanceData } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: usdtData } = await supabase
          .from('usdt_wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (usdtData) setUsdtBalance(usdtData.balance || 0);

        const { data: predictionsData } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        const matchIds = [...new Set(predictionsData?.map(p => p.match_id).filter(Boolean) || [])];
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
        
        // Calculate totalWagered and totalWon from predictions
        const totalWagered = predictionsData?.reduce((sum, p) => sum + (p.bet_amount || 0), 0) || 0;
        const totalWon = predictionsData?.filter(p => p.result === 'win').reduce((sum, p) => sum + (p.actual_payout || 0), 0) || 0;

        const predictionsWithMatches = predictionsData?.map(pred => ({
          ...pred,
          match: matchesDataMap.get(pred.match_id)
        })) || [];

        setStats({ totalPredictions, correctPredictions, winRate, balance, profit, totalWagered, totalWon, recentPredictions: predictionsWithMatches });

        const { data: vipData } = await supabase
          .from('user_vip')
          .select('is_active, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vipData && vipData.is_active && new Date(vipData.expires_at) > new Date()) {
          setVipStatus({ is_active: true, expires_at: vipData.expires_at });
        } else {
          setVipStatus({ is_active: false, expires_at: null });
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, [user]);

  useEffect(() => {
    const fetchFollowData = async () => {
      if (!user) {
        setFollowingList([
          { id: 'demo1', display_name: 'GoldenAce7788', avatar_url: '/avatars/avatar-3.png', signature: 'Streak King', followed_at: new Date(Date.now() - 86400000 * 2).toISOString() },
          { id: 'demo2', display_name: 'LuckyDragon9999', avatar_url: '/avatars/avatar-5.png', signature: 'Steady Player', followed_at: new Date(Date.now() - 86400000 * 5).toISOString() }
        ]);
        setFollowersList([
          { id: 'demo3', display_name: 'StarPlayer123', avatar_url: '/avatars/avatar-2.png', signature: 'Newbie', followed_at: new Date(Date.now() - 86400000 * 1).toISOString() }
        ]);
        return;
      }

      setIsLoadingFollows(true);
      try {
        const { data: followingData } = await supabase
          .from('user_follows')
          .select('id, following_id, created_at')
          .eq('follower_id', user.id)
          .order('created_at', { ascending: false });

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map(f => f.following_id);
          const { data: usersData } = await supabase
            .from('users')
            .select('id, display_name, avatar_url, signature')
            .in('id', followingIds);

          if (usersData) {
            const list = followingData.map(f => {
              const userData = usersData.find(u => u.id === f.following_id);
              return {
                id: f.following_id,
                display_name: userData?.display_name || 'Unknown',
                avatar_url: userData?.avatar_url || '/avatars/avatar-1.png',
                signature: userData?.signature || '',
                followed_at: f.created_at
              };
            });
            setFollowingList(list);
          }
        }

        const { data: followersData } = await supabase
          .from('user_follows')
          .select('id, follower_id, created_at')
          .eq('following_id', user.id)
          .order('created_at', { ascending: false });

        if (followersData && followersData.length > 0) {
          const followerIds = followersData.map(f => f.follower_id);
          const { data: usersData } = await supabase
            .from('users')
            .select('id, display_name, avatar_url, signature')
            .in('id', followerIds);

          if (usersData) {
            const list = followersData.map(f => {
              const userData = usersData.find(u => u.id === f.follower_id);
              return {
                id: f.follower_id,
                display_name: userData?.display_name || 'Unknown',
                avatar_url: userData?.avatar_url || '/avatars/avatar-1.png',
                signature: userData?.signature || '',
                followed_at: f.created_at
              };
            });
            setFollowersList(list);
          }
        }
      } catch (error) {
        console.error('Error fetching follow data:', error);
      } finally {
        setIsLoadingFollows(false);
      }
    };

    fetchFollowData();
  }, [user]);

  const fetchInvitedUsers = async () => {
    if (!user || !userProfile?.invitation_code) return;
    setIsLoadingInvitedUsers(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, created_at')
        .eq('invited_by', userProfile.invitation_code)
        .order('created_at', { ascending: false });
      setInvitedUsers(data || []);
    } catch (error) {
      console.error('Error fetching invited users:', error);
    } finally {
      setIsLoadingInvitedUsers(false);
    }
  };

  const handleVipButtonClick = () => {
    if (!user) {
      toast.error(t('vip_login_required'));
      navigate('/auth');
      return;
    }
    if (usdtBalance < VIP_COST) {
      toast.error(t('vip_insufficient_balance'));
      return;
    }
    setShowVipConfirmDialog(true);
  };

  const handleConfirmPurchaseVip = async () => {
    if (!user) return;
    setShowVipConfirmDialog(false);
    setIsPurchasingVip(true);
    try {
      const { data, error } = await supabase.rpc('purchase_vip', {
        p_user_id: user.id,
        p_duration_days: 30,
        p_cost: VIP_COST
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; expires_at?: string; new_balance?: number };
      if (result.success) {
        setVipStatus({ is_active: true, expires_at: result.expires_at || null });
        if (result.new_balance !== undefined) setUsdtBalance(result.new_balance);
        toast.success(t('vip_activated'));
      } else {
        toast.error(result.error || t('purchase_failed'));
      }
    } catch (error) {
      toast.error(t('purchase_failed'));
    } finally {
      setIsPurchasingVip(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      setUserProfile({ display_name: editDisplayName, avatar_url: selectedAvatar, signature: editSignature });
      setIsEditDialogOpen(false);
      toast.success("Profile updated!");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: editDisplayName, avatar_url: selectedAvatar, signature: editSignature })
        .eq('id', user.id);

      if (error) throw error;
      setUserProfile(prev => ({ ...prev, display_name: editDisplayName, avatar_url: selectedAvatar, signature: editSignature }) as UserProfile);
      await refreshUserProfile();
      setIsEditDialogOpen(false);
      toast.success("Profile updated!");
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const copyInvitationCode = () => {
    if (userProfile?.invitation_code) {
      navigator.clipboard.writeText(userProfile.invitation_code);
      toast.success("Invitation code copied!");
    }
  };

  if (!user && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">{t('login_to_view_stats')}</p>
        <Button onClick={() => navigate('/auth')}>{t('login_now_btn')}</Button>
      </div>
    );
  }

  const profitRate = stats?.recentPredictions?.reduce((sum, p) => sum + p.bet_amount, 0) || 0;
  const calculatedProfitRate = profitRate > 0 ? ((stats?.profit || 0) / profitRate * 100) : 0;

  return (
    <div className="pb-24">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="uppercase tracking-wider text-xs font-medium">Back</span>
        </button>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-medium">
              Edit Profile
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-light tracking-wide">Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Display Name</Label>
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="h-12 bg-background border-border"
                  maxLength={20}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bio</Label>
                <Input
                  value={editSignature}
                  onChange={(e) => setEditSignature(e.target.value)}
                  className="h-12 bg-background border-border"
                  maxLength={50}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Avatar</Label>
                <div className="grid grid-cols-3 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedAvatar === avatar 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Avatar className="h-full w-full rounded-none">
                        <AvatarImage src={avatar} className="object-cover" />
                      </Avatar>
                      {selectedAvatar === avatar && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-6 w-6 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-12" onClick={handleSaveProfile} disabled={isSaving || !editDisplayName?.trim()}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Layout - PC: 2 columns, Mobile: single column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Hero Section */}
          <TooltipProvider delayDuration={100}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center lg:text-left space-y-4 p-6 rounded-2xl bg-card border border-border"
          >
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 lg:h-24 lg:w-24 border-4 border-background shadow-2xl">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="text-2xl font-light bg-muted">
                    {userProfile?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                {vipStatus?.is_active && (
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1.5 border-2 border-background">
                    <Crown className="h-3.5 w-3.5 text-background" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2 flex-1">
                <h1 className="text-xl lg:text-2xl font-light tracking-wide text-foreground">
                  {userProfile?.display_name || 'Player'}
                </h1>
                <p className="text-sm text-muted-foreground font-light">
                  {userProfile?.signature || t('prediction_expert')}
                </p>
                
                {/* Level Progress */}
                {(() => {
                  const progress = user ? getNextLevelProgress() : { current: 45, required: 60, percentage: 75 };
                  const currentLevel = user ? level : 1;
                  const nextLevel = Math.min(50, currentLevel + 1);
                  const isMax = currentLevel >= 50;
                  
                  return (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Lv.{currentLevel}</span>
                        <span className="text-xs text-muted-foreground">
                          {isMax ? t('max_level') : `Lv.${nextLevel}`}
                        </span>
                      </div>
                      
                      {/* Progress Bar with Shimmer */}
                      <div className="relative h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full"
                        />
                        {/* Shimmer Effect */}
                        <motion.div
                          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          initial={{ x: '-100%' }}
                          animate={{ x: '400%' }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground text-center">
                        {progress.current}m / {progress.required}m {t('to_next_level')}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Follow Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 border-t border-border">
              {/* 关注 - 点击跳转到我的关注页面 */}
              <button 
                className="text-center hover:opacity-70 transition-opacity"
                onClick={() => navigate('/my-following')}
              >
                <p className="text-lg font-light text-foreground">{followingList.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('following_label')}</p>
              </button>

              <div className="w-px h-8 bg-border" />

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-center hover:opacity-70 transition-opacity">
                    <p className="text-lg font-light text-foreground">{followersList.length}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('followers_label')}</p>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-light">{t('followers_label')} ({followersList.length})</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                    {followersList.map((u) => {
                      const isMutualFollow = followingList.some(f => f.id === u.id);
                      return (
                        <div key={u.id} className="py-4 flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback>{u.display_name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{u.display_name}</p>
                              {isMutualFollow && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t('mutual_follow')}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.signature || t('no_bio')}</p>
                          </div>
                          {isMutualFollow && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setMessageTargetUser({ id: u.id, display_name: u.display_name, avatar_url: u.avatar_url });
                                setMessageIsMutualFollow(true);
                                setMessageDialogOpen(true);
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    {followersList.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">{t('no_followers_yet')}</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <div className="w-px h-8 bg-border" />

              <button 
                onClick={() => setIsWalletDialogOpen(true)}
                className="text-center hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-light text-foreground">{(stats?.balance || 10000).toLocaleString()}</p>
                  <img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('hunter_balance')}</p>
              </button>
            </div>
          </motion.div>
          </TooltipProvider>

          {/* Wallet Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            
            
            <div className="space-y-2">
              {/* Virtual Wallet */}
              <Dialog open={isPredictionHistoryOpen} onOpenChange={setIsPredictionHistoryOpen}>
                <DialogTrigger asChild>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="w-full text-left rounded-xl bg-card border border-border p-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('virtual_balance')}</span>
                        <p className="text-xl font-light text-foreground">
                          ${(stats?.balance || 10000).toLocaleString()}
                        </p>
                      </div>
                      <motion.span 
                        className="text-xs text-muted-foreground group-hover:text-primary transition-colors"
                        whileHover={{ x: 3 }}
                      >
                        {t('view_arrow')}
                      </motion.span>
                    </div>
                  </motion.button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="font-light text-xl">{t('prediction_history_title')}</DialogTitle>
                  </DialogHeader>
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-3 py-4 border-b border-border">
                    <div className="text-center">
                      <p className="text-xl font-light text-foreground">{stats?.totalPredictions || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('total_bets_label')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-light text-primary">{stats?.correctPredictions || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('won_status')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-light text-destructive">{(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0) - (stats?.recentPredictions?.filter(p => p.result === 'pending').length || 0)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('lost_status')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-light text-amber-500">{stats?.recentPredictions?.filter(p => p.result === 'pending').length || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('pending')}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 py-4">
                    {(stats?.recentPredictions || []).length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>{t('no_predictions_yet')}</p>
                      </div>
                    ) : (
                      stats?.recentPredictions.map((pred) => {
                        const profit = pred.actual_payout - pred.bet_amount;
                        const isWin = pred.result === 'win';
                        const isLoss = pred.result === 'loss';
                        const isPending = pred.result === 'pending';
                        
                        return (
                          <div 
                            key={pred.id} 
                            className={`rounded-xl border p-4 ${
                              isWin ? 'border-primary/30 bg-primary/5' : 
                              isLoss ? 'border-destructive/30 bg-destructive/5' : 
                              'border-amber-500/30 bg-amber-500/5'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(pred.created_at), 'yyyy-MM-dd HH:mm')}
                                </span>
                                {pred.match?.league_name && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {pred.match.league_name}
                                  </span>
                                )}
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                                isWin ? 'bg-primary/20 text-primary' : 
                                isLoss ? 'bg-destructive/20 text-destructive' : 
                                'bg-amber-500/20 text-amber-500'
                              }`}>
                                {isWin ? <CheckCircle2 className="h-3 w-3" /> : isLoss ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {isWin ? t('won_status') : isLoss ? t('lost_status') : t('pending')}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {pred.match?.home_team_name || 'Home'} vs {pred.match?.away_team_name || 'Away'}
                                </p>
                                {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined && !isPending && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('final_score')}: {pred.match.goals_home} - {pred.match.goals_away}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    {pred.prediction_type === 'handicap' ? t('bet_type_handicap') : t('bet_type_over_under')}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{pred.prediction}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{t('bet_amount')}: ${pred.bet_amount}</p>
                                {!isPending && (
                                  <p className={`text-lg font-light ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                    {profit >= 0 ? '+' : ''}{profit.toFixed(0)}
                                  </p>
                                )}
                                {isPending && (
                                  <p className="text-lg font-light text-amber-500">
                                    +{((pred.potential_payout || pred.bet_amount * 1.9) - pred.bet_amount).toFixed(0)}?
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* VIP Privileges Card */}
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-full text-left rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-background border border-amber-500/30 p-3 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all group"
                onClick={() => setShowVipConfirmDialog(true)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('vip_privileges')}</span>
                    <p className="text-base font-light text-foreground">
                      {vipStatus?.is_active ? t('vip_active') : t('unlock_vip')}
                    </p>
                  </div>
                  {vipStatus?.is_active ? (
                    <motion.span 
                      className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-500"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {t('vip_badge')}
                    </motion.span>
                  ) : (
                    <motion.span 
                      className="text-xs text-muted-foreground group-hover:text-amber-500 transition-colors"
                      whileHover={{ x: 3 }}
                    >
                      {t('view_arrow')}
                    </motion.span>
                  )}
                </div>
              </motion.button>

              {/* Start Predicting Button */}
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="w-full text-left rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-background border border-primary/30 p-3 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all group"
                onClick={() => setIsBetDialogOpen(true)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('prediction_game')}</span>
                    <p className="text-base font-light text-foreground">{t('start_predicting')}</p>
                  </div>
                  <motion.span 
                    className="text-xs text-muted-foreground group-hover:text-primary transition-colors"
                    whileHover={{ x: 3 }}
                  >
                    {t('view_arrow')}
                  </motion.span>
                </div>
              </motion.button>

            </div>
          </motion.div>
        </div>

        {/* Right Column - Stats & Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Win Rate Hero */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 p-6 lg:p-8"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t('win_rate')}</p>
                <p className="text-5xl lg:text-6xl font-extralight text-foreground tracking-tight">
                  {(stats?.winRate || 0).toFixed(1)}
                  <span className="text-2xl lg:text-3xl text-muted-foreground">%</span>
                </p>
                <p className="text-sm text-primary mt-3">
                  {t('top_percent_players', { percent: Math.min(99, Math.round(100 - (stats?.winRate || 0))) })}
                </p>
              </div>
              <div className="w-full lg:w-48 h-24">
                <PerformanceChart predictions={stats?.recentPredictions || []} />
              </div>
            </div>
          </motion.div>

          {/* Stats Grid - 7 Parameters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {/* Row 1: Core Stats - 4 cards */}
            <div className="grid grid-cols-4 gap-3">
              {/* 1. Total Predictions - 总预测 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 sm:p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-light text-foreground tabular-nums">{stats?.totalPredictions || 0}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t('total_predictions_count')}</p>
                </div>
              </div>

              {/* 2. Correct - 正确 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 sm:p-4 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-light text-emerald-500 tabular-nums">{stats?.correctPredictions || 0}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t('correct_count')}</p>
                </div>
              </div>

              {/* 3. Wrong - 错误 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 sm:p-4 hover:border-destructive/40 hover:shadow-lg hover:shadow-destructive/5 transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-light text-destructive tabular-nums">
                    {(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0) - (stats?.recentPredictions?.filter(p => p.result === 'pending').length || 0)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t('wrong_count')}</p>
                </div>
              </div>

              {/* 4. P&L - 盈亏 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 sm:p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <p className={`text-xl sm:text-2xl lg:text-3xl font-light tabular-nums ${(stats?.profit || 0) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {(stats?.profit || 0) >= 0 ? '+' : ''}${Math.abs(stats?.profit || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t('pnl_label')}</p>
                </div>
              </div>
            </div>

            {/* Row 2: Financial Stats - 3 cards */}
            <div className="grid grid-cols-3 gap-3">
              {/* 5. Virtual Bet - 虚拟下注 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 sm:p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-light text-foreground tabular-nums">
                    ${(stats?.totalWagered || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t('virtual_bet_label')}</p>
                </div>
              </div>

              {/* 6. Profit Rate - 盈利率 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 sm:p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <p className={`text-xl sm:text-2xl lg:text-3xl font-light tabular-nums ${calculatedProfitRate >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {calculatedProfitRate >= 0 ? '+' : ''}{calculatedProfitRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t('profit_rate_label')}</p>
                </div>
              </div>

              {/* 7. Profit Amount - 盈利金额 */}
              <div className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 sm:p-4 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <p className={`text-xl sm:text-2xl lg:text-3xl font-light tabular-nums ${(stats?.totalWon || 0) > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                    +${(stats?.totalWon || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t('profit_amount_label')}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Invitation Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card border border-border p-5 lg:p-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('referral_code')}</p>
                  <p className="text-xl font-mono tracking-[0.25em] text-foreground mt-1">
                    {userProfile?.invitation_code || '--------'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  className="text-center"
                  onClick={() => {
                    if ((userProfile?.invited_count || 0) > 0) {
                      setIsInvitedUsersOpen(true);
                      fetchInvitedUsers();
                    }
                  }}
                >
                  <p className="text-2xl font-light text-primary">{userProfile?.invited_count || 0}</p>
                  <p className="text-xs text-muted-foreground">{t('invited_label')}</p>
                </button>
                
                {userProfile?.invitation_code && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl border-primary/30 hover:bg-primary/10"
                    onClick={copyInvitationCode}
                  >
                    <Copy className="h-5 w-5 text-primary" />
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground pt-4 mt-4 border-t border-border">
              {t('referral_bonus_text')}
            </p>
          </motion.div>

        </div>
      </div>

      {/* Dialogs */}
      <PlaceBetDialog open={isBetDialogOpen} onOpenChange={setIsBetDialogOpen} />

      {/* VIP Confirm Dialog */}
      <Dialog open={showVipConfirmDialog} onOpenChange={setShowVipConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-light text-xl">
              <Crown className="h-5 w-5 text-amber-500" />
              {t('upgrade_to_vip')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {[
                { icon: Sparkles, title: t('vip_feature_free_access'), desc: t('vip_feature_free_access_desc') },
                { icon: Target, title: t('vip_feature_ai_reports'), desc: t('vip_feature_ai_reports_desc') },
                { icon: TrendingUp, title: t('vip_feature_alerts'), desc: t('vip_feature_alerts_desc') },
                { icon: Award, title: t('vip_feature_badge'), desc: t('vip_feature_badge_desc') },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <item.icon className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('thirty_day_vip')}</p>
                  <p className="text-2xl font-light text-foreground">{VIP_COST} {t('coins_unit')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('your_balance')}</p>
                  <p className="text-lg font-light text-amber-500">{usdtBalance.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setShowVipConfirmDialog(false)}>
              {t('back')}
            </Button>
            <Button 
              className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-background"
              onClick={handleConfirmPurchaseVip}
              disabled={usdtBalance < VIP_COST}
            >
              {t('confirm_upgrade')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invited Users Dialog */}
      <Dialog open={isInvitedUsersOpen} onOpenChange={setIsInvitedUsersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-light text-xl">Invited Users</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoadingInvitedUsers ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : invitedUsers.length > 0 ? (
              <div className="divide-y divide-border">
                {invitedUsers.map((u) => (
                  <div key={u.id} className="py-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback>{u.display_name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(u.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No invited users yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Message Dialog */}
      <DirectMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        targetUser={messageTargetUser}
        isMutualFollow={messageIsMutualFollow}
      />
    </div>
  );
};

export default MyPredictions;

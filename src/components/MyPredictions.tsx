import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PlaceBetDialog from "./PlaceBetDialog";
import DirectMessageDialog from "./DirectMessageDialog";
import { Target, Check, ArrowLeft, Users, TrendingUp, TrendingDown, Crown, Sparkles, Copy, Zap, Award, XCircle, Clock, MessageCircle, Trophy, Star, ChevronRight } from "lucide-react";
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
import TiltCard from "@/components/TiltCard";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

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

// Golden theme matching UserModelCard
const GOLDEN_THEME = {
  from: "from-amber-600/20",
  to: "to-yellow-500/5",
  accent: "text-amber-400",
  border: "border-amber-500/40",
  progress: "bg-gradient-to-r from-amber-500 to-yellow-400",
};

// Performance Chart Component
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
    <div className="h-[60px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="winRate"
            stroke="hsl(45, 93%, 47%)"
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
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [isPurchasingVip, setIsPurchasingVip] = useState(false);
  const [showVipConfirmDialog, setShowVipConfirmDialog] = useState(false);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [followersList, setFollowersList] = useState<FollowUser[]>([]);
  const [isLoadingFollows, setIsLoadingFollows] = useState(false);
  const [isPredictionHistoryOpen, setIsPredictionHistoryOpen] = useState(false);
  const [isInvitedUsersOpen, setIsInvitedUsersOpen] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string; created_at: string }>>([]);
  const [isLoadingInvitedUsers, setIsLoadingInvitedUsers] = useState(false);
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
        setMatchesMap(mockMatches);
        
        setStats({
          totalPredictions: 156,
          correctPredictions: 98,
          winRate: 62.8,
          balance: 12500,
          profit: 2500,
          totalWagered: 8000,
          totalWon: 10500,
          recentPredictions: []
        });
        
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
  const wrongPredictions = (stats?.totalPredictions || 0) - (stats?.correctPredictions || 0) - (stats?.recentPredictions?.filter(p => p.result === 'pending').length || 0);
  const isPositive = (stats?.profit || 0) >= 0;

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
            <button className="text-sm text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider font-medium">
              Edit Profile
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-amber-500/30">
            <DialogHeader>
              <DialogTitle className="text-xl font-light tracking-wide text-amber-400">Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-amber-300/70">Display Name</Label>
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="h-12 bg-background border-amber-500/30 focus:border-amber-400"
                  maxLength={20}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-amber-300/70">Bio</Label>
                <Input
                  value={editSignature}
                  onChange={(e) => setEditSignature(e.target.value)}
                  className="h-12 bg-background border-amber-500/30 focus:border-amber-400"
                  maxLength={50}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-amber-300/70">Avatar</Label>
                <div className="grid grid-cols-3 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedAvatar === avatar 
                          ? 'border-amber-400 ring-2 ring-amber-400/20' 
                          : 'border-amber-500/30 hover:border-amber-400/50'
                      }`}
                    >
                      <Avatar className="h-full w-full rounded-none">
                        <AvatarImage src={avatar} className="object-cover" />
                      </Avatar>
                      {selectedAvatar === avatar && (
                        <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                          <Check className="h-6 w-6 text-amber-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 border-amber-500/30" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black" onClick={handleSaveProfile} disabled={isSaving || !editDisplayName?.trim()}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Star Card - Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <TiltCard
          className={`group rounded-3xl bg-gradient-to-br ${GOLDEN_THEME.from} ${GOLDEN_THEME.to} backdrop-blur-sm border-2 ${GOLDEN_THEME.border} hover:border-amber-400/60 transition-all duration-300 overflow-hidden shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_-10px_rgba(245,158,11,0.5)]`}
          maxTilt={4}
          scale={1.01}
          glare={false}
        >
          {/* Animated Golden Glow Effects */}
          <motion.div 
            className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-20 -left-20 w-44 h-44 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-300/10 rounded-full blur-3xl pointer-events-none"
            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />

          {/* Star Background Image */}
          <div
            className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
            style={{
              backgroundImage: `url(${starHunsoccer})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/95 to-transparent pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 p-5 sm:p-6 lg:p-8">
            {/* Header: Avatar & Name & Profit Badge */}
            <div className="flex items-start justify-between gap-4 mb-6">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4 min-w-0">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/10 backdrop-blur-sm flex items-center justify-center p-0.5 ring-2 ring-amber-400/50 overflow-hidden">
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={userProfile?.avatar_url || "/avatars/avatar-1.png"}
                        alt={userProfile?.display_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg font-bold bg-amber-900/50 text-amber-200">
                        {(userProfile?.display_name || "U")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {vipStatus?.is_active && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full p-1.5 border-2 border-card">
                      <Crown className="h-3.5 w-3.5 text-black" />
                    </div>
                  )}
                </motion.div>

                <div className="min-w-0 flex-1">
                  <h1 className={`font-bold text-xl sm:text-2xl tracking-tight ${GOLDEN_THEME.accent} truncate`}>
                    {userProfile?.display_name || 'Player'}
                  </h1>
                  <p className="text-sm text-amber-200/60 truncate mt-0.5">
                    {userProfile?.signature || t('prediction_expert')}
                  </p>
                  
                  {/* Level Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                      Lv.{user ? level : 1}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profit Badge */}
              <div className="flex flex-col items-end gap-2">
                <div
                  className={`px-4 py-2 rounded-xl font-mono font-bold text-lg tabular-nums border inline-flex items-center gap-2 ${
                    isPositive
                      ? "bg-success/20 text-success border-success/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                  }`}
                >
                  <img src={hunterCoinIcon} alt="猎人币" className="w-5 h-5" />
                  {isPositive ? '+' : ''}{(stats?.profit || 0).toFixed(0)}
                </div>
              </div>
            </div>

            {/* Win Rate Section with Chart */}
            <div className="mb-6 p-4 rounded-2xl bg-amber-900/20 border border-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-amber-200/60 uppercase tracking-wider font-medium">
                  {t('win_rate')}
                </span>
                <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-amber-300">
                  {(stats?.winRate || 0).toFixed(1)}%
                </span>
              </div>

              <div className="relative h-2.5 bg-amber-900/40 rounded-full overflow-hidden mb-3">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${GOLDEN_THEME.progress}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stats?.winRate || 0}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "400%" }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                />
              </div>

              <PerformanceChart predictions={stats?.recentPredictions || []} />
            </div>

            {/* Stats Grid - 2x3 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
              {/* Correct */}
              <div className="text-center p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider mb-1">{t('correct')}</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-success">
                  {stats?.correctPredictions || 0}
                </p>
              </div>
              
              {/* Total */}
              <div className="text-center p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider mb-1">{t('total_predictions')}</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-300">
                  {stats?.totalPredictions || 0}
                </p>
              </div>
              
              {/* Wrong */}
              <div className="text-center p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider mb-1">{t('wrong')}</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-destructive">
                  {wrongPredictions}
                </p>
              </div>

              {/* Virtual Bet */}
              <div className="text-center p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider mb-1">{t('virtual_bet_label')}</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-300">
                  ${(stats?.totalWagered || 0).toLocaleString()}
                </p>
              </div>
              
              {/* Won */}
              <div className="text-center p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider mb-1">{t('profit_amount_label')}</p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-success">
                  +${(stats?.totalWon || 0).toLocaleString()}
                </p>
              </div>
              
              {/* Balance */}
              <div className="text-center p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider mb-1">{t('hunter_balance')}</p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-300">
                    {(stats?.balance || 10000).toLocaleString()}
                  </p>
                  <img src={hunterCoinIcon} alt="猎人币" className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Social Stats Row */}
            <div className="flex items-center justify-around py-4 mb-6 border-y border-amber-500/20">
              <button 
                className="text-center hover:opacity-70 transition-opacity"
                onClick={() => navigate('/my-following')}
              >
                <p className="text-xl font-bold text-amber-300">{followingList.length}</p>
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider">{t('following_label')}</p>
              </button>

              <div className="w-px h-10 bg-amber-500/30" />

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-center hover:opacity-70 transition-opacity">
                    <p className="text-xl font-bold text-amber-300">{followersList.length}</p>
                    <p className="text-[10px] text-amber-200/50 uppercase tracking-wider">{t('followers_label')}</p>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card border-amber-500/30">
                  <DialogHeader>
                    <DialogTitle className="font-light text-amber-400">{t('followers_label')} ({followersList.length})</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto divide-y divide-amber-500/20">
                    {followersList.map((u) => {
                      const isMutualFollow = followingList.some(f => f.id === u.id);
                      return (
                        <div key={u.id} className="py-4 flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-1 ring-amber-500/30">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback className="bg-amber-900/30 text-amber-300">{u.display_name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-amber-200 truncate">{u.display_name}</p>
                              {isMutualFollow && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{t('mutual_follow')}</span>
                              )}
                            </div>
                            <p className="text-xs text-amber-200/50 truncate">{u.signature || t('no_bio')}</p>
                          </div>
                          {isMutualFollow && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-400 hover:bg-amber-500/20"
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
                      <p className="py-8 text-center text-amber-200/50">{t('no_followers_yet')}</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <div className="w-px h-10 bg-amber-500/30" />

              <button 
                onClick={() => {
                  if ((userProfile?.invited_count || 0) > 0) {
                    setIsInvitedUsersOpen(true);
                    fetchInvitedUsers();
                  }
                }}
                className="text-center hover:opacity-70 transition-opacity"
              >
                <p className="text-xl font-bold text-amber-300">{userProfile?.invited_count || 0}</p>
                <p className="text-[10px] text-amber-200/50 uppercase tracking-wider">{t('invited_label')}</p>
              </button>
            </div>

            {/* Invitation Code */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-900/20 border border-amber-500/20 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/20">
                  <Users className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-200/50 uppercase tracking-wider">{t('referral_code')}</p>
                  <p className="text-lg font-mono tracking-[0.2em] text-amber-300">
                    {userProfile?.invitation_code || '--------'}
                  </p>
                </div>
              </div>
              
              {userProfile?.invitation_code && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-amber-400 hover:bg-amber-500/20"
                  onClick={copyInvitationCode}
                >
                  <Copy className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* CTA Button */}
            <Button
              className="w-full h-14 text-base font-semibold transition-all duration-300 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black border-0 shadow-lg shadow-amber-500/30"
              onClick={() => setIsBetDialogOpen(true)}
            >
              <Zap className="h-5 w-5 mr-2" />
              {t('start_predicting')}
            </Button>
          </div>
        </TiltCard>
      </motion.div>

      {/* Prediction History Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-6"
      >
        <Dialog open={isPredictionHistoryOpen} onOpenChange={setIsPredictionHistoryOpen}>
          <DialogTrigger asChild>
            <button className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-900/20 to-yellow-900/10 border border-amber-500/30 hover:border-amber-400/50 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/20">
                  <Trophy className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-amber-300">{t('prediction_history_title')}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-card border-amber-500/30">
            <DialogHeader>
              <DialogTitle className="font-light text-xl text-amber-400">{t('prediction_history_title')}</DialogTitle>
            </DialogHeader>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 py-4 border-b border-amber-500/20">
              <div className="text-center">
                <p className="text-xl font-light text-amber-300">{stats?.totalPredictions || 0}</p>
                <p className="text-[10px] text-amber-200/50 uppercase">{t('total_bets_label')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-light text-success">{stats?.correctPredictions || 0}</p>
                <p className="text-[10px] text-amber-200/50 uppercase">{t('won_status')}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-light text-destructive">{wrongPredictions}</p>
                <p className="text-[10px] text-amber-200/50 uppercase">{t('lost_status')}</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-light ${(stats?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(stats?.profit || 0) >= 0 ? '+' : ''}{stats?.profit || 0}
                </p>
                <p className="text-[10px] text-amber-200/50 uppercase">{t('pnl_label')}</p>
              </div>
            </div>
            
            {/* Prediction List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-4">
              {!stats?.recentPredictions?.length ? (
                <div className="py-12 text-center text-amber-200/50">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>{t('no_predictions_yet')}</p>
                </div>
              ) : (
                stats.recentPredictions.map((pred) => {
                  const isWin = pred.result === 'win';
                  const isLoss = pred.result === 'loss';
                  const isPending = pred.result === 'pending';
                  const profit = (pred.actual_payout || 0) - pred.bet_amount;
                  
                  return (
                    <div 
                      key={pred.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isPending 
                          ? 'bg-amber-500/5 border-amber-500/30' 
                          : isWin 
                            ? 'bg-success/5 border-success/30' 
                            : 'bg-destructive/5 border-destructive/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 text-xs text-amber-200/50">
                        <span>{format(new Date(pred.created_at), 'MMM dd, HH:mm')}</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          isPending 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : isWin 
                              ? 'bg-success/20 text-success' 
                              : 'bg-destructive/20 text-destructive'
                        }`}>
                          {isPending ? t('pending_status') : isWin ? t('won_status') : t('lost_status')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-200">
                            {pred.match?.home_team_name || 'Home'} vs {pred.match?.away_team_name || 'Away'}
                          </p>
                          {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined && !isPending && (
                            <p className="text-xs text-amber-200/50 mt-0.5">
                              {t('final_score')}: {pred.match.goals_home} - {pred.match.goals_away}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              {pred.prediction_type === 'handicap' ? t('bet_type_handicap') : t('bet_type_over_under')}
                            </span>
                            <span className="text-xs text-amber-200/60">{pred.prediction}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-amber-200/50">{t('bet_amount')}: ${pred.bet_amount}</p>
                          {!isPending && (
                            <p className={`text-lg font-light ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {profit >= 0 ? '+' : ''}{profit.toFixed(0)}
                            </p>
                          )}
                          {isPending && (
                            <p className="text-lg font-light text-amber-400">
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
      </motion.div>

      {/* Dialogs */}
      <PlaceBetDialog open={isBetDialogOpen} onOpenChange={setIsBetDialogOpen} />

      {/* VIP Confirm Dialog */}
      <Dialog open={showVipConfirmDialog} onOpenChange={setShowVipConfirmDialog}>
        <DialogContent className="sm:max-w-md bg-card border-amber-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-light text-xl text-amber-400">
              <Crown className="h-5 w-5" />
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
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <item.icon className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-200">{item.title}</p>
                    <p className="text-xs text-amber-200/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-200/50">{t('thirty_day_vip')}</p>
                  <p className="text-2xl font-light text-amber-300">{VIP_COST} {t('coins_unit')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-200/50">{t('your_balance')}</p>
                  <p className="text-lg font-light text-amber-400">{usdtBalance.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 border-amber-500/30" onClick={() => setShowVipConfirmDialog(false)}>
              {t('back')}
            </Button>
            <Button 
              className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black"
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
        <DialogContent className="sm:max-w-md bg-card border-amber-500/30">
          <DialogHeader>
            <DialogTitle className="font-light text-xl text-amber-400">{t('invited_users')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoadingInvitedUsers ? (
              <div className="py-8 text-center text-amber-200/50">Loading...</div>
            ) : invitedUsers.length > 0 ? (
              <div className="divide-y divide-amber-500/20">
                {invitedUsers.map((u) => (
                  <div key={u.id} className="py-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-1 ring-amber-500/30">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="bg-amber-900/30 text-amber-300">{u.display_name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-200">{u.display_name}</p>
                      <p className="text-xs text-amber-200/50">
                        Joined {format(new Date(u.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-amber-200/50">
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

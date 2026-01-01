import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import USDTWalletDialog from "./USDTWalletDialog";
import PlaceBetDialog from "./PlaceBetDialog";
import DirectMessageDialog from "./DirectMessageDialog";
import { Settings, Send, History, Trophy, Share2, Check, Play, MoreVertical, ChevronRight, Crown, Copy, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineTracking } from "@/hooks/useOnlineTracking";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

interface FollowUser {
  id: string;
  display_name: string;
  avatar_url: string;
  signature?: string;
  followed_at: string;
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
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [followersList, setFollowersList] = useState<FollowUser[]>([]);
  const [isLoadingFollows, setIsLoadingFollows] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'records' | 'invite'>('history');
  const [invitedUsers, setInvitedUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string; created_at: string }>>([]);
  const [isLoadingInvitedUsers, setIsLoadingInvitedUsers] = useState(false);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);

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
            { id: "3", match_id: "m1", prediction: "Away +1.5", prediction_type: 'handicap', result: "loss", bet_amount: 200, actual_payout: 0, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), match: mockMatches.get("m1") },
          ]
        });
        
        setFollowingList([
          { id: 'demo1', display_name: 'GoldenAce7788', avatar_url: '/avatars/avatar-3.png', signature: 'Streak King', followed_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        ]);
        setFollowersList([
          { id: 'demo3', display_name: 'StarPlayer123', avatar_url: '/avatars/avatar-2.png', signature: 'Newbie', followed_at: new Date(Date.now() - 86400000 * 1).toISOString() },
        ]);
        
        setInvitedUsers([
          { id: 'inv1', display_name: 'InvitedPlayer1', avatar_url: '/avatars/avatar-4.png', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
          { id: 'inv2', display_name: 'InvitedPlayer2', avatar_url: '/avatars/avatar-5.png', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
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
      if (!user) return;

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

  useEffect(() => {
    if (activeTab === 'invite' && userProfile?.invitation_code) {
      fetchInvitedUsers();
    }
  }, [activeTab, userProfile?.invitation_code]);

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
      toast.success(t('invitation_code_copied') || "Invitation code copied!");
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

  const currentLevel = user ? level : 1;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section with Fixed Sky Background and 3D Avatar */}
      <div className="relative">
        {/* Fixed Sky Background */}
        <div className="relative h-[320px] sm:h-[360px] overflow-hidden">
          {/* Sky background - gradient simulating sky with clouds */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, hsl(200 60% 70%) 0%, hsl(200 50% 85%) 50%, hsl(200 40% 95%) 100%)',
            }}
          />
          {/* Cloud texture overlay */}
          <div 
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 200px 100px at 20% 40%, rgba(255,255,255,0.9) 0%, transparent 70%),
                radial-gradient(ellipse 150px 80px at 70% 30%, rgba(255,255,255,0.8) 0%, transparent 70%),
                radial-gradient(ellipse 180px 90px at 50% 60%, rgba(255,255,255,0.7) 0%, transparent 70%),
                radial-gradient(ellipse 120px 60px at 85% 55%, rgba(255,255,255,0.75) 0%, transparent 70%),
                radial-gradient(ellipse 100px 50px at 15% 70%, rgba(255,255,255,0.65) 0%, transparent 70%)
              `,
            }}
          />
          
          {/* 3D Avatar Container - Centered with pop-out effect */}
          <div className="absolute inset-x-0 top-4 flex justify-center">
            <div className="relative">
              {/* Avatar Frame with rounded corners */}
              <div 
                className="relative w-[180px] h-[220px] sm:w-[220px] sm:h-[260px] overflow-hidden"
                style={{
                  borderRadius: '24px 24px 48px 48px',
                  boxShadow: '0 20px 60px -10px rgba(0,0,0,0.4), 0 10px 30px -5px rgba(0,0,0,0.2)',
                  transform: 'perspective(1000px) rotateX(2deg)',
                }}
              >
                {/* Avatar Image */}
                <img 
                  src={userProfile?.avatar_url || '/avatars/avatar-1.png'} 
                  alt={userProfile?.display_name}
                  className="w-full h-full object-cover"
                  style={{
                    transform: 'scale(1.05)',
                  }}
                />
                {/* Subtle gradient overlay for depth */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.15) 100%)',
                  }}
                />
                {/* Inner border glow for 3D effect */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: '24px 24px 48px 48px',
                    boxShadow: 'inset 0 -2px 20px rgba(0,0,0,0.1), inset 0 2px 10px rgba(255,255,255,0.1)',
                  }}
                />
              </div>

              {/* Edit Button - Bottom left of avatar, overlapping */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <button 
                    className="absolute -left-4 bottom-6 w-12 h-12 rounded-full bg-[hsl(65,60%,65%)] hover:bg-[hsl(65,60%,60%)] flex items-center justify-center shadow-lg hover:scale-105 transition-all z-10"
                    style={{
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(220 25% 15%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      <path d="M15 5l4 4" />
                    </svg>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-light tracking-wide">{t('edit_profile') || 'Edit Profile'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('display_name') || 'Display Name'}</Label>
                      <Input
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="h-12 bg-background border-border"
                        maxLength={20}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('bio') || 'Bio'}</Label>
                      <Input
                        value={editSignature}
                        onChange={(e) => setEditSignature(e.target.value)}
                        className="h-12 bg-background border-border"
                        maxLength={50}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('avatar') || 'Avatar'}</Label>
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
                      {t('cancel') || 'Cancel'}
                    </Button>
                    <Button className="flex-1 h-12" onClick={handleSaveProfile} disabled={isSaving || !editDisplayName?.trim()}>
                      {isSaving ? t('saving') || "Saving..." : t('save') || "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Gradient overlay at bottom for smooth transition to dark background */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-24"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)',
            }}
          />
        </div>

        {/* Top Right Icons */}
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
          <button 
            onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-xl bg-card/90 backdrop-blur-sm border border-border/30 flex items-center justify-center hover:bg-card transition-colors"
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Settings className="w-5 h-5 text-foreground" />
          </button>
          <button 
            className="w-11 h-11 rounded-xl bg-card/90 backdrop-blur-sm border border-border/30 flex items-center justify-center hover:bg-card transition-colors"
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: userProfile?.display_name || 'HUNSOCCER',
                  text: `Check out ${userProfile?.display_name}'s predictions!`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success(t('link_copied') || 'Link copied!');
              }
            }}
          >
            <Send className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="px-4 -mt-8">
        {/* Name + PRO Badge + Level */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {userProfile?.display_name || 'Player'}
          </h1>
          <div 
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{
              background: 'linear-gradient(135deg, hsl(25 70% 50%) 0%, hsl(35 80% 55%) 100%)',
              boxShadow: '0 2px 8px rgba(200, 120, 50, 0.3)',
            }}
          >
            <Crown className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white">Pro</span>
            <span className="text-xs font-bold text-white/90">Lv.{currentLevel}</span>
          </div>
        </div>

        {/* Bio/Signature */}
        <p className="text-sm text-muted-foreground mt-1.5">
          {userProfile?.signature || t('prediction_expert') || 'Prediction Expert'}
        </p>

        {/* Stats Row - Followers, Following, Win Rate (%) */}
        <div className="flex items-stretch gap-px mt-5 rounded-xl overflow-hidden border border-border/30">
          <button 
            onClick={() => navigate('/my-following')}
            className="flex-1 py-4 bg-card text-center hover:bg-muted/50 transition-colors"
          >
            <p className="text-xl font-bold text-foreground">{followersList.length.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('followers_label') || '粉丝'}</p>
          </button>
          <div className="w-px bg-border/30" />
          <button 
            onClick={() => navigate('/my-following')}
            className="flex-1 py-4 bg-card text-center hover:bg-muted/50 transition-colors"
          >
            <p className="text-xl font-bold text-foreground">{followingList.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('following_label') || '关注'}</p>
          </button>
          <div className="w-px bg-border/30" />
          <div className="flex-1 py-4 bg-card text-center">
            <p className="text-xl font-bold text-primary">{(stats?.winRate || 0).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{t('win_rate_percent') || '预测准确率 (%)'}</p>
          </div>
        </div>

        {/* Tabs: 历史记录 / 个人战绩 / 邀请码 */}
        <div className="mt-6">
          <div className="flex items-center gap-4 border-b border-border/30">
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'history' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t('history_records') || '历史记录'}
              {activeTab === 'history' && (
                <motion.div 
                  layoutId="tabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'records' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t('personal_records') || '个人战绩'}
              {activeTab === 'records' && (
                <motion.div 
                  layoutId="tabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('invite')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'invite' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t('invitation_code_tab') || '邀请码'}
              {activeTab === 'invite' && (
                <motion.div 
                  layoutId="tabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-4 space-y-3"
              >
                {/* Prediction History List */}
                {stats?.recentPredictions && stats.recentPredictions.length > 0 ? (
                  stats.recentPredictions.map((pred, index) => {
                    const isWin = pred.result === 'win';
                    const isLoss = pred.result === 'loss';
                    const isPending = pred.result === 'pending';
                    const profit = isWin ? (pred.actual_payout - pred.bet_amount) : isLoss ? -pred.bet_amount : 0;

                    return (
                      <motion.div
                        key={pred.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30"
                      >
                        {/* Team Logos / Match Icon */}
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
                          {pred.match?.home_logo ? (
                            <img src={pred.match.home_logo} alt="" className="w-8 h-8 object-contain" />
                          ) : (
                            <Trophy className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Match Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {pred.match?.home_team_name || 'Home'} vs {pred.match?.away_team_name || 'Away'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pred.prediction} · {format(new Date(pred.created_at), 'MM/dd HH:mm')}
                          </p>
                        </div>

                        {/* Result / Play Button */}
                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Play className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ) : (
                            <div className={`text-sm font-bold ${isWin ? 'text-success' : 'text-destructive'}`}>
                              {isWin ? '+' : ''}{profit}
                            </div>
                          )}
                          <button className="w-8 h-8 flex items-center justify-center">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t('no_predictions_yet') || 'No predictions yet'}</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsBetDialogOpen(true)}
                    >
                      {t('start_predicting') || 'Start Predicting'}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'records' && (
              <motion.div
                key="records"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-4 space-y-4"
              >
                {/* Personal Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-3xl font-bold text-foreground">{stats?.totalPredictions || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('total_predictions') || 'Total Predictions'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-3xl font-bold text-success">{stats?.correctPredictions || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('correct_predictions') || 'Correct'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-3xl font-bold text-destructive">{(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('wrong_predictions') || 'Wrong'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className={`text-3xl font-bold ${(stats?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(stats?.profit || 0) >= 0 ? '+' : ''}{stats?.profit?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t('profit_loss') || 'Profit/Loss'}</p>
                  </div>
                </div>

                {/* Balance Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('hunter_balance') || 'Hunter Coin Balance'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold text-foreground">{(stats?.balance || 10000).toLocaleString()}</p>
                        <img src={hunterCoinIcon} alt="Hunter Coin" className="w-6 h-6" />
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => setIsBetDialogOpen(true)}
                    >
                      {t('bet_now') || 'Bet Now'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'invite' && (
              <motion.div
                key="invite"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-4 space-y-4"
              >
                {/* Invitation Code Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('your_invitation_code') || 'Your Invitation Code'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-2xl font-mono font-bold text-foreground tracking-wider">
                      {userProfile?.invitation_code || 'XXXXXX'}
                    </p>
                    <button 
                      onClick={copyInvitationCode}
                      className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('invited_count', { count: userProfile?.invited_count || invitedUsers.length }) || `Invited ${invitedUsers.length} users`}
                  </p>
                </div>

                {/* Invited Users List */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{t('invited_users') || 'Invited Users'}</p>
                  {invitedUsers.length > 0 ? (
                    invitedUsers.map((invUser, index) => (
                      <motion.div
                        key={invUser.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={invUser.avatar_url} />
                          <AvatarFallback>{invUser.display_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{invUser.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('joined_on') || 'Joined'} {format(new Date(invUser.created_at), 'yyyy-MM-dd')}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>{t('no_invited_users') || 'No invited users yet'}</p>
                      <p className="text-xs mt-1">{t('share_code_hint') || 'Share your code to invite friends!'}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Place Bet Dialog */}
      <PlaceBetDialog 
        open={isBetDialogOpen} 
        onOpenChange={setIsBetDialogOpen}
      />
    </div>
  );
};

export default MyPredictions;

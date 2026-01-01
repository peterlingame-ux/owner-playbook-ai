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
  const [activeTab, setActiveTab] = useState<'history' | 'records' | 'invite' | 'starcard'>('history');
  const [invitedUsers, setInvitedUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string; created_at: string }>>([]);
  const [isLoadingInvitedUsers, setIsLoadingInvitedUsers] = useState(false);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);
  const [isVipActive, setIsVipActive] = useState(false);
  const [starCards, setStarCards] = useState<Array<{ id: string; card_name: string; card_image: string; rarity: string; obtained_at: string }>>([]);
  const [isLoadingStarCards, setIsLoadingStarCards] = useState(false);

  // Fetch VIP status
  useEffect(() => {
    const fetchVipStatus = async () => {
      if (!user) {
        setIsVipActive(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('user_vip')
          .select('is_active, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data && data.is_active && new Date(data.expires_at) > new Date()) {
          setIsVipActive(true);
        } else {
          setIsVipActive(false);
        }
      } catch (error) {
        console.error('Error fetching VIP status:', error);
        setIsVipActive(false);
      }
    };
    
    fetchVipStatus();
  }, [user]);

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

  // Fetch star cards
  const fetchStarCards = async () => {
    if (!user) {
      // Demo data for non-logged in users
      setStarCards([
        { id: '1', card_name: '梅西', card_image: '/players/player-1.png', rarity: 'legendary', obtained_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: '2', card_name: 'C罗', card_image: '/players/player-2.png', rarity: 'legendary', obtained_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      ]);
      return;
    }
    
    setIsLoadingStarCards(true);
    try {
      const { data } = await supabase
        .from('star_cards')
        .select('id, card_name, card_image, rarity, obtained_at')
        .eq('user_id', user.id)
        .order('obtained_at', { ascending: false });
      setStarCards(data || []);
    } catch (error) {
      console.error('Error fetching star cards:', error);
    } finally {
      setIsLoadingStarCards(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'starcard') {
      fetchStarCards();
    }
  }, [activeTab, user]);

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
      {/* Profile Header - Matching Reference Design Exactly */}
      <div className="relative px-4 pt-4">
        {/* Top Right Icons - Settings and Share */}
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-30">
          <button 
            onClick={() => navigate('/settings')}
            className="w-12 h-12 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
          >
            <Settings className="w-6 h-6 text-muted-foreground" />
          </button>
          <button 
            className="w-12 h-12 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
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
            <Send className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* 3D Avatar Section with Sky Background */}
        <div className="relative w-full max-w-[380px] mx-auto">
          {/* Avatar Container with special shape - rounded bottom-right */}
          <div 
            className="relative w-full aspect-[4/5] overflow-visible"
            style={{
              borderRadius: '0 0 120px 0',
            }}
          >
            {/* Sky Background */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: '0 0 120px 0',
                background: 'linear-gradient(180deg, hsl(205 70% 65%) 0%, hsl(205 60% 78%) 40%, hsl(205 50% 88%) 100%)',
              }}
            >
              {/* Cloud effects */}
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    radial-gradient(ellipse 180px 80px at 15% 35%, rgba(255,255,255,0.85) 0%, transparent 70%),
                    radial-gradient(ellipse 220px 100px at 60% 25%, rgba(255,255,255,0.75) 0%, transparent 70%),
                    radial-gradient(ellipse 160px 70px at 85% 50%, rgba(255,255,255,0.8) 0%, transparent 70%),
                    radial-gradient(ellipse 200px 90px at 40% 60%, rgba(255,255,255,0.7) 0%, transparent 70%),
                    radial-gradient(ellipse 140px 60px at 10% 70%, rgba(255,255,255,0.6) 0%, transparent 70%)
                  `,
                }}
              />
            </div>

            {/* Avatar Image - 3D Pop-out Effect */}
            <div 
              className="absolute inset-0 flex items-end justify-center"
              style={{
                transform: 'translateY(20px)',
              }}
            >
              <img 
                src={userProfile?.avatar_url || '/avatars/avatar-1.png'} 
                alt={userProfile?.display_name}
                className="h-[110%] w-auto object-cover object-top"
                style={{
                  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                  maxWidth: '120%',
                }}
              />
            </div>
          </div>

          {/* Edit Button - Yellow/Lime Circle at Bottom Left */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <button 
                className="absolute left-0 bottom-0 w-14 h-14 rounded-full flex items-center justify-center z-20 hover:scale-105 transition-transform"
                style={{
                  background: 'hsl(70 65% 55%)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                }}
              >
                {/* Pen with lines icon - matching reference */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(220 20% 15%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  <path d="M15 5l4 4" />
                  <path d="M2 18h5" />
                  <path d="M2 14h3" />
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

        {/* Profile Info - Name, Pro Badge, Signature */}
        <div className="mt-6">
          {/* Name + PRO Badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {userProfile?.display_name || 'Player'}
            </h1>
            {/* VIP Badge - Diamond shining when active, dark when inactive */}
            <div 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md relative overflow-hidden ${isVipActive ? 'animate-pulse' : ''}`}
              style={isVipActive ? {
                background: 'linear-gradient(135deg, hsl(195 85% 55%) 0%, hsl(210 90% 65%) 50%, hsl(195 80% 60%) 100%)',
                boxShadow: '0 2px 12px rgba(80, 180, 220, 0.6), 0 0 20px rgba(100, 200, 255, 0.3)',
              } : {
                background: 'linear-gradient(135deg, hsl(0 0% 25%) 0%, hsl(0 0% 35%) 100%)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Diamond shimmer effect for VIP */}
              {isVipActive && (
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="relative z-10">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <span className={`text-xs font-bold relative z-10 ${isVipActive ? 'text-white' : 'text-gray-400'}`}>VIP</span>
            </div>
          </div>

        {/* Signature / Bio */}
        <p className="text-base text-muted-foreground mt-2">
          {userProfile?.signature || t('prediction_expert') || 'Prediction Expert'}
        </p>

        {/* Level Display with Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            {/* Level Badge - Different colors based on level range */}
            {(() => {
              // Define level tier colors
              const getLevelStyle = () => {
                if (currentLevel >= 36) {
                  // Diamond: 36-50 - Cyan/Blue gradient
                  return {
                    background: 'linear-gradient(135deg, hsl(195 85% 55%) 0%, hsl(210 90% 60%) 100%)',
                    boxShadow: '0 2px 8px rgba(80, 180, 220, 0.5)',
                  };
                } else if (currentLevel >= 21) {
                  // Gold: 21-35 - Gold gradient
                  return {
                    background: 'linear-gradient(135deg, hsl(45 90% 50%) 0%, hsl(35 85% 45%) 100%)',
                    boxShadow: '0 2px 8px rgba(200, 150, 50, 0.4)',
                  };
                } else if (currentLevel >= 11) {
                  // Silver: 11-20 - Silver/Gray gradient
                  return {
                    background: 'linear-gradient(135deg, hsl(210 10% 70%) 0%, hsl(210 15% 55%) 100%)',
                    boxShadow: '0 2px 8px rgba(150, 150, 160, 0.4)',
                  };
                } else {
                  // Bronze: 1-10 - Bronze/Brown gradient
                  return {
                    background: 'linear-gradient(135deg, hsl(25 60% 50%) 0%, hsl(20 55% 40%) 100%)',
                    boxShadow: '0 2px 8px rgba(180, 120, 80, 0.4)',
                  };
                }
              };

              const getProgressBarStyle = () => {
                if (currentLevel >= 36) {
                  return 'linear-gradient(90deg, hsl(195 85% 55%) 0%, hsl(210 90% 60%) 100%)';
                } else if (currentLevel >= 21) {
                  return 'linear-gradient(90deg, hsl(45 90% 50%) 0%, hsl(35 85% 55%) 100%)';
                } else if (currentLevel >= 11) {
                  return 'linear-gradient(90deg, hsl(210 10% 70%) 0%, hsl(210 15% 60%) 100%)';
                } else {
                  return 'linear-gradient(90deg, hsl(25 60% 50%) 0%, hsl(20 55% 45%) 100%)';
                }
              };

              const levelStyle = getLevelStyle();
              const progressBarStyle = getProgressBarStyle();

              return (
                <>
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={levelStyle}
                  >
                    <span className="text-sm font-bold text-white">Lv.{currentLevel}</span>
                  </div>
                  
                  {/* Progress to Next Level */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {currentLevel >= 50 ? (t('max_level') || 'Max Level') : `${t('next_level') || 'Next'}: Lv.${currentLevel + 1}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getNextLevelProgress().current}/{getNextLevelProgress().required} {t('minutes') || 'min'}
                      </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${getNextLevelProgress().percentage}%`,
                          background: progressBarStyle,
                        }}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

        {/* Stats Row - Three Columns */}
        <div className="flex items-stretch gap-2 mt-6">
          {/* Followers */}
          <button 
            onClick={() => navigate('/my-following')}
            className="flex-1 py-4 rounded-xl border border-border/50 bg-card/50 text-center hover:bg-muted/30 transition-colors"
          >
            <p className="text-2xl font-bold text-foreground">
              {followersList.length >= 1000 ? `${(followersList.length / 1000).toFixed(1)}K` : followersList.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{t('followers_label') || 'Followers'}</p>
          </button>
          
          {/* Following */}
          <button 
            onClick={() => navigate('/my-following')}
            className="flex-1 py-4 rounded-xl border border-border/50 bg-card/50 text-center hover:bg-muted/30 transition-colors"
          >
            <p className="text-2xl font-bold text-foreground">{followingList.length}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('following_label') || 'Following'}</p>
          </button>
          
          {/* Hunter Coin Balance */}
          <div className="flex-1 py-4 rounded-xl border border-border/50 bg-card/50 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <img src={hunterCoinIcon} alt="Hunter Coin" className="w-6 h-6" />
              <p className="text-2xl font-bold text-foreground">
                {(stats?.balance || 0) >= 10000 ? `${((stats?.balance || 0) / 1000).toFixed(1)}K` : (stats?.balance || 0).toLocaleString()}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t('hunter_coin_balance') || 'Balance'}</p>
          </div>
        </div>

        {/* Tabs - Recent / Collect / Podcast style */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === 'history' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('history_records') || 'Recent'}
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === 'records' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('personal_records') || 'Collect'}
            </button>
            <button
              onClick={() => setActiveTab('invite')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === 'invite' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('invitation_code_tab') || 'Podcast'}
            </button>
            <button
              onClick={() => setActiveTab('starcard')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === 'starcard' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('star_card_tab') || '球星卡'}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
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
                {/* Main Stats Grid - 2x2 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-3xl font-bold text-foreground">{stats?.totalPredictions || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('total_predictions') || '预测'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-3xl font-bold text-success">{stats?.correctPredictions || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('correct_predictions_count') || '次正确预测'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-3xl font-bold text-destructive">{(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('wrong_predictions') || 'Wrong'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className={`text-3xl font-bold ${(stats?.profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(stats?.profit || 0) >= 0 ? '+' : ''}{stats?.profit?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t('profit_amount') || '盈利金额'}</p>
                  </div>
                </div>

                {/* Additional Stats - Win Rate & Balance */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-3xl font-bold text-foreground">{(stats?.winRate || 0).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('win_rate') || '胜率'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="text-3xl font-bold text-foreground">{(stats?.balance || 10000).toLocaleString()}</p>
                      <img src={hunterCoinIcon} alt="Hunter Coin" className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('hunter_coin_balance') || '猎人币余额'}</p>
                  </div>
                </div>

                {/* Wagered Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="text-2xl font-bold text-foreground">{(stats?.totalWagered || 0).toLocaleString()}</p>
                      <img src={hunterCoinIcon} alt="Hunter Coin" className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('total_wagered') || '总投注'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="text-2xl font-bold text-success">{(stats?.totalWon || 0).toLocaleString()}</p>
                      <img src={hunterCoinIcon} alt="Hunter Coin" className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('total_won') || '总赢得'}</p>
                  </div>
                </div>

                {/* Followers & Following Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-2xl font-bold text-foreground">{followersList.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('followers_label') || '粉丝'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border/30 text-center">
                    <p className="text-2xl font-bold text-foreground">{followingList.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('following_label') || '关注'}</p>
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
                    {t('invited_count', { count: userProfile?.invited_count || invitedUsers.length }) || `已邀请 ${invitedUsers.length} 位用户`}
                  </p>
                </div>

                {/* Star Card Reward Hint */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{t('invite_reward_title') || '邀请奖励'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('invite_reward_desc') || '每邀请5位真实新玩家，赠送球星卡解锁'}
                      </p>
                    </div>
                  </div>
                  {/* Progress indicator */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {t('invite_progress') || '邀请进度'}
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {invitedUsers.length % 5}/5
                      </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                        style={{ width: `${((invitedUsers.length % 5) / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('star_cards_earned', { count: Math.floor(invitedUsers.length / 5) }) || `已获得 ${Math.floor(invitedUsers.length / 5)} 张球星卡`}
                    </p>
                  </div>
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

            {activeTab === 'starcard' && (
              <motion.div
                key="starcard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-4 space-y-4"
              >
                {/* All Star Cards Definition */}
                {(() => {
                  const ALL_STAR_CARDS = [
                    { id: 'messi', card_name: '梅西', card_image: '/players/player-1.png', rarity: 'legendary' },
                    { id: 'ronaldo', card_name: 'C罗', card_image: '/players/player-2.png', rarity: 'legendary' },
                    { id: 'mbappe', card_name: '姆巴佩', card_image: '/players/player-3.png', rarity: 'epic' },
                    { id: 'haaland', card_name: '哈兰德', card_image: '/players/player-4.png', rarity: 'epic' },
                    { id: 'neymar', card_name: '内马尔', card_image: '/players/player-5.png', rarity: 'epic' },
                    { id: 'salah', card_name: '萨拉赫', card_image: '/players/player-6.png', rarity: 'rare' },
                    { id: 'debruyne', card_name: '德布劳内', card_image: '/players/player-7.png', rarity: 'rare' },
                    { id: 'modric', card_name: '莫德里奇', card_image: '/players/player-8.png', rarity: 'rare' },
                    { id: 'benzema', card_name: '本泽马', card_image: '/players/player-9.png', rarity: 'rare' },
                    { id: 'vinicius', card_name: '维尼修斯', card_image: '/players/player-10.png', rarity: 'common' },
                    { id: 'bellingham', card_name: '贝林厄姆', card_image: '/players/player-11.png', rarity: 'common' },
                    { id: 'saka', card_name: '萨卡', card_image: '/players/player-12.png', rarity: 'common' },
                  ];

                  const unlockedCardIds = new Set(starCards.map(c => c.card_name));
                  const unlockedCount = starCards.length;

                  const rarityColors: Record<string, string> = {
                    legendary: 'from-amber-400 via-yellow-300 to-amber-500',
                    epic: 'from-purple-400 via-pink-300 to-purple-500',
                    rare: 'from-blue-400 via-cyan-300 to-blue-500',
                    common: 'from-gray-400 via-gray-300 to-gray-500',
                  };
                  const rarityBorder: Record<string, string> = {
                    legendary: 'border-amber-400/50',
                    epic: 'border-purple-400/50',
                    rare: 'border-blue-400/50',
                    common: 'border-border',
                  };
                  const rarityLabel: Record<string, string> = {
                    legendary: '传奇',
                    epic: '史诗',
                    rare: '稀有',
                    common: '普通',
                  };

                  return (
                    <>
                      {/* Stats Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{t('star_card_collection') || '球星卡收藏'}</h3>
                          <p className="text-xs text-muted-foreground">
                            {unlockedCount}/{ALL_STAR_CARDS.length} {t('cards_unlocked') || '已解锁'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-400">
                            {Math.floor(invitedUsers.length / 5)} {t('cards_earned') || '张可解锁'}
                          </span>
                        </div>
                      </div>

                      {/* Invite Progress Hint */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Share2 className="w-4 h-4" />
                          <span>{t('invite_to_unlock') || '每邀请5位新玩家解锁1张球星卡'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                              style={{ width: `${((invitedUsers.length % 5) / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground">{invitedUsers.length % 5}/5</span>
                        </div>
                      </div>

                      {/* Star Cards Grid - Show All Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        {ALL_STAR_CARDS.map((card, index) => {
                          const isUnlocked = unlockedCardIds.has(card.card_name);

                          return (
                            <motion.div
                              key={card.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="perspective-1000"
                            >
                              <div
                                className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-500 ${
                                  isUnlocked 
                                    ? `${rarityBorder[card.rarity]} shadow-lg` 
                                    : 'border-zinc-800 grayscale'
                                }`}
                                style={{
                                  transformStyle: 'preserve-3d',
                                  animation: isUnlocked ? 'cardRotate 8s linear infinite' : 'none',
                                  background: isUnlocked 
                                    ? 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)'
                                    : 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
                                }}
                              >
                                {/* Card Inner Content */}
                                <div 
                                  className="absolute inset-0"
                                  style={{ 
                                    backfaceVisibility: 'hidden',
                                  }}
                                >
                                  {/* Rarity Glow Effect - Only for unlocked */}
                                  {isUnlocked && (
                                    <div 
                                      className={`absolute inset-0 opacity-30 bg-gradient-to-br ${rarityColors[card.rarity]}`}
                                    />
                                  )}
                                  
                                  {/* Card Image */}
                                  <div className="absolute inset-0 flex items-center justify-center p-3">
                                    <img 
                                      src={card.card_image} 
                                      alt={card.card_name}
                                      className={`w-full h-full object-contain ${
                                        isUnlocked ? 'drop-shadow-lg' : 'opacity-30 brightness-50'
                                      }`}
                                    />
                                  </div>

                                  {/* Lock Overlay for Locked Cards */}
                                  {!isUnlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                      <div className="w-12 h-12 rounded-full bg-zinc-900/80 flex items-center justify-center border border-zinc-700">
                                        <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                      </div>
                                    </div>
                                  )}

                                  {/* Card Info Overlay */}
                                  <div className={`absolute bottom-0 left-0 right-0 p-3 ${
                                    isUnlocked ? 'bg-gradient-to-t from-black/80 to-transparent' : 'bg-gradient-to-t from-black/90 to-transparent'
                                  }`}>
                                    <p className={`text-sm font-bold truncate ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                                      {card.card_name}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className={`text-xs font-medium ${
                                        isUnlocked 
                                          ? `bg-gradient-to-r ${rarityColors[card.rarity]} bg-clip-text text-transparent`
                                          : 'text-zinc-600'
                                      }`}>
                                        {rarityLabel[card.rarity]}
                                      </span>
                                      {isUnlocked && (
                                        <span className="text-xs text-white/60">已解锁</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Shine Effect for Unlocked Legendary */}
                                  {isUnlocked && card.rarity === 'legendary' && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                  )}

                                  {/* Holographic Effect for Unlocked Cards */}
                                  {isUnlocked && (
                                    <div 
                                      className="absolute inset-0 opacity-30"
                                      style={{
                                        background: `linear-gradient(
                                          135deg,
                                          transparent 0%,
                                          rgba(255,255,255,0.1) 45%,
                                          rgba(255,255,255,0.3) 50%,
                                          rgba(255,255,255,0.1) 55%,
                                          transparent 100%
                                        )`,
                                        animation: 'cardShine 3s ease-in-out infinite',
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
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

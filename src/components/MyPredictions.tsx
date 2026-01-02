import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import USDTWalletDialog from "./USDTWalletDialog";
import PlaceBetDialog from "./PlaceBetDialog";
import DirectMessageDialog from "./DirectMessageDialog";
import VipSubscriptionDialog from "./VipSubscriptionDialog";
import { Settings, Send, History, Trophy, Share2, Check, Play, MoreVertical, ChevronRight, Crown, Copy, CheckCircle2, XCircle, Clock, Upload, ImagePlus } from "lucide-react";
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnlineTracking } from "@/hooks/useOnlineTracking";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import hunsoccerAlphaLogo from "@/assets/hunsoccer-alpha-text-logo.png";
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
  const [isVipDialogOpen, setIsVipDialogOpen] = useState(false);
  const [starCards, setStarCards] = useState<Array<{ id: string; card_name: string; card_image: string; rarity: string; obtained_at: string }>>([]);
  const [isLoadingStarCards, setIsLoadingStarCards] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  // Fetch VIP status
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

  useEffect(() => {
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
      
      // Check if avatar is a custom uploaded one (from storage)
      const avatarUrl = authUserProfile.avatar_url || '';
      if (avatarUrl.includes('supabase') && avatarUrl.includes('avatars')) {
        setCustomAvatarUrl(avatarUrl);
      }
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
        { id: '1', card_name: 'Messi', card_image: '/starcards/mbappe-card.png', rarity: 'legendary', obtained_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: '2', card_name: 'Ronaldo', card_image: '/starcards/ronaldo-card.png', rarity: 'legendary', obtained_at: new Date(Date.now() - 86400000 * 5).toISOString() },
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
    <div className="min-h-screen bg-background pb-8 sm:pb-24 overflow-x-hidden">
      {/* Profile Header - Matching Reference Design Exactly */}
      <div className="relative px-3 sm:px-4 pt-4">

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
            <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto bg-card border-border max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-light tracking-wide">{t('edit_profile') || 'Edit Profile'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">{t('display_name') || 'Display Name'}</Label>
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="h-10 sm:h-12 bg-background border-border text-sm"
                    maxLength={20}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">{t('bio') || 'Bio'}</Label>
                  <Input
                    value={editSignature}
                    onChange={(e) => setEditSignature(e.target.value)}
                    className="h-10 sm:h-12 bg-background border-border text-sm"
                    maxLength={50}
                  />
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">{t('avatar') || 'Avatar'}</Label>
                    {isVipActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
                        VIP {t('custom_upload') || '自定义上传'}
                      </span>
                    )}
                  </div>
                  
                  {/* VIP Custom Avatar Upload */}
                  {isVipActive && (
                    <div className="mb-3">
                      <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-cyan-500/30 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 hover:from-cyan-500/10 hover:to-blue-500/10 cursor-pointer transition-all group">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !user) return;
                            
                            // Validate file size (max 2MB)
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error(t('file_too_large') || '文件过大，最大2MB');
                              return;
                            }
                            
                            setIsUploadingAvatar(true);
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
                              
                              // Upload to Supabase Storage
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('avatars')
                                .upload(fileName, file, { upsert: true });
                              
                              if (uploadError) throw uploadError;
                              
                              // Get public URL
                              const { data: urlData } = supabase.storage
                                .from('avatars')
                                .getPublicUrl(fileName);
                              
                              const publicUrl = urlData.publicUrl;
                              setCustomAvatarUrl(publicUrl);
                              setSelectedAvatar(publicUrl);
                              toast.success(t('avatar_uploaded') || '头像上传成功');
                            } catch (error: any) {
                              console.error('Error uploading avatar:', error);
                              toast.error(error.message || t('upload_failed') || '上传失败');
                            } finally {
                              setIsUploadingAvatar(false);
                            }
                          }}
                          disabled={isUploadingAvatar}
                        />
                        {isUploadingAvatar ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground">{t('uploading') || '上传中...'}</span>
                          </div>
                        ) : customAvatarUrl ? (
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 border-2 border-cyan-500">
                              <AvatarImage src={customAvatarUrl} className="object-cover" />
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm text-foreground">{t('custom_avatar') || '自定义头像'}</span>
                              <span className="text-[10px] text-muted-foreground">{t('click_to_change') || '点击更换'}</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <ImagePlus className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-foreground">{t('upload_custom_avatar') || '上传自定义头像'}</span>
                            <span className="text-[10px] text-muted-foreground mt-1">{t('max_file_size') || '支持 JPG, PNG (最大2MB)'}</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                  
                  {/* Default Avatar Options */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* Show custom avatar as first option if exists */}
                    {customAvatarUrl && (
                      <button
                        onClick={() => setSelectedAvatar(customAvatarUrl)}
                        className={`relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all ${
                          selectedAvatar === customAvatarUrl 
                            ? 'border-cyan-400 ring-2 ring-cyan-400/20' 
                            : 'border-cyan-500/30 hover:border-cyan-400/50'
                        }`}
                      >
                        <Avatar className="h-full w-full rounded-none">
                          <AvatarImage src={customAvatarUrl} className="object-cover" />
                        </Avatar>
                        {selectedAvatar === customAvatarUrl && (
                          <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center">
                            <Check className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                          <span className="text-[8px] text-white">VIP</span>
                        </div>
                      </button>
                    )}
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all ${
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
                            <Check className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                <Button variant="outline" className="flex-1 h-10 sm:h-12 text-sm" onClick={() => setIsEditDialogOpen(false)}>
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button className="flex-1 h-10 sm:h-12 text-sm" onClick={handleSaveProfile} disabled={isSaving || !editDisplayName?.trim()}>
                  {isSaving ? t('saving') || "Saving..." : t('save') || "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Profile Info - Name, Pro Badge, Signature */}
        <div className="mt-6 overflow-hidden">
          {/* Name + PRO Badge */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-[180px] sm:max-w-none">
              {userProfile?.display_name || 'Player'}
            </h1>
            {/* VIP Badge - Diamond shining when active, dark when inactive - Clickable */}
            <button 
              onClick={() => setIsVipDialogOpen(true)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md relative overflow-hidden flex-shrink-0 cursor-pointer hover:scale-105 transition-transform ${isVipActive ? 'animate-pulse' : ''}`}
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
              <span className={`text-xs font-bold relative z-10 ${isVipActive ? 'text-white' : 'text-gray-400'}`}>VIP</span>
            </button>
          </div>

        {/* Signature / Bio */}
        <p className="text-sm sm:text-base text-muted-foreground mt-2 line-clamp-2 break-words">
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
                        {getNextLevelProgress().current}/{getNextLevelProgress().required} {t('minutes_unit') || 'min'}
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
        <div className="flex items-stretch gap-1 sm:gap-2 mt-4 sm:mt-6">
          {/* Followers */}
          <button 
            onClick={() => navigate('/my-following')}
            className="flex-1 py-2 sm:py-4 rounded-lg sm:rounded-xl border border-border/50 bg-card/50 text-center hover:bg-muted/30 transition-colors min-w-0 overflow-hidden"
          >
            <p className="text-base sm:text-2xl font-bold text-foreground">
              {followersList.length >= 1000 ? `${(followersList.length / 1000).toFixed(1)}K` : followersList.length}
            </p>
            <p className="text-[9px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate px-1">{t('followers_label') || '粉丝'}</p>
          </button>
          
          {/* Following */}
          <button 
            onClick={() => navigate('/my-following')}
            className="flex-1 py-2 sm:py-4 rounded-lg sm:rounded-xl border border-border/50 bg-card/50 text-center hover:bg-muted/30 transition-colors min-w-0 overflow-hidden"
          >
            <p className="text-base sm:text-2xl font-bold text-foreground">{followingList.length}</p>
            <p className="text-[9px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate px-1">{t('following_label') || '关注'}</p>
          </button>
          
          {/* Hunter Coin Balance */}
          <div className="flex-1 py-2 sm:py-4 rounded-lg sm:rounded-xl border border-border/50 bg-card/50 text-center min-w-0 overflow-hidden">
            <div className="flex items-center justify-center gap-0.5 sm:gap-1.5 px-1">
              <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3.5 h-3.5 sm:w-6 sm:h-6 flex-shrink-0" />
              <p className="text-base sm:text-2xl font-bold text-foreground truncate">
                {(stats?.balance || 0).toLocaleString()}
              </p>
            </div>
            <p className="text-[9px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate px-1">{t('hunter_coin_balance') || '猎人币'}</p>
          </div>
        </div>

        {/* Tabs - Responsive Scrollable */}
        <div className="mt-5 sm:mt-6">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'history' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('history_records') || 'History'}
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'records' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('personal_records') || 'Records'}
            </button>
            <button
              onClick={() => setActiveTab('invite')}
              className={`px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'invite' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('invitation_code_tab') || 'Invite'}
            </button>
            <button
              onClick={() => setActiveTab('starcard')}
              className={`px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === 'starcard' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('star_card_tab') || 'Cards'}
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
                            {pred.prediction
                              .replace(/^Home/i, t('prediction_home') || 'Home')
                              .replace(/^Away/i, t('prediction_away') || 'Away')
                              .replace(/^Over/i, t('prediction_over') || 'Over')
                              .replace(/^Under/i, t('prediction_under') || 'Under')
                            } · {format(new Date(pred.created_at), 'MM/dd HH:mm')}
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
                className="py-4"
              >
                {/* Single Card Style - Like Reference */}
                <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800/95 to-zinc-900 border border-zinc-700/50 overflow-hidden">
                  {/* Top Row - Predictions Stats - Responsive Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-700/50 border-b border-zinc-700/50">
                    <div className="p-3 sm:p-4 text-center border-b sm:border-b-0 border-zinc-700/50">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('total_predictions') || 'Predictions'}</p>
                      <p className="text-lg sm:text-xl font-bold text-white">
                        {stats?.totalPredictions || 0}<span className="text-zinc-400 text-xs sm:text-sm ml-0.5">{t('matches_suffix') || ''}</span>
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 text-center border-b sm:border-b-0 border-zinc-700/50">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('correct_predictions_count') || 'Correct'}</p>
                      <p className="text-lg sm:text-xl font-bold text-white">
                        {stats?.correctPredictions || 0}<span className="text-zinc-400 text-xs sm:text-sm ml-0.5">{t('matches_suffix') || ''}</span>
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 text-center">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('wrong_predictions') || 'Wrong'}</p>
                      <p className="text-lg sm:text-xl font-bold text-white">
                        {(stats?.totalPredictions || 0) - (stats?.correctPredictions || 0)}<span className="text-zinc-400 text-xs sm:text-sm ml-0.5">{t('matches_suffix') || ''}</span>
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 text-center">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('win_rate_percent') || 'Win Rate (%)'}</p>
                      <p className="text-lg sm:text-xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                        {(stats?.winRate || 0).toFixed(1)}%
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                      </p>
                    </div>
                  </div>
                  
                  {/* Bottom Row - Financial Stats - Responsive Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-700/50">
                    <div className="p-3 sm:p-4 text-center border-b sm:border-b-0 border-zinc-700/50">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('total_wagered') || 'Virtual Bet'}</p>
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-base sm:text-xl font-bold text-white">{(stats?.totalWagered || 0).toLocaleString()}</p>
                        <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 text-center border-b sm:border-b-0 border-zinc-700/50">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('profit_amount') || 'Profit'}</p>
                      <div className="flex items-center justify-center gap-1">
                        <p className={`text-base sm:text-xl font-bold ${(stats?.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(stats?.profit || 0) >= 0 ? '+' : ''}{(stats?.profit || 0).toLocaleString()}
                        </p>
                        <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 text-center">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('profit_rate') || 'Profit Rate'}</p>
                      <p className={`text-base sm:text-xl font-bold ${(stats?.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stats?.totalWagered && stats.totalWagered > 0 
                          ? `${(stats.profit || 0) >= 0 ? '+' : ''}${((stats.profit || 0) / stats.totalWagered * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 text-center">
                      <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2 truncate">{t('challenge_ai') || 'Challenge AI'}</p>
                      <p className={`text-base sm:text-xl font-bold ${(stats?.winRate || 0) >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(stats?.winRate || 0) >= 60 
                          ? (t('qualified_status') || 'Qualified')
                          : (t('not_qualified') || 'Not Qualified')
                        }
                      </p>
                    </div>
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
                {/* Combined Invitation Card */}
                <div className="p-5 rounded-2xl bg-card border border-border/50">
                  {/* Invitation Code Section */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {t('your_invitation_code') || 'Your Code'}
                      </p>
                      <p className="text-3xl font-mono font-bold text-foreground tracking-widest">
                        {userProfile?.invitation_code || 'XXXXXX'}
                      </p>
                    </div>
                    <button 
                      onClick={copyInvitationCode}
                      className="w-12 h-12 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-colors flex items-center justify-center"
                    >
                      <Copy className="w-5 h-5 text-amber-400" />
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border/50 my-4" />

                  {/* Progress Section */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src={hunsoccerAlphaLogo} alt="HUNSOCCER" className="w-7 h-7 object-contain invert dark:invert-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{t('invite_reward_title') || 'Star Card Reward'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t('invite_reward_desc') || 'Invite 5 friends for 1 star card'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">{invitedUsers.length % 5}<span className="text-muted-foreground font-normal">/5</span></p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                      style={{ width: `${((invitedUsers.length % 5) / 5) * 100}%` }}
                    />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>{t('star_cards_earned', { count: Math.floor(invitedUsers.length / 5) }) || `${Math.floor(invitedUsers.length / 5)} cards earned`}</span>
                    <span>{t('total_invited', { count: invitedUsers.length }) || `${invitedUsers.length} invited`}</span>
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
                className="py-4 space-y-6"
              >
                {(() => {
                  const ALL_STAR_CARDS = [
                    { id: 'mbappe', name_key: 'player_mbappe', card_image: '/starcards/mbappe-card.png', rarity: 'legendary' },
                    { id: 'neymar', name_key: 'player_neymar', card_image: '/starcards/neymar-card.png', rarity: 'legendary' },
                    { id: 'ronaldo', name_key: 'player_ronaldo', card_image: '/starcards/ronaldo-card.png', rarity: 'legendary' },
                    { id: 'haaland', name_key: 'player_haaland', card_image: '/starcards/haaland-card.png', rarity: 'legendary' },
                    { id: 'vinicius', name_key: 'player_vinicius', card_image: '/starcards/vinicius-card.png', rarity: 'legendary' },
                    { id: 'bellingham', name_key: 'player_bellingham', card_image: '/starcards/bellingham-card.png', rarity: 'legendary' },
                    { id: 'modric', name_key: 'player_modric', card_image: '/starcards/modric-card.png', rarity: 'legendary' },
                    { id: 'salah', name_key: 'player_salah', card_image: '/starcards/salah-card.png', rarity: 'epic' },
                    { id: 'debruyne', name_key: 'player_debruyne', card_image: '/starcards/debruyne-card.png', rarity: 'epic' },
                    { id: 'kane', name_key: 'player_kane', card_image: '/starcards/kane-card.png', rarity: 'epic' },
                    { id: 'son', name_key: 'player_son', card_image: '/starcards/son-card.png', rarity: 'rare' },
                    { id: 'dembele', name_key: 'player_dembele', card_image: '/starcards/dembele-card.png', rarity: 'rare' },
                  ];

                  // Fallback names for i18n
                  const playerNames: Record<string, string> = {
                    player_mbappe: 'Mbappé',
                    player_neymar: 'Neymar',
                    player_ronaldo: 'Ronaldo',
                    player_haaland: 'Haaland',
                    player_vinicius: 'Vinícius Jr',
                    player_bellingham: 'Bellingham',
                    player_modric: 'Modrić',
                    player_salah: 'Salah',
                    player_debruyne: 'De Bruyne',
                    player_kane: 'Kane',
                    player_son: 'Son',
                    player_dembele: 'Dembélé',
                  };

                  const unlockedCardIds = new Set(starCards.map(c => c.card_name));
                  const unlockedCount = starCards.length;
                  const availableToUnlock = Math.floor(invitedUsers.length / 5);

                  return (
                    <div className="space-y-6">
                      {/* Premium Header */}
                      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-3 sm:p-5 border border-zinc-700/50">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
                        
                        <div className="relative flex items-center justify-between">
                          <div>
                            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest mb-1">
                              {t('star_collection') || 'Star Collection'}
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                                {unlockedCount}
                              </span>
                              <span className="text-base sm:text-xl text-zinc-500">/ {ALL_STAR_CARDS.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress to next card */}
                        <div className="relative mt-3 sm:mt-5">
                          <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1.5 sm:mb-2">
                            <span className="text-zinc-400">{t('next_unlock') || 'Next unlock'}</span>
                            <span className="text-amber-400 font-medium">{invitedUsers.length % 5}/5</span>
                          </div>
                          <div className="h-1 sm:h-1.5 bg-zinc-700/50 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${((invitedUsers.length % 5) / 5) * 100}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cards Gallery - Fixed 3-Column Display */}
                      <div className="grid grid-cols-3 gap-2">
                        {ALL_STAR_CARDS.map((card, index) => {
                          const isUnlocked = unlockedCardIds.has(playerNames[card.name_key]);
                          const playerName = t(card.name_key) || playerNames[card.name_key];
                          const rarityColors = {
                            legendary: { border: 'from-amber-400 via-yellow-500 to-amber-600', glow: 'shadow-amber-500/50', text: 'text-amber-400' },
                            epic: { border: 'from-purple-400 via-pink-500 to-purple-600', glow: 'shadow-purple-500/50', text: 'text-purple-400' },
                            rare: { border: 'from-blue-400 via-cyan-500 to-blue-600', glow: 'shadow-blue-500/50', text: 'text-blue-400' },
                          };
                          const rarity = rarityColors[card.rarity as keyof typeof rarityColors] || rarityColors.rare;

                          return (
                            <motion.div
                              key={card.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05, duration: 0.4 }}
                              className="relative group"
                            >
                              {isUnlocked ? (
                                /* Unlocked Card - Full Glow Effect */
                                <div className="relative">
                                  {/* Outer Glow */}
                                  <div className={`absolute -inset-1 bg-gradient-to-r ${rarity.border} rounded-xl opacity-75 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-300`} />
                                  
                                  {/* Card Container */}
                                  <div className={`relative rounded-xl overflow-hidden shadow-lg ${rarity.glow} shadow-xl`}>
                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full" style={{ transition: 'transform 0.8s ease-in-out, opacity 0.3s' }} />
                                    
                                    <img 
                                      src={card.card_image} 
                                      alt={playerName}
                                      className="w-full aspect-[2/3] object-cover"
                                    />
                                    
                                    {/* Bottom Gradient Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                                    
                                    {/* Player Name */}
                                    <div className="absolute bottom-2 left-0 right-0 text-center">
                                      <p className="text-white font-bold text-sm drop-shadow-lg">{playerName}</p>
                                      <p className={`text-xs uppercase tracking-wider ${rarity.text}`}>
                                        {card.rarity}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Locked Card - Dark State */
                                <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                                  {/* Darkened Image */}
                                  <img 
                                    src={card.card_image} 
                                    alt={playerName}
                                    className="w-full aspect-[2/3] object-cover grayscale brightness-[0.08] contrast-75"
                                  />
                                  
                                  {/* Lock Overlay */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-2">
                                      <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                    </div>
                                    <p className="text-zinc-500 text-xs font-medium">{t('locked') || 'LOCKED'}</p>
                                  </div>
                                  
                                  {/* Bottom Info */}
                                  <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/90 to-transparent" />
                                  <div className="absolute bottom-2 left-0 right-0 text-center">
                                    <p className="text-zinc-600 font-medium text-sm">{playerName}</p>
                                    <p className="text-xs text-zinc-700 uppercase tracking-wider">{card.rarity}</p>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
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
      
      {/* VIP Subscription Dialog */}
      <VipSubscriptionDialog
        open={isVipDialogOpen}
        onOpenChange={setIsVipDialogOpen}
        isVipActive={isVipActive}
        onVipPurchased={fetchVipStatus}
      />
    </div>
  );
};

export default MyPredictions;

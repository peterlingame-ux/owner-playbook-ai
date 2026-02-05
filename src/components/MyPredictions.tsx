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
import { Settings, Send, History, Trophy, Share2, Check, Play, MoreVertical, ChevronRight, Crown, Copy, CheckCircle2, XCircle, Clock, Upload, ImagePlus, Loader2 } from "lucide-react";
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
  const { user, userProfile: authUserProfile, refreshUserProfile, refreshBalance, userBalance: authUserBalance } = useAuth();
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
  const [modelFollowsCount, setModelFollowsCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'history' | 'records' | 'invite' | 'starcard'>('history');
  const [invitedUsers, setInvitedUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string; created_at: string }>>([]);
  const [isLoadingInvitedUsers, setIsLoadingInvitedUsers] = useState(false);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);
  // 人工预测对话框状态（参考 PlayerExclusiveModelCard）
  const [showManualBetDialog, setShowManualBetDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [predictionMatches, setPredictionMatches] = useState<any[]>([]);
  const [isLoadingPredictionMatches, setIsLoadingPredictionMatches] = useState(false);
  const [manualBetType, setManualBetType] = useState<'handicap' | 'over_under'>('handicap');
  const [manualHandicapLine, setManualHandicapLine] = useState(0);
  const [manualOverUnderLine, setManualOverUnderLine] = useState(2.5);
  const [manualPrediction, setManualPrediction] = useState<string>('');
  const [manualOverUnderPick, setManualOverUnderPick] = useState<'over' | 'under'>('over');
  const [manualBetAmount, setManualBetAmount] = useState<number | ''>('');
  const [isSubmittingBet, setIsSubmittingBet] = useState(false);
  const [marketOdds, setMarketOdds] = useState<any>(null);
  const [isLoadingMarketOdds, setIsLoadingMarketOdds] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
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
        // 未登录时不显示 mockdata，设置为空状态
        setUserProfile(null);
        // 游客默认值
        setEditDisplayName(t('player_default_name'));
        setSelectedAvatar('/avatars/avatar-1.png');
        setEditSignature(t('prediction_expert'));
        setMatchesMap(new Map());
        setStats({
          totalPredictions: 0,
          correctPredictions: 0,
          winRate: 0,
          balance: 0,
          profit: 0,
          totalWagered: 0,
          totalWon: 0,
          recentPredictions: []
        });
        setFollowingList([]);
        setFollowersList([]);
        setInvitedUsers([]);
        setModelFollowsCount(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 100000;

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
  }, [user, t]);

  // 当 authUserBalance 更新时，同步更新 stats 中的余额
  useEffect(() => {
    if (authUserBalance && stats) {
      setStats(prev => prev ? {
        ...prev,
        balance: authUserBalance.balance
      } : null);
    }
  }, [authUserBalance?.balance]);

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

        // 获取模型关注数量
        const { count: modelFollowsCount, error: modelFollowsError } = await supabase
          .from('model_follows')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (modelFollowsError) {
          console.error('Error fetching model follows count:', modelFollowsError);
          setModelFollowsCount(0);
        } else {
          setModelFollowsCount(modelFollowsCount || 0);
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

  // 打开人工预测对话框（参考 PlayerExclusiveModelCard）
  const openManualBetDialog = async () => {
    if (!user) {
      toast.warning(t('login_first') || '请先登录', {
        description: t('login_to_subscribe') || '登录后即可进行预测'
      });
      navigate('/auth');
      return;
    }
    
    setShowManualBetDialog(true);
    setSelectedMatch(null);
    setIsLoadingPredictionMatches(true);
    
    try {
      // 获取用户余额
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance, available_balance, locked_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!balanceError && balanceData) {
        setUserBalance(balanceData.balance || 0);
        setAvailableBalance(balanceData.available_balance || balanceData.balance || 0);
      } else {
        setUserBalance(100000);
        setAvailableBalance(100000);
      }
      
      // 获取今日比赛（带 odds_info）
      const today = new Date().toISOString().split('T')[0];
      const { data: matchesData, error } = await supabase
        .from('daily_matches' as any)
        .select('*')
        .eq('date', today)
        .in('status_id', [1]) // 只获取未开始的比赛
        .not('odds_info', 'is', null) // 必须有赔率信息
        .order('match_time', { ascending: true })
        .limit(20);
      
      if (error) {
        console.error('Error fetching matches:', error);
        toast.error('获取比赛列表失败');
        setPredictionMatches([]);
      } else {
        setPredictionMatches(matchesData || []);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('获取比赛列表失败');
      setPredictionMatches([]);
    } finally {
      setIsLoadingPredictionMatches(false);
    }
  };

  // 获取市场赔率（当选择比赛时）
  useEffect(() => {
    const fetchMarketOdds = async () => {
      if (!showManualBetDialog || !selectedMatch) {
        setMarketOdds(null);
        return;
      }

      setIsLoadingMarketOdds(true);
      try {
        const matchId = selectedMatch.match_id || selectedMatch.mid;
        if (!matchId) {
          setMarketOdds(null);
          return;
        }

        const { data: analysesData, error } = await supabase
          .from('ai_match_analyses' as any)
          .select('bet_snapshot')
          .eq('match_id', matchId)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching market odds:', error);
          setMarketOdds(null);
          return;
        }

        if (analysesData) {
          const betSnapshot = (analysesData as any)?.bet_snapshot;
          if (betSnapshot?.allMarketOdds) {
            setMarketOdds(betSnapshot.allMarketOdds);
          } else {
            setMarketOdds(null);
          }
        } else {
          setMarketOdds(null);
        }
      } catch (error) {
        console.error('Unexpected error fetching market odds:', error);
        setMarketOdds(null);
      } finally {
        setIsLoadingMarketOdds(false);
      }
    };

    fetchMarketOdds();
  }, [showManualBetDialog, selectedMatch]);

  // 辅助函数：安全获取队伍名称
  const safeGetTeamName = (match: any, side: 'home' | 'away'): string => {
    if (side === 'home') {
      return match.mhn || match.home_team_name || match.homeTeamName || '主队';
    } else {
      return match.man || match.away_team_name || match.awayTeamName || '客队';
    }
  };

  // 辅助函数：安全获取联赛名称
  const safeGetLeagueName = (match: any): string => {
    return match.tn || match.league_name || match.competition_name || '未知联赛';
  };

  // 提交预测
  const handleManualBetSubmit = async () => {
    if (!user || !selectedMatch) return;
    
    if (manualBetType === 'handicap' && !manualPrediction) {
      toast.error('请选择预测选项');
      return;
    }
    
    if (!manualBetAmount || manualBetAmount <= 0) {
      toast.error('请输入投注金额');
      return;
    }

    if (manualBetAmount > availableBalance) {
      toast.error('余额不足');
      return;
    }

    setIsSubmittingBet(true);
    try {
      // 计算赔率
      let odds = 1.9;
      if (manualBetType === 'handicap') {
        const handicapOdds = marketOdds?.handicap?.find((h: any) => {
          const line = typeof h.line === 'number' ? h.line : parseFloat(String(h.line)) || 0;
          return line === manualHandicapLine;
        });
        if (handicapOdds) {
          odds = manualPrediction === 'HOME' ? handicapOdds.home : handicapOdds.away;
        }
      } else {
        const overUnderOdds = marketOdds?.overUnder?.find((ou: any) => {
          const line = typeof ou.line === 'number' ? ou.line : parseFloat(String(ou.line)) || 2.5;
          return line === manualOverUnderLine;
        });
        if (overUnderOdds) {
          odds = manualOverUnderPick === 'over' ? overUnderOdds.over : overUnderOdds.under;
        }
      }

      // 创建预测记录
      const matchId = selectedMatch.match_id || selectedMatch.mid;
      const matchDate = selectedMatch.date || new Date().toISOString().split('T')[0];
      const betAmount = typeof manualBetAmount === 'number' ? manualBetAmount : 0;
      const potentialPayout = betAmount * odds;

      const { error: insertError } = await supabase.rpc('place_bet', {
        p_user_id: user.id,
        p_match_id: matchId,
        p_match_date: matchDate,
        p_prediction: manualBetType === 'handicap' ? manualPrediction : manualOverUnderPick.toUpperCase(),
        p_prediction_type: manualBetType,
        p_bet_amount: betAmount,
        p_potential_payout: potentialPayout,
        p_confidence: 75,
        p_handicap_line: manualBetType === 'handicap' ? manualHandicapLine : null,
        p_over_under_line: manualBetType === 'over_under' ? manualOverUnderLine : null,
      });

      if (insertError) {
        console.error('Error creating prediction:', insertError);
        toast.error('提交预测失败');
        return;
      }

      // 刷新余额
      await refreshBalance();
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('available_balance, locked_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceData) {
        setAvailableBalance(balanceData.available_balance || 0);
      }

      toast.success('预测提交成功');
      setShowManualBetDialog(false);
      setSelectedMatch(null);
      setManualPrediction('');
      setManualBetAmount('');
      
      // 刷新预测列表和统计数据
      // 重新获取预测数据并更新 stats
      try {
        const { data: predictionsData } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (predictionsData) {
          const matchIds = [...new Set(predictionsData.map(p => p.match_id).filter(Boolean) || [])];
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

          const totalPredictions = predictionsData.length;
          const correctPredictions = predictionsData.filter(p => p.result === 'win').length;
          const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
          
          const { data: balanceData } = await supabase
            .from('user_balances')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const INITIAL_BALANCE = 100000;
          const balance = balanceData?.balance ?? INITIAL_BALANCE;
          const profit = balance - INITIAL_BALANCE;
          const totalWagered = predictionsData.reduce((sum, p) => sum + (p.bet_amount || 0), 0);
          const totalWon = predictionsData.filter(p => p.result === 'win').reduce((sum, p) => sum + (p.actual_payout || 0), 0);

          const predictionsWithMatches = predictionsData.map(pred => ({
            ...pred,
            match: matchesDataMap.get(pred.match_id)
          }));

          setStats({ 
            totalPredictions, 
            correctPredictions, 
            winRate, 
            balance, 
            profit, 
            totalWagered, 
            totalWon, 
            recentPredictions: predictionsWithMatches 
          });
        }
      } catch (error) {
        console.error('Error refreshing predictions:', error);
      }
      
      // 显示成功动画
      setShowSuccessDialog(true);
      setTimeout(() => {
        setShowSuccessDialog(false);
      }, 2500);
    } catch (error) {
      console.error('Error submitting prediction:', error);
      toast.error('提交预测失败');
    } finally {
      setIsSubmittingBet(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      setUserProfile({ display_name: editDisplayName, avatar_url: selectedAvatar, signature: editSignature });
      setIsEditDialogOpen(false);
      toast.success(t('profile_updated') || "Profile updated!");
      return;
    }
    
    // 验证名字长度（最多6个字）
    if (editDisplayName.trim().length > 6) {
      toast.error(t('name_too_long') || "名字最多只能输入6个字");
      return;
    }
    
    setIsSaving(true);
    try {
      // 构建更新对象，只包含需要更新的字段
      const updateData: { display_name: string; avatar_url: string; signature?: string } = {
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
      };
      
      // 只有在 signature 字段存在时才添加（避免 schema cache 未刷新导致的错误）
      // 先尝试更新包含 signature，如果失败则只更新其他字段
      const updateWithSignature = { ...updateData, signature: editSignature };
      
      let { error } = await supabase
        .from('users')
        .update(updateWithSignature)
        .eq('id', user.id);

      // 如果更新失败且错误提示 signature 字段不存在，则只更新其他字段
      if (error && (error.message?.includes('signature') || error.code === 'PGRST204' || error.code === '42703')) {
        console.warn('signature field not found, updating without signature:', error);
        ({ error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id));
      }

      if (error) throw error;
      setUserProfile(prev => ({ ...prev, display_name: editDisplayName, avatar_url: selectedAvatar, signature: editSignature }) as UserProfile);
      await refreshUserProfile();
      setIsEditDialogOpen(false);
      toast.success(t('profile_updated') || "Profile updated!");
    } catch (error) {
      toast.error(t('update_failed') || "Update failed");
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
    <div className="min-h-[calc(100vh-120px)] bg-background pb-20 sm:pb-24 overflow-x-hidden">
      {/* Profile Header - Matching Reference Design Exactly */}
      <div className="relative px-3 sm:px-4 pt-2 sm:pt-4">

        {/* 3D Avatar Section with Sky Background - Compact on mobile */}
        <div className="relative w-full max-w-[280px] sm:max-w-[380px] mx-auto">
          {/* Avatar Container with special shape - rounded bottom-right with mask */}
          <div 
            className="relative w-full aspect-[5/4] sm:aspect-[4/5] overflow-hidden"
            style={{
              borderRadius: '0 0 80px 0',
            }}
          >
            {/* Sky Background */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: '0 0 80px 0',
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

            {/* Avatar Image - 3D Pop-out Effect with rounded bottom-right mask */}
            <div 
              className="absolute inset-0 flex items-end justify-center overflow-hidden"
              style={{
                borderRadius: '0 0 80px 0',
              }}
            >
              <img 
                src={userProfile?.avatar_url || '/avatars/avatar-1.png'} 
                alt={userProfile?.display_name}
                className="h-full w-full object-cover"
                style={{
                  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                  objectPosition: 'center bottom',
                }}
              />
            </div>
          </div>

          {/* Edit Button - Yellow/Lime Circle at Bottom Left */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <button 
                type="button"
                className="absolute left-0 bottom-0 !w-10 sm:!w-14 !h-10 sm:!h-14 !min-w-0 !min-h-0 rounded-full flex items-center justify-center z-20 hover:scale-105 transition-transform shrink-0 whitespace-nowrap touch-manipulation"
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
                    value={!user ? (t('player_default_name') || 'Guest') : editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="h-10 sm:h-12 bg-background border-border text-sm"
                    maxLength={6}
                    disabled={!user}
                    readOnly={!user}
                    placeholder={t('name_max_6_chars') || "最多6个字"}
                  />
                  {user && editDisplayName.trim().length > 0 && (
                    <p className={`text-[10px] sm:text-xs ${editDisplayName.trim().length > 6 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {editDisplayName.trim().length}/6
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">{t('bio') || 'Bio'}</Label>
                  <Input
                    value={!user ? (t('prediction_expert') || 'Prediction Expert') : editSignature}
                    onChange={(e) => setEditSignature(e.target.value)}
                    className="h-10 sm:h-12 bg-background border-border text-sm"
                    maxLength={50}
                    disabled={!user}
                    readOnly={!user}
                  />
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">{t('avatar') || 'Avatar'}</Label>
                    {isVipActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
                        VIP {t('custom_upload')}
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
                              toast.error(t('file_too_large'));
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
                              toast.success(t('avatar_uploaded'));
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
                            <span className="text-xs text-muted-foreground">{t('uploading')}</span>
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
                            <span className="text-sm text-foreground">{t('upload_custom_avatar')}</span>
                            <span className="text-[10px] text-muted-foreground mt-1">{t('max_file_size')}</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                  
                  {/* Default Avatar Options */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* Show custom avatar as first option if exists */}
                    {customAvatarUrl && user && (
                      <button
                        type="button"
                        onClick={() => setSelectedAvatar(customAvatarUrl)}
                        className={`relative aspect-square !min-w-0 !min-h-0 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all shrink-0 whitespace-nowrap touch-manipulation ${
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
                    {AVATAR_OPTIONS.map((avatar, index) => {
                      // 游客默认显示第一个头像且不可选择
                      const isGuestDefault = !user && index === 0;
                      const isSelected = !user ? isGuestDefault : (selectedAvatar === avatar);
                      
                      return (
                        <button
                          type="button"
                          key={avatar}
                          onClick={() => user && setSelectedAvatar(avatar)}
                          disabled={!user}
                          className={`relative aspect-square !min-w-0 !min-h-0 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all shrink-0 whitespace-nowrap touch-manipulation ${
                            !user ? 'opacity-60 cursor-not-allowed' : ''
                          } ${
                            isSelected 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <Avatar className="h-full w-full rounded-none">
                            <AvatarImage src={avatar} className="object-cover" />
                          </Avatar>
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                <Button variant="outline" className="flex-1 h-10 sm:h-12 text-sm" onClick={() => setIsEditDialogOpen(false)}>
                  {t('cancel') || 'Cancel'}
                </Button>
                {!user ? (
                  <Button 
                    className="flex-1 h-10 sm:h-12 text-sm" 
                    onClick={() => navigate("/auth")}
                  >
                    {t('auth.login') || 'Login'}
                  </Button>
                ) : (
                  <Button className="flex-1 h-10 sm:h-12 text-sm" onClick={handleSaveProfile} disabled={isSaving || !editDisplayName?.trim() || editDisplayName.trim().length > 6}>
                    {isSaving ? t('saving') || "Saving..." : t('save') || "Save"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Profile Info - Name, Pro Badge, Signature */}
        <div className="mt-3 sm:mt-6 overflow-hidden">
          {/* Name + PRO Badge */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-[180px] sm:max-w-none">
              {userProfile?.display_name || t('player_default_name') || '游客'}
            </h1>
            {/* VIP Badge - Diamond shining when active, dark when inactive - Clickable */}
            <button 
              type="button"
              onClick={() => {
                toast.warning(t('vip_not_available') || '暂未开放');
              }}
              className={`flex items-center gap-1 !px-2 sm:!px-2.5 !py-1 !min-w-0 !min-h-0 rounded-md relative overflow-hidden shrink-0 whitespace-nowrap touch-manipulation cursor-pointer hover:scale-105 transition-transform ${isVipActive ? 'animate-pulse' : ''}`}
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
        <div className="mt-2 sm:mt-4">
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

        {/* Stats Row - Four Columns */}
        <div className="flex items-stretch gap-1 sm:gap-2 mt-3 sm:mt-6 shrink-0">
          {/* Followers */}
          <button 
            type="button"
            onClick={() => navigate('/my-following')}
            className="flex-1 flex flex-col !py-2 sm:!py-4 !min-w-0 !min-h-0 rounded-lg sm:rounded-xl border border-border/50 bg-card/50 text-center hover:bg-muted/30 transition-colors overflow-hidden shrink-0 touch-manipulation"
          >
            <div className="flex-1 flex items-center justify-center min-h-[28px] sm:min-h-[36px]">
              <p className="text-base sm:text-2xl font-bold text-foreground whitespace-nowrap">
                {followersList.length >= 1000 ? `${(followersList.length / 1000).toFixed(1)}K` : followersList.length}
              </p>
            </div>
            <p className="text-[9px] sm:text-sm text-muted-foreground mt-auto truncate px-1 shrink-0 whitespace-nowrap">{t('followers_label') || '粉丝'}</p>
          </button>
          
          {/* Following */}
          <button 
            type="button"
            onClick={() => navigate('/my-following')}
            className="flex-1 flex flex-col !py-2 sm:!py-4 !min-w-0 !min-h-0 rounded-lg sm:rounded-xl border border-border/50 bg-card/50 text-center hover:bg-muted/30 transition-colors overflow-hidden shrink-0 touch-manipulation"
          >
            <div className="flex-1 flex items-center justify-center min-h-[28px] sm:min-h-[36px]">
              <p className="text-base sm:text-2xl font-bold text-foreground whitespace-nowrap">{followingList.length}</p>
            </div>
            <p className="text-[9px] sm:text-sm text-muted-foreground mt-auto truncate px-1 shrink-0 whitespace-nowrap">{t('following_label') || '关注'}</p>
          </button>
          
          {/* Model Follows */}
          <button 
            type="button"
            onClick={() => navigate('/my-model-follows')}
            className="flex-1 flex flex-col !py-2 sm:!py-4 !min-w-0 !min-h-0 rounded-lg sm:rounded-xl border border-border/50 bg-card/50 text-center hover:bg-muted/30 transition-colors overflow-hidden shrink-0 touch-manipulation"
          >
            <div className="flex-1 flex items-center justify-center min-h-[28px] sm:min-h-[36px]">
              <p className="text-base sm:text-2xl font-bold text-foreground whitespace-nowrap">{modelFollowsCount}</p>
            </div>
            <p className="text-[9px] sm:text-sm text-muted-foreground mt-auto truncate px-1 shrink-0 whitespace-nowrap">{t('model_follows_label') || '模型关注'}</p>
          </button>
          
          {/* Hunter Coin Balance */}
          <div className="flex-1 flex flex-col py-2 sm:py-4 rounded-lg sm:rounded-xl border border-border/50 bg-card/50 text-center min-w-0 overflow-hidden">
            <div className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1.5 px-0.5 min-w-0 min-h-[28px] sm:min-h-[36px]">
              <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3 h-3 sm:w-5 sm:h-5 flex-shrink-0" />
              <p className="text-[11px] sm:text-lg font-bold text-foreground min-w-0">
                {(authUserBalance?.balance ?? stats?.balance ?? 0).toLocaleString()}
              </p>
            </div>
            <p className="text-[9px] sm:text-sm text-muted-foreground mt-auto truncate px-1 shrink-0">{t('hunter_coin_balance') || '猎人币'}</p>
          </div>
        </div>

        {/* Tabs - Responsive Scrollable */}
        <div className="mt-3 sm:mt-6 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide pb-1.5 sm:pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`!px-2.5 sm:!px-5 !py-1.5 sm:!py-2.5 !min-w-0 !min-h-0 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 touch-manipulation ${
                activeTab === 'history' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('history_records') || 'History'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`!px-2.5 sm:!px-5 !py-1.5 sm:!py-2.5 !min-w-0 !min-h-0 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 touch-manipulation ${
                activeTab === 'records' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('personal_records') || 'Records'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invite')}
              className={`!px-2.5 sm:!px-5 !py-1.5 sm:!py-2.5 !min-w-0 !min-h-0 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 touch-manipulation ${
                activeTab === 'invite' 
                  ? 'bg-foreground text-background' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('invitation_code_tab') || 'Invite'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('starcard')}
              className={`!px-2.5 sm:!px-5 !py-1.5 sm:!py-2.5 !min-w-0 !min-h-0 rounded-full text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 touch-manipulation ${
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
        <div className="mt-4 shrink-0">
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
                            <div className="w-8 h-8 rounded-full bg-muted" />
                          )}
                        </div>

                        {/* Match Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {pred.match?.home_team_name || t('prediction_home') || '主队'} vs {pred.match?.away_team_name || t('prediction_away') || '客队'}
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
                            <button type="button" className="!w-8 !h-8 !min-w-0 !min-h-0 rounded-full bg-muted flex items-center justify-center shrink-0 whitespace-nowrap touch-manipulation">
                              <Play className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ) : (
                            <div className={`flex items-center gap-1 text-sm font-bold ${isWin ? 'text-success' : 'text-destructive'}`}>
                              <span>{isWin ? '+' : ''}{profit}</span>
                              <img src={hunterCoinIcon} alt="Hunter Coin" className="w-4 h-4" />
                            </div>
                          )}
                          <button type="button" className="!w-8 !h-8 !min-w-0 !min-h-0 flex items-center justify-center shrink-0 whitespace-nowrap touch-manipulation">
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
                      type="button"
                      className="mt-4 !px-4 sm:!px-6 !py-2 sm:!py-3 !min-w-0 !min-h-0 shrink-0 whitespace-nowrap touch-manipulation" 
                      onClick={() => openManualBetDialog()}
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
                  
                  {/* Middle Row - Financial Stats - Responsive Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-700/50 border-b border-zinc-700/50">
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
                  
                  {/* Bottom Row - Prize Share */}
                  <div className="p-3 sm:p-4 text-center">
                    <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 sm:mb-2">{t('prize_share') || '平分奖金'}</p>
                    {(stats?.winRate || 0) >= 60 ? (
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-lg sm:text-2xl font-bold text-amber-400 animate-pulse">
                          ${((1000000 / Math.max(1, Math.floor(Math.random() * 50) + 10))).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <span className="text-[10px] sm:text-xs text-amber-400/70 ml-1">{t('estimated') || '预估'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-lg sm:text-2xl font-bold text-zinc-500">$0</p>
                        <span className="text-[9px] sm:text-[10px] text-zinc-500">{t('reach_qualification_for_prize') || '达标后可参与奖金分配'}</span>
                      </div>
                    )}
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
                        {t('your_invitation_code') || 'Your Invitation Code'}
                      </p>
                      <p className="text-3xl font-mono font-bold text-foreground tracking-widest">
                        {userProfile?.invitation_code || 'XXXXX'}
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={copyInvitationCode}
                      className="!w-12 !h-12 !min-w-0 !min-h-0 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-colors flex items-center justify-center shrink-0 whitespace-nowrap touch-manipulation"
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

      {/* 人工预测对话框（参考 PlayerExclusiveModelCard） */}
      <Dialog open={showManualBetDialog} onOpenChange={(open) => {
        setShowManualBetDialog(open);
        if (!open) {
          setSelectedMatch(null);
          setManualPrediction('');
          setManualBetAmount('');
        }
      }}>
        <DialogContent className="sm:max-w-md w-[calc(100%-24px)] max-w-[360px] max-h-[80vh] p-0 gap-0 bg-background border-border rounded-xl overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-sm font-medium text-foreground">
              {selectedMatch ? '人工下注' : '选择比赛'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-60px)] overscroll-contain">
            {/* Step 1: Match Selection */}
            {!selectedMatch ? (
              <div className="p-3 space-y-2">
                {isLoadingPredictionMatches ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    加载中...
                  </div>
                ) : predictionMatches.length > 0 ? (
                  predictionMatches.map((match: any) => (
                    <div
                      key={match.match_id || match.mid}
                      className="p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors border border-border hover:border-primary/30"
                      onClick={() => {
                        setSelectedMatch(match);
                        setManualPrediction('');
                      }}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                          {safeGetTeamName(match, 'home')}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">vs</span>
                        <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                          {safeGetTeamName(match, 'away')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {safeGetLeagueName(match)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('no_matches_available') || '暂无可用比赛'}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Betting Options */
              <div className="p-4 space-y-3">
                {/* Match Header */}
                <div className="text-center pb-3 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">{safeGetLeagueName(selectedMatch)}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{safeGetTeamName(selectedMatch, 'home')}</span>
                    <span className="text-xs text-muted-foreground shrink-0">vs</span>
                    <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{safeGetTeamName(selectedMatch, 'away')}</span>
                  </div>
                </div>

                {/* Handicap Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">让分</span>
                  {(() => {
                    if (isLoadingMarketOdds) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          加载中...
                        </div>
                      );
                    }

                    if (!marketOdds?.handicap || marketOdds.handicap.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无让分赔率数据
                        </div>
                      );
                    }

                    const firstHandicap = marketOdds.handicap[0];
                    const handicapLine = typeof firstHandicap.line === 'number' ? firstHandicap.line : parseFloat(String(firstHandicap.line)) || 0;
                    const homeOdds = firstHandicap.home;
                    const awayOdds = firstHandicap.away;
                    const formatLine = (line: number | string): string => {
                      if (typeof line === 'number') {
                        return line < 0 ? line.toString() : line > 0 ? `+${line}` : '0';
                      }
                      return String(line);
                    };

                    return (
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === handicapLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('handicap'); 
                            setManualPrediction('HOME'); 
                            setManualHandicapLine(handicapLine); 
                          }}
                          disabled={!homeOdds || homeOdds <= 0}
                        >
                          {manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === handicapLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium truncate">{safeGetTeamName(selectedMatch, 'home')}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{formatLine(firstHandicap.line)}</span>
                          </div>
                          {homeOdds && homeOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'handicap' && manualPrediction === 'HOME' && manualHandicapLine === handicapLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, homeOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === handicapLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('handicap'); 
                            setManualPrediction('AWAY'); 
                            setManualHandicapLine(handicapLine); 
                          }}
                          disabled={!awayOdds || awayOdds <= 0}
                        >
                          {manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === handicapLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium truncate">{safeGetTeamName(selectedMatch, 'away')}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{formatLine(typeof firstHandicap.line === 'number' ? -firstHandicap.line : `-${firstHandicap.line}`)}</span>
                          </div>
                          {awayOdds && awayOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'handicap' && manualPrediction === 'AWAY' && manualHandicapLine === handicapLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, awayOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Over/Under Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">大小球</span>
                  {(() => {
                    if (isLoadingMarketOdds) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          加载中...
                        </div>
                      );
                    }

                    if (!marketOdds?.overUnder || marketOdds.overUnder.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          暂无大小球赔率数据
                        </div>
                      );
                    }

                    const firstOverUnder = marketOdds.overUnder[0];
                    const overUnderLine = typeof firstOverUnder.line === 'number' ? firstOverUnder.line : parseFloat(String(firstOverUnder.line)) || 2.5;
                    const overOdds = firstOverUnder.over;
                    const underOdds = firstOverUnder.under;

                    return (
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('over_under'); 
                            setManualOverUnderPick('over'); 
                            setManualOverUnderLine(overUnderLine); 
                          }}
                          disabled={!overOdds || overOdds <= 0}
                        >
                          {manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium">大球 {overUnderLine}</span>
                          {overOdds && overOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'over_under' && manualOverUnderPick === 'over' && manualOverUnderLine === overUnderLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, overOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine
                              ? 'bg-primary/15 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_20px_hsl(var(--primary)/0.25)] scale-[1.02]'
                              : 'bg-secondary/50 border-border active:bg-secondary/80'
                          }`}
                          onClick={() => { 
                            setManualBetType('over_under'); 
                            setManualOverUnderPick('under'); 
                            setManualOverUnderLine(overUnderLine); 
                          }}
                          disabled={!underOdds || underOdds <= 0}
                        >
                          {manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium">小球 {overUnderLine}</span>
                          {underOdds && underOdds > 0 ? (
                            <p className={`text-base sm:text-lg font-bold mt-1 ${manualBetType === 'over_under' && manualOverUnderPick === 'under' && manualOverUnderLine === overUnderLine ? 'text-primary' : 'text-foreground'}`}>@{Math.max(0, underOdds - 1).toFixed(2)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">暂无数据</p>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Bet Amount Input */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">投注猎人币</span>
                  <div className="flex items-center gap-1.5">
                    <img src={hunterCoinIcon} alt="" className="w-4 h-4 sm:w-5 sm:h-5" />
                    <input
                      type="number"
                      min={1}
                      max={availableBalance}
                      value={manualBetAmount === '' ? '' : manualBetAmount}
                      placeholder="输入金额"
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === '') {
                          setManualBetAmount('');
                          return;
                        }
                        const value = parseInt(inputValue);
                        if (isNaN(value)) {
                          return;
                        }
                        setManualBetAmount(Math.max(1, Math.min(value, availableBalance)));
                      }}
                      className="w-20 sm:w-24 h-8 sm:h-9 px-2 rounded bg-secondary/50 border border-border text-right text-sm font-mono focus:outline-none focus:border-primary transition-colors placeholder:text-xs placeholder:sm:text-sm placeholder:text-muted-foreground placeholder:font-sans"
                    />
                    {availableBalance > 0 && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        最多 {availableBalance.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium"
                  onClick={handleManualBetSubmit}
                  disabled={isSubmittingBet || (manualBetType === 'handicap' && !manualPrediction)}
                >
                  {isSubmittingBet ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  确认预测{manualBetAmount !== '' ? ` · ${manualBetAmount}` : ''}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Animation Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[200px] w-[160px] p-4 gap-0 bg-card/95 backdrop-blur-md border-border/50 text-center rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('bet_success') || '预测成功'}</DialogTitle>
          </DialogHeader>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center py-2"
          >
            <motion.div 
              className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 250 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 350 }}
              >
                <CheckCircle2 className="h-6 w-6 text-success" />
              </motion.div>
            </motion.div>
            <motion.p 
              className="text-sm font-semibold"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {t('success') || '成功'}
            </motion.p>
          </motion.div>
        </DialogContent>
      </Dialog>
      
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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, UserCheck, UserX, Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FollowedPlayer {
  id: string;
  displayName: string;
  avatarUrl: string;
  signature?: string;
  followedAt: string;
  // Stats
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
}

const MyFollowing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followedPlayers, setFollowedPlayers] = useState<FollowedPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchFollowedPlayers();
  }, [user, navigate]);

  const fetchFollowedPlayers = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // 获取关注列表
      const { data: followsData, error: followsError } = await supabase
        .from('user_follows')
        .select('following_id, created_at')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      
      if (!followsData || followsData.length === 0) {
        setFollowedPlayers([]);
        return;
      }

      const followingIds = followsData.map(f => f.following_id);
      
      // 获取用户信息
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, signature')
        .in('id', followingIds);

      if (usersError) throw usersError;

      // 获取预测统计
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('user_predictions')
        .select('user_id, result')
        .in('user_id', followingIds)
        .not('result', 'is', null);

      if (predictionsError) throw predictionsError;

      // 计算每个用户的统计
      const statsMap = new Map<string, { total: number; correct: number }>();
      predictionsData?.forEach(p => {
        const current = statsMap.get(p.user_id) || { total: 0, correct: 0 };
        current.total++;
        if (p.result === 'win') current.correct++;
        statsMap.set(p.user_id, current);
      });

      // 创建关注时间映射
      const followTimeMap = new Map(followsData.map(f => [f.following_id, f.created_at]));

      // 组装数据
      const players: FollowedPlayer[] = (usersData || []).map(u => {
        const stats = statsMap.get(u.id) || { total: 0, correct: 0 };
        return {
          id: u.id,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
          signature: u.signature || undefined,
          followedAt: followTimeMap.get(u.id) || '',
          totalPredictions: stats.total,
          correctPredictions: stats.correct,
          winRate: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        };
      });

      // 按关注时间排序
      players.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
      
      setFollowedPlayers(players);
    } catch (error) {
      console.error('Error fetching followed players:', error);
      toast.error(t('operation_failed') || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async (playerId: string) => {
    if (!user) return;
    
    setUnfollowingIds(prev => new Set(prev).add(playerId));
    
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', playerId);

      if (error) throw error;

      setFollowedPlayers(prev => prev.filter(p => p.id !== playerId));
      toast.success(t('unfollowed') || '已取消关注');
    } catch (error) {
      console.error('Unfollow error:', error);
      toast.error(t('operation_failed') || '操作失败');
    } finally {
      setUnfollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 safe-area-padding">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back') || '返回'}
        </Button>

        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('my_following') || '我的关注'}</h1>
            <p className="text-sm text-muted-foreground">
              {t('following_count', { count: followedPlayers.length }) || `已关注 ${followedPlayers.length} 位玩家`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : followedPlayers.length === 0 ? (
          <Card className="p-8 text-center">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('no_following') || '暂无关注'}</h3>
            <p className="text-muted-foreground mb-4">
              {t('no_following_desc') || '去排行榜关注感兴趣的玩家吧'}
            </p>
            <Button onClick={() => navigate('/leaderboard')}>
              {t('go_to_leaderboard') || '前往排行榜'}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {followedPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/player/${player.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* 头像 */}
                      <Avatar className="w-12 h-12 border-2 border-primary/30">
                        <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                        <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{player.displayName}</h3>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(player.followedAt)} {t('followed_suffix') || '关注'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {player.signature || t('default_signature') || '预测玩家'}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          <span>
                            {t('predictions')}: <span className="font-medium text-foreground">{player.totalPredictions}</span>
                          </span>
                          <span>
                            {t('win_rate')}: <span className={`font-medium ${player.winRate >= 50 ? 'text-success' : 'text-destructive'}`}>
                              {player.winRate.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      {/* 取消关注按钮 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfollow(player.id);
                        }}
                        disabled={unfollowingIds.has(player.id)}
                        className="flex-shrink-0"
                      >
                        {unfollowingIds.has(player.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            {t('following') || '已关注'}
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFollowing;

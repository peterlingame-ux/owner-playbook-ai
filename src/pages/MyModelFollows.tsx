import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, UserCheck, UserX, Loader2, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { aiModels } from "@/data/mockData";

interface FollowedModel {
  modelId: string;
  modelName: string;
  displayName: string;
  icon?: string;
  color: string;
  followedAt: string;
  // Stats
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
}

const MyModelFollows = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followedModels, setFollowedModels] = useState<FollowedModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchFollowedModels();
  }, [user, navigate]);

  const fetchFollowedModels = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // 获取模型关注列表
      const { data: followsData, error: followsError } = await supabase
        .from('model_follows')
        .select('model_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      
      if (!followsData || followsData.length === 0) {
        setFollowedModels([]);
        return;
      }

      const modelIds = followsData.map(f => f.model_id);
      
      // 从 aiModels 中获取模型信息
      const modelsMap = new Map(aiModels.map(m => [m.id, m]));
      
      // 获取模型预测统计（使用与首页相同的数据源：ai_win_rates_overall 视图）
      const { data: winRatesData, error: winRatesError } = await supabase
        .from('ai_win_rates_overall' as any)
        .select('ai_id, total_predictions, correct_predictions, win_rate')
        .in('ai_id', modelIds);

      if (winRatesError) {
        console.warn('Error fetching model win rates:', winRatesError);
      }

      // 创建统计映射（使用 ai_win_rates_overall 视图的数据）
      const statsMap = new Map<string, { total: number; correct: number; winRate: number }>();
      if (winRatesData) {
        winRatesData.forEach((item: any) => {
          const totalPredictions = Number(item.total_predictions) || 0;
          const correctPredictions = Number(item.correct_predictions) || 0;
          const winRate = Number(item.win_rate) || 0;
          
          statsMap.set(String(item.ai_id), {
            total: totalPredictions,
            correct: correctPredictions,
            winRate: winRate
          });
        });
      }

      // 创建关注时间映射
      const followTimeMap = new Map(followsData.map(f => [f.model_id, f.created_at]));

      // 组装数据
      const models: FollowedModel[] = modelIds
        .map(modelId => {
          const model = modelsMap.get(modelId);
          if (!model) return null;
          
          const stats = statsMap.get(modelId) || { total: 0, correct: 0, winRate: 0 };
          return {
            modelId: model.id,
            modelName: model.name,
            displayName: model.displayName,
            icon: model.icon,
            color: model.color,
            followedAt: followTimeMap.get(modelId) || '',
            totalPredictions: stats.total,
            correctPredictions: stats.correct,
            winRate: stats.winRate, // 直接使用视图计算的胜率
          };
        })
        .filter((m): m is FollowedModel => m !== null);

      // 按关注时间排序
      models.sort((a, b) => new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime());
      
      setFollowedModels(models);
    } catch (error) {
      console.error('Error fetching followed models:', error);
      toast.error(t('operation_failed') || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async (modelId: string) => {
    if (!user) return;
    
    setUnfollowingIds(prev => new Set(prev).add(modelId));
    
    try {
      const { error } = await supabase
        .from('model_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('model_id', modelId);

      if (error) throw error;

      setFollowedModels(prev => prev.filter(m => m.modelId !== modelId));
      toast.success(t('unfollow_success') || '已取消关注');
    } catch (error) {
      console.error('Unfollow error:', error);
      toast.error(t('operation_failed') || '操作失败');
    } finally {
      setUnfollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
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
      <div className="pt-[50px] sm:pt-[70px]">
        <div className="container mx-auto px-4 py-6 safe-area-padding">
          {/* 返回按钮 */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back') || '返回'}
          </Button>

        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('my_model_follows') || '模型关注'}</h1>
            <p className="text-sm text-muted-foreground">
              {t('model_follows_count', { count: followedModels.length }) || `已关注 ${followedModels.length} 个模型`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : followedModels.length === 0 ? (
          <Card className="p-8 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('no_model_follows') || '暂无关注的模型'}</h3>
            <p className="text-muted-foreground mb-4">
              {t('no_model_follows_desc') || '去首页关注感兴趣的AI模型吧'}
            </p>
            <Button onClick={() => navigate('/')}>
              {t('go_to_home') || '前往首页'}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {followedModels.map((model, index) => (
                <motion.div
                  key={model.modelId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/model/${model.modelId}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* 模型图标 */}
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center border-2 border-primary/30 flex-shrink-0 overflow-hidden">
                        {model.icon ? (
                          <img src={model.icon} alt={model.displayName} className="w-full h-full object-contain" />
                        ) : (
                          <Bot className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{model.displayName}</h3>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(model.followedAt)} {t('followed_suffix') || '关注'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {t('ai_model') || 'AI模型'}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          <span>
                            {t('predictions')}: <span className="font-medium text-foreground">{model.totalPredictions}</span>
                          </span>
                          <span>
                            {t('win_rate')}: <span className={`font-medium ${model.winRate >= 50 ? 'text-success' : 'text-destructive'}`}>
                              {model.winRate.toFixed(1)}%
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
                          handleUnfollow(model.modelId);
                        }}
                        disabled={unfollowingIds.has(model.modelId)}
                        className="flex-shrink-0"
                      >
                        {unfollowingIds.has(model.modelId) ? (
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
    </div>
  );
};

export default MyModelFollows;

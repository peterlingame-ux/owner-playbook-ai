import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { 
  Sparkles, 
  Send, 
  Brain, 
  History, 
  Trash2, 
  Database,
  Target,
  TrendingUp,
  Loader2,
  Tag,
  User
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import TiltCard from "@/components/TiltCard";
// Star Background Images
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

interface TrainingRecord {
  id: string;
  content: string;
  created_at: string;
}

interface PlayerExclusiveModelCardProps {
  className?: string;
  // Stats from parent
  totalPredictions?: number;
  correctPredictions?: number;
  winRate?: number;
  balanceValue?: string;
  profit?: number;
}

// Common football-related keywords to extract
const FOOTBALL_KEYWORDS = [
  '主队', '客队', '胜率', '进球', '失球', '主场', '客场', '连胜', '连败', '不败',
  '实力', '状态', '伤病', '阵容', '战术', '防守', '进攻', '中场', '前锋', '后卫',
  '门将', '角球', '任意球', '点球', '红牌', '黄牌', '换人', '加时', '半场', '全场',
  '欧冠', '英超', '西甲', '德甲', '意甲', '法甲', '世界杯', '欧洲杯', '联赛', '杯赛',
  '让球', '大小球', '亚盘', '欧赔', '赔率', '盘口', '水位', '初盘', '即时', '临场',
  '爆冷', '热门', '冷门', '稳胆', '单关', '串关', '比分', '净胜', '总进球', '半全场'
];

const PlayerExclusiveModelCard = ({ 
  className,
  totalPredictions = 0,
  correctPredictions = 0,
  winRate = 0,
  balanceValue,
  profit = 0
}: PlayerExclusiveModelCardProps) => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [showFeedDialog, setShowFeedDialog] = useState(false);
  const [feedText, setFeedText] = useState('');
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedProgress, setFeedProgress] = useState(0);
  const [feedComplete, setFeedComplete] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState<TrainingRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [trainingCount, setTrainingCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('feed');

  const trainingSteps = [
    { icon: Database, label: '数据解析', description: '正在分析输入内容...' },
    { icon: Brain, label: '神经网络', description: '更新模型权重...' },
    { icon: Target, label: '模式识别', description: '学习预测模式...' },
    { icon: TrendingUp, label: '优化完成', description: '模型已更新！' },
  ];

  // Demo mode for non-logged-in users
  const isDemo = !user || !userProfile;
  const displayName = t('player_exclusive_model') || '预测者专属模型';
  const avatarUrl = userProfile?.avatar_url || '/avatars/avatar-1.png';

  // Animated win rate
  const animatedWinRate = useCountAnimation(isDemo ? 0 : winRate, { 
    duration: 1500,
    startValue: 0
  });

  // Calculate training trend data (last 7 days)
  const trendData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(day => {
      const dayStart = startOfDay(day);
      const count = trainingHistory.filter(record => {
        const recordDate = startOfDay(new Date(record.created_at));
        return recordDate.getTime() === dayStart.getTime();
      }).length;

      return {
        date: format(day, 'MM/dd'),
        count,
        fullDate: format(day, 'yyyy-MM-dd')
      };
    });
  }, [trainingHistory]);

  // Extract and count keywords from training history
  const keywordStats = useMemo(() => {
    const allText = trainingHistory.map(r => r.content).join(' ');
    const keywordCounts: Record<string, number> = {};

    FOOTBALL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = allText.match(regex);
      if (matches && matches.length > 0) {
        keywordCounts[keyword] = matches.length;
      }
    });

    // Sort by count and take top 12
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([keyword, count]) => ({ keyword, count }));
  }, [trainingHistory]);

  // Calculate total characters
  const totalCharacters = useMemo(() => {
    return trainingHistory.reduce((sum, r) => sum + r.content.length, 0);
  }, [trainingHistory]);

  // Fetch training history count on mount
  useEffect(() => {
    if (user) {
      fetchTrainingCount();
    }
  }, [user]);

  // Fetch training history when dialog opens
  useEffect(() => {
    if (showFeedDialog && user) {
      fetchTrainingHistory();
    }
  }, [showFeedDialog, user]);

  const fetchTrainingCount = async () => {
    if (!user) return;
    
    const { count, error } = await supabase
      .from('ai_training_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (!error && count !== null) {
      setTrainingCount(count);
    }
  };

  const fetchTrainingHistory = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('ai_training_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching training history:', error);
      toast.error('获取训练历史失败');
    } else {
      setTrainingHistory(data || []);
    }
    setIsLoadingHistory(false);
  };

  const saveTrainingData = async (content: string) => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('ai_training_history')
        .insert({
          user_id: user.id,
          content: content
        })
        .select();
      
      if (error) {
        console.error('Error saving training data:', error);
        toast.error(`保存失败: ${error.message}`);
        return false;
      }
      
      if (data && data.length > 0) {
        console.log('Training data saved successfully:', data[0].id);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Unexpected error saving training data:', err);
      toast.error('保存失败，请检查网络连接');
      return false;
    }
  };

  const deleteTrainingRecord = async (id: string) => {
    const { error } = await supabase
      .from('ai_training_history')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('删除失败');
      return;
    }
    
    setTrainingHistory(prev => prev.filter(r => r.id !== id));
    setTrainingCount(prev => prev - 1);
    toast.success('已删除');
  };

  // Handle AI feeding progress animation with steps
  useEffect(() => {
    if (isFeeding && feedProgress < 100) {
      const interval = setInterval(() => {
        setFeedProgress(prev => {
          const increment = Math.random() * 8 + 3;
          const newProgress = Math.min(prev + increment, 100);
          
          if (newProgress >= 25 && currentStep < 1) setCurrentStep(1);
          if (newProgress >= 50 && currentStep < 2) setCurrentStep(2);
          if (newProgress >= 75 && currentStep < 3) setCurrentStep(3);
          
          if (newProgress >= 100) {
            setIsFeeding(false);
            setFeedComplete(true);
            clearInterval(interval);
          }
          return newProgress;
        });
      }, 120);
      return () => clearInterval(interval);
    }
  }, [isFeeding, feedProgress, currentStep]);

  const handleFeedSubmit = async () => {
    if (!feedText.trim()) {
      toast.error('请输入训练数据');
      return;
    }
    
    if (isDemo) {
      toast.info('请先登录以保存训练数据');
      return;
    }
    
    const saved = await saveTrainingData(feedText.trim());
    if (!saved) {
      toast.error('保存训练数据失败，请稍后重试');
      return;
    }
    
    setTrainingCount(prev => prev + 1);
    setTimeout(() => {
      fetchTrainingHistory();
    }, 500);
    
    setCurrentStep(0);
    setIsFeeding(true);
    setFeedProgress(0);
    setFeedComplete(false);
  };

  const handleDialogClose = () => {
    setShowFeedDialog(false);
    setFeedText('');
    setFeedProgress(0);
    setIsFeeding(false);
    setFeedComplete(false);
    setCurrentStep(0);
    setActiveTab('feed');
  };

  const handleFeedComplete = () => {
    toast.success('AI训练完成！您的专属模型已更新');
    if (!isDemo && user) {
      fetchTrainingCount();
      fetchTrainingHistory();
    }
    setFeedText('');
    setFeedProgress(0);
    setFeedComplete(false);
    setCurrentStep(0);
  };

  // Get keyword color based on frequency
  const getKeywordColor = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'bg-amber-500 text-black';
    if (ratio > 0.4) return 'bg-amber-500/60 text-white';
    return 'bg-amber-500/30 text-amber-200';
  };

  const handleCardClick = () => {
    if (isDemo) {
      toast.warning(t("login_required"), { description: t("login_prompt") });
      navigate("/auth");
      return;
    }
    // 打开训练对话框
    setShowFeedDialog(true);
  };

  const wrongPredictions = totalPredictions - correctPredictions;
  const isPositive = profit >= 0;
  const profitDisplay = isPositive ? `+${profit}` : `${profit}`;

  return (
    <>
      <TiltCard
        className={`group rounded-2xl bg-gradient-to-br from-amber-600/15 to-yellow-500/5 backdrop-blur-sm border border-amber-500/30 hover:border-white/30 transition-all duration-300 overflow-hidden cursor-pointer ${className}`}
        onClick={handleCardClick}
        maxTilt={6}
        scale={1.02}
        glare={false}
      >
        {/* Star Background Image */}
        <div 
          className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
          style={{
            backgroundImage: `url(${starHunsoccer})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 p-4 sm:p-5">
          {/* Header: Model Info + Points Badge */}
          <div className="flex items-start justify-between gap-3 mb-5">
            {/* Model Icon & Name */}
            <div className="flex items-center gap-3">
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {isDemo ? (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center ring-2 ring-amber-500/30 border-2 border-dashed border-amber-500/50">
                    <User className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500/70" />
                  </div>
                ) : (
                  <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-amber-500/30">
                    <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                    <AvatarFallback className="text-xs font-bold bg-amber-500/20 text-amber-400">
                      {userProfile?.display_name?.slice(0, 2) || 'AI'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
              <div>
                <h3 className="font-bold text-sm sm:text-base tracking-tight text-amber-400">
                  {displayName}
                </h3>
                {trainingCount > 0 && !isDemo && (
                  <Badge variant="outline" className="text-[9px] mt-1 px-1.5 py-0 bg-background/50 border-amber-500/30 text-amber-400">
                    {trainingCount}{t('times_training') || '次训练'}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Points Badge */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {t('simulated_profit') || '模拟额度'}
              </span>
              {isDemo ? (
                <div className="px-3 py-1.5 rounded-lg font-mono font-bold text-sm tabular-nums bg-muted/50 text-muted-foreground border border-border">
                  - -
                </div>
              ) : (
                <div className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm tabular-nums ${
                  isPositive 
                    ? 'bg-success/20 text-success border border-success/30' 
                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                }`}>
                  {profitDisplay} PTS
                </div>
              )}
            </div>
          </div>

          {/* Win Rate Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {t('win_rate_label') || '胜率'}
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
                {isDemo ? '- -%' : `${animatedWinRate.toFixed(1)}%`}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              {!isDemo && (
                <>
                  <motion.div 
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${animatedWinRate}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  {/* Animated shine effect */}
                  <motion.div
                    className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '400%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{t('correct') || '正确'}</p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-success">
                {isDemo ? '- -' : correctPredictions}
              </p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{t('total_predictions') || '预测'}</p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
                {isDemo ? '- -' : totalPredictions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{t('wrong') || '错误'}</p>
              <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-destructive">
                {isDemo ? '- -' : wrongPredictions}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 text-sm font-semibold transition-all duration-300 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (isDemo) {
                navigate("/auth");
              } else {
                setShowFeedDialog(true);
              }
            }}
          >
            {isDemo ? (t('login_to_generate_model') || '登录后生成专属模型') : (t('train_model') || '训练模型')}
          </Button>
        </div>
      </TiltCard>

      {/* Training Dialog */}
      <Dialog open={showFeedDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-card via-card to-amber-950/10 border-amber-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-amber-400">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Brain className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t('train_exclusive_model') || '训练专属模型'}</h3>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {t('feed_data_desc') || '输入您的分析见解和预测策略，让AI学习您的风格'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="feed" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>{t('feed_data') || '投喂数据'}</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span>{t('training_history') || '训练历史'}</span>
                {trainingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{trainingCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="space-y-4">
              {/* Training Progress Animation */}
              {isFeeding && (
                <div className="space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-400 font-medium">{t('training_in_progress') || '正在训练...'}</span>
                    <span className="font-mono text-amber-300">{Math.round(feedProgress)}%</span>
                  </div>
                  <div className="relative h-2 bg-amber-950/50 rounded-full overflow-hidden">
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                      style={{ width: `${feedProgress}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {trainingSteps.map((step, idx) => {
                      const StepIcon = step.icon;
                      const isActive = idx === currentStep;
                      const isComplete = idx < currentStep;
                      return (
                        <div 
                          key={idx}
                          className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                            isActive ? 'bg-amber-500/20 border border-amber-500/40' :
                            isComplete ? 'bg-success/10 border border-success/20' :
                            'bg-muted/30 border border-transparent'
                          }`}
                        >
                          <StepIcon className={`h-5 w-5 mb-1 ${
                            isActive ? 'text-amber-400 animate-pulse' :
                            isComplete ? 'text-success' : 'text-muted-foreground'
                          }`} />
                          <span className={`text-[10px] font-medium ${
                            isActive ? 'text-amber-400' :
                            isComplete ? 'text-success' : 'text-muted-foreground'
                          }`}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Training Complete */}
              {feedComplete && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center p-6 rounded-xl bg-success/10 border border-success/30"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                  <h4 className="text-lg font-bold text-success mb-2">{t('training_complete') || '训练完成！'}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('model_updated') || '您的专属模型已更新，新的预测将更加精准'}
                  </p>
                  <Button onClick={handleFeedComplete} className="bg-success hover:bg-success/90">
                    {t('continue') || '继续'}
                  </Button>
                </motion.div>
              )}

              {/* Feed Input */}
              {!isFeeding && !feedComplete && (
                <div className="space-y-4">
                  <div className="relative">
                    <Textarea
                      placeholder={t('feed_placeholder') || "输入您的足球分析见解、比赛预测策略、或者任何有助于AI学习的内容..."}
                      value={feedText}
                      onChange={(e) => setFeedText(e.target.value)}
                      className="min-h-[150px] resize-none bg-background/50 border-amber-500/20 focus:border-amber-500/50 placeholder:text-muted-foreground/50"
                    />
                    <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                      {feedText.length} {t('characters') || '字符'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {t('feed_tip') || '💡 提示：提供具体的分析逻辑和预测依据效果更好'}
                    </p>
                    <Button
                      onClick={handleFeedSubmit}
                      disabled={!feedText.trim()}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t('start_training') || '开始训练'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                </div>
              ) : trainingHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">{t('no_training_history') || '暂无训练历史'}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {t('start_feeding') || '开始投喂数据来训练您的专属模型'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                      <p className="text-2xl font-bold text-amber-400">{trainingCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('total_trainings') || '训练次数'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                      <p className="text-2xl font-bold text-blue-400">{totalCharacters.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('total_characters') || '总字符'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                      <p className="text-2xl font-bold text-purple-400">{keywordStats.length}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('keywords_learned') || '学习关键词'}</p>
                    </div>
                  </div>

                  {/* Training Trend Chart */}
                  {trendData.some(d => d.count > 0) && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-amber-400" />
                        {t('training_trend') || '训练趋势'}
                      </h4>
                      <div className="h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendData}>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ fontSize: 12, backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                              labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {trendData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.count > 0 ? 'hsl(var(--amber-500, 245 158 11))' : 'hsl(var(--muted))'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Keyword Cloud */}
                  {keywordStats.length > 0 && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-amber-400" />
                        {t('learned_keywords') || '学习到的关键词'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {keywordStats.map(({ keyword, count }) => (
                          <Badge 
                            key={keyword}
                            className={`${getKeywordColor(count, keywordStats[0]?.count || 1)} text-xs px-2 py-1`}
                          >
                            {keyword} ({count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* History List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      {t('recent_records') || '最近记录'}
                    </h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-4">
                        {trainingHistory.slice(0, 20).map((record) => (
                          <div key={record.id} className="p-3 rounded-lg bg-muted/30 border border-border group">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-foreground line-clamp-2 flex-1">{record.content}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={() => deleteTrainingRecord(record.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlayerExclusiveModelCard;

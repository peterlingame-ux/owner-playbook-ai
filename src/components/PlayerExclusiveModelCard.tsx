import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Send, 
  Brain, 
  History, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Zap,
  Database,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface TrainingRecord {
  id: string;
  content: string;
  created_at: string;
}

interface PlayerExclusiveModelCardProps {
  className?: string;
}

const PlayerExclusiveModelCard = ({ className }: PlayerExclusiveModelCardProps) => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const [showFeedDialog, setShowFeedDialog] = useState(false);
  const [feedText, setFeedText] = useState('');
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedProgress, setFeedProgress] = useState(0);
  const [feedComplete, setFeedComplete] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState<TrainingRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [trainingCount, setTrainingCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const trainingSteps = [
    { icon: Database, label: '数据解析', description: '正在分析输入内容...' },
    { icon: Brain, label: '神经网络', description: '更新模型权重...' },
    { icon: Target, label: '模式识别', description: '学习预测模式...' },
    { icon: TrendingUp, label: '优化完成', description: '模型已更新！' },
  ];

  // Demo mode for non-logged-in users
  const isDemo = !user || !userProfile;
  const displayName = isDemo ? '体验玩家' : userProfile.display_name;
  const avatarUrl = isDemo ? '/avatars/avatar-1.png' : userProfile.avatar_url;

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
      .limit(20);
    
    if (error) {
      console.error('Error fetching training history:', error);
      toast.error('获取训练历史失败');
    } else {
      setTrainingHistory(data || []);
    }
    setIsLoadingHistory(false);
  };

  const saveTrainingData = async (content: string) => {
    if (!user) return false;
    
    const { error } = await supabase
      .from('ai_training_history')
      .insert({
        user_id: user.id,
        content: content
      });
    
    if (error) {
      console.error('Error saving training data:', error);
      return false;
    }
    return true;
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
          
          // Update current step based on progress
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
    
    // Demo mode - show login prompt
    if (isDemo) {
      toast.info('请先登录以保存训练数据');
    } else {
      // Save to database first
      const saved = await saveTrainingData(feedText.trim());
      if (!saved) {
        toast.error('保存训练数据失败');
        return;
      }
    }
    
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
    setShowHistory(false);
    setCurrentStep(0);
  };

  const handleFeedComplete = () => {
    toast.success('AI训练完成！您的专属模型已更新');
    if (!isDemo) {
      setTrainingCount(prev => prev + 1);
      fetchTrainingHistory();
    }
    setFeedText('');
    setFeedProgress(0);
    setFeedComplete(false);
    setCurrentStep(0);
  };

  return (
    <>
      <Card 
        className={`relative rounded-xl p-3 sm:p-3 md:p-4 bg-gradient-to-br from-amber-500/20 via-card to-amber-600/10 hover:shadow-2xl transition-all duration-500 border-2 border-amber-500/40 hover:border-amber-500/60 overflow-hidden group hover:scale-105 cursor-pointer ${className}`}
        onClick={() => setShowFeedDialog(true)}
      >
        {/* Exclusive Model Badge */}
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
          <Badge 
            className="text-[8px] sm:text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-0 shadow-lg"
          >
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            专属模型
          </Badge>
        </div>

        {/* Training Count Badge */}
        {trainingCount > 0 && (
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20">
            <Badge 
              variant="outline"
              className="text-[8px] sm:text-[10px] font-bold px-2 py-0.5 bg-background/80 border-amber-500/40 text-amber-400"
            >
              <History className="h-2.5 w-2.5 mr-1" />
              {trainingCount}次训练
            </Badge>
          </div>
        )}

        {/* Background glow effect */}
        <div 
          className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 30% 50%, hsl(45 100% 50%), transparent 70%)`
          }}
        />
        
        {/* Diagonal Stripe Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-transparent to-transparent" />
        </div>
        
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        
        {/* Content */}
        <div className="relative z-10 space-y-2 sm:space-y-2 md:space-y-3">
          {/* Header with Player Avatar */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-1.5 pb-2 sm:pb-2 border-b-2 border-amber-500/20">
            <Avatar className="h-12 w-12 sm:h-10 md:h-14 sm:w-10 md:w-14 ring-2 ring-amber-500/60 shadow-2xl group-hover:ring-amber-500/80 transition-all">
              <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
              <AvatarFallback className="text-sm sm:text-sm md:text-lg font-bold bg-gradient-to-br from-amber-500 to-yellow-500 text-black">
                {displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-amber-400">
                {displayName}
              </span>
              <span className="text-[9px] sm:text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                专属AI模型
              </span>
            </div>
          </div>

          {/* AI Feed Button */}
          <div className="pt-2 space-y-2">
            <Button 
              className="w-full h-9 sm:h-10 relative overflow-hidden group/btn border font-bold text-[10px] sm:text-xs bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 border-amber-500/40 text-amber-300 hover:scale-105 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setShowFeedDialog(true);
              }}
            >
              <div className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover/btn:animate-pulse" />
                <span>AI投喂</span>
              </div>
              {/* Animated shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </Button>
            
            <p className="text-[8px] sm:text-[9px] text-center text-muted-foreground">
              输入文字训练您的专属AI模型
            </p>
          </div>
        </div>
      </Card>

      {/* AI Feed Dialog - Professional Design */}
      <Dialog open={showFeedDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-gradient-to-b from-background to-background/95 border-amber-500/30">
          {/* Header with animated gradient */}
          <div className="relative px-6 pt-6 pb-4 border-b border-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />
            
            <DialogHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
                  <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Brain className="h-7 w-7 text-black" />
                  </div>
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                    AI 模型训练中心
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    投喂数据，让您的专属AI变得更聪明
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-amber-400 font-medium">{trainingCount} 次训练</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-400 font-medium">模型活跃</span>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col p-6">
            <AnimatePresence mode="wait">
              {!isFeeding && !feedComplete ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Input Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Database className="h-4 w-4 text-amber-500" />
                      输入训练数据
                    </div>
                    <div className="relative">
                      <Textarea
                        placeholder="例如：&#10;• 我认为主队在主场的胜率通常更高&#10;• 最近5场比赛保持不败的球队状态更好&#10;• 欧冠比赛中实力差距明显的比赛更容易爆冷..."
                        value={feedText}
                        onChange={(e) => setFeedText(e.target.value)}
                        className="min-h-[140px] resize-none border-amber-500/30 focus:border-amber-500 bg-card/50 backdrop-blur-sm text-sm"
                      />
                      <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                        {feedText.length} 字符
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-xs border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5"
                    >
                      <History className="h-3.5 w-3.5 mr-1.5" />
                      训练历史
                      {showHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleDialogClose} className="text-xs">
                        取消
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleFeedSubmit}
                        className="text-xs bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-600 hover:to-yellow-600 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                        disabled={!feedText.trim()}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        开始训练
                      </Button>
                    </div>
                  </div>

                  {/* Training History Section */}
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-border/50 pt-4 overflow-hidden"
                      >
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          训练历史记录
                          <Badge variant="secondary" className="text-[10px] ml-auto">
                            {trainingHistory.length} 条
                          </Badge>
                        </h4>
                        {isLoadingHistory ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            加载中...
                          </div>
                        ) : trainingHistory.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Brain className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">暂无训练记录</p>
                            <p className="text-xs mt-1">开始投喂您的专属AI吧！</p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[180px] pr-4">
                            <div className="space-y-2">
                              {trainingHistory.map((record, index) => (
                                <motion.div
                                  key={record.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="bg-card/50 rounded-lg p-3 border border-border/50 group/item hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                                >
                                  <div className="flex justify-between items-start gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        {format(new Date(record.created_at), 'MM-dd HH:mm')}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => deleteTrainingRecord(record.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                                    {record.content}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="training"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1 flex flex-col items-center justify-center py-8"
                >
                  {/* Animated Brain Icon */}
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 bg-amber-500/30 blur-2xl rounded-full ${isFeeding ? 'animate-pulse' : ''}`} />
                    <motion.div
                      animate={isFeeding ? { rotate: 360 } : {}}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="relative h-24 w-24 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-2xl shadow-amber-500/40"
                    >
                      <Brain className={`h-12 w-12 text-black ${isFeeding ? 'animate-pulse' : ''}`} />
                    </motion.div>
                    {feedComplete && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
                      >
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Status Text */}
                  <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                    {feedComplete ? '训练完成！' : 'AI 学习中...'}
                  </h3>
                  
                  {/* Progress Steps */}
                  <div className="w-full max-w-sm space-y-4 mt-4">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-muted-foreground">训练进度</span>
                      <span className="font-mono font-bold text-amber-400">{Math.round(feedProgress)}%</span>
                    </div>
                    
                    {/* Custom Progress Bar */}
                    <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${feedProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                        style={{ backgroundSize: '200% 100%' }}
                      />
                    </div>

                    {/* Training Steps */}
                    <div className="grid grid-cols-4 gap-2 mt-6">
                      {trainingSteps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index <= currentStep;
                        const isCurrent = index === currentStep && isFeeding;
                        
                        return (
                          <motion.div
                            key={step.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex flex-col items-center text-center p-2 rounded-lg transition-all ${
                              isActive ? 'bg-amber-500/10' : 'bg-muted/30'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                              isActive 
                                ? 'bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/30' 
                                : 'bg-muted'
                            }`}>
                              <StepIcon className={`h-4 w-4 ${isActive ? 'text-black' : 'text-muted-foreground'} ${isCurrent ? 'animate-pulse' : ''}`} />
                            </div>
                            <span className={`text-[9px] font-medium ${isActive ? 'text-amber-400' : 'text-muted-foreground'}`}>
                              {step.label}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {feedComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8"
                    >
                      <Button 
                        onClick={handleFeedComplete}
                        className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-600 hover:to-yellow-600 shadow-lg shadow-amber-500/30 px-8"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        完成训练
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </>
  );
};

export default PlayerExclusiveModelCard;

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
import { Sparkles, Send, Brain, History, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

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

  // Handle AI feeding progress animation
  useEffect(() => {
    if (isFeeding && feedProgress < 100) {
      const interval = setInterval(() => {
        setFeedProgress(prev => {
          const increment = Math.random() * 15 + 5;
          const newProgress = Math.min(prev + increment, 100);
          if (newProgress >= 100) {
            setIsFeeding(false);
            setFeedComplete(true);
            clearInterval(interval);
          }
          return newProgress;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isFeeding, feedProgress]);

  const handleFeedSubmit = async () => {
    if (!feedText.trim()) {
      toast.error('请输入训练数据');
      return;
    }
    
    // Save to database first
    const saved = await saveTrainingData(feedText.trim());
    if (!saved) {
      toast.error('保存训练数据失败');
      return;
    }
    
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
  };

  const handleFeedComplete = () => {
    toast.success('AI训练完成！您的专属模型已更新');
    setTrainingCount(prev => prev + 1);
    fetchTrainingHistory();
    setFeedText('');
    setFeedProgress(0);
    setFeedComplete(false);
  };

  if (!user || !userProfile) {
    return null;
  }

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
              <AvatarImage src={userProfile.avatar_url} alt={userProfile.display_name} className="object-cover" />
              <AvatarFallback className="text-sm sm:text-sm md:text-lg font-bold bg-gradient-to-br from-amber-500 to-yellow-500 text-black">
                {userProfile.display_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-amber-400">
                {userProfile.display_name}
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

      {/* AI Feed Dialog */}
      <Dialog open={showFeedDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Brain className="h-5 w-5" />
              AI投喂 - 训练您的专属模型
            </DialogTitle>
            <DialogDescription>
              输入足球分析知识、比赛心得或预测策略，让AI学习您的思维方式
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4 pt-4">
            {!isFeeding && !feedComplete ? (
              <>
                <Textarea
                  placeholder="例如：我认为主队在主场的胜率通常更高，尤其是当他们最近5场比赛保持不败时..."
                  value={feedText}
                  onChange={(e) => setFeedText(e.target.value)}
                  className="min-h-[120px] resize-none border-amber-500/30 focus:border-amber-500"
                />
                <div className="flex justify-between items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs"
                  >
                    <History className="h-3.5 w-3.5 mr-1" />
                    训练历史
                    {showHistory ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDialogClose}>
                      取消
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleFeedSubmit}
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-600 hover:to-yellow-600"
                      disabled={!feedText.trim()}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      开始训练
                    </Button>
                  </div>
                </div>

                {/* Training History Section */}
                {showHistory && (
                  <div className="border-t border-border pt-4 flex-1 overflow-hidden">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <History className="h-4 w-4 text-amber-500" />
                      训练历史记录 ({trainingHistory.length})
                    </h4>
                    {isLoadingHistory ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        加载中...
                      </div>
                    ) : trainingHistory.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        暂无训练记录，开始投喂您的专属AI吧！
                      </div>
                    ) : (
                      <ScrollArea className="h-[200px] pr-4">
                        <div className="space-y-3">
                          {trainingHistory.map((record) => (
                            <div 
                              key={record.id} 
                              className="bg-muted/50 rounded-lg p-3 border border-border/50 group/item"
                            >
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteTrainingRecord(record.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <p className="text-xs text-foreground/90 line-clamp-3">
                                {record.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center gap-3">
                  <Brain className={`h-8 w-8 text-amber-500 ${isFeeding ? 'animate-pulse' : ''}`} />
                  <span className="text-lg font-bold text-amber-400">
                    {feedComplete ? 'AI学习完成！' : 'AI正在学习中...'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">训练进度</span>
                    <span className="font-mono font-bold text-amber-400">{Math.round(feedProgress)}%</span>
                  </div>
                  <Progress 
                    value={feedProgress} 
                    className="h-3 bg-secondary"
                    indicatorClassName="bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-300"
                  />
                </div>
                
                {feedComplete && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={handleFeedComplete}
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-600 hover:to-yellow-600"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      完成
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlayerExclusiveModelCard;

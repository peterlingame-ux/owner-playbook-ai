import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown, History, Copy, TrendingUp, TrendingDown, ChevronRight, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import mysteryIcon from "@/assets/mystery-icon.png";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AIModel } from "@/types/prediction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface TodayPosition {
  id: string;
  match_id: string;
  home_team: string;
  away_team: string;
  bet_type: string;
  prediction: string;
  amount: number;
  odds: number;
  status: string;
  result?: string;
  pnl?: number;
  created_at?: string;
  settled_at?: string;
}

// Model Points Data
const modelPointsData: Record<string, number> = {
  'deepseek': 14520,
  'gpt5': 12830,
  'gemini': 11650,
  'claude': 13280,
  'grok': 10950,
  'hunsoccer-max': 15200,
};

// Animated ROI Component
const AnimatedROI = ({ value }: { value: number }) => {
  const animatedValue = useCountAnimation(Math.abs(value), {
    duration: 1500,
    startValue: 0
  });
  
  const isPositive = value >= 0;
  
  return (
    <span className={`font-mono text-sm font-semibold ${isPositive ? 'text-[hsl(145,65%,50%)]' : 'text-[hsl(0,72%,55%)]'}`}>
      {isPositive ? '+' : '-'}{animatedValue.toFixed(2)}%
    </span>
  );
};

// Animated Win Rate
const AnimatedWinRateSimple = ({ value }: { value: number }) => {
  const animatedValue = useCountAnimation(value, {
    duration: 1200,
    startValue: 0
  });
  
  return (
    <span className="font-mono text-sm font-semibold text-foreground">
      {animatedValue.toFixed(1)}%
    </span>
  );
};

// Mini Sparkline Chart
const MiniSparkline = ({ positive }: { positive: boolean }) => {
  const points = Array.from({ length: 12 }, (_, i) => {
    const trend = positive ? i * 1.5 : -i * 0.8;
    const noise = (Math.random() - 0.5) * 6;
    return 20 - trend + noise;
  });
  
  const pathD = points.map((y, i) => {
    const x = (i / (points.length - 1)) * 60;
    return `${i === 0 ? 'M' : 'L'}${x},${Math.max(2, Math.min(38, y))}`;
  }).join(' ');
  
  return (
    <svg width="60" height="40" className="opacity-60">
      <defs>
        <linearGradient id={`gradient-${positive ? 'up' : 'down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={positive ? 'hsl(145, 65%, 50%)' : 'hsl(0, 72%, 55%)'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? 'hsl(145, 65%, 50%)' : 'hsl(0, 72%, 55%)'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathD} fill="none" stroke={positive ? 'hsl(145, 65%, 50%)' : 'hsl(0, 72%, 55%)'} strokeWidth="1.5" />
    </svg>
  );
};

const LeaderboardTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modelsWithRealData, setModelsWithRealData] = useState<AIModel[]>(aiModels);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<1 | 7 | 30>(7);
  const [selectedModelHistory, setSelectedModelHistory] = useState<{ modelId: string; modelName: string; positions: TodayPosition[] } | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [userProfile, setUserProfile] = useState<{ display_name: string; avatar_url: string } | null>(null);
  const [copyTradeModel, setCopyTradeModel] = useState<{ id: string; name: string } | null>(null);
  const [isCopyTradeDialogOpen, setIsCopyTradeDialogOpen] = useState(false);
  const [copyTradeAmount, setCopyTradeAmount] = useState<number>(100);
  const [isCopyTrading, setIsCopyTrading] = useState(false);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('users')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setUserProfile(data);
      };
      fetchProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Generate mock data
  useEffect(() => {
    const generateAIStats = () => {
      setIsLoading(true);
      
      const updatedModels = aiModels.map(model => {
        const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const basePredictions = timeRange === 1 ? 5 : timeRange === 7 ? 25 : 80;
        const totalPredictions = basePredictions + (seed % 10);
        const baseWinRate = 55 + (seed % 20);
        const winRate = baseWinRate + (Math.sin(seed) * 5);
        const correctPredictions = Math.round(totalPredictions * (winRate / 100));
        const avgBetAmount = 200 + (seed % 100);
        const totalBetAmount = totalPredictions * avgBetAmount;
        const avgOdds = 1.8 + (seed % 5) * 0.1;
        const validAmount = correctPredictions * avgBetAmount * avgOdds;
        const profitAmount = validAmount - totalBetAmount;
        const profitRate = totalBetAmount > 0 ? (profitAmount / totalBetAmount) * 100 : 0;
        const followers = 500 + (seed % 800);
        
        return {
          ...model,
          winRate: Math.round(winRate * 10) / 10,
          totalPredictions,
          correctPredictions,
          totalBetAmount,
          validAmount,
          profitAmount,
          profitRate: Math.round(profitRate * 10) / 10,
          followers,
        };
      });

      setModelsWithRealData(updatedModels);
      setIsLoading(false);
    };

    generateAIStats();
  }, [timeRange]);

  const fetchTodayHistory = (modelId: string, modelName: string) => {
    setIsLoadingHistory(true);
    setIsHistoryDialogOpen(true);
    
    const mockMatches = [
      { home: 'Real Madrid', away: 'Barcelona', homeScore: 2, awayScore: 1 },
      { home: 'Man City', away: 'Liverpool', homeScore: 3, awayScore: 2 },
      { home: 'Bayern', away: 'Dortmund', homeScore: 1, awayScore: 1 },
      { home: 'PSG', away: 'Marseille', homeScore: 2, awayScore: 0 },
      { home: 'Juventus', away: 'AC Milan', homeScore: 0, awayScore: 1 },
    ];

    const total = Math.floor(Math.random() * 5) + 3;
    const correct = Math.floor(total * 0.6);
    
    const mockPositions: TodayPosition[] = [];
    for (let i = 0; i < total; i++) {
      const match = mockMatches[i % mockMatches.length];
      const isWin = i < correct;
      const amount = Math.floor(Math.random() * 400) + 100;
      const odds = (Math.random() * 0.8 + 1.5).toFixed(2);
      mockPositions.push({
        id: `mock-${modelId}-${i}`,
        match_id: `${1000 + i}`,
        home_team: match.home,
        away_team: match.away,
        bet_type: Math.random() > 0.5 ? 'Over/Under' : 'Handicap',
        prediction: Math.random() > 0.5 ? 'Over 2.5' : 'Under 2.5',
        amount,
        odds: parseFloat(odds),
        status: 'settled',
        result: isWin ? 'win' : 'loss',
        pnl: isWin ? amount * (parseFloat(odds) - 1) : -amount,
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
      });
    }

    setSelectedModelHistory({ modelId, modelName, positions: mockPositions });
    setIsLoadingHistory(false);
  };

  const handleCopyTrade = async () => {
    if (!user) {
      toast({
        title: "Please login",
        description: "Login to subscribe to AI models",
        variant: "default",
      });
      return;
    }

    if (!copyTradeModel) return;

    setIsCopyTrading(true);
    try {
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (balanceError || !balanceData) {
        toast({
          title: "Failed to get balance",
          description: "Please try again",
          variant: "destructive",
        });
        return;
      }

      if (balanceData.balance < copyTradeAmount) {
        toast({
          title: "Insufficient balance",
          description: `Balance: ${balanceData.balance.toFixed(2)} PTS, Required: ${copyTradeAmount} PTS`,
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ 
          balance: balanceData.balance - copyTradeAmount,
          total_wagered: (balanceData as any).total_wagered + copyTradeAmount,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Subscribed!",
        description: `Subscribed to ${copyTradeModel.name} with ${copyTradeAmount} PTS`,
      });

      setIsCopyTradeDialogOpen(false);
      setCopyTradeModel(null);
      setCopyTradeAmount(100);
    } catch (error) {
      console.error('Copy trade error:', error);
      toast({
        title: "Subscription failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCopyTrading(false);
    }
  };

  const openCopyTradeDialog = (modelId: string, modelName: string) => {
    if (!user) {
      toast({
        title: "Please login",
        description: "Login to subscribe to AI models",
        variant: "default",
      });
      navigate('/auth');
      return;
    }
    setCopyTradeModel({ id: modelId, name: modelName });
    setIsCopyTradeDialogOpen(true);
  };

  const enhancedModels = modelsWithRealData
    .map(model => ({
      ...model,
      correctPredictions: (model as any).correctPredictions || 0,
      totalBetAmount: (model as any).totalBetAmount || 0,
      profitAmount: (model as any).profitAmount || 0,
      profitRate: (model as any).profitRate || 0,
      followers: (model as any).followers || 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const getModelIcon = (modelId: string) => {
    if (modelId === 'hunsoccermax') {
      return user && userProfile?.avatar_url ? userProfile.avatar_url : hunsoccerIcon;
    }
    const icons: Record<string, string> = {
      'deepseek': deepseekIcon,
      'qwen': deepseekIcon,
      'claude': claudeIcon,
      'grok': grokIcon,
      'gemini': geminiIcon,
      'gpt': gpt5Icon,
      'gpt5': gpt5Icon,
      'mystery': mysteryIcon,
    };
    return icons[modelId] || gpt5Icon;
  };

  const getModelDisplayName = (model: AIModel) => {
    if (model.id === 'hunsoccermax') {
      return user && userProfile?.display_name ? userProfile.display_name : t('demo_player');
    }
    return model.displayName.split(' ')[0];
  };

  return (
    <div className="space-y-4">
      {/* Header with Time Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{t('all_models')}</h2>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50">
            {enhancedModels.length} Models
          </span>
        </div>
        
        {/* Time Range Filter - OKX Style */}
        <div className="flex items-center bg-muted/30 rounded-lg p-0.5">
          {[
            { value: 1, label: '1D' },
            { value: 7, label: '7D' },
            { value: 30, label: '30D' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as 1 | 7 | 30)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === option.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Header */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/30">
        <div className="col-span-3">Model</div>
        <div className="col-span-2 text-right">Win Rate</div>
        <div className="col-span-2 text-right">ROI</div>
        <div className="col-span-2 text-center">Trend</div>
        <div className="col-span-1 text-right">Followers</div>
        <div className="col-span-2 text-right">Action</div>
      </div>

      {/* Model Rows */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : (
          enhancedModels.map((model, index) => {
            const isPositive = model.profitRate >= 0;
            
            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group"
              >
                {/* Desktop View */}
                <div 
                  className="hidden sm:grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg bg-card/50 border border-transparent hover:border-border/50 hover:bg-card transition-all cursor-pointer"
                  onClick={() => navigate(`/model/${model.id}`)}
                >
                  {/* Rank + Model Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 text-center">
                      {index === 0 ? (
                        <span className="text-lg">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-lg">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-lg">🥉</span>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-muted/50 p-1.5 flex items-center justify-center border border-border/30">
                      <img 
                        src={getModelIcon(model.id)} 
                        alt={model.name} 
                        className="w-full h-full object-contain"
                        style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                      />
                    </div>
                    <div>
                      <span className="font-medium text-foreground text-sm">{getModelDisplayName(model)}</span>
                      <p className="text-xs text-muted-foreground">
                        {model.totalPredictions} predictions
                      </p>
                    </div>
                  </div>
                  
                  {/* Win Rate */}
                  <div className="col-span-2 text-right">
                    <AnimatedWinRateSimple value={model.winRate} />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {model.correctPredictions}/{model.totalPredictions}
                    </p>
                  </div>
                  
                  {/* ROI */}
                  <div className="col-span-2 text-right">
                    <AnimatedROI value={model.profitRate} />
                  </div>
                  
                  {/* Trend Chart */}
                  <div className="col-span-2 flex justify-center">
                    <MiniSparkline positive={isPositive} />
                  </div>
                  
                  {/* Followers */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-medium text-foreground">{model.followers.toLocaleString()}</span>
                  </div>
                  
                  {/* Action */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(model.id, getModelDisplayName(model));
                      }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCopyTradeDialog(model.id, getModelDisplayName(model));
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-[hsl(145,65%,50%)] text-black hover:bg-[hsl(145,65%,45%)] transition-colors flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>

                {/* Mobile View */}
                <div 
                  className="sm:hidden p-4 rounded-lg bg-card/50 border border-border/30"
                  onClick={() => navigate(`/model/${model.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 text-center">
                        {index === 0 ? (
                          <span className="text-base">🥇</span>
                        ) : index === 1 ? (
                          <span className="text-base">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-base">🥉</span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-muted/50 p-1 flex items-center justify-center">
                        <img 
                          src={getModelIcon(model.id)} 
                          alt={model.name} 
                          className="w-full h-full object-contain"
                          style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                        />
                      </div>
                      <span className="font-medium text-foreground text-sm">{getModelDisplayName(model)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Win Rate</p>
                      <AnimatedWinRateSimple value={model.winRate} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">ROI</p>
                      <AnimatedROI value={model.profitRate} />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">Followers</p>
                      <span className="text-sm font-medium text-foreground">{model.followers.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchTodayHistory(model.id, getModelDisplayName(model));
                      }}
                      className="flex-1 py-2 text-xs font-medium rounded-md bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      History
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCopyTradeDialog(model.id, getModelDisplayName(model));
                      }}
                      className="flex-1 py-2 text-xs font-medium rounded-md bg-[hsl(145,65%,50%)] text-black hover:bg-[hsl(145,65%,45%)] transition-colors flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Copy Trade
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/30">
        <div className="bg-muted/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Top Win Rate</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {enhancedModels[0]?.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-muted/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Avg Win Rate</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {(enhancedModels.reduce((sum, m) => sum + m.winRate, 0) / enhancedModels.length).toFixed(1)}%
          </p>
        </div>
        <div className="bg-muted/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Total Predictions</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {enhancedModels.reduce((sum, m) => sum + m.totalPredictions, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-muted/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Total Followers</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {enhancedModels.reduce((sum, m) => sum + m.followers, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        {t('note')}: {t('statistics_note')}
      </p>

      {/* Today History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden bg-card border-border/50">
          <DialogHeader className="border-b border-border/30 pb-4">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <History className="h-5 w-5" />
              {selectedModelHistory?.modelName} - History
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
              </div>
            ) : selectedModelHistory?.positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No history available
              </div>
            ) : (
              <div className="space-y-2 py-4">
                {selectedModelHistory?.positions.map((pos) => (
                  <div 
                    key={pos.id}
                    className="p-3 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-foreground">
                        {pos.home_team} vs {pos.away_team}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        pos.result === 'win'
                          ? 'bg-[hsl(145,65%,50%)]/20 text-[hsl(145,65%,50%)]'
                          : 'bg-[hsl(0,72%,55%)]/20 text-[hsl(0,72%,55%)]'
                      }`}>
                        {pos.result === 'win' ? 'Win' : 'Loss'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{pos.prediction}</span>
                      <span className={`font-mono font-medium ${
                        (pos.pnl || 0) >= 0 ? 'text-[hsl(145,65%,50%)]' : 'text-[hsl(0,72%,55%)]'
                      }`}>
                        {(pos.pnl || 0) >= 0 ? '+' : ''}{pos.pnl?.toFixed(2)} PTS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Trade Dialog */}
      <Dialog open={isCopyTradeDialogOpen} onOpenChange={setIsCopyTradeDialogOpen}>
        <DialogContent className="sm:max-w-[380px] bg-card border-border/50">
          <DialogHeader className="border-b border-border/30 pb-4">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Zap className="w-5 h-5 text-[hsl(145,65%,50%)]" />
              Copy {copyTradeModel?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Model Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
              <div className="w-10 h-10 rounded-lg bg-muted/50 p-1.5">
                <img 
                  src={copyTradeModel ? getModelIcon(copyTradeModel.id) : ''} 
                  alt={copyTradeModel?.name || ''} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{copyTradeModel?.name}</p>
                <p className="text-xs text-muted-foreground">Auto-follow next prediction</p>
              </div>
            </div>
            
            {/* Amount Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Amount (PTS)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[50, 100, 200, 500].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCopyTradeAmount(amount)}
                    className={`py-2 text-xs font-medium rounded-md transition-colors border ${
                      copyTradeAmount === amount
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent text-muted-foreground border-border/50 hover:border-foreground hover:text-foreground'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={copyTradeAmount}
                onChange={(e) => setCopyTradeAmount(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-md text-sm focus:outline-none focus:border-foreground transition-colors"
                placeholder="Custom amount"
                min={10}
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border/30">
            <button
              onClick={() => setIsCopyTradeDialogOpen(false)}
              className="flex-1 py-2.5 text-sm font-medium rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCopyTrade}
              disabled={isCopyTrading || copyTradeAmount < 10}
              className="flex-1 py-2.5 text-sm font-medium rounded-md bg-[hsl(145,65%,50%)] text-black hover:bg-[hsl(145,65%,45%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCopyTrading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Confirm
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderboardTable;

import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown, TrendingUp, ChevronRight, Zap, Target, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AIModel } from "@/types/prediction";
import { Button } from "@/components/ui/button";

const LeaderboardTable = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modelsWithRealData, setModelsWithRealData] = useState<AIModel[]>(aiModels);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<1 | 7 | 30>(7);
  const [userProfile, setUserProfile] = useState<{ display_name: string; avatar_url: string } | null>(null);

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

  // Generate AI stats with mock data
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
        
        // Generate streak (consecutive wins/losses)
        const streak = Math.floor(Math.random() * 6) - 2; // -2 to 3
        
        return {
          ...model,
          winRate: Math.round(winRate * 10) / 10,
          totalPredictions,
          correctPredictions,
          totalBetAmount,
          validAmount,
          profitAmount,
          profitRate: Math.round(profitRate * 10) / 10,
          accuracy: Math.round(winRate * 10) / 10,
          streak,
        };
      });

      setModelsWithRealData(updatedModels);
      setIsLoading(false);
    };

    generateAIStats();
  }, [timeRange]);

  const enhancedModels = useMemo(() => 
    modelsWithRealData
      .map(model => ({
        ...model,
        correctPredictions: (model as any).correctPredictions || 0,
        totalBetAmount: (model as any).totalBetAmount || 0,
        profitRate: (model as any).profitRate || 0,
        streak: (model as any).streak || 0,
      }))
      .sort((a, b) => b.winRate - a.winRate),
    [modelsWithRealData]
  );

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
    };
    return icons[modelId] || gpt5Icon;
  };

  const getModelDisplayName = (model: AIModel) => {
    if (model.id === 'hunsoccermax') {
      return user && userProfile?.display_name ? userProfile.display_name : 'Player';
    }
    return model.displayName.split(' ')[0];
  };

  const getAccentColor = (modelId: string): string => {
    const colors: Record<string, string> = {
      'deepseek': 'hsl(200, 70%, 50%)',
      'gpt5': 'hsl(160, 50%, 45%)',
      'claude': 'hsl(25, 65%, 55%)',
      'gemini': 'hsl(270, 50%, 55%)',
      'grok': 'hsl(210, 25%, 45%)',
      'hunsoccermax': 'hsl(35, 80%, 55%)',
    };
    return colors[modelId] || 'hsl(210, 50%, 50%)';
  };

  const handleSubscribe = (modelId: string, modelName: string) => {
    if (!user) {
      toast({
        title: t('please_login'),
        description: t('login_to_subscribe'),
        variant: "default",
      });
      navigate('/auth');
      return;
    }
    toast({
      title: "Coming Soon",
      description: `Auto-follow for ${modelName} will be available soon.`,
    });
  };

  const timeRangeLabels = {
    1: { short: '24H', full: '24 Hours' },
    7: { short: '7D', full: '7 Days' },
    30: { short: '30D', full: '30 Days' },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('ai_leaderboard')}</h2>
            <p className="text-xs text-muted-foreground">Ranked by prediction accuracy</p>
          </div>
        </div>
        
        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {([1, 7, 30] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                timeRange === range
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {timeRangeLabels[range].short}
            </button>
          ))}
        </div>
      </div>
      
      {/* Leaderboard Cards */}
      <div className="space-y-3">
        {enhancedModels.map((model, index) => {
          const isPositiveProfit = model.profitRate >= 0;
          const accentColor = getAccentColor(model.id);
          
          return (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card 
                className="overflow-hidden border-border/40 hover:border-border/80 transition-all duration-300 hover:shadow-lg cursor-pointer group"
                onClick={() => navigate(`/models/${model.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Rank Indicator */}
                    <div 
                      className="w-12 sm:w-14 flex-shrink-0 flex flex-col items-center justify-center gap-1"
                      style={{ 
                        background: index < 3 
                          ? `linear-gradient(180deg, ${accentColor}15 0%, transparent 100%)`
                          : undefined 
                      }}
                    >
                      <span className={`text-xl sm:text-2xl font-bold ${
                        index === 0 ? 'text-amber-500' : 
                        index === 1 ? 'text-slate-400' : 
                        index === 2 ? 'text-amber-600' : 
                        'text-muted-foreground/60'
                      }`}>
                        {index + 1}
                      </span>
                      {index < 3 && (
                        <div 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                      )}
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 py-4 pr-4 pl-2">
                      {/* Top Row: Model Info */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div 
                            className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden"
                            style={{ 
                              background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`,
                              border: `1px solid ${accentColor}30`
                            }}
                          >
                            <img 
                              src={getModelIcon(model.id)} 
                              alt={model.name} 
                              className={`w-6 h-6 sm:w-8 sm:h-8 ${model.id === 'hunsoccermax' && user ? 'object-cover w-full h-full' : 'object-contain'}`}
                              style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                            />
                          </div>
                          
                          {/* Name & Meta */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                                {getModelDisplayName(model)}
                              </h3>
                              {model.streak !== 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  model.streak > 0 
                                    ? 'bg-success/10 text-success' 
                                    : 'bg-destructive/10 text-destructive'
                                }`}>
                                  {model.streak > 0 ? `W${model.streak}` : `L${Math.abs(model.streak)}`}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {model.totalPredictions} predictions · {timeRangeLabels[timeRange].full}
                            </p>
                          </div>
                        </div>
                        
                        {/* Subscribe Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubscribe(model.id, getModelDisplayName(model));
                          }}
                          className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          Follow
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                      
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Win Rate */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wide">
                              Accuracy
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg sm:text-xl font-bold text-foreground font-mono-data">
                              {model.winRate.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full rounded-full"
                              style={{ backgroundColor: accentColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${model.winRate}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                        
                        {/* ROI */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wide">
                              ROI
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-lg sm:text-xl font-bold font-mono-data ${
                              isPositiveProfit ? 'text-success' : 'text-destructive'
                            }`}>
                              {isPositiveProfit ? '+' : ''}{model.profitRate.toFixed(1)}
                            </span>
                            <span className={`text-xs ${isPositiveProfit ? 'text-success/70' : 'text-destructive/70'}`}>
                              %
                            </span>
                          </div>
                          {/* Trend Indicator */}
                          <div className="flex items-center gap-1">
                            {isPositiveProfit ? (
                              <ArrowUp className="h-3 w-3 text-success" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-destructive" />
                            )}
                            <span className="text-[10px] text-muted-foreground">vs last period</span>
                          </div>
                        </div>
                        
                        {/* Win/Loss */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wide">
                              Record
                            </span>
                          </div>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-lg sm:text-xl font-bold text-success font-mono-data">
                              {model.correctPredictions}
                            </span>
                            <span className="text-xs text-muted-foreground mx-0.5">-</span>
                            <span className="text-lg sm:text-xl font-bold text-destructive font-mono-data">
                              {model.totalPredictions - model.correctPredictions}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            W - L
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      
      {/* Footer Note */}
      <p className="text-center text-xs text-muted-foreground pt-2">
        Stats updated in real-time · Click card to view details
      </p>
    </div>
  );
};

export default LeaderboardTable;

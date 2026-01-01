import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Filter, TrendingUp, TrendingDown, Users, Clock, DollarSign, Trophy, Loader2, ThumbsUp, Zap, CheckCircle, XCircle, History, UserPlus, Calendar } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { virtualPlayers } from "@/data/virtualPlayers";
import { aiModels } from "@/data/mockData";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";
import ChallengeAIBanner from "@/components/ChallengeAIBanner";
import { GoalIcon } from "@/components/FootballIcons";

// AI Model Icons
import deepseekIcon from "@/assets/deepseek-icon.png";
import gpt5Icon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";

// Expert Images
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";
import grassTexture from "@/assets/grass-texture.jpg";

interface PlayerData {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  changePercent: number;
  totalBetAmount?: number;
  profitAmount?: number;
  rank: number;
  bestStreak?: number;
  currentStreak?: number;
  worstStreak?: number;
  isVirtual?: boolean;
  followers?: number;
  tradingDays?: number;
  tradingVolume?: number;
}

type MainTab = 'ai' | 'accuracy' | 'copyTrade';
type SubTab = 'high' | 'low';
type SortType = 'comprehensive' | 'winRate' | 'profit' | 'followers';
type TimeFilter = 'day' | 'week' | 'month';

// AI Model icon mapping
const getAIIcon = (modelId: string) => {
  const iconMap: Record<string, string> = {
    'deepseek': deepseekIcon,
    'gpt5': gpt5Icon,
    'claude': claudeIcon,
    'gemini': geminiIcon,
    'grok': grokIcon,
    'hunsoccer-max': hunsoccerIcon,
  };
  return iconMap[modelId] || hunsoccerIcon;
};

// Expert images mapping
const getExpertImage = (modelId: string) => {
  switch(modelId) {
    case 'deepseek': return starRonaldo;
    case 'gpt5': return starNeymar;
    case 'claude': return starMessi;
    case 'gemini': return starHaaland;
    case 'grok': return starMbappe;
    case 'hunsoccer-max': return starHunsoccer;
    default: return starRonaldo;
  }
};

// Color tint mapping
const getColorTint = (modelId: string) => {
  switch(modelId) {
    case 'deepseek': return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
    case 'gpt5': return 'from-[hsl(0,0%,35%)]/80 to-[hsl(0,0%,20%)]/80';
    case 'claude': return 'from-[hsl(14,92%,68%)]/80 to-[hsl(14,92%,50%)]/80';
    case 'gemini': return 'from-[hsl(250,75%,68%)]/80 to-[hsl(250,75%,50%)]/80';
    case 'grok': return 'from-[hsl(158,68%,60%)]/80 to-[hsl(158,68%,45%)]/80';
    case 'hunsoccer-max': return 'from-[hsl(38,92%,50%)]/80 to-[hsl(38,92%,40%)]/80';
    default: return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
  }
};

const MobileLeaderboardOKX = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [mainTab, setMainTab] = useState<MainTab>('ai');
  const [subTab, setSubTab] = useState<SubTab>('high');
  const [sortType, setSortType] = useState<SortType>('comprehensive');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRulesExpanded, setShowRulesExpanded] = useState(false);
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch players data
  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      // 获取真实用户数据
      const { data: predictions } = await supabase
        .from('user_predictions')
        .select('user_id, result, bet_amount, actual_payout')
        .not('result', 'is', null);

      // 获取用户资料
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, avatar_url');

      // 处理真实用户数据
      const userStats = new Map<string, {
        totalPredictions: number;
        correctPredictions: number;
        totalBet: number;
        totalProfit: number;
      }>();

      predictions?.forEach((p) => {
        if (!userStats.has(p.user_id)) {
          userStats.set(p.user_id, {
            totalPredictions: 0,
            correctPredictions: 0,
            totalBet: 0,
            totalProfit: 0
          });
        }
        const stats = userStats.get(p.user_id)!;
        stats.totalPredictions++;
        if (p.result === 'won') stats.correctPredictions++;
        stats.totalBet += p.bet_amount || 0;
        stats.totalProfit += (p.actual_payout || 0) - (p.bet_amount || 0);
      });

      const realPlayers: PlayerData[] = [];
      users?.forEach((u) => {
        const stats = userStats.get(u.id);
        if (stats && stats.totalPredictions >= 3) {
          const winRate = (stats.correctPredictions / stats.totalPredictions) * 100;
          realPlayers.push({
            id: u.id,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            totalPredictions: stats.totalPredictions,
            correctPredictions: stats.correctPredictions,
            winRate: parseFloat(winRate.toFixed(1)),
            balance: 0,
            profit: stats.totalProfit,
            changePercent: stats.totalBet > 0 ? (stats.totalProfit / stats.totalBet) * 100 : 0,
            profitAmount: stats.totalProfit,
            rank: 0,
            currentStreak: Math.floor(Math.random() * 8),
            worstStreak: Math.floor(Math.random() * 5),
            isVirtual: false,
            followers: Math.floor(100 + Math.random() * 500),
            tradingDays: Math.floor(10 + Math.random() * 80),
            tradingVolume: Math.floor(50000 + Math.random() * 2000000),
          });
        }
      });

      // 添加虚拟玩家
      const virtualPlayerData: PlayerData[] = virtualPlayers.map((vp, i) => ({
        id: vp.id,
        displayName: vp.displayName,
        avatarUrl: vp.avatarUrl,
        totalPredictions: vp.totalPredictions,
        correctPredictions: vp.correctPredictions,
        winRate: parseFloat(vp.winRate.toFixed(1)),
        balance: vp.balance || 0,
        profit: vp.profit,
        changePercent: vp.changePercent,
        profitAmount: vp.profit,
        rank: 0,
        currentStreak: Math.floor(Math.random() * 10) + 1,
        worstStreak: Math.floor(Math.random() * 6),
        isVirtual: true,
        followers: Math.floor(200 + Math.random() * 800),
        tradingDays: Math.floor(30 + Math.random() * 100),
        tradingVolume: Math.floor(500000 + Math.random() * 5000000),
      }));

      const combined = [...realPlayers, ...virtualPlayerData]
        .sort((a, b) => b.winRate - a.winRate)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      setAllPlayers(combined);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Get sorted and filtered players based on current tab and sort
  const getDisplayPlayers = useCallback(() => {
    let filtered = [...allPlayers];
    
    // Filter by sub tab
    if (subTab === 'high') {
      filtered = filtered.sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));
    } else {
      filtered = filtered.sort((a, b) => (b.worstStreak || 0) - (a.worstStreak || 0));
    }

    // Apply sort
    switch (sortType) {
      case 'winRate':
        filtered = filtered.sort((a, b) => b.winRate - a.winRate);
        break;
      case 'profit':
        filtered = filtered.sort((a, b) => b.changePercent - a.changePercent);
        break;
      case 'followers':
        filtered = filtered.sort((a, b) => (b.followers || 0) - (a.followers || 0));
        break;
      default:
        // comprehensive - balanced score
        filtered = filtered.sort((a, b) => {
          const scoreA = a.winRate * 0.4 + a.changePercent * 0.3 + ((a.followers || 0) / 100) * 0.3;
          const scoreB = b.winRate * 0.4 + b.changePercent * 0.3 + ((b.followers || 0) / 100) * 0.3;
          return scoreB - scoreA;
        });
    }

    return filtered.slice(0, 20);
  }, [allPlayers, subTab, sortType]);

  // Generate mini chart path
  const generateChartPath = (id: string, changePercent: number) => {
    const width = 100;
    const height = 32;
    const numPoints = 10;
    const seed = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const isPositive = changePercent >= 0;
    
    const points: string[] = [];
    for (let i = 0; i < numPoints; i++) {
      const x = (i / (numPoints - 1)) * width;
      const variance = ((seed * (i + 1)) % 12) - 6;
      const trend = isPositive ? (i / numPoints) * 16 : -(i / numPoints) * 12;
      const y = height / 2 - trend + variance;
      points.push(`${i === 0 ? 'M' : 'L'}${x},${Math.max(4, Math.min(height - 4, y))}`);
    }
    return points.join(' ');
  };

  const sortOptions = [
    { value: 'comprehensive', label: t('sort_comprehensive') || '综合排序' },
    { value: 'winRate', label: t('sort_win_rate') || '胜率排序' },
    { value: 'profit', label: t('sort_profit') || '收益排序' },
    { value: 'followers', label: t('sort_followers') || '跟单人数' },
  ];

  const mainTabs = [
    { value: 'ai', label: t('ai_prediction_board') || 'AI预测排行榜' },
    { value: 'accuracy', label: t('accuracy_board') || '预测者准确率' },
    { value: 'copyTrade', label: t('copy_trading_board') || '预测者跟单' },
  ];

  const subTabs = [
    { value: 'high', label: t('hot_streak_board') || '高准确率榜' },
    { value: 'low', label: t('cold_streak_board') || '低准确率榜' },
  ];

  const timeFilters = [
    { value: 'day', label: t('time_day') || '日' },
    { value: 'week', label: t('time_week') || '周' },
    { value: 'month', label: t('time_month') || '月' },
  ];

  const renderAIModels = () => {
    // Multiplier based on time filter to simulate different data
    const timeMultiplier = timeFilter === 'day' ? 0.3 : timeFilter === 'week' ? 0.7 : 1;
    
    const modelsWithStats = aiModels.map(model => {
      const seed = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const baseWinRate = 55 + (seed % 20) + (Math.sin(seed) * 5);
      const winRate = baseWinRate + (timeFilter === 'day' ? (seed % 5) - 2 : timeFilter === 'week' ? (seed % 3) - 1 : 0);
      const changePercent = (10 + (seed % 30) - 5) * timeMultiplier;
      const totalPredictions = Math.round((25 + (seed % 10)) * timeMultiplier);
      const correctPredictions = Math.round(totalPredictions * (winRate / 100));
      const wrongPredictions = totalPredictions - correctPredictions;
      // Calculate profit amount based on changePercent
      const profitAmount = Math.round((changePercent / 100) * (10000 + seed * 10));
      return {
        ...model,
        winRate: Math.round(winRate * 10) / 10,
        changePercent: Math.round(changePercent * 10) / 10,
        followers: Math.round((500 + (seed % 500)) * timeMultiplier),
        tradingDays: 30 + (seed % 60),
        totalPredictions,
        correctPredictions,
        wrongPredictions,
        profitAmount,
      };
    }).sort((a, b) => b.winRate - a.winRate);

    const winningModel = modelsWithStats[0];

    return (
      <div className="space-y-4">
        {/* Time Filter Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value as TimeFilter)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {timeFilter === 'day' ? t('today_data') || '今日数据' : 
             timeFilter === 'week' ? t('weekly_data') || '本周数据' : 
             t('monthly_data') || '本月数据'}
          </div>
        </div>

        {/* AI Model Cards List */}
        {modelsWithStats.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card/50 rounded-xl p-4 border border-border/30"
          >
            {/* Top: Icon + Name + Like Button + Action Buttons */}
            <div className="flex items-start gap-3 mb-3">
              <div className="relative">
                <div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/models?model=${model.id}`)}
                >
                  <img src={getAIIcon(model.id)} alt={model.name} className="w-8 h-8 object-contain" />
                </div>
                {index < 3 && (
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    index === 0 ? 'bg-yellow-500 text-yellow-950' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    'bg-amber-600 text-amber-950'
                  }`}>
                    {index + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-bold text-base text-foreground truncate flex items-center gap-1.5 cursor-pointer"
                  onClick={() => navigate(`/models?model=${model.id}`)}
                >
                  {model.name}
                  <button 
                    className="p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Like action placeholder
                    }}
                  >
                    <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                  </button>
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {t('predicted_matches', { count: model.totalPredictions }) || `预测${model.totalPredictions}场`}
                </p>
              </div>
              {/* Top Right Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button 
                  className="px-2 py-1 text-[10px] font-medium bg-muted/50 hover:bg-muted rounded-md flex items-center gap-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/models?model=${model.id}&tab=history`);
                  }}
                >
                  <History className="h-3 w-3" />
                  {t('history_predictions') || '历史预测'}
                </button>
                <button 
                  className="px-2 py-1 text-[10px] font-medium bg-primary/20 hover:bg-primary/30 text-primary rounded-md flex items-center gap-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Auto follow action placeholder
                  }}
                >
                  <UserPlus className="h-3 w-3" />
                  {t('auto_follow') || '自动跟单'}
                </button>
              </div>
            </div>

            {/* Middle: Profit Rate + Profit Amount + Followers + Chart */}
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">
                  {t('profit_rate_label') || '盈利率'}
                </p>
                <p className={`text-3xl font-bold tracking-tight ${model.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {model.changePercent >= 0 ? '+' : ''}{model.changePercent.toFixed(2)}%
                </p>
                {/* Profit Amount with Hunter Coin */}
                <p className="text-[10px] text-muted-foreground mt-2 mb-0.5">
                  {t('profit_amount_label') || '盈利金额'}
                </p>
                <p className={`text-sm font-semibold flex items-center gap-1 ${model.profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {model.profitAmount >= 0 ? '+' : ''}{model.profitAmount.toLocaleString()}
                  <img src={hunterCoinIcon} alt="Hunter Coin" className="w-4 h-4" />
                </p>
                {/* Followers Count */}
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t('followers_count', { count: model.followers }) || `${model.followers}人跟单`}
                </p>
              </div>
              
              {/* Mini Chart */}
              <div className="w-24 h-10">
                <svg width="100" height="32" viewBox="0 0 100 32" className="w-full h-full">
                  <path
                    d={generateChartPath(model.id, model.changePercent)}
                    fill="none"
                    stroke={model.changePercent >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Bottom Stats: Correct, Wrong, Win Rate */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle className="h-3 w-3" />
                  {t('correct_matches_count', { count: model.correctPredictions }) || `正确${model.correctPredictions}场`}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" />
                  {t('wrong_matches_count', { count: model.wrongPredictions }) || `错误${model.wrongPredictions}场`}
                </span>
              </div>
              <div className="flex items-center gap-1 text-success font-medium">
                <Zap className="h-3 w-3" />
                {t('win_rate_prefix') || '胜率'}{model.winRate}%
              </div>
            </div>
          </motion.div>
        ))}

        {/* Bottom Section: Winning Model Card + Bar Chart - Side by Side */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          {/* Winning Model Card - Compact */}
          <Card className="relative overflow-hidden">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${getExpertImage(winningModel.id)})` }}
            />
            
            {/* Color Tint Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${getColorTint(winningModel.id)}`} />
            
            {/* Dark gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
            
            <CardContent className="p-3 relative z-10 h-full flex flex-col">
              <h3 className="text-[10px] font-bold mb-2 text-white/80">{t('winning_model') || '获胜模型'}</h3>
              <div className="flex items-center gap-1.5 mb-2">
                <img 
                  src={getAIIcon(winningModel.id)} 
                  alt={winningModel.name} 
                  className="h-6 w-6"
                  style={winningModel.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
                <span className="text-sm font-bold text-white truncate">{winningModel.displayName.split(' ')[0]}</span>
              </div>
              
              <div className="space-y-1.5 flex-1">
                <div>
                  <p className="text-[9px] text-white/70">{t('win_rate_label') || '胜率'}</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {winningModel.winRate}%
                  </p>
                </div>
                
                <div>
                  <p className="text-[9px] text-white/70">{t('correct_predictions_label') || '正确预测'}</p>
                  <p className="text-sm font-bold font-mono text-success">
                    {winningModel.correctPredictions} / {winningModel.totalPredictions}
                  </p>
                </div>
                
                <div>
                  <p className="text-[9px] text-white/70 mb-1">{t('active_matches') || '活跃比赛'}</p>
                  <div className="flex gap-1 flex-wrap">
                    <div className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[8px] text-white flex items-center gap-0.5">
                      <GoalIcon size={8} className="flex-shrink-0" />
                      <span>Premier</span>
                    </div>
                    <div className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[8px] text-white flex items-center gap-0.5">
                      <GoalIcon size={8} className="flex-shrink-0" />
                      <span>La Liga</span>
                    </div>
                    <div className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[8px] text-white flex items-center gap-0.5">
                      <GoalIcon size={8} className="flex-shrink-0" />
                      <span>Bundes</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Compact */}
          <Card className="relative overflow-hidden">
            {/* Grass texture background */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{ 
                backgroundImage: `url(${grassTexture})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/60" />
            
            <CardContent className="p-2 relative z-10 h-full">
              <div className="flex items-end gap-1 h-full min-h-[180px]">
                {(() => {
                  const maxHeight = 130;
                  const minHeight = 25;
                  const baseWinRate = 100;
                  
                  return modelsWithStats.map((model) => {
                    const heightRatio = Math.min(model.winRate / baseWinRate, 1);
                    const heightPx = heightRatio * (maxHeight - minHeight) + minHeight;
                    
                    return (
                      <div key={model.id} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                        <div className="text-[7px] font-mono font-bold">
                          {model.winRate.toFixed(1)}%
                        </div>
                        <div 
                          className="w-full rounded-t-md relative flex items-end justify-center pb-1 transition-all duration-300 shadow-md"
                          style={{ 
                            height: `${heightPx}px`,
                            backgroundColor: `hsl(var(--${model.color}))`,
                          }}
                        >
                          <img 
                            src={getAIIcon(model.id)} 
                            alt={model.name}
                            className="h-3.5 w-3.5 object-contain"
                            style={model.id === 'grok' ? { filter: 'brightness(0) invert(1)' } : undefined}
                          />
                        </div>
                        <div className="text-[6px] text-center font-medium text-muted-foreground truncate w-full">
                          {model.displayName.split(' ')[0].substring(0, 5)}...
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Challenge AI Banner - Auto fit screen */}
      <div className="w-full overflow-hidden">
        <ChallengeAIBanner />
      </div>

      {/* Main Tabs - OKX Style */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/30">
        <div className="flex items-center gap-4 px-4 pt-2 overflow-x-auto scrollbar-hide">
          {mainTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setMainTab(tab.value as MainTab)}
              className={`relative py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                mainTab === tab.value
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.label}
              {mainTab === tab.value && (
                <motion.div
                  layoutId="mainTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs - Only show for accuracy and copyTrade tabs */}
      {(mainTab === 'accuracy' || mainTab === 'copyTrade') && (
        <div className="sticky top-[52px] z-20 bg-background">
          <div className="flex items-center gap-4 px-4 py-2">
            {subTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSubTab(tab.value as SubTab)}
                className={`relative text-sm font-medium transition-colors ${
                  subTab === tab.value
                    ? 'text-foreground font-bold'
                    : 'text-muted-foreground'
                }`}
              >
                {tab.label}
                {subTab === tab.value && (
                  <motion.div
                    layoutId="subTabIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-foreground rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort & Filter Row - Only for player tabs */}
      {(mainTab === 'accuracy' || mainTab === 'copyTrade') && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1 px-3 py-1.5 bg-muted/40 rounded-lg text-sm font-medium text-foreground"
            >
              {sortOptions.find(s => s.value === sortType)?.label}
              <ChevronDown className={`h-4 w-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden"
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortType(option.value as SortType);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        sortType === option.value
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Button */}
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted/40 transition-colors">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Rules Accordion - Only for player tabs */}
      {(mainTab === 'accuracy' || mainTab === 'copyTrade') && (
        <>
          <button
            onClick={() => setShowRulesExpanded(!showRulesExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/20"
          >
            <span className="text-sm text-foreground font-medium">
              {t('ranking_rules') || '交易员上榜条件及排序规则'}
            </span>
            <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showRulesExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showRulesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 bg-muted/10 text-xs text-muted-foreground space-y-1">
                  <p>• {t('rule_predictions') || '预测次数 ≥ 10 次'}</p>
                  <p>• {t('rule_winrate') || '胜率 ≥ 50%'}</p>
                  <p>• {t('rule_days') || '活跃天数 ≥ 7 天'}</p>
                  <p>• {t('rule_sort') || '综合排序基于胜率、收益率、跟单人数加权计算'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Content Area */}
      <div className="px-4 py-2 space-y-3 pb-20">
        <AnimatePresence mode="wait">
          {isLoading && mainTab !== 'ai' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-16"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key={`${mainTab}-${subTab}-${sortType}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {mainTab === 'ai' ? (
                renderAIModels()
              ) : (
                getDisplayPlayers().map((player, index) => (
                  <PlayerCardOKX
                    key={player.id}
                    player={player}
                    index={index}
                    generateChartPath={generateChartPath}
                    onClick={() => navigate(`/player/${player.id}`)}
                    subTab={subTab}
                    mainTab={mainTab}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// OKX-style Player Card Component
interface PlayerCardOKXProps {
  player: PlayerData;
  index: number;
  generateChartPath: (id: string, changePercent: number) => string;
  onClick: () => void;
  subTab: SubTab;
  mainTab: MainTab;
}

const PlayerCardOKX = ({ player, index, generateChartPath, onClick, subTab, mainTab }: PlayerCardOKXProps) => {
  const { t } = useTranslation();
  const isPositive = player.changePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="bg-card/50 rounded-xl p-4 border border-border/30 cursor-pointer active:scale-[0.99] transition-transform"
    >
      {/* Top: Avatar + Name + Badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <Avatar className="w-12 h-12 border-2 border-border">
            <AvatarImage src={player.avatarUrl} alt={player.displayName} />
            <AvatarFallback className="text-sm">{player.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          {index < 3 && (
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              index === 0 ? 'bg-yellow-500 text-yellow-950' :
              index === 1 ? 'bg-gray-400 text-gray-900' :
              'bg-amber-600 text-amber-950'
            }`}>
              {index + 1}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-foreground truncate">{player.displayName}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              subTab === 'high' 
                ? 'bg-success/20 text-success' 
                : 'bg-destructive/20 text-destructive'
            }`}>
              {subTab === 'high' ? (
                <>
                  <TrendingUp className="h-2.5 w-2.5" />
                  {player.currentStreak || 0}x
                </>
              ) : (
                <>
                  <TrendingDown className="h-2.5 w-2.5" />
                  {player.worstStreak || 0}x
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Profit Rate + Chart */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">
            {mainTab === 'copyTrade' 
              ? (t('90d_copy_profit') || '近90日跟单收益')
              : (t('90d_profit') || '近90日收益率')}
          </p>
          <p className={`text-3xl font-bold tracking-tight ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{player.changePercent.toFixed(2)}%
          </p>
        </div>
        
        {/* Mini Chart */}
        <div className="w-24 h-10">
          <svg width="100" height="32" viewBox="0 0 100 32" className="w-full h-full">
            <path
              d={generateChartPath(player.id, player.changePercent)}
              fill="none"
              stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {player.followers || 0}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {player.tradingDays || 0}{t('days') || '天'}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {((player.tradingVolume || 0) / 10000).toFixed(1)}万
          </span>
        </div>
        <div className="flex items-center gap-1 text-success font-medium">
          <Trophy className="h-3 w-3" />
          {player.winRate}%
        </div>
      </div>
    </motion.div>
  );
};

export default MobileLeaderboardOKX;

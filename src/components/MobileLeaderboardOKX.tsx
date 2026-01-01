import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Filter, TrendingUp, TrendingDown, Users, Clock, DollarSign, Trophy, Loader2, ThumbsUp, Zap, CheckCircle, XCircle, History, UserPlus, Calendar, X, Search } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [showAllPredictors, setShowAllPredictors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Generate mini chart path - more realistic profit curve
  const generateChartPath = (id: string, changePercent: number) => {
    const width = 100;
    const height = 32;
    const numPoints = 12;
    const seed = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const isPositive = changePercent >= 0;
    
    // Create more realistic price movements with momentum
    const points: number[] = [];
    let currentY = height / 2;
    let momentum = 0;
    
    for (let i = 0; i < numPoints; i++) {
      // Seeded random for consistency
      const rand1 = Math.sin(seed * (i + 1) * 0.1) * 0.5 + 0.5;
      const rand2 = Math.cos(seed * (i + 2) * 0.15) * 0.5 + 0.5;
      
      // Add trend direction
      const trendForce = isPositive ? -0.8 : 0.6;
      
      // Random walk with momentum
      const randomChange = (rand1 - 0.5) * 6;
      momentum = momentum * 0.3 + randomChange + trendForce;
      currentY += momentum;
      
      // Occasional larger moves (volatility)
      if (rand2 > 0.85) {
        currentY += (rand1 - 0.5) * 4;
      }
      
      // Clamp to bounds
      currentY = Math.max(6, Math.min(height - 6, currentY));
      points.push(currentY);
    }
    
    // Ensure end point reflects overall trend
    if (isPositive) {
      points[points.length - 1] = Math.min(points[points.length - 1], height * 0.25);
    } else {
      points[points.length - 1] = Math.max(points[points.length - 1], height * 0.75);
    }
    
    // Generate smooth curve path
    const pathPoints = points.map((y, i) => {
      const x = (i / (numPoints - 1)) * width;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    return pathPoints.join(' ');
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
            className="bg-card/50 rounded-lg p-3 border border-border/30"
          >
            {/* Top: Icon + Name + Like Button + Action Buttons */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className="relative flex-shrink-0">
                <div 
                  className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border/50 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/models?model=${model.id}`)}
                >
                  <img src={getAIIcon(model.id)} alt={model.name} className="w-6 h-6 object-contain" />
                </div>
                {index < 3 && (
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
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
                  className="font-bold text-sm text-foreground truncate flex items-center gap-1 cursor-pointer"
                  onClick={() => navigate(`/models?model=${model.id}`)}
                >
                  {model.name}
                  <button 
                    className="p-0.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <ThumbsUp className="h-3 w-3 text-primary" />
                  </button>
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {t('predicted_matches', { count: model.totalPredictions }) || `预测${model.totalPredictions}场`}
                </p>
              </div>
              {/* Top Right Action Buttons */}
              <div className="flex items-center gap-1">
                <button 
                  className="px-1.5 py-0.5 text-[9px] font-medium bg-muted/50 hover:bg-muted rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/models?model=${model.id}&tab=history`);
                  }}
                >
                  {t('history_predictions') || '历史预测'}
                </button>
                <button 
                  className="px-1.5 py-0.5 text-[9px] font-medium bg-success hover:bg-success/90 text-success-foreground rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {t('today_predictions') || '今日预测'}
                </button>
              </div>
            </div>

            {/* Middle: Profit Rate + Profit Amount + Chart */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0">
                {/* Profit Rate - Same Line */}
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap w-10">
                    {t('profit_rate_label') || '盈利率'}
                  </span>
                  <span className={`text-lg font-bold tracking-tight ${model.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {model.changePercent >= 0 ? '+' : ''}{model.changePercent.toFixed(2)}%
                  </span>
                </div>
                {/* Profit Amount - Same Line */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap w-10">
                    {t('profit_amount_label') || '盈利金额'}
                  </span>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${model.profitAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {model.profitAmount >= 0 ? '+' : ''}{model.profitAmount.toLocaleString()}
                    <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3 h-3" />
                  </span>
                </div>
              </div>
              
              {/* Mini Chart */}
              <div className="w-16 h-8 flex-shrink-0">
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

            {/* Bottom Stats: Correct, Wrong, Followers, Win Rate */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/20">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-success">
                  <CheckCircle className="h-2.5 w-2.5" />
                  {t('correct_matches_count', { count: model.correctPredictions }) || `正确${model.correctPredictions}场`}
                </span>
                <span className="flex items-center gap-0.5 text-destructive">
                  <XCircle className="h-2.5 w-2.5" />
                  {t('wrong_matches_count', { count: model.wrongPredictions }) || `错误${model.wrongPredictions}场`}
                </span>
                <span className="flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />
                  {model.followers}{t('followers_suffix') || '跟单'}
                </span>
              </div>
              <div className="text-success font-medium">
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

      {/* Time Filter & All Predictors - For accuracy and copyTrade tabs */}
      {(mainTab === 'accuracy' || mainTab === 'copyTrade') && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value as TimeFilter)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeFilter === filter.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button 
            className="px-3 py-1.5 text-xs font-medium bg-muted/50 hover:bg-muted rounded-lg transition-colors flex items-center gap-1"
            onClick={() => setShowAllPredictors(true)}
          >
            <Users className="h-3 w-3" />
            {t('all_predictors') || '全部预测者'}
          </button>
        </div>
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

      {/* All Predictors Dialog */}
      <Dialog open={showAllPredictors} onOpenChange={setShowAllPredictors}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] p-0 bg-card border-primary/30 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/30">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-1 h-5 bg-primary rounded-full" />
              {subTab === 'high' 
                ? (t('high_accuracy_all_predictors') || '高准确率榜 - 全部预测者')
                : (t('low_accuracy_all_predictors') || '低准确率榜 - 全部预测者')}
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('search_predictor_name') || '搜索预测者名称...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-primary/30 focus:border-primary"
              />
            </div>
          </div>
          
          {/* Predictors List */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[55vh] space-y-2">
            {allPlayers
              .filter(player => 
                player.displayName.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .sort((a, b) => subTab === 'high' 
                ? (b.currentStreak || 0) - (a.currentStreak || 0)
                : (b.worstStreak || 0) - (a.worstStreak || 0)
              )
              .map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => {
                    setShowAllPredictors(false);
                    navigate(`/player/${player.id}`);
                  }}
                  className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/40 cursor-pointer transition-all"
                >
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-500 text-yellow-950' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    index === 2 ? 'bg-amber-600 text-amber-950' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                    <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* Name & Streak */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">{player.displayName}</h4>
                    <p className={`text-xs ${subTab === 'high' ? 'text-success' : 'text-destructive'}`}>
                      {subTab === 'high' 
                        ? (t('consecutive_correct') || '连续正确') + ' '
                        : (t('consecutive_wrong') || '连续错误') + ' '}
                      <span className="font-bold">
                        {subTab === 'high' ? (player.currentStreak || 0) : (player.worstStreak || 0)}
                      </span>
                    </p>
                  </div>
                  
                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {t('win_rate_prefix') || '胜率'} <span className="text-success font-bold">{player.winRate}%</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-0.5">
                      {t('profit_label') || '盈利'} <span className={`font-bold ${player.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {player.changePercent >= 0 ? '+' : ''}{Math.round(player.profitAmount || 0)}
                      </span>
                      <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3.5 h-3.5" />
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// OKX-style Player Card Component - Matching AI card layout
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
  const navigate = useNavigate();
  const isPositive = player.changePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="bg-card/50 rounded-lg p-3 border border-border/30 cursor-pointer active:scale-[0.99] transition-transform"
    >
      {/* Top: Avatar + Name + Streak Badge + Action Buttons */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={player.avatarUrl} alt={player.displayName} />
            <AvatarFallback className="text-xs">{player.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          {index < 3 && (
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              index === 0 ? 'bg-yellow-500 text-yellow-950' :
              index === 1 ? 'bg-gray-400 text-gray-900' :
              'bg-amber-600 text-amber-950'
            }`}>
              {index + 1}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground truncate">
            {player.displayName}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{t('predicted_matches', { count: player.totalPredictions }) || `预测${player.totalPredictions}场`}</span>
            {/* Streak Indicators - Like PC version */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(player.currentStreak || 0, 5) }).map((_, i) => (
                <span 
                  key={i} 
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                    subTab === 'high' 
                      ? 'border-success/50 text-success bg-success/10' 
                      : 'border-destructive/50 text-destructive bg-destructive/10'
                  }`}
                >
                  {subTab === 'high' ? '胜' : '败'}
                </span>
              ))}
              {(subTab === 'high' ? (player.currentStreak || 0) : (player.worstStreak || 0)) > 5 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] border border-muted-foreground/30 text-muted-foreground">
                  ···
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-1">
          <button 
            className="px-1.5 py-0.5 text-[9px] font-medium bg-muted/50 hover:bg-muted rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/player/${player.id}?tab=history`);
            }}
          >
            {t('history_predictions') || '历史预测'}
          </button>
          <button 
            className="px-1.5 py-0.5 text-[9px] font-medium bg-success hover:bg-success/90 text-success-foreground rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {t('today_predictions') || '今日预测'}
          </button>
        </div>
      </div>

      {/* Middle: Profit Rate + Profit Amount + Chart */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          {/* Profit Rate - Same Line */}
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] text-muted-foreground whitespace-nowrap w-10">
              {mainTab === 'copyTrade' 
                ? (t('copy_profit_label') || '跟单收益')
                : (t('profit_rate_label') || '盈利率')}
            </span>
            <span className={`text-lg font-bold tracking-tight ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{player.changePercent.toFixed(2)}%
            </span>
          </div>
          {/* Profit Amount - Same Line */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground whitespace-nowrap w-10">
              {t('profit_amount_label') || '盈利金额'}
            </span>
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{(player.profitAmount || 0).toLocaleString()}
              <img src={hunterCoinIcon} alt="Hunter Coin" className="w-3 h-3" />
            </span>
          </div>
        </div>
        
        {/* Mini Chart */}
        <div className="w-16 h-8 flex-shrink-0">
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
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/20">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 text-success">
            <CheckCircle className="h-2.5 w-2.5" />
            {t('correct_matches_count', { count: player.correctPredictions }) || `正确${player.correctPredictions}场`}
          </span>
          <span className="flex items-center gap-0.5 text-destructive">
            <XCircle className="h-2.5 w-2.5" />
            {t('wrong_matches_count', { count: player.totalPredictions - player.correctPredictions }) || `错误${player.totalPredictions - player.correctPredictions}场`}
          </span>
          <span className="flex items-center gap-0.5">
            <Users className="h-2.5 w-2.5" />
            {player.followers || 0}{t('followers_suffix') || '跟单'}
          </span>
        </div>
        <div className="text-success font-medium">
          {t('win_rate_prefix') || '胜率'}{player.winRate}%
        </div>
      </div>
    </motion.div>
  );
};

export default MobileLeaderboardOKX;

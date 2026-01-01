import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Filter, TrendingUp, TrendingDown, Users, Clock, DollarSign, Trophy, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { virtualPlayers } from "@/data/virtualPlayers";
import hunterCoinIcon from "@/assets/hunter-coin-new.png";

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

type MainTab = 'hot' | 'copy' | 'strategy';
type SubTab = 'high' | 'low';
type SortType = 'comprehensive' | 'winRate' | 'profit' | 'followers';

const MobileLeaderboardOKX = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [mainTab, setMainTab] = useState<MainTab>('hot');
  const [subTab, setSubTab] = useState<SubTab>('high');
  const [sortType, setSortType] = useState<SortType>('comprehensive');
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
  const generateChartPath = (player: PlayerData) => {
    const width = 100;
    const height = 32;
    const numPoints = 10;
    const seed = player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const isPositive = player.changePercent >= 0;
    
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
    { value: 'hot', label: t('tab_hot') || '热门' },
    { value: 'copy', label: t('tab_copy') || '跟单' },
    { value: 'strategy', label: t('tab_strategy') || '策略' },
  ];

  const subTabs = [
    { value: 'high', label: t('sub_tab_high') || '合约' },
    { value: 'low', label: t('sub_tab_low') || '现货' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Main Tabs - OKX Style */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/30">
        <div className="flex items-center gap-6 px-4 pt-2">
          {mainTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setMainTab(tab.value as MainTab)}
              className={`relative py-3 text-base font-medium transition-colors ${
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

      {/* Sub Tabs */}
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
              {tab.value === 'high' ? (t('hot_streak_board') || '高准确率榜') : (t('cold_streak_board') || '低准确率榜')}
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

      {/* Sort & Filter Row */}
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

      {/* Rules Accordion */}
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

      {/* Player Cards List */}
      <div className="px-4 py-2 space-y-3 pb-20">
        <AnimatePresence mode="wait">
          {isLoading ? (
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
              {getDisplayPlayers().map((player, index) => (
                <PlayerCardOKX
                  key={player.id}
                  player={player}
                  index={index}
                  generateChartPath={generateChartPath}
                  onClick={() => navigate(`/player/${player.id}`)}
                  subTab={subTab}
                />
              ))}
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
  generateChartPath: (player: PlayerData) => string;
  onClick: () => void;
  subTab: SubTab;
}

const PlayerCardOKX = ({ player, index, generateChartPath, onClick, subTab }: PlayerCardOKXProps) => {
  const { t } = useTranslation();
  const isPositive = player.changePercent >= 0;
  
  // Generate stable multiplier based on player id
  const multiplier = ((player.id.charCodeAt(0) % 4) + 1) + (Math.random() * 0.5).toFixed(2);

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
            {t('90d_profit') || '近90日交易员收益'}
          </p>
          <p className={`text-3xl font-bold tracking-tight ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{player.changePercent.toFixed(2)}%
          </p>
          <p className={`text-sm font-medium mt-0.5 ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : '-'}${Math.abs(player.profitAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        {/* Mini Chart */}
        <div className="w-[100px] h-[40px]">
          <svg width="100" height="40" className="overflow-visible">
            <defs>
              <linearGradient id={`chartGradient-${player.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} stopOpacity="0.3" />
                <stop offset="100%" stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path
              d={`${generateChartPath(player)} L100,40 L0,40 Z`}
              fill={`url(#chartGradient-${player.id})`}
            />
            {/* Line */}
            <path
              d={generateChartPath(player)}
              fill="none"
              stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Bottom: Stats Grid */}
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/30">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">{t('followers_count') || '跟单人数'}</p>
          <p className="text-sm font-bold text-foreground">
            {player.followers || Math.floor(100 + Math.random() * 400)}/
            <span className="text-muted-foreground font-normal underline">{Math.floor((player.followers || 300) * 1.5)}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">{t('trading_volume') || '带单规模'}</p>
          <p className="text-sm font-bold text-foreground">
            ${((player.tradingVolume || 500000) / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground mb-0.5">{t('trading_days') || '带单天数'}</p>
          <p className="text-sm font-bold text-foreground">{player.tradingDays || 30}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileLeaderboardOKX;

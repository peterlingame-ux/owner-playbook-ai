import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import USDTWalletDialog from "./USDTWalletDialog";
import PlaceBetDialog from "./PlaceBetDialog";
import { Trophy, Target, Wallet, Edit2, Check, ArrowLeft, History, Users, TrendingUp, TrendingDown, BarChart3, Filter, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Plus, CreditCard, Receipt, Crown, Sparkles, UserPlus, Heart, Star } from "lucide-react";
import { useOnlineTracking } from "@/hooks/useOnlineTracking";
import hunterCoinIcon from "@/assets/hunter-coin-icon.png";
import personalCenterBg from "@/assets/personal-center-bg.jpg";
import { AnimatedWinRate } from "./AnimatedWinRate";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface UserProfile {
  display_name: string;
  avatar_url: string;
  invitation_code?: string;
  invited_count?: number;
  signature?: string;
}

interface MatchInfo {
  fixture_id: number;
  home_team_name: string;
  away_team_name: string;
  home_logo?: string;
  away_logo?: string;
  league_name?: string;
  goals_home?: number;
  goals_away?: number;
}

interface PredictionStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  recentPredictions: Array<{
    id: string;
    match_id: string;
    prediction: string;
    prediction_type?: string;
    result: string;
    bet_amount: number;
    actual_payout: number;
    created_at: string;
    match?: MatchInfo;
  }>;
}

interface CopyTradeRecord {
  id: string;
  followed_player_id: string;
  followed_player_name: string;
  followed_player_avatar: string;
  match_id: string;
  match_home_team: string;
  match_away_team: string;
  prediction: string;
  prediction_type: 'handicap' | 'over_under';
  odds: number;
  bet_amount: number;
  result: 'win' | 'loss' | 'pending';
  pnl: number;
  created_at: string;
}

interface DepositRecord {
  id: string;
  amount: number;
  status: string;
  network: string;
  wallet_address: string;
  created_at: string;
  confirmed_at: string | null;
}

interface SpendingRecord {
  id: string;
  type: 'prediction' | 'copy_trade';
  match_id: string;
  match_home_team: string;
  match_away_team: string;
  bet_amount: number;
  prediction: string;
  prediction_type: string;
  result: string | null;
  pnl: number;
  created_at: string;
}

interface VipStatus {
  is_active: boolean;
  expires_at: string | null;
}

interface FollowUser {
  id: string;
  display_name: string;
  avatar_url: string;
  signature?: string;
  followed_at: string;
}

const VIP_COST = 500; // 500猎人币开通VIP

const AVATAR_OPTIONS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
  '/avatars/avatar-7.png',
  '/avatars/avatar-8.png',
  '/avatars/avatar-9.png',
];

// 胜率趋势图表组件
const WinRateTrendChart = ({ predictions }: { predictions: Array<{ result: string; created_at: string }> }) => {
  const chartData = useMemo(() => {
    if (!predictions || predictions.length === 0) {
      // 生成示例数据
      return Array.from({ length: 7 }, (_, i) => ({
        date: format(subDays(new Date(), 6 - i), 'MM/dd'),
        winRate: Math.round(50 + Math.random() * 30),
        wins: Math.floor(Math.random() * 5),
        total: Math.floor(3 + Math.random() * 5),
      }));
    }

    // 按日期分组预测
    const dateGroups = new Map<string, { wins: number; total: number }>();
    
    predictions.forEach(pred => {
      if (pred.result === 'pending') return;
      const dateKey = format(new Date(pred.created_at), 'MM/dd');
      const current = dateGroups.get(dateKey) || { wins: 0, total: 0 };
      current.total += 1;
      if (pred.result === 'win') current.wins += 1;
      dateGroups.set(dateKey, current);
    });

    // 获取最近7天
    const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'MM/dd'));
    
    let cumulativeWins = 0;
    let cumulativeTotal = 0;
    
    return days.map(date => {
      const dayData = dateGroups.get(date) || { wins: 0, total: 0 };
      cumulativeWins += dayData.wins;
      cumulativeTotal += dayData.total;
      const winRate = cumulativeTotal > 0 ? Math.round((cumulativeWins / cumulativeTotal) * 100) : 0;
      
      return {
        date,
        winRate,
        wins: dayData.wins,
        total: dayData.total,
      };
    });
  }, [predictions]);

  const { t } = useTranslation();
  
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            {t('win_rate_trend')}
          </h3>
          <p className="text-[10px] text-muted-foreground">{t('last_7_days_cumulative')}</p>
        </div>
      </div>
      <div className="p-2">
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              />
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '10px',
                }}
                formatter={(value: number) => [`${value}%`, '胜率']}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="winRate"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                fill="url(#winRateGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// 玩家历史记录表格组件 - 类似AI历史模板
const PlayerHistoryTable = ({ predictions, copyTradeRecords }: { 
  predictions: Array<{
    id: string;
    match_id: string;
    prediction: string;
    prediction_type?: string;
    result: string;
    bet_amount: number;
    actual_payout: number;
    created_at: string;
    match?: {
      fixture_id: number;
      home_team_name: string;
      away_team_name: string;
      home_logo?: string;
      away_logo?: string;
      league_name?: string;
      goals_home?: number;
      goals_away?: number;
    };
  }>;
  copyTradeRecords: CopyTradeRecord[];
}) => {
  const { t } = useTranslation();
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 合并预测和跟单记录
  const allRecords = useMemo(() => {
    const predictionRecords = predictions.map(p => ({
      ...p,
      type: 'prediction' as const,
      prediction_type: (p.prediction_type || null) as (string | null),
      odds: null as (number | null),
      followed_player_name: null as string | null,
    }));
    
    const copyRecords = copyTradeRecords.map(c => ({
      id: c.id,
      match_id: c.match_id,
      prediction: c.prediction,
      prediction_type: c.prediction_type,
      odds: c.odds,
      result: c.result,
      bet_amount: c.bet_amount,
      actual_payout: c.result === 'win' ? c.bet_amount + c.pnl : c.bet_amount + c.pnl,
      created_at: c.created_at,
      match: {
        fixture_id: 0,
        home_team_name: c.match_home_team,
        away_team_name: c.match_away_team,
      } as {
        fixture_id: number;
        home_team_name: string;
        away_team_name: string;
        home_logo?: string;
        away_logo?: string;
        league_name?: string;
        goals_home?: number;
        goals_away?: number;
      },
      type: 'copy-trade' as const,
      followed_player_name: c.followed_player_name,
    }));

    return [...predictionRecords, ...copyRecords];
  }, [predictions, copyTradeRecords]);

  // 过滤数据
  const filteredPredictions = useMemo(() => {
    let filtered = [...allRecords];

    if (filterType !== "all") {
      filtered = filtered.filter(p => p.type === filterType);
    }

    if (filterResult !== "all") {
      filtered = filtered.filter(p => 
        filterResult === "win" ? p.result === 'win' : p.result === 'loss'
      );
    }

    if (filterPeriod !== "all") {
      const now = new Date();
      const daysAgo = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
      const periodDate = subDays(now, daysAgo);
      filtered = filtered.filter(p => new Date(p.created_at) >= periodDate);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allRecords, filterResult, filterPeriod, filterType]);

  // 总页数和当前页数据
  const totalPages = Math.ceil(filteredPredictions.length / ITEMS_PER_PAGE);
  const paginatedPredictions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPredictions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPredictions, currentPage]);

  // 当筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterResult, filterPeriod]);

  // 统计数据
  const totalPredictions = filteredPredictions.length;
  const winCount = filteredPredictions.filter(p => p.result === 'win').length;
  const lossCount = filteredPredictions.filter(p => p.result === 'loss').length;
  const totalProfit = filteredPredictions.reduce((sum, p) => sum + (p.actual_payout - p.bet_amount), 0);

  return (
    <div className="space-y-2">
      {/* 筛选器 */}
      <div className="bg-card border border-border rounded-lg p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{t('filter')}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-7 px-2 rounded border border-border bg-background text-xs"
          >
            <option value="all">{t('all_types')}</option>
            <option value="prediction">{t('self_prediction')}</option>
            <option value="copy-trade">{t('copy_trade_type')}</option>
          </select>

          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="h-7 px-2 rounded border border-border bg-background text-xs"
          >
            <option value="all">{t('all_results')}</option>
            <option value="win">{t('correct_result')}</option>
            <option value="loss">{t('wrong_result')}</option>
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="h-7 px-2 rounded border border-border bg-background text-xs"
          >
            <option value="all">{t('all_periods')}</option>
            <option value="7d">{t('last_7d')}</option>
            <option value="30d">{t('last_30d')}</option>
            <option value="90d">{t('last_90d')}</option>
          </select>
        </div>

        {/* 统计摘要 */}
        <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-border">
          <div className="text-center">
            <p className="text-sm font-bold font-mono text-foreground">{totalPredictions}</p>
            <p className="text-[10px] text-muted-foreground">{t('total_count')}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold font-mono text-foreground">{winCount}</p>
            <p className="text-[10px] text-muted-foreground">{t('correct_result')}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold font-mono text-foreground">{lossCount}</p>
            <p className="text-[10px] text-muted-foreground">{t('wrong_result')}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold font-mono text-foreground">
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('profit_loss_label')}</p>
          </div>
        </div>
      </div>

      {/* 历史记录表格 - 桌面端 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('type_column')}</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('date_column')}</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('match_column')}</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('prediction_type_label')}</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('prediction_column')}</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('odds_label')}</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('bet_column')}</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('profit_loss_label')}</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('result_column')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPredictions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-muted-foreground text-xs">
                    {t('no_records')}
                  </td>
                </tr>
              ) : (
                paginatedPredictions.map((pred) => {
                  const profit = pred.actual_payout - pred.bet_amount;
                  
                  return (
                    <tr key={pred.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 px-2">
                        <span className="text-[10px] font-medium text-foreground">
                          {pred.type === 'prediction' ? t('prediction_label') : t('copy_trade_type')}
                          {pred.type === 'copy-trade' && pred.followed_player_name && (
                            <span className="text-muted-foreground font-normal"> · {pred.followed_player_name}</span>
                          )}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(pred.created_at), 'MM-dd')}
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1 min-w-[100px]">
                          {pred.match?.home_logo && (
                            <img src={pred.match.home_logo} alt="" className="w-3 h-3 object-contain" />
                          )}
                          <span className="text-[10px] text-foreground truncate max-w-[50px]">
                            {pred.match?.home_team_name || t('home_team')}
                          </span>
                          <span className="text-[10px] text-muted-foreground">vs</span>
                          <span className="text-[10px] text-foreground truncate max-w-[50px]">
                            {pred.match?.away_team_name || t('away_team')}
                          </span>
                          {pred.match?.away_logo && (
                            <img src={pred.match.away_logo} alt="" className="w-3 h-3 object-contain" />
                          )}
                        </div>
                        {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {pred.match.goals_home} : {pred.match.goals_away}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        {pred.prediction_type ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                            {pred.prediction_type === 'handicap' ? t('handicap') : t('over_under')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-foreground">
                        {pred.prediction}
                      </td>
                      <td className="py-1.5 px-2 text-center text-[10px] font-mono text-foreground">
                        {pred.odds ? `@${pred.odds.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[10px] font-mono text-foreground">
                        ${pred.bet_amount}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[10px] font-mono text-foreground">
                        {profit >= 0 ? '+' : ''}{profit.toFixed(0)}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {pred.result === 'win' ? (
                          <CheckCircle2 className="h-3 w-3 text-foreground inline-block" />
                        ) : pred.result === 'loss' ? (
                          <XCircle className="h-3 w-3 text-muted-foreground inline-block" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">{t('in_progress')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页控件 - 桌面端 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 border-t border-border bg-muted/30">
            <span className="text-[10px] text-muted-foreground">
              {t('page_info', { current: currentPage, total: totalPages, count: filteredPredictions.length })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "ghost"}
                    size="icon"
                    className="h-6 w-6 text-[10px]"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 历史记录卡片列表 - 移动端 */}
      <div className="sm:hidden space-y-2">
        {paginatedPredictions.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-xs">
            {t('no_records')}
          </div>
        ) : (
          paginatedPredictions.map((pred) => {
            const profit = pred.actual_payout - pred.bet_amount;
            
            return (
              <div key={pred.id} className="bg-card border border-border rounded-lg p-2.5 space-y-2">
                {/* 顶部：类型和日期 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-medium text-foreground px-1.5 py-0.5 rounded bg-muted">
                      {pred.type === 'prediction' ? t('prediction_label') : t('copy_trade_type')}
                    </span>
                    {pred.type === 'copy-trade' && pred.followed_player_name && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">
                        {pred.followed_player_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {format(new Date(pred.created_at), 'MM-dd HH:mm')}
                  </span>
                </div>

                {/* 比赛信息 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {pred.match?.home_logo && (
                      <img src={pred.match.home_logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                    )}
                    <span className="text-[10px] text-foreground truncate">
                      {pred.match?.home_team_name || t('home_team')}
                    </span>
                  </div>
                  <div className="flex-shrink-0 text-center px-1">
                    {pred.match?.goals_home !== undefined && pred.match?.goals_away !== undefined ? (
                      <span className="text-[10px] font-bold font-mono text-foreground">
                        {pred.match.goals_home} - {pred.match.goals_away}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">VS</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                    <span className="text-[10px] text-foreground truncate">
                      {pred.match?.away_team_name || t('away_team')}
                    </span>
                    {pred.match?.away_logo && (
                      <img src={pred.match.away_logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* 盘口信息 */}
                <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded bg-muted/30 border border-border/50">
                  <div className="text-center">
                    <p className="text-[8px] text-muted-foreground">玩法</p>
                    <p className="text-[10px] font-medium text-foreground">
                      {pred.prediction_type === 'handicap' ? '让球' : pred.prediction_type === 'over_under' ? '大小' : '-'}
                    </p>
                  </div>
                  <div className="text-center border-l border-border/50">
                    <p className="text-[8px] text-muted-foreground">预测</p>
                    <p className="text-[10px] font-bold text-primary font-mono truncate">{pred.prediction}</p>
                  </div>
                  <div className="text-center border-l border-border/50">
                    <p className="text-[8px] text-muted-foreground">投注</p>
                    <p className="text-[10px] font-medium text-foreground font-mono">${pred.bet_amount}</p>
                  </div>
                  <div className="text-center border-l border-border/50">
                    <p className="text-[8px] text-muted-foreground">盈亏</p>
                    <p className={`text-[10px] font-bold font-mono ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {profit >= 0 ? '+' : ''}{profit.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* 结果标签 */}
                <div className="flex justify-end">
                  {pred.result === 'win' ? (
                    <span className="flex items-center gap-1 text-[9px] font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      赢
                    </span>
                  ) : pred.result === 'loss' ? (
                    <span className="flex items-center gap-1 text-[9px] font-medium text-destructive px-1.5 py-0.5 rounded bg-destructive/10">
                      <XCircle className="h-2.5 w-2.5" />
                      输
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      {t('in_progress')}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {/* 分页控件 - 移动端 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-2 bg-card border border-border rounded-lg">
            <span className="text-[9px] text-muted-foreground">
              {currentPage}/{totalPages}页
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-mono text-foreground px-2">{currentPage}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MyPredictions = () => {
  const { t } = useTranslation();
  const { user, userProfile: authUserProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const { level, totalMinutes, formatOnlineTime, getNextLevelProgress } = useOnlineTracking();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchesMap, setMatchesMap] = useState<Map<string, MatchInfo>>(new Map());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [editSignature, setEditSignature] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copyTradeRecords, setCopyTradeRecords] = useState<CopyTradeRecord[]>([]);
  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [spendingRecords, setSpendingRecords] = useState<SpendingRecord[]>([]);
  const [activeTab, setActiveTab] = useState("history");
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [isPurchasingVip, setIsPurchasingVip] = useState(false);
  const [showVipConfirmDialog, setShowVipConfirmDialog] = useState(false);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [followersList, setFollowersList] = useState<FollowUser[]>([]);
  const [isLoadingFollows, setIsLoadingFollows] = useState(false);
  const [isPredictionHistoryOpen, setIsPredictionHistoryOpen] = useState(false);
  const [isSpendingRecordsOpen, setIsSpendingRecordsOpen] = useState(false);
  const [isInvitedUsersOpen, setIsInvitedUsersOpen] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string; created_at: string }>>([]);
  const [isLoadingInvitedUsers, setIsLoadingInvitedUsers] = useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  useEffect(() => {
    if (authUserProfile) {
      setUserProfile(prev => {
        const baseProfile: UserProfile = {
          display_name: authUserProfile.display_name || '',
          avatar_url: authUserProfile.avatar_url || '/avatars/avatar-1.png',
        };
        if (prev) {
          return {
            ...prev,
            ...baseProfile,
          };
        }
        return baseProfile;
      });
      setEditDisplayName(authUserProfile.display_name || '');
      setSelectedAvatar(authUserProfile.avatar_url || '/avatars/avatar-1.png');
    }
  }, [authUserProfile]);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!user) {
        // 模拟登录后的数据，用于演示
        setUserProfile({
          display_name: "QuickTiger1234",
          avatar_url: "/avatars/avatar-1.png",
          signature: "预测玩家"
        });
        setEditDisplayName("QuickTiger1234");
        setSelectedAvatar("/avatars/avatar-1.png");
        setEditSignature("预测玩家");
        
        // 模拟比赛数据
        const mockMatches = new Map<string, MatchInfo>();
        mockMatches.set("m1", {
          fixture_id: 1,
          home_team_name: "曼联",
          away_team_name: "利物浦",
          home_logo: "/src/assets/team-manchester-united.png",
          away_logo: "/src/assets/team-liverpool.png",
          league_name: "英超",
          goals_home: 2,
          goals_away: 1
        });
        mockMatches.set("m2", {
          fixture_id: 2,
          home_team_name: "巴塞罗那",
          away_team_name: "皇家马德里",
          home_logo: "/src/assets/team-barcelona.png",
          away_logo: "/src/assets/team-real-madrid.png",
          league_name: "西甲",
          goals_home: 3,
          goals_away: 2
        });
        mockMatches.set("m3", {
          fixture_id: 3,
          home_team_name: "拜仁",
          away_team_name: "多特蒙德",
          home_logo: "/src/assets/team-bayern.png",
          away_logo: "/src/assets/team-dortmund.png",
          league_name: "德甲",
          goals_home: 1,
          goals_away: 1
        });
        mockMatches.set("m4", {
          fixture_id: 4,
          home_team_name: "巴黎圣日耳曼",
          away_team_name: "马赛",
          home_logo: "/src/assets/team-psg.png",
          away_logo: "/src/assets/team-marseille.png",
          league_name: "法甲",
          goals_home: 0,
          goals_away: 2
        });
        setMatchesMap(mockMatches);
        
        setStats({
          totalPredictions: 15,
          correctPredictions: 10,
          winRate: 66.67,
          balance: 12500,
          profit: 2500,
          recentPredictions: [
            {
              id: "1",
              match_id: "m1",
              prediction: "主+0.5",
              prediction_type: 'handicap',
              result: "win",
              bet_amount: 500,
              actual_payout: 950,
              created_at: new Date().toISOString(),
              match: mockMatches.get("m1")
            },
            {
              id: "2",
              match_id: "m2",
              prediction: "大 2.5",
              prediction_type: 'over_under',
              result: "win",
              bet_amount: 300,
              actual_payout: 600,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              match: mockMatches.get("m2")
            },
            {
              id: "3",
              match_id: "m3",
              prediction: "客-0.5",
              prediction_type: 'handicap',
              result: "loss",
              bet_amount: 400,
              actual_payout: 0,
              created_at: new Date(Date.now() - 172800000).toISOString(),
              match: mockMatches.get("m3")
            },
            {
              id: "4",
              match_id: "m4",
              prediction: "小 2.5",
              prediction_type: 'over_under',
              result: "win",
              bet_amount: 600,
              actual_payout: 1200,
              created_at: new Date(Date.now() - 259200000).toISOString(),
              match: mockMatches.get("m4")
            }
          ]
        });
        
        // 模拟跟单记录
        setCopyTradeRecords([
          {
            id: "ct1",
            followed_player_id: "p1",
            followed_player_name: "GoldenAce7788",
            followed_player_avatar: "/avatars/avatar-3.png",
            match_id: "m1",
            match_home_team: "曼联",
            match_away_team: "利物浦",
            prediction: "主+0.5",
            prediction_type: 'handicap',
            odds: 1.90,
            bet_amount: 200,
            result: 'win',
            pnl: 180,
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: "ct2",
            followed_player_id: "p2",
            followed_player_name: "LuckyDragon9999",
            followed_player_avatar: "/avatars/avatar-5.png",
            match_id: "m2",
            match_home_team: "巴塞罗那",
            match_away_team: "皇家马德里",
            prediction: "大 2.5",
            prediction_type: 'over_under',
            odds: 1.85,
            bet_amount: 300,
            result: 'loss',
            pnl: -300,
            created_at: new Date(Date.now() - 172800000).toISOString()
          },
          {
            id: "ct3",
            followed_player_id: "p1",
            followed_player_name: "GoldenAce7788",
            followed_player_avatar: "/avatars/avatar-3.png",
            match_id: "m3",
            match_home_team: "拜仁",
            match_away_team: "多特蒙德",
            prediction: "客-0.5",
            prediction_type: 'handicap',
            odds: 2.10,
            bet_amount: 150,
            result: 'win',
            pnl: 270,
            created_at: new Date(Date.now() - 259200000).toISOString()
          }
        ]);

        // 模拟充值记录
        setDepositRecords([
          {
            id: "d1",
            amount: 500,
            status: 'confirmed',
            network: 'TRC20',
            wallet_address: 'TXxxxxxx...xxx1234',
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            confirmed_at: new Date(Date.now() - 86400000 * 3 + 300000).toISOString(),
          },
          {
            id: "d2",
            amount: 1000,
            status: 'confirmed',
            network: 'TRC20',
            wallet_address: 'TXxxxxxx...xxx5678',
            created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
            confirmed_at: new Date(Date.now() - 86400000 * 7 + 600000).toISOString(),
          },
          {
            id: "d3",
            amount: 200,
            status: 'pending',
            network: 'ERC20',
            wallet_address: '0xYyyy...yyyy9999',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            confirmed_at: null,
          },
        ]);

        // 模拟消费记录
        setSpendingRecords([
          {
            id: "s1",
            type: 'prediction',
            match_id: "m1",
            match_home_team: "曼联",
            match_away_team: "利物浦",
            bet_amount: 500,
            prediction: "主+0.5",
            prediction_type: 'handicap',
            result: 'win',
            pnl: 450,
            created_at: new Date().toISOString(),
          },
          {
            id: "s2",
            type: 'prediction',
            match_id: "m2",
            match_home_team: "巴塞罗那",
            match_away_team: "皇家马德里",
            bet_amount: 300,
            prediction: "大 2.5",
            prediction_type: 'over_under',
            result: 'win',
            pnl: 300,
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "s3",
            type: 'prediction',
            match_id: "m3",
            match_home_team: "拜仁",
            match_away_team: "多特蒙德",
            bet_amount: 400,
            prediction: "客-0.5",
            prediction_type: 'handicap',
            result: 'loss',
            pnl: -400,
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: "s4",
            type: 'copy_trade',
            match_id: "m4",
            match_home_team: "巴黎圣日耳曼",
            match_away_team: "马赛",
            bet_amount: 200,
            prediction: "主+0.5",
            prediction_type: 'handicap',
            result: 'win',
            pnl: 180,
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
        
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;

        // 获取用户资料
        const { data: profileData } = await supabase
          .from('users')
          .select('display_name, avatar_url, invitation_code, invited_count, signature')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData as UserProfile);
          setEditDisplayName(profileData.display_name || '');
          setSelectedAvatar(profileData.avatar_url || '');
          setEditSignature((profileData as any).signature || '预测玩家');
        }

        // 获取虚拟余额
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        // 如果查询出错且不是"无记录"错误，记录错误
        if (balanceError && balanceError.code !== 'PGRST116') {
          console.error('Error fetching balance:', balanceError);
        }

        // 获取USDT钱包余额
        const { data: usdtData } = await supabase
          .from('usdt_wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (usdtData) {
          setUsdtBalance(usdtData.balance || 0);
        }

        // 获取预测记录
        const { data: predictionsData } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        // 获取所有唯一的 match_id
        const matchIds = [...new Set(predictionsData?.map(p => p.match_id).filter(Boolean) || [])];
        
        // 获取比赛详情
        const matchesDataMap = new Map<string, MatchInfo>();
        if (matchIds.length > 0) {
          const { data: matchesData } = await supabase
            .from('daily_matches' as any)
            .select('fixture_id, home_team_name, away_team_name, home_logo, away_logo, league_name, goals_home, goals_away')
            .in('fixture_id', matchIds.map(id => parseInt(id)));
          
          if (matchesData) {
            matchesData.forEach((match: any) => {
              matchesDataMap.set(match.fixture_id.toString(), match as MatchInfo);
            });
          }
        }
        setMatchesMap(matchesDataMap);

        const totalPredictions = predictionsData?.length || 0;
        const correctPredictions = predictionsData?.filter(p => p.result === 'win').length || 0;
        const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
        const balance = balanceData?.balance ?? INITIAL_BALANCE;
        const profit = balance - INITIAL_BALANCE;

        // 关联比赛信息到预测记录
        const predictionsWithMatches = predictionsData?.map(pred => ({
          ...pred,
          match: matchesDataMap.get(pred.match_id)
        })) || [];

        setStats({
          totalPredictions,
          correctPredictions,
          winRate,
          balance,
          profit,
          recentPredictions: predictionsWithMatches
        });

        // 获取充值记录
        const { data: depositsData } = await supabase
          .from('deposit_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (depositsData) {
          setDepositRecords(depositsData as DepositRecord[]);
        }

        // 构建消费记录（从预测记录）
        const spendingList: SpendingRecord[] = predictionsData?.map(pred => ({
          id: pred.id,
          type: 'prediction' as const,
          match_id: pred.match_id,
          match_home_team: matchesDataMap.get(pred.match_id)?.home_team_name || '主队',
          match_away_team: matchesDataMap.get(pred.match_id)?.away_team_name || '客队',
          bet_amount: pred.bet_amount,
          prediction: pred.prediction,
          prediction_type: pred.prediction_type,
          result: pred.result,
          pnl: pred.result === 'win' ? (pred.actual_payout || 0) - pred.bet_amount : pred.result === 'loss' ? -pred.bet_amount : 0,
          created_at: pred.created_at,
        })) || [];
        
        setSpendingRecords(spendingList);

        // 获取VIP状态
        const { data: vipData } = await supabase
          .from('user_vip')
          .select('is_active, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vipData && vipData.is_active && new Date(vipData.expires_at) > new Date()) {
          setVipStatus({
            is_active: true,
            expires_at: vipData.expires_at
          });
        } else {
          setVipStatus({
            is_active: false,
            expires_at: null
          });
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, [user]);

  // 获取关注和粉丝列表
  useEffect(() => {
    const fetchFollowData = async () => {
      if (!user) {
        // 模拟数据用于演示
        setFollowingList([
          {
            id: 'demo1',
            display_name: 'GoldenAce7788',
            avatar_url: '/avatars/avatar-3.png',
            signature: '连胜王者',
            followed_at: new Date(Date.now() - 86400000 * 2).toISOString()
          },
          {
            id: 'demo2',
            display_name: 'LuckyDragon9999',
            avatar_url: '/avatars/avatar-5.png',
            signature: '稳健玩家',
            followed_at: new Date(Date.now() - 86400000 * 5).toISOString()
          }
        ]);
        setFollowersList([
          {
            id: 'demo3',
            display_name: 'StarPlayer123',
            avatar_url: '/avatars/avatar-2.png',
            signature: '新手上路',
            followed_at: new Date(Date.now() - 86400000 * 1).toISOString()
          }
        ]);
        return;
      }

      setIsLoadingFollows(true);
      try {
        // 获取关注列表
        const { data: followingData } = await supabase
          .from('user_follows')
          .select(`
            id,
            following_id,
            created_at
          `)
          .eq('follower_id', user.id)
          .order('created_at', { ascending: false });

        if (followingData && followingData.length > 0) {
          const followingIds = followingData.map(f => f.following_id);
          const { data: usersData } = await supabase
            .from('users')
            .select('id, display_name, avatar_url, signature')
            .in('id', followingIds);

          if (usersData) {
            const followingList = followingData.map(f => {
              const userData = usersData.find(u => u.id === f.following_id);
              return {
                id: f.following_id,
                display_name: userData?.display_name || '未知用户',
                avatar_url: userData?.avatar_url || '/avatars/avatar-1.png',
                signature: userData?.signature || '',
                followed_at: f.created_at
              };
            });
            setFollowingList(followingList);
          }
        } else {
          setFollowingList([]);
        }

        // 获取粉丝列表
        const { data: followersData } = await supabase
          .from('user_follows')
          .select(`
            id,
            follower_id,
            created_at
          `)
          .eq('following_id', user.id)
          .order('created_at', { ascending: false });

        if (followersData && followersData.length > 0) {
          const followerIds = followersData.map(f => f.follower_id);
          const { data: usersData } = await supabase
            .from('users')
            .select('id, display_name, avatar_url, signature')
            .in('id', followerIds);

          if (usersData) {
            const followersList = followersData.map(f => {
              const userData = usersData.find(u => u.id === f.follower_id);
              return {
                id: f.follower_id,
                display_name: userData?.display_name || '未知用户',
                avatar_url: userData?.avatar_url || '/avatars/avatar-1.png',
                signature: userData?.signature || '',
                followed_at: f.created_at
              };
            });
            setFollowersList(followersList);
          }
        } else {
          setFollowersList([]);
        }
      } catch (error) {
        console.error('Error fetching follow data:', error);
      } finally {
        setIsLoadingFollows(false);
      }
    };

    fetchFollowData();
  }, [user]);

  // 获取被邀请用户列表
  const fetchInvitedUsers = async () => {
    if (!user || !userProfile?.invitation_code) return;
    
    setIsLoadingInvitedUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, created_at')
        .eq('invited_by', userProfile.invitation_code)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitedUsers(data || []);
    } catch (error) {
      console.error('Error fetching invited users:', error);
    } finally {
      setIsLoadingInvitedUsers(false);
    }
  };

  // 打开被邀请用户列表弹窗
  const handleOpenInvitedUsers = () => {
    if ((userProfile?.invited_count || 0) > 0) {
      setIsInvitedUsersOpen(true);
      fetchInvitedUsers();
    }
  };

  // 点击开通VIP按钮 - 显示确认弹窗
  const handleVipButtonClick = () => {
    if (!user) {
      toast.error(t('vip_login_required'));
      navigate('/auth');
      return;
    }

    if (usdtBalance < VIP_COST) {
      toast.error(t('vip_insufficient_balance'));
      return;
    }

    setShowVipConfirmDialog(true);
  };

  // 确认开通VIP
  const handleConfirmPurchaseVip = async () => {
    if (!user) return;

    setShowVipConfirmDialog(false);
    setIsPurchasingVip(true);
    try {
      const { data, error } = await supabase.rpc('purchase_vip', {
        p_user_id: user.id,
        p_duration_days: 30,
        p_cost: VIP_COST
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; expires_at?: string; new_balance?: number };
      
      if (result.success) {
        setVipStatus({
          is_active: true,
          expires_at: result.expires_at || null
        });
        if (result.new_balance !== undefined) {
          setUsdtBalance(result.new_balance);
        }
        toast.success(t('vip_activated'));
      } else {
        toast.error(result.error || t('purchase_failed'));
      }
    } catch (error) {
      console.error('Error purchasing VIP:', error);
      toast.error(t('purchase_failed'));
    } finally {
      setIsPurchasingVip(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      // 演示模式：模拟保存
      setUserProfile({
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
        signature: editSignature,
      });
      setIsEditDialogOpen(false);
      toast.success("演示模式：个人资料已更新！");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: editDisplayName,
          avatar_url: selectedAvatar,
          signature: editSignature,
        })
        .eq('id', user.id);

      if (error) throw error;

      // 更新本地状态
      setUserProfile(prev => ({
        ...prev,
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
        signature: editSignature,
      }) as UserProfile);
      
      // 刷新全局用户资料状态，确保其他组件同步
      await refreshUserProfile();
      
      setIsEditDialogOpen(false);
      toast.success("个人资料已更新！");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("更新失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user && !stats) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{t('login_to_view_stats')}</p>
          <Button onClick={() => navigate('/auth')}>
            {t('login_now_btn')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 移除加载状态显示，直接显示内容

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground -ml-2 h-6 sm:h-7 text-[11px] sm:text-xs"
      >
        <ArrowLeft className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
        <span>{t('back')}</span>
      </Button>

      {/* AI风格主卡片 */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-card border border-border">
        {/* 专属足球明星背景图 */}
        <div 
          className="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-[0.25]"
          style={{ 
            backgroundImage: `url(${personalCenterBg})`,
          }}
        />
        {/* 深色渐变遮罩确保内容可读 */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-card/70" />
        
        {/* 背景装饰 - AI科技感 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-ai-cyan/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-ai-purple/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-ai-cyan/20 to-transparent" />
        </div>
        
        {/* 扫描线动画效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,transparent_calc(50%-1px),hsl(var(--ai-cyan)/0.03)_50%,transparent_calc(50%+1px),transparent_100%)] bg-[length:100%_4px] animate-pulse" />
        </div>

        <div className="relative z-10">
          {/* 顶部用户信息区 */}
          <div className="p-3 sm:p-4 pb-2 sm:pb-3">
            <div className="flex items-start justify-between">
              {/* 左侧头像和信息 */}
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="relative group">
                  {/* 头像光环 - VIP时为金色 */}
                  <div className={`absolute -inset-0.5 sm:-inset-1 rounded-full blur-sm opacity-60 group-hover:opacity-100 transition-opacity ${
                    vipStatus?.is_active 
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400' 
                      : 'bg-gradient-to-r from-ai-cyan/50 via-ai-purple/30 to-ai-cyan/50'
                  }`} />
                  <Avatar className={`relative h-11 w-11 sm:h-14 sm:w-14 border-2 shadow-lg ${
                    vipStatus?.is_active 
                      ? 'border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                      : 'border-ai-cyan/30 shadow-[0_0_15px_rgba(0,255,255,0.2)]'
                  }`}>
                    <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || '用户'} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-ai-cyan/20 to-ai-purple/20 text-foreground font-bold">
                      {userProfile?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* VIP徽章 - 显示在头像上 */}
                  {vipStatus?.is_active && (
                    <div className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 z-10">
                      <div className="relative">
                        <div className="absolute inset-0 bg-amber-400 rounded-full blur-sm animate-pulse" />
                        <div className="relative flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border border-amber-300 shadow-lg">
                          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 编辑按钮 */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="absolute -bottom-0.5 sm:-bottom-1 -right-0.5 sm:-right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-background/90 backdrop-blur border-ai-cyan/30 hover:border-ai-cyan shadow-sm"
                      >
                        <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-ai-cyan" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('edit_profile')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-3">
                        <div className="space-y-2">
                          <Label htmlFor="display-name" className="text-sm">{t('nickname')}</Label>
                          <Input
                            id="display-name"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder={t('enter_nickname')}
                            maxLength={20}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="signature" className="text-sm">{t('signature')}</Label>
                          <Input
                            id="signature"
                            value={editSignature}
                            onChange={(e) => setEditSignature(e.target.value)}
                            placeholder={t('enter_signature')}
                            maxLength={30}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">{t('select_avatar')}</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {AVATAR_OPTIONS.map((avatar) => (
                              <button
                                key={avatar}
                                onClick={() => setSelectedAvatar(avatar)}
                                className={`
                                  relative rounded-lg p-1.5 transition-all
                                  ${selectedAvatar === avatar 
                                    ? 'ring-2 ring-ai-cyan bg-ai-cyan/10' 
                                    : 'hover:bg-muted border border-border'
                                  }
                                `}
                              >
                                <Avatar className="h-12 w-12 mx-auto">
                                  <AvatarImage src={avatar} />
                                </Avatar>
                                {selectedAvatar === avatar && (
                                  <div className="absolute top-0.5 right-0.5 bg-ai-cyan rounded-full p-0.5">
                                    <Check className="h-2.5 w-2.5 text-background" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-9"
                          onClick={() => setIsEditDialogOpen(false)}
                        >
                          {t('cancel')}
                        </Button>
                        <Button
                          className="flex-1 h-9"
                          onClick={handleSaveProfile}
                          disabled={isSaving || !editDisplayName || !editDisplayName.trim()}
                        >
                          {isSaving ? t('saving') : t('save')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-lg font-bold text-foreground truncate max-w-[100px] sm:max-w-none">
                      {userProfile?.display_name || t('player')}
                    </h2>
                    {/* 等级显示 */}
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-ai-cyan/40 to-ai-purple/40 rounded blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-1 px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded border border-ai-cyan/30 text-ai-cyan">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-xs font-bold font-mono">Lv.{user ? level : 1}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsWalletDialogOpen(true)}
                      className="h-6 px-2.5 text-xs border-ai-cyan/50 text-ai-cyan hover:bg-ai-cyan/10 rounded-md"
                    >
                      {t('recharge')}
                    </Button>
                    {!vipStatus?.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleVipButtonClick}
                        disabled={isPurchasingVip}
                        className="h-6 px-2.5 text-xs border-amber-400/50 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 rounded-md"
                      >
                        {isPurchasingVip ? t('purchasing') : t('activate_vip')}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono tracking-wider">
                    {userProfile?.signature || t('prediction_player')}
                  </p>
                  
                  {/* 关注和粉丝数量 */}
                  <div className="flex items-center gap-4 pt-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <span className="font-bold text-foreground">{followingList.length}</span>
                          <span>关注</span>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md max-h-[70vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-primary" />
                            关注列表 ({followingList.length})
                          </DialogTitle>
                        </DialogHeader>
                        <div className="overflow-y-auto max-h-[50vh]">
                          {followingList.length > 0 ? (
                            <div className="divide-y divide-border">
                              {followingList.map((followUser) => (
                                <div key={followUser.id} className="py-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-border">
                                      <AvatarImage src={followUser.avatar_url} />
                                      <AvatarFallback className="text-xs">{followUser.display_name.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{followUser.display_name}</p>
                                      <p className="text-[10px] text-muted-foreground">{followUser.signature || '暂无签名'}</p>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">{format(new Date(followUser.followed_at), 'MM-dd')}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-8 text-center">
                              <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                              <p className="text-sm text-muted-foreground">暂无关注的玩家</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <span className="font-bold text-foreground">{followersList.length}</span>
                          <span>粉丝</span>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md max-h-[70vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-destructive" />
                            粉丝列表 ({followersList.length})
                          </DialogTitle>
                        </DialogHeader>
                        <div className="overflow-y-auto max-h-[50vh]">
                          {followersList.length > 0 ? (
                            <div className="divide-y divide-border">
                              {followersList.map((follower) => (
                                <div key={follower.id} className="py-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-border">
                                      <AvatarImage src={follower.avatar_url} />
                                      <AvatarFallback className="text-xs">{follower.display_name.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{follower.display_name}</p>
                                      <p className="text-[10px] text-muted-foreground">{follower.signature || '暂无签名'}</p>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">{format(new Date(follower.followed_at), 'MM-dd')}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-8 text-center">
                              <Heart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                              <p className="text-sm text-muted-foreground">暂无粉丝</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
              
              {/* 右侧胜率显示 - AI风格 */}
              <div className="text-right">
                <div className="relative">
                  <div className="absolute -inset-1.5 sm:-inset-2 bg-ai-cyan/10 rounded-lg blur-md" />
                  <div className="relative px-2 sm:px-3 py-1 sm:py-1.5 bg-background/50 backdrop-blur-sm rounded-lg border border-ai-cyan/20">
                    <div className="text-lg sm:text-2xl font-bold text-ai-cyan font-mono tracking-tight">
                      <AnimatedWinRate value={stats?.winRate || 0} />
                      <span className="text-sm sm:text-lg">%</span>
                    </div>
                    <p className="text-[8px] sm:text-[10px] text-primary mt-0.5">
                      已超越 {Math.min(99, Math.round((stats?.winRate || 0) * 1.2))}% 的用户
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 统计数据网格 */}
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              {[
                { value: stats?.totalPredictions || 0, label: t('total_predictions_stat') },
                { value: stats?.correctPredictions || 0, label: t('correct_result') },
                { value: (stats?.totalPredictions || 0) - (stats?.correctPredictions || 0), label: t('wrong_result') },
                { value: `${(stats?.profit || 0) >= 0 ? '+' : ''}${stats?.profit?.toLocaleString() || 0}`, label: t('profit_loss_label') }
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="p-1.5 sm:p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <p className="text-sm sm:text-xl font-bold font-mono text-foreground">{item.value}</p>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">{item.label}</p>
                </div>
              ))}
            </div>
            
            {/* 新增统计：盈利率、预期奖金、虚拟投注金额 */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {(() => {
                const totalWagered = stats?.recentPredictions?.reduce((sum, p) => sum + p.bet_amount, 0) || 0;
                const profitRate = totalWagered > 0 ? ((stats?.profit || 0) / totalWagered * 100) : 0;
                // 预期奖金计算：基于胜率超过58%的玩家可获得奖金分成
                const winRate = stats?.winRate || 0;
                const expectedPrize = winRate > 58 ? Math.round((winRate - 58) * 1000) : 0;
                
                return [
                  { 
                    value: `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(1)}%`, 
                    label: '盈利率',
                    highlight: profitRate > 0
                  },
                  { 
                    value: expectedPrize > 0 ? `$${expectedPrize.toLocaleString()}` : '需超过AI', 
                    label: '预期奖金',
                    highlight: expectedPrize > 0
                  },
                  { 
                    value: `$${totalWagered.toLocaleString()}`, 
                    label: '投注金额',
                    highlight: false
                  }
                ];
              })().map((item, index) => (
                <div 
                  key={index} 
                  className="p-1.5 sm:p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <p className={`text-xs sm:text-lg font-bold font-mono ${item.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {item.value}
                  </p>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 钱包区域 - 统一卡片设计 */}
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* 虚拟钱包 - 可点击查看预测历史 */}
                <Dialog open={isPredictionHistoryOpen} onOpenChange={setIsPredictionHistoryOpen}>
                  <DialogTrigger asChild>
                    <button className="p-2.5 sm:p-4 text-left hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md bg-muted flex items-center justify-center">
                          <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('virtual_wallet_balance')}</span>
                      </div>
                      <p className="text-lg sm:text-2xl font-bold text-foreground font-mono tracking-tight">
                        ${stats?.balance?.toLocaleString() || '10,000'}
                      </p>
                      <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-1">点击查看预测记录</p>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        预测历史记录
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {(stats?.recentPredictions || []).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>暂无预测记录</p>
                        </div>
                      ) : (
                        stats?.recentPredictions.map((pred) => {
                          const profit = pred.actual_payout - pred.bet_amount;
                          const isWin = pred.result === 'win';
                          const isLoss = pred.result === 'loss';
                          const isPending = pred.result === 'pending' || !pred.result;
                          
                          return (
                            <div 
                              key={pred.id} 
                              className={`
                                rounded-lg border overflow-hidden transition-all
                                ${isWin ? 'border-primary/30 bg-primary/5' : ''}
                                ${isLoss ? 'border-destructive/30 bg-destructive/5' : ''}
                                ${isPending ? 'border-border bg-card' : ''}
                              `}
                            >
                              {/* 比赛信息头部 */}
                              <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {format(new Date(pred.created_at), 'MM-dd HH:mm')}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {pred.match?.league_name || '联赛'}
                                  </span>
                                </div>
                                <div className={`
                                  text-[10px] font-bold px-2 py-0.5 rounded
                                  ${isWin ? 'bg-primary/20 text-primary' : ''}
                                  ${isLoss ? 'bg-destructive/20 text-destructive' : ''}
                                  ${isPending ? 'bg-muted text-muted-foreground' : ''}
                                `}>
                                  {isWin ? '赢' : isLoss ? '输' : '进行中'}
                                </div>
                              </div>
                              
                              {/* 比赛对阵 */}
                              <div className="px-3 py-3">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2 flex-1">
                                    {pred.match?.home_logo && (
                                      <img src={pred.match.home_logo} alt="" className="w-6 h-6 object-contain" />
                                    )}
                                    <span className="text-sm font-medium text-foreground">
                                      {pred.match?.home_team_name || '主队'}
                                    </span>
                                  </div>
                                  
                                  <div className="px-4 text-center">
                                    {pred.match?.goals_home !== undefined ? (
                                      <div className="text-lg font-bold font-mono text-foreground">
                                        {pred.match.goals_home} - {pred.match.goals_away}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">VS</div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 flex-1 justify-end">
                                    <span className="text-sm font-medium text-foreground">
                                      {pred.match?.away_team_name || '客队'}
                                    </span>
                                    {pred.match?.away_logo && (
                                      <img src={pred.match.away_logo} alt="" className="w-6 h-6 object-contain" />
                                    )}
                                  </div>
                                </div>
                                
                                {/* 盘口信息 - 专业博彩风格 */}
                                <div className="grid grid-cols-4 gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">玩法</p>
                                    <p className="text-xs font-bold text-foreground">
                                      {pred.prediction_type === 'handicap' ? '让球' : '大小球'}
                                    </p>
                                  </div>
                                  <div className="text-center border-l border-border/50">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">盘口</p>
                                    <p className="text-xs font-bold text-primary font-mono">
                                      {pred.prediction}
                                    </p>
                                  </div>
                                  <div className="text-center border-l border-border/50">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">投注</p>
                                    <p className="text-xs font-bold text-foreground font-mono">
                                      ${pred.bet_amount}
                                    </p>
                                  </div>
                                  <div className="text-center border-l border-border/50">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">盈亏</p>
                                    <p className={`text-xs font-bold font-mono ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                      {profit >= 0 ? '+' : ''}{profit}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* 猎人币钱包 */}
                <div className="relative">
                  <Dialog open={isSpendingRecordsOpen} onOpenChange={setIsSpendingRecordsOpen}>
                    <DialogTrigger asChild>
                      <button className="w-full p-2.5 sm:p-4 text-left hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                            <img src={hunterCoinIcon} alt="猎人币" className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('hunter_coin_balance')}</span>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-amber-500 font-mono tracking-tight">
                          {usdtBalance.toFixed(2)}
                        </p>
                        <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-1">点击查看消费记录</p>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-amber-500" />
                          消费记录
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto">
                        {/* 消费统计 */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <p className="text-lg font-bold font-mono text-foreground">{copyTradeRecords.length}</p>
                            <p className="text-[10px] text-muted-foreground">订阅次数</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <p className="text-lg font-bold font-mono text-foreground">
                              ${copyTradeRecords.reduce((sum, r) => sum + r.bet_amount, 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">总消费</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <p className="text-lg font-bold font-mono text-foreground">
                              {copyTradeRecords.filter(r => r.bet_amount > 0).length}
                            </p>
                            <p className="text-[10px] text-muted-foreground">付费订阅</p>
                          </div>
                        </div>

                        {/* 消费记录列表 */}
                        {copyTradeRecords.length > 0 ? (
                          <div className="space-y-2">
                            {copyTradeRecords.map((record) => (
                              <div key={record.id} className="p-3 rounded-lg border border-border bg-card">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={record.followed_player_avatar} />
                                      <AvatarFallback className="text-[8px]">{record.followed_player_name.slice(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-foreground">{record.followed_player_name}</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(record.created_at), 'MM-dd HH:mm')}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {record.match_home_team} vs {record.match_away_team}
                                  </span>
                                  <span className="font-mono font-bold text-amber-500">
                                    -{record.bet_amount} 猎人币
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p>暂无消费记录</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 邀请码卡片 - 简洁设计 */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border hover:border-ai-cyan/30 transition-colors">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-20 h-20 bg-ai-cyan/20 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-ai-cyan/10 border border-ai-cyan/20 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-ai-cyan" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('my_invitation_code')}</p>
                <p className="text-sm sm:text-lg font-bold font-mono text-foreground tracking-[0.2em] sm:tracking-[0.3em] truncate">
                  {userProfile?.invitation_code || '--------'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div 
                className={`text-right ${(userProfile?.invited_count || 0) > 0 ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={handleOpenInvitedUsers}
              >
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t('invited_count')}</p>
                <p className="text-base sm:text-xl font-bold text-ai-cyan font-mono">{userProfile?.invited_count || 0}</p>
              </div>
              {userProfile?.invitation_code && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-9 px-2.5 sm:px-4 text-[10px] sm:text-xs border-ai-cyan/30 hover:bg-ai-cyan/10 text-ai-cyan"
                  onClick={() => {
                    navigator.clipboard.writeText(userProfile.invitation_code || '');
                    toast.success(t('invitation_code_copied'));
                  }}
                >
                  {t('copy')}
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
            {t('invitation_bonus_hint')}
          </p>
        </div>
      </div>

      {/* 开始预测按钮 - AI风格 */}
      <Button 
        className="w-full h-10 sm:h-11 text-xs sm:text-sm font-bold bg-gradient-to-r from-ai-cyan via-ai-blue to-ai-purple hover:opacity-90 text-background shadow-lg shadow-ai-cyan/20 transition-all"
        onClick={() => setIsBetDialogOpen(true)}
      >
        挑战AI，开始预测
      </Button>

      {/* 预测对话框 */}
      <PlaceBetDialog 
        open={isBetDialogOpen} 
        onOpenChange={setIsBetDialogOpen} 
      />


      {/* VIP开通确认弹窗 */}
      <Dialog open={showVipConfirmDialog} onOpenChange={setShowVipConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              开通VIP会员
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* VIP特权列表 */}
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('vip_privilege_1_title') || '免费查看所有订阅预测'}</p>
                  <p className="text-xs text-muted-foreground">{t('vip_privilege_1_desc') || '无需支付猎人币即可查看任意预测者的预测详情'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Target className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('vip_privilege_2_title') || '专属AI分析报告'}</p>
                  <p className="text-xs text-muted-foreground">{t('vip_privilege_2_desc') || '获取更详细的AI赛事分析和预测建议'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('vip_privilege_3_title') || '高胜率预测者推荐'}</p>
                  <p className="text-xs text-muted-foreground">{t('vip_privilege_3_desc') || '优先推送连续正确预测者的最新预测动态'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('vip_privilege_4_title') || 'VIP专属身份标识'}</p>
                  <p className="text-xs text-muted-foreground">{t('vip_privilege_4_desc') || '头像显示VIP徽章，彰显尊贵身份'}</p>
                </div>
              </div>
            </div>
            
            {/* 费用说明 */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
              <div>
                <span className="text-sm text-muted-foreground">{t('vip_cost_label') || '开通费用'}</span>
                <p className="text-[10px] text-muted-foreground/70">{t('vip_duration') || '有效期30天'}</p>
              </div>
              <div className="flex items-center gap-1">
                <img src={hunterCoinIcon} alt="Hunter Coin" className="w-5 h-5" />
                <span className="text-xl font-bold text-amber-500 font-mono">{VIP_COST}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowVipConfirmDialog(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleConfirmPurchaseVip}
            >
              确认开通
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 被邀请用户列表弹窗 */}
      <Dialog open={isInvitedUsersOpen} onOpenChange={setIsInvitedUsersOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-ai-cyan" />
              {t('invited_users_title') || '已邀请用户'}
              <span className="text-sm font-normal text-muted-foreground">({invitedUsers.length})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2 -mx-6 px-6">
            {isLoadingInvitedUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-ai-cyan border-t-transparent rounded-full" />
              </div>
            ) : invitedUsers.length > 0 ? (
              <div className="space-y-2">
                {invitedUsers.map((invitedUser) => (
                  <div 
                    key={invitedUser.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <Avatar className="h-10 w-10 border border-ai-cyan/30">
                      <AvatarImage src={invitedUser.avatar_url} alt={invitedUser.display_name} />
                      <AvatarFallback>{invitedUser.display_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {invitedUser.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('registered_at') || '注册时间'}: {format(new Date(invitedUser.created_at), 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('no_invited_users') || '暂无邀请记录'}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 充值钱包弹窗 */}
      <USDTWalletDialog 
        open={isWalletDialogOpen} 
        onOpenChange={setIsWalletDialogOpen}
        trigger={<span className="hidden" />}
      />
    </div>
  );
};

export default MyPredictions;

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import USDTWalletDialog from "./USDTWalletDialog";
import PlaceBetDialog from "./PlaceBetDialog";
import { Trophy, Target, Wallet, Edit2, Check, ArrowLeft, History, Users, TrendingUp, TrendingDown, BarChart3, Filter, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Plus, CreditCard, Receipt, Crown, Sparkles } from "lucide-react";
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
            <p className="text-sm font-bold font-mono text-success">{winCount}</p>
            <p className="text-[10px] text-muted-foreground">{t('correct_result')}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold font-mono text-destructive">{lossCount}</p>
            <p className="text-[10px] text-muted-foreground">{t('wrong_result')}</p>
          </div>
          <div className="text-center">
            <p className={`text-sm font-bold font-mono ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('profit_loss_label')}</p>
          </div>
        </div>
      </div>

      {/* 历史记录表格 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                        <span className={`text-[10px] font-medium ${pred.type === 'prediction' ? 'text-primary' : 'text-amber-500'}`}>
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            pred.prediction_type === 'handicap' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {pred.prediction_type === 'handicap' ? t('handicap') : t('over_under')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-foreground">
                        {pred.prediction}
                      </td>
                      <td className="py-1.5 px-2 text-center text-[10px] font-mono">
                        {pred.odds ? (
                          <span className="text-amber-400 font-medium">{pred.odds.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[10px] font-mono text-muted-foreground">
                        ${pred.bet_amount}
                      </td>
                      <td className={`py-1.5 px-2 text-right text-[10px] font-mono font-bold ${
                        profit >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {profit >= 0 ? '+' : ''}{profit.toFixed(0)}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {pred.result === 'win' ? (
                          <CheckCircle2 className="h-3 w-3 text-success inline-block" />
                        ) : pred.result === 'loss' ? (
                          <XCircle className="h-3 w-3 text-destructive inline-block" />
                        ) : pred.result === 'pending' ? (
                          <span className="text-[10px] text-amber-500 font-medium">{t('in_progress')}</span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-medium">{t('in_progress')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页控件 */}
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
    </div>
  );
};

const MyPredictions = () => {
  const { t } = useTranslation();
  const { user, userProfile: authUserProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [matchesMap, setMatchesMap] = useState<Map<string, MatchInfo>>(new Map());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copyTradeRecords, setCopyTradeRecords] = useState<CopyTradeRecord[]>([]);
  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [spendingRecords, setSpendingRecords] = useState<SpendingRecord[]>([]);
  const [activeTab, setActiveTab] = useState("history");
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [isPurchasingVip, setIsPurchasingVip] = useState(false);

  // 同步AuthContext中的用户资料到本地状态
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
          avatar_url: "/avatars/avatar-1.png"
        });
        setEditDisplayName("QuickTiger1234");
        setSelectedAvatar("/avatars/avatar-1.png");
        
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
          .select('display_name, avatar_url, invitation_code, invited_count')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData as UserProfile);
          setEditDisplayName(profileData.display_name || '');
          setSelectedAvatar(profileData.avatar_url || '');
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

  // 开通VIP
  const handlePurchaseVip = async () => {
    if (!user) {
      toast.error(t('vip_login_required') || '请先登录');
      navigate('/auth');
      return;
    }

    if (usdtBalance < VIP_COST) {
      toast.error(t('vip_insufficient_balance') || '猎人币余额不足，请先充值');
      return;
    }

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
        toast.success(t('vip_activated') || 'VIP开通成功！现在可以免费查看所有跟单预测');
      } else {
        toast.error(result.error || t('purchase_failed') || '开通失败');
      }
    } catch (error) {
      console.error('Error purchasing VIP:', error);
      toast.error(t('purchase_failed') || '开通失败，请重试');
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
        })
        .eq('id', user.id);

      if (error) throw error;

      // 更新本地状态
      setUserProfile({
        display_name: editDisplayName,
        avatar_url: selectedAvatar,
      });
      
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

  if (!stats) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('my_predictions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">{t('no_prediction_records')}</p>
          <Button onClick={() => navigate('/')}>
            {t('start_prediction')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-7 text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
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
          <div className="p-4 pb-3">
            <div className="flex items-start justify-between">
              {/* 左侧头像和信息 */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {/* 头像光环 */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-ai-cyan/50 via-ai-purple/30 to-ai-cyan/50 rounded-full blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="relative h-14 w-14 border-2 border-ai-cyan/30 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                    <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || '用户'} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-ai-cyan/20 to-ai-purple/20 text-foreground font-bold">
                      {userProfile?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* 编辑按钮 */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background/90 backdrop-blur border-ai-cyan/30 hover:border-ai-cyan shadow-sm"
                      >
                        <Edit2 className="h-3 w-3 text-ai-cyan" />
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
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">
                      {userProfile?.display_name || t('player')}
                    </h2>
                    {vipStatus?.is_active && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase">
                    {t('prediction_player')}
                  </p>
                </div>
              </div>
              
              {/* 右侧胜率显示 - AI风格 */}
              <div className="text-right">
                <div className="relative">
                  <div className="absolute -inset-2 bg-ai-cyan/10 rounded-lg blur-md" />
                  <div className="relative px-3 py-1.5 bg-background/50 backdrop-blur-sm rounded-lg border border-ai-cyan/20">
                    <div className="text-2xl font-bold text-ai-cyan font-mono tracking-tight">
                      <AnimatedWinRate value={stats?.winRate || 0} />
                      <span className="text-lg">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('win_rate_label')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 统计数据网格 - AI仪表盘风格 */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: stats?.totalPredictions || 0, label: t('total_predictions_stat'), color: 'text-foreground' },
                { value: stats?.correctPredictions || 0, label: t('correct_result'), color: 'text-success' },
                { value: (stats?.totalPredictions || 0) - (stats?.correctPredictions || 0), label: t('wrong_result'), color: 'text-destructive' },
                { value: `${(stats?.profit || 0) >= 0 ? '+' : ''}${stats?.profit?.toLocaleString() || 0}`, label: t('profit_loss_label'), color: (stats?.profit || 0) >= 0 ? 'text-success' : 'text-destructive' }
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="relative group p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-ai-cyan/30 transition-all"
                >
                  <div className="absolute inset-0 bg-ai-cyan/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className={`relative text-xl font-bold font-mono ${item.color}`}>{item.value}</p>
                  <p className="relative text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 钱包区域 - 双列布局 */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              {/* 虚拟钱包 */}
              <div className="relative p-3 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{t('virtual_wallet_balance')}</span>
                </div>
                <p className="text-xl font-bold text-foreground font-mono">
                  ${stats?.balance?.toLocaleString() || '10,000'}
                </p>
              </div>

              {/* 猎人币钱包 */}
              <div className="relative p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <img src={hunterCoinIcon} alt="猎人币" className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{t('hunter_coin_balance')}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-xl font-bold text-amber-500 font-mono">{usdtBalance.toFixed(2)}</p>
                </div>
                <USDTWalletDialog 
                  trigger={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-7 text-xs font-medium border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-500"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('usdt_deposit')}
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VIP会员卡片 - AI科技风格 */}
      <div className={`relative overflow-hidden rounded-xl border transition-all ${
        vipStatus?.is_active 
          ? 'bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-500/30' 
          : 'bg-card border-border hover:border-ai-cyan/30'
      }`}>
        {/* VIP激活状态的装饰效果 */}
        {vipStatus?.is_active && (
          <>
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-yellow-500/15 rounded-full blur-xl" />
          </>
        )}
        
        <div className="relative z-10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                vipStatus?.is_active 
                  ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                  : 'bg-muted border border-border'
              }`}>
                <Crown className={`h-6 w-6 ${vipStatus?.is_active ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${vipStatus?.is_active ? 'text-amber-500' : 'text-foreground'}`}>
                    VIP {t('member') || '会员'}
                  </h3>
                  {vipStatus?.is_active && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 rounded-full">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-400">{t('active') || '已开通'}</span>
                    </div>
                  )}
                </div>
                {vipStatus?.is_active && vipStatus.expires_at ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('expires_at') || '有效期至'}: {format(new Date(vipStatus.expires_at), 'yyyy-MM-dd')}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('vip_benefit') || '开通后可免费查看所有跟单预测'}
                  </p>
                )}
              </div>
            </div>
            
            {!vipStatus?.is_active && (
              <Button
                size="sm"
                className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20"
                onClick={handlePurchaseVip}
                disabled={isPurchasingVip}
              >
                {isPurchasingVip ? (
                  <span className="animate-pulse">{t('processing') || '处理中...'}</span>
                ) : (
                  <>
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    {VIP_COST} {t('hunter_coin_unit') || '猎人币'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 邀请码卡片 - 简洁设计 */}
      {userProfile?.invitation_code && (
        <div className="relative overflow-hidden rounded-xl bg-card border border-border hover:border-ai-cyan/30 transition-colors">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-20 h-20 bg-ai-cyan/20 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ai-cyan/10 border border-ai-cyan/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-ai-cyan" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('my_invitation_code') || '我的邀请码'}</p>
                  <p className="text-lg font-bold font-mono text-foreground tracking-[0.3em]">{userProfile.invitation_code}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('invited_count') || '已邀请'}</p>
                  <p className="text-xl font-bold text-ai-cyan font-mono">{userProfile.invited_count || 0}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 text-xs border-ai-cyan/30 hover:bg-ai-cyan/10 text-ai-cyan"
                  onClick={() => {
                    navigator.clipboard.writeText(userProfile.invitation_code || '');
                    toast.success(t('invitation_code_copied') || '邀请码已复制');
                  }}
                >
                  {t('copy') || '复制'}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/50">
              {t('invitation_bonus_hint') || '好友通过您的邀请码注册可获得100 猎人币奖励'}
            </p>
          </div>
        </div>
      )}

      {/* 开始预测按钮 - AI风格 */}
      <Button 
        className="w-full h-11 text-sm font-bold bg-gradient-to-r from-ai-cyan via-ai-blue to-ai-purple hover:opacity-90 text-background shadow-lg shadow-ai-cyan/20 transition-all"
        onClick={() => setIsBetDialogOpen(true)}
      >
        <Target className="h-4 w-4 mr-2" />
        {t('start_prediction')}
      </Button>

      {/* 预测对话框 */}
      <PlaceBetDialog 
        open={isBetDialogOpen} 
        onOpenChange={setIsBetDialogOpen} 
      />

      {/* 胜率趋势图表 */}
      <WinRateTrendChart predictions={stats?.recentPredictions || []} />

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="history" className="flex items-center gap-1 text-[10px] px-1">
            <History className="h-3 w-3" />
            {t('player_prediction_records') || '预测记录'}
          </TabsTrigger>
          <TabsTrigger value="deposit" className="flex items-center gap-1 text-[10px] px-1">
            <CreditCard className="h-3 w-3" />
            {t('deposit_records') || '充值记录'}
          </TabsTrigger>
          <TabsTrigger value="spending" className="flex items-center gap-1 text-[10px] px-1">
            <Receipt className="h-3 w-3" />
            {t('spending_records') || '消费记录'}
          </TabsTrigger>
          <TabsTrigger value="copy-trade" className="flex items-center gap-1 text-[10px] px-1">
            <Users className="h-3 w-3" />
            {t('copy_trade_records') || '跟单记录'}
          </TabsTrigger>
        </TabsList>

        {/* 完整历史记录标签页 */}
        <TabsContent value="history" className="mt-2">
          <PlayerHistoryTable predictions={stats?.recentPredictions || []} copyTradeRecords={copyTradeRecords} />
        </TabsContent>

        {/* 充值记录标签页 */}
        <TabsContent value="deposit" className="mt-2">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[#26A17B]" />
                {t('deposit_records') || '充值记录'}
              </h3>
              <p className="text-[10px] text-muted-foreground">{t('deposit_records_desc') || '查看您的USDT充值历史'}</p>
            </div>
            
            {depositRecords.length > 0 ? (
              <>
                {/* 充值统计 */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-foreground">{depositRecords.length}</p>
                    <p className="text-[10px] text-muted-foreground">{t('total_deposits') || '充值次数'}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-[#26A17B]">
                      ${depositRecords.filter(d => d.status === 'confirmed').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('confirmed_amount') || '已到账'}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-amber-500">
                      ${depositRecords.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('pending_amount') || '待确认'}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('date_column') || '时间'}</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('amount_column') || '金额'}</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('network_column') || '网络'}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('address_column') || '地址'}</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('status_column') || '状态'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depositRecords.map((record) => (
                        <tr key={record.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-1.5 px-2">
                            <p className="text-[10px] text-foreground">{format(new Date(record.created_at), 'MM-dd HH:mm')}</p>
                            {record.confirmed_at && (
                              <p className="text-[9px] text-muted-foreground">
                                {t('confirmed_at') || '确认'}: {format(new Date(record.confirmed_at), 'HH:mm')}
                              </p>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <p className="text-sm font-bold font-mono text-[#26A17B]">+${record.amount}</p>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">
                              {record.network}
                            </span>
                          </td>
                          <td className="py-1.5 px-2">
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                              {record.wallet_address}
                            </p>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {record.status === 'confirmed' ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success font-medium">
                                {t('confirmed') || '已确认'}
                              </span>
                            ) : record.status === 'pending' ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium animate-pulse">
                                {t('pending') || '待确认'}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium">
                                {t('failed') || '失败'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <CreditCard className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground mb-1">{t('no_deposit_records') || '暂无充值记录'}</p>
                <p className="text-[10px] text-muted-foreground">{t('deposit_hint') || '点击上方"充值"按钮添加USDT'}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 消费记录标签页 - 仅显示跟单消费 */}
        <TabsContent value="spending" className="mt-2">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-primary" />
                {t('spending_records') || '消费记录'}
              </h3>
              <p className="text-[10px] text-muted-foreground">{t('copy_trade_spending_desc') || '查看您的跟单消费明细'}</p>
            </div>
            
            {copyTradeRecords.length > 0 ? (
              <>
                {/* 跟单消费统计 */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-foreground">{copyTradeRecords.length}</p>
                    <p className="text-[10px] text-muted-foreground">{t('copy_trade_count') || '跟单次数'}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-foreground">
                      ${copyTradeRecords.reduce((sum, r) => sum + r.bet_amount, 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('total_spent') || '总消费'}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-amber-500">
                      {copyTradeRecords.filter(r => r.bet_amount > 0).length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('paid_copy_trades') || '付费跟单'}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('date_column') || '时间'}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('followed_player') || '跟单玩家'}</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('is_paid') || '是否付费'}</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('amount_spent') || '消费金额'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {copyTradeRecords.map((record) => (
                        <tr key={record.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-1.5 px-2">
                            <p className="text-[10px] text-foreground">{format(new Date(record.created_at), 'MM-dd HH:mm')}</p>
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={record.followed_player_avatar} />
                                <AvatarFallback className="text-[8px]">{record.followed_player_name.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-foreground font-medium">{record.followed_player_name}</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {record.bet_amount > 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
                                {t('paid') || '付费'}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success">
                                {t('free') || '免费'}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <p className={`text-[10px] font-mono font-bold ${record.bet_amount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {record.bet_amount > 0 ? `-$${record.bet_amount}` : '$0'}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <Receipt className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground mb-1">{t('no_copy_trade_spending') || '暂无跟单消费记录'}</p>
                <p className="text-[10px] text-muted-foreground">{t('start_copy_trading_hint') || '跟单其他玩家后，消费记录将在此显示'}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 跟单记录标签页 */}
        <TabsContent value="copy-trade" className="mt-2">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">{t('copy_trade_records_title')}</h3>
              <p className="text-[10px] text-muted-foreground">{t('following_other_players')}</p>
            </div>
            
            {copyTradeRecords.length > 0 ? (
              <>
                <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-foreground">{copyTradeRecords.length}</p>
                    <p className="text-[10px] text-muted-foreground">{t('copy_trade_count')}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-foreground">
                      ${copyTradeRecords.reduce((sum, r) => sum + r.bet_amount, 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('total_investment')}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold font-mono text-success">
                      ${copyTradeRecords.filter(r => r.result === 'win').reduce((sum, r) => sum + r.bet_amount + r.pnl, 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('won_amount')}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className={`text-sm font-bold font-mono ${
                      copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0) >= 0 ? '+' : ''}
                      ${copyTradeRecords.reduce((sum, r) => sum + r.pnl, 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('net_profit_loss')}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('followed_player')}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('match_column')}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('prediction_type_label')}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('prediction_column')}</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('odds_label')}</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('follow_amount')}</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('profit_loss_label')}</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground text-[10px]">{t('result_column')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {copyTradeRecords.map((record) => (
                        <tr key={record.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5 border border-border">
                                <AvatarImage src={record.followed_player_avatar} />
                                <AvatarFallback className="text-[9px]">{record.followed_player_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-[10px] font-medium text-foreground truncate max-w-[70px]">{record.followed_player_name}</p>
                                <p className="text-[9px] text-muted-foreground">{format(new Date(record.created_at), 'MM-dd')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-1.5 px-2">
                            <p className="text-[10px] text-foreground">{record.match_home_team} vs {record.match_away_team}</p>
                          </td>
                          <td className="py-1.5 px-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              record.prediction_type === 'handicap' 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {record.prediction_type === 'handicap' ? t('handicap') : t('over_under')}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-[10px] text-foreground">
                            {record.prediction}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <span className="text-[10px] font-mono text-amber-400 font-medium">{record.odds.toFixed(2)}</span>
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <p className="text-[10px] font-mono font-bold text-foreground">${record.bet_amount}</p>
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <p className={`text-[10px] font-mono font-bold ${record.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {record.pnl >= 0 ? '+' : ''}${record.pnl}
                            </p>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {record.result === 'win' ? (
                              <CheckCircle2 className="h-3 w-3 text-success inline-block" />
                            ) : record.result === 'loss' ? (
                              <XCircle className="h-3 w-3 text-destructive inline-block" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground mb-1">{t('no_copy_trade_records')}</p>
                <p className="text-[10px] text-muted-foreground mb-2">{t('go_to_leaderboard')}</p>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/leaderboard')}>
                  {t('view_leaderboard')}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyPredictions;

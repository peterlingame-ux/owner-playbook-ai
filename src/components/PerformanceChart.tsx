import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";

interface PerformanceChartProps {
  onChartClick?: () => void;
}

type ChartDataPoint = {
  date: string;
  deepseek: number;
  gpt5: number;
  claude: number;
  gemini: number;
  grok: number;
  hunsoccermax: number;
};

// 生成全0的图表数据（从 11/21 开始）
const generateZeroChartData = (days: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const startDate = new Date('2025-11-21');
  startDate.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      deepseek: 0,
      gpt5: 0,
      claude: 0,
      gemini: 0,
      grok: 0,
      hunsoccermax: 0,
    });
  }
  return data;
};

const PerformanceChart = ({ onChartClick }: PerformanceChartProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '72h'>('all');
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

  // 获取胜率数据 - 使用 Realtime 订阅实现实时更新
  useEffect(() => {
    const fetchWinRates = async () => {
      try {
        setIsLoading(true);
        
        // 设置起始日期为 2025-11-21
        const startDate = new Date('2025-11-21');
        startDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        // 计算从起始日期到今天的天数
        const days = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // 根据时间范围选择显示天数
        const daysToShow = timeRange === '24h' ? 1 : timeRange === '72h' ? Math.min(3, days) : days;
        
        // 直接从数据库视图查询每日胜率数据
        const { data: dailyData, error: dailyError } = await supabase
          .from('ai_win_rates_daily' as any)
          .select('*')
          .gte('settlement_date', startDate.toISOString().split('T')[0])
          .order('settlement_date', { ascending: true });

        if (dailyError) {
          console.error('Error fetching daily win rates:', dailyError);
          const zeroData = generateZeroChartData(daysToShow);
          setData(zeroData);
          return;
        }

        // 生成日期范围：从 11/21 开始
        const dateRange: string[] = [];
        for (let i = 0; i < daysToShow; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          dateRange.push(date.toISOString().split('T')[0]);
        }

        // 按日期组织数据
        const chartDataMap = new Map<string, ChartDataPoint>();
        
        // 初始化所有日期为0
        dateRange.forEach(date => {
          const dateKey = new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
          chartDataMap.set(date, {
            date: dateKey,
            deepseek: 0,
            gpt5: 0,
            claude: 0,
            gemini: 0,
            grok: 0,
            hunsoccermax: 0,
          });
        });

        // AI ID 映射
        const aiIdMap: Record<string, keyof ChartDataPoint> = {
          'deepseek': 'deepseek',
          'gpt5': 'gpt5',
          'claude': 'claude',
          'gemini': 'gemini',
          'grok': 'grok',
          'hunsoccermax': 'hunsoccermax',
        };

        // 填充数据：对于每个日期，使用该日期及之前的所有数据的累计胜率
        dateRange.forEach(currentDate => {
          const dateKey = new Date(currentDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
          const entry = chartDataMap.get(currentDate)!;

          // 对于每个AI，找到该日期及之前的最新累计胜率
          ['deepseek', 'gpt5', 'claude', 'gemini', 'grok', 'hunsoccermax'].forEach(aiId => {
            const relevantData = ((dailyData || []) as any[]).filter(
              (d: any) => d.ai_id === aiId && d.settlement_date <= currentDate
            );
            
            if (relevantData.length > 0) {
              // 找到该日期之前最新的记录
              const latest = relevantData[relevantData.length - 1] as any;
              const key = aiIdMap[aiId] as keyof ChartDataPoint;
              (entry as any)[key] = latest.win_rate || 0;
            }
          });
        });

        const chartData = Array.from(chartDataMap.values());
        setData(chartData);
      } catch (error) {
        console.error('Error fetching win rates:', error);
        // 计算默认天数：从 11/21 到今天
        const startDate = new Date('2025-11-21');
        startDate.setHours(0, 0, 0, 0);
        const today = new Date();
        const days = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const daysToShow = timeRange === '24h' ? 1 : timeRange === '72h' ? Math.min(3, days) : days;
        const zeroData = generateZeroChartData(daysToShow);
        setData(zeroData);
      } finally {
        setIsLoading(false);
      }
    };

    // 初始加载
    fetchWinRates();

    // 订阅 sim_positions 表的变化，当有投注结算时实时更新
    const channel = supabase
      .channel('win-rates-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sim_positions',
          filter: 'status=eq.settled',
        },
        (payload) => {
          console.log('Sim position settled, refreshing win rates:', payload);
          fetchWinRates();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sim_positions',
        },
        (payload) => {
          // 新投注创建时也刷新（虽然胜率可能还没变化）
          console.log('New sim position created:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  // Custom dot component with model icons
  const CustomDot = (props: any) => {
    const { cx, cy, stroke, dataKey } = props;
    const isLastPoint = props.index === data.length - 1;
    
    if (!isLastPoint) return null;
    
    let iconSrc;
    switch(dataKey) {
      case 'deepseek':
        iconSrc = deepseekIcon;
        break;
      case 'gpt5':
        iconSrc = openaiIcon;
        break;
      case 'claude':
        iconSrc = claudeIcon;
        break;
      case 'gemini':
        iconSrc = geminiIcon;
        break;
      case 'grok':
        iconSrc = grokIcon;
        break;
      case 'hunsoccermax':
        iconSrc = user && userProfile?.avatar_url ? userProfile.avatar_url : hunsoccerIcon;
        break;
      default:
        return null;
    }
    
    // Responsive sizing - larger on mobile for better touch targets
    const radius = window.innerWidth < 768 ? 20 : 24;
    const iconSize = window.innerWidth < 768 ? 30 : 36;
    const iconOffset = iconSize / 2;
    
    return (
      <g>
        <circle cx={cx} cy={cy} r={radius} fill="hsl(var(--background))" stroke={stroke} strokeWidth={3} />
        <image 
          x={cx - iconOffset} 
          y={cy - iconOffset} 
          width={iconSize} 
          height={iconSize} 
          href={iconSrc}
          style={{ clipPath: `circle(${iconOffset - 4}px)` }}
        />
      </g>
    );
  };

  // Custom Legend Component with icons
  const CustomLegend = (props: any) => {
    const { payload } = props;
    
    const getIcon = (dataKey: string) => {
      switch(dataKey) {
        case 'deepseek': return deepseekIcon;
        case 'gpt5': return openaiIcon;
        case 'claude': return claudeIcon;
        case 'gemini': return geminiIcon;
        case 'grok': return grokIcon;
        case 'hunsoccermax': return user && userProfile?.avatar_url ? userProfile.avatar_url : hunsoccerIcon;
        default: return null;
      }
    };

    const getName = (dataKey: string, originalName: string) => {
      if (dataKey === 'hunsoccermax') {
        return user && userProfile?.display_name ? userProfile.display_name : (t('demo_player') || '体验玩家');
      }
      return originalName;
    };
    
    return (
      <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 pt-4 sm:pt-6">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5 sm:gap-2">
            <img 
              src={getIcon(entry.dataKey)} 
              alt={entry.value}
              className={`w-4 h-4 sm:w-5 sm:h-5 object-contain ${entry.dataKey === 'hunsoccermax' && user ? 'rounded-full' : ''}`}
            />
            <span className="text-xs sm:text-sm font-semibold tracking-wide" style={{ color: entry.color }}>
              {getName(entry.dataKey, entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const handleLineClick = () => {
    if (onChartClick) {
      onChartClick();
    }
  };

  return (
    <Card className="p-4 sm:p-5 bg-card border-border/30">
      {/* Content */}
      <div>
      <div className="mb-4 sm:mb-5 flex flex-col items-center justify-center gap-2 sm:gap-3">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold tracking-wide text-center text-foreground">
          {t('performance_over_time')}
        </h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-foreground text-background' 
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('all')}
          </button>
          <button 
            onClick={() => setTimeRange('24h')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              timeRange === '24h' 
                ? 'bg-foreground text-background' 
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('24h')}
          </button>
          <button 
            onClick={() => setTimeRange('72h')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              timeRange === '72h' 
                ? 'bg-foreground text-background' 
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('72h')}
          </button>
        </div>
      </div>

      {/* Analysis Dimensions Banner */}
      <div className="mb-4 sm:mb-5 py-2 px-3 sm:px-4 bg-secondary/20 rounded-md">
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[hsl(var(--gpt))]" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {t('owners_analysis')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[hsl(var(--gpt))]" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {t('tech_breakdown')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[hsl(var(--gpt))]" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {t('odds_monitoring')}
            </span>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-[300px] sm:h-[400px] flex items-center justify-center">
          <div className="text-muted-foreground">{t('loading') || 'Loading...'}</div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-[300px] sm:h-[400px] flex items-center justify-center">
          <div className="text-muted-foreground">{t('no_data') || '暂无数据'}</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
          <LineChart 
            data={data} 
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            vertical={false}
            className="animate-fade-in"
          />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
            angle={0}
            textAnchor="middle"
            height={40}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(value) => `${value}%`}
            style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}
            width={40}
            allowDataOverflow={false}
            padding={{ top: 20, bottom: 20 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 500,
              fontSize: '12px',
              padding: '10px 14px',
            }}
            labelStyle={{
              color: "hsl(var(--foreground))",
              fontWeight: 600,
              marginBottom: '6px',
              fontSize: '11px'
            }}
            formatter={(value: number, name: string) => [
              <span style={{ 
                color: 'hsl(var(--foreground))', 
                fontWeight: 600,
                fontSize: '13px'
              }}>
                {value.toFixed(1)}%
              </span>, 
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>{name}</span>
            ]}
            animationDuration={200}
            animationEasing="ease-out"
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Legend 
            content={<CustomLegend />}
          />
          <Line 
            type="monotone" 
            dataKey="deepseek" 
            stroke="hsl(var(--deepseek))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="DeepSeek"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 6, 
              fill: 'hsl(var(--deepseek))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
            animationBegin={0}
          />
          <Line 
            type="monotone" 
            dataKey="gpt5" 
            stroke="hsl(var(--gpt))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="GPT 5"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 6, 
              fill: 'hsl(var(--gpt))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
            animationBegin={100}
          />
          <Line 
            type="monotone" 
            dataKey="claude" 
            stroke="hsl(var(--claude))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="Claude"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 6, 
              fill: 'hsl(var(--claude))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
            animationBegin={200}
          />
          <Line 
            type="monotone" 
            dataKey="gemini" 
            stroke="hsl(var(--gemini))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="Gemini"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 6, 
              fill: 'hsl(var(--gemini))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
            animationBegin={300}
          />
          <Line 
            type="monotone" 
            dataKey="grok" 
            stroke="hsl(var(--grok))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="Grok"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 6, 
              fill: 'hsl(var(--grok))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
            animationBegin={400}
          />
          <Line 
            type="monotone" 
            dataKey="hunsoccermax" 
            stroke="hsl(var(--mystery))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="HUNSOCCER MAX"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 6, 
              fill: 'hsl(var(--mystery))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
            animationBegin={500}
          />
        </LineChart>
      </ResponsiveContainer>
      )}
      </div>
    </Card>
  );
};

export default PerformanceChart;

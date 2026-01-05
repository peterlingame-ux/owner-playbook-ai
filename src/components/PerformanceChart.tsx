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

// 生成模拟图表数据（从 11/21 开始）
const generateMockChartData = (days: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const startDate = new Date('2025-11-21');
  startDate.setHours(0, 0, 0, 0);
  
  // 基础胜率 + 随机波动
  const baseRates = {
    deepseek: 62,
    gpt5: 58,
    claude: 65,
    gemini: 55,
    grok: 52,
    hunsoccermax: 68,
  };
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // 随时间逐渐上升的趋势 + 随机波动
    const trend = i * 0.15;
    const randomFactor = () => (Math.random() - 0.5) * 8;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      deepseek: Math.min(95, Math.max(40, baseRates.deepseek + trend + randomFactor())),
      gpt5: Math.min(95, Math.max(40, baseRates.gpt5 + trend + randomFactor())),
      claude: Math.min(95, Math.max(40, baseRates.claude + trend + randomFactor())),
      gemini: Math.min(95, Math.max(40, baseRates.gemini + trend + randomFactor())),
      grok: Math.min(95, Math.max(40, baseRates.grok + trend + randomFactor())),
      hunsoccermax: Math.min(95, Math.max(40, baseRates.hunsoccermax + trend + randomFactor())),
    });
  }
  return data;
};

const PerformanceChart = ({ onChartClick }: PerformanceChartProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '24h' | '72h'>('7d');
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
        const totalDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // 根据时间范围选择显示天数
        const daysToShow = timeRange === '24h' ? 1 : timeRange === '72h' ? 3 : 7; // 7d 显示7天
        
        // 直接从数据库视图查询每日胜率数据
        const { data: dailyData, error: dailyError } = await supabase
          .from('ai_win_rates_daily' as any)
          .select('*')
          .gte('settlement_date', startDate.toISOString().split('T')[0])
          .order('settlement_date', { ascending: true });

        if (dailyError) {
          console.error('Error fetching daily win rates:', dailyError);
          const zeroData = generateMockChartData(daysToShow);
          setData(zeroData);
          return;
        }

        // 生成日期范围：从今天往前推 daysToShow 天
        const dateRange: string[] = [];
        for (let i = daysToShow - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
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
        // 计算默认天数
        const daysToShow = timeRange === '24h' ? 1 : timeRange === '72h' ? 3 : 7;
        const zeroData = generateMockChartData(daysToShow);
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

  // Custom Legend Component with icons - minimalist style
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
        return user && userProfile?.display_name ? userProfile.display_name : t('demo_player');
      }
      return originalName;
    };
    
    return (
      <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 pt-4 sm:pt-8 px-1">
        {payload.map((entry: any, index: number) => (
          <div 
            key={`item-${index}`} 
            className="flex items-center gap-1 sm:gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <div 
              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[9px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap">
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
    <Card className="p-3 sm:p-6 lg:p-8 bg-card/50 backdrop-blur-sm border-border/20">
      {/* Header - Minimalist */}
      <div className="mb-4 sm:mb-6 lg:mb-8 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shrink-0">
          <h2 className="text-sm sm:text-lg lg:text-xl font-semibold tracking-tight text-foreground text-center sm:text-left">
            {t('performance_over_time')}
          </h2>
          
          {/* Time Range Tabs - Pill style */}
          <div className="flex bg-muted/30 rounded-full p-0.5 sm:p-1 shrink-0">
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`!px-2.5 sm:!px-4 !py-1 sm:!py-1.5 !min-w-0 !min-h-0 rounded-full text-[10px] sm:text-xs font-medium transition-all shrink-0 whitespace-nowrap touch-manipulation ${
                timeRange === '7d'
                  ? 'bg-foreground text-background shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7D
            </button>
            <button 
              type="button"
              onClick={() => setTimeRange('24h')}
              className={`!px-2.5 sm:!px-4 !py-1 sm:!py-1.5 !min-w-0 !min-h-0 rounded-full text-[10px] sm:text-xs font-medium transition-all shrink-0 whitespace-nowrap touch-manipulation ${
                timeRange === '24h' 
                  ? 'bg-foreground text-background shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              24H
            </button>
            <button 
              type="button"
              onClick={() => setTimeRange('72h')}
              className={`!px-2.5 sm:!px-4 !py-1 sm:!py-1.5 !min-w-0 !min-h-0 rounded-full text-[10px] sm:text-xs font-medium transition-all shrink-0 whitespace-nowrap touch-manipulation ${
                timeRange === '72h' 
                  ? 'bg-foreground text-background shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              72H
            </button>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-[220px] sm:h-[280px] lg:h-[360px] flex items-center justify-center">
          <div className="text-muted-foreground text-xs sm:text-sm">{t('loading')}</div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-[220px] sm:h-[280px] lg:h-[360px] flex items-center justify-center">
          <div className="text-muted-foreground text-xs sm:text-sm">{t('no_data')}</div>
        </div>
      ) : (
        <div className="w-full h-[220px] sm:h-[280px] lg:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data} 
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
            <CartesianGrid 
              strokeDasharray="0" 
              stroke="hsl(var(--border)/0.3)" 
              vertical={false}
              horizontal={true}
            />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground)/0.5)"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={5}
              tick={{ fontSize: 9 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground)/0.5)"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `${value}%`}
              width={35}
              dx={-2}
              tick={{ fontSize: 9 }}
            />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
              padding: '12px 16px',
            }}
            labelStyle={{
              color: "hsl(var(--foreground))",
              fontWeight: 600,
              marginBottom: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => [
              <span style={{ 
                color: 'hsl(var(--foreground))', 
                fontWeight: 600,
                fontSize: '14px'
              }}>
                {value.toFixed(1)}%
              </span>, 
              <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}>{name}</span>
            ]}
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
          />
          <Legend 
            content={<CustomLegend />}
          />
          <Line 
            type="monotone" 
            dataKey="deepseek" 
            stroke="hsl(var(--deepseek))" 
            strokeWidth={2}
            dot={false}
            name="DeepSeek"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 5, 
              fill: 'hsl(var(--deepseek))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
          <Line 
            type="monotone" 
            dataKey="gpt5" 
            stroke="hsl(var(--gpt))" 
            strokeWidth={2}
            dot={false}
            name="GPT 5"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 5, 
              fill: 'hsl(var(--gpt))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
          <Line 
            type="monotone" 
            dataKey="claude" 
            stroke="hsl(var(--claude))" 
            strokeWidth={2}
            dot={false}
            name="Claude"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 5, 
              fill: 'hsl(var(--claude))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
          <Line 
            type="monotone" 
            dataKey="gemini" 
            stroke="hsl(var(--gemini))" 
            strokeWidth={2}
            dot={false}
            name="Gemini"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 5, 
              fill: 'hsl(var(--gemini))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
          <Line 
            type="monotone" 
            dataKey="grok" 
            stroke="hsl(var(--grok))" 
            strokeWidth={2}
            dot={false}
            name="Grok"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 5, 
              fill: 'hsl(var(--grok))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
          <Line 
            type="monotone" 
            dataKey="hunsoccermax" 
            stroke="hsl(var(--mystery))" 
            strokeWidth={2}
            dot={false}
            name={t('demo_player')}
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 5, 
              fill: 'hsl(var(--mystery))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
          </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default PerformanceChart;

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import hunsoccerIcon from "@/assets/hunsoccer-ai-icon.png";
import ronaldoBg from "@/assets/ronaldo-bg.jpg";
import messiBg from "@/assets/messi-bg.jpg";
import mbappeBg from "@/assets/mbappe-bg.jpg";

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

// 生成全0的图表数据
const generateZeroChartData = (days: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
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
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | '72h'>('all');

  // 获取胜率数据 - 使用 Realtime 订阅实现实时更新
  useEffect(() => {
    const fetchWinRates = async () => {
      try {
        setIsLoading(true);
        
        const days = timeRange === '72h' ? 3 : 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // 直接从数据库视图查询每日胜率数据
        const { data: dailyData, error: dailyError } = await supabase
          .from('ai_win_rates_daily' as any)
          .select('*')
          .gte('settlement_date', cutoffDate.toISOString().split('T')[0])
          .order('settlement_date', { ascending: true });

        if (dailyError) {
          console.error('Error fetching daily win rates:', dailyError);
          const zeroData = generateZeroChartData(days);
          setData(zeroData);
          return;
        }

        // 生成日期范围
        const dateRange: string[] = [];
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (days - i - 1));
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
        const zeroData = generateZeroChartData(timeRange === '72h' ? 3 : 30);
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
        iconSrc = hunsoccerIcon;
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
        case 'hunsoccermax': return hunsoccerIcon;
        default: return null;
      }
    };
    
    return (
      <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 pt-4 sm:pt-6">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5 sm:gap-2">
            <img 
              src={getIcon(entry.dataKey)} 
              alt={entry.value}
              className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
            />
            <span className="text-xs sm:text-sm font-semibold tracking-wide" style={{ color: entry.color }}>
              {entry.value}
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
    <Card className="p-3 sm:p-6 bg-card border-border relative overflow-hidden">
      {/* Football Stars Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 bottom-0 w-1/3 opacity-25">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url(${ronaldoBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(40%)'
            }}
          />
        </div>
        <div className="absolute left-1/3 top-0 bottom-0 w-1/3 opacity-25">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url(${messiBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(40%)'
            }}
          />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-25">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url(${mbappeBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(40%)'
            }}
          />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/85 to-background/80" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
      <div className="mb-3 sm:mb-6 flex flex-col items-center justify-center gap-2 sm:gap-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-wider text-center text-foreground">
          {t('performance_over_time')}
        </h2>
        <div className="flex gap-2 sm:gap-2">
          <button 
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm font-semibold tracking-wide transition-colors ${
              timeRange === 'all' 
                ? 'bg-foreground text-background' 
                : 'bg-secondary text-foreground hover:bg-accent'
            }`}
          >
            {t('all')}
          </button>
          <button 
            onClick={() => setTimeRange('72h')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm font-semibold tracking-wide transition-colors ${
              timeRange === '72h' 
                ? 'bg-foreground text-background' 
                : 'bg-secondary text-foreground hover:bg-accent'
            }`}
          >
            {t('72h')}
          </button>
        </div>
      </div>

      {/* Analysis Dimensions Banner */}
      <div className="mb-3 sm:mb-6 p-2 sm:p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/30 rounded-xl">
        <div className="flex items-center justify-center gap-2 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] sm:text-sm font-semibold tracking-wide text-foreground">
              {t('owners_analysis')}
            </span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-border" />
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] sm:text-sm font-semibold tracking-wide text-foreground">
              {t('tech_breakdown')}
            </span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-border" />
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] sm:text-sm font-semibold tracking-wide text-foreground">
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
              border: "2px solid hsl(var(--primary))",
              borderRadius: "12px",
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              fontSize: '13px',
              padding: '12px 16px',
              boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.5), 0 0 20px hsl(var(--primary) / 0.2)',
            }}
            labelStyle={{
              color: "hsl(var(--foreground))",
              fontWeight: 700,
              marginBottom: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => [
              <span style={{ 
                color: 'hsl(var(--primary))', 
                fontWeight: 700,
                fontSize: '14px'
              }}>
                {value.toFixed(1)}%
              </span>, 
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>{name}</span>
            ]}
            animationDuration={300}
            animationEasing="ease-out"
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5' }}
          />
          <Legend 
            content={<CustomLegend />}
          />
          <Line 
            type="monotone" 
            dataKey="deepseek" 
            stroke="hsl(var(--deepseek))" 
            strokeWidth={3}
            dot={<CustomDot />}
            name="DeepSeek"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 8, 
              fill: 'hsl(var(--deepseek))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px hsl(var(--deepseek)))'
            }}
            animationDuration={2000}
            animationEasing="ease-in-out"
            animationBegin={0}
          />
          <Line 
            type="monotone" 
            dataKey="gpt5" 
            stroke="hsl(var(--gpt))" 
            strokeWidth={3}
            dot={<CustomDot />}
            name="GPT 5"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 8, 
              fill: 'hsl(var(--gpt))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px hsl(var(--gpt)))'
            }}
            animationDuration={2000}
            animationEasing="ease-in-out"
            animationBegin={200}
          />
          <Line 
            type="monotone" 
            dataKey="claude" 
            stroke="hsl(var(--claude))" 
            strokeWidth={3}
            dot={<CustomDot />}
            name="Claude"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 8, 
              fill: 'hsl(var(--claude))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px hsl(var(--claude)))'
            }}
            animationDuration={2000}
            animationEasing="ease-in-out"
            animationBegin={400}
          />
          <Line 
            type="monotone" 
            dataKey="gemini" 
            stroke="hsl(var(--gemini))" 
            strokeWidth={3}
            dot={<CustomDot />}
            name="Gemini"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 8, 
              fill: 'hsl(var(--gemini))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px hsl(var(--gemini)))'
            }}
            animationDuration={2000}
            animationEasing="ease-in-out"
            animationBegin={600}
          />
          <Line 
            type="monotone" 
            dataKey="grok" 
            stroke="hsl(var(--grok))" 
            strokeWidth={3}
            dot={<CustomDot />}
            name="Grok"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 8, 
              fill: 'hsl(var(--grok))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 3,
              filter: 'drop-shadow(0 0 8px hsl(var(--grok)))'
            }}
            animationDuration={2000}
            animationEasing="ease-in-out"
            animationBegin={800}
          />
          <Line 
            type="monotone" 
            dataKey="hunsoccermax" 
            stroke="hsl(var(--mystery))" 
            strokeWidth={4}
            dot={<CustomDot />}
            name="HUNSOCCER MAX"
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
            activeDot={{ 
              r: 10, 
              fill: 'hsl(var(--mystery))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 4,
              filter: 'drop-shadow(0 0 12px hsl(var(--mystery)))'
            }}
            animationDuration={2500}
            animationEasing="ease-in-out"
            animationBegin={1000}
          />
        </LineChart>
      </ResponsiveContainer>
      )}
      </div>
    </Card>
  );
};

export default PerformanceChart;

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { generateChartData } from "@/data/mockData";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";
import ronaldoBg from "@/assets/ronaldo-bg.jpg";
import messiBg from "@/assets/messi-bg.jpg";
import mbappeBg from "@/assets/mbappe-bg.jpg";

const PerformanceChart = () => {
  const { t } = useTranslation();
  const data = generateChartData();

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
      default:
        return null;
    }
    
    return (
      <g>
        <circle cx={cx} cy={cy} r={24} fill="hsl(var(--background))" stroke={stroke} strokeWidth={3} />
        <image 
          x={cx - 18} 
          y={cy - 18} 
          width={36} 
          height={36} 
          href={iconSrc}
          style={{ clipPath: 'circle(16px)' }}
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
        default: return null;
      }
    };
    
    return (
      <div className="flex flex-wrap justify-center items-center gap-6 pt-6">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <img 
              src={getIcon(entry.dataKey)} 
              alt={entry.value}
              className="w-5 h-5 object-contain"
            />
            <span className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-6 bg-card border-border relative overflow-hidden">
      {/* Football Stars Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 top-0 bottom-0 w-1/3 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url(${ronaldoBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(60%)'
            }}
          />
        </div>
        <div className="absolute left-1/3 top-0 bottom-0 w-1/3 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url(${messiBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(60%)'
            }}
          />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `url(${mbappeBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'grayscale(60%)'
            }}
          />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/95 to-background/90" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('performance_over_time')}</h2>
          <p className="text-muted-foreground text-sm mt-1">Prediction Accuracy Over Time</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-foreground text-background rounded text-sm font-medium">
            ALL
          </button>
          <button className="px-4 py-2 bg-secondary text-foreground rounded text-sm font-medium hover:bg-accent transition-colors">
            72H
          </button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
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
          />
          <Line 
            type="monotone" 
            dataKey="gpt5" 
            stroke="hsl(var(--gpt))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="GPT 5"
          />
          <Line 
            type="monotone" 
            dataKey="claude" 
            stroke="hsl(var(--claude))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="Claude"
          />
          <Line 
            type="monotone" 
            dataKey="gemini" 
            stroke="hsl(var(--gemini))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="Gemini"
          />
          <Line 
            type="monotone" 
            dataKey="grok" 
            stroke="hsl(var(--grok))" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="Grok"
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PerformanceChart;

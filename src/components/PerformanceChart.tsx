import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { generateChartData } from "@/data/mockData";
import { useTranslation } from "react-i18next";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";

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

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('performanceChart.title')}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t('performanceChart.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-foreground text-background rounded text-sm font-medium">
            {t('performanceChart.all').toUpperCase()}
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
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
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
    </Card>
  );
};

export default PerformanceChart;

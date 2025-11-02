import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { generateChartData } from "@/data/mockData";

const PerformanceChart = () => {
  const data = generateChartData();

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">TOTAL ACCOUNT VALUE</h2>
          <p className="text-muted-foreground text-sm mt-1">AI Model Performance Over Time</p>
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
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
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
            dot={false}
            name="DeepSeek"
          />
          <Line 
            type="monotone" 
            dataKey="gpt5" 
            stroke="hsl(var(--gpt))" 
            strokeWidth={2}
            dot={false}
            name="GPT 5"
          />
          <Line 
            type="monotone" 
            dataKey="claude" 
            stroke="hsl(var(--claude))" 
            strokeWidth={2}
            dot={false}
            name="Claude"
          />
          <Line 
            type="monotone" 
            dataKey="gemini" 
            stroke="hsl(var(--gemini))" 
            strokeWidth={2}
            dot={false}
            name="Gemini"
          />
          <Line 
            type="monotone" 
            dataKey="grok" 
            stroke="hsl(var(--grok))" 
            strokeWidth={2}
            dot={false}
            name="Grok"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default PerformanceChart;

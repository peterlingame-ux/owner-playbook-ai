import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

// 倒计时组件示例
const CountdownTimer = ({ targetDate, targetTime }: { targetDate: string; targetTime: string }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState("");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const calculateCountdown = () => {
      const matchDateTime = new Date(`${targetDate}T${targetTime}`);
      const now = new Date();
      const diff = matchDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(t('in_progress'));
        setIsLive(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}${t('days')} ${hours}${t('hours')}`);
      } else if (hours > 0) {
        setCountdown(`${hours}${t('hours')} ${minutes}${t('minutes')}`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdown(`0:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate, targetTime, t]);

  return (
    <Badge 
      variant={isLive ? "default" : "secondary"}
      className={`text-xs font-bold px-3 py-1.5 flex items-center gap-2 ${
        isLive 
          ? "bg-success/20 text-success border-success/50 animate-pulse" 
          : "bg-primary/20 text-primary border-primary/50"
      }`}
    >
      <Clock className="h-4 w-4" />
      {countdown}
    </Badge>
  );
};

// 演示组件
const CountdownDemo = () => {
  const { t } = useTranslation();
  
  // 示例：不同时间的比赛
  const demoMatches = [
    {
      id: 1,
      title: "1小时后开始",
      date: new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[0],
      time: new Date(Date.now() + 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
    },
    {
      id: 2,
      title: "30分钟后开始",
      date: new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0],
      time: new Date(Date.now() + 30 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
    },
    {
      id: 3,
      title: "5分钟后开始",
      date: new Date(Date.now() + 5 * 60 * 1000).toISOString().split('T')[0],
      time: new Date(Date.now() + 5 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
    },
    {
      id: 4,
      title: "1天后开始",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: new Date(Date.now() + 24 * 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
    },
    {
      id: 5,
      title: "已开始（模拟）",
      date: new Date(Date.now() - 60 * 1000).toISOString().split('T')[0],
      time: new Date(Date.now() - 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
    },
  ];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
          倒计时组件演示
        </h1>
        <p className="text-muted-foreground">
          展示不同时间状态的倒计时效果
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoMatches.map((match) => (
          <Card key={match.id} className="p-6 space-y-4 hover:shadow-lg transition-all duration-300 border-2 border-primary/20 hover:border-primary/40">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{match.title}</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>日期：{match.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>时间：{match.time}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex justify-center">
                <CountdownTimer 
                  targetDate={match.date}
                  targetTime={match.time}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 bg-card border-2 border-primary/20 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">倒计时规则说明</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>• <strong className="text-foreground">超过1天：</strong>显示 "X天 Y小时"</li>
          <li>• <strong className="text-foreground">1小时到24小时：</strong>显示 "X小时 Y分钟"</li>
          <li>• <strong className="text-foreground">1小时内：</strong>显示 "分钟:秒数" 格式（如 05:30）</li>
          <li>• <strong className="text-foreground">已开始：</strong>显示 "进行中" 并带有绿色脉冲动画</li>
        </ul>
      </div>
    </div>
  );
};

export default CountdownDemo;

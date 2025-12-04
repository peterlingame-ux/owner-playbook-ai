import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Trophy, Calendar, Users, TrendingUp, Award, Clock, CheckCircle2, XCircle } from "lucide-react";

const Waitlist = () => {
  const navigate = useNavigate();

  const prizeRules = [
    {
      icon: Calendar,
      title: "发放周期",
      description: "每30天进行一次奖金结算",
      highlight: "30天/轮",
    },
    {
      icon: Trophy,
      title: "奖金池",
      description: "每轮最高奖金池金额",
      highlight: "$1,000,000",
    },
    {
      icon: Users,
      title: "获奖条件",
      description: "玩家胜率必须超过AI模型才能获得奖金",
      highlight: "战胜AI",
    },
    {
      icon: TrendingUp,
      title: "奖金分配",
      description: "根据超越AI的幅度按比例分配奖金",
      highlight: "按比例",
    },
  ];

  const historyExamples = [
    { round: "第1轮", date: "2024年11月", winner: true, topPlayer: "SwiftTiger8821", winRate: "78.5%", aiRate: "72.3%", prize: "$125,000" },
    { round: "第2轮", date: "2024年10月", winner: false, topPlayer: "-", winRate: "68.2%", aiRate: "71.5%", prize: "-" },
    { round: "第3轮", date: "2024年9月", winner: true, topPlayer: "BraveDragon2156", winRate: "81.2%", aiRate: "73.8%", prize: "$200,000" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">奖金活动</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            战胜AI，赢取百万大奖
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            每30天进行一次奖金结算，当有玩家的预测胜率超过AI模型时，将瓜分百万奖金池
          </p>

          {/* Prize Amount */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative inline-block mb-8"
          >
            <motion.div 
              className="absolute inset-0 -inset-x-8 -inset-y-4 bg-gradient-to-r from-yellow-500/20 via-amber-400/30 to-yellow-500/20 blur-2xl rounded-full"
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative flex flex-col items-center gap-1">
              <span className="text-sm text-muted-foreground font-medium tracking-widest uppercase">每轮奖金池</span>
              <span className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
                $1,000,000
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Rules Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {prizeRules.map((rule, index) => (
            <motion.div
              key={rule.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              className="bg-card/50 border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <rule.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{rule.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
              <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                {rule.highlight}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl p-6 mb-12"
        >
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">重要说明</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>若当轮有玩家胜率超过最强AI模型，则发放奖金</span>
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>若当轮无玩家超过AI，则奖金不发放，累积至下一轮</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>多名玩家超过AI时，按超越幅度比例分配奖金</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* History Examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">历史发放记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">轮次</th>
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">时间</th>
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">状态</th>
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">最高玩家</th>
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">玩家胜率</th>
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">AI胜率</th>
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">发放金额</th>
                </tr>
              </thead>
              <tbody>
                {historyExamples.map((item, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4 font-medium text-foreground">{item.round}</td>
                    <td className="py-4 px-4 text-muted-foreground">{item.date}</td>
                    <td className="py-4 px-4">
                      {item.winner ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          已发放
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-sm">
                          <XCircle className="w-3 h-3" />
                          未发放
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-foreground">{item.topPlayer}</td>
                    <td className="py-4 px-4 text-foreground">{item.winRate}</td>
                    <td className="py-4 px-4 text-muted-foreground">{item.aiRate}</td>
                    <td className="py-4 px-4">
                      {item.prize !== "-" ? (
                        <span className="font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                          {item.prize}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold px-10 py-6 text-lg rounded-full shadow-lg shadow-amber-500/25"
          >
            立即参与竞赛
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            免费注册 · 无需充值 · 公平竞技
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Waitlist;

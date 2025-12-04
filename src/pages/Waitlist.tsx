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
    { 
      round: "S1-R6", 
      period: "2024.11.01 - 2024.11.30", 
      status: "distributed",
      participants: 2847,
      totalPredictions: 45821,
      aiModel: "Claude 3.5",
      aiWinRate: 72.3,
      winners: [
        { rank: 1, name: "SwiftTiger8821", winRate: 78.5, predictions: 156, prize: 125000 },
        { rank: 2, name: "LuckyEagle3392", winRate: 75.2, predictions: 142, prize: 85000 },
        { rank: 3, name: "BoldWolf7756", winRate: 73.8, predictions: 168, prize: 45000 },
      ],
      totalDistributed: 255000,
      poolCarryover: 745000,
    },
    { 
      round: "S1-R5", 
      period: "2024.10.01 - 2024.10.31", 
      status: "not_distributed",
      participants: 2156,
      totalPredictions: 38562,
      aiModel: "GPT-4o",
      aiWinRate: 74.8,
      winners: [],
      topPlayerRate: 71.2,
      topPlayerName: "QuickPanther9901",
      totalDistributed: 0,
      poolCarryover: 1000000,
    },
    { 
      round: "S1-R4", 
      period: "2024.09.01 - 2024.09.30", 
      status: "distributed",
      participants: 1892,
      totalPredictions: 32156,
      aiModel: "Claude 3.5",
      aiWinRate: 71.5,
      winners: [
        { rank: 1, name: "BraveDragon2156", winRate: 81.2, predictions: 178, prize: 200000 },
        { rank: 2, name: "WiseFalcon4423", winRate: 76.8, predictions: 145, prize: 120000 },
      ],
      totalDistributed: 320000,
      poolCarryover: 680000,
    },
    { 
      round: "S1-R3", 
      period: "2024.08.01 - 2024.08.31", 
      status: "distributed",
      participants: 1654,
      totalPredictions: 28745,
      aiModel: "Gemini Pro",
      aiWinRate: 69.2,
      winners: [
        { rank: 1, name: "NobleLion5567", winRate: 79.5, predictions: 134, prize: 180000 },
        { rank: 2, name: "EpicBear8834", winRate: 74.1, predictions: 156, prize: 95000 },
        { rank: 3, name: "CleverHawk2290", winRate: 71.8, predictions: 123, prize: 55000 },
        { rank: 4, name: "SwiftPhoenix1123", winRate: 70.5, predictions: 145, prize: 35000 },
      ],
      totalDistributed: 365000,
      poolCarryover: 635000,
    },
    { 
      round: "S1-R2", 
      period: "2024.07.01 - 2024.07.31", 
      status: "not_distributed",
      participants: 1245,
      totalPredictions: 21890,
      aiModel: "GPT-4o",
      aiWinRate: 76.5,
      winners: [],
      topPlayerRate: 73.8,
      topPlayerName: "SmartTiger6678",
      totalDistributed: 0,
      poolCarryover: 1000000,
    },
    { 
      round: "S1-R1", 
      period: "2024.06.01 - 2024.06.30", 
      status: "distributed",
      participants: 987,
      totalPredictions: 15678,
      aiModel: "Claude 3.5",
      aiWinRate: 70.2,
      winners: [
        { rank: 1, name: "QuickEagle3345", winRate: 82.3, predictions: 112, prize: 250000 },
      ],
      totalDistributed: 250000,
      poolCarryover: 750000,
    },
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">历史发放记录</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>已发放</span>
              <span className="w-2 h-2 rounded-full bg-red-500 ml-3" />
              <span>未发放</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {historyExamples.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`bg-card/50 border rounded-xl overflow-hidden ${
                  item.status === 'distributed' ? 'border-green-500/30' : 'border-red-500/30'
                }`}
              >
                {/* Header */}
                <div className={`px-6 py-4 ${
                  item.status === 'distributed' 
                    ? 'bg-gradient-to-r from-green-500/10 to-transparent' 
                    : 'bg-gradient-to-r from-red-500/10 to-transparent'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-foreground">{item.round}</span>
                      <span className="text-sm text-muted-foreground">{item.period}</span>
                      {item.status === 'distributed' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          已发放
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          未发放
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-muted-foreground">参与人数</div>
                        <div className="font-semibold text-foreground">{item.participants.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">总预测数</div>
                        <div className="font-semibold text-foreground">{item.totalPredictions.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">AI模型</div>
                        <div className="font-semibold text-foreground">{item.aiModel}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">AI胜率</div>
                        <div className="font-semibold text-primary">{item.aiWinRate}%</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Winners Table or No Winner Info */}
                <div className="px-6 py-4">
                  {item.status === 'distributed' && item.winners.length > 0 ? (
                    <>
                      <div className="text-sm font-medium text-muted-foreground mb-3">获奖玩家</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50">
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">排名</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">玩家</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">胜率</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">超越AI</th>
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">预测场次</th>
                              <th className="text-right py-2 px-3 text-muted-foreground font-medium">获得奖金</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.winners.map((winner, wIndex) => (
                              <tr key={wIndex} className="border-b border-border/30 last:border-0">
                                <td className="py-3 px-3">
                                  {winner.rank === 1 && <span className="text-yellow-400">🥇</span>}
                                  {winner.rank === 2 && <span className="text-gray-400">🥈</span>}
                                  {winner.rank === 3 && <span className="text-amber-600">🥉</span>}
                                  {winner.rank > 3 && <span className="text-muted-foreground">#{winner.rank}</span>}
                                </td>
                                <td className="py-3 px-3 font-medium text-foreground">{winner.name}</td>
                                <td className="py-3 px-3">
                                  <span className="text-green-400 font-semibold">{winner.winRate}%</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-emerald-400">+{(winner.winRate - item.aiWinRate).toFixed(1)}%</span>
                                </td>
                                <td className="py-3 px-3 text-muted-foreground">{winner.predictions}场</td>
                                <td className="py-3 px-3 text-right">
                                  <span className="font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                                    ${winner.prize.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">本轮共发放</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                          ${item.totalDistributed.toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <XCircle className="w-12 h-12 text-red-500/50 mx-auto mb-3" />
                      <div className="text-muted-foreground mb-2">本轮无玩家超过AI</div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">最高玩家胜率：</span>
                        <span className="text-foreground font-medium">{item.topPlayerName} ({item.topPlayerRate}%)</span>
                        <span className="text-red-400 ml-2">低于AI {(item.aiWinRate - (item.topPlayerRate || 0)).toFixed(1)}%</span>
                      </div>
                      <div className="mt-3 text-amber-400 text-sm">
                        奖金池累积至下一轮 → ${item.poolCarryover.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Summary Stats */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card/50 border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-foreground">6</div>
              <div className="text-sm text-muted-foreground">总轮次</div>
            </div>
            <div className="bg-card/50 border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">4</div>
              <div className="text-sm text-muted-foreground">发放轮次</div>
            </div>
            <div className="bg-card/50 border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">$1.19M</div>
              <div className="text-sm text-muted-foreground">累计发放</div>
            </div>
            <div className="bg-card/50 border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-foreground">10</div>
              <div className="text-sm text-muted-foreground">获奖玩家</div>
            </div>
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

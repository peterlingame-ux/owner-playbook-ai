import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Waitlist = () => {
  const navigate = useNavigate();

  const historyData = [
    { 
      round: "S1-006", 
      startDate: "2024-11-01",
      endDate: "2024-11-30",
      status: "settled",
      aiModel: "Claude 3.5 Sonnet",
      aiWinRate: 72.3,
      participants: 2847,
      winners: [
        { name: "S***r8821", winRate: 78.5, predictions: 156, prize: 125000 },
        { name: "L***e3392", winRate: 75.2, predictions: 142, prize: 85000 },
        { name: "B***f7756", winRate: 73.8, predictions: 168, prize: 45000 },
      ],
      totalPaid: 255000,
    },
    { 
      round: "S1-005", 
      startDate: "2024-10-01",
      endDate: "2024-10-31",
      status: "no_winner",
      aiModel: "GPT-4o",
      aiWinRate: 74.8,
      participants: 2156,
      topPlayer: { name: "Q***r9901", winRate: 71.2, predictions: 134 },
      winners: [],
      totalPaid: 0,
    },
    { 
      round: "S1-004", 
      startDate: "2024-09-01",
      endDate: "2024-09-30",
      status: "settled",
      aiModel: "Claude 3.5 Sonnet",
      aiWinRate: 71.5,
      participants: 1892,
      winners: [
        { name: "B***n2156", winRate: 81.2, predictions: 178, prize: 200000 },
        { name: "W***n4423", winRate: 76.8, predictions: 145, prize: 120000 },
      ],
      totalPaid: 320000,
    },
    { 
      round: "S1-003", 
      startDate: "2024-08-01",
      endDate: "2024-08-31",
      status: "settled",
      aiModel: "Gemini 1.5 Pro",
      aiWinRate: 69.2,
      participants: 1654,
      winners: [
        { name: "N***n5567", winRate: 79.5, predictions: 134, prize: 180000 },
        { name: "E***r8834", winRate: 74.1, predictions: 156, prize: 95000 },
        { name: "C***k2290", winRate: 71.8, predictions: 123, prize: 55000 },
      ],
      totalPaid: 330000,
    },
    { 
      round: "S1-002", 
      startDate: "2024-07-01",
      endDate: "2024-07-31",
      status: "no_winner",
      aiModel: "GPT-4o",
      aiWinRate: 76.5,
      participants: 1245,
      topPlayer: { name: "S***r6678", winRate: 73.8, predictions: 98 },
      winners: [],
      totalPaid: 0,
    },
    { 
      round: "S1-001", 
      startDate: "2024-06-01",
      endDate: "2024-06-30",
      status: "settled",
      aiModel: "Claude 3.5 Sonnet",
      aiWinRate: 70.2,
      participants: 987,
      winners: [
        { name: "Q***e3345", winRate: 82.3, predictions: 112, prize: 250000 },
      ],
      totalPaid: 250000,
    },
  ];

  const totalDistributed = historyData.reduce((sum, item) => sum + item.totalPaid, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
            预测竞赛奖金计划
          </h1>
          <p className="text-sm text-muted-foreground">
            Season 1 · 2024年6月启动
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">结算周期</div>
            <div className="text-lg font-semibold text-foreground">30天/轮</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">单轮奖池</div>
            <div className="text-lg font-semibold text-foreground">$1,000,000</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">已完成轮次</div>
            <div className="text-lg font-semibold text-foreground">{historyData.length}轮</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">累计发放</div>
            <div className="text-lg font-semibold text-foreground">${(totalDistributed / 1000000).toFixed(2)}M</div>
          </div>
        </div>

        {/* Rules */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-8">
          <h2 className="text-sm font-medium text-foreground mb-3">获奖规则</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>1. 每轮竞赛持续30天，期间需完成至少50场比赛预测</li>
            <li>2. 最终胜率需超过当轮AI基准模型才可获得奖金</li>
            <li>3. 奖金按超越AI幅度在所有达标玩家间按比例分配</li>
            <li>4. 若当轮无人超越AI，奖金池滚存至下一轮</li>
          </ul>
        </div>

        {/* History Table */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-foreground mb-4">历史结算记录</h2>
          
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">轮次</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">周期</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">AI基准</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">参与人数</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">状态</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">发放金额</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((item, index) => (
                    <tr key={item.round} className="border-b border-border/50 last:border-0">
                      <td className="py-3 px-4 font-mono text-foreground">{item.round}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {item.startDate} ~ {item.endDate.slice(5)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.aiModel} ({item.aiWinRate}%)
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{item.participants.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {item.status === 'settled' ? (
                          <span className="text-green-600 dark:text-green-500">已结算</span>
                        ) : (
                          <span className="text-muted-foreground">无达标</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {item.totalPaid > 0 ? (
                          <span className="text-foreground">${item.totalPaid.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Winner Details */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-foreground mb-4">获奖明细</h2>
          
          <div className="space-y-3">
            {historyData.filter(item => item.winners.length > 0).map((item) => (
              <motion.div
                key={item.round}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-border rounded-lg overflow-hidden"
              >
                <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{item.round}</span>
                  <span className="text-xs text-muted-foreground">{item.startDate} ~ {item.endDate}</span>
                </div>
                <div className="p-4">
                  <div className="text-xs text-muted-foreground mb-3">
                    AI基准: {item.aiModel} · 胜率 {item.aiWinRate}%
                  </div>
                  <div className="space-y-2">
                    {item.winners.map((winner, wIndex) => (
                      <div 
                        key={wIndex}
                        className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground w-4">{wIndex + 1}</span>
                          <span className="font-mono text-foreground">{winner.name}</span>
                          <span className="text-muted-foreground">
                            胜率 {winner.winRate}% · {winner.predictions}场
                          </span>
                        </div>
                        <span className="font-mono font-medium text-foreground">
                          ${winner.prize.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-muted/20 border border-border rounded-lg p-4 mb-8 text-xs text-muted-foreground">
          <p className="font-medium mb-2">声明</p>
          <p className="leading-relaxed">
            本平台为足球比赛预测准确性竞赛平台，所有奖金来源于平台运营方预算，非任何形式的博彩或赌博活动。
            参与者使用虚拟货币进行预测，最终奖金根据预测准确率与AI模型对比结果发放。
            获奖者信息展示时进行脱敏处理以保护隐私。如有疑问请联系客服。
          </p>
        </div>

        {/* CTA */}
        <div className="text-center pb-8">
          <Button 
            onClick={() => navigate('/auth')}
            className="px-8"
          >
            参与竞赛
          </Button>
          <p className="text-xs text-muted-foreground mt-2">免费注册 · 无需充值</p>
        </div>
      </main>
    </div>
  );
};

export default Waitlist;

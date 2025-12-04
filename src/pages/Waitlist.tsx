import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Waitlist = () => {
  const navigate = useNavigate();

  const historyData = [
    { 
      round: "第6轮", 
      period: "2024年11月", 
      hasWinner: true,
      aiWinRate: 72.3,
      winners: [
        { name: "SwiftTiger8821", winRate: 78.5, prize: 125000 },
        { name: "LuckyEagle3392", winRate: 75.2, prize: 85000 },
        { name: "BoldWolf7756", winRate: 73.8, prize: 45000 },
      ],
    },
    { 
      round: "第5轮", 
      period: "2024年10月", 
      hasWinner: false,
      aiWinRate: 74.8,
      topPlayer: { name: "QuickPanther9901", winRate: 71.2 },
      winners: [],
    },
    { 
      round: "第4轮", 
      period: "2024年9月", 
      hasWinner: true,
      aiWinRate: 71.5,
      winners: [
        { name: "BraveDragon2156", winRate: 81.2, prize: 200000 },
        { name: "WiseFalcon4423", winRate: 76.8, prize: 120000 },
      ],
    },
    { 
      round: "第3轮", 
      period: "2024年8月", 
      hasWinner: true,
      aiWinRate: 69.2,
      winners: [
        { name: "NobleLion5567", winRate: 79.5, prize: 180000 },
        { name: "EpicBear8834", winRate: 74.1, prize: 95000 },
        { name: "CleverHawk2290", winRate: 71.8, prize: 55000 },
      ],
    },
    { 
      round: "第2轮", 
      period: "2024年7月", 
      hasWinner: false,
      aiWinRate: 76.5,
      topPlayer: { name: "SmartTiger6678", winRate: 73.8 },
      winners: [],
    },
    { 
      round: "第1轮", 
      period: "2024年6月", 
      hasWinner: true,
      aiWinRate: 70.2,
      winners: [
        { name: "QuickEagle3345", winRate: 82.3, prize: 250000 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            奖金发放记录
          </h1>
          <p className="text-muted-foreground mb-6">
            每 <span className="text-primary font-semibold">30天</span> 发放一次 · 胜率超过AI即可获奖
          </p>
          
          {/* Prize Pool */}
          <div className="text-sm text-muted-foreground mb-1">每轮奖金池</div>
          <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
            $1,000,000
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {historyData.map((item, index) => (
            <motion.div
              key={item.round}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`rounded-xl border overflow-hidden ${
                item.hasWinner 
                  ? 'bg-green-500/5 border-green-500/30' 
                  : 'bg-card/50 border-border'
              }`}
            >
              {/* Round Header */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{item.round}</span>
                  <span className="text-sm text-muted-foreground">{item.period}</span>
                </div>
                
                {item.hasWinner ? (
                  <span className="text-green-500 font-medium text-sm">已发放</span>
                ) : (
                  <span className="text-muted-foreground text-sm">无人中奖</span>
                )}
              </div>

              {/* Winners or No Winner */}
              <div className="px-5 py-3">
                {item.hasWinner && item.winners.length > 0 ? (
                  <div className="space-y-2">
                    {item.winners.map((winner, wIndex) => (
                      <div 
                        key={wIndex}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm w-5">{wIndex + 1}.</span>
                          <span className="text-foreground">{winner.name}</span>
                          <span className="text-xs text-green-500">({winner.winRate}%)</span>
                        </div>
                        <span className="font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                          ${winner.prize.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    最高: {item.topPlayer?.name} ({item.topPlayer?.winRate}%) · AI胜率 {item.aiWinRate}%
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold px-8 rounded-full"
          >
            立即参与竞赛
          </Button>
          <p className="text-xs text-muted-foreground mt-3">免费参与 · 无需充值</p>
        </div>
      </main>
    </div>
  );
};

export default Waitlist;

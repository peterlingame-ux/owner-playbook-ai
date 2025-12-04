import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { differenceInDays, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, TrendingUp, DollarSign } from "lucide-react";

import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import openaiIcon from "@/assets/openai-icon.png";

const aiIcons: Record<string, string> = {
  "Claude 3.5 Sonnet": claudeIcon,
  "GPT-4o": openaiIcon,
  "Gemini 1.5 Pro": geminiIcon,
};

const Waitlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<{
    totalPredictions: number;
    wins: number;
    winRate: number;
    potentialPrize: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Current round info
  const currentRound = {
    round: "S1-007",
    startDate: new Date("2024-12-01"),
    endDate: new Date("2024-12-30"),
    aiModel: "GPT-4o",
    participants: 1523,
    topPlayer: { name: "E***k4412", winRate: 71.8 },
    aiWinRate: 73.2,
  };
  
  const today = new Date();
  const totalDays = differenceInDays(currentRound.endDate, currentRound.startDate);
  const daysElapsed = differenceInDays(today, currentRound.startDate);
  const daysRemaining = Math.max(0, differenceInDays(currentRound.endDate, today));
  const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  // Fetch user predictions stats
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: predictions } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id);
        
        if (predictions) {
          const total = predictions.length;
          const wins = predictions.filter(p => p.result === 'win').length;
          const winRate = total > 0 ? (wins / total) * 100 : 0;
          
          // Calculate potential prize based on win rate exceeding AI
          let potentialPrize = 0;
          if (winRate > currentRound.aiWinRate && total >= 50) {
            const excessRate = winRate - currentRound.aiWinRate;
            potentialPrize = Math.floor(excessRate * 10000); // Simplified calculation
          }
          
          setUserStats({
            totalPredictions: total,
            wins,
            winRate,
            potentialPrize,
          });
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);

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
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
            预测竞赛奖金计划
          </h1>
          <p className="text-sm text-muted-foreground">
            Season 1 · 2024年6月启动
          </p>
        </div>

        {/* Current Round Progress */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">进行中</span>
              <span className="font-semibold text-foreground">{currentRound.round}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {format(currentRound.startDate, "yyyy-MM-dd")} ~ {format(currentRound.endDate, "yyyy-MM-dd")}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>已进行 {daysElapsed} 天</span>
              <span>剩余 {daysRemaining} 天</span>
            </div>
          </div>
          
          {/* Current Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">AI基准</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <img src={aiIcons[currentRound.aiModel]} alt="" className="w-4 h-4 rounded" />
                <span className="text-foreground">{currentRound.aiWinRate}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">当前参与</div>
              <div className="text-foreground mt-0.5">{currentRound.participants.toLocaleString()} 人</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">领先玩家</div>
              <div className="text-foreground mt-0.5">{currentRound.topPlayer.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">最高胜率</div>
              <div className={`mt-0.5 ${currentRound.topPlayer.winRate > currentRound.aiWinRate ? 'text-green-500' : 'text-foreground'}`}>
                {currentRound.topPlayer.winRate}%
                {currentRound.topPlayer.winRate > currentRound.aiWinRate && (
                  <span className="text-xs ml-1">超越AI</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* My Stats Card */}
        {user ? (
          <div className="bg-card border border-border rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">我的竞赛进度</h3>
            </div>
            
            {loading ? (
              <div className="text-sm text-muted-foreground">加载中...</div>
            ) : userStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">预测场次</div>
                    <div className="text-lg font-semibold text-foreground">
                      {userStats.totalPredictions}
                      <span className="text-xs text-muted-foreground font-normal ml-1">/ 50场</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">我的胜率</div>
                    <div className={`text-lg font-semibold ${userStats.winRate > currentRound.aiWinRate ? 'text-green-500' : 'text-foreground'}`}>
                      {userStats.winRate.toFixed(1)}%
                      {userStats.winRate > currentRound.aiWinRate && (
                        <span className="text-xs ml-1">超越AI</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">胜场数</div>
                    <div className="text-lg font-semibold text-foreground">
                      {userStats.wins}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">预计奖金</div>
                    <div className="text-lg font-semibold text-emerald-500">
                      {userStats.potentialPrize > 0 ? `$${userStats.potentialPrize.toLocaleString()}` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">暂无预测记录</div>
            )}
            
            {userStats && userStats.totalPredictions < 50 && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">完成进度</span>
                  <span className="text-foreground">{userStats.totalPredictions}/50 场</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                  <motion.div 
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (userStats.totalPredictions / 50) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  还需完成 {Math.max(0, 50 - userStats.totalPredictions)} 场预测才能参与奖金分配
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted/30 border border-border rounded-lg p-4 mb-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">登录后查看您的竞赛进度和预计奖金</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              登录 / 注册
            </Button>
          </div>
        )}

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
                  {historyData.map((item) => (
                    <tr key={item.round} className="border-b border-border/50 last:border-0">
                      <td className="py-3 px-4 font-mono text-foreground">{item.round}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {item.startDate} ~ {item.endDate.slice(5)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img 
                            src={aiIcons[item.aiModel]} 
                            alt={item.aiModel} 
                            className="w-5 h-5 rounded"
                          />
                          <span className="text-muted-foreground">
                            {item.aiModel} ({item.aiWinRate}%)
                          </span>
                        </div>
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
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                    <span>AI基准:</span>
                    <img 
                      src={aiIcons[item.aiModel]} 
                      alt={item.aiModel} 
                      className="w-4 h-4 rounded"
                    />
                    <span>{item.aiModel} · 胜率 {item.aiWinRate}%</span>
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

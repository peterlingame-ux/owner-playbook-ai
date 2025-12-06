import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, TrendingUp, ChevronRight, CheckCircle2, Users, Calendar, Quote, Award } from "lucide-react";

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
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentAI = {
    model: "GPT-4o",
    winRate: 73.2,
  };

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
          
          setUserStats({
            totalPredictions: total,
            wins,
            winRate,
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
    { round: "S1-006", aiModel: "Claude 3.5 Sonnet", aiWinRate: 72.3, winners: 3, totalPaid: 255000 },
    { round: "S1-005", aiModel: "GPT-4o", aiWinRate: 74.8, winners: 0, totalPaid: 0 },
    { round: "S1-004", aiModel: "Claude 3.5 Sonnet", aiWinRate: 71.5, winners: 2, totalPaid: 320000 },
    { round: "S1-003", aiModel: "Gemini 1.5 Pro", aiWinRate: 69.2, winners: 3, totalPaid: 330000 },
    { round: "S1-002", aiModel: "GPT-4o", aiWinRate: 76.5, winners: 0, totalPaid: 0 },
    { round: "S1-001", aiModel: "Claude 3.5 Sonnet", aiWinRate: 70.2, winners: 1, totalPaid: 250000 },
  ];

  // Featured winners for credibility
  const featuredWinners = [
    {
      name: "S***r8821",
      avatar: "/avatars/avatar-3.png",
      round: "S1-006",
      winRate: 78.5,
      aiWinRate: 72.3,
      aiModel: "Claude 3.5 Sonnet",
      predictions: 156,
      prize: 125000,
      quote: "坚持数据分析，不跟风盲猜",
    },
    {
      name: "B***n2156",
      avatar: "/avatars/avatar-7.png",
      round: "S1-004",
      winRate: 81.2,
      aiWinRate: 71.5,
      aiModel: "Claude 3.5 Sonnet",
      predictions: 178,
      prize: 200000,
      quote: "专注五大联赛，深耕自己熟悉的领域",
    },
    {
      name: "Q***e3345",
      avatar: "/avatars/avatar-5.png",
      round: "S1-001",
      winRate: 82.3,
      aiWinRate: 70.2,
      aiModel: "Claude 3.5 Sonnet",
      predictions: 112,
      prize: 250000,
      quote: "每场比赛都认真研究，质量比数量更重要",
    },
  ];

  const totalDistributed = historyData.reduce((sum, item) => sum + item.totalPaid, 0);
  const totalWinners = historyData.reduce((sum, item) => sum + item.winners, 0);

  const isEligible = userStats && userStats.totalPredictions >= 50;
  const beatsAI = userStats && userStats.winRate > currentAI.winRate;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            战胜AI，赢取奖金
          </h1>
          <p className="text-muted-foreground">
            每轮奖池 <span className="text-foreground font-semibold">$1,000,000</span>
          </p>
        </motion.div>

        {/* How to Win - 3 Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">如何获奖？</h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">完成50场预测</h3>
                <p className="text-sm text-muted-foreground">
                  在30天内完成至少50场足球比赛预测
                </p>
                {userStats && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, (userStats.totalPredictions / 50) * 100)}%` }}
                        />
                      </div>
                      <span className={`font-medium ${isEligible ? 'text-success' : 'text-foreground'}`}>
                        {userStats.totalPredictions}/50
                      </span>
                      {isEligible && <CheckCircle2 className="w-4 h-4 text-success" />}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">胜率超过AI</h3>
                <p className="text-sm text-muted-foreground">
                  当前AI胜率：
                  <span className="inline-flex items-center gap-1 ml-1">
                    <img src={aiIcons[currentAI.model]} alt="" className="w-4 h-4 rounded" />
                    <span className="font-medium text-foreground">{currentAI.winRate}%</span>
                  </span>
                </p>
                {userStats && userStats.totalPredictions > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">你的胜率:</span>
                    <span className={`font-semibold ${beatsAI ? 'text-success' : 'text-foreground'}`}>
                      {userStats.winRate.toFixed(1)}%
                    </span>
                    {beatsAI && <CheckCircle2 className="w-4 h-4 text-success" />}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">瓜分奖池</h3>
                <p className="text-sm text-muted-foreground">
                  每轮结束后，所有达标玩家按超越AI的幅度分配奖金
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10"
        >
          {user ? (
            <Button size="lg" onClick={() => navigate('/')} className="px-8">
              开始预测
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="lg" onClick={() => navigate('/auth')} className="px-8">
              免费注册
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-2">无需充值 · 免费参与</p>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <Calendar className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <div className="text-xl font-bold text-foreground">{historyData.length}</div>
            <div className="text-xs text-muted-foreground">已完成轮次</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <div className="text-xl font-bold text-foreground">{totalWinners}</div>
            <div className="text-xs text-muted-foreground">获奖人数</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <Trophy className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <div className="text-xl font-bold text-foreground">${(totalDistributed / 1000000).toFixed(2)}M</div>
            <div className="text-xs text-muted-foreground">累计发放</div>
          </div>
        </motion.div>

        {/* Featured Winners */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-medium text-foreground">获奖玩家案例</h2>
          </div>
          
          <div className="space-y-4">
            {featuredWinners.map((winner, index) => (
              <motion.div
                key={winner.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img 
                      src={winner.avatar} 
                      alt="" 
                      className="w-12 h-12 rounded-full border-2 border-amber-500/30"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono font-medium text-foreground">{winner.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{winner.round}</span>
                      </div>
                      <span className="text-lg font-bold text-success">${winner.prize.toLocaleString()}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">胜率 </span>
                        <span className="font-semibold text-success">{winner.winRate}%</span>
                      </div>
                      <div className="text-muted-foreground">vs</div>
                      <div className="flex items-center gap-1">
                        <img src={aiIcons[winner.aiModel]} alt="" className="w-3.5 h-3.5 rounded" />
                        <span className="text-muted-foreground">{winner.aiWinRate}%</span>
                      </div>
                      <div className="text-muted-foreground">·</div>
                      <div className="text-muted-foreground">{winner.predictions}场预测</div>
                    </div>

                    {/* Quote */}
                    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                      <Quote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/50" />
                      <span className="italic">{winner.quote}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* History Table - Simplified */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <h2 className="text-sm font-medium text-foreground mb-4">历史记录</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">轮次</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">AI胜率</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">获奖人数</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">发放金额</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((item) => (
                  <tr key={item.round} className="border-b border-border/50 last:border-0">
                    <td className="py-3 px-4 font-mono text-foreground">{item.round}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <img src={aiIcons[item.aiModel]} alt="" className="w-4 h-4 rounded" />
                        <span className="text-muted-foreground">{item.aiWinRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.winners > 0 ? (
                        <span className="text-success">{item.winners}人</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
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
        </motion.div>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground text-center pb-8">
          <p>
            本平台为足球预测准确性竞赛，非博彩活动。
            <br />
            参与免费，奖金来源于平台运营预算。
          </p>
        </div>
      </main>
    </div>
  );
};

export default Waitlist;

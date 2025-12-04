import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Trophy, Calendar, Users, TrendingUp, Award, Clock, CheckCircle2, XCircle, ChevronRight, Zap, Target, DollarSign } from "lucide-react";
import { useState } from "react";

const Waitlist = () => {
  const navigate = useNavigate();
  const [expandedRound, setExpandedRound] = useState<string | null>("S1-R6");

  const historyData = [
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
      ],
      totalDistributed: 330000,
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
    },
  ];

  const stats = {
    totalRounds: 6,
    distributedRounds: 4,
    totalDistributed: 1155000,
    totalWinners: 10,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-10">
        {/* Hero Section */}
        <section className="relative mb-16">
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]"
              animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div 
              className="absolute bottom-0 right-1/4 w-80 h-80 bg-yellow-500/10 rounded-full blur-[100px]"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 6, repeat: Infinity, delay: 2 }}
            />
          </div>

          <div className="relative text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                PRIZE POOL
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight"
            >
              战胜AI，赢取
              <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent"> 百万奖金</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-muted-foreground text-base sm:text-lg mb-10 max-w-2xl mx-auto"
            >
              每30天进行一次结算，当玩家预测胜率超越AI模型时，即可瓜分奖金池
            </motion.p>

            {/* Prize Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative inline-block"
            >
              <motion.div 
                className="absolute -inset-8 bg-gradient-to-r from-yellow-500/20 via-amber-400/30 to-yellow-500/20 blur-3xl rounded-full"
                animate={{ opacity: [0.5, 0.8, 0.5], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <div className="relative bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm border border-amber-500/20 rounded-2xl px-12 py-8">
                <div className="text-xs text-amber-400/80 uppercase tracking-widest mb-2 font-medium">每轮奖金池</div>
                <div className="text-5xl sm:text-6xl lg:text-7xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-tight">
                  $1,000,000
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    30天/轮
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-400" />
                    战胜AI即可获奖
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Rules Section */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-card/50 border border-border rounded-2xl p-6 hover:border-amber-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">获奖条件</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                玩家当轮预测胜率必须<span className="text-amber-400 font-medium">超过AI模型</span>才能获得奖金，超越幅度越大，获得奖金越多
              </p>
            </div>

            <div className="bg-card/50 border border-border rounded-2xl p-6 hover:border-amber-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <Users className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">奖金分配</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                多名玩家超越AI时，按<span className="text-amber-400 font-medium">超越幅度比例</span>分配奖金池，单人最高可获得全部奖金
              </p>
            </div>

            <div className="bg-card/50 border border-border rounded-2xl p-6 hover:border-amber-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">奖金累积</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                若当轮无人超越AI，奖金池<span className="text-amber-400 font-medium">不发放并累积</span>至下一轮，直到有玩家获胜
              </p>
            </div>
          </motion.div>
        </section>

        {/* Statistics */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-r from-amber-500/5 via-yellow-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-foreground">累计数据</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">{stats.totalRounds}</div>
                <div className="text-sm text-muted-foreground mt-1">总轮次</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-green-400">{stats.distributedRounds}</div>
                <div className="text-sm text-muted-foreground mt-1">发放轮次</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  ${(stats.totalDistributed / 1000000).toFixed(2)}M
                </div>
                <div className="text-sm text-muted-foreground mt-1">累计发放</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">{stats.totalWinners}</div>
                <div className="text-sm text-muted-foreground mt-1">获奖玩家</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* History Records */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">发放历史</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  已发放
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  未发放
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {historyData.map((item, index) => {
                const isExpanded = expandedRound === item.round;
                const isDistributed = item.status === 'distributed';
                
                return (
                  <motion.div
                    key={item.round}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`bg-card/50 border rounded-xl overflow-hidden transition-all ${
                      isDistributed ? 'border-green-500/20 hover:border-green-500/40' : 'border-border hover:border-border'
                    }`}
                  >
                    {/* Header Row */}
                    <button
                      onClick={() => setExpandedRound(isExpanded ? null : item.round)}
                      className="w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isDistributed ? 'bg-green-500/10' : 'bg-zinc-500/10'
                        }`}>
                          {isDistributed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.round}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">{item.period}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 sm:hidden">{item.period}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-8">
                        <div className="hidden sm:flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="text-muted-foreground text-xs">参与</div>
                            <div className="font-medium text-foreground">{item.participants.toLocaleString()}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground text-xs">AI胜率</div>
                            <div className="font-medium text-primary">{item.aiWinRate}%</div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {isDistributed ? (
                            <div className="font-bold text-lg bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                              ${(item.totalDistributed / 1000).toFixed(0)}K
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">未发放</div>
                          )}
                        </div>

                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/50"
                      >
                        <div className="px-4 sm:px-6 py-5">
                          {/* Info Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-border/50">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">参与人数</div>
                              <div className="font-semibold text-foreground">{item.participants.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">总预测数</div>
                              <div className="font-semibold text-foreground">{item.totalPredictions.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">AI模型</div>
                              <div className="font-semibold text-foreground">{item.aiModel}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">AI胜率</div>
                              <div className="font-semibold text-primary">{item.aiWinRate}%</div>
                            </div>
                          </div>

                          {/* Winners or No Winner */}
                          {isDistributed && item.winners.length > 0 ? (
                            <div>
                              <div className="text-sm font-medium text-foreground mb-3">获奖玩家</div>
                              <div className="space-y-2">
                                {item.winners.map((winner, wIndex) => (
                                  <div 
                                    key={wIndex}
                                    className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-sm font-bold text-black">
                                        {winner.rank}
                                      </div>
                                      <div>
                                        <div className="font-medium text-foreground">{winner.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {winner.predictions}场预测 · 胜率 <span className="text-green-400">{winner.winRate}%</span>
                                          <span className="text-emerald-400 ml-1">(+{(winner.winRate - item.aiWinRate).toFixed(1)}%)</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent text-lg">
                                      ${winner.prize.toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <div className="w-16 h-16 rounded-full bg-zinc-500/10 flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8 text-zinc-500" />
                              </div>
                              <div className="text-muted-foreground mb-2">本轮无玩家超越AI</div>
                              <div className="text-sm">
                                最高玩家: <span className="text-foreground font-medium">{item.topPlayerName}</span>
                                <span className="text-muted-foreground"> ({item.topPlayerRate}%)</span>
                                <span className="text-red-400 ml-2">差距 {(item.aiWinRate - (item.topPlayerRate || 0)).toFixed(1)}%</span>
                              </div>
                              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm">
                                <DollarSign className="w-4 h-4" />
                                奖金累积至下一轮
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="text-center pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border border-amber-500/20 rounded-2xl p-8 sm:p-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">准备好挑战AI了吗？</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              免费注册，无需充值，立即开始与顶级AI模型同台竞技
            </p>
            <Button 
              onClick={() => navigate('/auth')}
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold px-10 py-6 text-base rounded-full shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
            >
              立即参与竞赛
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default Waitlist;

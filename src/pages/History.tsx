import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Disclaimer from "@/components/Disclaimer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, CheckCircle2, XCircle, Filter } from "lucide-react";
import { predictionHistory, pastMatches, aiModels } from "@/data/mockData";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatedWinRate } from "@/components/AnimatedWinRate";
import CryptoTicker from "@/components/CryptoTicker";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import expertMystery from "@/assets/expert-mystery.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

const History = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  // 过滤历史数据
  let filteredHistory = [...predictionHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (filterModel !== "all") {
    filteredHistory = filteredHistory.filter(p => p.aiModel === filterModel);
  }

  if (filterResult !== "all") {
    filteredHistory = filteredHistory.filter(p => 
      filterResult === "correct" ? p.correct : !p.correct
    );
  }

  if (filterPeriod !== "all") {
    const now = new Date();
    const daysAgo = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
    const periodDate = new Date(now.setDate(now.getDate() - daysAgo));
    filteredHistory = filteredHistory.filter(p => 
      new Date(p.date) >= periodDate
    );
  }

  // 计算统计数据
  const totalPredictions = filteredHistory.length;
  const correctPredictions = filteredHistory.filter(p => p.correct).length;
  const winRate = totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(1) : "0.0";
  
  const calculateProfit = (prediction: any) => {
    if (prediction.correct) {
      return prediction.betAmount * (prediction.odds - 1);
    }
    return -prediction.betAmount;
  };

  const INITIAL_BALANCE = 10000;
  const totalProfit = filteredHistory.reduce((sum, p) => sum + calculateProfit(p), 0);
  const currentBalance = INITIAL_BALANCE + totalProfit;
  const roi = totalPredictions > 0 ? ((totalProfit / INITIAL_BALANCE) * 100).toFixed(1) : "0.0";

  // 获取选中的模型信息
  const selectedModel = filterModel !== "all" ? aiModels.find(m => m.id === filterModel) : null;

  const getModelBackground = (modelId: string) => {
    switch(modelId) {
      case "deepseek": return starRonaldo;
      case "gpt5": return starNeymar;
      case "claude": return starMessi;
      case "gemini": return starHaaland;
      case "grok": return starMbappe;
      case "mystery": return expertMystery;
      case "hunsoccermax": return starHunsoccer;
      default: return starRonaldo;
    }
  };

  const getBetTypeLabel = (betType: string, prediction: any) => {
    switch(betType) {
      case "moneyline": return t('bet_type_moneyline');
      case "handicap": 
        return `${t('bet_type_handicap')} ${prediction.handicapLine > 0 ? '+' : ''}${prediction.handicapLine}`;
      case "over_under": 
        const overUnder = prediction.overUnderPick === 'over' ? t('over') || '大' : t('under') || '小';
        return `${t('bet_type_over_under')} ${prediction.overUnderLine} ${overUnder}`;
      default: return betType;
    }
  };

  const getPredictionLabel = (prediction: string, match: any) => {
    switch(prediction) {
      case "HOME_WIN": return match.homeTeam;
      case "AWAY_WIN": return match.awayTeam;
      case "DRAW": return t('draw') || '平局';
      default: return prediction;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 safe-area-padding">
        {/* 赞助商滚动展示 */}
        <div className="mb-4 sm:mb-6">
          <CryptoTicker />
        </div>

        {/* 模型详情头部 - 当筛选特定模型时显示 */}
        {selectedModel && (
          <div 
            className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6"
            style={{
              backgroundImage: `url(${getModelBackground(selectedModel.id)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" />
            <div className="relative flex items-center gap-3 sm:gap-6 p-4 sm:p-8">
              <div 
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2 sm:p-3 bg-background/80 backdrop-blur-sm border-2 flex-shrink-0"
                style={{ borderColor: `hsl(var(--${selectedModel.color}))` }}
              >
                <img 
                  src={`/src/assets/${selectedModel.id}-icon.png`}
                  alt={selectedModel.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 
                  className="text-xl sm:text-4xl font-bold mb-0.5 sm:mb-1 truncate"
                  style={{ color: `hsl(var(--${selectedModel.color}))` }}
                >
                  {selectedModel.displayName}
                </h2>
                <p className="text-muted-foreground text-xs sm:text-lg">
                  {totalPredictions} {t('predictions')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 统计卡片 - 仅在选择特定模型时显示 */}
        {selectedModel && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('total_predictions')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--primary))' }}>
                {totalPredictions}
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('win_rate')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--success))' }}>
                <AnimatedWinRate 
                  value={parseFloat(winRate)}
                  className="text-lg sm:text-2xl lg:text-3xl font-bold"
                  style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : undefined}
                />
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('correct')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--success))' }}>
                {correctPredictions}
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">ROI</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: totalProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                {Number(roi) >= 0 ? '+' : ''}{roi}%
              </p>
            </Card>
            
            <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm col-span-2 sm:col-span-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{t('current_balance')}</p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" style={selectedModel ? { color: `hsl(var(--${selectedModel.color}))` } : { color: 'hsl(var(--primary))' }}>
                ${currentBalance.toFixed(0)}
              </p>
            </Card>
          </div>
        )}

        {/* 筛选器 */}
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">{t('filters')}:</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('model')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_models')}</SelectItem>
                  {aiModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>{model.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('result')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_results')}</SelectItem>
                  <SelectItem value="correct">{t('correct')}</SelectItem>
                  <SelectItem value="wrong">{t('wrong')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('period')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_time')}</SelectItem>
                  <SelectItem value="7d">{t('last_7_days')}</SelectItem>
                  <SelectItem value="30d">{t('last_30_days')}</SelectItem>
                  <SelectItem value="90d">{t('last_90_days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border/50 flex items-center justify-between">
              <span>{t('records')}:</span>
              <span className="font-bold">{filteredHistory.length}</span>
            </div>
          </div>
        </Card>

        {/* 历史记录表格 */}
        <Card className="overflow-hidden">
          {/* 滚动提示 - 仅移动端显示 */}
          <div className="sm:hidden bg-muted/30 px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('swipe_to_view_more')}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse delay-150" />
            </div>
          </div>
          
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] sm:w-[100px] text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('date')}</TableHead>
                  <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('match')}</TableHead>
                  <TableHead className="text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('model')}</TableHead>
                  <TableHead className="hidden md:table-cell text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('ai_prediction')}</TableHead>
                  <TableHead className="hidden sm:table-cell text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('bet_type')}</TableHead>
                  <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('odds')}</TableHead>
                  <TableHead className="text-right text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('profit')}</TableHead>
                  <TableHead className="text-center text-[11px] sm:text-xs px-2 sm:px-4 bg-muted/50 font-bold">{t('result')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 sm:py-12 text-sm sm:text-base text-muted-foreground">
                      {t('no_history_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((prediction) => {
                    const match = pastMatches.find(m => m.id === prediction.matchId);
                    const model = aiModels.find(m => m.id === prediction.aiModel);
                    if (!match || !model) return null;
                    
                    const profit = calculateProfit(prediction);
                    
                    return (
                      <TableRow 
                        key={prediction.id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <TableCell className="font-medium text-[11px] sm:text-sm px-2 sm:px-4 py-3 sm:py-4">
                          <div className="truncate min-w-[70px]">
                            {prediction.date}
                          </div>
                        </TableCell>
                        
                        <TableCell className="px-2 sm:px-4 py-3 sm:py-4">
                          <div className="flex items-center gap-2 min-w-[180px]">
                            {match.homeLogo && (
                              <img 
                                src={match.homeLogo} 
                                alt={match.homeTeam}
                                className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs sm:text-sm font-medium truncate">
                                {match.homeTeam} vs {match.awayTeam}
                              </div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                                {match.homeScore} - {match.awayScore}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="px-2 sm:px-4 py-3 sm:py-4">
                          <div className="flex items-center justify-center">
                            <div 
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-1.5 sm:p-2 bg-background/80 backdrop-blur-sm border-2"
                              style={{ borderColor: `hsl(var(--${model.color}))` }}
                            >
                              <img 
                                src={`/src/assets/${model.id}-icon.png`}
                                alt={model.displayName}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm font-medium px-2 sm:px-4 py-3 sm:py-4">
                          <div className="truncate max-w-[120px]">
                            {getPredictionLabel(prediction.prediction, match)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm px-2 sm:px-4 py-3 sm:py-4">
                          <div className="truncate max-w-[140px]">
                            {getBetTypeLabel(prediction.betType, prediction)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right font-mono text-xs sm:text-sm font-bold px-2 sm:px-4 py-3 sm:py-4">
                          {prediction.odds.toFixed(2)}
                        </TableCell>
                        
                        <TableCell className={`text-right font-mono text-xs sm:text-sm font-bold px-2 sm:px-4 py-3 sm:py-4 ${
                          profit >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </TableCell>
                        
                        <TableCell className="text-center px-2 sm:px-4 py-3 sm:py-4">
                          {prediction.correct ? (
                            <Badge className="gap-1 sm:gap-1.5 bg-success/20 text-success border-success/30 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden xs:inline">{t('correct')}</span>
                              <span className="xs:hidden">✓</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5">
                              <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden xs:inline">{t('wrong')}</span>
                              <span className="xs:hidden">✗</span>
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </div>
  );
};

export default History;

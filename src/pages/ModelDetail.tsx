import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, XCircle, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiModels, predictionHistory, pastMatches } from "@/data/mockData";
import Header from "@/components/Header";
import { AnimatedWinRate } from "@/components/AnimatedWinRate";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import expertMystery from "@/assets/expert-mystery.jpg";
import starHunsoccer from "@/assets/star-hunsoccer.jpg";

const ModelDetail = () => {
  const { t } = useTranslation();
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterBetType, setFilterBetType] = useState<string>("all");
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  
  const model = aiModels.find(m => m.id === modelId);
  
  if (!model) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">{t('model_not_found')}</p>
          <Button onClick={() => navigate("/")}>
            {t('go_back')}
          </Button>
        </div>
      </div>
    );
  }

  // 获取并过滤预测历史
  let modelPredictions = predictionHistory
    .filter(p => p.aiModel === modelId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 应用筛选
  if (filterResult !== "all") {
    modelPredictions = modelPredictions.filter(p => 
      filterResult === "correct" ? p.correct : !p.correct
    );
  }
  
  if (filterBetType !== "all") {
    modelPredictions = modelPredictions.filter(p => p.betType === filterBetType);
  }

  // 计算盈利
  const calculateProfit = (prediction: any) => {
    if (prediction.correct) {
      return prediction.betAmount * (prediction.odds - 1);
    }
    return -prediction.betAmount;
  };

  const INITIAL_BALANCE = 10000;
  const totalProfit = modelPredictions.reduce((sum, p) => sum + calculateProfit(p), 0);
  const currentBalance = INITIAL_BALANCE + totalProfit;
  const roi = ((totalProfit / INITIAL_BALANCE) * 100).toFixed(1);

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

  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      <Header />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 safe-area-padding">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-4 sm:mb-6 text-xs sm:text-sm h-8 sm:h-10"
        >
          <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          {t('back_to_models')}
        </Button>

        {/* 模型信息头部 - 带背景 */}
        <div 
          className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-8"
          style={{
            backgroundImage: `url(${getModelBackground(modelId!)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" />
          <div className="relative flex items-center gap-3 sm:gap-6 p-4 sm:p-8">
            <div 
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center p-2 sm:p-3 bg-background/80 backdrop-blur-sm border-2 flex-shrink-0"
              style={{ borderColor: `hsl(var(--${model.color}))` }}
            >
              <img 
                src={`/src/assets/${model.id}-icon.png`}
                alt={model.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 
                className="text-xl sm:text-4xl font-bold mb-0.5 sm:mb-1 truncate"
                style={{ color: `hsl(var(--${model.color}))` }}
              >
                {model.displayName}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-lg">
                {model.totalPredictions} {t('predictions')}
              </p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('win_rate')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              <AnimatedWinRate 
                value={model.winRate}
                className="text-xl sm:text-3xl font-bold"
                style={{ color: `hsl(var(--${model.color}))` }}
              />
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('correct')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              {model.correctPredictions}
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('wrong')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              {model.totalPredictions - model.correctPredictions}
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">ROI</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              {Number(roi) >= 0 ? '+' : ''}{roi}%
            </p>
          </Card>
          
          <Card className="p-3 sm:p-5 border-border/50 bg-card/50 backdrop-blur-sm col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">{t('current_balance')}</p>
            <p className="text-xl sm:text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              ${currentBalance.toFixed(0)}
            </p>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">{t('filters')}:</span>
            </div>
            
            <div className="flex gap-2 sm:gap-4 flex-1">
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('result')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_results')}</SelectItem>
                  <SelectItem value="correct">{t('correct')}</SelectItem>
                  <SelectItem value="wrong">{t('wrong')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBetType} onValueChange={setFilterBetType}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t('bet_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_types')}</SelectItem>
                  <SelectItem value="moneyline">{t('bet_type_moneyline')}</SelectItem>
                  <SelectItem value="handicap">{t('bet_type_handicap')}</SelectItem>
                  <SelectItem value="over_under">{t('bet_type_over_under')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground sm:ml-auto">
              {modelPredictions.length} {t('records')}
            </div>
          </div>
        </Card>

        {/* 预测历史表格 */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px] sm:w-[100px] text-[10px] sm:text-xs px-2">{t('date')}</TableHead>
                  <TableHead className="text-[10px] sm:text-xs px-2">{t('match')}</TableHead>
                  <TableHead className="hidden md:table-cell text-[10px] sm:text-xs px-2">{t('ai_prediction') || 'AI预测'}</TableHead>
                  <TableHead className="hidden sm:table-cell text-[10px] sm:text-xs px-2">{t('bet_type')}</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-xs px-2">{t('odds')}</TableHead>
                  <TableHead className="hidden lg:table-cell text-right text-[10px] sm:text-xs px-2">{t('bet_amount')}</TableHead>
                  <TableHead className="text-right text-[10px] sm:text-xs px-2">{t('profit')}</TableHead>
                  <TableHead className="text-center text-[10px] sm:text-xs px-2">{t('result')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelPredictions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                      {t('no_predictions')}
                    </TableCell>
                  </TableRow>
                ) : (
                  modelPredictions.map((prediction) => {
                    const match = pastMatches.find(m => m.id === prediction.matchId);
                    if (!match) return null;
                    
                    const profit = calculateProfit(prediction);
                    
                    return (
                      <TableRow 
                        key={prediction.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        <TableCell className="font-medium text-[10px] sm:text-xs px-2 py-2">
                          <div className="truncate max-w-[60px] sm:max-w-none">
                            {prediction.date}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-2">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {match.homeLogo && (
                              <img 
                                src={match.homeLogo} 
                                alt={match.homeTeam}
                                className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] sm:text-sm font-medium truncate">
                                {match.homeTeam} vs {match.awayTeam}
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                {match.homeScore !== undefined && (
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                                    {match.homeScore} - {match.awayScore}
                                  </span>
                                )}
                                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                  • {match.league}
                                </span>
                              </div>
                            </div>
                            {match.awayLogo && (
                              <img 
                                src={match.awayLogo} 
                                alt={match.awayTeam}
                                className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-[11px] sm:text-sm font-medium px-2 py-2">
                          <div className="truncate max-w-[100px]">
                            {getPredictionLabel(prediction.prediction, match)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-[11px] sm:text-sm px-2 py-2">
                          <div className="truncate max-w-[120px]">
                            {getBetTypeLabel(prediction.betType, prediction)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] sm:text-sm px-2 py-2">
                          {prediction.odds.toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right font-mono text-[11px] sm:text-sm px-2 py-2">
                          ${prediction.betAmount}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-[11px] sm:text-sm font-bold px-2 py-2 ${
                          profit >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center px-2 py-2">
                          {prediction.correct ? (
                            <Badge className="gap-0.5 sm:gap-1 bg-success/20 text-success border-success/30 text-[10px] sm:text-xs px-1.5 sm:px-2">
                              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="hidden xs:inline">{t('correct')}</span>
                              <span className="xs:hidden">✓</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
                              <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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
      </div>
    </div>
  );
};

export default ModelDetail;

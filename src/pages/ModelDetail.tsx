import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, XCircle, TrendingUp, Info, Target, DollarSign, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { aiModels, predictionHistory, pastMatches } from "@/data/mockData";
import authBg from "@/assets/auth-football-bg.jpg";

const ModelDetail = () => {
  const { t } = useTranslation();
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  
  const model = aiModels.find(m => m.id === modelId);
  const modelPredictions = predictionHistory
    .filter(p => p.aiModel === modelId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // 按时间排序
  
  // 先定义计算盈利的函数
  const calculateProfit = (prediction: any) => {
    if (prediction.correct) {
      // 赢了：盈利 = 下注金额 × (赔率 - 1)
      return prediction.betAmount * (prediction.odds - 1);
    } else {
      // 输了：亏损 = -下注金额
      return -prediction.betAmount;
    }
  };
  
  // 计算钱包余额变化 - 使用 reduce 避免循环引用
  const INITIAL_BALANCE = 10000;
  const predictionsWithBalance = modelPredictions.reduce((acc: any[], prediction, index) => {
    const previousBalance = index === 0 ? INITIAL_BALANCE : acc[index - 1].balance;
    const profit = calculateProfit(prediction);
    const balance = previousBalance + profit;
    return [...acc, { ...prediction, balance }];
  }, []);
  
  const currentBalance = predictionsWithBalance.length > 0 
    ? predictionsWithBalance[predictionsWithBalance.length - 1].balance 
    : INITIAL_BALANCE;
  
  if (!model) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('model_not_found')}</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            {t('go_back')}
          </Button>
        </div>
      </div>
    );
  }

  const getBetTypeLabel = (betType: string) => {
    switch(betType) {
      case "moneyline": return t('bet_type_moneyline');
      case "handicap": return t('bet_type_handicap');
      case "over_under": return t('bet_type_over_under');
      default: return betType;
    }
  };
  
  const getBetTypeDetails = (prediction: any) => {
    if (prediction.betType === "handicap") {
      const line = prediction.handicapLine || 0;
      if (prediction.prediction === "HOME_WIN") {
        return `${line > 0 ? '+' : ''}${line}`;
      } else if (prediction.prediction === "AWAY_WIN") {
        return `${line < 0 ? '+' : ''}${Math.abs(line)}`;
      }
      return `${line}`;
    } else if (prediction.betType === "over_under") {
      return `${prediction.overUnderPick === "over" ? t('over') : t('under')} ${prediction.overUnderLine}`;
    }
    return "";
  };
  
  const getPredictionLabel = (prediction: string) => {
    switch(prediction) {
      case "HOME_WIN": return t('home_win_label');
      case "AWAY_WIN": return t('away_win_label');
      case "DRAW": return t('draw_label');
      default: return prediction;
    }
  };
  
  return (
    <div className="min-h-screen relative">
      {/* Background with overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${authBg})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-br from-black/85 via-black/80 to-primary/20 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-primary/20 bg-card/80 backdrop-blur-md">
          <div className="container mx-auto px-4 py-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="mb-4 hover:text-primary transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back_to_models')}
            </Button>
            
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center p-2 bg-card/50 backdrop-blur-sm animate-fade-in"
                style={{
                  border: `3px solid hsl(var(--${model.color}))`
                }}
              >
                <img 
                  src={`/src/assets/${model.id}-icon.png`}
                  alt={model.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 
                  className="text-3xl font-bold animate-fade-in"
                  style={{ color: `hsl(var(--${model.color}))` }}
                >
                  {model.displayName}
                </h1>
                <p className="text-muted-foreground animate-fade-in delay-75">
                  {model.totalPredictions} {t('predictions')} · {model.winRate.toFixed(1)}% {t('win_rate')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Coming Soon Alert */}
        <div className="container mx-auto px-4 py-6">
          <Alert className="bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/50 animate-fade-in backdrop-blur-md">
            <Info className="h-5 w-5 text-primary animate-pulse" />
            <AlertTitle className="text-primary font-bold text-lg">
              {t('copy_trade_unavailable')}
            </AlertTitle>
            <AlertDescription className="text-foreground/90">
              {t('copy_trade_unavailable_desc')}
            </AlertDescription>
          </Alert>
        </div>
        
        {/* Stats Section */}
        <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-6 bg-card/90 backdrop-blur-md border-primary/20 hover-scale transition-all animate-fade-in">
            <p className="text-sm text-muted-foreground mb-2">{t('current_balance')}</p>
            <p className={`text-3xl font-bold font-mono-data ${
              currentBalance >= INITIAL_BALANCE ? 'text-success' : 'text-destructive'
            }`}>
              ${currentBalance.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentBalance >= INITIAL_BALANCE ? '+' : ''}{((currentBalance - INITIAL_BALANCE) / INITIAL_BALANCE * 100).toFixed(1)}%
            </p>
          </Card>
          
          <Card className="p-6 bg-card/90 backdrop-blur-md border-primary/20 hover-scale transition-all animate-fade-in">
            <p className="text-sm text-muted-foreground mb-2">Win Rate</p>
            <p className="text-3xl font-bold font-mono-data" style={{ color: `hsl(var(--${model.color}))` }}>
              {model.winRate.toFixed(1)}%
            </p>
          </Card>
          
          <Card className="p-6 bg-card/90 backdrop-blur-md border-primary/20 hover-scale transition-all animate-fade-in delay-75">
            <p className="text-sm text-muted-foreground mb-2">Total Predictions</p>
            <p className="text-3xl font-bold font-mono-data">
              {model.totalPredictions}
            </p>
          </Card>
          
          <Card className="p-6 bg-card/90 backdrop-blur-md border-primary/20 hover-scale transition-all animate-fade-in delay-150">
            <p className="text-sm text-muted-foreground mb-2">Correct</p>
            <p className="text-3xl font-bold font-mono-data text-success">
              {model.correctPredictions}
            </p>
          </Card>
          
          <Card className="p-6 bg-card/90 backdrop-blur-md border-primary/20 hover-scale transition-all animate-fade-in delay-200">
            <p className="text-sm text-muted-foreground mb-2">Wrong</p>
            <p className="text-3xl font-bold font-mono-data text-destructive">
              {model.totalPredictions - model.correctPredictions}
            </p>
          </Card>
        </div>
        
        {/* Prediction History */}
        <div>
          <h2 className="text-2xl font-bold mb-6 animate-fade-in">{t('prediction_history')}</h2>
          <div className="space-y-4">
            {predictionsWithBalance.map((prediction, index) => {
              const match = pastMatches.find(m => m.id === prediction.matchId);
              if (!match) return null;
              
              return (
                <Card 
                  key={prediction.id} 
                  className="overflow-hidden bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border border-border/50 hover-scale transition-all animate-fade-in shadow-lg"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* 顶部赛事信息栏 */}
                  <div className="px-6 py-3 bg-gradient-to-r from-muted/80 to-muted/50 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                          {match.league}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {prediction.date}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {match.time}
                        </span>
                      </div>
                      
                      <Badge variant={prediction.correct ? "default" : "destructive"} className="gap-1.5 px-3">
                        {prediction.correct ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="font-semibold">{t('correct')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="font-semibold">{t('wrong')}</span>
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  {/* 比赛主体 */}
                  <div className="p-6">
                    {/* 球队对阵区域 */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-6 mb-6">
                      {/* 主队 */}
                      <div className="flex items-center gap-4">
                        {match.homeLogo && (
                          <div className="w-16 h-16 rounded-xl bg-background/50 p-3 flex items-center justify-center ring-1 ring-border/30">
                            <img src={match.homeLogo} alt={match.homeTeam} className="w-full h-full object-contain" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {t('home_team')}
                          </div>
                          <h3 className="text-xl font-bold text-foreground leading-tight">
                            {match.homeTeam}
                          </h3>
                        </div>
                      </div>
                      
                      {/* 比分中心 */}
                      <div className="flex flex-col items-center justify-center min-w-[140px]">
                        {match.homeScore !== undefined && match.awayScore !== undefined ? (
                          <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">
                              {t('final_score')}
                            </div>
                            <div className="flex items-center gap-4 px-8 py-4 rounded-xl bg-background/80 ring-1 ring-border/50">
                              <span className="text-4xl font-black font-mono-data text-foreground">
                                {match.homeScore}
                              </span>
                              <span className="text-2xl font-bold text-muted-foreground/50">-</span>
                              <span className="text-4xl font-black font-mono-data text-foreground">
                                {match.awayScore}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="px-8 py-4 rounded-xl bg-background/80 ring-1 ring-border/50">
                            <span className="text-2xl font-bold text-muted-foreground">VS</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 客队 */}
                      <div className="flex items-center gap-4 justify-end">
                        <div className="flex-1 text-right">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {t('away_team')}
                          </div>
                          <h3 className="text-xl font-bold text-foreground leading-tight">
                            {match.awayTeam}
                          </h3>
                        </div>
                        {match.awayLogo && (
                          <div className="w-16 h-16 rounded-xl bg-background/50 p-3 flex items-center justify-center ring-1 ring-border/30">
                            <img src={match.awayLogo} alt={match.awayTeam} className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 投注信息区 */}
                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 rounded-lg bg-background/50 ring-1 ring-border/30">
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                          {t('bet_type')}
                        </div>
                        <div className="font-bold text-foreground text-sm">
                          {getBetTypeLabel(prediction.betType)}
                        </div>
                        {getBetTypeDetails(prediction) && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {getBetTypeDetails(prediction)}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center border-x border-border/30">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                          {t('odds')}
                        </div>
                        <div className="font-black text-foreground text-sm font-mono-data">
                          {prediction.odds.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                          {t('confidence')}
                        </div>
                        <div className="font-black text-foreground text-sm font-mono-data">
                          {prediction.confidence}%
                        </div>
                      </div>
                    </div>

                    {/* 财务信息 */}
                    <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                          {t('bet_amount')}
                        </div>
                        <div className="font-bold text-foreground font-mono-data">
                          ${prediction.betAmount}
                        </div>
                      </div>
                      
                      <div className="border-x border-border/30">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                          {calculateProfit(prediction) >= 0 ? t('profit') : t('loss')}
                        </div>
                        <div className={`font-bold font-mono-data ${
                          calculateProfit(prediction) >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {calculateProfit(prediction) >= 0 ? '+' : ''}${calculateProfit(prediction).toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                          {t('balance')}
                        </div>
                        <div className={`font-bold font-mono-data ${
                          prediction.balance >= INITIAL_BALANCE ? 'text-success' : 'text-destructive'
                        }`}>
                          ${prediction.balance.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* 预测对比 */}
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/30">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                          {t('ai_prediction')}
                        </div>
                        <div className="font-bold text-foreground" style={{ color: `hsl(var(--${model.color}))` }}>
                          {getPredictionLabel(prediction.prediction)}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                          {t('actual_result')}
                        </div>
                        <div className={`font-bold ${
                          prediction.correct ? 'text-success' : 'text-destructive'
                        }`}>
                          {getPredictionLabel(prediction.actualResult)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ModelDetail;

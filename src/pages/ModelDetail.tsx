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
  
  // 计算钱包余额变化
  const INITIAL_BALANCE = 10000;
  const predictionsWithBalance = modelPredictions.map((prediction, index) => {
    const previousBalance = index === 0 ? INITIAL_BALANCE : predictionsWithBalance[index - 1].balance;
    const profit = calculateProfit(prediction);
    const balance = previousBalance + profit;
    return { ...prediction, balance };
  });
  
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
            {modelPredictions.map((prediction, index) => {
              const match = pastMatches.find(m => m.id === prediction.matchId);
              if (!match) return null;
              
              return (
                <Card 
                  key={prediction.id} 
                  className="p-6 bg-card/90 backdrop-blur-md border-primary/20 hover-scale transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* 顶部状态栏 */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={prediction.correct ? "default" : "destructive"} className="gap-1">
                        {prediction.correct ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            {t('correct')}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            {t('wrong')}
                          </>
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{match.league}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t('confidence')}:</span>
                      <span className="font-bold font-mono-data text-lg">{prediction.confidence}%</span>
                    </div>
                  </div>
                  
                  {/* 比赛信息 */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-2">
                      {match.homeTeam} {t('vs_text')} {match.awayTeam}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{prediction.date}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      <span>{match.time}</span>
                      {match.homeScore !== undefined && match.awayScore !== undefined && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span className="font-bold text-foreground">{match.homeScore} - {match.awayScore}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 投注详情 */}
                  <div className="mb-4 p-4 rounded-lg bg-accent/20 border border-accent/30">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {t('bet_type')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
                            {getBetTypeLabel(prediction.betType)}
                          </span>
                          {getBetTypeDetails(prediction) && (
                            <span className="text-sm font-medium text-foreground/80">
                              ({getBetTypeDetails(prediction)})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <DollarSign className="h-4 w-4 text-warning" />
                          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {t('odds')}
                          </span>
                        </div>
                        <span className="text-lg font-bold font-mono-data text-warning">
                          {prediction.odds.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-accent/40">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {t('bet_amount')}
                          </span>
                          <div className="text-lg font-bold font-mono-data">
                            ${prediction.betAmount}
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 justify-end">
                            {calculateProfit(prediction) >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-destructive" />
                            )}
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                              {calculateProfit(prediction) >= 0 ? t('profit') : t('loss')}
                            </span>
                          </div>
                          <div className={`text-lg font-bold font-mono-data ${
                            calculateProfit(prediction) >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {calculateProfit(prediction) >= 0 ? '+' : ''}${calculateProfit(prediction).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 预测结果对比 */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {t('ai_prediction')}
                      </p>
                      <p 
                        className="text-lg font-bold"
                        style={{ color: `hsl(var(--${model.color}))` }}
                      >
                        {getPredictionLabel(prediction.prediction)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {t('actual_result')}
                      </p>
                      <p className={`text-lg font-bold ${prediction.correct ? 'text-success' : 'text-destructive'}`}>
                        {getPredictionLabel(prediction.actualResult)}
                      </p>
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

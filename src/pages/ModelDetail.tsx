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

  const getBetTypeLabel = (betType: string) => {
    switch(betType) {
      case "moneyline": return t('bet_type_moneyline');
      case "handicap": return t('bet_type_handicap');
      case "over_under": return t('bet_type_over_under');
      default: return betType;
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
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back_to_models')}
        </Button>

        {/* 模型信息头部 - 带背景 */}
        <div 
          className="relative rounded-2xl overflow-hidden mb-8"
          style={{
            backgroundImage: `url(${getModelBackground(modelId!)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/60" />
          <div className="relative flex items-center gap-6 p-8">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center p-3 bg-background/80 backdrop-blur-sm border-2"
              style={{ borderColor: `hsl(var(--${model.color}))` }}
            >
              <img 
                src={`/src/assets/${model.id}-icon.png`}
                alt={model.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 
                className="text-4xl font-bold mb-1"
                style={{ color: `hsl(var(--${model.color}))` }}
              >
                {model.displayName}
              </h1>
              <p className="text-muted-foreground text-lg">
                {model.totalPredictions} {t('predictions')}
              </p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground mb-2">{t('win_rate')}</p>
            <p className="text-3xl font-bold" style={{ color: `hsl(var(--${model.color}))` }}>
              {model.winRate.toFixed(1)}%
            </p>
          </Card>
          
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground mb-2">{t('correct')}</p>
            <p className="text-3xl font-bold text-success">
              {model.correctPredictions}
            </p>
          </Card>
          
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground mb-2">{t('wrong')}</p>
            <p className="text-3xl font-bold text-destructive">
              {model.totalPredictions - model.correctPredictions}
            </p>
          </Card>
          
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground mb-2">ROI</p>
            <p className={`text-3xl font-bold ${Number(roi) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {Number(roi) >= 0 ? '+' : ''}{roi}%
            </p>
          </Card>
          
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground mb-2">{t('current_balance')}</p>
            <p className={`text-3xl font-bold ${currentBalance >= INITIAL_BALANCE ? 'text-success' : 'text-destructive'}`}>
              ${currentBalance.toFixed(0)}
            </p>
          </Card>
        </div>

        {/* 筛选器 */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('filters')}:</span>
            </div>
            
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('result')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_results')}</SelectItem>
                <SelectItem value="correct">{t('correct')}</SelectItem>
                <SelectItem value="wrong">{t('wrong')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBetType} onValueChange={setFilterBetType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('bet_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_types')}</SelectItem>
                <SelectItem value="moneyline">{t('bet_type_moneyline')}</SelectItem>
                <SelectItem value="handicap">{t('bet_type_handicap')}</SelectItem>
                <SelectItem value="over_under">{t('bet_type_over_under')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-muted-foreground">
              {modelPredictions.length} {t('records')}
            </div>
          </div>
        </Card>

        {/* 预测历史表格 */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('date')}</TableHead>
                <TableHead>{t('match')}</TableHead>
                <TableHead>{t('league')}</TableHead>
                <TableHead>{t('bet_type')}</TableHead>
                <TableHead className="text-right">{t('odds')}</TableHead>
                <TableHead className="text-right">{t('bet_amount')}</TableHead>
                <TableHead className="text-right">{t('profit')}</TableHead>
                <TableHead className="text-center">{t('result')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelPredictions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="font-medium text-xs">
                        {prediction.date}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {match.homeTeam} vs {match.awayTeam}
                        </div>
                        {match.homeScore !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            {match.homeScore} - {match.awayScore}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {match.league}
                      </TableCell>
                      <TableCell className="text-xs">
                        {getBetTypeLabel(prediction.betType)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {prediction.odds.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${prediction.betAmount}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-bold ${
                        profit >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {prediction.correct ? (
                          <Badge className="gap-1 bg-success/20 text-success border-success/30">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('correct')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {t('wrong')}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default ModelDetail;

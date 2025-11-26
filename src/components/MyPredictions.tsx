import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trophy, TrendingUp, Target, DollarSign, History } from "lucide-react";
import { AnimatedWinRate } from "./AnimatedWinRate";

interface PredictionStats {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  recentPredictions: Array<{
    id: string;
    match_id: string;
    prediction: string;
    result: string;
    bet_amount: number;
    actual_payout: number;
    created_at: string;
  }>;
}

const MyPredictions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const INITIAL_BALANCE = 10000;

        // 获取余额
        const { data: balanceData } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        // 获取预测记录
        const { data: predictionsData } = await supabase
          .from('user_predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const totalPredictions = predictionsData?.length || 0;
        const correctPredictions = predictionsData?.filter(p => p.result === 'win').length || 0;
        const winRate = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
        const balance = balanceData?.balance || INITIAL_BALANCE;
        const profit = balance - INITIAL_BALANCE;

        setStats({
          totalPredictions,
          correctPredictions,
          winRate,
          balance,
          profit,
          recentPredictions: predictionsData || []
        });
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, [user]);

  if (!user) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">登录后查看您的预测统计</p>
          <Button onClick={() => navigate('/auth')}>
            立即登录
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalPredictions === 0) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            我的预测
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">您还没有任何预测记录</p>
          <Button onClick={() => navigate('/')}>
            开始预测
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          我的预测统计
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Trophy className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-xs text-muted-foreground mb-1">胜率</p>
            <AnimatedWinRate 
              value={stats.winRate}
              className="text-lg font-bold font-mono-data text-primary"
            />
          </div>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-success" />
            <p className="text-xs text-muted-foreground mb-1">总预测</p>
            <p className="text-lg font-bold font-mono-data">{stats.totalPredictions}</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <DollarSign className="h-5 w-5 mx-auto mb-2 text-warning" />
            <p className="text-xs text-muted-foreground mb-1">余额</p>
            <p className="text-lg font-bold font-mono-data">
              ${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Target className="h-5 w-5 mx-auto mb-2 text-info" />
            <p className="text-xs text-muted-foreground mb-1">收益</p>
            <p className={`text-lg font-bold font-mono-data ${stats.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {stats.recentPredictions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                最近预测
              </h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/history')}
                className="text-xs"
              >
                查看全部
              </Button>
            </div>
            <div className="space-y-2">
              {stats.recentPredictions.map((pred) => (
                <div 
                  key={pred.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(pred.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-medium">
                      预测: {pred.prediction}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                      pred.result === 'win' 
                        ? 'bg-success/20 text-success' 
                        : pred.result === 'loss'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {pred.result === 'win' ? '✓ 胜' : pred.result === 'loss' ? '✗ 负' : '待定'}
                    </span>
                    {pred.result === 'win' && pred.actual_payout > 0 && (
                      <p className="text-xs text-success mt-1 font-mono-data">
                        +${(pred.actual_payout - pred.bet_amount).toFixed(0)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <Button 
            onClick={() => navigate('/history')}
            className="w-full"
            variant="outline"
          >
            查看完整历史记录
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyPredictions;

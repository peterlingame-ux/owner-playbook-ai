import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Match } from "@/types/prediction";
import { Loader2, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface UserPredictionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const UserPredictionsDialog = ({ open, onOpenChange, userId }: UserPredictionsDialogProps) => {
  const { t, i18n } = useTranslation();
  const { userBalance, refreshBalance } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [predictionType, setPredictionType] = useState<"handicap" | "over_under">("handicap");
  const [prediction, setPrediction] = useState("");
  const [betAmount, setBetAmount] = useState(100);
  const [winRate, setWinRate] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchTodayMatches();
      fetchUserWinRate();
    }
  }, [open]);

  const fetchTodayMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('football-fixtures', {
        body: { language: i18n.language }
      });

      if (error) throw error;
      
      const todayMatches = data.matches?.filter((match: Match) => match.status === "upcoming") || [];
      setMatches(todayMatches.slice(0, 10));
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast.error(t('fetch_match_list_failed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWinRate = async () => {
    try {
      const { data, error } = await supabase
        .from('user_predictions')
        .select('result')
        .eq('user_id', userId)
        .neq('result', 'pending');

      if (error) throw error;

      if (data && data.length > 0) {
        const wins = data.filter(p => p.result === 'win').length;
        const rate = (wins / data.length) * 100;
        setWinRate(Math.round(rate));
      }
    } catch (error) {
      console.error("Error fetching win rate:", error);
    }
  };

  const handleSubmitPrediction = async () => {
    if (!selectedMatch || !prediction) {
      toast.error(t("请选择比赛和预测结果"));
      return;
    }

    if (betAmount <= 0) {
      toast.error(t("下注金额必须大于0"));
      return;
    }

    if (userBalance && betAmount > userBalance.balance) {
      toast.error(t("余额不足"));
      return;
    }

    setSubmitting(true);
    try {
      // Calculate potential payout (example: 2x odds)
      const potentialPayout = betAmount * 2;

      const { data, error } = await supabase.rpc('place_bet', {
        p_user_id: userId,
        p_match_id: selectedMatch.id,
        p_prediction_type: predictionType,
        p_prediction: prediction,
        p_bet_amount: betAmount,
        p_potential_payout: potentialPayout,
        p_match_date: new Date(selectedMatch.date).toISOString(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; new_balance?: number };
      
      if (!result.success) {
        toast.error(result.error || t("下注失败"));
        return;
      }

      toast.success(t("下注成功！") + ` ${t("剩余余额")}: ${result.new_balance?.toFixed(2)}`);
      await refreshBalance();
      onOpenChange(false);
      setSelectedMatch(null);
      setPrediction("");
      setBetAmount(100);
    } catch (error) {
      console.error("Error submitting prediction:", error);
      toast.error(t("提交失败，请重试"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-4 flex-wrap">
            <span>{t("AI今日推荐比赛")}</span>
            {userBalance && (
              <Badge className="text-base px-4 py-1" variant="default">
                <Coins className="h-4 w-4 mr-2" />
                {t("余额")}: {userBalance.balance.toFixed(2)}
              </Badge>
            )}
            {winRate !== null && (
              <Badge className="text-base px-4 py-1" variant="secondary">
                {t("我的胜率")}: {winRate}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("今日暂无推荐比赛")}
              </p>
            ) : (
              <>
                <div className="grid gap-3">
                  {matches.map((match) => (
                    <Card
                      key={match.id}
                      className={`p-4 cursor-pointer transition-all hover:border-primary ${
                        selectedMatch?.id === match.id ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedMatch(match)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="text-right flex-1">
                              <p className="font-medium">
                                {i18n.language === 'zh' ? match.homeTeamZh || match.homeTeam : match.homeTeam}
                              </p>
                            </div>
                            <div className="text-center px-4">
                              <Badge variant="outline">VS</Badge>
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-medium">
                                {i18n.language === 'zh' ? match.awayTeamZh || match.awayTeam : match.awayTeam}
                              </p>
                            </div>
                          </div>
                          <div className="text-center text-sm text-muted-foreground mt-2">
                            {match.date} {match.time}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {selectedMatch && (
                  <Card className="p-6 mt-6 bg-secondary/20">
                    <h3 className="font-semibold mb-4">{t("选择预测类型")}</h3>
                    
                    <RadioGroup value={predictionType} onValueChange={(v) => {
                      setPredictionType(v as any);
                      setPrediction("");
                    }}>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="handicap" id="handicap" />
                        <Label htmlFor="handicap">{t("让球")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="over_under" id="over_under" />
                        <Label htmlFor="over_under">{t("大小球")}</Label>
                      </div>
                    </RadioGroup>

                    <div className="mt-4">
                      <h4 className="font-medium mb-3">{t("选择预测结果")}</h4>
                      <RadioGroup value={prediction} onValueChange={setPrediction}>
                        {predictionType === "handicap" && (
                          <>
                            <div className="flex items-center space-x-2 mb-2">
                              <RadioGroupItem value="HOME_COVER" id="home_cover" />
                              <Label htmlFor="home_cover">
                                {i18n.language === 'zh' 
                                  ? selectedMatch.homeTeamZh || selectedMatch.homeTeam 
                                  : selectedMatch.homeTeam} {t("让分成功")}
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="AWAY_COVER" id="away_cover" />
                              <Label htmlFor="away_cover">
                                {i18n.language === 'zh' 
                                  ? selectedMatch.awayTeamZh || selectedMatch.awayTeam 
                                  : selectedMatch.awayTeam} {t("让分成功")}
                              </Label>
                            </div>
                          </>
                        )}
                        {predictionType === "over_under" && (
                          <>
                            <div className="flex items-center space-x-2 mb-2">
                              <RadioGroupItem value="OVER" id="over" />
                              <Label htmlFor="over">{t("大球 (总进球数多)")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="UNDER" id="under" />
                              <Label htmlFor="under">{t("小球 (总进球数少)")}</Label>
                            </div>
                          </>
                        )}
                      </RadioGroup>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <Label className="text-base font-semibold mb-3 block">{t("下注金额")}</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                            min={0}
                            max={userBalance?.balance || 10000}
                            className="text-lg font-medium"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {t("最大")}: {userBalance?.balance.toFixed(2) || 0}
                          </span>
                        </div>
                        <Slider
                          value={[betAmount]}
                          onValueChange={(value) => setBetAmount(value[0])}
                          max={userBalance?.balance || 10000}
                          step={50}
                          className="mt-4"
                        />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>0</span>
                          <span>{((userBalance?.balance || 10000) / 2).toFixed(0)}</span>
                          <span>{userBalance?.balance.toFixed(0) || 10000}</span>
                        </div>
                        <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                          <p className="text-sm">
                            {t("预计赔付")}: <span className="font-bold text-lg text-primary">{(betAmount * 2).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSubmitPrediction} 
                      className="w-full mt-6 text-lg h-12"
                      disabled={!prediction || submitting || betAmount <= 0}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("提交中...")}
                        </>
                      ) : (
                        t("确认下注")
                      )}
                    </Button>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
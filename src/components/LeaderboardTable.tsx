import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowDown } from "lucide-react";

const LeaderboardTable = () => {
  const { t } = useTranslation();
  // Calculate additional stats for each model
  const enhancedModels = aiModels.map(model => {
    const wrongPredictions = model.totalPredictions - model.correctPredictions;
    const currentStreak = Math.floor(Math.random() * 10) - 3; // -3 to 6
    const bestStreak = Math.floor(Math.random() * 15) + 5; // 5 to 19
    const worstStreak = -(Math.floor(Math.random() * 8) + 2); // -2 to -9
    const accuracy = model.winRate;
    const avgConfidence = (Math.random() * 30 + 60).toFixed(1); // 60-90%
    
    return {
      ...model,
      wrongPredictions,
      currentStreak,
      bestStreak,
      worstStreak,
      accuracy,
      avgConfidence,
    };
  }).sort((a, b) => b.winRate - a.winRate);

  const getModelIcon = (modelId: string) => {
    const icons: Record<string, string> = {
      'deepseek': '/src/assets/deepseek-icon.png',
      'qwen': '/src/assets/deepseek-icon.png',
      'claude': '/src/assets/claude-icon.png',
      'grok': '/src/assets/grok-icon.png',
      'gemini': '/src/assets/gemini-icon.png',
      'gpt': '/src/assets/openai-icon.png',
    };
    return icons[modelId] || icons.gpt;
  };

  return (
    <div className="space-y-6">
      {/* Leaderboard Table */}
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t('rank')}</TableHead>
                      <TableHead>{t('model')}</TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t('win_rate')} <ArrowDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">{t('predictions')}</TableHead>
                      <TableHead className="text-right">{t('correct')}</TableHead>
                      <TableHead className="text-right">{t('wrong')}</TableHead>
                      <TableHead className="text-right">CURRENT STREAK</TableHead>
                      <TableHead className="text-right">BEST STREAK</TableHead>
                      <TableHead className="text-right">WORST STREAK</TableHead>
                      <TableHead className="text-right">AVG CONFIDENCE</TableHead>
                      <TableHead className="text-right">MATCHES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enhancedModels.map((model, index) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img src={getModelIcon(model.id)} alt={model.name} className="h-5 w-5" />
                            <span className="font-medium">{model.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono-data font-bold text-primary">
                          {model.winRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono-data">
                          {model.totalPredictions}
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-success font-bold">
                          {model.correctPredictions}
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-destructive font-bold">
                          {model.wrongPredictions}
                        </TableCell>
                        <TableCell className={`text-right font-mono-data font-bold ${model.currentStreak > 0 ? 'text-success' : model.currentStreak < 0 ? 'text-destructive' : ''}`}>
                          {model.currentStreak > 0 ? '+' : ''}{model.currentStreak}
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-success">
                          +{model.bestStreak}
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-destructive">
                          {model.worstStreak}
                        </TableCell>
                        <TableCell className="text-right font-mono-data">
                          {model.avgConfidence}%
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-muted-foreground">
                          {model.totalPredictions}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Note */}
          <p className="text-sm text-muted-foreground">
            <span className="font-bold">Note:</span> All statistics reflect <span className="font-bold">completed match predictions only</span>. Live match predictions are not included in calculations until matches are finished.
          </p>
    </div>
  );
};

export default LeaderboardTable;

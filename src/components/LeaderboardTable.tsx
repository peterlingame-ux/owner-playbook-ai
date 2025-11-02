import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown } from "lucide-react";

const LeaderboardTable = () => {
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

  const winningModel = enhancedModels[0];

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
      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overall">OVERALL STATS</TabsTrigger>
          <TabsTrigger value="advanced">ADVANCED ANALYTICS</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overall" className="space-y-6">
          {/* Leaderboard Table */}
          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">RANK</TableHead>
                      <TableHead>MODEL</TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          WIN RATE <ArrowDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">PREDICTIONS</TableHead>
                      <TableHead className="text-right">CORRECT</TableHead>
                      <TableHead className="text-right">WRONG</TableHead>
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

          {/* Bottom Section: Winning Model + Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Winning Model Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-bold mb-4 text-muted-foreground">WINNING MODEL</h3>
                <div className="flex items-center gap-3 mb-6">
                  <img src={getModelIcon(winningModel.id)} alt={winningModel.name} className="h-10 w-10" />
                  <span className="text-xl font-bold">{winningModel.displayName}</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">WIN RATE</p>
                    <p className="text-2xl font-bold font-mono-data text-primary">
                      {winningModel.winRate.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">CORRECT PREDICTIONS</p>
                    <p className="text-xl font-bold font-mono-data text-success">
                      {winningModel.correctPredictions} / {winningModel.totalPredictions}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">ACTIVE MATCHES</p>
                    <div className="flex gap-2 flex-wrap">
                      <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
                        ⚽ Premier League
                      </div>
                      <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
                        ⚽ La Liga
                      </div>
                      <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
                        ⚽ Bundesliga
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-end justify-between h-full gap-4 min-h-[350px]">
                  {enhancedModels.map((model) => {
                    const maxWinRate = Math.max(...enhancedModels.map(m => m.winRate));
                    const minWinRate = Math.min(...enhancedModels.map(m => m.winRate));
                    
                    // Calculate height with more contrast - scale between 30% and 100% of container
                    const normalizedHeight = ((model.winRate - minWinRate) / (maxWinRate - minWinRate)) * 70 + 30;
                    
                    return (
                      <div key={model.id} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-sm font-mono-data font-bold mb-2">
                          {model.winRate.toFixed(1)}%
                        </div>
                        <div 
                          className="w-full rounded-t-lg relative flex items-end justify-center pb-4 transition-all duration-300 hover:opacity-80"
                          style={{ 
                            height: `${normalizedHeight}%`,
                            backgroundColor: `hsl(var(--${model.color}))`,
                          }}
                        >
                          <img 
                            src={getModelIcon(model.id)} 
                            alt={model.name}
                            className="h-8 w-8 object-contain"
                          />
                        </div>
                        <div className="text-xs text-center font-medium text-muted-foreground">
                          {model.displayName.split(' ')[0]}...
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Note */}
          <p className="text-sm text-muted-foreground">
            <span className="font-bold">Note:</span> All statistics reflect <span className="font-bold">completed match predictions only</span>. Live match predictions are not included in calculations until matches are finished.
          </p>
        </TabsContent>
        
        <TabsContent value="advanced">
          <div className="text-center py-12 text-muted-foreground">
            <p>Advanced analytics coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaderboardTable;

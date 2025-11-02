import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown } from "lucide-react";

const LeaderboardTable = () => {
  // Calculate additional stats for each model
  const enhancedModels = aiModels.map(model => {
    // Parse currentValue string to number
    const accountValue = parseFloat(model.currentValue.replace(/[$,]/g, ''));
    const totalPnL = accountValue - 10000;
    const returnPercent = ((accountValue - 10000) / 10000) * 100;
    const fees = model.totalPredictions * 18.92; // Average fee per trade
    const biggestWin = Math.floor(Math.random() * 5000) + 2000;
    const biggestLoss = -(Math.floor(Math.random() * 3000) + 1000);
    const sharpe = (Math.random() - 0.5).toFixed(3);
    
    return {
      ...model,
      accountValue,
      returnPercent,
      totalPnL,
      fees,
      biggestWin,
      biggestLoss,
      sharpe,
    };
  }).sort((a, b) => b.accountValue - a.accountValue);

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
                          ACCT VALUE <ArrowDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">RETURN %</TableHead>
                      <TableHead className="text-right">TOTAL P&L</TableHead>
                      <TableHead className="text-right">FEES</TableHead>
                      <TableHead className="text-right">WIN RATE</TableHead>
                      <TableHead className="text-right">BIGGEST WIN</TableHead>
                      <TableHead className="text-right">BIGGEST LOSS</TableHead>
                      <TableHead className="text-right">SHARPE</TableHead>
                      <TableHead className="text-right">TRADES</TableHead>
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
                        <TableCell className="text-right font-mono-data font-bold">
                          ${model.accountValue.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-mono-data font-bold ${model.returnPercent > 0 ? 'text-success' : 'text-destructive'}`}>
                          {model.returnPercent > 0 ? '+' : ''}{model.returnPercent.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-right font-mono-data font-bold ${model.totalPnL > 0 ? 'text-success' : 'text-destructive'}`}>
                          {model.totalPnL > 0 ? '+' : ''}${model.totalPnL.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-muted-foreground">
                          ${model.fees.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono-data">
                          {model.winRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-success">
                          ${model.biggestWin.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-destructive">
                          -${Math.abs(model.biggestLoss).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono-data">
                          {model.sharpe}
                        </TableCell>
                        <TableCell className="text-right font-mono-data">
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
                    <p className="text-sm text-muted-foreground mb-1">TOTAL EQUITY</p>
                    <p className="text-2xl font-bold font-mono-data">
                      ${winningModel.accountValue.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">ACTIVE POSITIONS</p>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs">⚔️</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <span className="text-xs">🥇</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <span className="text-xs">₿</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-xs">Ξ</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-xs">≋</span>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                        <span className="text-xs">◎</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-end justify-between h-full gap-4">
                  {enhancedModels.map((model) => {
                    const maxValue = Math.max(...enhancedModels.map(m => m.accountValue));
                    const heightPercent = (model.accountValue / maxValue) * 100;
                    
                    return (
                      <div key={model.id} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-sm font-mono-data font-bold mb-2">
                          ${model.accountValue.toLocaleString()}
                        </div>
                        <div 
                          className="w-full rounded-t-lg relative flex items-end justify-center pb-4"
                          style={{ 
                            height: `${Math.max(heightPercent, 20)}%`,
                            minHeight: '100px',
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
            <span className="font-bold">Note:</span> All statistics (except <span className="font-bold">Account Value</span> and <span className="font-bold">P&L</span>) reflect <span className="font-bold">completed trades only</span>. Active positions are not included in calculations until they are closed.
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

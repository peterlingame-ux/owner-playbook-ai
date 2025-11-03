import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown } from "lucide-react";
import grassTexture from "@/assets/grass-texture.jpg";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";

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

  const getExpertImage = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return starRonaldo;
      case 'gpt5':
        return starNeymar;
      case 'claude':
        return starMessi;
      case 'gemini':
        return starHaaland;
      case 'grok':
        return starMbappe;
      default:
        return starRonaldo;
    }
  };

  const getColorTint = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return 'from-blue-600/80 to-blue-900/80';
      case 'gpt5':
        return 'from-red-600/80 to-red-900/80';
      case 'claude':
        return 'from-orange-600/80 to-orange-900/80';
      case 'gemini':
        return 'from-purple-600/80 to-purple-900/80';
      case 'grok':
        return 'from-green-600/80 to-green-900/80';
      default:
        return 'from-blue-600/80 to-blue-900/80';
    }
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
                      <TableHead className="text-right">{t('current_streak')}</TableHead>
                      <TableHead className="text-right">{t('best_streak')}</TableHead>
                      <TableHead className="text-right">{t('worst_streak')}</TableHead>
                      <TableHead className="text-right">{t('avg_confidence')}</TableHead>
                      <TableHead className="text-right">{t('matches')}</TableHead>
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
            <Card className="relative overflow-hidden">
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${getExpertImage(winningModel.id)})` }}
              />
              
              {/* Color Tint Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getColorTint(winningModel.id)}`} />
              
              {/* Dark gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
              
              <CardContent className="p-6 relative z-10">
                <h3 className="text-sm font-bold mb-4 text-white/80">WINNING MODEL</h3>
                <div className="flex items-center gap-3 mb-6">
                  <img src={getModelIcon(winningModel.id)} alt={winningModel.name} className="h-10 w-10" />
                  <span className="text-xl font-bold text-white">{winningModel.displayName}</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-white/70 mb-1">WIN RATE</p>
                    <p className="text-2xl font-bold font-mono-data text-white">
                      {winningModel.winRate.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/70 mb-1">CORRECT PREDICTIONS</p>
                    <p className="text-xl font-bold font-mono-data text-success">
                      {winningModel.correctPredictions} / {winningModel.totalPredictions}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/70 mb-3">ACTIVE MATCHES</p>
                    <div className="flex gap-2 flex-wrap">
                      <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white">
                        ⚽ Premier League
                      </div>
                      <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white">
                        ⚽ La Liga
                      </div>
                      <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white">
                        ⚽ Bundesliga
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="lg:col-span-2 relative overflow-hidden">
              {/* Grass texture background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{ 
                  backgroundImage: `url(${grassTexture})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {/* Dark overlay for contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/60" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-end justify-between gap-4" style={{ height: '320px' }}>
                  {enhancedModels.map((model) => {
                    const maxWinRate = Math.max(...enhancedModels.map(m => m.winRate));
                    const minWinRate = Math.min(...enhancedModels.map(m => m.winRate));
                    
                    // Calculate height in pixels with strong contrast
                    // Range from 120px (lowest) to 280px (highest)
                    const heightPx = ((model.winRate - minWinRate) / (maxWinRate - minWinRate)) * 160 + 120;
                    
                    return (
                      <div key={model.id} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-sm font-mono-data font-bold mb-2">
                          {model.winRate.toFixed(1)}%
                        </div>
                        <div 
                          className="w-full rounded-t-lg relative flex items-end justify-center pb-4 transition-all duration-300 hover:opacity-80 shadow-lg"
                          style={{ 
                            height: `${heightPx}px`,
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
            <span className="font-bold">{t('note')}:</span> {t('statistics_note')}
          </p>
    </div>
  );
};

export default LeaderboardTable;

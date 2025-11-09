import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { aiModels } from "@/data/mockData";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import grassTexture from "@/assets/grass-texture.jpg";
import starRonaldo from "@/assets/star-ronaldo.jpg";
import starMessi from "@/assets/star-messi.jpg";
import starHaaland from "@/assets/star-haaland.jpg";
import starMbappe from "@/assets/star-mbappe.jpg";
import starNeymar from "@/assets/star-neymar.jpg";
import expertMystery from "@/assets/expert-mystery.jpg";
import mysteryIcon from "@/assets/mystery-icon.png";
import { AnimatedWinRate } from "./AnimatedWinRate";

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
      'gpt5': '/src/assets/openai-icon.png',
      'mystery': mysteryIcon,
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
      case 'mystery':
        return expertMystery;
      default:
        return starRonaldo;
    }
  };

  const getColorTint = (modelId: string) => {
    switch(modelId) {
      case 'deepseek':
        return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
      case 'gpt5':
        return 'from-[hsl(0,0%,35%)]/80 to-[hsl(0,0%,20%)]/80';
      case 'claude':
        return 'from-[hsl(14,92%,68%)]/80 to-[hsl(14,92%,50%)]/80';
      case 'gemini':
        return 'from-[hsl(250,75%,68%)]/80 to-[hsl(250,75%,50%)]/80';
      case 'grok':
        return 'from-[hsl(158,68%,60%)]/80 to-[hsl(158,68%,45%)]/80';
      case 'mystery':
        return 'from-[hsl(45,100%,55%)]/80 to-[hsl(45,100%,45%)]/80';
      default:
        return 'from-[hsl(217,91%,65%)]/80 to-[hsl(217,91%,45%)]/80';
    }
  };

  return (
    <div className="space-y-6">
      {/* Leaderboard Table */}
      <Card className="border-border/50 bg-card/95 backdrop-blur overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 hover:bg-transparent bg-muted/30">
                  <TableHead className="w-12 py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase text-center">#</TableHead>
                  <TableHead className="py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase">{t('model')}</TableHead>
                  <TableHead className="text-center py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase">
                    <div className="flex items-center justify-center gap-1">
                      {t('win_rate')} <ArrowDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase">{t('predictions')}</TableHead>
                  <TableHead className="text-center py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase">{t('correct')}</TableHead>
                  <TableHead className="text-center py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase">{t('wrong')}</TableHead>
                  <TableHead className="text-center py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase">{t('best_streak')}</TableHead>
                  <TableHead className="text-center py-2.5 text-muted-foreground font-medium text-[10px] tracking-wider uppercase">{t('avg_confidence')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enhancedModels.map((model, index) => (
                  <TableRow 
                    key={model.id}
                    className="border-b border-border/20 hover:bg-accent/20 transition-colors"
                  >
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center">
                        <span className="font-bold text-sm text-muted-foreground">{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-background/50 p-1 flex items-center justify-center border border-border/30">
                          <img src={getModelIcon(model.id)} alt={model.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-semibold text-sm">{model.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <AnimatedWinRate 
                        value={model.winRate}
                        className="font-mono-data font-bold text-base"
                        style={{ color: `hsl(var(--${model.color}))` }}
                      />
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className="font-mono-data text-sm text-muted-foreground">
                        {model.locked ? '???' : model.totalPredictions}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className="font-mono-data font-semibold text-sm text-foreground/90">
                        {model.locked ? '???' : model.correctPredictions}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className="font-mono-data font-semibold text-sm text-foreground/50">
                        {model.locked ? '???' : model.wrongPredictions}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className="font-mono-data text-sm text-foreground/70">
                        {model.locked ? '???' : '+' + model.bestStreak}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className="font-mono-data text-sm text-foreground/80">
                        {model.locked ? '???' : model.avgConfidence + '%'}
                      </span>
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
                <h3 className="text-sm font-bold mb-4 text-white/80">{t('winning_model').toUpperCase()}</h3>
                <div className="flex items-center gap-3 mb-6">
                  <img src={getModelIcon(winningModel.id)} alt={winningModel.name} className="h-10 w-10" />
                  <span className="text-xl font-bold text-white">{winningModel.displayName}</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-white/70 mb-1">{t('win_rate_label').toUpperCase()}</p>
                    <p className="text-2xl font-bold font-mono-data text-white">
                      <AnimatedWinRate 
                        value={winningModel.winRate}
                        className="text-2xl font-bold font-mono-data text-white"
                      />
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/70 mb-1">{t('correct_predictions_label').toUpperCase()}</p>
                    <p className="text-xl font-bold font-mono-data text-success">
                      {winningModel.correctPredictions} / {winningModel.totalPredictions}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/70 mb-3">{t('active_matches').toUpperCase()}</p>
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
                          <AnimatedWinRate 
                            value={model.winRate}
                            className="text-sm font-mono-data font-bold"
                          />
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

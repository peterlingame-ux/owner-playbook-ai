import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Equal, Lock, LayoutGrid, List } from "lucide-react";
import { aiModels, upcomingMatches, matchPredictions } from "@/data/mockData";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import deepseekIcon from "@/assets/deepseek-icon.png";
import openaiIcon from "@/assets/openai-icon.png";
import claudeIcon from "@/assets/claude-icon.png";
import geminiIcon from "@/assets/gemini-icon.png";
import grokIcon from "@/assets/grok-icon.png";

const AI_ICONS: Record<string, string> = {
  deepseek: deepseekIcon,
  gpt5: openaiIcon,
  claude: claudeIcon,
  gemini: geminiIcon,
  grok: grokIcon,
};

const ActivePredictions = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isCompactView, setIsCompactView] = useState(false);
  
  // Get all matches with predictions
  const activeMatches = upcomingMatches.filter(m => 
    (m.status === 'live' || m.status === 'upcoming') && matchPredictions[m.id]
  );

  // Group matches by status and date
  const liveMatches = activeMatches.filter(m => m.status === 'live');
  const todayMatches = activeMatches.filter(m => {
    const today = new Date().toISOString().split('T')[0];
    return m.status === 'upcoming' && m.date === today;
  });
  const upcomingMatchesList = activeMatches.filter(m => {
    const today = new Date().toISOString().split('T')[0];
    return m.status === 'upcoming' && m.date !== today;
  });
  
  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('loading')}</p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">{t('login_required')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('login_prompt')}
            </p>
            <Button onClick={() => navigate("/auth")}>
              {t('login_now')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (activeMatches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('no_active_predictions')}</p>
      </div>
    );
  }

  const getPredictionIcon = (prediction: string) => {
    if (prediction === "HOME_WIN") return <TrendingUp className="h-4 w-4 text-success" />;
    if (prediction === "AWAY_WIN") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Equal className="h-4 w-4 text-warning" />;
  };

  const getPredictionText = (prediction: string, match: typeof activeMatches[0]) => {
    if (prediction === "HOME_WIN") return match.homeTeam;
    if (prediction === "AWAY_WIN") return match.awayTeam;
    return t('draw');
  };

  const getPredictionColor = (prediction: string) => {
    if (prediction === "HOME_WIN") return "text-success";
    if (prediction === "AWAY_WIN") return "text-destructive";
    return "text-warning";
  };

  const renderMatches = (matches: typeof activeMatches) => {
    if (matches.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t('no_matches')}</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[600px] pr-4">
        <div className={isCompactView ? "space-y-4" : "space-y-8"}>
          {matches.map((match) => {
            const predictions = matchPredictions[match.id] || [];
            
            if (isCompactView) {
              return (
                <Card key={match.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">
                            {match.homeTeam} {t('vs_text')} {match.awayTeam}
                          </h3>
                          <Badge variant={match.status === 'live' ? 'destructive' : 'outline'} className="ml-2">
                            {match.status === 'live' ? t('live') : t('upcoming_match')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {match.date} {t('at')} {match.time} • {match.league}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {predictions.map((pred) => {
                        const aiModel = aiModels.find(m => m.id === pred.aiId);
                        if (!aiModel) return null;

                        return (
                          <div key={`${match.id}-${pred.aiId}`} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                            <img 
                              src={AI_ICONS[pred.aiId]} 
                              alt={aiModel.name}
                              className="w-6 h-6 object-contain flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                {getPredictionIcon(pred.prediction)}
                                <span className={`text-xs font-bold truncate ${getPredictionColor(pred.prediction)}`}>
                                  {getPredictionText(pred.prediction, match)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{pred.confidence}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div key={match.id} className="space-y-6">
                {/* Match Info Header */}
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl mb-2">
                          {match.homeTeam} {t('vs_text')} {match.awayTeam}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {match.date} {t('at')} {match.time} • {match.league}
                        </p>
                      </div>
                      <Badge variant={match.status === 'live' ? 'destructive' : 'outline'}>
                        {match.status === 'live' ? t('live') : t('upcoming_match')}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* AI Predictions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {predictions.map((pred) => {
                    const aiModel = aiModels.find(m => m.id === pred.aiId);
                    if (!aiModel) return null;

                    return (
                      <Card key={`${match.id}-${pred.aiId}`} className="hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {/* AI Icon */}
                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                              <img 
                                src={AI_ICONS[pred.aiId]} 
                                alt={aiModel.name}
                                className="w-8 h-8 object-contain"
                              />
                            </div>

                            {/* Prediction Details */}
                            <div className="flex-1">
                              <h3 className="font-bold text-sm mb-2">{aiModel.displayName}</h3>
                              
                              <div className="flex items-center gap-2 mb-2">
                                {getPredictionIcon(pred.prediction)}
                                <span className={`font-bold ${getPredictionColor(pred.prediction)}`}>
                                  {getPredictionText(pred.prediction, match)}
                                </span>
                              </div>

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>{t('confidence')}:</span>
                                  <span className="font-bold text-foreground">{pred.confidence}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t('win_rate')}:</span>
                                  <span className="font-bold text-foreground">{aiModel.winRate.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Prediction Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('prediction_summary')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-success">
                          {predictions.filter(p => p.prediction === "HOME_WIN").length}
                        </p>
                        <p className="text-sm text-muted-foreground">{match.homeTeam}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning">
                          {predictions.filter(p => p.prediction === "DRAW").length}
                        </p>
                        <p className="text-sm text-muted-foreground">{t('draw')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">
                          {predictions.filter(p => p.prediction === "AWAY_WIN").length}
                        </p>
                        <p className="text-sm text-muted-foreground">{match.awayTeam}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end gap-2">
        <Button 
          variant={isCompactView ? "outline" : "default"} 
          size="sm"
          onClick={() => setIsCompactView(false)}
        >
          <LayoutGrid className="w-4 h-4 mr-2" />
          {t('detailed_view')}
        </Button>
        <Button 
          variant={isCompactView ? "default" : "outline"} 
          size="sm"
          onClick={() => setIsCompactView(true)}
        >
          <List className="w-4 h-4 mr-2" />
          {t('compact_view')}
        </Button>
      </div>

      {/* Tabs for organizing matches */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            {t('all_matches')} ({activeMatches.length})
          </TabsTrigger>
          <TabsTrigger value="live">
            {t('live')} ({liveMatches.length})
          </TabsTrigger>
          <TabsTrigger value="today">
            {t('today')} ({todayMatches.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            {t('later')} ({upcomingMatchesList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderMatches(activeMatches)}
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          {renderMatches(liveMatches)}
        </TabsContent>

        <TabsContent value="today" className="mt-6">
          {renderMatches(todayMatches)}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          {renderMatches(upcomingMatchesList)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ActivePredictions;

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { upcomingMatches } from "@/data/mockData";
import { Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const LiveMatches = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{t('liveMatches.title').toUpperCase()}</h2>
        <Badge variant="outline" className="bg-success/20 text-success border-success/50">
          {t('liveMatches.live').toUpperCase()}
        </Badge>
      </div>
      
      <div className="space-y-4">
        {upcomingMatches.map((match) => (
          <div 
            key={match.id} 
            className="p-4 rounded-lg border border-border bg-secondary/50 hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/match/${match.id}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="text-xs">
                {match.league}
              </Badge>
              {match.status === "upcoming" ? (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(match.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {match.time}
                  </div>
                </div>
              ) : (
                <Badge variant="default" className="bg-success/20 text-success border-success/50 animate-pulse">
                  {t('liveMatches.live').toUpperCase()}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold">{match.homeTeam}</p>
              </div>
              
              {match.status === "upcoming" ? (
                <div className="px-4 text-muted-foreground font-bold">{t('liveMatches.vs').toUpperCase()}</div>
              ) : (
                <div className="px-4 flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono-data text-primary">{match.homeScore}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-2xl font-bold font-mono-data text-primary">{match.awayScore}</span>
                </div>
              )}
              
              <div className="flex-1 text-right">
                <p className="font-semibold">{match.awayTeam}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LiveMatches;

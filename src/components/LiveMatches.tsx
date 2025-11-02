import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { upcomingMatches } from "@/data/mockData";
import { Calendar, Clock, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LiveMatches = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{t('upcoming_matches')}</h2>
        <Badge variant="outline" className="bg-success/20 text-success border-success/50">
          {t('live')}
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
              <div className="flex items-center gap-2">
                {match.leagueLogo && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={match.leagueLogo} alt={match.league} />
                    <AvatarFallback><Trophy size={14} /></AvatarFallback>
                  </Avatar>
                )}
                <Badge variant="secondary" className="text-xs">
                  {match.league}
                </Badge>
              </div>
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
                  {t('live')}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {match.homeLogo && (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={match.homeLogo} alt={match.homeTeam} />
                    <AvatarFallback>{match.homeTeam.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                )}
                <p className="font-semibold">{match.homeTeam}</p>
              </div>
              
              {match.status === "upcoming" ? (
                <div className="px-4 text-muted-foreground font-bold">VS</div>
              ) : (
                <div className="px-4 flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono-data text-primary">{match.homeScore}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-2xl font-bold font-mono-data text-primary">{match.awayScore}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 flex-1 justify-end">
                <p className="font-semibold text-right">{match.awayTeam}</p>
                {match.awayLogo && (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={match.awayLogo} alt={match.awayTeam} />
                    <AvatarFallback>{match.awayTeam.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LiveMatches;

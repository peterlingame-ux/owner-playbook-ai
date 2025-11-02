import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { upcomingMatches } from "@/data/mockData";
import { Calendar, Clock } from "lucide-react";

const LiveMatches = () => {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">UPCOMING MATCHES</h2>
        <Badge variant="outline" className="bg-success/20 text-success border-success/50">
          LIVE
        </Badge>
      </div>
      
      <div className="space-y-4">
        {upcomingMatches.map((match) => (
          <div 
            key={match.id} 
            className="p-4 rounded-lg border border-border bg-secondary/50 hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="text-xs">
                {match.league}
              </Badge>
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
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold">{match.homeTeam}</p>
              </div>
              <div className="px-4 text-muted-foreground font-bold">VS</div>
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

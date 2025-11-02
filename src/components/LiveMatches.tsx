import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { upcomingMatches } from "@/data/mockData";
import { Calendar, Clock, Trophy, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import footballFieldBg from "@/assets/football-field-bg.jpg";

const LiveMatches = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const getMatchPeriodText = (period?: string) => {
    switch(period) {
      case "first_half": return "上半场";
      case "half_time": return "中场休息";
      case "second_half": return "下半场";
      case "full_time": return "全场结束";
      default: return "";
    }
  };
  
  return (
    <Card className="p-6 bg-card border-border h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{t('upcoming_matches')}</h2>
        <Badge variant="outline" className="bg-success/20 text-success border-success/50">
          {t('live')}
        </Badge>
      </div>
      
      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
        {upcomingMatches.map((match) => (
          <div 
            key={match.id} 
            className="relative rounded-lg border border-border overflow-hidden group cursor-pointer"
            onClick={() => navigate(`/match/${match.id}`)}
          >
            {/* Football Field Background */}
            <div 
              className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity duration-300"
              style={{
                backgroundImage: `url(${footballFieldBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/85 to-background/90" />
            
            {/* Content */}
            <div className="relative z-10 p-4">
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
                
                <div className="flex items-center gap-3">
                  {match.status === "upcoming" ? (
                    <>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(match.date).toLocaleDateString('zh-CN')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {match.time}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        未开始
                      </Badge>
                    </>
                  ) : (
                    <>
                      {match.matchPeriod && (
                        <Badge variant="secondary" className="text-xs">
                          {getMatchPeriodText(match.matchPeriod)}
                        </Badge>
                      )}
                      {match.currentMinute && (
                        <Badge variant="outline" className="text-xs font-mono-data">
                          {match.currentMinute}'
                        </Badge>
                      )}
                      <Badge variant="default" className="bg-success/20 text-success border-success/50 animate-pulse">
                        {t('live')}
                      </Badge>
                      {match.liveStreamUrl && (
                        <Button 
                          size="sm" 
                          className="h-6 px-2 gap-1 bg-success/20 hover:bg-success/30 text-success border-success/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(match.liveStreamUrl, '_blank');
                          }}
                        >
                          <Radio size={12} />
                          直播
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  {match.homeLogo && (
                    <Avatar className="h-10 w-10 ring-2 ring-background">
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
                    <Avatar className="h-10 w-10 ring-2 ring-background">
                      <AvatarImage src={match.awayLogo} alt={match.awayTeam} />
                      <AvatarFallback>{match.awayTeam.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
              
              {/* Match Statistics */}
              {match.status === "live" && (
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/50">
                  {/* Yellow Cards */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
                      <span className="font-mono-data font-bold">{match.homeYellowCards || 0}</span>
                    </div>
                    <span className="text-muted-foreground">黄牌</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono-data font-bold">{match.awayYellowCards || 0}</span>
                      <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
                    </div>
                  </div>
                  
                  {/* Red Cards */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-4 bg-red-500 rounded-sm" />
                      <span className="font-mono-data font-bold">{match.homeRedCards || 0}</span>
                    </div>
                    <span className="text-muted-foreground">红牌</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono-data font-bold">{match.awayRedCards || 0}</span>
                      <div className="w-3 h-4 bg-red-500 rounded-sm" />
                    </div>
                  </div>
                  
                  {/* Corners */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-mono-data font-bold">{match.homeCorners || 0}</span>
                    </div>
                    <span className="text-muted-foreground">角球</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono-data font-bold">{match.awayCorners || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LiveMatches;

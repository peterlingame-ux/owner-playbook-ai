import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { upcomingMatches } from "@/data/mockData";
import { Calendar, Clock, Trophy, Radio, Sun, CloudRain, Cloud, Snowflake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import weatherSunny from "@/assets/weather-sunny.jpg";
import weatherRainy from "@/assets/weather-rainy.jpg";
import weatherCloudy from "@/assets/weather-cloudy.jpg";
import weatherSnowy from "@/assets/weather-snowy.jpg";

const LiveMatches = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const getMatchPeriodText = (period?: string) => {
    switch(period) {
      case "first_half": return "FIRST HALF";
      case "half_time": return "HALF TIME";
      case "second_half": return "SECOND HALF";
      case "full_time": return "FULL TIME";
      default: return "";
    }
  };

  const getWeatherBackground = (weather?: string) => {
    switch(weather) {
      case "sunny":
        return weatherSunny;
      case "rainy":
        return weatherRainy;
      case "cloudy":
        return weatherCloudy;
      case "snowy":
        return weatherSnowy;
      default:
        return weatherSunny;
    }
  };

  const getWeatherIcon = (weather?: string) => {
    switch(weather) {
      case "sunny":
        return <Sun className="h-4 w-4 text-yellow-400" />;
      case "rainy":
        return <CloudRain className="h-4 w-4 text-blue-400" />;
      case "cloudy":
        return <Cloud className="h-4 w-4 text-gray-400" />;
      case "snowy":
        return <Snowflake className="h-4 w-4 text-blue-200" />;
      default:
        return <Sun className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getWeatherText = (weather?: string) => {
    switch(weather) {
      case "sunny":
        return "SUNNY";
      case "rainy":
        return "RAINY";
      case "cloudy":
        return "CLOUDY";
      case "snowy":
        return "SNOWY";
      default:
        return "SUNNY";
    }
  };
  
  return (
    <Card className="p-3 sm:p-6 bg-card border-border h-full">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold">{t('upcoming_matches')}</h2>
        <Badge variant="outline" className="bg-success/20 text-success border-success/50 text-xs">
          {t('live')}
        </Badge>
      </div>
      
      <div className="space-y-3 sm:space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
        {upcomingMatches.map((match) => (
          <div 
            key={match.id} 
            className="relative rounded-lg border border-border overflow-hidden group cursor-pointer"
            onClick={() => navigate(`/match/${match.id}`)}
          >
            {/* Weather-based Background */}
            <div 
              className="absolute inset-0 opacity-90 group-hover:opacity-95 transition-opacity duration-300"
              style={{
                backgroundImage: `url(${getWeatherBackground(match.weather)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            
            {/* Gradient Overlay - much lighter for maximum weather visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/65 via-background/35 to-background/45" />
            
            {/* Content */}
            <div className="relative z-10 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
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
                        UPCOMING
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
                          className="h-6 px-2 gap-1 bg-success/20 hover:bg-success/30 text-success border-success/50 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(match.liveStreamUrl, '_blank');
                          }}
                        >
                          <Radio size={12} />
                          LIVE
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {match.homeLogo && (
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-background flex-shrink-0">
                      <AvatarImage src={match.homeLogo} alt={match.homeTeam} />
                      <AvatarFallback>{match.homeTeam.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                  )}
                  <p className="font-semibold text-sm sm:text-base truncate">{match.homeTeam}</p>
                </div>
                
                {match.status === "upcoming" ? (
                  <div className="px-2 sm:px-4 text-muted-foreground font-bold text-sm sm:text-base flex-shrink-0">VS</div>
                ) : (
                  <div className="px-2 sm:px-4 flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold font-mono-data text-primary">{match.homeScore}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-xl sm:text-2xl font-bold font-mono-data text-primary">{match.awayScore}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-right truncate">{match.awayTeam}</p>
                  {match.awayLogo && (
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-background flex-shrink-0">
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
                    <span className="text-muted-foreground">YELLOW</span>
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
                    <span className="text-muted-foreground">RED</span>
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
                    <span className="text-muted-foreground">CORNER</span>
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

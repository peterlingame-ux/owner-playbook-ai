import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Clock, MapPin, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'live' | 'halftime' | 'finished';
  league: string;
  venue?: string;
}

// Mock live matches data
const mockLiveMatches: LiveMatch[] = [
  {
    id: '1',
    homeTeam: '曼联',
    awayTeam: '利物浦',
    homeScore: 2,
    awayScore: 1,
    minute: 67,
    status: 'live',
    league: '英超',
    venue: '老特拉福德球场'
  },
  {
    id: '2',
    homeTeam: '巴塞罗那',
    awayTeam: '皇马',
    homeScore: 1,
    awayScore: 1,
    minute: 45,
    status: 'halftime',
    league: '西甲',
    venue: '诺坎普球场'
  },
  {
    id: '3',
    homeTeam: '拜仁慕尼黑',
    awayTeam: '多特蒙德',
    homeScore: 3,
    awayScore: 0,
    minute: 78,
    status: 'live',
    league: '德甲',
    venue: '安联球场'
  },
  {
    id: '4',
    homeTeam: '巴黎圣日耳曼',
    awayTeam: '马赛',
    homeScore: 2,
    awayScore: 2,
    minute: 90,
    status: 'finished',
    league: '法甲',
    venue: '王子公园球场'
  }
];

const LiveMatchTracker = () => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<LiveMatch[]>(mockLiveMatches);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto rotate through matches
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % matches.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [matches.length]);

  // Simulate live score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMatches(prev => prev.map(match => {
        if (match.status === 'live' && match.minute < 90) {
          return { ...match, minute: match.minute + 1 };
        }
        return match;
      }));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500';
      case 'halftime': return 'bg-yellow-500';
      case 'finished': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return '直播中';
      case 'halftime': return '中场';
      case 'finished': return '已结束';
      default: return '';
    }
  };

  const liveCount = matches.filter(m => m.status === 'live').length;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <h3 className="font-semibold text-foreground text-sm sm:text-base">
            HUNSOCCER 实时比赛追踪
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span>{liveCount} 场比赛进行中</span>
        </div>
      </div>

      {/* Match Cards */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {matches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-3 rounded-lg bg-background/50 border transition-all duration-300 hover:border-primary/50 hover:shadow-md ${
                match.status === 'live' ? 'border-red-500/30' : 'border-border/30'
              }`}
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {match.league}
                </span>
                <div className="flex items-center gap-1">
                  {match.status === 'live' && (
                    <span className="text-[10px] text-red-500 font-medium">
                      {match.minute}'
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium text-white ${getStatusColor(match.status)}`}>
                    {getStatusText(match.status)}
                  </span>
                </div>
              </div>

              {/* Teams & Score */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {match.homeTeam}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
                  <span className={`text-sm font-bold ${match.homeScore > match.awayScore ? 'text-green-500' : 'text-foreground'}`}>
                    {match.homeScore}
                  </span>
                  <span className="text-muted-foreground text-xs">-</span>
                  <span className={`text-sm font-bold ${match.awayScore > match.homeScore ? 'text-green-500' : 'text-foreground'}`}>
                    {match.awayScore}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-medium text-foreground truncate">
                    {match.awayTeam}
                  </p>
                </div>
              </div>

              {/* Venue */}
              {match.venue && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{match.venue}</span>
                </div>
              )}

              {/* Live indicator animation */}
              {match.status === 'live' && (
                <div className="absolute inset-0 rounded-lg pointer-events-none">
                  <div className="absolute inset-0 rounded-lg border border-red-500/20 animate-pulse" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer with navigation dots */}
      <div className="flex items-center justify-center gap-1.5 pb-3">
        {matches.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === currentIndex ? 'bg-primary w-3' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default LiveMatchTracker;

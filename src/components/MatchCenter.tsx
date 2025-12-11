import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Flame, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// 虚拟比赛数据
interface VirtualMatch {
  id: string;
  league: string;
  leagueColor: string;
  time: string;
  minute?: string;
  status: 'live' | 'upcoming' | 'finished';
  homeTeam: string;
  homeRank?: number;
  homeScore?: number;
  homeYellowCards?: number;
  homeRedCards?: number;
  awayTeam: string;
  awayRank?: number;
  awayScore?: number;
  awayYellowCards?: number;
  awayRedCards?: number;
  halfTimeScore?: string;
  corners?: string;
  matchCode: string;
  heat: number;
  hasLineup: boolean;
  hasVip: boolean;
  hasAi: boolean;
  hasVideo: boolean;
  isFavorite: boolean;
  expert?: {
    name: string;
    avatar: string;
  };
  statusText?: string;
}

const virtualMatches: VirtualMatch[] = [
  {
    id: '1',
    league: '阿拉伯杯',
    leagueColor: 'text-destructive',
    time: '01:30',
    status: 'live',
    minute: '加',
    homeTeam: '巴勒斯坦',
    homeRank: 98,
    homeScore: 1,
    homeYellowCards: 2,
    awayTeam: '沙特阿拉伯',
    awayRank: 58,
    awayScore: 1,
    awayYellowCards: 2,
    halfTimeScore: '0-0',
    corners: '2-3',
    matchCode: '周四003',
    heat: 1.1,
    hasLineup: true,
    hasVip: false,
    hasAi: false,
    hasVideo: true,
    isFavorite: true,
    expert: {
      name: '大玮聊球',
      avatar: '/avatars/avatar-1.png'
    }
  },
  {
    id: '2',
    league: '欧联',
    leagueColor: 'text-destructive',
    time: '01:45',
    status: 'live',
    minute: '84',
    homeTeam: '卢多格雷茨',
    homeRank: 3,
    homeScore: 3,
    homeYellowCards: 3,
    awayTeam: '塞萨洛尼基',
    awayRank: 2,
    awayScore: 2,
    awayYellowCards: 1,
    halfTimeScore: '1-1',
    corners: '2-0',
    matchCode: '周四004',
    heat: 2.9,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: true,
    statusText: '90分钟[1-1]'
  },
  {
    id: '3',
    league: '欧联',
    leagueColor: 'text-destructive',
    time: '01:45',
    status: 'live',
    minute: '85',
    homeTeam: '乌德勒支',
    homeRank: 7,
    homeScore: 1,
    homeYellowCards: 1,
    awayTeam: '诺丁汉森林',
    awayRank: 17,
    awayScore: 1,
    awayYellowCards: 1,
    halfTimeScore: '0-0',
    corners: '5-5',
    matchCode: '周四006',
    heat: 3.1,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: true,
    expert: {
      name: '王旻',
      avatar: '/avatars/avatar-2.png'
    }
  },
  {
    id: '4',
    league: '欧联',
    leagueColor: 'text-destructive',
    time: '01:45',
    status: 'live',
    minute: '82',
    homeTeam: '尼斯',
    homeRank: 12,
    homeScore: 0,
    homeYellowCards: 3,
    awayTeam: '布拉加',
    awayRank: 5,
    awayScore: 1,
    awayYellowCards: 1,
    halfTimeScore: '0-1',
    corners: '4-3',
    matchCode: '周四005',
    heat: 1.9,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: true,
    expert: {
      name: '丰少解题',
      avatar: '/avatars/avatar-3.png'
    }
  },
  {
    id: '5',
    league: '欧联',
    leagueColor: 'text-destructive',
    time: '01:45',
    status: 'live',
    minute: '84',
    homeTeam: '年轻人',
    homeRank: 4,
    homeScore: 1,
    awayTeam: '里尔',
    awayRank: 4,
    awayScore: 0,
    awayYellowCards: 1,
    halfTimeScore: '0-0',
    corners: '1-1',
    matchCode: '周四010',
    heat: 1.8,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: true,
    expert: {
      name: '大海荐球',
      avatar: '/avatars/avatar-4.png'
    }
  },
  {
    id: '6',
    league: '英超',
    leagueColor: 'text-purple-500',
    time: '03:00',
    status: 'upcoming',
    homeTeam: '曼城',
    awayTeam: '利物浦',
    matchCode: '周四015',
    heat: 8.5,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: false
  },
  {
    id: '7',
    league: '西甲',
    leagueColor: 'text-orange-500',
    time: '04:00',
    status: 'upcoming',
    homeTeam: '皇家马德里',
    awayTeam: '巴塞罗那',
    matchCode: '周四018',
    heat: 12.3,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: true
  },
  {
    id: '8',
    league: '德甲',
    leagueColor: 'text-red-600',
    time: '22:30',
    status: 'finished',
    homeTeam: '拜仁慕尼黑',
    homeScore: 3,
    awayTeam: '多特蒙德',
    awayScore: 1,
    halfTimeScore: '2-0',
    corners: '8-4',
    matchCode: '周三001',
    heat: 5.2,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: false
  },
  {
    id: '9',
    league: '意甲',
    leagueColor: 'text-blue-500',
    time: '21:00',
    status: 'finished',
    homeTeam: 'AC米兰',
    homeScore: 2,
    awayTeam: '国际米兰',
    awayScore: 2,
    halfTimeScore: '1-1',
    corners: '5-6',
    matchCode: '周三002',
    heat: 4.8,
    hasLineup: true,
    hasVip: true,
    hasAi: true,
    hasVideo: true,
    isFavorite: true,
    expert: {
      name: '足球大师',
      avatar: '/avatars/avatar-5.png'
    }
  }
];

type TabType = 'all' | 'live' | 'upcoming' | 'finished' | 'favorites';

const MatchCenter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(virtualMatches.filter(m => m.isFavorite).map(m => m.id)));

  const toggleFavorite = (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const filteredMatches = virtualMatches.filter(match => {
    if (activeTab === 'all') return true;
    if (activeTab === 'live') return match.status === 'live';
    if (activeTab === 'upcoming') return match.status === 'upcoming';
    if (activeTab === 'finished') return match.status === 'finished';
    if (activeTab === 'favorites') return favorites.has(match.id);
    return true;
  });

  const favoritesCount = favorites.size;

  const MatchCard = ({ match }: { match: VirtualMatch }) => (
    <div 
      className="border-b border-border/30 py-3 px-3 hover:bg-muted/20 cursor-pointer transition-colors"
      onClick={() => navigate(`/match/${match.id}`)}
    >
      {/* 顶部行：联赛 + 时间 + 功能标签 + 热度 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${match.leagueColor}`}>{match.league}</span>
          <span className="text-xs text-muted-foreground">{match.time}</span>
        </div>
        <div className="flex items-center gap-2">
          {match.minute && (
            <span className="text-xs text-destructive font-medium">{match.minute}'</span>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {match.hasLineup && <span>阵容</span>}
            {match.hasVip && <span className="text-warning">VIP情报</span>}
            {match.hasAi && <span className="text-primary">AI</span>}
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-destructive" />
            <span className="text-xs text-destructive font-medium">{match.heat}万</span>
          </div>
        </div>
      </div>

      {/* 比赛主体行 */}
      <div className="flex items-center gap-2">
        {/* 收藏按钮 */}
        <button 
          onClick={(e) => toggleFavorite(match.id, e)}
          className="flex-shrink-0"
        >
          <Star className={`w-4 h-4 ${favorites.has(match.id) ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
        </button>

        {/* 主队信息 */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {match.homeYellowCards && match.homeYellowCards > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-yellow-500 text-black rounded-sm">
              {match.homeYellowCards}
            </span>
          )}
          {match.homeRedCards && match.homeRedCards > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-destructive text-white rounded-sm">
              {match.homeRedCards}
            </span>
          )}
          {match.homeRank && (
            <span className="text-[10px] text-muted-foreground">[{match.homeRank}]</span>
          )}
          <span className="text-sm font-medium text-foreground">{match.homeTeam}</span>
        </div>

        {/* 比分 */}
        <div className="flex-shrink-0 w-16 text-center">
          {match.status === 'upcoming' ? (
            <span className="text-sm text-muted-foreground">VS</span>
          ) : (
            <span className="text-lg font-bold text-destructive">
              {match.homeScore}-{match.awayScore}
            </span>
          )}
        </div>

        {/* 客队信息 */}
        <div className="flex-1 flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{match.awayTeam}</span>
          {match.awayRank && (
            <span className="text-[10px] text-muted-foreground">[{match.awayRank}]</span>
          )}
          {match.awayYellowCards && match.awayYellowCards > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-yellow-500 text-black rounded-sm">
              {match.awayYellowCards}
            </span>
          )}
          {match.awayRedCards && match.awayRedCards > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-destructive text-white rounded-sm">
              {match.awayRedCards}
            </span>
          )}
        </div>

        {/* 视频按钮 */}
        {match.hasVideo && (
          <button className="flex-shrink-0 w-8 h-8 rounded bg-destructive/20 flex items-center justify-center">
            <Play className="w-4 h-4 text-destructive fill-destructive" />
          </button>
        )}
      </div>

      {/* 底部行：比赛编号 + 半场/角球 */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">{match.matchCode}</span>
        {(match.halfTimeScore || match.corners) && (
          <span className="text-[10px] text-muted-foreground">
            {match.halfTimeScore && `半:${match.halfTimeScore}`}
            {match.halfTimeScore && match.corners && ' '}
            {match.corners && `角:${match.corners}`}
          </span>
        )}
      </div>

      {/* 状态文本（如90分钟） */}
      {match.statusText && (
        <div className="mt-2 py-1.5 bg-primary/10 rounded text-center">
          <span className="text-xs text-primary font-medium">{match.statusText}</span>
        </div>
      )}

      {/* 专家推荐 */}
      {match.expert && (
        <div className="flex items-center justify-center mt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full">
            <Avatar className="w-5 h-5">
              <AvatarImage src={match.expert.avatar} />
              <AvatarFallback className="text-[8px]">{match.expert.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-foreground font-medium">{match.expert.name}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="h-[600px] sm:h-[700px] flex flex-col border-border/60 bg-card/95 backdrop-blur">
      {/* 标签导航 */}
      <div className="flex items-center border-b border-border/50 px-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'all' ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          全部
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-destructive rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'live' ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          进行中
          {activeTab === 'live' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-destructive rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'upcoming' ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          赛程
          {activeTab === 'upcoming' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-destructive rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'finished' ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          赛果
          {activeTab === 'finished' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-destructive rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
            activeTab === 'favorites' ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          关注
          {favoritesCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-destructive text-white rounded-full">
              {favoritesCount}
            </span>
          )}
          {activeTab === 'favorites' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-destructive rounded-full" />
          )}
        </button>
      </div>

      {/* 比赛列表 */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/20">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              暂无比赛数据
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default MatchCenter;

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, ThumbsUp, ThumbsDown, ChevronRight, Users, BarChart2, UserCheck, CircleDot, Thermometer, Droplets, MapPin, Clock, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { Badge } from "@/components/ui/badge";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";

// 球员数据
interface Player {
  id: string;
  number: number;
  name: string;
  rating: number;
  position: string;
  isCaptain?: boolean;
  isSubstituted?: boolean;
  substitutedMinute?: number;
  hasGoal?: boolean;
  avatar?: string;
}

// 阵容数据
interface LineupData {
  formation: string;
  totalValue: string;
  averageAge: number;
  coach: string;
  startingXI: Player[];
  substitutes: Player[];
}

// 虚拟比赛详情数据
interface MatchEvent {
  minute: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'whistle';
  team: 'home' | 'away';
  description: string;
  player?: string;
}

interface MatchDetailInfo {
  id: string;
  league: string;
  leagueStage: string;
  date: string;
  time: string;
  status: 'live' | 'finished' | 'upcoming';
  minute?: string;
  venue?: {
    name: string;
    weather: string;
    temperature: number;
    humidity: number;
    referee: string;
  };
  homeTeam: {
    name: string;
    shortName: string;
    fifaRank: number;
    flag: string;
    score: number;
    halfTimeScore: number;
    extraTimeScore?: number;
    yellowCards: number;
    redCards: number;
    lineup?: LineupData;
  };
  awayTeam: {
    name: string;
    shortName: string;
    fifaRank: number;
    flag: string;
    score: number;
    halfTimeScore: number;
    extraTimeScore?: number;
    yellowCards: number;
    redCards: number;
    lineup?: LineupData;
  };
  stats: {
    homeAttacks: number;
    awayAttacks: number;
    homeDangerousAttacks: number;
    awayDangerousAttacks: number;
    homePossession: number;
    awayPossession: number;
    homeShotsOnTarget: number;
    awayShotsOnTarget: number;
    homeShotsOffTarget: number;
    awayShotsOffTarget: number;
    homeCorners: number;
    awayCorners: number;
  };
  events: MatchEvent[];
  supportRate: {
    home: number;
    away: number;
  };
  timeline: Array<{
    minute: number;
    homeIntensity: number;
    awayIntensity: number;
    event?: 'goal' | 'yellow' | 'red';
    team?: 'home' | 'away';
  }>;
  odds?: {
    handicap: OddsData[];
    euroOdds: EuroOddsData[];
    overUnder: OverUnderData[];
    corners: CornersData[];
  };
}

// 让球盘口数据
interface OddsData {
  bookmaker: string;
  initialHome: number;
  initialHandicap: number;
  initialAway: number;
  liveHome: number | null;
  liveHandicap: number | null;
  liveAway: number | null;
  isClosed: boolean;
}

// 欧赔数据
interface EuroOddsData {
  bookmaker: string;
  initialHome: number;
  initialDraw: number;
  initialAway: number;
  liveHome: number | null;
  liveDraw: number | null;
  liveAway: number | null;
  isClosed: boolean;
}

// 大小球数据
interface OverUnderData {
  bookmaker: string;
  initialOver: number;
  initialLine: number;
  initialUnder: number;
  liveOver: number | null;
  liveLine: number | null;
  liveUnder: number | null;
  isClosed: boolean;
}

// 角球数据
interface CornersData {
  bookmaker: string;
  initialOver: number;
  initialLine: number;
  initialUnder: number;
  liveOver: number | null;
  liveLine: number | null;
  liveUnder: number | null;
  isClosed: boolean;
}

const virtualMatchDetails: Record<string, MatchDetailInfo> = {
  '1': {
    id: '1',
    league: '阿拉伯杯',
    leagueStage: '1/4决赛',
    date: '2025/12/12',
    time: '01:30',
    status: 'live',
    minute: '加时',
    venue: {
      name: '卢赛尔体育场',
      weather: '局部有云',
      temperature: 23,
      humidity: 67,
      referee: '奥马尔'
    },
    homeTeam: {
      name: '巴勒斯坦',
      shortName: '巴勒斯坦',
      fifaRank: 98,
      flag: '🇵🇸',
      score: 1,
      halfTimeScore: 0,
      extraTimeScore: 1,
      yellowCards: 4,
      redCards: 0,
      lineup: {
        formation: '4-4-2',
        totalValue: '297.5万欧',
        averageAge: 28.3,
        coach: '贾扎尔',
        startingXI: [
          { id: '1', number: 22, name: '拉米', rating: 5.9, position: 'GK', avatar: '/avatars/avatar-1.png' },
          { id: '2', number: 7, name: '巴塔特', rating: 6.5, position: 'LB', isCaptain: true, avatar: '/avatars/avatar-2.png' },
          { id: '3', number: 15, name: '泰马尼尼', rating: 6.7, position: 'CB', avatar: '/avatars/avatar-3.png' },
          { id: '4', number: 3, name: '萨莱赫', rating: 7.2, position: 'CB', avatar: '/avatars/avatar-4.png' },
          { id: '5', number: 2, name: '纳布汉', rating: 6.1, position: 'RB', avatar: '/avatars/avatar-5.png' },
          { id: '6', number: 5, name: '阿米德·萨瓦塔', rating: 6.4, position: 'LM', avatar: '/avatars/avatar-6.png' },
          { id: '7', number: 20, name: '阿米德', rating: 6.0, position: 'CM', avatar: '/avatars/avatar-7.png' },
          { id: '8', number: 8, name: 'H.哈姆丹', rating: 6.3, position: 'CM', isSubstituted: true, substitutedMinute: 82, avatar: '/avatars/avatar-8.png' },
          { id: '9', number: 9, name: '赛亚姆', rating: 6.3, position: 'RM', isSubstituted: true, substitutedMinute: 60, avatar: '/avatars/avatar-9.png' },
          { id: '10', number: 21, name: 'Z.昆巴尔', rating: 6.2, position: 'CF', avatar: '/avatars/avatar-1.png' },
          { id: '11', number: 11, name: '达巴赫', rating: 7.6, position: 'CF', hasGoal: true, avatar: '/avatars/avatar-2.png' }
        ],
        substitutes: [
          { id: '12', number: 1, name: '艾哈迈德', rating: 0, position: 'GK', avatar: '/avatars/avatar-3.png' },
          { id: '13', number: 14, name: '穆萨', rating: 6.1, position: 'MF', avatar: '/avatars/avatar-4.png' },
          { id: '14', number: 16, name: '阿卜杜拉', rating: 0, position: 'DF', avatar: '/avatars/avatar-5.png' }
        ]
      }
    },
    awayTeam: {
      name: '沙特阿拉伯',
      shortName: '沙特阿拉伯',
      fifaRank: 58,
      flag: '🇸🇦',
      score: 1,
      halfTimeScore: 0,
      extraTimeScore: 1,
      yellowCards: 3,
      redCards: 0,
      lineup: {
        formation: '4-3-3',
        totalValue: '1370万欧',
        averageAge: 27,
        coach: '曼奇尼',
        startingXI: [
          { id: '1', number: 1, name: '阿尔奥瓦伊斯', rating: 6.8, position: 'GK', avatar: '/avatars/avatar-6.png' },
          { id: '2', number: 13, name: '阿尔布莱克', rating: 6.4, position: 'LB', avatar: '/avatars/avatar-7.png' },
          { id: '3', number: 4, name: '阿尔阿姆里', rating: 6.6, position: 'CB', avatar: '/avatars/avatar-8.png' },
          { id: '4', number: 5, name: '阿尔塔姆比蒂', rating: 6.5, position: 'CB', avatar: '/avatars/avatar-9.png' },
          { id: '5', number: 2, name: '阿尔甘纳姆', rating: 6.3, position: 'RB', avatar: '/avatars/avatar-1.png' },
          { id: '6', number: 7, name: '萨尔曼', rating: 7.0, position: 'LW', isCaptain: true, avatar: '/avatars/avatar-2.png' },
          { id: '7', number: 8, name: '阿尔道萨里', rating: 6.8, position: 'CM', avatar: '/avatars/avatar-3.png' },
          { id: '8', number: 14, name: '阿尔马尔基', rating: 6.5, position: 'CM', avatar: '/avatars/avatar-4.png' },
          { id: '9', number: 17, name: '阿尔哈桑', rating: 6.2, position: 'RW', avatar: '/avatars/avatar-5.png' },
          { id: '10', number: 9, name: '阿尔布雷坎', rating: 7.2, position: 'CF', hasGoal: true, avatar: '/avatars/avatar-6.png' },
          { id: '11', number: 11, name: '阿西里', rating: 6.6, position: 'CF', avatar: '/avatars/avatar-7.png' }
        ],
        substitutes: [
          { id: '12', number: 21, name: '阿尔亚米', rating: 0, position: 'GK', avatar: '/avatars/avatar-8.png' },
          { id: '13', number: 15, name: '阿尔纳吉', rating: 6.0, position: 'MF', avatar: '/avatars/avatar-9.png' },
          { id: '14', number: 19, name: '阿尔哈姆丹', rating: 0, position: 'FW', avatar: '/avatars/avatar-1.png' }
        ]
      }
    },
    stats: {
      homeAttacks: 105,
      awayAttacks: 174,
      homeDangerousAttacks: 50,
      awayDangerousAttacks: 74,
      homePossession: 38,
      awayPossession: 62,
      homeShotsOnTarget: 2,
      awayShotsOnTarget: 4,
      homeShotsOffTarget: 3,
      awayShotsOffTarget: 3,
      homeCorners: 2,
      awayCorners: 3
    },
    events: [
      { minute: '90\'', type: 'whistle', team: 'home', description: '随着裁判一声哨响，下半场结束，目前比分1-1' },
      { minute: '90+4\'', type: 'yellow_card', team: 'home', description: '第4张黄牌 - (巴勒斯坦)', player: '犯规' },
      { minute: '88\'', type: 'yellow_card', team: 'away', description: '第3张黄牌 - (沙特阿拉伯)', player: '犯规' },
      { minute: '75\'', type: 'goal', team: 'away', description: '沙特阿拉伯进球！' },
      { minute: '65\'', type: 'goal', team: 'home', description: '巴勒斯坦进球！' },
    ],
    supportRate: { home: 46, away: 54 },
    timeline: [
      { minute: 15, homeIntensity: 30, awayIntensity: 45 },
      { minute: 30, homeIntensity: 40, awayIntensity: 55 },
      { minute: 45, homeIntensity: 35, awayIntensity: 50 },
      { minute: 60, homeIntensity: 60, awayIntensity: 40, event: 'goal', team: 'home' },
      { minute: 75, homeIntensity: 45, awayIntensity: 70, event: 'goal', team: 'away' },
      { minute: 90, homeIntensity: 50, awayIntensity: 55, event: 'yellow', team: 'home' },
    ],
    odds: {
      handicap: [
        { bookmaker: '36*', initialHome: 0.97, initialHandicap: -0.75, initialAway: 0.82, liveHome: null, liveHandicap: null, liveAway: null, isClosed: true },
        { bookmaker: '皇*', initialHome: 0.92, initialHandicap: -0.75, initialAway: 0.9, liveHome: null, liveHandicap: null, liveAway: null, isClosed: true },
        { bookmaker: '易**', initialHome: 1.03, initialHandicap: -0.75, initialAway: 0.79, liveHome: null, liveHandicap: null, liveAway: null, isClosed: true },
        { bookmaker: '澳*', initialHome: 0.9, initialHandicap: -0.75, initialAway: 0.88, liveHome: 0.3, liveHandicap: -0.25, liveAway: 1.46, isClosed: false },
        { bookmaker: '韦*', initialHome: 0.79, initialHandicap: -0.75, initialAway: 0.94, liveHome: 2.05, liveHandicap: 0.0, liveAway: 0.34, isClosed: false },
        { bookmaker: 'Inter*', initialHome: 1.05, initialHandicap: -0.5, initialAway: 0.7, liveHome: 0.65, liveHandicap: -1.0, liveAway: 1.1, isClosed: false },
        { bookmaker: '12*', initialHome: 0.95, initialHandicap: -0.75, initialAway: 0.75, liveHome: null, liveHandicap: null, liveAway: null, isClosed: true },
        { bookmaker: '利*', initialHome: 0.93, initialHandicap: -0.75, initialAway: 0.91, liveHome: 2.08, liveHandicap: 0.0, liveAway: 0.38, isClosed: false },
        { bookmaker: '18*', initialHome: 0.93, initialHandicap: -0.75, initialAway: 0.91, liveHome: null, liveHandicap: null, liveAway: null, isClosed: true },
        { bookmaker: '盈*', initialHome: 0.99, initialHandicap: -0.75, initialAway: 0.83, liveHome: null, liveHandicap: null, liveAway: null, isClosed: true },
        { bookmaker: '明*', initialHome: 0.96, initialHandicap: -0.75, initialAway: 0.8, liveHome: 2.17, liveHandicap: 0.0, liveAway: 0.36, isClosed: false },
      ],
      euroOdds: [
        { bookmaker: '36*', initialHome: 2.45, initialDraw: 3.20, initialAway: 2.80, liveHome: 2.10, liveDraw: 3.50, liveAway: 3.20, isClosed: false },
        { bookmaker: '皇*', initialHome: 2.50, initialDraw: 3.15, initialAway: 2.75, liveHome: 2.15, liveDraw: 3.45, liveAway: 3.15, isClosed: false },
        { bookmaker: '易**', initialHome: 2.40, initialDraw: 3.25, initialAway: 2.85, liveHome: null, liveDraw: null, liveAway: null, isClosed: true },
        { bookmaker: '澳*', initialHome: 2.48, initialDraw: 3.18, initialAway: 2.78, liveHome: 2.12, liveDraw: 3.48, liveAway: 3.18, isClosed: false },
        { bookmaker: '韦*', initialHome: 2.42, initialDraw: 3.22, initialAway: 2.82, liveHome: 2.08, liveDraw: 3.52, liveAway: 3.22, isClosed: false },
      ],
      overUnder: [
        { bookmaker: '36*', initialOver: 0.95, initialLine: 2.5, initialUnder: 0.85, liveOver: 1.20, liveLine: 2.5, liveUnder: 0.65, isClosed: false },
        { bookmaker: '皇*', initialOver: 0.92, initialLine: 2.5, initialUnder: 0.88, liveOver: 1.18, liveLine: 2.5, liveUnder: 0.68, isClosed: false },
        { bookmaker: '易**', initialOver: 0.98, initialLine: 2.5, initialUnder: 0.82, liveOver: null, liveLine: null, liveUnder: null, isClosed: true },
        { bookmaker: '澳*', initialOver: 0.90, initialLine: 2.5, initialUnder: 0.90, liveOver: 1.15, liveLine: 2.5, liveUnder: 0.70, isClosed: false },
        { bookmaker: '韦*', initialOver: 0.88, initialLine: 2.5, initialUnder: 0.92, liveOver: 1.12, liveLine: 2.5, liveUnder: 0.72, isClosed: false },
      ],
      corners: [
        { bookmaker: '36*', initialOver: 0.88, initialLine: 9.5, initialUnder: 0.92, liveOver: 0.95, liveLine: 9.5, liveUnder: 0.85, isClosed: false },
        { bookmaker: '皇*', initialOver: 0.90, initialLine: 9.5, initialUnder: 0.90, liveOver: 0.98, liveLine: 9.5, liveUnder: 0.82, isClosed: false },
        { bookmaker: '易**', initialOver: 0.85, initialLine: 9.5, initialUnder: 0.95, liveOver: null, liveLine: null, liveUnder: null, isClosed: true },
        { bookmaker: '澳*', initialOver: 0.87, initialLine: 9.5, initialUnder: 0.93, liveOver: 0.92, liveLine: 9.5, liveUnder: 0.88, isClosed: false },
      ]
    }
  },
  '2': {
    id: '2',
    league: '欧联',
    leagueStage: '小组赛',
    date: '2025/12/12',
    time: '01:45',
    status: 'live',
    minute: '84\'',
    homeTeam: {
      name: '卢多格雷茨',
      shortName: '卢多格雷茨',
      fifaRank: 0,
      flag: '🇧🇬',
      score: 3,
      halfTimeScore: 1,
      yellowCards: 3,
      redCards: 0
    },
    awayTeam: {
      name: '塞萨洛尼基',
      shortName: '塞萨洛尼基',
      fifaRank: 0,
      flag: '🇬🇷',
      score: 2,
      halfTimeScore: 1,
      yellowCards: 1,
      redCards: 0
    },
    stats: {
      homeAttacks: 88,
      awayAttacks: 92,
      homeDangerousAttacks: 45,
      awayDangerousAttacks: 48,
      homePossession: 48,
      awayPossession: 52,
      homeShotsOnTarget: 5,
      awayShotsOnTarget: 3,
      homeShotsOffTarget: 4,
      awayShotsOffTarget: 5,
      homeCorners: 5,
      awayCorners: 4
    },
    events: [
      { minute: '80\'', type: 'goal', team: 'home', description: '卢多格雷茨进球！比分变为3-2' },
      { minute: '72\'', type: 'yellow_card', team: 'home', description: '黄牌警告' },
      { minute: '65\'', type: 'goal', team: 'away', description: '塞萨洛尼基进球！' },
    ],
    supportRate: { home: 52, away: 48 },
    timeline: [
      { minute: 15, homeIntensity: 40, awayIntensity: 45 },
      { minute: 30, homeIntensity: 55, awayIntensity: 50 },
      { minute: 45, homeIntensity: 50, awayIntensity: 55, event: 'goal', team: 'home' },
      { minute: 60, homeIntensity: 45, awayIntensity: 60 },
      { minute: 75, homeIntensity: 65, awayIntensity: 50, event: 'goal', team: 'home' },
      { minute: 90, homeIntensity: 50, awayIntensity: 55 },
    ]
  }
};

// 生成默认比赛详情
const generateDefaultMatch = (id: string): MatchDetailInfo => ({
  id,
  league: '友谊赛',
  leagueStage: '',
  date: '2025/12/12',
  time: '20:00',
  status: 'upcoming',
  homeTeam: {
    name: '主队',
    shortName: '主队',
    fifaRank: 50,
    flag: '🏳️',
    score: 0,
    halfTimeScore: 0,
    yellowCards: 0,
    redCards: 0
  },
  awayTeam: {
    name: '客队',
    shortName: '客队',
    fifaRank: 60,
    flag: '🏴',
    score: 0,
    halfTimeScore: 0,
    yellowCards: 0,
    redCards: 0
  },
  stats: {
    homeAttacks: 0,
    awayAttacks: 0,
    homeDangerousAttacks: 0,
    awayDangerousAttacks: 0,
    homePossession: 50,
    awayPossession: 50,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeShotsOffTarget: 0,
    awayShotsOffTarget: 0,
    homeCorners: 0,
    awayCorners: 0
  },
  events: [],
  supportRate: { home: 50, away: 50 },
  timeline: []
});

type TabType = 'live' | 'lineup' | 'odds' | 'expert';

export default function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [match, setMatch] = useState<MatchDetailInfo | null>(null);

  useEffect(() => {
    if (matchId) {
      const matchData = virtualMatchDetails[matchId] || generateDefaultMatch(matchId);
      setMatch(matchData);
    }
  }, [matchId]);

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const CircularProgress = ({ homeValue, awayValue, label }: { homeValue: number; awayValue: number; label: string }) => {
    const total = homeValue + awayValue || 1;
    const awayPercent = (awayValue / total) * 100;
    const strokeDasharray = 2 * Math.PI * 28;
    const strokeDashoffset = strokeDasharray * (1 - awayPercent / 100);

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            <circle 
              cx="32" cy="32" r="28" 
              fill="none" 
              stroke="hsl(var(--warning))" 
              strokeWidth="4"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1">{label}</span>
        <div className="flex items-center gap-2 text-xs mt-0.5">
          <span className="text-foreground font-medium">{homeValue}</span>
          <span className="text-foreground font-medium">{awayValue}</span>
        </div>
      </div>
    );
  };

  const StatBar = ({ homeValue, awayValue, label, reverse = false }: { homeValue: number; awayValue: number; label: string; reverse?: boolean }) => {
    const max = Math.max(homeValue, awayValue, 1);
    const homeWidth = (homeValue / max) * 100;
    const awayWidth = (awayValue / max) * 100;

    return (
      <div className="space-y-1">
        <div className="text-center text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium w-4 text-right">{homeValue}</span>
          <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden flex flex-row-reverse">
            <div 
              className={`h-full ${reverse ? 'bg-warning' : 'bg-destructive'} transition-all`}
              style={{ width: `${homeWidth}%` }}
            />
          </div>
          <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className={`h-full ${reverse ? 'bg-warning' : 'bg-warning'} transition-all`}
              style={{ width: `${awayWidth}%` }}
            />
          </div>
          <span className="text-xs font-medium w-4">{awayValue}</span>
        </div>
      </div>
    );
  };

  // 球员节点组件
  const PlayerNode = ({ player, isAway = false }: { player: Player; isAway?: boolean }) => {
    const getRatingColor = (rating: number) => {
      if (rating >= 7.5) return 'bg-green-500';
      if (rating >= 6.5) return 'bg-primary';
      if (rating >= 5.5) return 'bg-yellow-500';
      return 'bg-muted';
    };

    return (
      <div className="flex flex-col items-center w-16">
        <div className="relative">
          {/* 球员号码 */}
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-[9px] text-white font-bold z-10">
            {player.number}
          </div>
          {/* 头像 */}
          <Avatar className="w-10 h-10 border-2 border-white/30">
            <AvatarImage src={player.avatar} />
            <AvatarFallback className="text-xs bg-muted">{player.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {/* 队长标记 */}
          {player.isCaptain && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center text-[8px] text-black font-bold">
              C
            </div>
          )}
          {/* 被换下标记 */}
          {player.isSubstituted && (
            <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-destructive/80 rounded px-1 text-[8px] text-white">
              <ArrowLeft className="w-2 h-2" />
              {player.substitutedMinute}'
            </div>
          )}
          {/* 进球标记 */}
          {player.hasGoal && (
            <div className="absolute -bottom-1 -left-1 text-sm">⚽</div>
          )}
        </div>
        {/* 球员名字 */}
        <span className="text-[10px] text-white mt-1 text-center truncate w-full">{player.name}</span>
        {/* 评分 */}
        {player.rating > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded text-white font-medium ${getRatingColor(player.rating)}`}>
            {player.rating.toFixed(1)}
          </span>
        )}
      </div>
    );
  };

  // 赔率标签页组件
  const OddsTab = ({ match }: { match: MatchDetailInfo }) => {
    const [oddsType, setOddsType] = useState<'handicap' | 'euroOdds' | 'overUnder' | 'corners'>('handicap');
    const [timeType, setTimeType] = useState<'half' | 'full'>('full');

    const oddsTypes = [
      { id: 'handicap' as const, label: '让球' },
      { id: 'euroOdds' as const, label: '胜平负' },
      { id: 'overUnder' as const, label: '总进球' },
      { id: 'corners' as const, label: '角球' },
    ];

    if (!match.odds) {
      return (
        <div className="p-4">
          <Card className="p-6 bg-muted/20 border-border/50 text-center">
            <BarChart2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">暂无指数数据</p>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {/* 赔率类型切换 */}
        <div className="flex items-center border-b border-border/50 overflow-x-auto">
          {oddsTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setOddsType(type.id)}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                oddsType === type.id ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type.label}
              {oddsType === type.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-destructive rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* 表头 */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-b border-border/30">
          <span className="w-16">初始</span>
          <span className="flex-1 text-center">即时</span>
          <div className="flex items-center gap-1">
            <BarChart2 className="w-3 h-3" />
          </div>
        </div>

        {/* 让球盘口 */}
        {oddsType === 'handicap' && (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/20">
              {match.odds.handicap.map((odds, index) => (
                <div key={index} className="flex items-center px-4 py-3 hover:bg-muted/10 transition-colors">
                  <span className="w-16 text-sm font-medium text-foreground">{odds.bookmaker}</span>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center text-sm">
                    <span className="text-foreground">{odds.initialHome.toFixed(2)}</span>
                    <span className="text-destructive font-medium">{odds.initialHandicap > 0 ? `+${odds.initialHandicap}` : odds.initialHandicap}</span>
                    <span className="text-foreground">{odds.initialAway.toFixed(2)}</span>
                  </div>
                  {odds.isClosed ? (
                    <div className="w-24 text-center text-xs text-muted-foreground">封</div>
                  ) : (
                    <div className="w-24 grid grid-cols-3 gap-1 text-center text-xs">
                      <span className="text-primary">{odds.liveHome?.toFixed(2) || '-'}</span>
                      <span className="text-destructive">{odds.liveHandicap !== null ? (odds.liveHandicap > 0 ? `+${odds.liveHandicap}` : odds.liveHandicap.toFixed(1)) : '-'}</span>
                      <span className="text-primary">{odds.liveAway?.toFixed(2) || '-'}</span>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 欧赔 */}
        {oddsType === 'euroOdds' && (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/20">
              {match.odds.euroOdds.map((odds, index) => (
                <div key={index} className="flex items-center px-4 py-3 hover:bg-muted/10 transition-colors">
                  <span className="w-16 text-sm font-medium text-foreground">{odds.bookmaker}</span>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center text-sm">
                    <span className="text-foreground">{odds.initialHome.toFixed(2)}</span>
                    <span className="text-muted-foreground">{odds.initialDraw.toFixed(2)}</span>
                    <span className="text-foreground">{odds.initialAway.toFixed(2)}</span>
                  </div>
                  {odds.isClosed ? (
                    <div className="w-24 text-center text-xs text-muted-foreground">封</div>
                  ) : (
                    <div className="w-24 grid grid-cols-3 gap-1 text-center text-xs">
                      <span className="text-primary">{odds.liveHome?.toFixed(2) || '-'}</span>
                      <span className="text-muted-foreground">{odds.liveDraw?.toFixed(2) || '-'}</span>
                      <span className="text-primary">{odds.liveAway?.toFixed(2) || '-'}</span>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 大小球 */}
        {oddsType === 'overUnder' && (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/20">
              {match.odds.overUnder.map((odds, index) => (
                <div key={index} className="flex items-center px-4 py-3 hover:bg-muted/10 transition-colors">
                  <span className="w-16 text-sm font-medium text-foreground">{odds.bookmaker}</span>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center text-sm">
                    <span className="text-foreground">大 {odds.initialOver.toFixed(2)}</span>
                    <span className="text-warning font-medium">{odds.initialLine}</span>
                    <span className="text-foreground">小 {odds.initialUnder.toFixed(2)}</span>
                  </div>
                  {odds.isClosed ? (
                    <div className="w-24 text-center text-xs text-muted-foreground">封</div>
                  ) : (
                    <div className="w-24 grid grid-cols-3 gap-1 text-center text-xs">
                      <span className="text-primary">{odds.liveOver?.toFixed(2) || '-'}</span>
                      <span className="text-warning">{odds.liveLine || '-'}</span>
                      <span className="text-primary">{odds.liveUnder?.toFixed(2) || '-'}</span>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 角球 */}
        {oddsType === 'corners' && (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/20">
              {match.odds.corners.map((odds, index) => (
                <div key={index} className="flex items-center px-4 py-3 hover:bg-muted/10 transition-colors">
                  <span className="w-16 text-sm font-medium text-foreground">{odds.bookmaker}</span>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center text-sm">
                    <span className="text-foreground">大 {odds.initialOver.toFixed(2)}</span>
                    <span className="text-warning font-medium">{odds.initialLine}</span>
                    <span className="text-foreground">小 {odds.initialUnder.toFixed(2)}</span>
                  </div>
                  {odds.isClosed ? (
                    <div className="w-24 text-center text-xs text-muted-foreground">封</div>
                  ) : (
                    <div className="w-24 grid grid-cols-3 gap-1 text-center text-xs">
                      <span className="text-primary">{odds.liveOver?.toFixed(2) || '-'}</span>
                      <span className="text-warning">{odds.liveLine || '-'}</span>
                      <span className="text-primary">{odds.liveUnder?.toFixed(2) || '-'}</span>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 半场/全场切换 */}
        <div className="flex justify-center py-3 border-t border-border/30">
          <div className="flex items-center gap-1 bg-muted/30 rounded-full p-1">
            <button
              onClick={() => setTimeType('half')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                timeType === 'half' ? 'bg-destructive text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              半场
            </button>
            <button
              onClick={() => setTimeType('full')}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                timeType === 'full' ? 'bg-destructive text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              全场
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      
      {/* 顶部区域 - 足球场背景 */}
      <div className="relative bg-gradient-to-b from-green-900/90 to-green-800/80 overflow-hidden">
        {/* 背景纹理 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center" />
        </div>

        {/* 头部导航 */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 safe-area-padding-top">
          <button onClick={() => navigate('/models')} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium">{match.league} {match.leagueStage}</div>
            <div className="text-white/70 text-sm">{match.date} {match.time}</div>
          </div>
          <div className="w-6" />
        </div>

        {/* 比分区域 */}
        <div className="relative z-10 px-4 py-6">
          {/* 比赛状态标签 */}
          {match.minute && (
            <div className="flex justify-center mb-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
                {match.minute}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            {/* 主队 */}
            <div className="flex flex-col items-center flex-1">
              <div className="text-5xl mb-2">{match.homeTeam.flag}</div>
              <div className="text-white font-medium text-center">{match.homeTeam.name}</div>
              <div className="text-white/60 text-sm">[FIFA {match.homeTeam.fifaRank}]</div>
            </div>

            {/* 比分 */}
            <div className="text-center">
              <div className="text-white text-5xl font-bold">
                {match.homeTeam.score} - {match.awayTeam.score}
              </div>
              <div className="text-white/70 text-sm mt-1">
                半场 {match.homeTeam.halfTimeScore}-{match.awayTeam.halfTimeScore}
                {match.homeTeam.extraTimeScore !== undefined && (
                  <span className="ml-2">加时 {match.homeTeam.extraTimeScore}-{match.awayTeam.extraTimeScore}</span>
                )}
              </div>
            </div>

            {/* 客队 */}
            <div className="flex flex-col items-center flex-1">
              <div className="text-5xl mb-2">{match.awayTeam.flag}</div>
              <div className="text-white font-medium text-center">{match.awayTeam.name}</div>
              <div className="text-white/60 text-sm">[FIFA {match.awayTeam.fifaRank}]</div>
            </div>
          </div>

          {/* 视频按钮 */}
          <div className="flex justify-center gap-3 mt-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white text-sm">
              <Play className="w-4 h-4 fill-white" />
              <span>视频直播</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white text-sm">
              <CircleDot className="w-4 h-4" />
              <span>动画直播</span>
            </button>
          </div>

          {/* 支持率 */}
          <div className="flex items-center justify-between mt-6 px-2">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm">{match.supportRate.home}%</span>
            </div>
            <div className="flex-1 mx-4 h-1.5 bg-white/20 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-400" 
                style={{ width: `${match.supportRate.home}%` }}
              />
              <div 
                className="h-full bg-blue-400" 
                style={{ width: `${match.supportRate.away}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">{match.supportRate.away}%</span>
              <ThumbsDown className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="flex items-center overflow-x-auto">
          {[
            { id: 'live' as const, label: '直播', icon: null },
            { id: 'lineup' as const, label: '阵容', icon: Users },
            { id: 'odds' as const, label: '指数', icon: BarChart2 },
            { id: 'expert' as const, label: '专家', icon: UserCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-destructive rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="bg-card">
        {activeTab === 'live' && (
          <div className="p-4 space-y-6">
            {/* 时间轴 */}
            <Card className="p-4 bg-muted/20 border-border/50">
              <div className="flex items-center justify-between mb-3 text-[10px] text-muted-foreground">
                <span>15'</span>
                <span>30'</span>
                <span>HT</span>
                <span>60'</span>
                <span>75'</span>
                <span>90'</span>
              </div>
              <div className="relative h-16">
                {/* 主队时间轴 */}
                <div className="absolute top-0 left-0 right-0 h-6 flex items-end gap-0.5 px-1">
                  {match.timeline.map((point, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-warning/60 rounded-t"
                      style={{ height: `${point.homeIntensity}%` }}
                    />
                  ))}
                </div>
                {/* 中线 */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
                {/* 客队时间轴 */}
                <div className="absolute bottom-0 left-0 right-0 h-6 flex items-start gap-0.5 px-1">
                  {match.timeline.map((point, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-muted-foreground/40 rounded-b"
                      style={{ height: `${point.awayIntensity}%` }}
                    />
                  ))}
                </div>
                {/* 队伍标识 */}
                <div className="absolute top-1 left-2 text-lg">{match.homeTeam.flag}</div>
                <div className="absolute bottom-1 left-2 text-lg">{match.awayTeam.flag}</div>
              </div>
            </Card>

            {/* 数据统计 */}
            <Card className="p-4 bg-muted/20 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{match.homeTeam.flag}</span>
                  <span className="text-sm font-medium">{match.homeTeam.shortName}</span>
                </div>
                <button className="flex items-center gap-1 px-3 py-1 bg-warning/20 text-warning text-xs rounded-full">
                  <BarChart2 className="w-3 h-3" />
                  深度数据
                  <ChevronRight className="w-3 h-3" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{match.awayTeam.shortName}</span>
                  <span className="text-lg">{match.awayTeam.flag}</span>
                </div>
              </div>

              {/* 圆环统计 */}
              <div className="flex justify-around mb-6">
                <CircularProgress 
                  homeValue={match.stats.homeAttacks} 
                  awayValue={match.stats.awayAttacks} 
                  label="进攻" 
                />
                <CircularProgress 
                  homeValue={match.stats.homeDangerousAttacks} 
                  awayValue={match.stats.awayDangerousAttacks} 
                  label="危险进攻" 
                />
                <CircularProgress 
                  homeValue={match.stats.homePossession} 
                  awayValue={match.stats.awayPossession} 
                  label="控球率" 
                />
              </div>

              {/* 条形统计 */}
              <div className="space-y-3">
                <StatBar 
                  homeValue={match.stats.homeShotsOnTarget} 
                  awayValue={match.stats.awayShotsOnTarget} 
                  label="射正球门" 
                />
                <StatBar 
                  homeValue={match.stats.homeShotsOffTarget} 
                  awayValue={match.stats.awayShotsOffTarget} 
                  label="射偏球门" 
                />
              </div>

              {/* 红黄牌统计 */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-destructive rounded-sm" />
                    <span className="text-xs">{match.homeTeam.redCards}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                    <span className="text-xs">{match.homeTeam.yellowCards}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{match.stats.homeCorners}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{match.stats.awayCorners}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{match.awayTeam.yellowCards}</span>
                    <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{match.awayTeam.redCards}</span>
                    <div className="w-3 h-4 bg-destructive rounded-sm" />
                  </div>
                </div>
              </div>
            </Card>

            {/* 文字直播 / 重要事件 */}
            <Card className="bg-muted/20 border-border/50 overflow-hidden">
              <div className="flex border-b border-border/50">
                <button className="flex-1 py-3 text-sm font-medium text-primary border-b-2 border-primary">
                  文字直播
                </button>
                <button className="flex-1 py-3 text-sm font-medium text-muted-foreground">
                  重要事件
                </button>
              </div>
              <ScrollArea className="h-64">
                <div className="p-4 space-y-4">
                  {match.events.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-12">
                        {event.type === 'yellow_card' ? (
                          <div className="w-4 h-5 bg-yellow-500 rounded-sm" />
                        ) : event.type === 'goal' ? (
                          <div className="text-lg">⚽</div>
                        ) : event.type === 'whistle' ? (
                          <div className="text-lg">🎺</div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-muted" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {event.minute} - {event.description}
                        </div>
                        {event.player && (
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{event.player}</span>
                            <span className="text-lg">{event.team === 'home' ? match.homeTeam.flag : match.awayTeam.flag}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        )}

        {activeTab === 'lineup' && (
          <div className="p-4 space-y-4">
            {/* 标题栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">首发阵容</span>
                <span className="text-xs text-muted-foreground">(点击球员/教练/裁判查看数据)</span>
              </div>
              <button className="flex items-center gap-1 text-xs text-primary">
                生成海报
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* 天气和场地信息 */}
            {match.venue && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    <span>{match.venue.temperature}°C {match.venue.weather}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{match.venue.referee}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    <span>湿度: {match.venue.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{match.venue.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 球场阵容图 */}
            <div className="relative bg-gradient-to-b from-green-700 to-green-800 rounded-xl overflow-hidden">
              {/* 球场纹理 */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 right-0 h-1/2 border-b-2 border-white/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-2 border-t-0 border-white/30" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-2 border-b-0 border-white/30" />
              </div>

              {/* 主队阵容 */}
              {match.homeTeam.lineup && (
                <div className="relative p-4 pb-2">
                  {/* 队伍标识 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{match.homeTeam.flag}</span>
                      <span className="text-white font-medium text-sm">{match.homeTeam.shortName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/70 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{match.homeTeam.lineup.coach}</span>
                    </div>
                  </div>

                  {/* 门将 */}
                  <div className="flex justify-center mb-4">
                    {match.homeTeam.lineup.startingXI.filter(p => p.position === 'GK').map(player => (
                      <PlayerNode key={player.id} player={player} />
                    ))}
                  </div>

                  {/* 后卫线 */}
                  <div className="flex justify-around mb-4">
                    {match.homeTeam.lineup.startingXI.filter(p => ['LB', 'CB', 'RB'].includes(p.position)).map(player => (
                      <PlayerNode key={player.id} player={player} />
                    ))}
                  </div>

                  {/* 中场线 */}
                  <div className="flex justify-around mb-4">
                    {match.homeTeam.lineup.startingXI.filter(p => ['LM', 'CM', 'RM', 'LW', 'RW'].includes(p.position)).map(player => (
                      <PlayerNode key={player.id} player={player} />
                    ))}
                  </div>

                  {/* 前锋线 */}
                  <div className="flex justify-around mb-2">
                    {match.homeTeam.lineup.startingXI.filter(p => ['CF', 'ST', 'FW'].includes(p.position)).map(player => (
                      <PlayerNode key={player.id} player={player} />
                    ))}
                  </div>
                </div>
              )}

              {/* 分隔线 */}
              <div className="h-px bg-white/30 mx-4" />

              {/* 客队阵容 */}
              {match.awayTeam.lineup && (
                <div className="relative p-4 pt-2">
                  {/* 前锋线 */}
                  <div className="flex justify-around mb-4 mt-2">
                    {match.awayTeam.lineup.startingXI.filter(p => ['CF', 'ST', 'FW'].includes(p.position)).map(player => (
                      <PlayerNode key={player.id} player={player} isAway />
                    ))}
                  </div>

                  {/* 中场线 */}
                  <div className="flex justify-around mb-4">
                    {match.awayTeam.lineup.startingXI.filter(p => ['LM', 'CM', 'RM', 'LW', 'RW'].includes(p.position)).map(player => (
                      <PlayerNode key={player.id} player={player} isAway />
                    ))}
                  </div>

                  {/* 后卫线 */}
                  <div className="flex justify-around mb-4">
                    {match.awayTeam.lineup.startingXI.filter(p => ['LB', 'CB', 'RB'].includes(p.position)).map(player => (
                      <PlayerNode key={player.id} player={player} isAway />
                    ))}
                  </div>

                  {/* 门将 */}
                  <div className="flex justify-center mb-3">
                    {match.awayTeam.lineup.startingXI.filter(p => p.position === 'GK').map(player => (
                      <PlayerNode key={player.id} player={player} isAway />
                    ))}
                  </div>

                  {/* 队伍标识 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{match.awayTeam.flag}</span>
                      <span className="text-white font-medium text-sm">{match.awayTeam.shortName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/70 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{match.awayTeam.lineup.coach}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 阵型信息 */}
            <div className="grid grid-cols-2 gap-4">
              {match.homeTeam.lineup && (
                <Card className="p-3 bg-muted/20 border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{match.homeTeam.flag}</span>
                    <span className="text-sm font-medium">{match.homeTeam.shortName}</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>阵型 {match.homeTeam.lineup.formation}</div>
                    <div>首发身价 {match.homeTeam.lineup.totalValue}</div>
                    <div>平均 {match.homeTeam.lineup.averageAge}岁</div>
                  </div>
                </Card>
              )}
              {match.awayTeam.lineup && (
                <Card className="p-3 bg-muted/20 border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{match.awayTeam.flag}</span>
                    <span className="text-sm font-medium">{match.awayTeam.shortName}</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>阵型 {match.awayTeam.lineup.formation}</div>
                    <div>首发身价 {match.awayTeam.lineup.totalValue}</div>
                    <div>平均 {match.awayTeam.lineup.averageAge}岁</div>
                  </div>
                </Card>
              )}
            </div>

            {/* 替补席 */}
            <Card className="p-4 bg-muted/20 border-border/50">
              <h3 className="text-sm font-medium mb-3">替补席</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* 主队替补 */}
                {match.homeTeam.lineup && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <span>{match.homeTeam.flag}</span>
                      <span>{match.homeTeam.shortName}</span>
                    </div>
                    {match.homeTeam.lineup.substitutes.map(player => (
                      <div key={player.id} className="flex items-center gap-2 text-xs">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback className="text-[8px] bg-muted">{player.number}</AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">{player.number}</span>
                        <span className="flex-1 truncate">{player.name}</span>
                        {player.rating > 0 && (
                          <span className="text-xs text-muted-foreground">{player.rating}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* 客队替补 */}
                {match.awayTeam.lineup && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <span>{match.awayTeam.flag}</span>
                      <span>{match.awayTeam.shortName}</span>
                    </div>
                    {match.awayTeam.lineup.substitutes.map(player => (
                      <div key={player.id} className="flex items-center gap-2 text-xs">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback className="text-[8px] bg-muted">{player.number}</AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">{player.number}</span>
                        <span className="flex-1 truncate">{player.name}</span>
                        {player.rating > 0 && (
                          <span className="text-xs text-muted-foreground">{player.rating}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* 无阵容数据时的提示 */}
            {!match.homeTeam.lineup && !match.awayTeam.lineup && (
              <Card className="p-6 bg-muted/20 border-border/50 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">暂无阵容数据</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'odds' && (
          <OddsTab match={match} />
        )}

        {activeTab === 'expert' && (
          <div className="p-4">
            <Card className="p-6 bg-muted/20 border-border/50 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">专家分析即将上线</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
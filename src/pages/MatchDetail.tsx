import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, ThumbsUp, ThumbsDown, ChevronRight, MessageCircle, Users, BarChart2, UserCheck, Flame, CircleDot, Thermometer, Droplets, MapPin, Clock, ExternalLink, Smile, Gift, Send, Maximize2 } from "lucide-react";
import LiveFootballAnimation from "@/components/LiveFootballAnimation";
import { GoalIcon, YellowCardIcon, WhistleIcon, RedCardIcon, CornerIcon, InfoIcon, OffTargetIcon, OnTargetIcon, OffsideIcon } from "@/components/FootballIcons";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchMatchDetail, fetchMatchLiveById, fetchOddsLive, fetchMatchTrend, fetchMatchTrendDetail, fetchMatchLineup, ODDS_COMPANY_NAMES } from "@/lib/sportnanoapi";
import type { MatchLiveData } from "@/types/footballApi";
import ftbLiveBg from "@/assets/ftbLive.7d6ed6f.png";
import footballFieldBg from "@/assets/ef73592f-4d7c-45bd-990d-9a1e454ec8d5.png";
import type { DiaryMatch, DiaryTeam, Competition } from "@/types/footballApi";

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
  x?: number; // 阵容x坐标
  y?: number; // 阵容y坐标
  incidents?: Array<{
    type: number;
    time: string;
    belong: number;
    home_score: number;
    away_score: number;
    player?: {
      id: number;
      name: string;
      reason_type?: number;
    };
    assist1?: { id: number; name: string };
    assist2?: { id: number; name: string };
    in_player?: { id: number; name: string };
    out_player?: { id: number; name: string };
  }>;
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
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'whistle' | 'corner';
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
    logo?: string;
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
    logo?: string;
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

type TabType = 'live' | 'chat' | 'lineup' | 'odds' | 'expert' | 'hot';

// 阵型克制关系定义
interface FormationMatchup {
  counters: string[]; // 克制的阵型
  counteredBy: string[]; // 被克制的阵型
  type: string; // 阵型类型
  description: string; // 阵型描述
}

const FORMATION_DATA: Record<string, FormationMatchup> = {
  '4-4-2': {
    type: '均衡型阵型',
    description: '攻守平衡，中场控制力强，边路进攻威胁大。',
    counters: ['3-5-2', '3-4-3'],
    counteredBy: ['4-3-3', '4-2-3-1'],
  },
  '4-3-3': {
    type: '进攻型阵型',
    description: '三前锋提供大进攻火力，边锋拉边创造空间。中场三角稳固，适合高压逼抢。',
    counters: ['4-4-2', '5-3-2'],
    counteredBy: ['4-5-1', '5-4-1'],
  },
  '3-5-2': {
    type: '中场控制型',
    description: '五中场提供强大控制，双前锋配合紧密。边翼卫上下覆盖，攻守兼顾。',
    counters: ['4-2-3-1', '4-3-3'],
    counteredBy: ['4-4-2', '4-3-1-2'],
  },
  '4-2-3-1': {
    type: '稳健进攻型',
    description: '双后腰保护防线，三名攻击型中场灵活穿插。单箭头居中牵制，攻守转换迅速。',
    counters: ['4-4-2', '4-3-3'],
    counteredBy: ['3-5-2', '3-4-3'],
  },
  '3-4-3': {
    type: '极致进攻型',
    description: '三前锋火力全开，边中卫上抢积极。适合主动进攻，打压对手防线。',
    counters: ['4-5-1', '5-4-1'],
    counteredBy: ['4-4-2', '4-2-3-1'],
  },
  '5-3-2': {
    type: '防守反击型',
    description: '五后卫稳固防守，中场紧凑。快速反击依靠双前锋冲击，边翼卫择机助攻。',
    counters: ['4-4-2', '4-5-1'],
    counteredBy: ['4-3-3', '3-4-3'],
  },
  '4-5-1': {
    type: '防守型阵型',
    description: '单前锋策应，五中场横向封锁。边路覆盖到位，适合低位防守反击。',
    counters: ['4-3-3', '3-4-3'],
    counteredBy: ['3-5-2', '4-2-3-1'],
  },
  '4-3-1-2': {
    type: '菱形中场型',
    description: '菱形中场控制力强，双前锋搭配灵活。前腰核心串联，进攻层次分明。',
    counters: ['3-5-2', '5-3-2'],
    counteredBy: ['4-4-2', '4-5-1'],
  },
  '5-4-1': {
    type: '铁桶防守型',
    description: '五后卫加四中场，防守密集。单前锋骚扰，适合弱队对抗强队。',
    counters: ['4-3-3', '3-4-3'],
    counteredBy: ['4-2-3-1', '3-5-2'],
  },
  '4-1-4-1': {
    type: '单后腰型',
    description: '单后腰保护，四中场灵活。边路进攻为主，中路渗透为辅。',
    counters: ['4-4-2', '5-3-2'],
    counteredBy: ['4-3-3', '3-4-3'],
  },
};

// 计算阵型克制关系
const calculateFormationSuppression = (homeFormation: string, awayFormation: string): {
  homeAdvantage: number; // 正数表示主队压制，负数表示被压制
  reason: string;
  homeType: string;
  awayType: string;
  homeDescription: string;
  awayDescription: string;
} => {
  const homeData = FORMATION_DATA[homeFormation] || FORMATION_DATA['4-4-2'];
  const awayData = FORMATION_DATA[awayFormation] || FORMATION_DATA['4-4-2'];
  
  let advantage = 0;
  let reason = '';
  
  // 检查主队是否克制客队
  if (homeData.counters.includes(awayFormation)) {
    advantage = 15 + Math.random() * 10; // 15-25% 优势
    reason = `${homeFormation} 克制 ${awayFormation}，主队战术占优`;
  } 
  // 检查主队是否被克制
  else if (homeData.counteredBy.includes(awayFormation)) {
    advantage = -(15 + Math.random() * 10); // 15-25% 劣势
    reason = `${awayFormation} 克制 ${homeFormation}，客队战术占优`;
  }
  // 相同阵型
  else if (homeFormation === awayFormation) {
    advantage = 0;
    reason = '双方阵型相同，战术均势';
  }
  // 无明显克制关系
  else {
    advantage = (Math.random() - 0.5) * 10; // -5% 到 5%
    reason = '双方阵型无明显克制关系';
  }
  
  return {
    homeAdvantage: Math.round(advantage),
    reason,
    homeType: homeData.type,
    awayType: awayData.type,
    homeDescription: homeData.description,
    awayDescription: awayData.description,
  };
};

// 阵型对比面板组件
interface FormationTeamInfo {
  name: string;
  shortName: string;
  flag: string;
  formation: string;
  totalValue: string;
  averageAge: number;
}

const FormationComparisonPanel = ({ 
  homeTeam, 
  awayTeam 
}: { 
  homeTeam: FormationTeamInfo; 
  awayTeam: FormationTeamInfo;
}) => {
  const suppression = calculateFormationSuppression(homeTeam.formation, awayTeam.formation);
  
  return (
    <div className="space-y-4">
      {/* 阵型克制结果 */}
      <Card className="p-4 bg-muted/20 border-border/50">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-lg font-bold">阵型克制分析</span>
        </div>
        
        <div className="flex items-center justify-center gap-4 py-3">
          {/* 主队 */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{homeTeam.flag}</span>
            <div className="text-right">
              <div className="font-medium">{homeTeam.shortName}</div>
              <div className="text-sm text-muted-foreground">{homeTeam.formation}</div>
            </div>
          </div>
          
          {/* VS 和克制指示 */}
          <div className="flex flex-col items-center px-4">
            <span className="text-xl font-bold text-muted-foreground">VS</span>
            <div className={`mt-1 px-3 py-1 rounded-full text-xs font-medium ${
              suppression.homeAdvantage > 5 
                ? 'bg-green-500/20 text-green-500' 
                : suppression.homeAdvantage < -5 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'bg-yellow-500/20 text-yellow-500'
            }`}>
              {suppression.homeAdvantage > 5 
                ? `🔥 主队压制 +${suppression.homeAdvantage}%`
                : suppression.homeAdvantage < -5 
                  ? `⚠️ 客队压制 +${Math.abs(suppression.homeAdvantage)}%`
                  : '⚖️ 阵型均势'}
            </div>
          </div>
          
          {/* 客队 */}
          <div className="flex items-center gap-2">
            <div className="text-left">
              <div className="font-medium">{awayTeam.shortName}</div>
              <div className="text-sm text-muted-foreground">{awayTeam.formation}</div>
            </div>
            <span className="text-2xl">{awayTeam.flag}</span>
          </div>
        </div>
        
        <div className="text-center text-xs text-muted-foreground mt-2">
          {suppression.reason}
        </div>
        
        {/* 胜率能量条 */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1">
              <span>{homeTeam.flag}</span>
              <span className="font-medium">{homeTeam.shortName}</span>
            </div>
            <span className="text-muted-foreground">阵型胜率对比</span>
            <div className="flex items-center gap-1">
              <span className="font-medium">{awayTeam.shortName}</span>
              <span>{awayTeam.flag}</span>
            </div>
          </div>
          
          {/* 能量条 */}
          <div className="relative h-6 bg-muted/30 rounded-full overflow-hidden">
            {/* 主队能量 (从左到右) */}
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{ 
                width: `${50 + (suppression.homeAdvantage / 2)}%`,
              }}
            />
            {/* 客队能量 (从右到左) */}
            <div 
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-500"
              style={{ 
                width: `${50 - (suppression.homeAdvantage / 2)}%`,
              }}
            />
            
            {/* 中间分割线 */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 transform -translate-x-1/2 z-10" />
            
            {/* 胜率数值 */}
            <div className="absolute inset-0 flex items-center justify-between px-3 z-20">
              <span className={`text-xs font-bold text-white drop-shadow-md ${
                suppression.homeAdvantage > 0 ? 'animate-pulse' : ''
              }`}>
                {(50 + suppression.homeAdvantage / 2).toFixed(0)}%
              </span>
              <span className={`text-xs font-bold text-white drop-shadow-md ${
                suppression.homeAdvantage < 0 ? 'animate-pulse' : ''
              }`}>
                {(50 - suppression.homeAdvantage / 2).toFixed(0)}%
              </span>
            </div>
          </div>
          
          {/* 优势指示器 */}
          <div className="flex justify-center mt-2">
            {suppression.homeAdvantage > 5 ? (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <span>◀</span>
                <span>主队阵型胜率更高</span>
              </div>
            ) : suppression.homeAdvantage < -5 ? (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <span>客队阵型胜率更高</span>
                <span>▶</span>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                双方阵型胜率接近
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* 双方阵型详细信息 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 主队阵型 */}
        <Card className="p-3 bg-muted/20 border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{homeTeam.flag}</span>
              <span className="text-sm font-medium">{homeTeam.shortName}</span>
            </div>
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded font-medium">
              {homeTeam.formation}
            </span>
          </div>
          <div className="mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${
              suppression.homeAdvantage > 5 
                ? 'bg-green-500/20 text-green-500' 
                : suppression.homeAdvantage < -5 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'bg-yellow-500/20 text-yellow-500'
            }`}>
              {suppression.homeType}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {suppression.homeDescription}
          </p>
          <div className="mt-2 pt-2 border-t border-border/30 space-y-1 text-xs text-muted-foreground">
            <div>首发身价 {homeTeam.totalValue}</div>
            <div>平均 {homeTeam.averageAge}岁</div>
          </div>
        </Card>
        
        {/* 客队阵型 */}
        <Card className="p-3 bg-muted/20 border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{awayTeam.flag}</span>
              <span className="text-sm font-medium">{awayTeam.shortName}</span>
            </div>
            <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-xs rounded font-medium">
              {awayTeam.formation}
            </span>
          </div>
          <div className="mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${
              suppression.homeAdvantage < -5 
                ? 'bg-green-500/20 text-green-500' 
                : suppression.homeAdvantage > 5 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'bg-yellow-500/20 text-yellow-500'
            }`}>
              {suppression.awayType}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {suppression.awayDescription}
          </p>
          <div className="mt-2 pt-2 border-t border-border/30 space-y-1 text-xs text-muted-foreground">
            <div>首发身价 {awayTeam.totalValue}</div>
            <div>平均 {awayTeam.averageAge}岁</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// 将 API 数据转换为 MatchDetailInfo 格式
const convertApiMatchToDetailInfo = (
  apiMatch: DiaryMatch,
  teams: DiaryTeam[],
  competitions: Competition[]
): MatchDetailInfo => {
  const matchTime = apiMatch.match_time * 1000; // 转换为毫秒
  const matchDate = new Date(matchTime);
  
  // 格式化日期和时间
  const date = matchDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
  const time = matchDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  // 判断比赛状态
  let status: 'live' | 'finished' | 'upcoming' = 'upcoming';
  let minute: string | undefined;
  
  const now = Math.floor(Date.now() / 1000);
  const statusId = apiMatch.status_id;
  
  switch (statusId) {
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 10:
      status = 'live';
      if (statusId === 3) {
        minute = 'HT';
      } else if (apiMatch.match_time > 0) {
        const elapsedSeconds = now - apiMatch.match_time;
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        if (elapsedMinutes > 0 && elapsedMinutes <= 150) {
          minute = `${elapsedMinutes}'`;
        }
      }
      break;
    case 8:
    case 11:
    case 12:
      status = 'finished';
      break;
    default:
      if (apiMatch.ended && apiMatch.ended > 0) {
        status = 'finished';
      } else if (apiMatch.match_time > 0 && apiMatch.match_time <= now) {
        status = 'live';
      } else {
        status = 'upcoming';
      }
      break;
  }
  
  // 获取球队信息
  const homeTeam = teams.find(t => t.id === apiMatch.home_team_id);
  const awayTeam = teams.find(t => t.id === apiMatch.away_team_id);
  const competition = competitions.find(c => c.id === apiMatch.competition_id);
  
  // 获取比分
  const homeScores = apiMatch.home_scores || [];
  const awayScores = apiMatch.away_scores || [];
  const homeScore = homeScores.length > 0 && homeScores[0] !== undefined ? homeScores[0] : undefined;
  const awayScore = awayScores.length > 0 && awayScores[0] !== undefined ? awayScores[0] : undefined;
  const halfTimeHomeScore = homeScores.length > 1 && homeScores[1] !== undefined ? homeScores[1] : undefined;
  const halfTimeAwayScore = awayScores.length > 1 && awayScores[1] !== undefined ? awayScores[1] : undefined;
  
  // 获取红牌和黄牌
  const homeYellowCards = homeScores.length > 3 && homeScores[3] !== undefined && homeScores[3] >= 0 ? homeScores[3] : undefined;
  const awayYellowCards = awayScores.length > 3 && awayScores[3] !== undefined && awayScores[3] >= 0 ? awayScores[3] : undefined;
  const homeRedCards = homeScores.length > 2 && homeScores[2] !== undefined && homeScores[2] >= 0 ? homeScores[2] : undefined;
  const awayRedCards = awayScores.length > 2 && awayScores[2] !== undefined && awayScores[2] >= 0 ? awayScores[2] : undefined;
  
  // 获取角球
  const homeCorners = homeScores.length > 4 && homeScores[4] !== undefined && homeScores[4] >= 0 ? homeScores[4] : undefined;
  const awayCorners = awayScores.length > 4 && awayScores[4] !== undefined && awayScores[4] >= 0 ? awayScores[4] : undefined;
  
  // 获取环境信息
  const environment = apiMatch.environment;
  
  return {
    id: apiMatch.id.toString(),
    league: competition?.name || '未知联赛',
    leagueStage: '', // API 中没有阶段信息，留空
    date,
    time,
    status,
    minute,
    venue: environment ? {
      name: '', // API 中没有场地名称，需要从 venue_id 获取
      weather: environment.weather === 1 ? '晴天' : environment.weather === 2 ? '多云' : environment.weather === 3 ? '雨天' : '未知',
      temperature: parseInt(environment.temperature) || 0,
      humidity: parseInt(environment.humidity) || 0,
      referee: '' // API 中没有裁判信息
    } : undefined,
    homeTeam: {
      name: homeTeam?.name || '未知主队',
      shortName: homeTeam?.name || '',
      fifaRank: apiMatch.home_position ? parseInt(apiMatch.home_position) : undefined,
      flag: '',
      logo: homeTeam?.logo,
      score: homeScore ?? 0,
      halfTimeScore: halfTimeHomeScore ?? 0,
      extraTimeScore: homeScores.length > 5 && homeScores[5] !== undefined ? homeScores[5] : undefined,
      yellowCards: homeYellowCards ?? 0,
      redCards: homeRedCards ?? 0,
      lineup: {
        formation: '',
        totalValue: '',
        averageAge: 0,
        coach: '',
        startingXI: [],
        substitutes: []
      }
    },
    awayTeam: {
      name: awayTeam?.name || '未知客队',
      shortName: awayTeam?.name || '',
      fifaRank: apiMatch.away_position ? parseInt(apiMatch.away_position) : undefined,
      flag: '',
      logo: awayTeam?.logo,
      score: awayScore ?? 0,
      halfTimeScore: halfTimeAwayScore ?? 0,
      extraTimeScore: awayScores.length > 5 && awayScores[5] !== undefined ? awayScores[5] : undefined,
      yellowCards: awayYellowCards ?? 0,
      redCards: awayRedCards ?? 0,
      lineup: {
        formation: '',
        totalValue: '',
        averageAge: 0,
        coach: '',
        startingXI: [],
        substitutes: []
      }
    },
    events: [], // 需要从其他 API 获取
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
      homeCorners: homeCorners ?? 0,
      awayCorners: awayCorners ?? 0
    },
    supportRate: {
      home: 50,
      away: 50
    },
    timeline: [], // 需要从其他 API 获取
    odds: undefined // 需要从其他 API 获取
  };
};

// 解析统计数据并更新到 match 对象
const updateStatsFromLiveData = (live: MatchLiveData, match: MatchDetailInfo): MatchDetailInfo => {
  if (!live.stats || live.stats.length === 0) {
    return match;
  }

  const updatedMatch = { ...match };
  
  live.stats.forEach(stat => {
    // 根据统计类型状态码更新对应的统计数据
    switch (stat.type) {
      case STAT_TYPE.CORNER: // 角球
        updatedMatch.stats.homeCorners = stat.home;
        updatedMatch.stats.awayCorners = stat.away;
        break;
      case STAT_TYPE.YELLOW_CARD: // 黄牌
        updatedMatch.homeTeam.yellowCards = stat.home;
        updatedMatch.awayTeam.yellowCards = stat.away;
        break;
      case STAT_TYPE.RED_CARD: // 红牌
        updatedMatch.homeTeam.redCards = stat.home;
        updatedMatch.awayTeam.redCards = stat.away;
        break;
      case STAT_TYPE.SHOT_ON_TARGET: // 射正
        updatedMatch.stats.homeShotsOnTarget = stat.home;
        updatedMatch.stats.awayShotsOnTarget = stat.away;
        break;
      case STAT_TYPE.SHOT_OFF_TARGET: // 射偏
        updatedMatch.stats.homeShotsOffTarget = stat.home;
        updatedMatch.stats.awayShotsOffTarget = stat.away;
        break;
      case STAT_TYPE.ATTACK: // 进攻
        updatedMatch.stats.homeAttacks = stat.home;
        updatedMatch.stats.awayAttacks = stat.away;
        break;
      case STAT_TYPE.DANGEROUS_ATTACK: // 危险进攻
        updatedMatch.stats.homeDangerousAttacks = stat.home;
        updatedMatch.stats.awayDangerousAttacks = stat.away;
        break;
      case STAT_TYPE.POSSESSION: // 控球率
        updatedMatch.stats.homePossession = stat.home;
        updatedMatch.stats.awayPossession = stat.away;
        break;
      case STAT_TYPE.SHOT_BLOCKED: // 射门被阻挡
        // 可以添加到 stats 中，如果需要的话
        break;
      default:
        // 其他统计类型暂时不处理
        break;
    }
  });
  
  return updatedMatch;
};

// 技术统计状态码映射
const STAT_TYPE = {
  GOAL: 1,           // 进球
  CORNER: 2,         // 角球
  YELLOW_CARD: 3,    // 黄牌
  RED_CARD: 4,       // 红牌
  OFFSIDE: 5,        // 越位
  FREE_KICK: 6,      // 任意球
  GOAL_KICK: 7,      // 球门球
  PENALTY: 8,        // 点球
  SUBSTITUTION: 9,   // 换人
  MATCH_START: 10,   // 比赛开始
  HALF_TIME: 11,     // 中场
  MATCH_END: 12,     // 结束
  HALF_SCORE: 13,    // 半场比分
  SECOND_YELLOW: 15, // 两黄变红
  PENALTY_MISSED: 16,// 点球未进
  OWN_GOAL: 17,      // 乌龙球
  ASSIST: 18,        // 助攻
  INJURY_TIME: 19,   // 伤停补时
  SHOT_ON_TARGET: 21,// 射正
  SHOT_OFF_TARGET: 22,// 射偏
  ATTACK: 23,        // 进攻
  DANGEROUS_ATTACK: 24,// 危险进攻
  POSSESSION: 25,    // 控球率
  EXTRA_TIME_END: 26,// 加时赛结束
  PENALTY_SHOOTOUT_END: 27,// 点球大战结束
  VAR: 28,           // VAR(视频助理裁判)
  PENALTY_SHOOTOUT: 29,// 点球(点球大战)
  PENALTY_SHOOTOUT_MISSED: 30,// 点球未进(点球大战)
  SHOT_BLOCKED: 37,  // 射门被阻挡
} as const;

// 检查趋势数据是否完整
// 如果数据为空、缺失或数据点太少，则认为不完整
const isTrendDataComplete = (
  trendData: Awaited<ReturnType<typeof fetchMatchTrend>>['results'][0] | undefined
): boolean => {
  if (!trendData || !trendData.trend || !trendData.trend.data) {
    return false;
  }
  
  const { data } = trendData.trend;
  const firstHalfData = data[0] || [];
  const secondHalfData = data[1] || [];
  
  // 如果两个半场都没有数据，或者数据点太少（少于10个点），认为不完整
  if (firstHalfData.length === 0 && secondHalfData.length === 0) {
    return false;
  }
  
  // 如果数据点总数少于10个，认为可能不完整
  if (firstHalfData.length + secondHalfData.length < 10) {
    return false;
  }
  
  return true;
};

// 解析趋势数据
// 根据文档：返回的趋势列表中，每一位表示每分钟的趋势数值
// 趋势值：正数表示主队优势，负数表示客队优势
const parseTrendData = (
  trendData: Awaited<ReturnType<typeof fetchMatchTrend>>['results'][0]
): MatchDetailInfo['timeline'] => {
  if (!trendData.trend || !trendData.trend.data || trendData.trend.data.length === 0) {
    return [];
  }

  const timeline: MatchDetailInfo['timeline'] = [];
  const { data, per } = trendData.trend; // per 是半场时长（通常是45分钟）
  
  // 实际数据结构：data 是一个包含两个数组的数组
  // data[0] 是上半场的趋势值数组，每个值代表每分钟的趋势（索引0=第0分钟，索引44=第44分钟）
  // data[1] 是下半场的趋势值数组，每个值代表每分钟的趋势（索引0=第45分钟，索引44=第89分钟）
  const firstHalfData = data[0] || [];
  const secondHalfData = data[1] || [];
  
  // 处理上半场数据
  // 数组索引直接对应分钟数（索引0=第0分钟）
  firstHalfData.forEach((trendValue, index) => {
    // 趋势值可能为0，但0也表示一个数据点（表示该分钟双方平衡）
    const minute = index; // 第0分钟到第44分钟
    
    // 趋势值：正数表示主队趋势，负数表示客队趋势
    // 直接使用趋势值，不需要转换
    // 正数：主队趋势值，客队为0
    // 负数：客队趋势值（取绝对值），主队为0
    // 0：双方都为0
    
    let homeIntensity: number;
    let awayIntensity: number;
    
    if (trendValue > 0) {
      // 正数：主队趋势
      homeIntensity = Math.min(100, Math.max(0, trendValue));
      awayIntensity = 0;
    } else if (trendValue < 0) {
      // 负数：客队趋势（取绝对值）
      awayIntensity = Math.min(100, Math.max(0, Math.abs(trendValue)));
      homeIntensity = 0;
    } else {
      // 0：双方都为0
      homeIntensity = 0;
      awayIntensity = 0;
    }
    
    timeline.push({
      minute: Math.min(minute, per), // 确保不超过半场时长
      homeIntensity,
      awayIntensity,
    });
  });
  
  // 处理下半场数据
  // 数组索引 + per = 分钟数（下半场从第45分钟开始）
  secondHalfData.forEach((trendValue, index) => {
    const minute = per + index; // 第45分钟到第89分钟（或更多，如果有补时）
    
    // 趋势值：正数表示主队趋势，负数表示客队趋势
    // 直接使用趋势值，不需要转换
    let homeIntensity: number;
    let awayIntensity: number;
    
    if (trendValue > 0) {
      // 正数：主队趋势
      homeIntensity = Math.min(100, Math.max(0, trendValue));
      awayIntensity = 0;
    } else if (trendValue < 0) {
      // 负数：客队趋势（取绝对值）
      awayIntensity = Math.min(100, Math.max(0, Math.abs(trendValue)));
      homeIntensity = 0;
    } else {
      // 0：双方都为0
      homeIntensity = 0;
      awayIntensity = 0;
    }
    
    timeline.push({
      minute,
      homeIntensity,
      awayIntensity,
    });
  });
  
  // 如果没有生成任何数据点，返回空数组（不应该发生，但作为保护）
  if (timeline.length === 0) {
    return [];
  }
  
  // 按分钟数排序（虽然应该已经是按顺序的，但确保一下）
  timeline.sort((a, b) => a.minute - b.minute);
  
  return timeline;
};

// 解析趋势事件数据
const parseTrendIncidents = (
  incidents: Awaited<ReturnType<typeof fetchMatchTrend>>['results'][0]['incidents']
): MatchEvent[] => {
  if (!incidents || incidents.length === 0) {
    return [];
  }

  return incidents.map(incident => {
    const team = incident.position === 1 ? 'home' : 'away';
    
    // 解析时间字符串（可能包含 "+" 符号，如 "45+3"）
    let minuteStr = incident.time || '0';
    // 处理 "45+3" 这种格式，取主要分钟数
    const minuteMatch = minuteStr.match(/^(\d+)/);
    const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;
    minuteStr = `${minute}'`;
    
    // 根据事件类型设置事件类型和描述
    let eventType: MatchEvent['type'] = 'whistle';
    let description = '';
    
    switch (incident.type) {
      case STAT_TYPE.GOAL:
      case STAT_TYPE.PENALTY:
      case STAT_TYPE.OWN_GOAL:
        eventType = 'goal';
        description = '进球';
        break;
      case STAT_TYPE.YELLOW_CARD:
        eventType = 'yellow_card';
        description = '黄牌';
        break;
      case STAT_TYPE.RED_CARD:
      case STAT_TYPE.SECOND_YELLOW:
        eventType = 'red_card';
        description = '红牌';
        break;
      case STAT_TYPE.SUBSTITUTION:
        eventType = 'substitution';
        description = '换人';
        break;
      case STAT_TYPE.CORNER:
        eventType = 'corner';
        description = '角球';
        break;
      default:
        eventType = 'whistle';
        description = '事件';
        break;
    }
    
    return {
      minute: minuteStr,
      type: eventType,
      team,
      description,
    };
  });
};

// 解析指数数据
const parseOddsData = (
  oddsResponse: Awaited<ReturnType<typeof fetchOddsLive>>, 
  matchId: string | number,
  companyIds: number[] = [7, 3, 2, 11, 10]
): MatchDetailInfo['odds'] | undefined => {
  if (!oddsResponse.results || typeof oddsResponse.results !== 'object' || Array.isArray(oddsResponse.results) || Object.keys(oddsResponse.results).length === 0) {
    console.warn('No results in odds response or invalid format:', {
      hasResults: !!oddsResponse.results,
      type: typeof oddsResponse.results,
      isArray: Array.isArray(oddsResponse.results),
      keysLength: oddsResponse.results ? Object.keys(oddsResponse.results).length : 0
    });
    return undefined;
  }

  const matchIdNum = typeof matchId === 'string' ? parseInt(matchId) : matchId;
  
  const handicap: OddsData[] = [];
  const euroOdds: EuroOddsData[] = [];
  const overUnder: OverUnderData[] = [];
  const corners: CornersData[] = [];

  // results 是一个对象，key 为公司ID（字符串），value 为该公司的数据数组
  // 遍历每个公司的数据
  Object.entries(oddsResponse.results).forEach(([companyIdStr, companyData]) => {
    const companyId = parseInt(companyIdStr);
    
    // 只处理请求的公司ID
    if (!companyIds.includes(companyId)) {
      return;
    }
    
    const companyName = ODDS_COMPANY_NAMES[companyId] || `公司${companyId}`;
    
    // 筛选出当前比赛的数据
    const matchOdds = companyData.filter((item) => {
      const itemMatchId = item[0];
      // 尝试多种匹配方式
      const matches = itemMatchId === matchIdNum 
        || itemMatchId === matchId 
        || String(itemMatchId) === String(matchId)
        || Number(itemMatchId) === matchIdNum
        || Number(itemMatchId) === Number(matchId);
      return matches;
    });
    
    if (matchOdds.length === 0) {
      return;
    }
    
    // 处理该公司的所有指数数据
    // 对于每种类型，取最新的数据（通常是数组中的第一个，因为按时间倒序排列）
    const typeMap = new Map<string, typeof matchOdds[0]>();
    
    matchOdds.forEach((item) => {
      const oddsType = item[1]; // 获取指数类型
      // 如果该类型还没有数据，或者当前数据的时间更新，则更新
      if (!typeMap.has(oddsType)) {
        typeMap.set(oddsType, item);
      }
    });
    
    // 处理每种类型的指数数据
    typeMap.forEach((item, oddsType) => {
      const [matchIdFromApi, _, oddsInfo, score] = item;
      const [changeTime, matchTime, oddsString, status] = oddsInfo;
      
      // 解析赔率字符串：主胜/大球/大,和局/盘口,客胜/小球/小,是否封盘
      const oddsParts = oddsString.split(',');
      if (oddsParts.length < 4) {
        console.warn('Invalid odds string format:', oddsString);
        return;
      }
      
      const isClosed = oddsParts[3] === '1';
      
      // 根据指数类型分类处理
      switch (oddsType) {
      case 'asia': {
        // 亚盘：主胜,盘口,客胜
        const home = parseFloat(oddsParts[0]) || 0;
        const handicapValue = parseFloat(oddsParts[1]) || 0;
        const away = parseFloat(oddsParts[2]) || 0;
        
        handicap.push({
          bookmaker: companyName,
          initialHome: home,
          initialHandicap: handicapValue,
          initialAway: away,
          liveHome: isClosed ? null : home,
          liveHandicap: isClosed ? null : handicapValue,
          liveAway: isClosed ? null : away,
          isClosed,
        });
        break;
      }
      case 'eu': {
        // 欧赔：主胜,和局,客胜
        const home = parseFloat(oddsParts[0]) || 0;
        const draw = parseFloat(oddsParts[1]) || 0;
        const away = parseFloat(oddsParts[2]) || 0;
        
        euroOdds.push({
          bookmaker: companyName,
          initialHome: home,
          initialDraw: draw,
          initialAway: away,
          liveHome: isClosed ? null : home,
          liveDraw: isClosed ? null : draw,
          liveAway: isClosed ? null : away,
          isClosed,
        });
        break;
      }
      case 'bs': {
        // 大小球：大球,盘口,小球
        const over = parseFloat(oddsParts[0]) || 0;
        const line = parseFloat(oddsParts[1]) || 0;
        const under = parseFloat(oddsParts[2]) || 0;
        
        overUnder.push({
          bookmaker: companyName,
          initialOver: over,
          initialLine: line,
          initialUnder: under,
          liveOver: isClosed ? null : over,
          liveLine: isClosed ? null : line,
          liveUnder: isClosed ? null : under,
          isClosed,
        });
        break;
      }
      case 'cr': {
        // 角球：大球,盘口,小球
        const over = parseFloat(oddsParts[0]) || 0;
        const line = parseFloat(oddsParts[1]) || 0;
        const under = parseFloat(oddsParts[2]) || 0;
        
        corners.push({
          bookmaker: companyName,
          initialOver: over,
          initialLine: line,
          initialUnder: under,
          liveOver: isClosed ? null : over,
          liveLine: isClosed ? null : line,
          liveUnder: isClosed ? null : under,
          isClosed,
        });
        break;
      }
      }
    }); // 结束 typeMap.forEach
  }); // 结束 Object.entries(oddsResponse.results).forEach

  if (handicap.length === 0 && euroOdds.length === 0 && overUnder.length === 0 && corners.length === 0) {
    console.warn('[parseOddsData] No odds data found for any type');
    return undefined;
  }

  const result = {
    handicap: handicap.length > 0 ? handicap : [],
    euroOdds: euroOdds.length > 0 ? euroOdds : [],
    overUnder: overUnder.length > 0 ? overUnder : [],
    corners: corners.length > 0 ? corners : [],
  };

  console.log('[parseOddsData] Parsed odds result:', {
    handicap: result.handicap.length,
    euroOdds: result.euroOdds.length,
    overUnder: result.overUnder.length,
    corners: result.corners.length,
  });

  return result;
};

// 解析比赛事件
const parseIncidentsToEvents = (incidents: MatchLiveData['incidents']): MatchEvent[] => {
  if (!incidents || incidents.length === 0) {
    return [];
  }

  return incidents.map(incident => {
    const team = incident.position === 1 ? 'home' : incident.position === 2 ? 'away' : 'home';
    let eventType: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'whistle' | 'corner' = 'whistle';
    let description = '';
    
    // 根据事件类型状态码设置类型和描述
    switch (incident.type) {
      case STAT_TYPE.GOAL:
        eventType = 'goal';
        description = incident.player_name ? `${incident.player_name} 进球` : '进球';
        if (incident.home_score !== undefined && incident.away_score !== undefined) {
          description += ` (${incident.home_score}-${incident.away_score})`;
        }
        break;
      case STAT_TYPE.YELLOW_CARD:
        eventType = 'yellow_card';
        description = incident.player_name ? `${incident.player_name} 黄牌` : '黄牌';
        break;
      case STAT_TYPE.RED_CARD:
      case STAT_TYPE.SECOND_YELLOW:
        eventType = 'red_card';
        description = incident.player_name 
          ? `${incident.player_name} ${incident.type === STAT_TYPE.SECOND_YELLOW ? '两黄变红' : '红牌'}`
          : incident.type === STAT_TYPE.SECOND_YELLOW ? '两黄变红' : '红牌';
        break;
      case STAT_TYPE.SUBSTITUTION:
        eventType = 'substitution';
        description = incident.player_name ? `${incident.player_name} 换人` : '换人';
        break;
      case STAT_TYPE.PENALTY:
        eventType = 'goal';
        description = incident.player_name ? `${incident.player_name} 点球` : '点球';
        break;
      case STAT_TYPE.PENALTY_MISSED:
        description = incident.player_name ? `${incident.player_name} 点球未进` : '点球未进';
        break;
      case STAT_TYPE.OWN_GOAL:
        eventType = 'goal';
        description = incident.player_name ? `${incident.player_name} 乌龙球` : '乌龙球';
        break;
      case STAT_TYPE.CORNER:
        eventType = 'corner';
        description = '角球';
        break;
      case STAT_TYPE.VAR:
        description = 'VAR';
        break;
      case STAT_TYPE.HALF_TIME:
        description = '中场';
        break;
      case STAT_TYPE.MATCH_END:
        description = '比赛结束';
        break;
      case STAT_TYPE.EXTRA_TIME_END:
        description = '加时赛结束';
        break;
      case STAT_TYPE.PENALTY_SHOOTOUT_END:
        description = '点球大战结束';
        break;
      default:
        description = incident.player_name || '事件';
        break;
    }
    
    return {
      minute: `${incident.time}'`,
      type: eventType,
      team,
      description,
      player: incident.player_name
    };
  });
};

export default function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isSwipingBack, swipeProgress } = useSwipeBack({ enabled: isMobile });
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [match, setMatch] = useState<MatchDetailInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<MatchLiveData | null>(null);
  const [textLiveData, setTextLiveData] = useState<MatchLiveData['tlive']>([]);
  const [textLiveTab, setTextLiveTab] = useState<'text' | 'events'>('text'); // 文字直播/重要事件切换
  const [onlyGoals, setOnlyGoals] = useState(false); // 只看进球开关


  // 计算比赛进行分钟数
  const calculateMatchMinute = (live: MatchLiveData | null, matchStatus: 'live' | 'finished' | 'upcoming'): string | undefined => {
    if (!live || matchStatus !== 'live') {
      return undefined;
    }

    const status = live.score.status;
    const kickoffTime = live.score.kickoffTime;
    const now = Math.floor(Date.now() / 1000);

    // 根据状态码判断是上半场还是下半场
    // 2: 上半场, 3: 中场, 4: 下半场, 5: 加时赛, 7: 点球大战
    if (status === 2) {
      // 上半场：比赛进行分钟数=(当前时间戳-上半场开球时间戳) / 60 + 1
      const elapsedMinutes = Math.floor((now - kickoffTime) / 60) + 1;
      return `${elapsedMinutes}'`;
    } else if (status === 4 || status === 5) {
      // 下半场：比赛进行分钟数=(当前时间戳-下半场开球时间戳) / 60 + 45 + 1
      // 注意：这里假设 kickoffTime 是下半场开球时间
      const elapsedMinutes = Math.floor((now - kickoffTime) / 60) + 45 + 1;
      return `${elapsedMinutes}'`;
    } else if (status === 3) {
      return 'HT';
    } else if (status === 5) {
      return 'ET';
    } else if (status === 7) {
      return 'PEN';
    } else if (status === 8) {
      return 'FT';
    } else if (status === 10) {
      return '中断';
    } else if (status === 11 || status === 12) {
      return '取消';
    }

    return undefined;
  };

  useEffect(() => {
    const loadMatchData = async () => {
      if (!matchId) {
        setError('比赛ID不存在');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 从 API 获取比赛数据
        const { match: apiMatch, teams, competitions } = await fetchMatchDetail(matchId);
        
        let matchData: MatchDetailInfo;
        if (apiMatch) {
          // 转换为详情页需要的格式
          matchData = convertApiMatchToDetailInfo(apiMatch, teams, competitions);
        } else {
          // 如果 API 中没有找到，使用虚拟数据作为后备
          matchData = virtualMatchDetails[matchId] || generateDefaultMatch(matchId);
        }
        
        // 获取指数数据（使用常用公司：澳彩、皇冠、BET365、韦德、易胜博）
        try {
          const companyIds = [7, 3, 2, 11, 10]; // 澳彩、皇冠、BET365、韦德、易胜博
          const oddsResponse = await fetchOddsLive(matchId, companyIds);
          const parsedOdds = parseOddsData(oddsResponse, matchId, companyIds);
          if (parsedOdds) {
            matchData.odds = parsedOdds;
          } else {
            console.warn('No odds data parsed from response');
          }
        } catch (oddsError) {
          console.error('Failed to load odds data:', oddsError);
          // 指数数据加载失败不影响主流程
        }
        
        // 获取趋势数据
        try {
          // 优先从实时趋势接口获取（如果比赛还在进行中）
          let trendResponse: Awaited<ReturnType<typeof fetchMatchTrend>> | null = null;
          let trendData: Awaited<ReturnType<typeof fetchMatchTrend>>['results'][0] | undefined = undefined;
          
          // 判断比赛状态（如果 matchData.status 已设置，使用它；否则假设是 live）
          const matchStatus = matchData.status || 'live';
          
          if (matchStatus === 'live') {
            try {
              trendResponse = await fetchMatchTrend(matchId);
              trendData = trendResponse.results?.find(r => r.match_id === parseInt(matchId));
            } catch (error) {
              // 实时接口失败，继续尝试详情接口
            }
          }
          
          // 如果实时趋势数据缺失或不完整，或比赛已结束，使用详情接口进行查缺补漏
          // 详情接口支持前30天的比赛，所以即使比赛结束也可以获取
          if (matchStatus !== 'live' || !isTrendDataComplete(trendData)) {
            try {
              const detailResponse = await fetchMatchTrendDetail(matchId);
              const detailData = detailResponse.results?.find(r => r.match_id === parseInt(matchId));
              
              // 如果详情接口有数据，使用详情接口的数据
              // 即使 isTrendDataComplete 返回 false，也尝试使用详情接口的数据（可能数据点较少但仍有价值）
              if (detailData && detailData.trend && detailData.trend.data) {
                trendData = detailData;
              } else if (trendData && detailData) {
                // 如果两个接口都有部分数据，尝试合并（优先使用详情接口的数据）
                trendData = detailData;
              }
            } catch (detailError) {
              // 详情接口失败不影响主流程，继续使用实时接口的数据（如果有）
            }
          }
          
          if (trendData && trendData.trend && trendData.trend.data) {
            // 解析趋势数据并更新时间线
            const timelineData = parseTrendData(trendData);
            // 无论数据点多少，只要有数据就更新
            if (timelineData.length > 0) {
              matchData.timeline = timelineData;
            }
            
            // 解析事件数据
            if (trendData.incidents && trendData.incidents.length > 0) {
              const events = parseTrendIncidents(trendData.incidents);
              if (events.length > 0) {
                matchData.events = events;
              }
            }
          }
        } catch (trendError) {
          console.error('Failed to load trend data:', trendError);
          // 趋势数据加载失败不影响主流程
        }
        
        // 获取阵容数据（根据 coverage.lineup 字段判断是否有阵容）
        // 如果 coverage.lineup === 1 表示有阵容数据，或者直接尝试获取（因为接口可能支持前30天的比赛）
        const hasLineup = apiMatch?.coverage?.lineup === 1;
        // 如果有明确的 lineup 标识，或者直接尝试获取（接口支持前30天的比赛）
        if (hasLineup || matchId) {
          try {
            const lineupResponse = await fetchMatchLineup(matchId);
            if (lineupResponse.results) {
              const lineupData = lineupResponse.results;
              
              // 转换主队阵容数据
              if (lineupData.home && Array.isArray(lineupData.home)) {
                const homeStartingXI = lineupData.home
                  .filter(p => p.first === 1)
                  .map(p => ({
                    id: p.id.toString(),
                    number: p.shirt_number,
                    name: p.name,
                    rating: parseFloat(p.rating) || 0,
                    position: p.position,
                    isCaptain: p.captain === 1,
                    avatar: p.logo || p.national_logo,
                    x: p.x,
                    y: p.y,
                    incidents: p.incidents || []
                  }));
                
                const homeSubstitutes = lineupData.home
                  .filter(p => p.first === 0)
                  .map(p => ({
                    id: p.id.toString(),
                    number: p.shirt_number,
                    name: p.name,
                    rating: parseFloat(p.rating) || 0,
                    position: p.position,
                    isCaptain: p.captain === 1,
                    avatar: p.logo || p.national_logo
                  }));
                
                matchData.homeTeam.lineup = {
                  formation: lineupData.home_formation || '',
                  totalValue: '', // API 中没有身价信息
                  averageAge: 0, // API 中没有年龄信息
                  coach: '', // 需要从 coach_id 获取，暂时留空
                  startingXI: homeStartingXI,
                  substitutes: homeSubstitutes
                };
              }
              
              // 转换客队阵容数据
              if (lineupData.away && Array.isArray(lineupData.away)) {
                const awayStartingXI = lineupData.away
                  .filter(p => p.first === 1)
                  .map(p => ({
                    id: p.id.toString(),
                    number: p.shirt_number,
                    name: p.name,
                    rating: parseFloat(p.rating) || 0,
                    position: p.position,
                    isCaptain: p.captain === 1,
                    avatar: p.logo || p.national_logo,
                    x: p.x,
                    y: p.y,
                    incidents: p.incidents || []
                  }));
                
                const awaySubstitutes = lineupData.away
                  .filter(p => p.first === 0)
                  .map(p => ({
                    id: p.id.toString(),
                    number: p.shirt_number,
                    name: p.name,
                    rating: parseFloat(p.rating) || 0,
                    position: p.position,
                    isCaptain: p.captain === 1,
                    avatar: p.logo || p.national_logo
                  }));
                
                matchData.awayTeam.lineup = {
                  formation: lineupData.away_formation || '',
                  totalValue: '', // API 中没有身价信息
                  averageAge: 0, // API 中没有年龄信息
                  coach: '', // 需要从 coach_id 获取，暂时留空
                  startingXI: awayStartingXI,
                  substitutes: awaySubstitutes
                };
              }
            }
          } catch (lineupError) {
            console.error('Failed to load lineup data:', lineupError);
            // 阵容数据加载失败不影响主流程
          }
        }
        
        setMatch(matchData);
      } catch (err) {
        console.error('Failed to load match data:', err);
        setError(err instanceof Error ? err.message : '加载比赛数据失败');
        // 使用虚拟数据作为后备
        if (matchId) {
          const matchData = virtualMatchDetails[matchId] || generateDefaultMatch(matchId);
          setMatch(matchData);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMatchData();
  }, [matchId]);

  // 每2秒更新一次实时数据（只在比赛进行中）
  useEffect(() => {
    if (!matchId || !match || match.status !== 'live') {
      return;
    }

    const updateLiveData = async () => {
      try {
        const live = await fetchMatchLiveById(matchId);
        if (live) {
          setLiveData(live);
          
          // 更新比赛数据
          setMatch(prevMatch => {
            if (!prevMatch) return prevMatch;
            
            const updatedMatch = { ...prevMatch };
            
            // 更新比分
            if (live.score.homeScores.length > 0) {
              updatedMatch.homeTeam.score = live.score.homeScores[0];
            }
            if (live.score.awayScores.length > 0) {
              updatedMatch.awayTeam.score = live.score.awayScores[0];
            }
            
            // 更新半场比分
            if (live.score.homeScores.length > 1) {
              updatedMatch.homeTeam.halfTimeScore = live.score.homeScores[1];
            }
            if (live.score.awayScores.length > 1) {
              updatedMatch.awayTeam.halfTimeScore = live.score.awayScores[1];
            }
            
            // 更新红牌和黄牌
            if (live.score.homeScores.length > 2) {
              updatedMatch.homeTeam.redCards = live.score.homeScores[2] >= 0 ? live.score.homeScores[2] : 0;
            }
            if (live.score.awayScores.length > 2) {
              updatedMatch.awayTeam.redCards = live.score.awayScores[2] >= 0 ? live.score.awayScores[2] : 0;
            }
            if (live.score.homeScores.length > 3) {
              updatedMatch.homeTeam.yellowCards = live.score.homeScores[3] >= 0 ? live.score.homeScores[3] : 0;
            }
            if (live.score.awayScores.length > 3) {
              updatedMatch.awayTeam.yellowCards = live.score.awayScores[3] >= 0 ? live.score.awayScores[3] : 0;
            }
            
            // 更新角球
            if (live.score.homeScores.length > 4 && live.score.homeScores[4] >= 0) {
              updatedMatch.stats.homeCorners = live.score.homeScores[4];
            }
            if (live.score.awayScores.length > 4 && live.score.awayScores[4] >= 0) {
              updatedMatch.stats.awayCorners = live.score.awayScores[4];
            }
            
            // 更新比赛状态
            const statusId = live.score.status;
            if (statusId === 8 || statusId === 11 || statusId === 12) {
              updatedMatch.status = 'finished';
            } else if (statusId === 1 || statusId === 9 || statusId === 13) {
              updatedMatch.status = 'upcoming';
            } else {
              updatedMatch.status = 'live';
            }
            
            // 计算并更新比赛分钟数
            updatedMatch.minute = calculateMatchMinute(live, updatedMatch.status);
            
            // 更新统计数据（如果存在）
            const statsUpdatedMatch = updateStatsFromLiveData(live, updatedMatch);
            // 合并统计数据
            updatedMatch.stats = statsUpdatedMatch.stats;
            
            // 更新比赛事件（如果存在）
            if (live.incidents && live.incidents.length > 0) {
              updatedMatch.events = parseIncidentsToEvents(live.incidents);
            }
            
            // 更新文字直播（如果存在）
            // 文字直播包含：黄牌、红牌、进球、换人、角球、越位、助攻、比赛开始、中场、结束等
            if (live.tlive && Array.isArray(live.tlive) && live.tlive.length > 0) {
              // 存储所有文字直播数据
              setTextLiveData(live.tlive);
              
              // 将重要的文字直播事件（main === 1）合并到事件列表中
              const importantTextEvents: MatchEvent[] = live.tlive
                .filter(text => text.main === 1)
                .map(text => {
                  // 根据文字直播类型判断事件类型
                  let eventType: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'whistle' | 'corner' = 'whistle';
                  
                  // 根据 type 判断事件类型
                  switch (text.type) {
                    case STAT_TYPE.GOAL:
                    case STAT_TYPE.PENALTY:
                    case STAT_TYPE.OWN_GOAL:
                      eventType = 'goal';
                      break;
                    case STAT_TYPE.YELLOW_CARD:
                      eventType = 'yellow_card';
                      break;
                    case STAT_TYPE.RED_CARD:
                    case STAT_TYPE.SECOND_YELLOW:
                      eventType = 'red_card';
                      break;
                    case STAT_TYPE.SUBSTITUTION:
                      eventType = 'substitution';
                      break;
                    case STAT_TYPE.CORNER:
                      eventType = 'corner';
                      break;
                    default:
                      eventType = 'whistle';
                      break;
                  }
                  
                  return {
                    minute: text.time,
                    type: eventType,
                    team: (text.position === 1 ? 'home' : text.position === 2 ? 'away' : 'home') as 'home' | 'away',
                    description: text.data,
                  };
                });
              
              // 将重要的文字直播事件合并到事件列表中
              updatedMatch.events = [...updatedMatch.events, ...importantTextEvents];
            } else {
              // 如果没有新的文字直播数据，保持原有数据
              // setTextLiveData([]); // 或者不清空，保持之前的数据
            }
            
            // 根据比赛事件和统计数据生成时间线（如果没有趋势数据）
            // 注意：趋势数据现在由独立的 useEffect 处理，即使比赛结束也会尝试获取
            if (!updatedMatch.timeline || updatedMatch.timeline.length === 0) {
            if (live.incidents && live.incidents.length > 0) {
              // 创建时间线数据点（每15分钟一个点）
              const timelinePoints = [];
              const timePoints = [0, 15, 30, 45, 60, 75, 90];
              
              timePoints.forEach(minute => {
                // 计算该时间段内的事件强度
                const incidentsInPeriod = live.incidents.filter(inc => {
                  const incMinute = inc.time;
                  return incMinute >= minute - 7.5 && incMinute < minute + 7.5;
                });
                
                const homeIntensity = incidentsInPeriod.filter(inc => inc.position === 1).length * 20;
                const awayIntensity = incidentsInPeriod.filter(inc => inc.position === 2).length * 20;
                
                // 添加事件标记
                const eventsInPeriod = incidentsInPeriod.map(inc => {
                  let eventType: 'goal' | 'yellow' | 'red' | undefined;
                  let team: 'home' | 'away' | undefined;
                  
                  // 根据事件类型状态码判断
                  switch (inc.type) {
                    case STAT_TYPE.GOAL:
                    case STAT_TYPE.PENALTY:
                    case STAT_TYPE.OWN_GOAL:
                      eventType = 'goal';
                      break;
                    case STAT_TYPE.YELLOW_CARD:
                      eventType = 'yellow';
                      break;
                    case STAT_TYPE.RED_CARD:
                    case STAT_TYPE.SECOND_YELLOW:
                      eventType = 'red';
                      break;
                    default:
                      eventType = undefined;
                      break;
                  }
                  
                  team = inc.position === 1 ? 'home' : inc.position === 2 ? 'away' : undefined;
                  
                  return { event: eventType, team };
                }).filter(e => e.event);
                
                timelinePoints.push({
                  minute,
                  homeIntensity: Math.min(homeIntensity, 100),
                  awayIntensity: Math.min(awayIntensity, 100),
                  event: eventsInPeriod[0]?.event,
                  team: eventsInPeriod[0]?.team
                });
              });
              
              updatedMatch.timeline = timelinePoints;
            } else if (updatedMatch.events && updatedMatch.events.length > 0) {
              // 如果没有 incidents，使用 events 生成时间线
              const timelinePoints = [];
              const timePoints = [0, 15, 30, 45, 60, 75, 90];
              
              timePoints.forEach(minute => {
                const eventsInPeriod = updatedMatch.events.filter(ev => {
                  const evMinute = parseInt(ev.minute.replace("'", "")) || 0;
                  return evMinute >= minute - 7.5 && evMinute < minute + 7.5;
                });
                
                const homeIntensity = eventsInPeriod.filter(ev => ev.team === 'home').length * 25;
                const awayIntensity = eventsInPeriod.filter(ev => ev.team === 'away').length * 25;
                
                const eventInPeriod = eventsInPeriod[0];
                
                timelinePoints.push({
                  minute,
                  homeIntensity: Math.min(homeIntensity, 100),
                  awayIntensity: Math.min(awayIntensity, 100),
                  event: eventInPeriod?.type === 'goal' ? 'goal' : eventInPeriod?.type === 'yellow_card' ? 'yellow' : eventInPeriod?.type === 'red_card' ? 'red' : undefined,
                  team: eventInPeriod?.team
                });
              });
              
              updatedMatch.timeline = timelinePoints;
              }
            }
            
            return updatedMatch;
          });
        }
      } catch (err) {
        console.error('Failed to update live data:', err);
        // 不显示错误，静默失败，继续轮询
      }
    };

    // 立即执行一次
    updateLiveData();

    // 每2秒更新一次
    const interval = setInterval(updateLiveData, 2000);

    return () => clearInterval(interval);
  }, [matchId, match?.status]);

  // 独立获取趋势数据（即使比赛结束也尝试获取，详情接口支持前30天的比赛）
  useEffect(() => {
    if (!matchId || !match) {
      return;
    }

    const fetchTrendData = async () => {
      try {
        // 优先从实时趋势接口获取（如果比赛还在进行中）
        let trendResponse: Awaited<ReturnType<typeof fetchMatchTrend>> | null = null;
        let trendData: Awaited<ReturnType<typeof fetchMatchTrend>>['results'][0] | undefined = undefined;
        
        if (match.status === 'live') {
          try {
            trendResponse = await fetchMatchTrend(matchId);
            trendData = trendResponse.results?.find(r => r.match_id === parseInt(matchId));
          } catch (error) {
            // 实时接口失败，继续尝试详情接口
          }
        }
        
        // 如果实时趋势数据缺失或不完整，使用详情接口进行查缺补漏
        // 详情接口支持前30天的比赛，所以即使比赛结束也可以获取
        // 如果比赛已结束，直接使用详情接口
        if (match.status !== 'live' || !isTrendDataComplete(trendData)) {
          try {
            const detailResponse = await fetchMatchTrendDetail(matchId);
            const detailData = detailResponse.results?.find(r => r.match_id === parseInt(matchId));
            
            // 如果详情接口有数据，使用详情接口的数据
            // 即使 isTrendDataComplete 返回 false，也尝试使用详情接口的数据（可能数据点较少但仍有价值）
            if (detailData && detailData.trend && detailData.trend.data) {
              trendData = detailData;
            } else if (trendData && detailData) {
              // 如果两个接口都有部分数据，尝试合并（优先使用详情接口的数据）
              trendData = detailData;
            }
          } catch (detailError) {
            // 详情接口失败不影响主流程
          }
        }
        
        // 调试：检查数据是否存在
        if (!trendData || !trendData.trend || !trendData.trend.data) {
          // 没有趋势数据，不更新
          return;
        }
        
        // 如果有趋势数据，解析并更新（即使数据不完整也尝试显示）
        if (trendData && trendData.trend && trendData.trend.data) {
          // 解析趋势数据并更新时间线
          const timelineData = parseTrendData(trendData);
          
          // 无论数据点多少，只要有数据就更新
          if (timelineData.length > 0) {
            setMatch(prevMatch => {
              if (!prevMatch) return prevMatch;
              // 确保更新 timeline
              return {
                ...prevMatch,
                timeline: timelineData,
              };
            });
          } else {
            // 如果解析后没有数据，可能是数据格式问题
            // 尝试直接使用原始数据
            const { data, per } = trendData.trend;
            if (data && Array.isArray(data) && data.length > 0) {
              // 至少有一个半场的数据
              const hasData = data.some(half => Array.isArray(half) && half.length > 0);
              if (hasData) {
                // 数据存在但解析失败，可能是格式问题，尝试重新解析
                const retryTimelineData = parseTrendData(trendData);
                if (retryTimelineData.length > 0) {
                  setMatch(prevMatch => {
                    if (!prevMatch) return prevMatch;
                    return {
                      ...prevMatch,
                      timeline: retryTimelineData,
                    };
                  });
                }
              }
            }
          }
          
          // 解析事件数据（如果趋势API的事件数据更完整，则使用它）
          if (trendData.incidents && trendData.incidents.length > 0) {
            const events = parseTrendIncidents(trendData.incidents);
            if (events.length > 0) {
              setMatch(prevMatch => {
                if (!prevMatch) return prevMatch;
                return {
                  ...prevMatch,
                  events: events,
                };
              });
            }
          }
        } else {
          // 如果没有趋势数据，尝试清空时间线（避免显示旧数据）
          setMatch(prevMatch => {
            if (!prevMatch || !prevMatch.timeline || prevMatch.timeline.length === 0) {
              return prevMatch;
            }
            // 如果之前有时间线数据但现在没有，保持原样（可能是临时网络问题）
            return prevMatch;
          });
        }
      } catch (error) {
        // 趋势数据获取失败不影响主流程
      }
    };

    // 立即执行一次
    fetchTrendData();

    // 如果比赛还在进行中，每30秒更新一次趋势数据
    // 如果比赛已结束，只执行一次（因为详情接口数据不会变化）
    if (match.status === 'live') {
      const interval = setInterval(fetchTrendData, 30000);
      return () => clearInterval(interval);
    }
  }, [matchId, match?.status]);

  // 每3秒更新一次指数数据（适用于所有比赛状态，包括已结束的比赛）
  useEffect(() => {
    if (!matchId || !match) {
      return;
    }

    const updateOddsData = async () => {
      try {
        const companyIds = [7, 3, 2, 11, 10]; // 澳彩、皇冠、BET365、韦德、易胜博
        const oddsResponse = await fetchOddsLive(matchId, companyIds);
        const parsedOdds = parseOddsData(oddsResponse, matchId, companyIds);
        
        if (parsedOdds) {
          setMatch(prevMatch => {
            if (!prevMatch) return prevMatch;
            return {
              ...prevMatch,
              odds: parsedOdds,
            };
          });
        } else {
          console.warn('No odds data parsed from update response');
        }
      } catch (err) {
        console.error('Failed to update odds data:', err);
        // 指数数据更新失败不影响其他功能，静默失败
      }
    };

    // 立即执行一次
    updateOddsData();

    // 每3秒更新一次（只在比赛进行中或即将开始时）
    if (match.status === 'live' || match.status === 'upcoming') {
      const interval = setInterval(updateOddsData, 3000);
      return () => clearInterval(interval);
    }
  }, [matchId, match?.status]);

  // 当点击指数按钮时，如果没有指数数据，触发一次加载
  useEffect(() => {
    if (activeTab === 'odds' && matchId && match && !match.odds) {
      const loadOddsData = async () => {
        try {
          const companyIds = [7, 3, 2, 11, 10]; // 澳彩、皇冠、BET365、韦德、易胜博
          console.log('[MatchDetail] Loading odds data for match:', matchId);
          const oddsResponse = await fetchOddsLive(matchId, companyIds);
          console.log('[MatchDetail] Odds response received:', oddsResponse);
          const parsedOdds = parseOddsData(oddsResponse, matchId, companyIds);
          console.log('[MatchDetail] Parsed odds data:', parsedOdds);
          
          if (parsedOdds) {
            setMatch(prevMatch => {
              if (!prevMatch) return prevMatch;
              const updated = {
                ...prevMatch,
                odds: parsedOdds,
              };
              console.log('[MatchDetail] Updated match with odds:', updated.odds);
              return updated;
            });
          } else {
            console.warn('[MatchDetail] Parsed odds data is undefined or empty');
          }
        } catch (err) {
          console.error('Failed to load odds data when clicking odds tab:', err);
        }
      };

      loadOddsData();
    }
  }, [activeTab, matchId, match]);

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

  // 简写球员名字（参考图片，尽量完整显示，只对过长名字做适度截断）
  const getShortName = (name: string): string => {
    if (!name) return '';
    
    // 如果包含空格，取最后一个部分（通常是姓氏）
    // 但保留分隔符如"·"、"•"等，因为这些是名字的一部分
    if (name.includes(' ') && !name.includes('·') && !name.includes('•')) {
      const parts = name.split(/\s+/);
      if (parts.length > 1) {
        return parts[parts.length - 1];
      }
    }
    
    // 中文名字：超过5个字才截断，保留前5个字
    if (/[\u4e00-\u9fa5]/.test(name)) {
      return name.length > 5 ? name.substring(0, 5) : name;
    }
    
    // 英文名字：超过10个字符才截断
    return name.length > 10 ? name.substring(0, 10) : name;
  };

  // 球员节点组件（根据坐标绝对定位）
  const PlayerNode = ({ player, isAway = false, fieldWidth = 100, fieldHeight = 100 }: { 
    player: Player; 
    isAway?: boolean;
    fieldWidth?: number;
    fieldHeight?: number;
  }) => {
    // 处理坐标系统
    // 主队坐标原点：左上（x轴向右，y轴向下），坐标范围0-100
    // 客队坐标原点：右下（x轴向左，y轴向上），坐标范围0-100
    // 需要将客队坐标转换为以左上角为原点的坐标系
    let xPercent = 0;
    let yPercent = 0;
    
    if (player.x !== undefined && player.y !== undefined) {
      if (isAway) {
        // 客队：坐标原点在右下，x轴向左，y轴向上
        // API返回的x=50, y=12表示从右下角向左50个单位，向上12个单位
        // 转换为左上角为原点的百分比：
        // - x: 从右下角向左50，相当于从左向右50，所以 x = 100 - x = 50
        // - y: 从右下角向上12，相当于从顶部向下88，所以 y = 100 - y = 88
        xPercent = 100 - player.x;
        // 客队应该显示在下半场（y: 50-100%）
        // 客队的y坐标（0-100，从右下角向上）映射到下半场（50-100%）
        // 如果y=0（右下角），映射到100%；如果y=100（右上角），映射到50%
        yPercent = 50 + (100 - player.y) * 0.5;
      } else {
        // 主队：坐标原点在左上，x轴向右，y轴向下
        // API返回的x=50, y=12表示从左上角向右50个单位，向下12个单位
        // 主队应该显示在上半场（y: 0-50%），所以需要将y坐标映射到上半场
        xPercent = player.x;
        // 主队的y坐标（0-100，从左上角向下）映射到上半场（0-50%）
        // 如果y=0（左上角），映射到0%；如果y=100（左下角），映射到50%
        yPercent = player.y * 0.5;
      }
    }
    
    // 解析球员事件
    const incidents = player.incidents || [];
    const yellowCards = incidents.filter(i => i.type === STAT_TYPE.YELLOW_CARD);
    const redCards = incidents.filter(i => i.type === STAT_TYPE.RED_CARD || i.type === STAT_TYPE.SECOND_YELLOW);
    const substitutions = incidents.filter(i => i.type === STAT_TYPE.SUBSTITUTION);
    const goals = incidents.filter(i => i.type === STAT_TYPE.GOAL || i.type === STAT_TYPE.PENALTY);
    
    // 获取换人时间（如果有被换下的事件）
    const substitutionOut = substitutions.find(s => s.out_player?.id === parseInt(player.id));
    const substitutionTime = substitutionOut?.time || '';
    
    // 优先使用 incidents 中 player.name，如果没有则使用 player.name
    const playerName = (() => {
      // 从 incidents 中查找第一个有 player.name 的事件
      const incidentWithPlayer = incidents.find(i => i.player?.name);
      if (incidentWithPlayer?.player?.name) {
        return incidentWithPlayer.player.name;
      }
      // 如果没有找到，使用原始的 player.name
      return player.name;
    })();
    
    // 确保坐标在有效范围内，避免边缘重叠
    // x限制在5%-95%范围内，y根据主客队分别限制
    xPercent = Math.max(5, Math.min(95, xPercent));
    if (isAway) {
      // 客队：y限制在下半场（50-95%）
      yPercent = Math.max(50, Math.min(95, yPercent));
    } else {
      // 主队：y限制在上半场（5-50%）
      yPercent = Math.max(5, Math.min(50, yPercent));
    }
    
    return (
      <div 
        className="absolute flex flex-col items-center z-30"
        style={{
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="relative">
          {/* 球员号码 */}
          <div className={`absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold z-10 border border-white/30 ${
            isAway ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {player.number}
          </div>
          {/* 头像 */}
          <Avatar className={`w-9 h-9 border-2 shadow-lg ${
            isAway ? 'border-green-500' : 'border-red-500'
          }`}>
            <AvatarImage src={player.avatar} />
            <AvatarFallback className={`text-[9px] text-white ${
              isAway ? 'bg-green-600' : 'bg-red-600'
            }`}>{player.number}</AvatarFallback>
          </Avatar>
          {/* 队长标记 */}
          {player.isCaptain && (
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-bold border border-white/50">
              C
            </div>
          )}
          {/* 黄牌标记 */}
          {yellowCards.length > 0 && (
            <div className="absolute -bottom-0.5 -left-0.5">
              <YellowCardIcon size={12} />
            </div>
          )}
          {/* 红牌标记 */}
          {redCards.length > 0 && (
            <div className="absolute -bottom-0.5 -left-0.5">
              <RedCardIcon size={12} />
            </div>
          )}
          {/* 换人标记 */}
          {substitutionOut && (
            <div className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5 bg-red-600/90 rounded px-0.5 py-0 text-[8px] text-white font-medium border border-white/30">
              <ArrowLeft className="w-2 h-2" />
              <span>{substitutionTime}</span>
            </div>
          )}
          {/* 进球标记 */}
          {goals.length > 0 && (
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full">
              <GoalIcon size={12} />
            </div>
          )}
        </div>
        {/* 球员名字（简写） */}
        <span className="text-[9px] text-white mt-0.5 text-center truncate max-w-[50px] drop-shadow-lg font-medium leading-tight">
          {(() => {
            console.log(`球员完整名字 (player.name): ${player.name}, 从incidents获取: ${playerName}, 简写: ${getShortName(playerName)}`);
            return getShortName(playerName);
          })()}
        </span>
      </div>
    );
  };

  // 赔率标签页组件
  const OddsTab = ({ match }: { match: MatchDetailInfo }) => {
    const [oddsType, setOddsType] = useState<'handicap' | 'euroOdds' | 'overUnder' | 'corners'>('handicap');
    const [timeType, setTimeType] = useState<'half' | 'full'>('full');

    console.log('[OddsTab] Match odds data:', match.odds);

    // 根据可用数据动态生成类型列表
    const availableOddsTypes = [
      match.odds?.handicap && Array.isArray(match.odds.handicap) && match.odds.handicap.length > 0 && { id: 'handicap' as const, label: '让球' },
      match.odds?.euroOdds && Array.isArray(match.odds.euroOdds) && match.odds.euroOdds.length > 0 && { id: 'euroOdds' as const, label: '胜平负' },
      match.odds?.overUnder && Array.isArray(match.odds.overUnder) && match.odds.overUnder.length > 0 && { id: 'overUnder' as const, label: '总进球' },
      match.odds?.corners && Array.isArray(match.odds.corners) && match.odds.corners.length > 0 && { id: 'corners' as const, label: '角球' },
    ].filter(Boolean) as Array<{ id: 'handicap' | 'euroOdds' | 'overUnder' | 'corners'; label: string }>;

    console.log('[OddsTab] Available odds types:', availableOddsTypes);

    // 当数据更新时，如果当前选中的类型没有数据，则切换到第一个可用的类型
    useEffect(() => {
      if (match.odds) {
        const currentTypeHasData = 
          (oddsType === 'handicap' && match.odds.handicap && match.odds.handicap.length > 0) ||
          (oddsType === 'euroOdds' && match.odds.euroOdds && match.odds.euroOdds.length > 0) ||
          (oddsType === 'overUnder' && match.odds.overUnder && match.odds.overUnder.length > 0) ||
          (oddsType === 'corners' && match.odds.corners && match.odds.corners.length > 0);
        
        if (!currentTypeHasData && availableOddsTypes.length > 0) {
          setOddsType(availableOddsTypes[0].id);
        }
      }
    }, [match.odds, oddsType, availableOddsTypes]);

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
          {availableOddsTypes.map(type => (
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
        {oddsType === 'handicap' && match.odds.handicap && match.odds.handicap.length > 0 && (
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
        {oddsType === 'euroOdds' && match.odds.euroOdds && match.odds.euroOdds.length > 0 && (
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
        {oddsType === 'overUnder' && match.odds.overUnder && match.odds.overUnder.length > 0 && (
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
        {oddsType === 'corners' && match.odds.corners && match.odds.corners.length > 0 && (
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

  // 聊天消息数据
  interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userLevel: number;
    avatar: string;
    content: string;
    timestamp: Date;
    isExpert?: boolean;
  }

  interface Expert {
    id: string;
    name: string;
    avatar: string;
    badge: string;
    streak?: string;
    isLive?: boolean;
  }

  // 虚拟聊天数据
  const virtualExperts: Expert[] = [
    { id: '1', name: '大玮聊球', avatar: '/avatars/avatar-1.png', badge: '专家', streak: '最长9连红' },
    { id: '2', name: '普清流', avatar: '/avatars/avatar-2.png', badge: '', isLive: true },
  ];

  const virtualChatMessages: ChatMessage[] = [
    { id: '1', userId: '1', userName: '红起来大红', userLevel: 50, avatar: '/avatars/avatar-3.png', content: '这个角球不给也太过分了吧，方向了也取消?', timestamp: new Date() },
    { id: '2', userId: '2', userName: '妃永恒', userLevel: 23, avatar: '/avatars/avatar-4.png', content: '还有加时', timestamp: new Date() },
    { id: '3', userId: '3', userName: '用户elh7el', userLevel: 18, avatar: '/avatars/avatar-5.png', content: '@gork 自己去看新规吧，你的规则几年前了', timestamp: new Date() },
    { id: '4', userId: '4', userName: '用户ehoh76', userLevel: 3, avatar: '/avatars/avatar-6.png', content: '这也太夸张了', timestamp: new Date() },
    { id: '5', userId: '5', userName: '最强心态亚家铲', userLevel: 42, avatar: '/avatars/avatar-7.png', content: '不给点球，居然连角球都没了??', timestamp: new Date() },
    { id: '6', userId: '6', userName: '用户66ta1d', userLevel: 6, avatar: '/avatars/avatar-8.png', content: '结束了哥们', timestamp: new Date() },
    { id: '7', userId: '7', userName: 'Gork', userLevel: 31, avatar: '/avatars/avatar-9.png', content: '@用户elh7el 呵呵呵 你好好研究清楚 再说话', timestamp: new Date() },
    { id: '8', userId: '8', userName: '芝麻开门绿地白框', userLevel: 31, avatar: '/avatars/avatar-1.png', content: '点球不给可以角球必须有', timestamp: new Date() },
    { id: '9', userId: '9', userName: '最强心态亚家铲', userLevel: 42, avatar: '/avatars/avatar-7.png', content: '不给点球，居然连角球都没了??', timestamp: new Date() },
    { id: '10', userId: '10', userName: '演给你看', userLevel: 13, avatar: '/avatars/avatar-2.png', content: '到处都是沙特的比赛，怎么回事', timestamp: new Date() },
    { id: '11', userId: '11', userName: '芝麻开门绿地白框', userLevel: 31, avatar: '/avatars/avatar-1.png', content: '最后吹个越位', timestamp: new Date() },
    { id: '12', userId: '12', userName: '都有过去也有过不去', userLevel: 22, avatar: '/avatars/avatar-3.png', content: '进球为什么吹', timestamp: new Date() },
    { id: '13', userId: '13', userName: '芝麻开门绿地白框', userLevel: 31, avatar: '/avatars/avatar-1.png', content: '进攻的球员突破进去也越位吗?', timestamp: new Date() },
  ];

  // 聊天标签页组件
  const ChatTab = ({ matchId }: { matchId: string }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(virtualChatMessages);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const getLevelColor = (level: number) => {
      if (level >= 40) return 'bg-orange-500';
      if (level >= 30) return 'bg-purple-500';
      if (level >= 20) return 'bg-blue-500';
      if (level >= 10) return 'bg-green-500';
      return 'bg-muted-foreground';
    };

    const handleSendMessage = () => {
      if (!inputValue.trim()) return;
      const newMessage: ChatMessage = {
        id: `new-${Date.now()}`,
        userId: 'current-user',
        userName: '我',
        userLevel: 15,
        avatar: '/avatars/avatar-1.png',
        content: inputValue,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInputValue('');
    };

    return (
      <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
        {/* 专家推荐区 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card">
          {virtualExperts.map(expert => (
            <div key={expert.id} className="flex items-center gap-2">
              <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src={expert.avatar} />
                  <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {expert.isLive && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                    <Play className="w-2 h-2 fill-white text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{expert.name}</span>
                  {expert.badge && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                      {expert.badge}
                    </Badge>
                  )}
                </div>
                {expert.streak && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded w-fit">
                    {expert.streak}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 聊天消息区 */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-3 space-y-3">
            {messages.map(message => (
              <div key={message.id} className="flex gap-2">
                {/* 等级标签 */}
                <div className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] text-white font-medium ${getLevelColor(message.userLevel)}`}>
                  Lv {message.userLevel}
                </div>
                {/* 消息内容 */}
                <div className="flex-1 min-w-0">
                  <span className="text-warning font-medium text-sm">{message.userName}: </span>
                  <span className="text-foreground text-sm">{message.content}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 聊天输入区 */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50 bg-muted/30">
          <button className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="跟大家聊聊呗"
              className="pr-10 bg-muted/50 border-border/50 rounded-full"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>
          <button className="flex-shrink-0 p-2 text-warning hover:text-warning/80 transition-colors">
            <Gift className="w-5 h-5" />
          </button>
          <button className="flex-shrink-0 p-2 text-destructive hover:text-destructive/80 transition-colors font-bold text-lg">
            66
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SwipeBackIndicator isActive={isSwipingBack} progress={swipeProgress} />
      
      {/* 顶部区域 - 足球场背景 */}
      <div className="relative overflow-hidden">
        {/* 背景图片 */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${ftbLiveBg})` }}
        />
        {/* 背景遮罩，确保文字可读性 */}
        <div className="absolute inset-0 bg-black/40" />

        {/* 头部导航 */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 safe-area-padding-top">
          <button onClick={() => navigate('/models')} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium">{match.league}{match.leagueStage ? ` ${match.leagueStage}` : ''}</div>
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
              {/* Logo 在上方 */}
              {match.homeTeam.logo ? (
                <img 
                  src={match.homeTeam.logo} 
                  alt={match.homeTeam.name}
                  className="w-16 h-16 mb-2 object-contain"
                />
              ) : (
                <div className="text-5xl mb-2">{match.homeTeam.flag}</div>
              )}
              <div className="text-white font-medium text-center">{match.homeTeam.name}</div>
              {match.homeTeam.fifaRank && (
                <div className="text-white/60 text-sm">[FIFA {match.homeTeam.fifaRank}]</div>
              )}
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
              {/* Logo 在上方 */}
              {match.awayTeam.logo ? (
                <img 
                  src={match.awayTeam.logo} 
                  alt={match.awayTeam.name}
                  className="w-16 h-16 mb-2 object-contain"
                />
              ) : (
                <div className="text-5xl mb-2">{match.awayTeam.flag}</div>
              )}
              <div className="text-white font-medium text-center">{match.awayTeam.name}</div>
              {match.awayTeam.fifaRank && (
                <div className="text-white/60 text-sm">[FIFA {match.awayTeam.fifaRank}]</div>
              )}
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
            { id: 'chat' as const, label: '聊天', icon: MessageCircle },
            { id: 'lineup' as const, label: '阵容', icon: Users },
            { id: 'odds' as const, label: '指数', icon: BarChart2 },
            { id: 'expert' as const, label: 'HUNSOCCER AI热力图', icon: UserCheck },
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
            {/* 时间轴图表 */}
            <Card className="p-4 bg-muted/20 border-border/50">
              <div className="relative">
                {/* 球队Logo */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-2 z-10">
                  {match.homeTeam.logo ? (
                    <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-10 h-10 rounded-full object-contain bg-white/10 p-1" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">{match.homeTeam.flag}</div>
                  )}
                  {match.awayTeam.logo ? (
                    <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-10 h-10 rounded-full object-contain bg-white/10 p-1" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">{match.awayTeam.flag}</div>
                  )}
                </div>

                {/* 时间轴容器 */}
                <div className="ml-14 relative">
                  {/* 时间刻度 */}
                  <div className="flex items-center justify-between mb-2 text-[10px] text-muted-foreground px-1">
                    <span>0'</span>
                    <span>15'</span>
                    <span>30'</span>
                    <span className="text-destructive font-medium">HT</span>
                    <span>60'</span>
                    <span>75'</span>
                    <span>90'</span>
                  </div>

                  {/* 图表区域 - 使用 SVG 路径连接数据点 */}
                  <div className="relative h-20">
                    {(() => {
                      
                      if (!match.timeline || match.timeline.length === 0) {
                          return (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                            暂无趋势数据
                    </div>
                        );
                      }

                      // 计算图表尺寸和范围
                      const chartHeight = 80;
                      const chartWidth = 100;
                      // 减小可用区域高度，让填充区域显示更低
                      const heightScale = 0.6; // 缩放系数，0.6表示只使用60%的高度
                      const topAreaHeight = (chartHeight / 2) * heightScale;
                      const bottomAreaHeight = (chartHeight / 2) * heightScale;
                      const centerY = chartHeight / 2;
                      
                      // 获取最大分钟数（用于计算 x 轴比例）
                      const maxMinute = Math.max(...match.timeline.map(p => p.minute), 90);
                      
                      // 获取最大强度值（用于计算 y 轴比例）
                      const maxIntensity = Math.max(
                        ...match.timeline.map(p => Math.max(p.homeIntensity, p.awayIntensity)),
                        100
                      );
                      
                      // 计算每个数据点的坐标
                      // 注意：同一时间点不会同时有主队和客队的趋势值
                      // 按时间顺序连接所有点，形成一条连续折线
                      const points = match.timeline.map((point) => {
                        const x = (point.minute / maxMinute) * 100;
                        
                        // 根据趋势值确定Y坐标
                        // 正数：主队趋势，向上（Y < centerY）
                        // 负数：客队趋势，向下（Y > centerY）
                        // 0：在中心线上
                        let y: number;
                        let isHome: boolean;
                        
                        if (point.homeIntensity > 0) {
                          // 主队趋势：向上
                          const homeRatio = point.homeIntensity / maxIntensity;
                          y = centerY - (homeRatio * topAreaHeight);
                          isHome = true;
                        } else if (point.awayIntensity > 0) {
                          // 客队趋势：向下
                          const awayRatio = point.awayIntensity / maxIntensity;
                          y = centerY + (awayRatio * bottomAreaHeight);
                          isHome = false;
                        } else {
                          // 都为0：在中心线上
                          y = centerY;
                          isHome = true; // 默认值，不影响显示
                        }
                        
                        const pointData = {
                          x,
                          y: Math.max(0, Math.min(chartHeight, y)),
                          minute: point.minute,
                          homeIntensity: point.homeIntensity,
                          awayIntensity: point.awayIntensity,
                          isHome, // 用于确定填充颜色
                        };
                        
                        return pointData;
                      });
                      

                      // 生成按时间顺序连接的折线路径
                      // 根据每个点的趋势值（正数向上，负数向下）形成一条连续折线
                      // 填充区域需要分别处理上半部分和下半部分
                      
                      // 生成完整的折线路径（按时间顺序连接所有点）
                      const trendLinePath = points.length > 0 ? (() => {
                        if (points.length === 0) return '';
                        if (points.length === 1) {
                          return `M ${points[0].x} ${points[0].y}`;
                        }
                        
                        // 按时间顺序连接所有点
                        let path = `M ${points[0].x} ${points[0].y}`;
                        for (let i = 1; i < points.length; i++) {
                          path += ` L ${points[i].x} ${points[i].y}`;
                        }
                        return path;
                      })() : '';
                      
                      // 生成填充路径：按时间顺序遍历所有点，分别处理上半部分和下半部分
                      // 上半部分（橙色）：从中心线开始，连接所有Y < centerY的点，回到中心线
                      // 下半部分（灰色）：从中心线开始，连接所有Y > centerY的点，回到中心线
                      
                      // 计算两点之间与中心线的交点
                      const getIntersection = (p1: typeof points[0], p2: typeof points[0]): { x: number; y: number } | null => {
                        // 如果两点在中心线的同一侧，没有交点
                        if ((p1.y < centerY && p2.y < centerY) || (p1.y > centerY && p2.y > centerY) || (p1.y === centerY && p2.y === centerY)) {
                          return null;
                        }
                        // 如果其中一点在中心线上，返回该点
                        if (p1.y === centerY) return { x: p1.x, y: centerY };
                        if (p2.y === centerY) return { x: p2.x, y: centerY };
                        // 计算交点
                        const t = (centerY - p1.y) / (p2.y - p1.y);
                        return {
                          x: p1.x + (p2.x - p1.x) * t,
                          y: centerY,
                        };
                      };
                      
                      // 生成上半部分填充路径（橙色）
                      const homePath = points.length > 0 ? (() => {
                        if (points.length === 0) return '';
                        
                        // 收集所有在中心线上方的点和与中心线的交点
                        const homePathPoints: Array<{ x: number; y: number }> = [];
                        
                        for (let i = 0; i < points.length; i++) {
                          const current = points[i];
                          const prev = i > 0 ? points[i - 1] : null;
                          
                          // 如果当前点在中心线上方
                          if (current.y < centerY) {
                            // 如果前一个点在中心线下方或中心线上，添加交点
                            if (prev && prev.y >= centerY) {
                              const intersection = getIntersection(prev, current);
                              if (intersection) {
                                homePathPoints.push(intersection);
                              }
                            }
                            // 添加当前点
                            homePathPoints.push({ x: current.x, y: current.y });
                          } else if (current.y === centerY && prev && prev.y < centerY) {
                            // 如果当前点在中心线上，且前一个点在中心线上方，添加当前点
                            homePathPoints.push({ x: current.x, y: centerY });
                          } else if (current.y > centerY && prev && prev.y < centerY) {
                            // 如果当前点在中心线下方，但前一个点在中心线上方，添加交点
                            const intersection = getIntersection(prev, current);
                            if (intersection) {
                              homePathPoints.push(intersection);
                            }
                          }
                        }
                        
                        if (homePathPoints.length === 0) return '';
                        
                        // 构建路径：从时间轴起点（x=0）开始，连接所有点，回到时间轴终点
                        const firstX = homePathPoints[0].x;
                        const lastX = homePathPoints[homePathPoints.length - 1].x;
                        const startX = firstX > 0 ? 0 : firstX; // 如果第一个点不在起点，从起点开始
                        const endX = lastX < 100 ? 100 : lastX; // 如果最后一个点不在终点，到终点结束
                        
                        let path = `M ${startX} ${centerY}`;
                        // 如果起点不在第一个点，先连接到第一个点
                        if (startX < firstX) {
                          path += ` L ${firstX} ${centerY}`;
                        }
                        // 连接所有点
                        homePathPoints.forEach((p) => {
                          path += ` L ${p.x} ${p.y}`;
                        });
                        // 如果终点不在最后一个点，从最后一个点连接到终点
                        if (endX > lastX) {
                          path += ` L ${lastX} ${centerY} L ${endX} ${centerY}`;
                        } else {
                          path += ` L ${lastX} ${centerY}`;
                        }
                        path += ' Z';
                        
                        return path;
                      })() : '';
                      
                      // 生成下半部分填充路径（灰色）
                      const awayPath = points.length > 0 ? (() => {
                        if (points.length === 0) return '';
                        
                        // 收集所有在中心线下方的点和与中心线的交点
                        const awayPathPoints: Array<{ x: number; y: number }> = [];
                        
                        for (let i = 0; i < points.length; i++) {
                          const current = points[i];
                          const prev = i > 0 ? points[i - 1] : null;
                          
                          // 如果当前点在中心线下方
                          if (current.y > centerY) {
                            // 如果前一个点在中心线上方或中心线上，添加交点
                            if (prev && prev.y <= centerY) {
                              const intersection = getIntersection(prev, current);
                              if (intersection) {
                                awayPathPoints.push(intersection);
                              }
                            }
                            // 添加当前点
                            awayPathPoints.push({ x: current.x, y: current.y });
                          } else if (current.y === centerY && prev && prev.y > centerY) {
                            // 如果当前点在中心线上，且前一个点在中心线下方，添加当前点
                            awayPathPoints.push({ x: current.x, y: centerY });
                          } else if (current.y < centerY && prev && prev.y > centerY) {
                            // 如果当前点在中心线上方，但前一个点在中心线下方，添加交点
                            const intersection = getIntersection(prev, current);
                            if (intersection) {
                              awayPathPoints.push(intersection);
                            }
                          }
                        }
                        
                        if (awayPathPoints.length === 0) return '';
                        
                        // 构建路径：从时间轴起点（x=0）开始，连接所有点，回到时间轴终点
                        const firstX = awayPathPoints[0].x;
                        const lastX = awayPathPoints[awayPathPoints.length - 1].x;
                        const startX = firstX > 0 ? 0 : firstX; // 如果第一个点不在起点，从起点开始
                        const endX = lastX < 100 ? 100 : lastX; // 如果最后一个点不在终点，到终点结束
                        
                        let path = `M ${startX} ${centerY}`;
                        // 如果起点不在第一个点，先连接到第一个点
                        if (startX < firstX) {
                          path += ` L ${firstX} ${centerY}`;
                        }
                        // 连接所有点
                        awayPathPoints.forEach((p) => {
                          path += ` L ${p.x} ${p.y}`;
                        });
                        // 如果终点不在最后一个点，从最后一个点连接到终点
                        if (endX > lastX) {
                          path += ` L ${lastX} ${centerY} L ${endX} ${centerY}`;
                        } else {
                          path += ` L ${lastX} ${centerY}`;
                        }
                        path += ' Z';
                        
                        return path;
                      })() : '';

                          return (
                        <svg 
                          className="absolute inset-0 w-full h-full" 
                          viewBox="0 0 100 80"
                          preserveAspectRatio="none"
                        >
                          {/* 主队趋势填充区域（橙色，上半部分） */}
                          {homePath && (
                            <path
                              d={homePath}
                              fill="rgb(251 146 60)" // orange-400
                              fillOpacity="0.6"
                            />
                          )}
                          
                          {/* 客队趋势填充区域（灰色，下半部分） */}
                          {awayPath && (
                            <path
                              d={awayPath}
                              fill="rgb(115 115 115)" // neutral-500
                              fillOpacity="0.5"
                            />
                          )}
                          
                          {/* 中心线 */}
                          <line
                            x1="0"
                            y1={centerY}
                            x2="100"
                            y2={centerY}
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeWidth="0.5"
                          />
                        </svg>
                      );
                    })()}

                    {/* 事件标记 */}
                    {match.events.map((event, index) => {
                      // 计算事件在时间轴上的位置（0-90分钟）
                      const minute = parseInt(event.minute.replace("'", "")) || 0;
                      const position = (minute / 90) * 100; // 假设比赛最多90分钟
                      
                      // 根据事件类型显示不同的图标
                      let eventIcon = null;
                      let eventPosition = 'top'; // 'top' 或 'bottom'
                      
                      if (event.type === 'goal') {
                        eventIcon = <GoalIcon size={18} />;
                        eventPosition = event.team === 'home' ? 'top' : 'bottom';
                      } else if (event.type === 'yellow_card') {
                        eventIcon = <YellowCardIcon size={16} />;
                        eventPosition = event.team === 'home' ? 'top' : 'bottom';
                      } else if (event.type === 'red_card') {
                        eventIcon = <RedCardIcon size={16} />;
                        eventPosition = event.team === 'home' ? 'top' : 'bottom';
                      } else if (event.type === 'substitution') {
                        eventIcon = <div className="w-3 h-3 bg-blue-500 rounded-sm" />;
                        eventPosition = event.team === 'home' ? 'top' : 'bottom';
                      } else if (event.type === 'corner') {
                        eventIcon = <CornerIcon size={16} />;
                        eventPosition = event.team === 'home' ? 'top' : 'bottom';
                      } else if (event.type === 'whistle') {
                        eventIcon = <WhistleIcon size={16} />;
                        eventPosition = event.team === 'home' ? 'top' : 'bottom';
                      }

                      if (!eventIcon) return null;

                      return (
                        <div
                          key={index}
                          className="absolute z-20"
                          style={{
                            left: `${position}%`,
                            [eventPosition === 'top' ? 'top' : 'bottom']: eventPosition === 'top' ? '-8px' : '-8px',
                            transform: 'translateX(-50%)'
                          }}
                        >
                          {eventIcon}
                        </div>
                      );
                    })}

                    {/* HT标记线 */}
                    <div className="absolute top-0 bottom-0 left-[50%] w-px bg-destructive/50 z-10" />
                  </div>
                </div>
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

              {/* 红黄牌和角球统计 */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <CornerIcon size={16} />
                    <span className="text-xs">{match.stats.homeCorners}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <RedCardIcon size={16} />
                    <span className="text-xs">{match.homeTeam.redCards}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <YellowCardIcon size={16} />
                    <span className="text-xs">{match.homeTeam.yellowCards}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{match.awayTeam.yellowCards}</span>
                    <YellowCardIcon size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{match.awayTeam.redCards}</span>
                    <RedCardIcon size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{match.stats.awayCorners}</span>
                    <CornerIcon size={16} />
                  </div>
                </div>
              </div>
            </Card>

            {/* 文字直播 / 重要事件 */}
            <Card className="bg-muted/20 border-border/50 overflow-hidden">
              <div className="flex border-b border-border/50">
                <button 
                  onClick={() => setTextLiveTab('text')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    textLiveTab === 'text' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  文字直播
                </button>
                <button 
                  onClick={() => setTextLiveTab('events')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    textLiveTab === 'events' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  重要事件
                </button>
                {textLiveTab === 'events' && (
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-xs text-muted-foreground">只看进球</span>
                    <button
                      onClick={() => setOnlyGoals(!onlyGoals)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        onlyGoals ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        onlyGoals ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                )}
              </div>
              <ScrollArea className="h-64">
                {textLiveTab === 'text' ? (
                  // 文字直播内容
                  <div className="p-4 space-y-4">
                    {textLiveData && Array.isArray(textLiveData) && textLiveData.length > 0 ? (
                    // 显示所有文字直播数据，按数组倒序排列（最新的在最上面）
                    [...textLiveData]
                      .filter((text) => {
                        // 确保有数据内容
                        return text && text.data && text.data.trim() !== '';
                      })
                      .reverse() // 直接倒序，最新的在最上面
                      .map((text, index) => {
                        // 根据文字直播类型判断图标
                        let icon = null;
                        
                        switch (text.type) {
                          case STAT_TYPE.GOAL:
                          case STAT_TYPE.PENALTY:
                          case STAT_TYPE.OWN_GOAL:
                            icon = <GoalIcon size={18} />;
                            break;
                          case STAT_TYPE.YELLOW_CARD:
                            // 黄色矩形，倾斜
                            icon = <YellowCardIcon size={20} className="transform rotate-12" />;
                            break;
                          case STAT_TYPE.RED_CARD:
                          case STAT_TYPE.SECOND_YELLOW:
                            // 红牌图标，倾斜
                            icon = <RedCardIcon size={20} className="transform rotate-12" />;
                            break;
                          case STAT_TYPE.SUBSTITUTION:
                            icon = <div className="w-4 h-4 bg-blue-500 rounded-sm" />;
                            break;
                          case STAT_TYPE.CORNER:
                            // 角球图标
                            icon = <CornerIcon size={18} />;
                            break;
                          case STAT_TYPE.SHOT_OFF_TARGET:
                            // 偏球图标
                            icon = <OffTargetIcon size={18} />;
                            break;
                          case STAT_TYPE.SHOT_ON_TARGET:
                            // 射正图标
                            icon = <OnTargetIcon size={18} />;
                            break;
                          case STAT_TYPE.OFFSIDE:
                            // 越位图标
                            icon = <OffsideIcon size={18} />;
                            break;
                          case STAT_TYPE.HALF_TIME:
                          case STAT_TYPE.MATCH_END:
                          case STAT_TYPE.MATCH_START:
                            // 哨子图标
                            icon = <WhistleIcon size={18} />;
                            break;
                          default:
                            icon = text.main === 1 ? (
                              <WhistleIcon size={18} />
                            ) : (
                              <InfoIcon size={18} />
                            );
                            break;
                        }
                        
                        // 判断是否有球队信息
                        const hasTeam = text.position !== 0;
                        const teamLogo = hasTeam 
                          ? (text.position === 1 ? match.homeTeam.logo || match.homeTeam.flag : match.awayTeam.logo || match.awayTeam.flag)
                          : null;
                        const isLogo = hasTeam && (text.position === 1 ? match.homeTeam.logo : match.awayTeam.logo);
                        
                        // 处理描述文本：如果 data 中已经包含了时间（格式如 "1' - 描述"），则提取时间
                        let displayTime = text.time && text.time.trim() !== '' ? text.time : '';
                        let displayData = text.data || '';
                        
                        // 如果 time 为空但 data 中包含时间格式（如 "1' - "），提取时间
                        if (!displayTime && displayData) {
                          const timeMatch = displayData.match(/^(\d+['']?)\s*[-–—]\s*/);
                          if (timeMatch) {
                            displayTime = timeMatch[1];
                            // 移除 data 中的时间部分
                            displayData = displayData.replace(/^\d+['']?\s*[-–—]\s*/, '');
                          }
                        }
                        
                        return (
                          <div key={index} className="flex gap-3 items-start">
                            {/* 图标 */}
                            <div className="flex-shrink-0 flex items-center justify-center">
                                {icon}
                            </div>
                            
                            {/* 描述文本 */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {displayData}
                              </div>
                            </div>
                            
                            {/* 球队 Logo（如果有） */}
                            {hasTeam && teamLogo && (
                              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                {isLogo ? (
                                  <img 
                                    src={teamLogo as string} 
                                    alt={text.position === 1 ? match.homeTeam.name : match.awayTeam.name}
                                    className="w-8 h-8 rounded-full object-contain"
                                  />
                                ) : (
                                  <span className="text-lg">{teamLogo}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : match.events && match.events.length > 0 ? (
                    // 如果没有文字直播数据，显示事件列表作为后备
                    match.events.map((event, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-12">
                          {event.type === 'yellow_card' ? (
                            <YellowCardIcon size={20} />
                          ) : event.type === 'goal' ? (
                            <GoalIcon size={18} />
                          ) : event.type === 'whistle' ? (
                            <WhistleIcon size={18} />
                          ) : (
                            <InfoIcon size={18} />
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
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      暂无文字直播数据
                    </div>
                  )}
                </div>
                ) : (
                  // 重要事件内容 - 时间线样式
                  <div className="p-4">
                    {(() => {
                      // 获取重要事件：从 incidents 和 tlive 中筛选
                      const importantEvents: Array<{
                        minute: string;
                        type: 'goal' | 'half_time' | 'match_start' | 'match_end';
                        score?: string;
                        description: string;
                        team?: 'home' | 'away';
                      }> = [];
                      
                      // 从 incidents 中获取进球事件
                      if (liveData?.incidents) {
                        liveData.incidents.forEach(incident => {
                          if (incident.type === STAT_TYPE.GOAL) {
                            const minute = `${incident.time}'`;
                            const score = incident.home_score !== undefined && incident.away_score !== undefined
                              ? `${incident.home_score} - ${incident.away_score}`
                              : undefined;
                            importantEvents.push({
                              minute,
                              type: 'goal',
                              score,
                              description: '进球',
                              team: incident.position === 1 ? 'home' : incident.position === 2 ? 'away' : undefined
                            });
                          }
                        });
                      }
                      
                      // 从 tlive 中获取重要事件（main === 1 或特定类型）
                      if (textLiveData && textLiveData.length > 0) {
                        textLiveData.forEach(text => {
                          if (text.main === 1 || text.type === STAT_TYPE.GOAL || text.type === STAT_TYPE.HALF_TIME || text.type === STAT_TYPE.MATCH_START || text.type === STAT_TYPE.MATCH_END) {
                            // 提取时间
                            let minute = text.time && text.time.trim() !== '' ? text.time : '';
                            if (!minute && text.data) {
                              const timeMatch = text.data.match(/^(\d+['']?)\s*[-–—]\s*/);
                              if (timeMatch) {
                                minute = timeMatch[1];
                              }
                            }
                            
                            if (text.type === STAT_TYPE.GOAL || text.type === STAT_TYPE.PENALTY || text.type === STAT_TYPE.OWN_GOAL) {
                              // 提取比分
                              const scoreMatch = text.data.match(/(\d+)\s*[-–—]\s*(\d+)/);
                              const score = scoreMatch ? `${scoreMatch[1]} - ${scoreMatch[2]}` : undefined;
                              
                              importantEvents.push({
                                minute: minute || '0\'',
                                type: 'goal',
                                score,
                                description: '进球',
                                team: text.position === 1 ? 'home' : text.position === 2 ? 'away' : undefined
                              });
                            } else if (text.type === STAT_TYPE.HALF_TIME) {
                              // 提取半场比分
                              const scoreMatch = text.data.match(/(\d+)\s*[-–—]\s*(\d+)/);
                              const score = scoreMatch ? `${scoreMatch[1]} - ${scoreMatch[2]}` : undefined;
                              
                              importantEvents.push({
                                minute: minute || 'HT',
                                type: 'half_time',
                                score,
                                description: '半场结束',
                                team: undefined
                              });
                            } else if (text.type === STAT_TYPE.MATCH_START) {
                              importantEvents.push({
                                minute: minute || '0\'',
                                type: 'match_start',
                                description: '比赛开始',
                                team: undefined
                              });
                            } else if (text.type === STAT_TYPE.MATCH_END) {
                              const scoreMatch = text.data.match(/(\d+)\s*[-–—]\s*(\d+)/);
                              const score = scoreMatch ? `${scoreMatch[1]} - ${scoreMatch[2]}` : undefined;
                              
                              importantEvents.push({
                                minute: minute || 'FT',
                                type: 'match_end',
                                score,
                                description: '比赛结束',
                                team: undefined
                              });
                            }
                          }
                        });
                      }
                      
                      // 如果 onlyGoals 为 true，只显示进球
                      const filteredEvents = onlyGoals 
                        ? importantEvents.filter(e => e.type === 'goal')
                        : importantEvents;
                      
                      // 按时间排序（正序，从早到晚）
                      filteredEvents.sort((a, b) => {
                        const timeA = parseInt(a.minute.replace("'", "").replace("HT", "45").replace("FT", "90")) || 0;
                        const timeB = parseInt(b.minute.replace("'", "").replace("HT", "45").replace("FT", "90")) || 0;
                        return timeA - timeB;
                      });
                      
                      if (filteredEvents.length === 0) {
                        return (
                          <div className="text-center text-muted-foreground py-8">
                            暂无重要事件
                          </div>
                        );
                      }
                      
                      return (
                        <div className="relative">
                          {/* 时间线 */}
                          <div className="absolute left-8 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-border/50" />
                          
                          {/* 事件列表 */}
                          <div className="space-y-6">
                            {/* 开始标记 */}
                            <div className="relative flex items-center">
                              <div className="absolute left-6 w-4 h-4 rounded-full bg-destructive border-2 border-background z-10" />
                              <div className="ml-16"></div>
                            </div>
                            
                            {filteredEvents.map((event, index) => (
                              <div key={index} className="relative flex items-start">
                                {/* 时间线节点 */}
                                <div className="absolute left-6 w-4 h-4 rounded-full bg-destructive border-2 border-background z-10" />
                                
                                {/* 时间（左侧） */}
                                <div className="w-16 flex-shrink-0 text-right pr-4">
                                  <span className="text-sm font-medium text-foreground">{event.minute}</span>
                                </div>
                                
                                {/* 事件卡片（右侧） */}
                                <div className="flex-1 ml-4">
                                  {event.type === 'goal' ? (
                                    <div className="bg-muted/50 rounded-lg p-3 inline-block">
                                      <div className="flex items-center gap-2">
                                        {event.score && (
                                          <span className="text-base font-medium text-foreground">{event.score}</span>
                                        )}
                                        <GoalIcon size={18} />
                                        <span className="text-sm text-foreground">进球</span>
                                      </div>
                                    </div>
                                  ) : event.type === 'half_time' ? (
                                    <div className="text-center">
                                      <div className="text-sm text-foreground font-medium">
                                        半场结束 {event.score || ''}
                                      </div>
                                    </div>
                                  ) : event.type === 'match_start' ? (
                                    <div className="text-center">
                                      <div className="text-sm text-foreground font-medium">
                                        {event.description}
                                      </div>
                                    </div>
                                  ) : event.type === 'match_end' ? (
                                    <div className="text-center">
                                      <div className="text-sm text-foreground font-medium">
                                        比赛结束 {event.score || ''}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                            
                            {/* 结束标记（如果是半场结束） */}
                            {filteredEvents.some(e => e.type === 'half_time') && (
                              <div className="relative flex items-center">
                                <div className="absolute left-6 w-4 h-4 rounded-full bg-destructive border-2 border-background z-10" />
                                <div className="ml-16"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
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
            <div className="relative rounded-xl overflow-hidden">
              {/* 足球场背景图 */}
              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${footballFieldBg})` }} />

              {/* 球场容器（使用相对定位，球员绝对定位） */}
              {/* 坐标系统：主队原点在左上，客队原点在右下，坐标范围0-100 */}
              {/* 坐标直接映射到容器的百分比位置，不考虑padding */}
              <div className="relative w-full" style={{ minHeight: '500px', aspectRatio: '3/2', padding: '40px 20px' }}>
                {/* 主队阵容 - 根据坐标绝对定位 */}
                {match.homeTeam.lineup && match.homeTeam.lineup.startingXI.length > 0 && (
                  <>
                    {/* 主队标识和阵型 */}
                    <div className="absolute top-2 left-4 flex items-center gap-2 z-20">
                      {match.homeTeam.logo ? (
                        <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-8 h-8 rounded object-contain bg-white/10 p-1" />
                      ) : (
                        <span className="text-xl">{match.homeTeam.flag}</span>
                      )}
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-sm">{match.homeTeam.shortName}</span>
                        <div className="flex items-center gap-2 text-white/80 text-xs">
                          <span>阵型: {match.homeTeam.lineup.formation}</span>
                          {match.homeTeam.lineup.totalValue && (
                            <span>首发身价: {match.homeTeam.lineup.totalValue}</span>
                          )}
                          {match.homeTeam.lineup.averageAge > 0 && (
                            <span>平均: {match.homeTeam.lineup.averageAge}岁</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 主队教练 */}
                    {match.homeTeam.lineup.coach && (
                      <div className="absolute top-2 right-4 flex items-center gap-1 text-white/70 text-xs z-20">
                        <Clock className="w-3 h-3" />
                        <span>{match.homeTeam.lineup.coach}</span>
                      </div>
                    )}
                    
                    {/* 主队球员（根据坐标绝对定位） */}
                    {match.homeTeam.lineup.startingXI.map(player => (
                      <PlayerNode 
                        key={player.id} 
                        player={player} 
                        isAway={false}
                        fieldWidth={100}
                        fieldHeight={100}
                      />
                    ))}
                  </>
                )}

                {/* 分隔线 */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30 z-10" />

                {/* 客队阵容 - 根据坐标绝对定位 */}
                {match.awayTeam.lineup && match.awayTeam.lineup.startingXI.length > 0 && (
                  <>
                    {/* 客队标识和阵型 */}
                    <div className="absolute bottom-2 left-4 flex items-center gap-2 z-20">
                      {match.awayTeam.logo ? (
                        <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-8 h-8 rounded object-contain bg-white/10 p-1" />
                      ) : (
                        <span className="text-xl">{match.awayTeam.flag}</span>
                      )}
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-sm">{match.awayTeam.shortName}</span>
                        <div className="flex items-center gap-2 text-white/80 text-xs">
                          <span>阵型: {match.awayTeam.lineup.formation}</span>
                          {match.awayTeam.lineup.totalValue && (
                            <span>首发身价: {match.awayTeam.lineup.totalValue}</span>
                          )}
                          {match.awayTeam.lineup.averageAge > 0 && (
                            <span>平均: {match.awayTeam.lineup.averageAge}岁</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 客队教练 */}
                    {match.awayTeam.lineup.coach && (
                      <div className="absolute bottom-2 right-4 flex items-center gap-1 text-white/70 text-xs z-20">
                        <Clock className="w-3 h-3" />
                        <span>{match.awayTeam.lineup.coach}</span>
                      </div>
                    )}
                    
                    {/* 客队球员（根据坐标绝对定位） */}
                    {match.awayTeam.lineup.startingXI.map(player => (
                      <PlayerNode 
                        key={player.id} 
                        player={player} 
                        isAway={true}
                        fieldWidth={100}
                        fieldHeight={100}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* 阵型对比分析 */}
            <FormationComparisonPanel 
              homeTeam={{
                name: match.homeTeam.name,
                shortName: match.homeTeam.shortName,
                flag: match.homeTeam.flag,
                formation: match.homeTeam.lineup?.formation || '4-4-2',
                totalValue: match.homeTeam.lineup?.totalValue || '-',
                averageAge: match.homeTeam.lineup?.averageAge || 0,
              }}
              awayTeam={{
                name: match.awayTeam.name,
                shortName: match.awayTeam.shortName,
                flag: match.awayTeam.flag,
                formation: match.awayTeam.lineup?.formation || '4-3-3',
                totalValue: match.awayTeam.lineup?.totalValue || '-',
                averageAge: match.awayTeam.lineup?.averageAge || 0,
              }}
            />

            {/* 替补席 */}
            <Card className="p-4 bg-muted/20 border-border/50">
              <h3 className="text-sm font-medium mb-3">替补席</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* 主队替补 */}
                {match.homeTeam.lineup && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      {match.homeTeam.logo ? (
                        <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-4 h-4 rounded object-contain" />
                      ) : (
                        <span>{match.homeTeam.flag}</span>
                      )}
                      <span>{match.homeTeam.shortName}</span>
                    </div>
                    {match.homeTeam.lineup.substitutes.map(player => {
                      const incidents = player.incidents || [];
                      const substitutionIn = incidents.find(i => i.type === STAT_TYPE.SUBSTITUTION && i.in_player?.id === parseInt(player.id));
                      const substitutionTime = substitutionIn?.time || '';
                      
                      return (
                        <div key={player.id} className="flex items-center gap-2 text-xs">
                          <div className="relative">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={player.avatar} />
                              <AvatarFallback className="text-[8px] bg-muted">{player.number}</AvatarFallback>
                            </Avatar>
                            {substitutionIn && (
                              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-green-600/90 rounded px-0.5 py-0 text-[8px] text-white">
                                <span>{substitutionTime}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-muted-foreground w-6">{player.number}</span>
                          <span className="flex-1 truncate">{player.name}</span>
                          {player.rating > 0 && (
                            <span className="text-xs text-muted-foreground">{player.rating.toFixed(1)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* 客队替补 */}
                {match.awayTeam.lineup && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      {match.awayTeam.logo ? (
                        <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-4 h-4 rounded object-contain" />
                      ) : (
                        <span>{match.awayTeam.flag}</span>
                      )}
                      <span>{match.awayTeam.shortName}</span>
                    </div>
                    {match.awayTeam.lineup.substitutes.map(player => {
                      const incidents = player.incidents || [];
                      const substitutionIn = incidents.find(i => i.type === STAT_TYPE.SUBSTITUTION && i.in_player?.id === parseInt(player.id));
                      const substitutionTime = substitutionIn?.time || '';
                      
                      return (
                        <div key={player.id} className="flex items-center gap-2 text-xs">
                          <div className="relative">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={player.avatar} />
                              <AvatarFallback className="text-[8px] bg-muted">{player.number}</AvatarFallback>
                            </Avatar>
                            {substitutionIn && (
                              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-green-600/90 rounded px-0.5 py-0 text-[8px] text-white">
                                <span>{substitutionTime}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-muted-foreground w-6">{player.number}</span>
                          <span className="flex-1 truncate">{player.name}</span>
                          {player.rating > 0 && (
                            <span className="text-xs text-muted-foreground">{player.rating.toFixed(1)}</span>
                          )}
                        </div>
                      );
                    })}
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

        {activeTab === 'chat' && (
          <ChatTab matchId={match.id} />
        )}

        {activeTab === 'odds' && (
          <OddsTab match={match} />
        )}

        {activeTab === 'expert' && (
          <div className="p-4">
            <LiveFootballAnimation 
              homeFormation={match.homeTeam.lineup?.formation || '4-4-2'}
              awayFormation={match.awayTeam.lineup?.formation || '4-3-3'}
              isPlaying={true}
            />
          </div>
        )}

        {activeTab === 'hot' && (
          <div className="p-4">
            <Card className="p-6 bg-muted/20 border-border/50 text-center">
              <Flame className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">热议内容即将上线</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
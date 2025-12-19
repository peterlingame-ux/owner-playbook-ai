// Football API 类型定义
export interface FixtureResponse {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    venue: {
      id: number | null;
      name: string | null;
      city: string | null;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface StatisticItem {
  type: string;
  value: number | string | null;
}

export interface TeamStatistics {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: StatisticItem[];
}

export interface LineupPlayer {
  player: {
    id: number;
    name: string;
    number: number;
    pos: string;
    grid: string | null;
  };
}

export interface TeamLineup {
  team: {
    id: number;
    name: string;
    logo: string;
    colors: {
      player: { primary: string; number: string; border: string };
      goalkeeper: { primary: string; number: string; border: string };
    };
  };
  coach: {
    id: number;
    name: string;
    photo: string;
  };
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface PlayerStatistics {
  player: {
    id: number;
    name: string;
    photo: string;
  };
  statistics: Array<{
    games: {
      minutes: number | null;
      number: number;
      position: string;
      rating: string | null;
      captain: boolean;
      substitute: boolean;
    };
    shots: {
      total: number | null;
      on: number | null;
    };
    goals: {
      total: number | null;
      conceded: number | null;
      assists: number | null;
      saves: number | null;
    };
    passes: {
      total: number | null;
      key: number | null;
      accuracy: string | null;
    };
    tackles: {
      total: number | null;
      blocks: number | null;
      interceptions: number | null;
    };
    duels: {
      total: number | null;
      won: number | null;
    };
    dribbles: {
      attempts: number | null;
      success: number | null;
      past: number | null;
    };
    fouls: {
      drawn: number | null;
      committed: number | null;
    };
    cards: {
      yellow: number;
      red: number;
    };
    penalty: {
      won: number | null;
      committed: number | null;
      scored: number;
      missed: number;
      saved: number | null;
    };
  }>;
}

export interface TeamPlayers {
  team: {
    id: number;
    name: string;
    logo: string;
    update: string;
  };
  players: PlayerStatistics[];
}

export interface MatchDetailData {
  fixture: FixtureResponse | null;
  statistics: TeamStatistics[] | null;
  lineups: TeamLineup[] | null;
  players: TeamPlayers[] | null;
}

// SportNanoAPI Competition Types
export interface CompetitionHost {
  country: string;
  city?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface Competition {
  id: number;
  name: string;
  logo: string;
}

export interface CompetitionListQuery {
  total: number;
  type: string; // 'sequence' | 'time'
  id?: number;
  min_id?: number;
  max_id?: number;
  limit?: number;
  time?: number;
  min_time?: number;
  max_time?: number;
}

export interface CompetitionListResponse {
  code: number;
  query: CompetitionListQuery;
  results: Competition[];
}

// SportNanoAPI Match Schedule Diary Types
export interface DiaryMatch {
  id: number;
  season_id: number;
  competition_id: number;
  home_team_id: number;
  away_team_id: number;
  status_id: number;
  match_time: number;
  neutral: number;
  note: string;
  home_scores: number[];
  away_scores: number[];
  home_position: string;
  away_position: string;
  coverage: {
    mlive: number;
    intelligence: number;
    lineup: number;
  };
  venue_id: number;
  referee_id: number;
  related_id: number;
  agg_score: number[];
  round: {
    stage_id: number;
    group_num: number;
    round_num: number;
  };
  environment?: {
    weather: number;
    pressure: string;
    temperature: string;
    wind: string;
    humidity: string;
  };
  ended?: number;
  updated_at: number;
}

export interface DiaryTeam {
  id: number;
  name: string;
  logo: string;
}

export interface DiaryQuery {
  total: number;
  type: string; // 'diary'
  date: string; // 'yyyymmdd'
}

export interface FixturesListResponse {
  code: number;
  query: DiaryQuery;
  results: {
    match: DiaryMatch[];
    competition: Competition[];
    team: DiaryTeam[];
  };
}

// SportNanoAPI Match Live Types
export interface MatchLiveScore {
  id: number; // 纳米比赛id
  status: number; // 比赛状态
  homeScores: number[]; // [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]
  awayScores: number[]; // [常规时间比分, 半场比分, 红牌, 黄牌, 角球, 加时比分, 点球比分]
  kickoffTime: number; // 开球时间戳
  note: string; // 备注信息
}

// 比赛统计类型枚举（stats）
// 包含：角球、黄牌、红牌、点球、射正、射偏、进攻、危险进攻、控球率、射门被阻挡
export interface MatchLiveStat {
  type: number; // 统计类型（需要根据API文档映射到具体类型）
  home: number; // 主队值
  away: number; // 客队值
}

// 比赛事件类型枚举（incidents）
// 包含：黄牌、两黄变红、红牌、进球(助攻)、换人、点球、点球未进、乌龙球、VAR、中场、伤停补时、结束、加时结束、点球大战结束
export interface MatchLiveIncident {
  type: number; // 事件类型（需要根据API文档映射到具体类型）
  position: number; // 0-中立、1-主队、2-客队
  time: number; // 时间(分钟)
  second: number; // 时间(秒)
  player_id?: number; // 事件相关球员id
  player_name?: string; // 事件相关球员名称
  home_score?: number; // 主队比分（进球、未进球事件存在）
  away_score?: number; // 客队比分（进球、未进球事件存在）
  var_reason?: number; // VAR原因（VAR事件存在）
  var_result?: number; // VAR结果（VAR事件存在）
  reason_type?: number; // 红黄牌、换人事件原因（红黄牌、换人事件存在）
}

// 文字直播类型枚举（tlive）
// 包含：黄牌、红牌、进球、换人、角球、越位、助攻、比赛开始、中场、结束等
export interface MatchLiveText {
  main: number; // 是否重要事件，1-是、0-否
  type: number; // 类型（需要根据API文档映射到具体类型）
  position: number; // 事件发生方，0-中立、1-主队、2-客队
  time: string; // 事件时间(分钟)
  data: string; // 事件内容
}

export interface MatchLiveData {
  id: number; // 比赛id
  score: MatchLiveScore; // 比分信息
  stats?: MatchLiveStat[]; // 比赛统计（可选）
  incidents?: MatchLiveIncident[]; // 比赛事件（可选）
  tlive?: MatchLiveText[]; // 文字直播（可选）
}

export interface MatchLiveResponse {
  code: number;
  results: MatchLiveData[];
}
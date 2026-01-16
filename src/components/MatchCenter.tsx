import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Flame, Play, Loader2, Clock, Calendar, Trophy, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  fetchFixtures,
  fetchMatchLive,
} from "@/lib/sportnanoapi";
import type { FixtureResponse, Competition, DiaryMatch, DiaryTeam, FixturesListResponse, MatchLiveData } from "@/types/footballApi";

// 比赛数据接口
interface VirtualMatch {
  id: string;
  league: string;
  leagueColor: string;
  time: string;
  minute?: string;
  status: 'live' | 'upcoming' | 'finished';
  timestamp: number; // 时间戳（秒），用于排序
  isHidden?: boolean; // 是否隐藏（status_id === 0 的比赛异常，建议隐藏）
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

type TabType = 'all' | 'live' | 'upcoming' | 'finished' | 'favorites';

const MatchCenter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [matches, setMatches] = useState<VirtualMatch[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [liveDataMap, setLiveDataMap] = useState<Map<number, MatchLiveData>>(new Map());

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


  // 将 API 返回的比赛数据转换为界面需要的格式（用于旧的 FixtureResponse 格式）
  const convertFixtureToMatch = (fixture: FixtureResponse): VirtualMatch => {
    const fixtureData = fixture.fixture;
    const leagueData = fixture.league;
    const teamsData = fixture.teams;
    const goalsData = fixture.goals;
    const scoreData = fixture.score;

    // 判断比赛状态
    let status: 'live' | 'upcoming' | 'finished' = 'upcoming';
    let minute: string | undefined;
    
    // 安全检查：确保 fixtureData 和 status 存在
    if (fixtureData?.status?.short) {
      if (fixtureData.status.short === 'FT' || fixtureData.status.short === 'AET' || fixtureData.status.short === 'PEN') {
        status = 'finished';
      } else if (fixtureData.status.short === 'LIVE' || fixtureData.status.short === 'HT' || fixtureData.status.short === '2H') {
        status = 'live';
        minute = fixtureData.status.elapsed ? `${fixtureData.status.elapsed}'` : undefined;
      }
    }

    // 格式化时间
    const matchDate = fixtureData?.date ? new Date(fixtureData.date) : new Date();
    const time = matchDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // 获取时间戳（秒）
    const timestamp = fixtureData?.timestamp ? Math.floor(fixtureData.timestamp / 1000) : Math.floor(matchDate.getTime() / 1000);

    // 格式化半场比分
    const halfTimeScore = scoreData?.halftime?.home !== null && scoreData?.halftime?.home !== undefined && 
                          scoreData?.halftime?.away !== null && scoreData?.halftime?.away !== undefined
      ? `${scoreData.halftime.home}-${scoreData.halftime.away}`
      : undefined;

    // 生成比赛编号（使用日期和ID）
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayName = dayNames[matchDate.getDay()];
    const matchId = fixtureData?.id ?? 0;
    const matchCode = `${dayName}${String(matchId).slice(-3).padStart(3, '0')}`;

    return {
      id: matchId.toString(),
      league: leagueData?.name ?? '未知联赛',
      leagueColor: 'text-destructive', // 可以根据联赛类型设置不同颜色
      time,
      minute,
      status,
      timestamp,
      isHidden: false, // 旧格式没有 status_id，默认不隐藏
      homeTeam: teamsData?.home?.name ?? '未知主队',
      homeScore: goalsData?.home ?? undefined,
      awayTeam: teamsData?.away?.name ?? '未知客队',
      awayScore: goalsData?.away ?? undefined,
      halfTimeScore,
      corners: undefined, // API 可能不包含角球数据
      matchCode,
      heat: 0, // 热度数据需要从其他API获取
      hasLineup: false, // 需要单独查询
      hasVip: false,
      hasAi: false,
      hasVideo: false,
      isFavorite: favorites.has(matchId.toString()),
    };
  };

  // 将 DiaryMatch 格式转换为界面需要的格式
  const convertDiaryMatchToMatch = (
    match: DiaryMatch,
    teams: DiaryTeam[],
    competitions: Competition[]
  ): VirtualMatch => {
    // match_time 是秒级时间戳，需要转换为毫秒
    let time = '00:00';
    let matchDate = new Date(); // 默认使用当前日期
    
    if (match.match_time && match.match_time > 0) {
      const matchTime = match.match_time * 1000; // 转换为毫秒
      matchDate = new Date(matchTime);
      
      // 检查日期是否有效
      if (!isNaN(matchDate.getTime())) {
        // 格式化时间，使用本地时区
        time = matchDate.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false
        });
      } else {
        console.warn('Invalid match_time:', match.match_time, 'for match:', match.id);
        matchDate = new Date(); // 使用当前日期作为后备
      }
    } else {
      console.warn('match_time is 0 or invalid:', match.match_time, 'for match:', match.id);
    }

    // 判断比赛状态
    // status_id 状态码说明：
    // 0: 比赛异常（建议隐藏）
    // 1: 未开赛
    // 2: 上半场
    // 3: 中场
    // 4: 下半场
    // 5: 加时赛
    // 6: 加时赛(弃用)
    // 7: 点球决战
    // 8: 完场
    // 9: 推迟
    // 10: 中断
    // 11: 腰斩
    // 12: 取消
    // 13: 待定
    let status: 'live' | 'upcoming' | 'finished' = 'upcoming';
    let minute: string | undefined;
    
    const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
    const matchTime = match.match_time || 0;
    const statusId = match.status_id;
    
    // 标记是否需要隐藏（status_id === 0 的比赛异常）
    const isHidden = statusId === 0;
    
    // 根据 status_id 判断比赛状态
    switch (statusId) {
      case 0:
        // 比赛异常，建议隐藏，标记为 finished
        status = 'finished';
        break;
      case 1:
        // 未开赛
        status = 'upcoming';
        break;
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 10:
        // 上半场、中场、下半场、加时赛、点球决战、中断 -> 进行中
        status = 'live';
        
        // 优先使用实时数据计算比赛时间
        const liveData = liveDataMap.get(match.id);
        if (liveData && liveData.score) {
          const liveKickoffTime = liveData.score.kickoffTime;
          const liveStatusId = liveData.score.status;
          
          if (liveKickoffTime && liveKickoffTime > 0) {
            let displayMinutes: number;
            
            if (liveStatusId === 3) {
              // 中场休息
              minute = 'HT';
            } else if (liveStatusId === 2) {
              // 上半场：比赛进行分钟数 = (当前时间戳 - 上半场开球时间戳) / 60 + 1
              const elapsedSeconds = now - liveKickoffTime;
              displayMinutes = Math.floor(elapsedSeconds / 60) + 1;
              
              // 格式化显示：如果大于45且状态不是中场，显示 45' + 具体时间
              if (displayMinutes > 45) {
                minute = `45'+${displayMinutes - 45}'`;
              } else {
                minute = `${displayMinutes}'`;
              }
            } else if (liveStatusId === 4) {
              // 下半场：比赛进行分钟数 = (当前时间戳 - 下半场开球时间戳) / 60 + 45 + 1
              const totalElapsedSeconds = now - liveKickoffTime;
              displayMinutes = Math.floor(totalElapsedSeconds / 60) + 45 + 1;
              
              // 格式化显示：如果大于90，显示 90' + 具体时间
              if (displayMinutes > 90) {
                minute = `90'+${displayMinutes - 90}'`;
              } else {
                minute = `${displayMinutes}'`;
              }
            } else {
              // 其他状态，使用默认逻辑
              if (statusId === 5 || statusId === 6) {
                minute = 'ET';
              } else if (statusId === 7) {
                minute = 'PEN';
              } else if (statusId === 10) {
                minute = '中断';
              }
            }
          } else {
            // 实时数据无效，使用默认逻辑
            if (statusId === 3) {
              minute = 'HT';
            } else if (statusId === 5 || statusId === 6) {
              minute = 'ET';
            } else if (statusId === 7) {
              minute = 'PEN';
            } else if (statusId === 10) {
              minute = '中断';
            }
          }
        } else {
          // 没有实时数据，使用默认逻辑计算比赛进行时间（分钟）
          if (matchTime > 0) {
            const elapsedSeconds = now - matchTime;
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);
            if (elapsedMinutes > 0 && elapsedMinutes <= 150) { // 最多150分钟（包含加时）
              minute = `${elapsedMinutes}'`;
            }
          }
          // 根据 status_id 显示不同的分钟数标识
          if (statusId === 3) {
            minute = 'HT'; // 中场
          } else if (statusId === 5 || statusId === 6) {
            // 加时赛，可以显示 ET (Extra Time)
            if (!minute) minute = 'ET';
          } else if (statusId === 7) {
            // 点球决战
            if (!minute) minute = 'PEN';
          } else if (statusId === 10) {
            // 中断
            if (!minute) minute = '中断';
          }
        }
        break;
      case 8:
      case 11:
      case 12:
        // 完场、腰斩、取消 -> 已结束
        status = 'finished';
        break;
      case 9:
      case 13:
        // 推迟、待定 -> 未开赛
        status = 'upcoming';
        break;
      default:
        // 未知状态，根据时间和 ended 字段判断
        if (match.ended && match.ended > 0) {
          status = 'finished';
        } else if (matchTime > 0 && matchTime <= now) {
          // 如果比赛时间已过，检查是否有比分数据
          const hasScore = (match.home_scores && match.home_scores.length > 0) || 
                           (match.away_scores && match.away_scores.length > 0);
          const elapsedSeconds = now - matchTime;
          // 如果比赛时间已过但未超过2.5小时，且有比分，可能是进行中
          if (elapsedSeconds > 0 && elapsedSeconds <= 9000 && hasScore) { // 2.5小时 = 9000秒
            status = 'live';
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);
            if (elapsedMinutes > 0 && elapsedMinutes <= 150) {
              minute = `${elapsedMinutes}'`;
            }
          } else {
            status = 'finished';
          }
        } else {
          status = 'upcoming';
        }
        break;
    }

    // 解析比分数据
    // home_scores/away_scores 数组说明：
    // [0]: 比分(常规时间)
    // [1]: 半场比分
    // [2]: 红牌
    // [3]: 黄牌
    // [4]: 角球，-1表示没有角球数据
    // [5]: 加时比分(120分钟，即包括常规时间比分)，加时赛才有
    // [6]: 点球大战比分(不包含常规时间及加时赛比分)，点球大战才有
    
    const homeScores = match.home_scores || [];
    const awayScores = match.away_scores || [];
    
    // 直接使用数组第一位的值作为比分
    // home_scores/away_scores 数组说明：
    // [0]: 比分(常规时间) - 直接使用这个值
    // [1]: 半场比分
    // [2]: 红牌
    // [3]: 黄牌
    // [4]: 角球，-1表示没有角球数据
    // [5]: 加时比分(120分钟，即包括常规时间比分)，加时赛才有
    // [6]: 点球大战比分(不包含常规时间及加时赛比分)，点球大战才有
    let homeScore: number | undefined;
    let awayScore: number | undefined;
    let statusText: string | undefined;
    
    // 直接使用索引0的值，确保是有效数字
    if (homeScores.length > 0 && homeScores[0] !== undefined && homeScores[0] !== null) {
      const score = Number(homeScores[0]);
      if (!isNaN(score) && score >= 0) {
        homeScore = score;
      }
    }
    if (awayScores.length > 0 && awayScores[0] !== undefined && awayScores[0] !== null) {
      const score = Number(awayScores[0]);
      if (!isNaN(score) && score >= 0) {
        awayScore = score;
      }
    }
    
    // 如果有点球大战比分，在 statusText 中显示，确保是有效数字
    if (homeScores.length > 6 && awayScores.length > 6) {
      const penaltyHome = Number(homeScores[6]);
      const penaltyAway = Number(awayScores[6]);
      if (!isNaN(penaltyHome) && !isNaN(penaltyAway) && penaltyHome >= 0 && penaltyAway >= 0) {
        statusText = `点球 ${penaltyHome}-${penaltyAway}`;
      }
    }
    
    // 获取半场比分（索引 1），确保是有效数字
    const halfTimeScore = (() => {
      if (homeScores.length > 1 && awayScores.length > 1) {
        const homeHT = Number(homeScores[1]);
        const awayHT = Number(awayScores[1]);
        if (!isNaN(homeHT) && !isNaN(awayHT) && homeHT >= 0 && awayHT >= 0) {
          return `${homeHT}-${awayHT}`;
        }
      }
      return undefined;
    })();
    
    // 获取红牌（索引 2），确保是有效数字
    const homeRedCards = (homeScores.length > 2 && homeScores[2] !== undefined && homeScores[2] !== null) 
      ? (() => {
          const value = Number(homeScores[2]);
          return (!isNaN(value) && value >= 0) ? value : undefined;
        })()
      : undefined;
    const awayRedCards = (awayScores.length > 2 && awayScores[2] !== undefined && awayScores[2] !== null) 
      ? (() => {
          const value = Number(awayScores[2]);
          return (!isNaN(value) && value >= 0) ? value : undefined;
        })()
      : undefined;
    
    // 获取黄牌（索引 3），确保是有效数字
    const homeYellowCards = (homeScores.length > 3 && homeScores[3] !== undefined && homeScores[3] !== null) 
      ? (() => {
          const value = Number(homeScores[3]);
          return (!isNaN(value) && value >= 0) ? value : undefined;
        })()
      : undefined;
    const awayYellowCards = (awayScores.length > 3 && awayScores[3] !== undefined && awayScores[3] !== null) 
      ? (() => {
          const value = Number(awayScores[3]);
          return (!isNaN(value) && value >= 0) ? value : undefined;
        })()
      : undefined;
    
    // 获取角球（索引 4），-1表示没有角球数据，确保是有效数字
    const homeCorners = (homeScores.length > 4 && homeScores[4] !== undefined && homeScores[4] !== null) 
      ? (() => {
          const value = Number(homeScores[4]);
          return (!isNaN(value) && value >= 0) ? value : undefined;
        })()
      : undefined;
    const awayCorners = (awayScores.length > 4 && awayScores[4] !== undefined && awayScores[4] !== null) 
      ? (() => {
          const value = Number(awayScores[4]);
          return (!isNaN(value) && value >= 0) ? value : undefined;
        })()
      : undefined;
    
    // 格式化角球显示
    const corners = (homeCorners !== undefined && awayCorners !== undefined)
      ? `${homeCorners}-${awayCorners}`
      : undefined;

    // 从 teams 数组中查找球队信息
    const homeTeam = teams.find(t => t.id === match.home_team_id);
    const awayTeam = teams.find(t => t.id === match.away_team_id);
    // 使用 match.competition_id 从 competitions 数组中查找对应的联赛信息
    const competition = competitions.find(c => c.id === match.competition_id);
    
    // 获取联赛名称：优先使用中文名称，如果没有则使用英文名称
    const leagueName = competition 
      ? (competition.name || '未知联赛')
      : '未知联赛';

    // 生成比赛编号
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayName = dayNames[matchDate.getDay()];
    const matchCode = `${dayName}${String(match.id).slice(-3).padStart(3, '0')}`;

    return {
      id: match.id.toString(),
      league: leagueName,
      leagueColor: 'text-destructive',
      time,
      minute,
      status,
      timestamp: match.match_time || 0, // 保存时间戳用于排序
      isHidden, // 标记是否需要隐藏（status_id === 0）
      homeTeam: homeTeam?.name || '未知主队',
      homeRank: match.home_position ? (() => {
        const parsed = parseInt(match.home_position, 10);
        return isNaN(parsed) ? undefined : parsed;
      })() : undefined,
      homeScore,
      homeYellowCards,
      homeRedCards,
      awayTeam: awayTeam?.name || '未知客队',
      awayRank: match.away_position ? (() => {
        const parsed = parseInt(match.away_position, 10);
        return isNaN(parsed) ? undefined : parsed;
      })() : undefined,
      awayScore,
      awayYellowCards,
      awayRedCards,
      halfTimeScore,
      corners,
      matchCode,
      heat: 0,
      hasLineup: match.coverage?.lineup === 1,
      hasVip: false,
      hasAi: false,
      hasVideo: match.coverage?.mlive === 1,
      isFavorite: favorites.has(match.id.toString()),
      statusText, // 点球大战比分等信息
    };
  };

  // 获取实时比赛数据
  const fetchLiveData = async () => {
    try {
      const liveResponse = await fetchMatchLive();
      if (liveResponse && liveResponse.results) {
        const liveMap = new Map<number, MatchLiveData>();
        liveResponse.results.forEach((live) => {
          liveMap.set(live.id, live);
        });
        setLiveDataMap(liveMap);
        return liveMap;
      }
    } catch (error) {
      console.error('Failed to fetch live data:', error);
      // 实时数据获取失败不影响主流程，只记录错误
    }
    return new Map<number, MatchLiveData>();
  };

  // 更新已开始比赛的时间显示
  const updateLiveMatchesTime = (liveMap: Map<number, MatchLiveData>) => {
    setMatches(prevMatches => {
      return prevMatches.map(match => {
        if (match.status !== 'live') {
          return match;
        }

        const liveData = liveMap.get(parseInt(match.id));
        if (!liveData || !liveData.score) {
          return match;
        }

        const now = Math.floor(Date.now() / 1000);
        const kickoffTime = liveData.score.kickoffTime;
        const liveStatusId = liveData.score.status;

        if (!kickoffTime || kickoffTime <= 0) {
          return match;
        }

        let displayMinutes: number;
        let minute: string | undefined;

        if (liveStatusId === 3) {
          // 中场休息
          minute = 'HT';
        } else if (liveStatusId === 2) {
          // 上半场：比赛进行分钟数 = (当前时间戳 - 上半场开球时间戳) / 60 + 1
          const elapsedSeconds = now - kickoffTime;
          displayMinutes = Math.floor(elapsedSeconds / 60) + 1;
          
          // 格式化显示：如果大于45且状态不是中场，显示 45' + 具体时间
          if (displayMinutes > 45) {
            minute = `45'+${displayMinutes - 45}'`;
          } else {
            minute = `${displayMinutes}'`;
          }
        } else if (liveStatusId === 4) {
          // 下半场：比赛进行分钟数 = (当前时间戳 - 下半场开球时间戳) / 60 + 45 + 1
          const totalElapsedSeconds = now - kickoffTime;
          displayMinutes = Math.floor(totalElapsedSeconds / 60) + 45 + 1;
          
          // 格式化显示：如果大于90，显示 90' + 具体时间
          if (displayMinutes > 90) {
            minute = `90'+${displayMinutes - 90}'`;
          } else {
            minute = `${displayMinutes}'`;
          }
        }

        if (minute) {
          return { ...match, minute };
        }

        return match;
      });
    });
  };

  // 获取比赛数据的函数
  const fetchMatches = async () => {
    // 如果正在加载中，不重复请求
    if (isLoadingMatches) {
      return;
    }

    setIsLoadingMatches(true);
    setMatchesError(null);
    try {
      // 获取当前日期的比赛数据（date 格式：yyyymmdd）
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      
      const response = await fetchFixtures({ 
        date: dateStr,
        limit: 1000
      });
      
      // 确保 response 和 results 存在
      if (!response) {
        console.error('API response is null or undefined');
        setMatchesError('API 返回数据为空');
        setMatches([]);
        return;
      }
      
      if (!response.results) {
        console.error('API response.results is null or undefined');
        setMatchesError(t('fetch_failed_retry'));
        setMatches([]);
        return;
      }
      
      // 检查 results 是否为对象且包含 match 数组
      if (typeof response.results !== 'object' || !Array.isArray(response.results.match)) {
        console.error('Invalid API response structure:', {
          response,
          resultsType: typeof response.results,
          resultsValue: response.results,
          hasMatch: response.results && 'match' in response.results,
          matchIsArray: response.results && Array.isArray(response.results.match)
        });
        setMatchesError(t('fetch_failed_retry'));
        setMatches([]);
        return;
      }
      
      // 获取球队和联赛数组（直接从返回数据中获取）
      const teams = Array.isArray(response.results.team) ? response.results.team : [];
      const competitions = Array.isArray(response.results.competition) ? response.results.competition : [];
      
      // 先获取实时数据
      const liveMap = await fetchLiveData();
      
      // 转换为界面需要的格式（直接传入数组，在函数内部查找）
      const convertedMatches = response.results.match
        .filter((match: DiaryMatch) => match && match.id)
        .map((match: DiaryMatch) => convertDiaryMatchToMatch(match, teams, competitions));
      setMatches(convertedMatches);
      
      // 如果有实时数据，更新已开始比赛的时间
      if (liveMap.size > 0) {
        updateLiveMatchesTime(liveMap);
      }
      
      // 更新收藏状态
      const favoriteIds = new Set(convertedMatches.filter(m => m.isFavorite).map(m => m.id));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      const errorMessage = error instanceof Error ? error.message : t('fetch_failed_retry');
      setMatchesError(errorMessage);
      setMatches([]); // 清空比赛列表，显示错误信息
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // 组件加载时自动获取比赛数据
  useEffect(() => {
    // 如果还没有数据，自动获取
    if (matches.length === 0) {
      fetchMatches();
    }
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 每分钟自动刷新数据
  useEffect(() => {
    // 设置定时器，每分钟刷新一次
    const interval = setInterval(() => {
      // 只有在不在加载中时才刷新
      if (!isLoadingMatches) {
        fetchMatches();
      }
    }, 60000); // 60000毫秒 = 1分钟

    // 清理定时器
    return () => clearInterval(interval);
  }, [isLoadingMatches]); // 依赖 isLoadingMatches，确保使用最新的状态

  // 每10秒更新实时数据和时间显示（仅针对已开始的比赛）
  useEffect(() => {
    const hasLiveMatches = matches.some(m => m.status === 'live');
    if (!hasLiveMatches) {
      return;
    }

    const updateInterval = setInterval(async () => {
      const liveMap = await fetchLiveData();
      if (liveMap.size > 0) {
        updateLiveMatchesTime(liveMap);
      }
    }, 10000); // 每10秒更新一次

    return () => clearInterval(updateInterval);
  }, [matches]); // 依赖 matches，当比赛列表变化时重新设置定时器

  const handleAllTabClick = async () => {
    setActiveTab('all');
    // 如果还没有数据，则获取数据
    if (matches.length === 0) {
      await fetchMatches();
    }
  };


  // 统计各状态的比赛数量（用于调试）
  const statusCounts = {
    live: matches.filter(m => m.status === 'live').length,
    upcoming: matches.filter(m => m.status === 'upcoming').length,
    finished: matches.filter(m => m.status === 'finished').length,
    total: matches.length
  };
  
  // 只在切换到 live 标签时输出统计信息
  useEffect(() => {
    if (activeTab === 'live') {
      const liveMatches = matches.filter(m => m.status === 'live');
    }
  }, [activeTab, matches]);

  const filteredMatches = matches
    .filter(match => {
      // 排除需要隐藏的比赛（status_id === 0 的比赛异常）
      if (match.isHidden) {
        return false;
      }
      
      if (activeTab === 'all') {
        // 全部：只显示进行中的比赛，不显示未开赛和已完成的比赛
        return match.status === 'live';
      }
      if (activeTab === 'live') return match.status === 'live';
      if (activeTab === 'upcoming') {
        // 赛程：显示今天还未开赛的比赛，包括待定的比赛
        if (match.status !== 'upcoming') return false;
        
        // 不显示联赛名包含"U"的比赛
        if (match.league && match.league.includes('U17')) {
          return false;
        }
        
        // 不显示小于当前时间的比赛（已开始的比赛）
        const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
        if (match.timestamp > 0 && match.timestamp < now) {
          return false;
        }
        
        // 如果时间戳为0或无效，可能是待定比赛，也显示
        if (!match.timestamp || match.timestamp === 0) {
          return true;
        }
        
        // 获取今天的开始和结束时间戳（秒）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = Math.floor(today.getTime() / 1000);
        const todayEnd = todayStart + 86400; // 24小时后
        
        // 检查比赛时间是否在今天
        return match.timestamp >= todayStart && match.timestamp < todayEnd;
      }
      if (activeTab === 'finished') return match.status === 'finished';
      if (activeTab === 'favorites') return favorites.has(match.id);
      return true;
    })
    .sort((a, b) => {
      // 对于已结束的比赛（赛果），按时间倒序（最新的在前）
      if (activeTab === 'finished' || (activeTab === 'all' && a.status === 'finished' && b.status === 'finished')) {
        return b.timestamp - a.timestamp; // 倒序：时间戳大的在前
      }
      // 其他情况按时间正序（时间早的在前）
      return a.timestamp - b.timestamp;
    });

  const favoritesCount = favorites.size;

  const MatchCard = ({ match }: { match: VirtualMatch }) => (
    <div 
      className={cn(
        "group relative py-2.5 sm:py-4 px-2 sm:px-4 cursor-pointer transition-all duration-300",
        "hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent",
        "border-b border-border/20 last:border-b-0"
      )}
      onClick={() => navigate(`/match/${match.id}`)}
    >
      {/* Live indicator pulse */}
      {match.status === 'live' && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 sm:w-1 h-6 sm:h-10 bg-emerald-500 rounded-r-full">
          <div className="absolute inset-0 bg-emerald-500 rounded-r-full animate-pulse" />
        </div>
      )}

      {/* League header - Compact for mobile */}
      <div className="grid grid-cols-3 items-center mb-1.5 sm:mb-3 gap-1 relative">
        {/* 左侧：联赛和时间 */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 justify-start">
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-xs font-semibold text-amber-500/90 uppercase tracking-wider truncate max-w-[100px] xs:max-w-[120px] sm:max-w-none">
              {match.league}
            </span>
          </div>
          <span className="text-[9px] sm:text-xs text-muted-foreground/70 flex items-center gap-0.5 flex-shrink-0">
            <Clock className="w-2 h-2 sm:w-3 sm:h-3" />
            {match.time}
          </span>
        </div>
        {/* 中间：比赛进行时间 - 与比分垂直对齐 */}
        <div className="flex items-center justify-center min-w-[44px] sm:min-w-[70px] mx-auto">
          {match.minute && (
            <span className={cn(
              "text-[9px] sm:text-xs font-bold px-1 sm:px-1.5 py-0.5 rounded",
              match.status === 'live' 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-muted text-muted-foreground"
            )}>
              {match.minute}
            </span>
          )}
          {!match.minute && match.status === 'live' && (
            <span className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs font-bold text-emerald-400">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {/* 右侧：占位，保持布局平衡 */}
        <div className="flex-shrink-0"></div>
      </div>

      {/* Match content - Responsive layout */}
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-1 sm:gap-3">
        {/* Favorite button */}
        <button 
          onClick={(e) => toggleFavorite(match.id, e)}
          className={cn(
            "flex-shrink-0 p-0.5 sm:p-1 rounded-full transition-all duration-200",
            favorites.has(match.id) 
              ? "text-amber-400" 
              : "text-muted-foreground/40 hover:text-amber-400/60"
          )}
        >
          <Star className={cn(
            "w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200",
            favorites.has(match.id) && "fill-current scale-110"
          )} />
        </button>

        {/* Home team */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-2 min-w-0 overflow-hidden">
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {match.homeRedCards !== undefined && match.homeRedCards > 0 && (
              <span className="inline-flex items-center justify-center w-3 h-3 sm:w-5 sm:h-5 text-[8px] sm:text-xs font-bold bg-red-500 text-white rounded">
                {match.homeRedCards}
              </span>
            )}
            {match.homeYellowCards !== undefined && match.homeYellowCards > 0 && (
              <span className="inline-flex items-center justify-center w-3 h-3 sm:w-5 sm:h-5 text-[8px] sm:text-xs font-bold bg-amber-400 text-black rounded">
                {match.homeYellowCards}
              </span>
            )}
          </div>
          {match.homeRank !== undefined && !isNaN(match.homeRank) && (
            <span className="text-[7px] sm:text-[10px] text-muted-foreground/50 font-medium hidden xs:inline">[{match.homeRank}]</span>
          )}
          <span className="text-[10px] sm:text-sm font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
            {match.homeTeam}
          </span>
        </div>

        {/* Score - Compact for mobile - 与顶部比赛进行时间垂直对齐 */}
        <div className="flex-shrink-0 min-w-[44px] sm:min-w-[70px] flex flex-col items-center justify-center">
        {match.status === 'upcoming' || (match.homeScore === undefined && match.awayScore === undefined) ? (
            <div className="flex flex-col items-center">
              {activeTab === 'upcoming' && (
                <span className="text-[7px] sm:text-[10px] text-muted-foreground/50 mb-0.5 uppercase tracking-wider hidden sm:block">{t('soon') || '即将'}</span>
              )}
              <span className="text-[10px] sm:text-sm text-muted-foreground/60 font-medium tracking-widest">vs</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {activeTab === 'finished' && (
                <span className="text-[7px] sm:text-[10px] text-muted-foreground/50 mb-0.5 uppercase tracking-wider hidden sm:block">FT</span>
              )}
              <div className={cn(
                "flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 rounded",
                match.status === 'live' ? "bg-emerald-500/10" : "bg-muted/50"
              )}>
                <span className={cn(
                  "text-[11px] sm:text-base font-bold tabular-nums",
                  match.status === 'live' ? "text-emerald-400" : "text-foreground"
                )}>
                  {match.homeScore !== undefined && !isNaN(match.homeScore) ? match.homeScore : 0}
                </span>
                <span className="text-muted-foreground/50 text-[10px] sm:text-base">-</span>
                <span className={cn(
                  "text-[11px] sm:text-base font-bold tabular-nums",
                  match.status === 'live' ? "text-emerald-400" : "text-foreground"
                )}>
                  {match.awayScore !== undefined && !isNaN(match.awayScore) ? match.awayScore : 0}
                </span>
              </div>
              {((match.halfTimeScore && match.halfTimeScore !== '0-0') || match.corners) && (
                <span className="text-[7px] sm:text-[10px] text-muted-foreground/50 mt-0.5 sm:mt-1 font-medium hidden sm:block">
                  {match.halfTimeScore && match.halfTimeScore !== '0-0' && `HT ${match.halfTimeScore}`}
                  {match.halfTimeScore && match.halfTimeScore !== '0-0' && match.corners && ' • '}
                  {match.corners && `C ${match.corners}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-0.5 sm:gap-2 min-w-0 overflow-hidden">
          <span className="text-[10px] sm:text-sm font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
            {match.awayTeam}
          </span>
          {match.awayRank !== undefined && !isNaN(match.awayRank) && (
            <span className="text-[7px] sm:text-[10px] text-muted-foreground/50 font-medium hidden xs:inline">[{match.awayRank}]</span>
          )}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {match.awayYellowCards !== undefined && match.awayYellowCards > 0 && (
              <span className="inline-flex items-center justify-center w-3 h-3 sm:w-5 sm:h-5 text-[8px] sm:text-xs font-bold bg-amber-400 text-black rounded">
                {match.awayYellowCards}
              </span>
            )}
            {match.awayRedCards !== undefined && match.awayRedCards > 0 && (
              <span className="inline-flex items-center justify-center w-3 h-3 sm:w-5 sm:h-5 text-[8px] sm:text-xs font-bold bg-red-500 text-white rounded">
                {match.awayRedCards}
              </span>
            )}
          </div>
        </div>

        {/* Video button or placeholder - hidden on very small screens */}
        <div className="flex-shrink-0 hidden xs:block">
          {match.hasVideo ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
            >
              <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-400 fill-emerald-400" />
            </button>
          ) : (
            <div className="w-6 h-6 sm:w-8 sm:h-8" />
          )}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'all' as TabType, labelKey: 'match_tab_all', icon: Trophy },
    { id: 'live' as TabType, labelKey: 'match_tab_live', icon: Play },
    { id: 'upcoming' as TabType, labelKey: 'match_tab_upcoming', icon: Calendar },
    { id: 'finished' as TabType, labelKey: 'match_tab_finished', icon: Clock },
    { id: 'favorites' as TabType, labelKey: 'match_tab_favorites', icon: Star },
  ];

  return (
    <Card className="h-[calc(100vh-180px)] sm:h-[700px] min-h-[400px] max-h-[800px] flex flex-col border-border/40 bg-gradient-to-b from-card to-card/95 backdrop-blur-xl shadow-xl overflow-hidden">
      {/* Tab navigation - Compact for mobile */}
      <div className="flex items-center bg-muted/30 px-0.5 sm:px-2 overflow-x-auto border-b border-border/30 scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'all') {
                  handleAllTabClick();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={cn(
                "relative flex items-center gap-0.5 sm:gap-1.5 px-2 sm:px-4 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0",
                isActive 
                  ? "text-emerald-400" 
                  : "text-muted-foreground/70 hover:text-foreground/90"
              )}
            >
              <span className="tracking-wide uppercase">{t(tab.labelKey)}</span>
              {tab.id === 'favorites' && favoritesCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[14px] sm:min-w-[16px] h-[14px] sm:h-[16px] px-0.5 sm:px-1 text-[8px] sm:text-[9px] font-bold bg-emerald-500 text-white rounded-full">
                  {favoritesCount}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 sm:w-10 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Match list */}
      <ScrollArea className="flex-1">
        <div>
          {isLoadingMatches ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400/60" />
                <div className="absolute inset-0 blur-lg bg-emerald-400/20 rounded-full" />
              </div>
              <span className="text-sm text-muted-foreground/70 tracking-wide">{t('loading_matches') || '加载比赛中...'}</span>
            </div>
          ) : matchesError ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-destructive/60" />
              </div>
              <div className="text-center">
                <div className="text-sm text-destructive font-medium mb-1">{t('load_failed') || '加载失败'}</div>
                <div className="text-xs text-muted-foreground/60">{matchesError}</div>
              </div>
              <button
                onClick={handleAllTabClick}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border/50 hover:bg-muted/50 transition-colors tracking-wide uppercase"
              >
                {t('retry') || '重试'}
              </button>
            </div>
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <span className="text-sm text-muted-foreground/60 tracking-wide">{t('no_matches') || '暂无比赛'}</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default MatchCenter;

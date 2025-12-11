import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Maximize2, RotateCcw, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import footballPitchBg from '@/assets/football-pitch-bg.webp';

interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  team: 'home' | 'away';
}

interface PlayerPosition {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  name: string;
  avatar: string;
}

interface FormationPosition {
  x: number;
  y: number;
}

// 虚拟球员名字和头像
const homePlayerNames = ['拉米', '巴塔特', '泰马尼尼', '萨莱赫', '纳布汉', '萨瓦塔', '阿米德', '哈姆丹', '赛亚姆', '昆巴尔', '达巴赫'];
const awayPlayerNames = ['奥瓦伊斯', '布莱克', '阿姆里', '塔姆比蒂', '甘纳姆', '萨尔曼', '道萨里', '马尔基', '哈桑', '布雷坎', '阿西里'];
const homePlayerAvatars = [
  '/avatars/avatar-1.png', '/avatars/avatar-2.png', '/avatars/avatar-3.png', '/avatars/avatar-4.png',
  '/avatars/avatar-5.png', '/avatars/avatar-6.png', '/avatars/avatar-7.png', '/avatars/avatar-8.png',
  '/avatars/avatar-9.png', '/avatars/avatar-1.png', '/avatars/avatar-2.png'
];
const awayPlayerAvatars = [
  '/avatars/avatar-6.png', '/avatars/avatar-7.png', '/avatars/avatar-8.png', '/avatars/avatar-9.png',
  '/avatars/avatar-1.png', '/avatars/avatar-2.png', '/avatars/avatar-3.png', '/avatars/avatar-4.png',
  '/avatars/avatar-5.png', '/avatars/avatar-6.png', '/avatars/avatar-7.png'
];

// 阵型配置 - 定义不同阵型下11个球员的位置
const formations: Record<string, FormationPosition[]> = {
  '4-4-2': [
    { x: 50, y: 90 }, // GK
    { x: 15, y: 70 }, { x: 35, y: 72 }, { x: 65, y: 72 }, { x: 85, y: 70 }, // 后卫
    { x: 15, y: 45 }, { x: 35, y: 48 }, { x: 65, y: 48 }, { x: 85, y: 45 }, // 中场
    { x: 35, y: 20 }, { x: 65, y: 20 }, // 前锋
  ],
  '4-3-3': [
    { x: 50, y: 90 }, // GK
    { x: 15, y: 70 }, { x: 35, y: 72 }, { x: 65, y: 72 }, { x: 85, y: 70 }, // 后卫
    { x: 30, y: 48 }, { x: 50, y: 45 }, { x: 70, y: 48 }, // 中场
    { x: 20, y: 22 }, { x: 50, y: 18 }, { x: 80, y: 22 }, // 前锋
  ],
  '3-5-2': [
    { x: 50, y: 90 }, // GK
    { x: 25, y: 72 }, { x: 50, y: 70 }, { x: 75, y: 72 }, // 后卫
    { x: 10, y: 48 }, { x: 30, y: 45 }, { x: 50, y: 42 }, { x: 70, y: 45 }, { x: 90, y: 48 }, // 中场
    { x: 35, y: 20 }, { x: 65, y: 20 }, // 前锋
  ],
  '3-4-3': [
    { x: 50, y: 90 }, // GK
    { x: 25, y: 72 }, { x: 50, y: 70 }, { x: 75, y: 72 }, // 后卫
    { x: 15, y: 48 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 85, y: 48 }, // 中场
    { x: 20, y: 22 }, { x: 50, y: 18 }, { x: 80, y: 22 }, // 前锋
  ],
  '5-3-2': [
    { x: 50, y: 90 }, // GK
    { x: 10, y: 70 }, { x: 30, y: 72 }, { x: 50, y: 70 }, { x: 70, y: 72 }, { x: 90, y: 70 }, // 后卫
    { x: 30, y: 45 }, { x: 50, y: 42 }, { x: 70, y: 45 }, // 中场
    { x: 35, y: 20 }, { x: 65, y: 20 }, // 前锋
  ],
  '4-2-3-1': [
    { x: 50, y: 90 }, // GK
    { x: 15, y: 70 }, { x: 35, y: 72 }, { x: 65, y: 72 }, { x: 85, y: 70 }, // 后卫
    { x: 35, y: 55 }, { x: 65, y: 55 }, // 后腰
    { x: 20, y: 35 }, { x: 50, y: 32 }, { x: 80, y: 35 }, // 前腰
    { x: 50, y: 15 }, // 前锋
  ],
};

// 阵型特点说明
const formationDescriptions: Record<string, { title: string; description: string }> = {
  '4-4-2': {
    title: '经典平衡阵型',
    description: '攻守平衡，中场覆盖面广，双前锋配合灵活。适合控球和反击战术。'
  },
  '4-3-3': {
    title: '进攻型阵型',
    description: '三前锋提供强大进攻火力，边锋拉边创造空间。中场三角稳固，适合高压逼抢。'
  },
  '3-5-2': {
    title: '中场控制阵型',
    description: '五中场提供强大的中场控制力，边翼卫攻守兼备。双前锋互相配合，适合控球打法。'
  },
  '3-4-3': {
    title: '极端进攻阵型',
    description: '三前锋+四中场的激进配置，边路进攻犀利。防守依赖中场回撤，适合主动进攻。'
  },
  '5-3-2': {
    title: '防守反击阵型',
    description: '五后卫提供坚固防线，双前锋负责反击。边翼卫上下跑动，适合防守反击战术。'
  },
  '4-2-3-1': {
    title: '现代主流阵型',
    description: '双后腰保护防线，三前腰创造机会，单前锋策应。攻守转换快速，适合多种战术。'
  },
};

// 镜像阵型（给客队使用）
const mirrorFormation = (positions: FormationPosition[]): FormationPosition[] => {
  return positions.map(pos => ({
    x: pos.x,
    y: 100 - pos.y,
  }));
};

interface LiveFootballAnimationProps {
  homeFormation?: string;
  awayFormation?: string;
  isPlaying?: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

// 默认队标
import teamBarcelona from '@/assets/team-barcelona.png';
import teamRealMadrid from '@/assets/team-real-madrid.png';

export default function LiveFootballAnimation({
  homeFormation = '4-4-2',
  awayFormation = '4-3-3',
  isPlaying: externalIsPlaying = true,
  homeTeamName = '巴塞罗那',
  awayTeamName = '皇家马德里',
  homeTeamLogo = teamBarcelona,
  awayTeamLogo = teamRealMadrid,
}: LiveFootballAnimationProps) {
  const [isPlaying, setIsPlaying] = useState(externalIsPlaying);
  const [currentHomeFormation, setCurrentHomeFormation] = useState(homeFormation);
  const [currentAwayFormation, setCurrentAwayFormation] = useState(awayFormation);
  const [homePlayers, setHomePlayers] = useState<PlayerPosition[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerPosition[]>([]);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // 初始化球员位置
  const initializePlayers = useCallback(() => {
    const homeFormationPositions = formations[currentHomeFormation] || formations['4-4-2'];
    const awayFormationPositions = mirrorFormation(formations[currentAwayFormation] || formations['4-3-3']);

    setHomePlayers(
      homeFormationPositions.map((pos, idx) => ({
        id: idx,
        x: pos.x,
        y: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        name: homePlayerNames[idx] || `球员${idx + 1}`,
        avatar: homePlayerAvatars[idx] || '/avatars/avatar-1.png',
      }))
    );

    setAwayPlayers(
      awayFormationPositions.map((pos, idx) => ({
        id: idx,
        x: pos.x,
        y: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        name: awayPlayerNames[idx] || `球员${idx + 1}`,
        avatar: awayPlayerAvatars[idx] || '/avatars/avatar-6.png',
      }))
    );
  }, [currentHomeFormation, currentAwayFormation]);

  useEffect(() => {
    initializePlayers();
  }, [initializePlayers]);

  // 更新球员目标位置（模拟跑动）
  const updateTargetPositions = useCallback(() => {
    const homeFormationPositions = formations[currentHomeFormation] || formations['4-4-2'];
    const awayFormationPositions = mirrorFormation(formations[currentAwayFormation] || formations['4-3-3']);

    setHomePlayers(prev => {
      const newPlayers = prev.map((player, idx) => {
        const basePos = homeFormationPositions[idx];
        // 随机偏移模拟跑动
        const offsetX = (Math.random() - 0.5) * 12;
        const offsetY = (Math.random() - 0.5) * 8;
        return {
          ...player,
          targetX: Math.max(5, Math.min(95, basePos.x + offsetX)),
          targetY: Math.max(5, Math.min(95, basePos.y + offsetY)),
        };
      });
      
      // 记录热力图点
      if (showHeatmap) {
        const newHeatPoints: HeatmapPoint[] = newPlayers.map(p => ({
          x: p.x,
          y: p.y,
          intensity: 0.3 + Math.random() * 0.4,
          team: 'home' as const,
        }));
        setHeatmapPoints(prev => [...prev.slice(-200), ...newHeatPoints]);
      }
      
      return newPlayers;
    });

    setAwayPlayers(prev => {
      const newPlayers = prev.map((player, idx) => {
        const basePos = awayFormationPositions[idx];
        const offsetX = (Math.random() - 0.5) * 12;
        const offsetY = (Math.random() - 0.5) * 8;
        return {
          ...player,
          targetX: Math.max(5, Math.min(95, basePos.x + offsetX)),
          targetY: Math.max(5, Math.min(95, basePos.y + offsetY)),
        };
      });
      
      // 记录热力图点
      if (showHeatmap) {
        const newHeatPoints: HeatmapPoint[] = newPlayers.map(p => ({
          x: p.x,
          y: p.y,
          intensity: 0.3 + Math.random() * 0.4,
          team: 'away' as const,
        }));
        setHeatmapPoints(prev => [...prev.slice(-200), ...newHeatPoints]);
      }
      
      return newPlayers;
    });

    // 随机移动球
    setBallPosition(prev => ({
      x: Math.max(10, Math.min(90, prev.x + (Math.random() - 0.5) * 20)),
      y: Math.max(10, Math.min(90, prev.y + (Math.random() - 0.5) * 15)),
    }));
  }, [currentHomeFormation, currentAwayFormation, showHeatmap]);

  // 动画循环
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastUpdateTime = 0;
    const updateInterval = 1500; // 每1.5秒更新目标位置

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateTime > updateInterval) {
        updateTargetPositions();
        lastUpdateTime = timestamp;
      }

      // 平滑移动球员到目标位置
      setHomePlayers(prev =>
        prev.map(player => ({
          ...player,
          x: player.x + (player.targetX - player.x) * 0.05,
          y: player.y + (player.targetY - player.y) * 0.05,
        }))
      );

      setAwayPlayers(prev =>
        prev.map(player => ({
          ...player,
          x: player.x + (player.targetX - player.x) * 0.05,
          y: player.y + (player.targetY - player.y) * 0.05,
        }))
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateTargetPositions]);

  // 切换阵型
  const handleFormationChange = (team: 'home' | 'away', formation: string) => {
    if (team === 'home') {
      setCurrentHomeFormation(formation);
    } else {
      setCurrentAwayFormation(formation);
    }
  };

  // 重置位置
  const handleReset = () => {
    initializePlayers();
    setBallPosition({ x: 50, y: 50 });
    setHeatmapPoints([]);
  };

  // 切换热力图
  const toggleHeatmap = () => {
    setShowHeatmap(!showHeatmap);
    if (showHeatmap) {
      setHeatmapPoints([]);
    }
  };

  const availableFormations = Object.keys(formations);

  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-1"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? '暂停' : '播放'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </Button>
          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            onClick={toggleHeatmap}
            className="gap-1"
          >
            <Flame className="w-3 h-3" />
            热力图
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
        >
          <Maximize2 className="w-3 h-3" />
          全屏
        </Button>
      </div>

      {/* 阵型选择 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 主队阵型 */}
        <div className="space-y-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <img 
              src={homeTeamLogo} 
              alt={homeTeamName}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-sm font-medium text-foreground">{homeTeamName}</span>
            <span className="text-xs text-blue-500 font-bold ml-auto">{currentHomeFormation}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {availableFormations.map(f => (
              <button
                key={f}
                onClick={() => handleFormationChange('home', f)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  currentHomeFormation === f
                    ? 'bg-blue-500 text-white scale-105 shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {/* 阵型说明 */}
          <div className="pt-2 border-t border-blue-500/20">
            <div className="text-xs font-medium text-blue-400 mb-1">
              {formationDescriptions[currentHomeFormation]?.title || '阵型说明'}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {formationDescriptions[currentHomeFormation]?.description || '暂无说明'}
            </p>
          </div>
        </div>

        {/* 客队阵型 */}
        <div className="space-y-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <img 
              src={awayTeamLogo} 
              alt={awayTeamName}
              className="w-6 h-6 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-sm font-medium text-foreground">{awayTeamName}</span>
            <span className="text-xs text-red-500 font-bold ml-auto">{currentAwayFormation}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {availableFormations.map(f => (
              <button
                key={f}
                onClick={() => handleFormationChange('away', f)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  currentAwayFormation === f
                    ? 'bg-red-500 text-white scale-105 shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {/* 阵型说明 */}
          <div className="pt-2 border-t border-red-500/20">
            <div className="text-xs font-medium text-red-400 mb-1">
              {formationDescriptions[currentAwayFormation]?.title || '阵型说明'}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {formationDescriptions[currentAwayFormation]?.description || '暂无说明'}
            </p>
          </div>
        </div>
      </div>

      {/* 球场动画 */}
      <div className="relative rounded-xl overflow-hidden aspect-[16/10] md:aspect-[16/9]">
        {/* 真实足球场背景 */}
        <img 
          src={footballPitchBg} 
          alt="Football Pitch"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 半透明遮罩增加对比度 */}
        <div className="absolute inset-0 bg-black/10" />

        {/* 热力图层 */}
        {showHeatmap && (
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <radialGradient id="homeHeat" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
                  <stop offset="50%" stopColor="rgba(59, 130, 246, 0.3)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                </radialGradient>
                <radialGradient id="awayHeat" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
                  <stop offset="50%" stopColor="rgba(239, 68, 68, 0.3)" />
                  <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
                </radialGradient>
              </defs>
              {heatmapPoints.map((point, idx) => (
                <circle
                  key={idx}
                  cx={point.x}
                  cy={point.y}
                  r={4 + point.intensity * 3}
                  fill={point.team === 'home' ? 'url(#homeHeat)' : 'url(#awayHeat)'}
                  opacity={point.intensity * 0.6}
                />
              ))}
            </svg>
          </div>
        )}

        {/* 主队球员 (蓝色) */}
        {homePlayers.map(player => (
          <div
            key={`home-${player.id}`}
            className="absolute transition-all duration-100 ease-linear"
            style={{
              left: `${player.x}%`,
              top: `${player.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative flex flex-col items-center">
              <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-blue-300 bg-blue-500 shadow-lg shadow-blue-500/50 overflow-hidden">
                <img 
                  src={player.avatar} 
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/avatar-1.png';
                  }}
                />
              </div>
              {/* 球员名字 */}
              <span className="text-[6px] md:text-[8px] text-white font-medium mt-0.5 whitespace-nowrap drop-shadow-md">{player.name}</span>
              {/* 发光效果 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 md:w-9 md:h-9 rounded-full bg-blue-400 blur-sm opacity-50 -z-10" />
            </div>
          </div>
        ))}

        {/* 客队球员 (红色) */}
        {awayPlayers.map(player => (
          <div
            key={`away-${player.id}`}
            className="absolute transition-all duration-100 ease-linear"
            style={{
              left: `${player.x}%`,
              top: `${player.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative flex flex-col items-center">
              <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-red-300 bg-red-500 shadow-lg shadow-red-500/50 overflow-hidden">
                <img 
                  src={player.avatar} 
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatars/avatar-6.png';
                  }}
                />
              </div>
              {/* 球员名字 */}
              <span className="text-[6px] md:text-[8px] text-white font-medium mt-0.5 whitespace-nowrap drop-shadow-md">{player.name}</span>
              {/* 发光效果 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 md:w-9 md:h-9 rounded-full bg-red-400 blur-sm opacity-50 -z-10" />
            </div>
          </div>
        ))}

        {/* 足球 */}
        <div
          className="absolute transition-all duration-300 ease-out"
          style={{
            left: `${ballPosition.x}%`,
            top: `${ballPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-white shadow-lg flex items-center justify-center text-[6px] md:text-[8px]">
            ⚽
          </div>
        </div>

        {/* 实时状态指示 */}
        {isPlaying && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-white font-medium">LIVE</span>
          </div>
        )}

        {/* 阵型显示 */}
        <div className="absolute top-2 right-2 text-[10px] text-white/80">
          {currentHomeFormation} vs {currentAwayFormation}
        </div>

        {/* 队伍标识 */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500 border border-blue-300" />
          <span className="text-[10px] text-white/80">主队</span>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <span className="text-[10px] text-white/80">客队</span>
          <div className="w-3 h-3 rounded bg-red-500 border border-red-300" />
        </div>
      </div>

      {/* 说明文字 */}
      <p className="text-xs text-muted-foreground text-center">
        实时模拟球员跑位变化，点击阵型按钮切换阵型
      </p>
    </div>
  );
}

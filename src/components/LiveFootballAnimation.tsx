import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlayerPosition {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface FormationPosition {
  x: number;
  y: number;
}

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
}

export default function LiveFootballAnimation({
  homeFormation = '4-4-2',
  awayFormation = '4-3-3',
  isPlaying: externalIsPlaying = true,
}: LiveFootballAnimationProps) {
  const [isPlaying, setIsPlaying] = useState(externalIsPlaying);
  const [currentHomeFormation, setCurrentHomeFormation] = useState(homeFormation);
  const [currentAwayFormation, setCurrentAwayFormation] = useState(awayFormation);
  const [homePlayers, setHomePlayers] = useState<PlayerPosition[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerPosition[]>([]);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
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
      }))
    );

    setAwayPlayers(
      awayFormationPositions.map((pos, idx) => ({
        id: idx,
        x: pos.x,
        y: pos.y,
        targetX: pos.x,
        targetY: pos.y,
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

    setHomePlayers(prev =>
      prev.map((player, idx) => {
        const basePos = homeFormationPositions[idx];
        // 随机偏移模拟跑动
        const offsetX = (Math.random() - 0.5) * 12;
        const offsetY = (Math.random() - 0.5) * 8;
        return {
          ...player,
          targetX: Math.max(5, Math.min(95, basePos.x + offsetX)),
          targetY: Math.max(5, Math.min(95, basePos.y + offsetY)),
        };
      })
    );

    setAwayPlayers(prev =>
      prev.map((player, idx) => {
        const basePos = awayFormationPositions[idx];
        const offsetX = (Math.random() - 0.5) * 12;
        const offsetY = (Math.random() - 0.5) * 8;
        return {
          ...player,
          targetX: Math.max(5, Math.min(95, basePos.x + offsetX)),
          targetY: Math.max(5, Math.min(95, basePos.y + offsetY)),
        };
      })
    );

    // 随机移动球
    setBallPosition(prev => ({
      x: Math.max(10, Math.min(90, prev.x + (Math.random() - 0.5) * 20)),
      y: Math.max(10, Math.min(90, prev.y + (Math.random() - 0.5) * 15)),
    }));
  }, [currentHomeFormation, currentAwayFormation]);

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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-xs text-muted-foreground">主队阵型</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {availableFormations.map(f => (
              <button
                key={f}
                onClick={() => handleFormationChange('home', f)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentHomeFormation === f
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-xs text-muted-foreground">客队阵型</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {availableFormations.map(f => (
              <button
                key={f}
                onClick={() => handleFormationChange('away', f)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentAwayFormation === f
                    ? 'bg-red-500 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 球场动画 */}
      <div className="relative bg-gradient-to-b from-green-600 via-green-700 to-green-600 rounded-xl overflow-hidden aspect-[3/4] md:aspect-[4/3]">
        {/* 球场标记 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* 边界 */}
          <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          {/* 中线 */}
          <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="0.3" opacity="0.6" />
          {/* 中圈 */}
          <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <circle cx="50" cy="50" r="0.8" fill="white" opacity="0.6" />
          {/* 上半场禁区 */}
          <rect x="25" y="2" width="50" height="18" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <rect x="35" y="2" width="30" height="8" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <circle cx="50" cy="14" r="0.5" fill="white" opacity="0.6" />
          {/* 下半场禁区 */}
          <rect x="25" y="80" width="50" height="18" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <rect x="35" y="90" width="30" height="8" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <circle cx="50" cy="86" r="0.5" fill="white" opacity="0.6" />
        </svg>

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
            <div className="relative">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded border-2 border-blue-300 bg-blue-500 shadow-lg shadow-blue-500/50 flex items-center justify-center">
                <span className="text-[8px] md:text-[10px] font-bold text-white">{player.id + 1}</span>
              </div>
              {/* 发光效果 */}
              <div className="absolute inset-0 rounded bg-blue-400 blur-sm opacity-50 -z-10" />
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
            <div className="relative">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded border-2 border-red-300 bg-red-500 shadow-lg shadow-red-500/50 flex items-center justify-center">
                <span className="text-[8px] md:text-[10px] font-bold text-white">{player.id + 1}</span>
              </div>
              {/* 发光效果 */}
              <div className="absolute inset-0 rounded bg-red-400 blur-sm opacity-50 -z-10" />
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

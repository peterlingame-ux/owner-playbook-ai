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
  velocityX: number;
  velocityY: number;
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

// 阵型属性评分 (攻击力, 防守力, 中场控制, 边路威胁, 反击能力)
const formationStats: Record<string, { attack: number; defense: number; midfield: number; wing: number; counter: number }> = {
  '4-4-2': { attack: 70, defense: 75, midfield: 80, wing: 70, counter: 75 },
  '4-3-3': { attack: 85, defense: 65, midfield: 70, wing: 90, counter: 70 },
  '3-5-2': { attack: 75, defense: 70, midfield: 90, wing: 85, counter: 65 },
  '3-4-3': { attack: 90, defense: 55, midfield: 75, wing: 85, counter: 60 },
  '5-3-2': { attack: 60, defense: 90, midfield: 70, wing: 75, counter: 85 },
  '4-2-3-1': { attack: 75, defense: 80, midfield: 85, wing: 75, counter: 80 },
};

// 阵型克制关系 (A阵型对B阵型的额外加成)
const formationMatchups: Record<string, Record<string, number>> = {
  '4-4-2': { '4-3-3': 5, '3-4-3': 10, '3-5-2': -5, '5-3-2': -10, '4-2-3-1': 0 },
  '4-3-3': { '4-4-2': -5, '3-4-3': 0, '3-5-2': 10, '5-3-2': 15, '4-2-3-1': -5 },
  '3-5-2': { '4-4-2': 5, '4-3-3': -10, '3-4-3': 5, '5-3-2': 0, '4-2-3-1': -5 },
  '3-4-3': { '4-4-2': -10, '4-3-3': 0, '3-5-2': -5, '5-3-2': 15, '4-2-3-1': -10 },
  '5-3-2': { '4-4-2': 10, '4-3-3': -15, '3-5-2': 0, '3-4-3': -15, '4-2-3-1': 5 },
  '4-2-3-1': { '4-4-2': 0, '4-3-3': 5, '3-5-2': 5, '3-4-3': 10, '5-3-2': -5 },
};

// 计算阵型对抗优势
const calculateFormationAdvantage = (homeFormation: string, awayFormation: string) => {
  const homeStats = formationStats[homeFormation] || formationStats['4-4-2'];
  const awayStats = formationStats[awayFormation] || formationStats['4-3-3'];
  
  // 基础得分
  const homeBase = (homeStats.attack * 0.35 + homeStats.midfield * 0.25 + homeStats.wing * 0.2 + homeStats.counter * 0.2);
  const awayBase = (awayStats.attack * 0.35 + awayStats.midfield * 0.25 + awayStats.wing * 0.2 + awayStats.counter * 0.2);
  
  // 克制加成
  const homeMatchup = formationMatchups[homeFormation]?.[awayFormation] || 0;
  const awayMatchup = formationMatchups[awayFormation]?.[homeFormation] || 0;
  
  // 防守对攻击的影响
  const homeAttackReduction = awayStats.defense * 0.3;
  const awayAttackReduction = homeStats.defense * 0.3;
  
  const homeScore = Math.max(20, Math.min(80, homeBase + homeMatchup - homeAttackReduction + 25));
  const awayScore = Math.max(20, Math.min(80, awayBase + awayMatchup - awayAttackReduction + 25));
  
  const total = homeScore + awayScore;
  const homePercentage = Math.round((homeScore / total) * 100);
  const awayPercentage = 100 - homePercentage;
  
  // 优势描述
  let advantageText = '';
  const diff = homePercentage - awayPercentage;
  if (Math.abs(diff) <= 5) {
    advantageText = '势均力敌';
  } else if (diff > 15) {
    advantageText = '主队占优';
  } else if (diff > 5) {
    advantageText = '主队略优';
  } else if (diff < -15) {
    advantageText = '客队占优';
  } else {
    advantageText = '客队略优';
  }
  
  return { homePercentage, awayPercentage, advantageText, homeScore, awayScore };
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
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50, targetX: 50, targetY: 50, velocityX: 0, velocityY: 0 });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: number; team: 'home' | 'away'; x: number; y: number } | null>(null);
  const [chasingPlayer, setChasingPlayer] = useState<{ id: number; team: 'home' | 'away' } | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const ballUpdateRef = useRef<number>(0);

  // 点击球员显示进攻视角
  const handlePlayerClick = (player: PlayerPosition, team: 'home' | 'away') => {
    if (selectedPlayer?.id === player.id && selectedPlayer?.team === team) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer({ id: player.id, team, x: player.x, y: player.y });
    }
  };

  // 计算进攻三角形区域
  const getAttackTriangle = (playerX: number, playerY: number, team: 'home' | 'away') => {
    // 主队进攻方向向上(y减小)，客队进攻方向向下(y增大)
    const goalY = team === 'home' ? 0 : 100;
    const spreadAngle = 25; // 扩散角度
    
    // 计算三角形的两个远端点
    const distance = Math.abs(goalY - playerY);
    const spreadX = distance * Math.tan(spreadAngle * Math.PI / 180);
    
    const leftX = Math.max(0, playerX - spreadX);
    const rightX = Math.min(100, playerX + spreadX);
    
    return `${playerX},${playerY} ${leftX},${goalY} ${rightX},${goalY}`;
  };

  // 计算传球概率
  const calculatePassProbability = (
    distance: number, 
    isForwardPass: boolean, 
    difficulty: 'easy' | 'medium' | 'hard'
  ): number => {
    // 基础概率基于距离
    let baseProbability = Math.max(10, 100 - distance * 1.5);
    
    // 前进传球加成
    if (isForwardPass) {
      baseProbability += 15;
    }
    
    // 难度调整
    if (difficulty === 'easy') {
      baseProbability += 10;
    } else if (difficulty === 'hard') {
      baseProbability -= 15;
    }
    
    // 限制在5-95之间
    return Math.min(95, Math.max(5, Math.round(baseProbability)));
  };

  // 计算传球路线
  const getPassingRoutes = (selectedId: number, team: 'home' | 'away') => {
    const teammates = team === 'home' ? homePlayers : awayPlayers;
    const selectedPlayer = teammates.find(p => p.id === selectedId);
    if (!selectedPlayer) return [];

    const routes = teammates
      .filter(p => p.id !== selectedId)
      .map(teammate => {
        const dx = teammate.x - selectedPlayer.x;
        const dy = teammate.y - selectedPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 判断传球难度
        let difficulty: 'easy' | 'medium' | 'hard';
        if (distance < 20) {
          difficulty = 'easy';
        } else if (distance < 40) {
          difficulty = 'medium';
        } else {
          difficulty = 'hard';
        }

        // 判断是否是前进传球(进攻方向)
        const isForwardPass = team === 'home' ? dy < 0 : dy > 0;
        
        // 计算传球概率
        const probability = calculatePassProbability(distance, isForwardPass, difficulty);

        return {
          from: { x: selectedPlayer.x, y: selectedPlayer.y },
          to: { x: teammate.x, y: teammate.y },
          distance,
          difficulty,
          isForwardPass,
          teammateId: teammate.id,
          teammateName: teammate.name,
          probability,
        };
      })
      .sort((a, b) => b.probability - a.probability); // 按概率排序，最可能的排前面
    
    return routes;
  };
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
        velocityX: 0,
        velocityY: 0,
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
        velocityX: 0,
        velocityY: 0,
        name: awayPlayerNames[idx] || `球员${idx + 1}`,
        avatar: awayPlayerAvatars[idx] || '/avatars/avatar-6.png',
      }))
    );
  }, [currentHomeFormation, currentAwayFormation]);

  useEffect(() => {
    initializePlayers();
  }, [initializePlayers]);

  // 更新单个球员的目标位置
  const getNewTargetForPlayer = useCallback((basePos: FormationPosition, currentTarget: { x: number; y: number }) => {
    // 更小的随机偏移，更频繁更新
    const offsetX = (Math.random() - 0.5) * 8;
    const offsetY = (Math.random() - 0.5) * 6;
    return {
      targetX: Math.max(8, Math.min(92, basePos.x + offsetX)),
      targetY: Math.max(8, Math.min(92, basePos.y + offsetY)),
    };
  }, []);

  // 更新球员目标位置（模拟跑动）
  const updateTargetPositions = useCallback(() => {
    const homeFormationPositions = formations[currentHomeFormation] || formations['4-4-2'];
    const awayFormationPositions = mirrorFormation(formations[currentAwayFormation] || formations['4-3-3']);

    setHomePlayers(prev => {
      const newPlayers = prev.map((player, idx) => {
        const basePos = homeFormationPositions[idx];
        const newTarget = getNewTargetForPlayer(basePos, { x: player.targetX, y: player.targetY });
        return {
          ...player,
          ...newTarget,
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
        const newTarget = getNewTargetForPlayer(basePos, { x: player.targetX, y: player.targetY });
        return {
          ...player,
          ...newTarget,
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
  }, [currentHomeFormation, currentAwayFormation, showHeatmap, getNewTargetForPlayer]);

  // 更新足球目标位置
  const updateBallTarget = useCallback(() => {
    setBallPosition(prev => {
      // 足球朝随机方向移动，但更平滑
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 12;
      const newTargetX = Math.max(15, Math.min(85, prev.x + Math.cos(angle) * speed));
      const newTargetY = Math.max(15, Math.min(85, prev.y + Math.sin(angle) * speed));
      return {
        ...prev,
        targetX: newTargetX,
        targetY: newTargetY,
      };
    });
  }, []);

  // 找到离球最近的球员
  const findNearestPlayerToBall = useCallback((
    homePlayers: PlayerPosition[], 
    awayPlayers: PlayerPosition[], 
    ballX: number, 
    ballY: number
  ) => {
    let nearestPlayer: { id: number; team: 'home' | 'away'; distance: number } | null = null;
    
    // 检查主队球员（跳过守门员 id=0）
    homePlayers.forEach(player => {
      if (player.id === 0) return; // 守门员不追球
      const dist = Math.sqrt(Math.pow(player.x - ballX, 2) + Math.pow(player.y - ballY, 2));
      if (!nearestPlayer || dist < nearestPlayer.distance) {
        nearestPlayer = { id: player.id, team: 'home', distance: dist };
      }
    });
    
    // 检查客队球员（跳过守门员 id=0）
    awayPlayers.forEach(player => {
      if (player.id === 0) return;
      const dist = Math.sqrt(Math.pow(player.x - ballX, 2) + Math.pow(player.y - ballY, 2));
      if (!nearestPlayer || dist < nearestPlayer.distance) {
        nearestPlayer = { id: player.id, team: 'away', distance: dist };
      }
    });
    
    return nearestPlayer;
  }, []);

  // 动画循环 - 使用物理模拟实现平滑移动
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const targetUpdateInterval = 2000; // 每2秒更新目标位置
    const ballUpdateInterval = 1200; // 足球更频繁更新
    const damping = 0.92; // 阻尼系数
    const acceleration = 0.008; // 加速度
    const chaserAcceleration = 0.015; // 追球球员加速度更高
    const ballDamping = 0.95;
    const ballAcceleration = 0.012;

    const animate = (timestamp: number) => {
      // 更新球员目标位置
      if (timestamp - lastUpdateRef.current > targetUpdateInterval) {
        updateTargetPositions();
        lastUpdateRef.current = timestamp;
      }
      
      // 更新足球目标位置
      if (timestamp - ballUpdateRef.current > ballUpdateInterval) {
        updateBallTarget();
        ballUpdateRef.current = timestamp;
      }

      // 获取当前球的位置并找到最近的球员
      setBallPosition(prevBall => {
        const nearest = findNearestPlayerToBall(homePlayers, awayPlayers, prevBall.x, prevBall.y);
        if (nearest && (!chasingPlayer || nearest.id !== chasingPlayer.id || nearest.team !== chasingPlayer.team)) {
          setChasingPlayer({ id: nearest.id, team: nearest.team });
        }
        return prevBall;
      });

      // 使用速度和加速度平滑移动球员
      setHomePlayers(prev =>
        prev.map(player => {
          const isChaser = chasingPlayer?.team === 'home' && chasingPlayer?.id === player.id;
          
          // 追球球员的目标是球的位置
          let targetX = player.targetX;
          let targetY = player.targetY;
          if (isChaser) {
            targetX = ballPosition.x;
            targetY = ballPosition.y;
          }
          
          const dx = targetX - player.x;
          const dy = targetY - player.y;
          
          // 追球球员有更高的加速度
          const accel = isChaser ? chaserAcceleration : acceleration;
          
          // 应用加速度
          let newVelX = player.velocityX * damping + dx * accel;
          let newVelY = player.velocityY * damping + dy * accel;
          
          // 追球球员速度更快
          const maxSpeed = isChaser ? 1.2 : 0.8;
          const speed = Math.sqrt(newVelX * newVelX + newVelY * newVelY);
          if (speed > maxSpeed) {
            newVelX = (newVelX / speed) * maxSpeed;
            newVelY = (newVelY / speed) * maxSpeed;
          }
          
          return {
            ...player,
            x: player.x + newVelX,
            y: player.y + newVelY,
            velocityX: newVelX,
            velocityY: newVelY,
          };
        })
      );

      setAwayPlayers(prev =>
        prev.map(player => {
          const isChaser = chasingPlayer?.team === 'away' && chasingPlayer?.id === player.id;
          
          let targetX = player.targetX;
          let targetY = player.targetY;
          if (isChaser) {
            targetX = ballPosition.x;
            targetY = ballPosition.y;
          }
          
          const dx = targetX - player.x;
          const dy = targetY - player.y;
          
          const accel = isChaser ? chaserAcceleration : acceleration;
          
          let newVelX = player.velocityX * damping + dx * accel;
          let newVelY = player.velocityY * damping + dy * accel;
          
          const maxSpeed = isChaser ? 1.2 : 0.8;
          const speed = Math.sqrt(newVelX * newVelX + newVelY * newVelY);
          if (speed > maxSpeed) {
            newVelX = (newVelX / speed) * maxSpeed;
            newVelY = (newVelY / speed) * maxSpeed;
          }
          
          return {
            ...player,
            x: player.x + newVelX,
            y: player.y + newVelY,
            velocityX: newVelX,
            velocityY: newVelY,
          };
        })
      );

      // 平滑移动足球
      setBallPosition(prev => {
        const dx = prev.targetX - prev.x;
        const dy = prev.targetY - prev.y;
        
        let newVelX = prev.velocityX * ballDamping + dx * ballAcceleration;
        let newVelY = prev.velocityY * ballDamping + dy * ballAcceleration;
        
        const maxBallSpeed = 1.2;
        const speed = Math.sqrt(newVelX * newVelX + newVelY * newVelY);
        if (speed > maxBallSpeed) {
          newVelX = (newVelX / speed) * maxBallSpeed;
          newVelY = (newVelY / speed) * maxBallSpeed;
        }
        
        return {
          ...prev,
          x: prev.x + newVelX,
          y: prev.y + newVelY,
          velocityX: newVelX,
          velocityY: newVelY,
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateTargetPositions, updateBallTarget, findNearestPlayerToBall, chasingPlayer, ballPosition.x, ballPosition.y, homePlayers, awayPlayers]);

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
    setBallPosition({ x: 50, y: 50, targetX: 50, targetY: 50, velocityX: 0, velocityY: 0 });
    setHeatmapPoints([]);
    lastUpdateRef.current = 0;
    ballUpdateRef.current = 0;
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

        {/* 进攻视角三角形 */}
        {selectedPlayer && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient 
                id="attackGradient" 
                x1="0%" y1={selectedPlayer.team === 'home' ? '100%' : '0%'} 
                x2="0%" y2={selectedPlayer.team === 'home' ? '0%' : '100%'}
              >
                <stop offset="0%" stopColor={selectedPlayer.team === 'home' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(239, 68, 68, 0.6)'} />
                <stop offset="100%" stopColor={selectedPlayer.team === 'home' ? 'rgba(59, 130, 246, 0)' : 'rgba(239, 68, 68, 0)'} />
              </linearGradient>
            </defs>
            <polygon
              points={getAttackTriangle(selectedPlayer.x, selectedPlayer.y, selectedPlayer.team)}
              fill="url(#attackGradient)"
              stroke={selectedPlayer.team === 'home' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)'}
              strokeWidth="0.3"
              className="animate-pulse"
            />
            {/* 视角中心线 */}
            <line
              x1={selectedPlayer.x}
              y1={selectedPlayer.y}
              x2={selectedPlayer.x}
              y2={selectedPlayer.team === 'home' ? 0 : 100}
              stroke={selectedPlayer.team === 'home' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(239, 68, 68, 0.6)'}
              strokeWidth="0.2"
              strokeDasharray="1,1"
            />
          </svg>
        )}

        {/* 传球路线 */}
        {selectedPlayer && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 5 }}>
            <defs>
              {/* 箭头标记 */}
              <marker id="arrowGreen" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 Z" fill="rgba(34, 197, 94, 0.9)" />
              </marker>
              <marker id="arrowYellow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 Z" fill="rgba(234, 179, 8, 0.9)" />
              </marker>
              <marker id="arrowOrange" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                <path d="M0,0 L4,2 L0,4 Z" fill="rgba(249, 115, 22, 0.9)" />
              </marker>
            </defs>
            {getPassingRoutes(selectedPlayer.id, selectedPlayer.team).map((route, idx) => {
              // 根据难度选择颜色
              const colors = {
                easy: { stroke: 'rgba(34, 197, 94, 0.9)', marker: 'url(#arrowGreen)', glow: 'rgba(34, 197, 94, 0.4)', text: '#22c55e' },
                medium: { stroke: 'rgba(234, 179, 8, 0.9)', marker: 'url(#arrowYellow)', glow: 'rgba(234, 179, 8, 0.4)', text: '#eab308' },
                hard: { stroke: 'rgba(249, 115, 22, 0.8)', marker: 'url(#arrowOrange)', glow: 'rgba(249, 115, 22, 0.3)', text: '#f97316' },
              };
              const color = colors[route.difficulty];
              
              // 计算线条终点(稍微缩短以避免覆盖球员)
              const dx = route.to.x - route.from.x;
              const dy = route.to.y - route.from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const shortenBy = 4;
              const endX = route.to.x - (dx / len) * shortenBy;
              const endY = route.to.y - (dy / len) * shortenBy;
              
              // 计算概率标签位置（线段中点）
              const midX = (route.from.x + endX) / 2;
              const midY = (route.from.y + endY) / 2;
              
              // 最高概率的传球线加粗显示
              const isTopChoice = idx === 0;

              return (
                <g key={idx}>
                  {/* 发光效果 */}
                  <line
                    x1={route.from.x}
                    y1={route.from.y}
                    x2={endX}
                    y2={endY}
                    stroke={color.glow}
                    strokeWidth={isTopChoice ? "2.5" : route.isForwardPass ? "1.5" : "1"}
                    strokeLinecap="round"
                  />
                  {/* 主线 */}
                  <line
                    x1={route.from.x}
                    y1={route.from.y}
                    x2={endX}
                    y2={endY}
                    stroke={color.stroke}
                    strokeWidth={isTopChoice ? "0.8" : route.isForwardPass ? "0.5" : "0.3"}
                    strokeDasharray={route.difficulty === 'hard' ? "1,1" : route.difficulty === 'medium' ? "2,1" : "none"}
                    markerEnd={color.marker}
                    strokeLinecap="round"
                    opacity={route.isForwardPass ? 1 : 0.7}
                  />
                  {/* 概率百分比标签 */}
                  <g>
                    {/* 背景 */}
                    <rect
                      x={midX - 3.5}
                      y={midY - 2}
                      width="7"
                      height="4"
                      rx="1"
                      fill={isTopChoice ? "rgba(34, 197, 94, 0.95)" : "rgba(0, 0, 0, 0.8)"}
                    />
                    {/* 概率文字 */}
                    <text
                      x={midX}
                      y={midY + 1}
                      textAnchor="middle"
                      fill={isTopChoice ? "#fff" : color.text}
                      fontSize="2.2"
                      fontWeight={isTopChoice ? "bold" : "normal"}
                    >
                      {route.probability}%
                    </text>
                  </g>
                  {/* 最高概率标记 */}
                  {isTopChoice && (
                    <circle
                      cx={route.to.x}
                      cy={route.to.y}
                      r="5"
                      fill="none"
                      stroke="rgba(34, 197, 94, 0.8)"
                      strokeWidth="0.5"
                      className="animate-ping"
                      style={{ animationDuration: '1.5s' }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}
        
        {/* 传球路线图例 */}
        {selectedPlayer && (
          <div className="absolute top-12 left-2 bg-black/80 backdrop-blur-sm rounded-lg p-2 text-[9px] space-y-1.5" style={{ zIndex: 30 }}>
            <div className="text-white/90 font-medium mb-1.5 border-b border-white/20 pb-1">传球分析图例</div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-green-500 rounded" />
              <span className="text-green-400">短传 (&lt;20m) - 高成功率</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-yellow-500 rounded" style={{ background: 'repeating-linear-gradient(90deg, #eab308, #eab308 4px, transparent 4px, transparent 6px)' }} />
              <span className="text-yellow-400">中传 (20-40m) - 中等风险</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 rounded" style={{ background: 'repeating-linear-gradient(90deg, #f97316, #f97316 2px, transparent 2px, transparent 4px)' }} />
              <span className="text-orange-400">长传 (&gt;40m) - 高风险</span>
            </div>
            <div className="border-t border-white/20 pt-1.5 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500 animate-pulse" />
                <span className="text-green-400">最佳传球选择</span>
              </div>
            </div>
            <div className="text-white/60 text-[8px] mt-1">
              概率 = 距离 + 进攻方向 + 难度
            </div>
          </div>
        )}

        {/* 主队球员 (蓝色) */}
        {homePlayers.map(player => {
          const isChaser = chasingPlayer?.team === 'home' && chasingPlayer?.id === player.id;
          const isSelected = selectedPlayer?.id === player.id && selectedPlayer?.team === 'home';
          
          return (
            <div
              key={`home-${player.id}`}
              className="absolute transition-all duration-75 ease-out cursor-pointer"
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 20 : isChaser ? 15 : 10,
              }}
              onClick={() => handlePlayerClick(player, 'home')}
            >
              <div className="relative flex flex-col items-center">
                {/* 追球指示器 */}
                {isChaser && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-1.5 py-0.5 bg-emerald-500 rounded text-[6px] text-white font-bold animate-pulse shadow-lg shadow-emerald-500/50">
                      ⚡追球
                    </div>
                  </div>
                )}
                {/* 球员头像容器 */}
                <div className="relative">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-3 border-blue-400 bg-blue-600 shadow-xl shadow-blue-600/60 overflow-hidden ring-2 transition-all ${
                    isSelected ? 'ring-4 ring-yellow-400 scale-110' : isChaser ? 'ring-4 ring-emerald-400 scale-105' : 'ring-blue-300/50'
                  }`}>
                    <img 
                      src={player.avatar} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatars/avatar-1.png';
                      }}
                    />
                  </div>
                  {/* 球衣号码 */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
                    isChaser ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}>
                    <span className="text-[8px] md:text-[10px] font-bold text-white">{player.id + 1}</span>
                  </div>
                  {/* 发光效果 */}
                  <div className={`absolute inset-0 rounded-full blur-md -z-10 scale-125 transition-all ${
                    isChaser ? 'bg-emerald-400 opacity-100 animate-pulse' : isSelected ? 'bg-blue-500 opacity-100' : 'bg-blue-500 opacity-60'
                  }`} />
                </div>
                {/* 球员名字 */}
                <div className={`mt-1 px-1.5 py-0.5 rounded text-[6px] md:text-[8px] text-white font-medium whitespace-nowrap shadow-md transition-colors ${
                  isSelected ? 'bg-yellow-500' : isChaser ? 'bg-emerald-500' : 'bg-blue-600/90'
                }`}>
                  {player.name}
                </div>
              </div>
            </div>
          );
        })}

        {/* 客队球员 (红色) */}
        {awayPlayers.map(player => {
          const isChaser = chasingPlayer?.team === 'away' && chasingPlayer?.id === player.id;
          const isSelected = selectedPlayer?.id === player.id && selectedPlayer?.team === 'away';
          
          return (
            <div
              key={`away-${player.id}`}
              className="absolute transition-all duration-75 ease-out cursor-pointer"
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 20 : isChaser ? 15 : 10,
              }}
              onClick={() => handlePlayerClick(player, 'away')}
            >
              <div className="relative flex flex-col items-center">
                {/* 追球指示器 */}
                {isChaser && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-1.5 py-0.5 bg-emerald-500 rounded text-[6px] text-white font-bold animate-pulse shadow-lg shadow-emerald-500/50">
                      ⚡追球
                    </div>
                  </div>
                )}
                {/* 球员头像容器 */}
                <div className="relative">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-3 border-red-400 bg-red-600 shadow-xl shadow-red-600/60 overflow-hidden ring-2 transition-all ${
                    isSelected ? 'ring-4 ring-yellow-400 scale-110' : isChaser ? 'ring-4 ring-emerald-400 scale-105' : 'ring-red-300/50'
                  }`}>
                    <img 
                      src={player.avatar} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatars/avatar-6.png';
                      }}
                    />
                  </div>
                  {/* 球衣号码 */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
                    isChaser ? 'bg-emerald-500' : 'bg-red-600'
                  }`}>
                    <span className="text-[8px] md:text-[10px] font-bold text-white">{player.id + 1}</span>
                  </div>
                  {/* 发光效果 */}
                  <div className={`absolute inset-0 rounded-full blur-md -z-10 scale-125 transition-all ${
                    isChaser ? 'bg-emerald-400 opacity-100 animate-pulse' : isSelected ? 'bg-red-500 opacity-100' : 'bg-red-500 opacity-60'
                  }`} />
                </div>
                {/* 球员名字 */}
                <div className={`mt-1 px-1.5 py-0.5 rounded text-[6px] md:text-[8px] text-white font-medium whitespace-nowrap shadow-md transition-colors ${
                  isSelected ? 'bg-yellow-500' : isChaser ? 'bg-emerald-500' : 'bg-red-600/90'
                }`}>
                  {player.name}
                </div>
              </div>
            </div>
          );
        })}

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

      {/* 能量条对比 */}
      {(() => {
        const advantage = calculateFormationAdvantage(currentHomeFormation, currentAwayFormation);
        const homeStats = formationStats[currentHomeFormation] || formationStats['4-4-2'];
        const awayStats = formationStats[currentAwayFormation] || formationStats['4-3-3'];
        
        return (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-950/50 via-slate-900/80 to-red-950/50 border border-white/10">
            {/* 标题 */}
            <div className="text-center mb-3">
              <h4 className="text-sm font-bold text-white/90">⚡ 阵型对抗能量分析</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                基于 {currentHomeFormation} vs {currentAwayFormation} 实时计算
              </p>
            </div>
            
            {/* 主能量条 */}
            <div className="relative mb-4">
              {/* 队伍名称 */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <img src={homeTeamLogo} alt={homeTeamName} className="w-5 h-5 object-contain" />
                  <span className="text-xs font-medium text-blue-400">{homeTeamName}</span>
                  <span className="text-lg font-bold text-blue-400">{advantage.homePercentage}%</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-white/80 font-medium">
                  {advantage.advantageText}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-red-400">{advantage.awayPercentage}%</span>
                  <span className="text-xs font-medium text-red-400">{awayTeamName}</span>
                  <img src={awayTeamLogo} alt={awayTeamName} className="w-5 h-5 object-contain" />
                </div>
              </div>
              
              {/* 能量条 */}
              <div className="relative h-6 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                {/* 主队能量 */}
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 transition-all duration-700 ease-out"
                  style={{ width: `${advantage.homePercentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
                {/* 客队能量 */}
                <div 
                  className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-600 via-red-500 to-red-400 transition-all duration-700 ease-out"
                  style={{ width: `${advantage.awayPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-pulse" />
                </div>
                {/* 中线 */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 -translate-x-1/2 z-10" />
                {/* 闪电图标 */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-yellow-500 border-2 border-white flex items-center justify-center shadow-lg shadow-yellow-500/50">
                  <span className="text-[10px]">⚡</span>
                </div>
              </div>
            </div>
            
            {/* 属性对比 */}
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { key: 'attack', label: '攻击力', icon: '⚔️' },
                { key: 'defense', label: '防守力', icon: '🛡️' },
                { key: 'midfield', label: '中场控制', icon: '🎯' },
                { key: 'wing', label: '边路威胁', icon: '🏃' },
                { key: 'counter', label: '反击能力', icon: '💨' },
              ].map(({ key, label, icon }) => {
                const homeVal = homeStats[key as keyof typeof homeStats];
                const awayVal = awayStats[key as keyof typeof awayStats];
                const homeWins = homeVal > awayVal;
                const tie = homeVal === awayVal;
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="text-[10px] text-white/60">{icon} {label}</div>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-xs font-bold ${homeWins ? 'text-blue-400' : tie ? 'text-white/60' : 'text-white/40'}`}>
                        {homeVal}
                      </span>
                      <span className="text-[8px] text-white/30">vs</span>
                      <span className={`text-xs font-bold ${!homeWins && !tie ? 'text-red-400' : tie ? 'text-white/60' : 'text-white/40'}`}>
                        {awayVal}
                      </span>
                    </div>
                    {/* 小型对比条 */}
                    <div className="h-1 rounded-full bg-slate-700 overflow-hidden flex">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(homeVal / (homeVal + awayVal)) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-red-500 transition-all duration-500"
                        style={{ width: `${(awayVal / (homeVal + awayVal)) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 进球概率预测 */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <div className="text-[10px] text-white/50 mb-1">预测进球概率</div>
                  <div className="text-xl font-bold text-blue-400">
                    {Math.round(advantage.homePercentage * 0.035 * 10) / 10}
                    <span className="text-xs text-white/40 ml-0.5">球</span>
                  </div>
                </div>
                <div className="px-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <span className="text-sm">⚽</span>
                  </div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-[10px] text-white/50 mb-1">预测进球概率</div>
                  <div className="text-xl font-bold text-red-400">
                    {Math.round(advantage.awayPercentage * 0.035 * 10) / 10}
                    <span className="text-xs text-white/40 ml-0.5">球</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 说明文字 */}
      <p className="text-xs text-muted-foreground text-center mt-3">
        实时模拟球员跑位变化，点击阵型按钮切换阵型查看能量变化
      </p>
    </div>
  );
}

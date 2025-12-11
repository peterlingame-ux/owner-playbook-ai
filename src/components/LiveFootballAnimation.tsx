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

// 球员进攻欲望数据 (基于位置: 0=门将, 1-4=后卫, 5-8=中场, 9-10=前锋)
const getPlayerAttackDesire = (playerId: number) => {
  // 根据位置生成不同的进攻欲望属性
  const positionStats: Record<number, { role: string; attackDesire: number; shootDesire: number; passDesire: number; dribbleDesire: number; runDesire: number }> = {
    0: { role: '门将', attackDesire: 10, shootDesire: 5, passDesire: 85, dribbleDesire: 10, runDesire: 15 },
    1: { role: '后卫', attackDesire: 35, shootDesire: 20, passDesire: 75, dribbleDesire: 30, runDesire: 55 },
    2: { role: '后卫', attackDesire: 30, shootDesire: 15, passDesire: 80, dribbleDesire: 25, runDesire: 50 },
    3: { role: '后卫', attackDesire: 30, shootDesire: 15, passDesire: 80, dribbleDesire: 25, runDesire: 50 },
    4: { role: '后卫', attackDesire: 40, shootDesire: 25, passDesire: 70, dribbleDesire: 35, runDesire: 60 },
    5: { role: '中场', attackDesire: 60, shootDesire: 50, passDesire: 85, dribbleDesire: 65, runDesire: 75 },
    6: { role: '中场', attackDesire: 55, shootDesire: 45, passDesire: 90, dribbleDesire: 60, runDesire: 70 },
    7: { role: '中场', attackDesire: 65, shootDesire: 55, passDesire: 80, dribbleDesire: 70, runDesire: 80 },
    8: { role: '中场', attackDesire: 70, shootDesire: 60, passDesire: 75, dribbleDesire: 75, runDesire: 85 },
    9: { role: '前锋', attackDesire: 90, shootDesire: 95, passDesire: 50, dribbleDesire: 85, runDesire: 90 },
    10: { role: '前锋', attackDesire: 95, shootDesire: 90, passDesire: 55, dribbleDesire: 90, runDesire: 95 },
  };
  
  // 添加一些随机波动
  const base = positionStats[playerId] || positionStats[5];
  return {
    ...base,
    attackDesire: Math.min(100, Math.max(0, base.attackDesire + Math.floor((Math.random() - 0.5) * 10))),
    shootDesire: Math.min(100, Math.max(0, base.shootDesire + Math.floor((Math.random() - 0.5) * 10))),
    passDesire: Math.min(100, Math.max(0, base.passDesire + Math.floor((Math.random() - 0.5) * 10))),
    dribbleDesire: Math.min(100, Math.max(0, base.dribbleDesire + Math.floor((Math.random() - 0.5) * 10))),
    runDesire: Math.min(100, Math.max(0, base.runDesire + Math.floor((Math.random() - 0.5) * 10))),
  };
};

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
  const [energyFluctuation, setEnergyFluctuation] = useState(0); // 能量波动值
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const ballUpdateRef = useRef<number>(0);
  const energyRef = useRef<number>(0);
  
  // 能量波动动画
  useEffect(() => {
    if (!isPlaying) return;
    
    let animationId: number;
    let lastTime = 0;
    const fluctuationSpeed = 0.002; // 波动速度
    
    const animateEnergy = (timestamp: number) => {
      if (timestamp - lastTime > 50) { // 每50ms更新一次
        // 使用正弦波 + 随机噪声创建自然波动
        const baseWave = Math.sin(timestamp * fluctuationSpeed) * 3;
        const secondaryWave = Math.sin(timestamp * fluctuationSpeed * 2.3) * 2;
        const noise = (Math.random() - 0.5) * 2;
        
        const newFluctuation = baseWave + secondaryWave + noise;
        setEnergyFluctuation(newFluctuation);
        energyRef.current = newFluctuation;
        lastTime = timestamp;
      }
      animationId = requestAnimationFrame(animateEnergy);
    };
    
    animationId = requestAnimationFrame(animateEnergy);
    
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

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

        {/* AI传球分析可视化 - 简约风格 */}
        {selectedPlayer && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 5 }}>
            <defs>
              {/* 渐变定义 */}
              <linearGradient id="bestLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0, 255, 200, 0.1)" />
                <stop offset="50%" stopColor="rgba(0, 255, 200, 0.9)" />
                <stop offset="100%" stopColor="rgba(0, 255, 200, 0.1)" />
              </linearGradient>
              <linearGradient id="altLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(100, 150, 180, 0)" />
                <stop offset="50%" stopColor="rgba(100, 150, 180, 0.4)" />
                <stop offset="100%" stopColor="rgba(100, 150, 180, 0)" />
              </linearGradient>
              {/* 发光滤镜 */}
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* 只显示最佳路线 + 1条次选 */}
            {getPassingRoutes(selectedPlayer.id, selectedPlayer.team).slice(0, 2).map((route, idx) => {
              const isBest = idx === 0;
              
              // 计算线条参数
              const dx = route.to.x - route.from.x;
              const dy = route.to.y - route.from.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const endX = route.to.x - (dx / len) * 4;
              const endY = route.to.y - (dy / len) * 4;
              
              // 概率标签位置 - 靠近终点
              const labelX = endX - (dx / len) * 8;
              const labelY = endY - (dy / len) * 8;

              return (
                <g key={idx}>
                  {isBest ? (
                    <>
                      {/* 最佳路线 - 单条清晰线 */}
                      <line
                        x1={route.from.x}
                        y1={route.from.y}
                        x2={endX}
                        y2={endY}
                        stroke="rgba(0, 255, 200, 0.9)"
                        strokeWidth="0.4"
                        strokeLinecap="round"
                        filter="url(#softGlow)"
                      />
                      
                      {/* 流动光点动画 */}
                      <circle r="0.8" fill="#00ffc8">
                        <animateMotion
                          dur="1.2s"
                          repeatCount="indefinite"
                          path={`M ${route.from.x} ${route.from.y} L ${endX} ${endY}`}
                        />
                        <animate attributeName="opacity" values="0;1;1;0" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                      
                      {/* 终点标记 - 简洁圆环 */}
                      <circle
                        cx={route.to.x}
                        cy={route.to.y}
                        r="3"
                        fill="none"
                        stroke="rgba(0, 255, 200, 0.6)"
                        strokeWidth="0.2"
                      >
                        <animate attributeName="r" values="3;4;3" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle
                        cx={route.to.x}
                        cy={route.to.y}
                        r="1.5"
                        fill="rgba(0, 255, 200, 0.3)"
                        stroke="rgba(0, 255, 200, 0.8)"
                        strokeWidth="0.15"
                      />
                      
                      {/* 概率标签 - 简洁样式 */}
                      <g transform={`translate(${labelX}, ${labelY})`}>
                        <rect
                          x="-5"
                          y="-3"
                          width="10"
                          height="6"
                          rx="1"
                          fill="rgba(0, 20, 30, 0.9)"
                          stroke="rgba(0, 255, 200, 0.5)"
                          strokeWidth="0.15"
                        />
                        <text
                          x="0"
                          y="1.2"
                          textAnchor="middle"
                          fill="#00ffc8"
                          fontSize="3.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {route.probability}%
                        </text>
                      </g>
                    </>
                  ) : (
                    <>
                      {/* 次选路线 - 虚线 */}
                      <line
                        x1={route.from.x}
                        y1={route.from.y}
                        x2={endX}
                        y2={endY}
                        stroke="rgba(100, 150, 180, 0.4)"
                        strokeWidth="0.25"
                        strokeLinecap="round"
                        strokeDasharray="1.5 1"
                      />
                      
                      {/* 终点小圆点 */}
                      <circle
                        cx={route.to.x}
                        cy={route.to.y}
                        r="1.2"
                        fill="none"
                        stroke="rgba(100, 150, 180, 0.5)"
                        strokeWidth="0.15"
                      />
                      
                      {/* 简化概率显示 */}
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        fill="rgba(150, 180, 200, 0.7)"
                        fontSize="2.5"
                        fontFamily="monospace"
                      >
                        {route.probability}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
            
            {/* 起点标记 */}
            <circle
              cx={selectedPlayer.x}
              cy={selectedPlayer.y}
              r="2"
              fill="none"
              stroke="rgba(0, 255, 200, 0.4)"
              strokeWidth="0.15"
              strokeDasharray="0.5 0.5"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${selectedPlayer.x} ${selectedPlayer.y}`}
                to={`360 ${selectedPlayer.x} ${selectedPlayer.y}`}
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        )}
        
        {/* AI分析图例面板 */}
        {selectedPlayer && (
          <div 
            className="absolute bottom-12 left-2 rounded-lg p-3 text-[9px] min-w-[150px]"
            style={{ 
              zIndex: 30,
              background: 'linear-gradient(135deg, rgba(0,20,30,0.95) 0%, rgba(0,10,20,0.98) 100%)',
              border: '1px solid rgba(0, 255, 200, 0.3)',
              boxShadow: '0 0 20px rgba(0, 255, 200, 0.1), inset 0 0 30px rgba(0, 255, 200, 0.05)'
            }}
          >
            {/* 标题栏 */}
            <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: '1px solid rgba(0, 255, 200, 0.2)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00ffc8', boxShadow: '0 0 8px #00ffc8' }} />
              <span className="font-mono text-[10px] font-bold" style={{ color: '#00ffc8' }}>PASS ANALYSIS</span>
            </div>
            
            {/* 图例项目 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-[2px] rounded" style={{ background: 'linear-gradient(90deg, transparent, #00ffc8, transparent)' }} />
                <span className="font-mono" style={{ color: '#00ffc8' }}>最优路线 [BEST]</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-[2px] rounded" style={{ background: 'linear-gradient(90deg, transparent, #00b4ff, transparent)' }} />
                <span className="font-mono" style={{ color: '#00b4ff' }}>次优路线</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-[1px] rounded opacity-60" style={{ background: 'linear-gradient(90deg, transparent, #6478a0, transparent)' }} />
                <span className="font-mono text-slate-400">备选路线</span>
              </div>
            </div>
            
            {/* 分隔线 */}
            <div className="my-2" style={{ borderTop: '1px solid rgba(0, 255, 200, 0.15)' }} />
            
            {/* 数据说明 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 flex items-center justify-center text-[8px] font-mono font-bold"
                  style={{ 
                    background: 'rgba(0, 255, 200, 0.15)',
                    border: '1px solid rgba(0, 255, 200, 0.5)',
                    color: '#00ffc8',
                    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                  }}
                >
                  85
                </div>
                <span className="font-mono text-slate-300">传球成功概率</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-4 h-4">
                  <div className="absolute inset-0 rounded-full border border-dashed animate-spin" style={{ borderColor: 'rgba(0, 255, 200, 0.5)', animationDuration: '3s' }} />
                  <div className="absolute inset-1 rounded-full" style={{ border: '1px solid rgba(0, 255, 200, 0.8)' }} />
                </div>
                <span className="font-mono text-slate-300">目标锁定</span>
              </div>
            </div>
            
            {/* 底部状态 */}
            <div className="mt-2 pt-2 flex items-center gap-1" style={{ borderTop: '1px solid rgba(0, 255, 200, 0.1)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ffc8' }} />
              <span className="font-mono text-[8px]" style={{ color: 'rgba(0, 255, 200, 0.6)' }}>MODEL: HUNSOCCER-v3</span>
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
                
                {/* 选中时显示体力值和进攻欲望 */}
                {isSelected && (() => {
                  const desire = getPlayerAttackDesire(player.id);
                  const stamina = 60 + Math.floor(Math.random() * 35); // 60-95之间的体力值
                  
                  return (
                    <div className="mt-1 bg-black/90 backdrop-blur-sm rounded border border-cyan-500/30 p-1.5 min-w-[80px]">
                      {/* 体力值 */}
                      <div className="mb-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[7px] text-cyan-400/70 font-mono">STA</span>
                          <span className={`text-[8px] font-mono font-bold ${stamina >= 70 ? 'text-green-400' : stamina >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {stamina}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${stamina}%`,
                              background: stamina >= 70 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : stamina >= 40 ? 'linear-gradient(90deg, #eab308, #facc15)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* 进攻欲望 */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[7px] text-cyan-400/70 font-mono">ATK</span>
                          <span className={`text-[8px] font-mono font-bold ${desire.attackDesire >= 70 ? 'text-red-400' : desire.attackDesire >= 40 ? 'text-orange-400' : 'text-cyan-400/70'}`}>
                            {desire.attackDesire}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${desire.attackDesire}%`,
                              background: desire.attackDesire >= 70 ? 'linear-gradient(90deg, #f97316, #ef4444)' : desire.attackDesire >= 40 ? 'linear-gradient(90deg, #eab308, #f97316)' : 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                
                {/* 选中时显示体力值和进攻欲望 */}
                {isSelected && (() => {
                  const desire = getPlayerAttackDesire(player.id);
                  const stamina = 60 + Math.floor(Math.random() * 35);
                  
                  return (
                    <div className="mt-1 bg-black/90 backdrop-blur-sm rounded border border-cyan-500/30 p-1.5 min-w-[80px]">
                      {/* 体力值 */}
                      <div className="mb-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[7px] text-cyan-400/70 font-mono">STA</span>
                          <span className={`text-[8px] font-mono font-bold ${stamina >= 70 ? 'text-green-400' : stamina >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {stamina}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${stamina}%`,
                              background: stamina >= 70 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : stamina >= 40 ? 'linear-gradient(90deg, #eab308, #facc15)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* 进攻欲望 */}
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[7px] text-cyan-400/70 font-mono">ATK</span>
                          <span className={`text-[8px] font-mono font-bold ${desire.attackDesire >= 70 ? 'text-red-400' : desire.attackDesire >= 40 ? 'text-orange-400' : 'text-cyan-400/70'}`}>
                            {desire.attackDesire}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${desire.attackDesire}%`,
                              background: desire.attackDesire >= 70 ? 'linear-gradient(90deg, #f97316, #ef4444)' : desire.attackDesire >= 40 ? 'linear-gradient(90deg, #eab308, #f97316)' : 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {/* 足球 - 真实模型 */}
        <div
          className="absolute transition-all duration-300 ease-out"
          style={{
            left: `${ballPosition.x}%`,
            top: `${ballPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-5 h-5 md:w-6 md:h-6 relative">
            {/* 足球SVG */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
              {/* 底色 */}
              <circle cx="50" cy="50" r="48" fill="white" stroke="#333" strokeWidth="2"/>
              
              {/* 中心五边形 */}
              <polygon 
                points="50,25 65,38 60,58 40,58 35,38" 
                fill="#1a1a1a"
              />
              
              {/* 顶部五边形 */}
              <polygon 
                points="50,5 62,15 58,28 42,28 38,15" 
                fill="#1a1a1a"
              />
              
              {/* 左上五边形 */}
              <polygon 
                points="18,30 30,22 38,35 32,50 18,45" 
                fill="#1a1a1a"
              />
              
              {/* 右上五边形 */}
              <polygon 
                points="82,30 70,22 62,35 68,50 82,45" 
                fill="#1a1a1a"
              />
              
              {/* 左下五边形 */}
              <polygon 
                points="25,70 18,55 28,48 42,58 38,72" 
                fill="#1a1a1a"
              />
              
              {/* 右下五边形 */}
              <polygon 
                points="75,70 82,55 72,48 58,58 62,72" 
                fill="#1a1a1a"
              />
              
              {/* 底部五边形 */}
              <polygon 
                points="50,95 38,82 42,68 58,68 62,82" 
                fill="#1a1a1a"
              />
              
              {/* 连接线 */}
              <line x1="50" y1="25" x2="50" y2="5" stroke="#1a1a1a" strokeWidth="2"/>
              <line x1="35" y1="38" x2="18" y2="30" stroke="#1a1a1a" strokeWidth="2"/>
              <line x1="65" y1="38" x2="82" y2="30" stroke="#1a1a1a" strokeWidth="2"/>
              <line x1="40" y1="58" x2="25" y2="70" stroke="#1a1a1a" strokeWidth="2"/>
              <line x1="60" y1="58" x2="75" y2="70" stroke="#1a1a1a" strokeWidth="2"/>
              <line x1="50" y1="58" x2="50" y2="68" stroke="#1a1a1a" strokeWidth="2"/>
              
              {/* 高光效果 */}
              <ellipse cx="35" cy="30" rx="8" ry="5" fill="white" opacity="0.4"/>
              
              {/* 边缘阴影 */}
              <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ballShadow)" strokeWidth="4"/>
              <defs>
                <radialGradient id="ballShadow" cx="30%" cy="30%">
                  <stop offset="0%" stopColor="transparent"/>
                  <stop offset="70%" stopColor="transparent"/>
                  <stop offset="100%" stopColor="rgba(0,0,0,0.3)"/>
                </radialGradient>
              </defs>
            </svg>
            
            {/* 动态阴影 */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/30 rounded-full blur-sm" />
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
        
        // 应用波动效果
        const fluctuatedHome = Math.max(15, Math.min(85, advantage.homePercentage + energyFluctuation));
        const fluctuatedAway = 100 - fluctuatedHome;
        
        // 动态优势文字
        const diff = fluctuatedHome - fluctuatedAway;
        let dynamicAdvantageText = '';
        if (Math.abs(diff) <= 8) {
          dynamicAdvantageText = '势均力敌';
        } else if (diff > 20) {
          dynamicAdvantageText = '主队强势';
        } else if (diff > 8) {
          dynamicAdvantageText = '主队占优';
        } else if (diff < -20) {
          dynamicAdvantageText = '客队强势';
        } else {
          dynamicAdvantageText = '客队占优';
        }
        
        // 状态等级
        const statusLevel = Math.abs(diff) <= 8 ? 'BALANCED' : diff > 20 ? 'HOME_DOMINANT' : diff > 8 ? 'HOME_ADVANTAGE' : diff < -20 ? 'AWAY_DOMINANT' : 'AWAY_ADVANTAGE';
        
        return (
          <div className="mt-4 relative bg-black/95 backdrop-blur-md rounded border border-cyan-500/30 overflow-hidden">
            {/* 扫描线背景 */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
              }}
            />
            
            {/* 顶部状态栏 */}
            <div className="px-4 py-2 border-b border-cyan-500/20 bg-cyan-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] text-cyan-400/80 font-mono uppercase tracking-wider">FORMATION ANALYSIS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-white/40 font-mono">{currentHomeFormation} vs {currentAwayFormation}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[7px] text-green-400/70 font-mono">LIVE</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 主对抗区域 */}
            <div className="p-4">
              {/* 队伍对比头部 */}
              <div className="flex items-center justify-between mb-3">
                {/* 主队 */}
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded border border-blue-400/40 overflow-hidden bg-blue-950/50">
                    <img src={homeTeamLogo} alt={homeTeamName} className="w-full h-full object-contain p-1" />
                    <div className="absolute top-0 left-0 w-1.5 h-px bg-cyan-400" />
                    <div className="absolute top-0 left-0 w-px h-1.5 bg-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-blue-400">{homeTeamName}</div>
                    <div className="text-[8px] text-cyan-400/60 font-mono">{currentHomeFormation}</div>
                  </div>
                </div>
                
                {/* 中央状态 */}
                <div className="text-center">
                  <div className={`px-3 py-1 rounded border text-[9px] font-mono uppercase ${
                    statusLevel === 'BALANCED' ? 'border-white/20 text-white/60 bg-white/5' :
                    statusLevel.includes('HOME') ? 'border-blue-400/40 text-blue-400 bg-blue-950/30' :
                    'border-red-400/40 text-red-400 bg-red-950/30'
                  }`}>
                    {dynamicAdvantageText}
                  </div>
                </div>
                
                {/* 客队 */}
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-xs font-medium text-red-400 text-right">{awayTeamName}</div>
                    <div className="text-[8px] text-cyan-400/60 font-mono text-right">{currentAwayFormation}</div>
                  </div>
                  <div className="relative w-8 h-8 rounded border border-red-400/40 overflow-hidden bg-red-950/50">
                    <img src={awayTeamLogo} alt={awayTeamName} className="w-full h-full object-contain p-1" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-px bg-cyan-400" />
                    <div className="absolute bottom-0 right-0 w-px h-1.5 bg-cyan-400" />
                  </div>
                </div>
              </div>
              
              {/* 能量对抗条 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-lg font-bold font-mono transition-all duration-150 ${fluctuatedHome > 50 ? 'text-blue-400' : 'text-blue-400/60'}`}>
                    {Math.round(fluctuatedHome)}%
                  </span>
                  <span className="text-[8px] text-white/40 font-mono uppercase">POWER BALANCE</span>
                  <span className={`text-lg font-bold font-mono transition-all duration-150 ${fluctuatedAway > 50 ? 'text-red-400' : 'text-red-400/60'}`}>
                    {Math.round(fluctuatedAway)}%
                  </span>
                </div>
                
                <div className="relative h-3 rounded bg-slate-900 overflow-hidden border border-cyan-500/20">
                  {/* 网格背景 */}
                  <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'repeating-linear-gradient(90deg, transparent, transparent 9.5%, rgba(0,255,255,0.15) 9.5%, rgba(0,255,255,0.15) 10%)',
                    }}
                  />
                  
                  {/* 主队能量 */}
                  <div 
                    className="absolute left-0 top-0 h-full transition-all duration-100 ease-out"
                    style={{ 
                      width: `${fluctuatedHome}%`,
                      background: 'linear-gradient(90deg, rgba(59,130,246,0.8), rgba(6,182,212,0.9))',
                    }}
                  >
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        animation: 'shimmer 1.5s infinite',
                        backgroundSize: '200% 100%',
                      }}
                    />
                  </div>
                  
                  {/* 客队能量 */}
                  <div 
                    className="absolute right-0 top-0 h-full transition-all duration-100 ease-out"
                    style={{ 
                      width: `${fluctuatedAway}%`,
                      background: 'linear-gradient(270deg, rgba(239,68,68,0.8), rgba(249,115,22,0.9))',
                    }}
                  >
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.2), transparent)',
                        animation: 'shimmer 1.5s infinite reverse',
                        backgroundSize: '200% 100%',
                      }}
                    />
                  </div>
                  
                  {/* 碰撞线 */}
                  <div 
                    className="absolute top-0 bottom-0 w-px z-10 transition-all duration-100"
                    style={{ 
                      left: `${fluctuatedHome}%`,
                      background: '#22d3ee',
                      boxShadow: '0 0 8px #22d3ee, 0 0 16px #22d3ee',
                    }}
                  />
                </div>
                
                {/* 刻度标记 */}
                <div className="flex justify-between mt-1 text-[7px] text-white/30 font-mono">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
              
              {/* 属性矩阵 */}
              <div className="grid grid-cols-5 gap-1">
                {[
                  { key: 'attack', label: 'ATK' },
                  { key: 'defense', label: 'DEF' },
                  { key: 'midfield', label: 'MID' },
                  { key: 'wing', label: 'WNG' },
                  { key: 'counter', label: 'CNT' },
                ].map(({ key, label }) => {
                  const homeVal = homeStats[key as keyof typeof homeStats];
                  const awayVal = awayStats[key as keyof typeof awayStats];
                  const homeWins = homeVal > awayVal;
                  const tie = homeVal === awayVal;
                  const homePercent = (homeVal / (homeVal + awayVal)) * 100;
                  
                  return (
                    <div key={key} className="text-center">
                      <div className="text-[8px] text-cyan-400/60 font-mono mb-1">{label}</div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className={`text-[10px] font-bold font-mono ${homeWins ? 'text-blue-400' : tie ? 'text-white/50' : 'text-white/30'}`}>
                          {homeVal}
                        </span>
                        <span className="text-[7px] text-white/20">:</span>
                        <span className={`text-[10px] font-bold font-mono ${!homeWins && !tie ? 'text-red-400' : tie ? 'text-white/50' : 'text-white/30'}`}>
                          {awayVal}
                        </span>
                      </div>
                      {/* 对比条 */}
                      <div className="h-1 rounded-sm bg-slate-800 overflow-hidden flex">
                        <div 
                          className="h-full transition-all duration-500"
                          style={{ 
                            width: `${homePercent}%`,
                            background: homeWins ? 'rgba(59,130,246,0.9)' : 'rgba(59,130,246,0.4)',
                          }}
                        />
                        <div 
                          className="h-full transition-all duration-500"
                          style={{ 
                            width: `${100 - homePercent}%`,
                            background: !homeWins && !tie ? 'rgba(239,68,68,0.9)' : 'rgba(239,68,68,0.4)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 底部状态栏 */}
            <div className="px-4 py-1.5 border-t border-cyan-500/10 bg-cyan-950/20">
              <div className="flex items-center justify-between text-[7px] font-mono">
                <span className="text-white/40">SIMULATION: ACTIVE</span>
                <span className="text-cyan-400/60">REFRESH: 50ms</span>
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

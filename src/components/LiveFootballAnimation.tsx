import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Maximize2, RotateCcw, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import footballPitchBg from '@/assets/football-pitch-bg.webp';
import hunsoccerAlphaLogo from '@/assets/hunsoccer-alpha-logo-white.png';

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

// AI指标: 预期进球值 (xG) 计算 - 基于位置和距离球门
const calculateXG = (playerX: number, playerY: number, team: 'home' | 'away'): number => {
  const goalY = team === 'home' ? 0 : 100;
  const goalX = 50;
  const distanceToGoal = Math.sqrt(Math.pow(playerX - goalX, 2) + Math.pow(playerY - goalY, 2));
  
  // 距离越近xG越高, 中路比边路高
  const distanceFactor = Math.max(0, 1 - distanceToGoal / 80);
  const angleFactor = 1 - Math.abs(playerX - 50) / 50 * 0.3;
  
  // 禁区内加成
  const inPenaltyArea = team === 'home' 
    ? playerY <= 18 && playerX >= 20 && playerX <= 80
    : playerY >= 82 && playerX >= 20 && playerX <= 80;
  const penaltyBonus = inPenaltyArea ? 0.3 : 0;
  
  const xg = Math.min(0.95, (distanceFactor * angleFactor * 0.6 + penaltyBonus));
  return Math.round(xg * 100) / 100;
};

// AI指标: 计算球员体能值 (随时间变化)
const calculateStamina = (playerId: number, baseTime: number = Date.now()): number => {
  // 基础体能 (门将最高, 中场消耗最大)
  const baseStamina: Record<number, number> = {
    0: 95, 1: 78, 2: 80, 3: 80, 4: 75,
    5: 68, 6: 72, 7: 65, 8: 70,
    9: 73, 10: 71
  };
  
  const base = baseStamina[playerId] || 70;
  // 添加时间波动模拟消耗
  const timeWave = Math.sin(baseTime / 10000 + playerId) * 8;
  return Math.max(35, Math.min(98, base + timeWave));
};

// AI指标: 计算跑动预测方向
const predictMovementDirection = (
  player: PlayerPosition, 
  team: 'home' | 'away',
  ballX: number,
  ballY: number
): { angle: number; distance: number; type: 'attack' | 'defend' | 'support' } => {
  const goalY = team === 'home' ? 0 : 100;
  const ownGoalY = team === 'home' ? 100 : 0;
  
  // 计算向球门方向
  const toGoalAngle = Math.atan2(goalY - player.y, 50 - player.x) * 180 / Math.PI;
  // 计算向球方向
  const toBallAngle = Math.atan2(ballY - player.y, ballX - player.x) * 180 / Math.PI;
  
  // 根据位置决定主要行为
  const distToBall = Math.sqrt(Math.pow(ballX - player.x, 2) + Math.pow(ballY - player.y, 2));
  
  if (player.id >= 9) {
    // 前锋 - 主要向前跑
    return { angle: toGoalAngle, distance: 12, type: 'attack' };
  } else if (player.id >= 5) {
    // 中场 - 支援
    return { angle: toBallAngle * 0.6 + toGoalAngle * 0.4, distance: 8, type: 'support' };
  } else {
    // 后卫 - 防守站位
    return { angle: toBallAngle * 0.3 + (ownGoalY > 50 ? -90 : 90) * 0.7, distance: 5, type: 'defend' };
  }
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
  const [showAIIndicators, setShowAIIndicators] = useState(true); // AI指标显示开关
  const [aiUpdateTick, setAiUpdateTick] = useState(0); // AI数据更新触发器
  const [matchTime, setMatchTime] = useState(0); // 比赛时间（秒）
  const [playerStamina, setPlayerStamina] = useState<Record<string, number>>({}); // 球员体能值
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const ballUpdateRef = useRef<number>(0);
  const energyRef = useRef<number>(0);
  
  // 初始化所有球员体能为100
  useEffect(() => {
    const initialStamina: Record<string, number> = {};
    for (let i = 0; i < 11; i++) {
      initialStamina[`home-${i}`] = 100;
      initialStamina[`away-${i}`] = 100;
    }
    setPlayerStamina(initialStamina);
    setMatchTime(0);
  }, [currentHomeFormation, currentAwayFormation]);
  
  // 比赛时间推进 & 体能消耗
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setMatchTime(prev => prev + 1);
      
      // 每秒消耗体能
      setPlayerStamina(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          const playerId = parseInt(key.split('-')[1]);
          
          // 根据位置不同消耗速度不同
          // 门将消耗最慢，中场消耗最快，前锋次之
          let consumeRate = 0.08; // 基础消耗率
          if (playerId === 0) {
            consumeRate = 0.02; // 门将
          } else if (playerId >= 1 && playerId <= 4) {
            consumeRate = 0.06; // 后卫
          } else if (playerId >= 5 && playerId <= 8) {
            consumeRate = 0.12; // 中场消耗最大
          } else {
            consumeRate = 0.09; // 前锋
          }
          
          // 追球球员额外消耗
          const playerTeam = key.startsWith('home') ? 'home' : 'away';
          if (chasingPlayer?.id === playerId && chasingPlayer?.team === playerTeam) {
            consumeRate *= 1.5;
          }
          
          // 添加随机波动
          const randomFactor = 0.8 + Math.random() * 0.4;
          updated[key] = Math.max(15, updated[key] - consumeRate * randomFactor);
        });
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, chasingPlayer]);
  
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

  // AI指标更新定时器
  useEffect(() => {
    if (!isPlaying || !showAIIndicators) return;
    
    const interval = setInterval(() => {
      setAiUpdateTick(prev => prev + 1);
    }, 2000); // 每2秒更新一次AI数据
    
    return () => clearInterval(interval);
  }, [isPlaying, showAIIndicators]);

  // 计算防线高度
  const calculateDefenseLine = (players: PlayerPosition[], team: 'home' | 'away'): number => {
    // 排除门将(id=0), 取后卫线(id 1-4)的平均Y坐标
    const defenders = players.filter(p => p.id >= 1 && p.id <= 4);
    if (defenders.length === 0) return team === 'home' ? 75 : 25;
    const avgY = defenders.reduce((sum, p) => sum + p.y, 0) / defenders.length;
    return avgY;
  };

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

  // 计算传球路线 - 严格只显示视线三角形内的传球选项
  const getPassingRoutes = (selectedId: number, team: 'home' | 'away') => {
    const teammates = team === 'home' ? homePlayers : awayPlayers;
    const selectedPlayer = teammates.find(p => p.id === selectedId);
    if (!selectedPlayer) return [];

    // 视线三角形参数（与getAttackTriangle完全一致）
    const spreadAngle = 25; // 扩散角度（度）
    const goalY = team === 'home' ? 0 : 100;
    
    // 计算三角形边界（与getAttackTriangle一致）
    const triangleDistance = Math.abs(goalY - selectedPlayer.y);
    const maxSpreadX = triangleDistance * Math.tan(spreadAngle * Math.PI / 180);
    
    const routes = teammates
      .filter(p => p.id !== selectedId)
      .map(teammate => {
        const dx = teammate.x - selectedPlayer.x;
        const dy = teammate.y - selectedPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 严格判断是否在视线三角形内
        // 1. 必须在进攻方向：主队向上(dy<0)，客队向下(dy>0)
        const isInAttackDirection = team === 'home' ? dy < 0 : dy > 0;
        
        // 2. 计算该队友位置处的三角形宽度限制
        const teammateDistanceToGoal = Math.abs(goalY - teammate.y);
        const playerDistanceToGoal = Math.abs(goalY - selectedPlayer.y);
        
        // 队友到球员的垂直距离占比
        const progressRatio = Math.abs(dy) / playerDistanceToGoal;
        // 该位置处允许的水平偏移
        const allowedSpreadAtPoint = progressRatio * maxSpreadX;
        
        // 3. 检查水平位置是否在允许范围内
        const isWithinHorizontalBounds = Math.abs(dx) <= allowedSpreadAtPoint;
        
        // 综合判断：必须在进攻方向且在三角形水平范围内
        const isInVision = isInAttackDirection && isWithinHorizontalBounds;
        
        // 判断传球难度
        let difficulty: 'easy' | 'medium' | 'hard';
        if (distance < 20) {
          difficulty = 'easy';
        } else if (distance < 40) {
          difficulty = 'medium';
        } else {
          difficulty = 'hard';
        }

        // 判断是否是前进传球
        const isForwardPass = isInAttackDirection;
        
        // 计算传球概率
        const probability = calculatePassProbability(distance, isForwardPass, difficulty);

        return {
          from: { x: selectedPlayer.x, y: selectedPlayer.y },
          to: { x: teammate.x, y: teammate.y },
          distance,
          difficulty,
          isForwardPass,
          isInVision,
          teammateId: teammate.id,
          teammateName: teammate.name,
          probability,
        };
      })
      // 严格只保留视线内的路线
      .filter(route => route.isInVision)
      // 按概率排序
      .sort((a, b) => b.probability - a.probability);
    
    return routes.slice(0, 2); // 最多显示2条
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

  // 使用 ref 存储最新状态，避免依赖项导致动画重建
  const homePlayersRef = useRef(homePlayers);
  const awayPlayersRef = useRef(awayPlayers);
  const ballPositionRef = useRef(ballPosition);
  const chasingPlayerRef = useRef(chasingPlayer);
  
  useEffect(() => { homePlayersRef.current = homePlayers; }, [homePlayers]);
  useEffect(() => { awayPlayersRef.current = awayPlayers; }, [awayPlayers]);
  useEffect(() => { ballPositionRef.current = ballPosition; }, [ballPosition]);
  useEffect(() => { chasingPlayerRef.current = chasingPlayer; }, [chasingPlayer]);

  // 动画循环 - 使用物理模拟实现平滑移动
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const targetUpdateInterval = 2500; // 每2.5秒更新目标位置
    const ballUpdateInterval = 1500; // 足球更新间隔
    const damping = 0.94; // 更高阻尼更平滑
    const acceleration = 0.006; // 更低加速度更平滑
    const chaserAcceleration = 0.012;
    const ballDamping = 0.96;
    const ballAcceleration = 0.008;

    let lastTargetUpdate = 0;
    let lastBallUpdate = 0;

    const animate = (timestamp: number) => {
      // 更新球员目标位置
      if (timestamp - lastTargetUpdate > targetUpdateInterval) {
        updateTargetPositions();
        lastTargetUpdate = timestamp;
      }
      
      // 更新足球目标位置
      if (timestamp - lastBallUpdate > ballUpdateInterval) {
        updateBallTarget();
        lastBallUpdate = timestamp;
      }

      // 获取当前球的位置并找到最近的球员
      const currentBall = ballPositionRef.current;
      const currentHomePlayers = homePlayersRef.current;
      const currentAwayPlayers = awayPlayersRef.current;
      const currentChaser = chasingPlayerRef.current;
      
      const nearest = findNearestPlayerToBall(currentHomePlayers, currentAwayPlayers, currentBall.x, currentBall.y);
      if (nearest && (!currentChaser || nearest.id !== currentChaser.id || nearest.team !== currentChaser.team)) {
        setChasingPlayer({ id: nearest.id, team: nearest.team });
      }

      // 使用速度和加速度平滑移动球员
      setHomePlayers(prev =>
        prev.map(player => {
          const isChaser = currentChaser?.team === 'home' && currentChaser?.id === player.id;
          
          let targetX = player.targetX;
          let targetY = player.targetY;
          if (isChaser) {
            targetX = currentBall.x;
            targetY = currentBall.y;
          }
          
          const dx = targetX - player.x;
          const dy = targetY - player.y;
          const accel = isChaser ? chaserAcceleration : acceleration;
          
          let newVelX = player.velocityX * damping + dx * accel;
          let newVelY = player.velocityY * damping + dy * accel;
          
          const maxSpeed = isChaser ? 1.0 : 0.6;
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
          const isChaser = currentChaser?.team === 'away' && currentChaser?.id === player.id;
          
          let targetX = player.targetX;
          let targetY = player.targetY;
          if (isChaser) {
            targetX = currentBall.x;
            targetY = currentBall.y;
          }
          
          const dx = targetX - player.x;
          const dy = targetY - player.y;
          const accel = isChaser ? chaserAcceleration : acceleration;
          
          let newVelX = player.velocityX * damping + dx * accel;
          let newVelY = player.velocityY * damping + dy * accel;
          
          const maxSpeed = isChaser ? 1.0 : 0.6;
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
        
        const maxBallSpeed = 0.9;
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
  }, [isPlaying, updateTargetPositions, updateBallTarget, findNearestPlayerToBall]);

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
    <div className="space-y-3">

      {/* 阵型选择 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 主队阵型 */}
        <div className="relative rounded-xl border border-blue-500/40 overflow-hidden shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-shadow duration-300">
          {/* 背景图 */}
          <div 
            className="absolute inset-0 opacity-20 scale-110"
            style={{
              backgroundImage: `url(${homeTeamLogo})`,
              backgroundSize: '120%',
              backgroundPosition: 'center',
              filter: 'blur(8px)',
            }}
          />
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950/95 via-slate-900/90 to-blue-900/85" />
          {/* 顶部光效 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
          
          {/* 内容 */}
          <div className="relative z-10 p-3">
            {/* 头部 */}
            <div className="flex items-center gap-2 pb-2 border-b border-blue-400/20">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <img 
                  src={homeTeamLogo} 
                  alt={homeTeamName}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-white">{homeTeamName}</span>
                <div className="text-[9px] text-blue-300/70">主队阵型</div>
              </div>
              <div className="px-2 py-1 rounded-md bg-blue-500/20 border border-blue-400/30">
                <span className="text-xs text-blue-300 font-bold tracking-wide">{currentHomeFormation}</span>
              </div>
            </div>
            
            {/* 阵型按钮 */}
            <div className="flex flex-wrap gap-1.5 py-2">
              {availableFormations.map(f => (
                <button
                  key={f}
                  onClick={() => handleFormationChange('home', f)}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-md border-2 transition-all duration-200 ${
                    currentHomeFormation === f
                      ? 'bg-blue-500 border-blue-400 text-white scale-105 shadow-md shadow-blue-500/50'
                      : 'bg-white/5 border-white/20 hover:border-blue-400/50 hover:bg-blue-500/10 text-white/80'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            {/* 阵型说明 */}
            <div className="pt-2 border-t border-blue-400/20">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-0.5 h-3 rounded-full bg-blue-400" />
                <span className="text-[10px] font-semibold text-blue-300">
                  {formationDescriptions[currentHomeFormation]?.title || '阵型说明'}
                </span>
              </div>
              <p className="text-[9px] text-white/50 leading-relaxed pl-2">
                {formationDescriptions[currentHomeFormation]?.description || '暂无说明'}
              </p>
            </div>
          </div>
        </div>

        {/* 客队阵型 */}
        <div className="relative rounded-xl border border-red-500/40 overflow-hidden shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-shadow duration-300">
          {/* 背景图 */}
          <div 
            className="absolute inset-0 opacity-20 scale-110"
            style={{
              backgroundImage: `url(${awayTeamLogo})`,
              backgroundSize: '120%',
              backgroundPosition: 'center',
              filter: 'blur(8px)',
            }}
          />
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/95 via-slate-900/90 to-red-900/85" />
          {/* 顶部光效 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
          
          {/* 内容 */}
          <div className="relative z-10 p-3">
            {/* 头部 */}
            <div className="flex items-center gap-2 pb-2 border-b border-red-400/20">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <img 
                  src={awayTeamLogo} 
                  alt={awayTeamName}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-white">{awayTeamName}</span>
                <div className="text-[9px] text-red-300/70">客队阵型</div>
              </div>
              <div className="px-2 py-1 rounded-md bg-red-500/20 border border-red-400/30">
                <span className="text-xs text-red-300 font-bold tracking-wide">{currentAwayFormation}</span>
              </div>
            </div>
            
            {/* 阵型按钮 */}
            <div className="flex flex-wrap gap-1.5 py-2">
              {availableFormations.map(f => (
                <button
                  key={f}
                  onClick={() => handleFormationChange('away', f)}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-md border-2 transition-all duration-200 ${
                    currentAwayFormation === f
                      ? 'bg-red-500 border-red-400 text-white scale-105 shadow-md shadow-red-500/50'
                      : 'bg-white/5 border-white/20 hover:border-red-400/50 hover:bg-red-500/10 text-white/80'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            {/* 阵型说明 */}
            <div className="pt-2 border-t border-red-400/20">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-0.5 h-3 rounded-full bg-red-400" />
                <span className="text-[10px] font-semibold text-red-300">
                  {formationDescriptions[currentAwayFormation]?.title || '阵型说明'}
                </span>
              </div>
              <p className="text-[9px] text-white/50 leading-relaxed pl-2">
                {formationDescriptions[currentAwayFormation]?.description || '暂无说明'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 球场动画 */}
      <div className="relative rounded-xl overflow-hidden w-full" style={{ aspectRatio: '2.4/1' }}>
        {/* 真实足球场背景 */}
        <img 
          src={footballPitchBg} 
          alt="Football Pitch"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 半透明遮罩增加对比度 */}
        <div className="absolute inset-0 bg-black/10" />
        
        {/* 中场LOGO */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
          <img 
            src={hunsoccerAlphaLogo}
            alt="HUNSOCCER ALPHA"
            className="w-24 h-auto md:w-32 opacity-80"
            style={{
              filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.5))',
            }}
          />
        </div>

        {/* AI指标: 防线高度指示器 */}
        {showAIIndicators && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 2 }}>
            <defs>
              <linearGradient id="homeDefenseLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
                <stop offset="20%" stopColor="rgba(59, 130, 246, 0.6)" />
                <stop offset="80%" stopColor="rgba(59, 130, 246, 0.6)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
              </linearGradient>
              <linearGradient id="awayDefenseLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0)" />
                <stop offset="20%" stopColor="rgba(239, 68, 68, 0.6)" />
                <stop offset="80%" stopColor="rgba(239, 68, 68, 0.6)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
              </linearGradient>
            </defs>
            {/* 主队防线 */}
            <line 
              x1="5" y1={calculateDefenseLine(homePlayers, 'home')} 
              x2="95" y2={calculateDefenseLine(homePlayers, 'home')}
              stroke="url(#homeDefenseLineGradient)"
              strokeWidth="0.4"
              strokeDasharray="2,1"
            />
            <text 
              x="3" y={calculateDefenseLine(homePlayers, 'home') - 1}
              fill="rgba(59, 130, 246, 0.8)"
              fontSize="2"
              fontFamily="monospace"
            >
              DEF
            </text>
            {/* 客队防线 */}
            <line 
              x1="5" y1={calculateDefenseLine(awayPlayers, 'away')} 
              x2="95" y2={calculateDefenseLine(awayPlayers, 'away')}
              stroke="url(#awayDefenseLineGradient)"
              strokeWidth="0.4"
              strokeDasharray="2,1"
            />
            <text 
              x="93" y={calculateDefenseLine(awayPlayers, 'away') + 3}
              fill="rgba(239, 68, 68, 0.8)"
              fontSize="2"
              fontFamily="monospace"
              textAnchor="end"
            >
              DEF
            </text>
          </svg>
        )}

        {/* AI指标: 跑动预测轨迹 */}
        {showAIIndicators && isPlaying && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 3 }}>
            <defs>
              <marker id="arrowHead" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
                <polygon points="0,0 3,1.5 0,3" fill="rgba(0, 255, 200, 0.6)" />
              </marker>
              <marker id="arrowHeadRed" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
                <polygon points="0,0 3,1.5 0,3" fill="rgba(255, 100, 100, 0.6)" />
              </marker>
            </defs>
            {/* 主队跑动预测 */}
            {homePlayers.slice(5, 11).map((player) => {
              const prediction = predictMovementDirection(player, 'home', ballPosition.x, ballPosition.y);
              const endX = player.x + Math.cos(prediction.angle * Math.PI / 180) * prediction.distance;
              const endY = player.y + Math.sin(prediction.angle * Math.PI / 180) * prediction.distance;
              return (
                <line
                  key={`home-pred-${player.id}`}
                  x1={player.x}
                  y1={player.y}
                  x2={Math.max(2, Math.min(98, endX))}
                  y2={Math.max(2, Math.min(98, endY))}
                  stroke="rgba(0, 255, 200, 0.4)"
                  strokeWidth="0.3"
                  strokeDasharray="1,0.5"
                  markerEnd="url(#arrowHead)"
                  opacity={0.6}
                />
              );
            })}
            {/* 客队跑动预测 */}
            {awayPlayers.slice(5, 11).map((player) => {
              const prediction = predictMovementDirection(player, 'away', ballPosition.x, ballPosition.y);
              const endX = player.x + Math.cos(prediction.angle * Math.PI / 180) * prediction.distance;
              const endY = player.y + Math.sin(prediction.angle * Math.PI / 180) * prediction.distance;
              return (
                <line
                  key={`away-pred-${player.id}`}
                  x1={player.x}
                  y1={player.y}
                  x2={Math.max(2, Math.min(98, endX))}
                  y2={Math.max(2, Math.min(98, endY))}
                  stroke="rgba(255, 100, 100, 0.4)"
                  strokeWidth="0.3"
                  strokeDasharray="1,0.5"
                  markerEnd="url(#arrowHeadRed)"
                  opacity={0.6}
                />
              );
            })}
          </svg>
        )}

        {/* AI指标: 威胁区域脉冲 (禁区内) */}
        {showAIIndicators && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 2 }}>
            <defs>
              <radialGradient id="threatPulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 100, 50, 0.4)">
                  <animate attributeName="stop-color" values="rgba(255,100,50,0.4);rgba(255,50,50,0.6);rgba(255,100,50,0.4)" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="rgba(255, 100, 50, 0)" />
              </radialGradient>
            </defs>
            {/* 顶部禁区威胁区 */}
            <ellipse cx="50" cy="8" rx="18" ry="6" fill="url(#threatPulse)" opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" />
            </ellipse>
            {/* 底部禁区威胁区 */}
            <ellipse cx="50" cy="92" rx="18" ry="6" fill="url(#threatPulse)" opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
            </ellipse>
          </svg>
        )}
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

        {/* 阵型连线层 - 当选中球员时显示标准阵型结构 */}
        {selectedPlayer && (
          <>
            {/* 阵型名称标签 */}
            <div 
              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full text-xs font-bold animate-fade-in"
              style={{
                background: selectedPlayer.team === 'home' 
                  ? 'linear-gradient(135deg, rgba(0, 100, 255, 0.9), rgba(0, 150, 255, 0.9))' 
                  : 'linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(239, 68, 68, 0.9))',
                color: 'white',
                boxShadow: selectedPlayer.team === 'home'
                  ? '0 0 20px rgba(0, 150, 255, 0.6)'
                  : '0 0 20px rgba(239, 68, 68, 0.6)',
                border: '1px solid rgba(255,255,255,0.3)',
                animation: 'formationFadeIn 0.4s ease-out forwards'
              }}
            >
              {selectedPlayer.team === 'home' ? `主队阵型: ${currentHomeFormation}` : `客队阵型: ${currentAwayFormation}`}
            </div>
            
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none" 
              style={{ zIndex: 5 }}
            >
              <defs>
                {/* 主队阵型填充 */}
                <linearGradient id="homeFormationFill" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0, 100, 255, 0.25)" />
                  <stop offset="100%" stopColor="rgba(0, 150, 255, 0.08)" />
                </linearGradient>
                {/* 客队阵型填充 */}
                <linearGradient id="awayFormationFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(239, 68, 68, 0.25)" />
                  <stop offset="100%" stopColor="rgba(220, 38, 38, 0.08)" />
                </linearGradient>
                {/* 发光滤镜 */}
                <filter id="formationGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              
              {/* 整体动画容器 */}
              <g style={{ animation: 'formationFadeIn 0.5s ease-out forwards' }}>
              {selectedPlayer.team === 'home' && (() => {
                const formationPositions = formations[currentHomeFormation] || formations['4-4-2'];
                
                // 根据阵型解析各线球员
                const formationParts = currentHomeFormation.split('-').map(Number);
                let currentIndex = 1; // 跳过门将
                const lines: FormationPosition[][] = [];
                
                formationParts.forEach(count => {
                  lines.push(formationPositions.slice(currentIndex, currentIndex + count));
                  currentIndex += count;
                });
                
                // 门将位置
                const gkPos = formationPositions[0];
                
                return (
                  <g filter="url(#formationGlow)">
                    {/* 绘制每条线的区域填充 - 带淡入动画 */}
                    {lines.map((line, lineIdx) => {
                      if (line.length < 2) return null;
                      const sortedLine = [...line].sort((a, b) => a.x - b.x);
                      const avgY = line.reduce((sum, p) => sum + p.y, 0) / line.length;
                      
                      // 创建梯形区域
                      const leftX = Math.max(5, sortedLine[0].x - 8);
                      const rightX = Math.min(95, sortedLine[sortedLine.length - 1].x + 8);
                      const topY = avgY - 4;
                      const bottomY = avgY + 4;
                      
                      return (
                        <rect
                          key={`home-line-area-${lineIdx}`}
                          x={leftX}
                          y={topY}
                          width={rightX - leftX}
                          height={bottomY - topY}
                          fill="rgba(0, 150, 255, 0.15)"
                          rx="2"
                          ry="2"
                          style={{
                            animation: `formationFadeIn 0.4s ease-out ${lineIdx * 0.1}s forwards`,
                            opacity: 0
                          }}
                        >
                          <animate 
                            attributeName="opacity" 
                            values="0.1;0.2;0.1" 
                            dur="2s" 
                            repeatCount="indefinite" 
                            begin={`${lineIdx * 0.1}s`}
                          />
                        </rect>
                      );
                    })}
                    
                    {/* 门将到后防线连线 - 带绘制动画 */}
                    {lines[0] && lines[0].map((def, idx) => {
                      const lineLength = Math.sqrt(Math.pow(def.x - gkPos.x, 2) + Math.pow(def.y - gkPos.y, 2));
                      return (
                        <line
                          key={`home-gk-def-${idx}`}
                          x1={gkPos.x}
                          y1={gkPos.y}
                          x2={def.x}
                          y2={def.y}
                          stroke="rgba(0, 200, 255, 0.4)"
                          strokeWidth="0.5"
                          strokeDasharray={lineLength}
                          strokeDashoffset={lineLength}
                          style={{
                            animation: `formationLinesDraw 0.6s ease-out ${0.2 + idx * 0.05}s forwards`
                          }}
                        />
                      );
                    })}
                    
                    {/* 绘制每条线内球员连线 - 带绘制动画 */}
                    {lines.map((line, lineIdx) => {
                      const sortedLine = [...line].sort((a, b) => a.x - b.x);
                      return sortedLine.map((pos, idx) => {
                        if (idx === sortedLine.length - 1) return null;
                        const lineLength = Math.sqrt(Math.pow(sortedLine[idx + 1].x - pos.x, 2) + Math.pow(sortedLine[idx + 1].y - pos.y, 2));
                        return (
                          <line
                            key={`home-line-${lineIdx}-${idx}`}
                            x1={pos.x}
                            y1={pos.y}
                            x2={sortedLine[idx + 1].x}
                            y2={sortedLine[idx + 1].y}
                            stroke="rgba(0, 200, 255, 0.8)"
                            strokeWidth="0.8"
                            strokeDasharray={lineLength}
                            strokeDashoffset={lineLength}
                            style={{
                              animation: `formationLinesDraw 0.5s ease-out ${0.3 + lineIdx * 0.1 + idx * 0.05}s forwards`
                            }}
                          />
                        );
                      });
                    })}
                    
                    {/* 绘制线与线之间的连接 - 带绘制动画 */}
                    {lines.map((line, lineIdx) => {
                      if (lineIdx === lines.length - 1) return null;
                      const nextLine = lines[lineIdx + 1];
                      const sortedCurrent = [...line].sort((a, b) => a.x - b.x);
                      const sortedNext = [...nextLine].sort((a, b) => a.x - b.x);
                      
                      const leftLen = Math.sqrt(Math.pow(sortedNext[0].x - sortedCurrent[0].x, 2) + Math.pow(sortedNext[0].y - sortedCurrent[0].y, 2));
                      const rightLen = Math.sqrt(Math.pow(sortedNext[sortedNext.length-1].x - sortedCurrent[sortedCurrent.length-1].x, 2) + Math.pow(sortedNext[sortedNext.length-1].y - sortedCurrent[sortedCurrent.length-1].y, 2));
                      
                      return (
                        <g key={`home-between-${lineIdx}`}>
                          <line
                            x1={sortedCurrent[0].x}
                            y1={sortedCurrent[0].y}
                            x2={sortedNext[0].x}
                            y2={sortedNext[0].y}
                            stroke="rgba(0, 200, 255, 0.5)"
                            strokeWidth="0.5"
                            strokeDasharray={leftLen}
                            strokeDashoffset={leftLen}
                            style={{
                              animation: `formationLinesDraw 0.5s ease-out ${0.5 + lineIdx * 0.1}s forwards`
                            }}
                          />
                          <line
                            x1={sortedCurrent[sortedCurrent.length - 1].x}
                            y1={sortedCurrent[sortedCurrent.length - 1].y}
                            x2={sortedNext[sortedNext.length - 1].x}
                            y2={sortedNext[sortedNext.length - 1].y}
                            stroke="rgba(0, 200, 255, 0.5)"
                            strokeWidth="0.5"
                            strokeDasharray={rightLen}
                            strokeDashoffset={rightLen}
                            style={{
                              animation: `formationLinesDraw 0.5s ease-out ${0.55 + lineIdx * 0.1}s forwards`
                            }}
                          />
                          {/* 中间连接 */}
                          {sortedCurrent.length > 2 && sortedNext.length > 2 && (() => {
                            const midLen = Math.sqrt(
                              Math.pow(sortedNext[Math.floor(sortedNext.length / 2)].x - sortedCurrent[Math.floor(sortedCurrent.length / 2)].x, 2) + 
                              Math.pow(sortedNext[Math.floor(sortedNext.length / 2)].y - sortedCurrent[Math.floor(sortedCurrent.length / 2)].y, 2)
                            );
                            return (
                              <line
                                x1={sortedCurrent[Math.floor(sortedCurrent.length / 2)].x}
                                y1={sortedCurrent[Math.floor(sortedCurrent.length / 2)].y}
                                x2={sortedNext[Math.floor(sortedNext.length / 2)].x}
                                y2={sortedNext[Math.floor(sortedNext.length / 2)].y}
                                stroke="rgba(0, 200, 255, 0.5)"
                                strokeWidth="0.5"
                                strokeDasharray={midLen}
                                strokeDashoffset={midLen}
                                style={{
                                  animation: `formationLinesDraw 0.5s ease-out ${0.6 + lineIdx * 0.1}s forwards`
                                }}
                              />
                            );
                          })()}
                        </g>
                      );
                    })}
                    
                    {/* 标准位置标记点 - 带缩放动画 */}
                    {formationPositions.map((pos, idx) => (
                      <circle
                        key={`home-pos-${idx}`}
                        cx={pos.x}
                        cy={pos.y}
                        r="1.5"
                        fill="rgba(0, 200, 255, 0.9)"
                        stroke="white"
                        strokeWidth="0.3"
                        style={{
                          transformOrigin: `${pos.x}px ${pos.y}px`,
                          animation: `formationFadeIn 0.3s ease-out ${0.1 + idx * 0.03}s forwards`,
                          opacity: 0
                        }}
                      >
                        <animate 
                          attributeName="r" 
                          values="1.5;2;1.5" 
                          dur="2s" 
                          repeatCount="indefinite" 
                          begin={`${0.5 + idx * 0.05}s`}
                        />
                      </circle>
                    ))}
                  </g>
                );
              })()}
              
              {/* 客队阵型 - 使用标准阵型配置（镜像） */}
              {selectedPlayer.team === 'away' && (() => {
                const formationPositions = mirrorFormation(formations[currentAwayFormation] || formations['4-3-3']);
                
                const formationParts = currentAwayFormation.split('-').map(Number);
                let currentIndex = 1;
                const lines: FormationPosition[][] = [];
                
                formationParts.forEach(count => {
                  lines.push(formationPositions.slice(currentIndex, currentIndex + count));
                  currentIndex += count;
                });
                
                const gkPos = formationPositions[0];
                
                return (
                  <g filter="url(#formationGlow)">
                    {/* 绘制每条线的区域填充 - 带淡入动画 */}
                    {lines.map((line, lineIdx) => {
                      if (line.length < 2) return null;
                      const sortedLine = [...line].sort((a, b) => a.x - b.x);
                      const avgY = line.reduce((sum, p) => sum + p.y, 0) / line.length;
                      
                      const leftX = Math.max(5, sortedLine[0].x - 8);
                      const rightX = Math.min(95, sortedLine[sortedLine.length - 1].x + 8);
                      const topY = avgY - 4;
                      const bottomY = avgY + 4;
                      
                      return (
                        <rect
                          key={`away-line-area-${lineIdx}`}
                          x={leftX}
                          y={topY}
                          width={rightX - leftX}
                          height={bottomY - topY}
                          fill="rgba(239, 68, 68, 0.15)"
                          rx="2"
                          ry="2"
                          style={{
                            animation: `formationFadeIn 0.4s ease-out ${lineIdx * 0.1}s forwards`,
                            opacity: 0
                          }}
                        >
                          <animate 
                            attributeName="opacity" 
                            values="0.1;0.2;0.1" 
                            dur="2s" 
                            repeatCount="indefinite" 
                            begin={`${lineIdx * 0.1}s`}
                          />
                        </rect>
                      );
                    })}
                    
                    {/* 门将到后防线连线 - 带绘制动画 */}
                    {lines[0] && lines[0].map((def, idx) => {
                      const lineLength = Math.sqrt(Math.pow(def.x - gkPos.x, 2) + Math.pow(def.y - gkPos.y, 2));
                      return (
                        <line
                          key={`away-gk-def-${idx}`}
                          x1={gkPos.x}
                          y1={gkPos.y}
                          x2={def.x}
                          y2={def.y}
                          stroke="rgba(239, 68, 68, 0.4)"
                          strokeWidth="0.5"
                          strokeDasharray={lineLength}
                          strokeDashoffset={lineLength}
                          style={{
                            animation: `formationLinesDraw 0.6s ease-out ${0.2 + idx * 0.05}s forwards`
                          }}
                        />
                      );
                    })}
                    
                    {/* 绘制每条线内球员连线 - 带绘制动画 */}
                    {lines.map((line, lineIdx) => {
                      const sortedLine = [...line].sort((a, b) => a.x - b.x);
                      return sortedLine.map((pos, idx) => {
                        if (idx === sortedLine.length - 1) return null;
                        const lineLength = Math.sqrt(Math.pow(sortedLine[idx + 1].x - pos.x, 2) + Math.pow(sortedLine[idx + 1].y - pos.y, 2));
                        return (
                          <line
                            key={`away-line-${lineIdx}-${idx}`}
                            x1={pos.x}
                            y1={pos.y}
                            x2={sortedLine[idx + 1].x}
                            y2={sortedLine[idx + 1].y}
                            stroke="rgba(239, 68, 68, 0.8)"
                            strokeWidth="0.8"
                            strokeDasharray={lineLength}
                            strokeDashoffset={lineLength}
                            style={{
                              animation: `formationLinesDraw 0.5s ease-out ${0.3 + lineIdx * 0.1 + idx * 0.05}s forwards`
                            }}
                          />
                        );
                      });
                    })}
                    
                    {/* 绘制线与线之间的连接 - 带绘制动画 */}
                    {lines.map((line, lineIdx) => {
                      if (lineIdx === lines.length - 1) return null;
                      const nextLine = lines[lineIdx + 1];
                      const sortedCurrent = [...line].sort((a, b) => a.x - b.x);
                      const sortedNext = [...nextLine].sort((a, b) => a.x - b.x);
                      
                      const leftLen = Math.sqrt(Math.pow(sortedNext[0].x - sortedCurrent[0].x, 2) + Math.pow(sortedNext[0].y - sortedCurrent[0].y, 2));
                      const rightLen = Math.sqrt(Math.pow(sortedNext[sortedNext.length-1].x - sortedCurrent[sortedCurrent.length-1].x, 2) + Math.pow(sortedNext[sortedNext.length-1].y - sortedCurrent[sortedCurrent.length-1].y, 2));
                      
                      return (
                        <g key={`away-between-${lineIdx}`}>
                          <line
                            x1={sortedCurrent[0].x}
                            y1={sortedCurrent[0].y}
                            x2={sortedNext[0].x}
                            y2={sortedNext[0].y}
                            stroke="rgba(239, 68, 68, 0.5)"
                            strokeWidth="0.5"
                            strokeDasharray={leftLen}
                            strokeDashoffset={leftLen}
                            style={{
                              animation: `formationLinesDraw 0.5s ease-out ${0.5 + lineIdx * 0.1}s forwards`
                            }}
                          />
                          <line
                            x1={sortedCurrent[sortedCurrent.length - 1].x}
                            y1={sortedCurrent[sortedCurrent.length - 1].y}
                            x2={sortedNext[sortedNext.length - 1].x}
                            y2={sortedNext[sortedNext.length - 1].y}
                            stroke="rgba(239, 68, 68, 0.5)"
                            strokeWidth="0.5"
                            strokeDasharray={rightLen}
                            strokeDashoffset={rightLen}
                            style={{
                              animation: `formationLinesDraw 0.5s ease-out ${0.55 + lineIdx * 0.1}s forwards`
                            }}
                          />
                          {sortedCurrent.length > 2 && sortedNext.length > 2 && (() => {
                            const midLen = Math.sqrt(
                              Math.pow(sortedNext[Math.floor(sortedNext.length / 2)].x - sortedCurrent[Math.floor(sortedCurrent.length / 2)].x, 2) + 
                              Math.pow(sortedNext[Math.floor(sortedNext.length / 2)].y - sortedCurrent[Math.floor(sortedCurrent.length / 2)].y, 2)
                            );
                            return (
                              <line
                                x1={sortedCurrent[Math.floor(sortedCurrent.length / 2)].x}
                                y1={sortedCurrent[Math.floor(sortedCurrent.length / 2)].y}
                                x2={sortedNext[Math.floor(sortedNext.length / 2)].x}
                                y2={sortedNext[Math.floor(sortedNext.length / 2)].y}
                                stroke="rgba(239, 68, 68, 0.5)"
                                strokeWidth="0.5"
                                strokeDasharray={midLen}
                                strokeDashoffset={midLen}
                                style={{
                                  animation: `formationLinesDraw 0.5s ease-out ${0.6 + lineIdx * 0.1}s forwards`
                                }}
                              />
                            );
                          })()}
                        </g>
                      );
                    })}
                    
                    {/* 标准位置标记点 - 带缩放动画 */}
                    {formationPositions.map((pos, idx) => (
                      <circle
                        key={`away-pos-${idx}`}
                        cx={pos.x}
                        cy={pos.y}
                        r="1.5"
                        fill="rgba(239, 68, 68, 0.9)"
                        stroke="white"
                        strokeWidth="0.3"
                        style={{
                          transformOrigin: `${pos.x}px ${pos.y}px`,
                          animation: `formationFadeIn 0.3s ease-out ${0.1 + idx * 0.03}s forwards`,
                          opacity: 0
                        }}
                      >
                        <animate 
                          attributeName="r" 
                          values="1.5;2;1.5" 
                          dur="2s" 
                          repeatCount="indefinite" 
                          begin={`${0.5 + idx * 0.05}s`}
                        />
                      </circle>
                    ))}
                  </g>
                );
              })()}
              </g>
            </svg>
            
            {/* 位置标签 - 使用HTML元素避免变形 */}
            {selectedPlayer.team === 'home' && (() => {
              const formationPositions = formations[currentHomeFormation] || formations['4-4-2'];
              const formationParts = currentHomeFormation.split('-').map(Number);
              let currentIndex = 1;
              const lines: FormationPosition[][] = [];
              formationParts.forEach(count => {
                lines.push(formationPositions.slice(currentIndex, currentIndex + count));
                currentIndex += count;
              });
              
              return lines.map((line, lineIdx) => {
                const avgY = line.reduce((sum, p) => sum + p.y, 0) / line.length;
                const labels = ['后卫', '中场', '前锋', '前腰'];
                const label = formationParts.length === 4 
                  ? ['后卫', '后腰', '前腰', '前锋'][lineIdx]
                  : labels[lineIdx];
                return (
                  <div
                    key={`home-label-${lineIdx}`}
                    className="absolute left-2 text-xs md:text-sm font-bold pointer-events-none z-10 px-2 py-0.5 rounded"
                    style={{
                      top: `${avgY}%`,
                      transform: 'translateY(-50%)',
                      color: 'white',
                      background: 'rgba(0, 100, 255, 0.7)',
                      border: '1px solid rgba(0, 200, 255, 0.6)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      boxShadow: '0 0 8px rgba(0, 150, 255, 0.5)',
                      animation: `formationFadeIn 0.4s ease-out ${0.4 + lineIdx * 0.1}s forwards`,
                      opacity: 0
                    }}
                  >
                    {label}
                  </div>
                );
              });
            })()}
            
            {selectedPlayer.team === 'away' && (() => {
              const formationPositions = mirrorFormation(formations[currentAwayFormation] || formations['4-3-3']);
              const formationParts = currentAwayFormation.split('-').map(Number);
              let currentIndex = 1;
              const lines: FormationPosition[][] = [];
              formationParts.forEach(count => {
                lines.push(formationPositions.slice(currentIndex, currentIndex + count));
                currentIndex += count;
              });
              
              return lines.map((line, lineIdx) => {
                const avgY = line.reduce((sum, p) => sum + p.y, 0) / line.length;
                const labels = ['后卫', '中场', '前锋', '前腰'];
                const label = formationParts.length === 4 
                  ? ['后卫', '后腰', '前腰', '前锋'][lineIdx]
                  : labels[lineIdx];
                return (
                  <div
                    key={`away-label-${lineIdx}`}
                    className="absolute left-2 text-xs md:text-sm font-bold pointer-events-none z-10 px-2 py-0.5 rounded"
                    style={{
                      top: `${avgY}%`,
                      transform: 'translateY(-50%)',
                      color: 'white',
                      background: 'rgba(220, 38, 38, 0.7)',
                      border: '1px solid rgba(239, 68, 68, 0.6)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                      animation: `formationFadeIn 0.4s ease-out ${0.4 + lineIdx * 0.1}s forwards`,
                      opacity: 0
                    }}
                  >
                    {label}
                  </div>
                );
              });
            })()}
          </>
        )}

        {/* 主队球员 (蓝色) */}
        {homePlayers.map(player => {
          const isChaser = chasingPlayer?.team === 'home' && chasingPlayer?.id === player.id;
          const isSelected = selectedPlayer?.id === player.id && selectedPlayer?.team === 'home';
          
          return (
            <div
              key={`home-${player.id}`}
              className="absolute cursor-pointer"
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 20 : isChaser ? 15 : 10,
                willChange: 'left, top',
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
                  
                  
                  <div 
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden transition-all ${
                      isSelected ? 'ring-4 ring-yellow-400 scale-110' : isChaser ? 'ring-4 ring-emerald-400 scale-105' : 'ring-2 ring-cyan-300'
                    }`}
                    style={{
                      border: '3px solid #00bfff',
                      background: 'linear-gradient(135deg, #0066ff, #00aaff)',
                      boxShadow: '0 0 16px rgba(0, 150, 255, 0.8), 0 4px 12px rgba(0, 100, 255, 0.5)'
                    }}
                  >
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
                  <div 
                    className={`absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md`}
                    style={{ background: isChaser ? '#10b981' : '#0066ff' }}
                  >
                    <span className="text-[8px] md:text-[10px] font-bold text-white">{player.id + 1}</span>
                  </div>
                  
                  {/* 体能条 (AI指标开启时显示小条，选中时显示详细) */}
                  {showAIIndicators && !isSelected && (() => {
                    const stamina = playerStamina[`home-${player.id}`] || 100;
                    const staminaColor = stamina >= 70 ? '#22c55e' : stamina >= 40 ? '#eab308' : '#ef4444';
                    return (
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-black/60 overflow-hidden border border-white/20">
                        <div 
                          className="h-full rounded-full"
                          style={{ width: `${stamina}%`, background: staminaColor }}
                        />
                      </div>
                    );
                  })()}
                  
                  {/* 发光效果 */}
                  <div 
                    className={`absolute inset-0 rounded-full blur-md -z-10 scale-150 transition-all ${isChaser ? 'animate-pulse' : ''}`}
                    style={{ 
                      background: isChaser ? '#10b981' : isSelected ? '#00aaff' : '#0088ff',
                      opacity: isChaser || isSelected ? 1 : 0.7
                    }} 
                  />
                </div>
                {/* 球员名字 */}
                <div 
                  className={`mt-1 px-1.5 py-0.5 rounded text-[6px] md:text-[8px] text-white font-medium whitespace-nowrap shadow-md transition-colors`}
                  style={{ background: isSelected ? '#eab308' : isChaser ? '#10b981' : 'rgba(0, 100, 255, 0.9)' }}
                >
                  {player.name}
                </div>
                
                {/* 选中时显示AI体能面板 */}
                {isSelected && (() => {
                  const stamina = playerStamina[`home-${player.id}`] || 100;
                  const staminaColor = stamina >= 70 ? '#00ffc8' : stamina >= 40 ? '#fbbf24' : '#ef4444';
                  
                  return (
                    <div className="mt-2 animate-fade-in">
                      {/* AI风格简约面板 */}
                      <div className="relative px-3 py-1.5 bg-black/80 backdrop-blur-md rounded border border-cyan-500/30"
                           style={{ boxShadow: `0 0 12px ${staminaColor}30` }}>
                        {/* 扫描线动画 */}
                        <div className="absolute inset-0 overflow-hidden rounded pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 via-transparent to-transparent animate-pulse" />
                        </div>
                        
                        {/* 数值显示 */}
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-cyan-400/80 font-mono tracking-wider">STA</span>
                          <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${stamina}%`,
                                background: staminaColor,
                                boxShadow: `0 0 6px ${staminaColor}`
                              }}
                            />
                          </div>
                          <span 
                            className="text-[10px] font-mono font-bold tabular-nums"
                            style={{ color: staminaColor, textShadow: `0 0 8px ${staminaColor}` }}
                          >
                            {Math.round(stamina)}
                          </span>
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
              className="absolute cursor-pointer"
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected ? 20 : isChaser ? 15 : 10,
                willChange: 'left, top',
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
                  
                  
                  <div 
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden transition-all ${
                      isSelected ? 'ring-4 ring-yellow-400 scale-110' : isChaser ? 'ring-4 ring-emerald-400 scale-105' : 'ring-2 ring-red-400'
                    }`}
                    style={{
                      border: '3px solid #ef4444',
                      background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                      boxShadow: '0 0 16px rgba(239, 68, 68, 0.8), 0 4px 12px rgba(220, 38, 38, 0.5)'
                    }}
                  >
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
                  <div 
                    className={`absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md`}
                    style={{ background: isChaser ? '#10b981' : '#dc2626' }}
                  >
                    <span className="text-[8px] md:text-[10px] font-bold text-white">{player.id + 1}</span>
                  </div>
                  
                  {/* 体能条 (AI指标开启时显示小条，选中时显示详细) */}
                  {showAIIndicators && !isSelected && (() => {
                    const stamina = playerStamina[`away-${player.id}`] || 100;
                    const staminaColor = stamina >= 70 ? '#22c55e' : stamina >= 40 ? '#eab308' : '#ef4444';
                    return (
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-black/60 overflow-hidden border border-white/20">
                        <div 
                          className="h-full rounded-full"
                          style={{ width: `${stamina}%`, background: staminaColor }}
                        />
                      </div>
                    );
                  })()}
                  
                  {/* 发光效果 */}
                  <div 
                    className={`absolute inset-0 rounded-full blur-md -z-10 scale-150 transition-all ${isChaser ? 'animate-pulse' : ''}`}
                    style={{ 
                      background: isChaser ? '#10b981' : isSelected ? '#ef4444' : '#dc2626',
                      opacity: isChaser || isSelected ? 1 : 0.7
                    }}
                  />
                </div>
                {/* 球员名字 */}
                <div 
                  className={`mt-1 px-1.5 py-0.5 rounded text-[6px] md:text-[8px] text-white font-medium whitespace-nowrap shadow-md transition-colors`}
                  style={{ background: isSelected ? '#eab308' : isChaser ? '#10b981' : 'rgba(255, 70, 0, 0.9)' }}
                >
                  {player.name}
                </div>
                
                {/* 选中时显示AI体能面板 */}
                {isSelected && (() => {
                  const stamina = playerStamina[`away-${player.id}`] || 100;
                  const staminaColor = stamina >= 70 ? '#00ffc8' : stamina >= 40 ? '#fbbf24' : '#ef4444';
                  
                  return (
                    <div className="mt-2 animate-fade-in">
                      {/* AI风格简约面板 */}
                      <div className="relative px-3 py-1.5 bg-black/80 backdrop-blur-md rounded border border-cyan-500/30"
                           style={{ boxShadow: `0 0 12px ${staminaColor}30` }}>
                        {/* 扫描线动画 */}
                        <div className="absolute inset-0 overflow-hidden rounded pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 via-transparent to-transparent animate-pulse" />
                        </div>
                        
                        {/* 数值显示 */}
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-cyan-400/80 font-mono tracking-wider">STA</span>
                          <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${stamina}%`,
                                background: staminaColor,
                                boxShadow: `0 0 6px ${staminaColor}`
                              }}
                            />
                          </div>
                          <span 
                            className="text-[10px] font-mono font-bold tabular-nums"
                            style={{ color: staminaColor, textShadow: `0 0 8px ${staminaColor}` }}
                          >
                            {Math.round(stamina)}
                          </span>
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
          className="absolute"
          style={{
            left: `${ballPosition.x}%`,
            top: `${ballPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            willChange: 'left, top',
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

        {/* AI球员分析面板 - 显示距离和进球概率 */}
        {selectedPlayer && (() => {
          const players = selectedPlayer.team === 'home' ? homePlayers : awayPlayers;
          const player = players.find(p => p.id === selectedPlayer.id);
          if (!player) return null;
          
          // 计算到对方球门的距离 (球场尺寸约105m x 68m)
          const goalY = selectedPlayer.team === 'home' ? 0 : 100;
          const goalX = 50;
          const distancePercent = Math.sqrt(Math.pow(player.x - goalX, 2) + Math.pow(player.y - goalY, 2));
          const distanceMeters = Math.round(distancePercent * 1.05); // 转换为米
          
          // 计算xG进球概率
          const xg = calculateXG(player.x, player.y, selectedPlayer.team);
          const xgPercent = Math.round(xg * 100);
          
          // 判断区域
          const inPenaltyArea = selectedPlayer.team === 'home' 
            ? player.y <= 18 && player.x >= 20 && player.x <= 80
            : player.y >= 82 && player.x >= 20 && player.x <= 80;
          const inDangerZone = selectedPlayer.team === 'home'
            ? player.y <= 35
            : player.y >= 65;
          
          // 威胁等级
          const threatLevel = xgPercent >= 30 ? '高' : xgPercent >= 15 ? '中' : '低';
          const threatColor = xgPercent >= 30 ? '#ef4444' : xgPercent >= 15 ? '#f59e0b' : '#22c55e';
          
          const teamColor = selectedPlayer.team === 'home' ? 'rgba(0, 150, 255, 0.9)' : 'rgba(239, 68, 68, 0.9)';
          const teamBorderColor = selectedPlayer.team === 'home' ? 'rgba(0, 200, 255, 0.6)' : 'rgba(255, 100, 100, 0.6)';
          
          return (
            <div 
              className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30"
              style={{
                animation: 'formationFadeIn 0.3s ease-out forwards'
              }}
            >
              <div 
                className="relative px-4 py-3 rounded-lg backdrop-blur-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(20, 20, 30, 0.9))',
                  border: `1px solid ${teamBorderColor}`,
                  boxShadow: `0 0 20px ${teamColor}40, inset 0 1px 0 rgba(255,255,255,0.1)`
                }}
              >
                {/* 扫描线动画 */}
                <div 
                  className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
                  style={{ opacity: 0.3 }}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: `repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(0, 255, 200, 0.03) 2px,
                        rgba(0, 255, 200, 0.03) 4px
                      )`,
                      animation: 'shimmer 3s linear infinite'
                    }}
                  />
                </div>
                
                {/* 顶部标题栏 */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: '#00ffc8', boxShadow: '0 0 8px #00ffc8' }}
                    />
                    <span className="text-[10px] font-mono text-cyan-400 tracking-wider">AI 分析</span>
                  </div>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ 
                      background: `${threatColor}30`,
                      color: threatColor,
                      border: `1px solid ${threatColor}50`
                    }}
                  >
                    威胁: {threatLevel}
                  </span>
                </div>
                
                {/* 球员信息 */}
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-full overflow-hidden"
                    style={{ 
                      border: `2px solid ${teamColor}`,
                      boxShadow: `0 0 12px ${teamColor}60`
                    }}
                  >
                    <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{player.name}</div>
                    <div className="text-white/50 text-[10px] font-mono">
                      #{player.id + 1} · {selectedPlayer.team === 'home' ? '主队' : '客队'}
                    </div>
                  </div>
                </div>
                
                {/* 数据指标 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* 距离球门 */}
                  <div className="bg-black/40 rounded-lg p-2 border border-white/10">
                    <div className="text-[9px] text-white/50 font-mono mb-1">距离球门</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-cyan-400 font-mono">{distanceMeters}</span>
                      <span className="text-[10px] text-cyan-400/70">m</span>
                    </div>
                    <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.max(5, 100 - distancePercent)}%`,
                          background: 'linear-gradient(90deg, #00ffc8, #00aaff)'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* 进球概率 */}
                  <div className="bg-black/40 rounded-lg p-2 border border-white/10">
                    <div className="text-[9px] text-white/50 font-mono mb-1">进球概率</div>
                    <div className="flex items-baseline gap-1">
                      <span 
                        className="text-xl font-bold font-mono"
                        style={{ color: threatColor }}
                      >
                        {xgPercent}
                      </span>
                      <span className="text-[10px]" style={{ color: `${threatColor}99` }}>%</span>
                    </div>
                    <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${xgPercent}%`,
                          background: `linear-gradient(90deg, #22c55e, ${threatColor})`
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 区域状态 */}
                <div className="mt-2 flex items-center gap-2 text-[9px]">
                  <div 
                    className="px-2 py-0.5 rounded font-mono"
                    style={{
                      background: inPenaltyArea ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: inPenaltyArea ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                      color: inPenaltyArea ? '#ef4444' : 'rgba(255,255,255,0.5)'
                    }}
                  >
                    {inPenaltyArea ? '⚠ 禁区内' : '禁区外'}
                  </div>
                  {inDangerZone && !inPenaltyArea && (
                    <div 
                      className="px-2 py-0.5 rounded font-mono"
                      style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#f59e0b'
                      }}
                    >
                      危险区域
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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

      {/* AI 高级分析仪表板 */}
      {(() => {
        // 动态生成AI分析数据
        const modelConfidence = 73 + Math.floor(Math.random() * 15);
        const dataLatency = 12 + Math.floor(Math.random() * 8);
        const inferenceTime = 45 + Math.floor(Math.random() * 30);
        const neuralLayers = 128;
        const activeNeurons = 89000 + Math.floor(Math.random() * 5000);
        const dataPoints = 2.4 + (Math.random() * 0.3);
        const homeXg = 1.2 + Math.random() * 0.8;
        const awayXg = 0.8 + Math.random() * 0.6;
        const homePressure = 55 + Math.floor(Math.random() * 20);
        const awayPressure = 45 + Math.floor(Math.random() * 20);
        const momentum = Math.floor(Math.random() * 100) - 50; // -50 to +50
        const volatility = 15 + Math.floor(Math.random() * 25);
        
        return (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 左侧: AI 模型状态 */}
            <div className="relative bg-black/95 backdrop-blur-md rounded border border-cyan-500/30 overflow-hidden">
              {/* 扫描线 */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,255,0.05) 3px, rgba(0,255,255,0.05) 6px)',
                }}
              />
              
              {/* 头部 */}
              <div className="px-3 py-1.5 border-b border-cyan-500/20 bg-cyan-950/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[8px] text-cyan-400/80 font-mono uppercase tracking-wider">神经网络引擎</span>
                </div>
                <span className="text-[7px] text-cyan-400/50 font-mono">v4.2.1</span>
              </div>
              
              {/* 内容 */}
              <div className="p-3 space-y-2.5">
                {/* 模型置信度 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-white/50 font-mono">模型置信度</span>
                    <span className={`text-[10px] font-mono font-bold ${modelConfidence >= 80 ? 'text-green-400' : modelConfidence >= 60 ? 'text-cyan-400' : 'text-yellow-400'}`}>
                      {modelConfidence}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${modelConfidence}%`,
                        background: modelConfidence >= 80 
                          ? 'linear-gradient(90deg, #22c55e, #4ade80)' 
                          : modelConfidence >= 60 
                            ? 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                            : 'linear-gradient(90deg, #eab308, #facc15)',
                      }}
                    />
                  </div>
                </div>
                
                {/* 系统指标网格 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-1.5 rounded bg-slate-900/50 border border-cyan-500/10">
                    <div className="text-[7px] text-cyan-400/50 font-mono mb-0.5">延迟</div>
                    <div className="text-[10px] text-cyan-400 font-mono font-bold">{dataLatency}ms</div>
                  </div>
                  <div className="text-center p-1.5 rounded bg-slate-900/50 border border-cyan-500/10">
                    <div className="text-[7px] text-cyan-400/50 font-mono mb-0.5">推理</div>
                    <div className="text-[10px] text-cyan-400 font-mono font-bold">{inferenceTime}ms</div>
                  </div>
                  <div className="text-center p-1.5 rounded bg-slate-900/50 border border-cyan-500/10">
                    <div className="text-[7px] text-cyan-400/50 font-mono mb-0.5">层数</div>
                    <div className="text-[10px] text-cyan-400 font-mono font-bold">{neuralLayers}</div>
                  </div>
                </div>
                
                {/* 神经网络活动 */}
                <div className="pt-2 border-t border-cyan-500/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] text-white/50 font-mono">激活神经元</span>
                    <span className="text-[9px] text-cyan-400 font-mono">{(activeNeurons / 1000).toFixed(1)}K / 128K</span>
                  </div>
                  {/* 神经网络可视化 - 动态波形 */}
                  <div className="flex items-end justify-between h-6 gap-px">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const height = 20 + Math.random() * 80;
                      return (
                        <div 
                          key={i}
                          className="flex-1 rounded-t transition-all duration-150"
                          style={{
                            height: `${height}%`,
                            background: `linear-gradient(to top, rgba(6,182,212,0.3), rgba(6,182,212,${0.5 + height/200}))`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                
                {/* 数据源状态 */}
                <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[7px] text-white/40 font-mono">数据点: {dataPoints.toFixed(1)}M</span>
                  </div>
                  <span className="text-[7px] text-green-400/70 font-mono">实时传输</span>
                </div>
              </div>
            </div>
            
            {/* 右侧: 比赛预测指标 */}
            <div className="relative bg-black/95 backdrop-blur-md rounded border border-cyan-500/30 overflow-hidden">
              {/* 扫描线 */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,255,0.05) 3px, rgba(0,255,255,0.05) 6px)',
                }}
              />
              
              {/* 头部 */}
              <div className="px-3 py-1.5 border-b border-cyan-500/20 bg-cyan-950/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[8px] text-cyan-400/80 font-mono uppercase tracking-wider">比赛数据指标</span>
                </div>
                <span className="text-[7px] text-cyan-400/50 font-mono">实时</span>
              </div>
              
              {/* 内容 */}
              <div className="p-3 space-y-2.5">
                {/* xG 预期进球 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-white/50 font-mono">xG (预期进球)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-blue-400 font-mono font-bold w-10">{homeXg.toFixed(2)}</span>
                    <div className="flex-1 h-2 rounded bg-slate-800 overflow-hidden flex">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${(homeXg / (homeXg + awayXg)) * 100}%`,
                          background: 'linear-gradient(90deg, rgba(59,130,246,0.8), rgba(59,130,246,0.5))',
                        }}
                      />
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${(awayXg / (homeXg + awayXg)) * 100}%`,
                          background: 'linear-gradient(90deg, rgba(239,68,68,0.5), rgba(239,68,68,0.8))',
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-red-400 font-mono font-bold w-10 text-right">{awayXg.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* 压迫指数 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-white/50 font-mono">压迫指数</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-blue-400 font-mono font-bold w-8">{homePressure}</span>
                    <div className="flex-1 h-1.5 rounded bg-slate-800 overflow-hidden flex">
                      <div 
                        className="h-full bg-blue-500/70"
                        style={{ width: `${homePressure}%` }}
                      />
                      <div 
                        className="h-full bg-red-500/70"
                        style={{ width: `${awayPressure}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-red-400 font-mono font-bold w-8 text-right">{awayPressure}</span>
                  </div>
                </div>
                
                {/* 动量指标 */}
                <div className="pt-2 border-t border-cyan-500/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] text-white/50 font-mono">比赛动量</span>
                    <span className={`text-[9px] font-mono font-bold ${momentum > 10 ? 'text-blue-400' : momentum < -10 ? 'text-red-400' : 'text-white/50'}`}>
                      {momentum > 0 ? '+' : ''}{momentum}
                    </span>
                  </div>
                  <div className="relative h-2 rounded bg-slate-800 overflow-hidden">
                    {/* 中心线 */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                    {/* 动量条 */}
                    <div 
                      className={`absolute top-0 bottom-0 transition-all duration-300 ${momentum >= 0 ? 'left-1/2' : 'right-1/2'}`}
                      style={{
                        width: `${Math.abs(momentum) / 2}%`,
                        background: momentum >= 0 
                          ? 'linear-gradient(90deg, rgba(59,130,246,0.5), rgba(59,130,246,0.9))'
                          : 'linear-gradient(-90deg, rgba(239,68,68,0.5), rgba(239,68,68,0.9))',
                      }}
                    />
                  </div>
                </div>
                
                {/* 风险/波动指标 */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-500/10">
                  <div className="p-1.5 rounded bg-slate-900/50 border border-cyan-500/10">
                    <div className="text-[7px] text-cyan-400/50 font-mono mb-0.5">波动率</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${volatility > 30 ? 'bg-yellow-400' : 'bg-green-400'}`} />
                      <span className={`text-[10px] font-mono font-bold ${volatility > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {volatility}%
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/50 border border-cyan-500/10">
                    <div className="text-[7px] text-cyan-400/50 font-mono mb-0.5">风险等级</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${volatility > 35 ? 'bg-red-400' : volatility > 25 ? 'bg-yellow-400' : 'bg-green-400'}`} />
                      <span className={`text-[10px] font-mono font-bold ${volatility > 35 ? 'text-red-400' : volatility > 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {volatility > 35 ? '高' : volatility > 25 ? '中' : '低'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 底部状态 */}
                <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
                  <span className="text-[7px] text-white/40 font-mono">模型: HUNSOCCER-PRO-v4</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[7px] text-green-400/70 font-mono">实时</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 说明文字 */}
      <p className="text-xs text-muted-foreground text-center mt-3">
        AI实时分析引擎：神经网络处理 + xG预测 + 动量追踪
      </p>
    </div>
  );
}

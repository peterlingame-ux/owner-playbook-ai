export interface VirtualPlayer {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  balance: number;
  profit: number;
  changePercent: number;
  bestStreak?: number;
  worstStreak?: number;
  currentStreak?: number; // 当前连胜/连败 (正数为连胜，负数为连败)
  todayPredictions?: number; // 今日预测数
  todayCorrect?: number; // 今日正确数
  joinedDaysAgo?: number; // 加入天数
  allowCopyTrade?: boolean;
  isRecommender?: boolean;
  unlockPrice?: number;
}

// 生成真实的虚拟玩家数据
const generateRealisticPlayer = (
  id: string,
  displayName: string,
  avatarNum: number,
  totalPredictions: number,
  winRate: number,
  options: {
    currentStreak?: number;
    joinedDaysAgo?: number;
    allowCopyTrade?: boolean;
    isRecommender?: boolean;
    unlockPrice?: number;
    worstStreak?: number;
    todayPredictions?: number;
  } = {}
): VirtualPlayer => {
  const correctPredictions = Math.round(totalPredictions * winRate / 100);
  const incorrectPredictions = totalPredictions - correctPredictions;
  
  // 根据胜率和预测数计算盈利（考虑赔率约1.8-2.0）
  const avgOdds = 1.85;
  const avgBet = 100 + Math.random() * 400; // 平均下注100-500
  const grossWin = correctPredictions * avgBet * (avgOdds - 1);
  const grossLoss = incorrectPredictions * avgBet;
  const rawProfit = Math.round(grossWin - grossLoss);
  
  const initialBalance = 10000;
  // 盈利不能低于-10000（即本金全亏），确保盈利率最低为-100%
  const profit = Math.max(-initialBalance, rawProfit);
  const balance = Math.max(0, initialBalance + profit); // 最低余额为0
  // 盈利率基于初始本金，限制在 -100% 到 无上限
  const changePercent = Math.round((profit / initialBalance) * 1000) / 10;
  
  // 根据胜率计算合理的连胜/连败记录
  const bestStreak = Math.max(2, Math.round(winRate / 10 + Math.random() * 4));
  const worstStreak = options.worstStreak ?? Math.max(2, Math.round((100 - winRate) / 12 + Math.random() * 3));
  
  // 今日预测（活跃玩家1-8场，普通玩家0-3场）
  const isActive = totalPredictions > 100;
  const todayPredictions = options.todayPredictions ?? (isActive 
    ? Math.floor(Math.random() * 8) + 1 
    : Math.floor(Math.random() * 4));
  const todayCorrect = Math.round(todayPredictions * (winRate / 100) * (0.7 + Math.random() * 0.6));
  
  return {
    id,
    displayName,
    avatarUrl: `/avatars/avatar-${avatarNum}.png`,
    totalPredictions,
    correctPredictions,
    winRate,
    balance,
    profit,
    changePercent,
    bestStreak,
    worstStreak,
    currentStreak: options.currentStreak ?? (Math.random() > 0.5 ? Math.floor(Math.random() * 6) + 1 : -Math.floor(Math.random() * 4) - 1),
    todayPredictions,
    todayCorrect,
    joinedDaysAgo: options.joinedDaysAgo ?? Math.floor(Math.random() * 180) + 1,
    allowCopyTrade: options.allowCopyTrade ?? Math.random() > 0.4,
    isRecommender: options.isRecommender ?? Math.random() > 0.5,
    unlockPrice: options.unlockPrice,
  };
};

export const virtualPlayers: VirtualPlayer[] = [
  // ============ 顶级玩家 (胜率 75%+) ============
  generateRealisticPlayer('vp-001', '球王小李', 1, 286, 82.5, { currentStreak: 9, joinedDaysAgo: 156, unlockPrice: 8, allowCopyTrade: true, isRecommender: true }),
  generateRealisticPlayer('vp-002', 'PredictorMax', 4, 342, 79.8, { currentStreak: 6, joinedDaysAgo: 203, unlockPrice: 6, allowCopyTrade: true, isRecommender: true }),
  generateRealisticPlayer('vp-003', '足彩老司机', 7, 198, 78.3, { currentStreak: 4, joinedDaysAgo: 89, unlockPrice: 5, allowCopyTrade: true, isRecommender: true }),
  generateRealisticPlayer('vp-004', 'GoalHunter99', 2, 267, 77.1, { currentStreak: 7, joinedDaysAgo: 134, unlockPrice: 4, allowCopyTrade: true }),
  generateRealisticPlayer('vp-005', '大数据预测王', 9, 412, 76.2, { currentStreak: 3, joinedDaysAgo: 278, unlockPrice: 5, isRecommender: true }),
  
  // ============ 高手玩家 (胜率 68-75%) ============
  generateRealisticPlayer('vp-006', 'WinStreak2024', 3, 156, 74.4, { currentStreak: 5, joinedDaysAgo: 67, unlockPrice: 3 }),
  generateRealisticPlayer('vp-007', '欧洲杯达人', 6, 223, 73.5, { currentStreak: 2, joinedDaysAgo: 112, allowCopyTrade: true }),
  generateRealisticPlayer('vp-008', 'BetMaster_CN', 8, 189, 72.8, { currentStreak: -1, joinedDaysAgo: 95, isRecommender: true }),
  generateRealisticPlayer('vp-009', '阿森纳铁粉', 1, 178, 71.9, { currentStreak: 4, joinedDaysAgo: 145, allowCopyTrade: true }),
  generateRealisticPlayer('vp-010', 'ScorePro', 5, 256, 71.1, { currentStreak: 1, joinedDaysAgo: 167, unlockPrice: 2 }),
  generateRealisticPlayer('vp-011', '五大联赛专家', 2, 312, 70.5, { currentStreak: -2, joinedDaysAgo: 234, isRecommender: true }),
  generateRealisticPlayer('vp-012', 'ChampionBet', 9, 145, 69.7, { currentStreak: 3, joinedDaysAgo: 56 }),
  generateRealisticPlayer('vp-013', '临门一脚王', 4, 234, 69.2, { currentStreak: 2, joinedDaysAgo: 178, allowCopyTrade: true }),
  generateRealisticPlayer('vp-014', 'Victor_Zhang', 7, 167, 68.9, { currentStreak: -1, joinedDaysAgo: 123 }),
  generateRealisticPlayer('vp-015', '黄金左脚', 3, 198, 68.2, { currentStreak: 5, joinedDaysAgo: 89, isRecommender: true }),
  
  // ============ 中等玩家 (胜率 58-68%) ============
  generateRealisticPlayer('vp-016', 'LuckyStrike88', 6, 289, 67.5, { currentStreak: 1, joinedDaysAgo: 201 }),
  generateRealisticPlayer('vp-017', '稳健型选手', 1, 176, 66.8, { currentStreak: -3, joinedDaysAgo: 134, allowCopyTrade: true }),
  generateRealisticPlayer('vp-018', 'KickMaster', 8, 234, 66.2, { currentStreak: 2, joinedDaysAgo: 156 }),
  generateRealisticPlayer('vp-019', '英超观察员', 2, 156, 65.4, { currentStreak: -1, joinedDaysAgo: 78 }),
  generateRealisticPlayer('vp-020', 'DataDriven', 5, 312, 64.7, { currentStreak: 3, joinedDaysAgo: 245, isRecommender: true }),
  generateRealisticPlayer('vp-021', '西甲小王子', 9, 189, 64.0, { currentStreak: -2, joinedDaysAgo: 112 }),
  generateRealisticPlayer('vp-022', 'PredictNow', 4, 267, 63.3, { currentStreak: 1, joinedDaysAgo: 189 }),
  generateRealisticPlayer('vp-023', '球场风云', 7, 145, 62.8, { currentStreak: 4, joinedDaysAgo: 67, allowCopyTrade: true }),
  generateRealisticPlayer('vp-024', 'FootballFan_SH', 3, 223, 62.1, { currentStreak: -1, joinedDaysAgo: 145 }),
  generateRealisticPlayer('vp-025', '意甲情报站', 6, 198, 61.6, { currentStreak: 2, joinedDaysAgo: 98 }),
  generateRealisticPlayer('vp-026', 'SmartBet', 1, 278, 61.0, { currentStreak: -2, joinedDaysAgo: 212, isRecommender: true }),
  generateRealisticPlayer('vp-027', '拜仁死忠', 8, 167, 60.5, { currentStreak: 1, joinedDaysAgo: 134 }),
  generateRealisticPlayer('vp-028', 'MatchWinner', 2, 234, 59.8, { currentStreak: 3, joinedDaysAgo: 167, allowCopyTrade: true }),
  generateRealisticPlayer('vp-029', '德甲达人', 5, 145, 59.3, { currentStreak: -1, joinedDaysAgo: 89 }),
  generateRealisticPlayer('vp-030', 'ProTipster', 9, 312, 58.7, { currentStreak: 2, joinedDaysAgo: 256 }),
  
  // ============ 普通玩家 (胜率 48-58%) ============
  generateRealisticPlayer('vp-031', '新手上路01', 4, 89, 57.3, { currentStreak: -2, joinedDaysAgo: 34 }),
  generateRealisticPlayer('vp-032', 'CasualGamer', 7, 156, 56.4, { currentStreak: 1, joinedDaysAgo: 78 }),
  generateRealisticPlayer('vp-033', '周末玩家', 3, 67, 55.2, { currentStreak: 2, joinedDaysAgo: 45, allowCopyTrade: true }),
  generateRealisticPlayer('vp-034', 'SoccerLove', 6, 198, 54.5, { currentStreak: -3, joinedDaysAgo: 123 }),
  generateRealisticPlayer('vp-035', '法甲观众', 1, 123, 53.7, { currentStreak: 1, joinedDaysAgo: 67 }),
  generateRealisticPlayer('vp-036', 'BetForFun', 8, 234, 52.8, { currentStreak: -1, joinedDaysAgo: 156 }),
  generateRealisticPlayer('vp-037', '小白进化中', 2, 78, 51.3, { currentStreak: 2, joinedDaysAgo: 28 }),
  generateRealisticPlayer('vp-038', 'JustTrying', 5, 145, 50.3, { currentStreak: -4, joinedDaysAgo: 89, allowCopyTrade: true }),
  generateRealisticPlayer('vp-039', '佛系玩家', 9, 189, 49.2, { currentStreak: 1, joinedDaysAgo: 112 }),
  generateRealisticPlayer('vp-040', 'Weekend_Bet', 4, 112, 48.2, { currentStreak: -2, joinedDaysAgo: 56 }),
  
  // ============ 挣扎玩家 (胜率 38-48%) ============
  generateRealisticPlayer('vp-041', '屡败屡战', 7, 267, 47.2, { currentStreak: -5, joinedDaysAgo: 189 }),
  generateRealisticPlayer('vp-042', 'NeverGiveUp', 3, 198, 45.5, { currentStreak: -3, joinedDaysAgo: 134 }),
  generateRealisticPlayer('vp-043', '反向指标王', 6, 312, 43.3, { currentStreak: -7, joinedDaysAgo: 234 }),
  generateRealisticPlayer('vp-044', 'Learning2Bet', 1, 145, 41.4, { currentStreak: -4, joinedDaysAgo: 78 }),
  generateRealisticPlayer('vp-045', '倒霉蛋小明', 8, 223, 39.5, { currentStreak: -6, joinedDaysAgo: 156 }),
  
  // ============ 连黑玩家 (专门用于连黑榜) ============
  generateRealisticPlayer('vp-046', '黑到发光', 2, 178, 28.1, { currentStreak: -11, joinedDaysAgo: 112, worstStreak: 14 }),
  generateRealisticPlayer('vp-047', 'UnluckyBoy', 5, 234, 25.6, { currentStreak: -9, joinedDaysAgo: 167, worstStreak: 12 }),
  generateRealisticPlayer('vp-048', '反买发财', 9, 156, 22.4, { currentStreak: -13, joinedDaysAgo: 89, worstStreak: 16 }),
  generateRealisticPlayer('vp-049', 'AlwaysWrong', 4, 289, 19.7, { currentStreak: -8, joinedDaysAgo: 201, worstStreak: 11 }),
  generateRealisticPlayer('vp-050', '冥灯本灯', 7, 198, 15.2, { currentStreak: -15, joinedDaysAgo: 134, worstStreak: 18 }),
  
  // ============ 新手玩家 (低预测数) ============
  generateRealisticPlayer('vp-051', '刚入坑萌新', 3, 23, 65.2, { currentStreak: 3, joinedDaysAgo: 8 }),
  generateRealisticPlayer('vp-052', 'FirstTimer', 6, 15, 53.3, { currentStreak: 1, joinedDaysAgo: 5 }),
  generateRealisticPlayer('vp-053', '试试水温', 1, 34, 47.1, { currentStreak: -2, joinedDaysAgo: 12 }),
  generateRealisticPlayer('vp-054', 'NewHere2024', 8, 28, 71.4, { currentStreak: 4, joinedDaysAgo: 10 }),
  generateRealisticPlayer('vp-055', '观望中的鱼', 2, 19, 42.1, { currentStreak: -3, joinedDaysAgo: 7 }),
  
  // ============ 回归玩家 (高预测数但最近不活跃) ============
  generateRealisticPlayer('vp-056', '老玩家回归', 5, 456, 61.8, { currentStreak: 2, joinedDaysAgo: 365, todayPredictions: 1 }),
  generateRealisticPlayer('vp-057', 'ReturnKing', 9, 389, 58.4, { currentStreak: -1, joinedDaysAgo: 298, todayPredictions: 0 }),
  generateRealisticPlayer('vp-058', '久违的胜利', 4, 512, 55.3, { currentStreak: 3, joinedDaysAgo: 412, todayPredictions: 2 }),
  
  // ============ 专注特定联赛玩家 ============
  generateRealisticPlayer('vp-059', '英超专精', 7, 234, 72.2, { currentStreak: 5, joinedDaysAgo: 156, isRecommender: true }),
  generateRealisticPlayer('vp-060', 'LaLigaExpert', 3, 198, 70.7, { currentStreak: 3, joinedDaysAgo: 134, allowCopyTrade: true }),
  generateRealisticPlayer('vp-061', '德甲一哥', 6, 267, 69.3, { currentStreak: 4, joinedDaysAgo: 189, isRecommender: true }),
  generateRealisticPlayer('vp-062', 'SerieA_Master', 1, 178, 67.4, { currentStreak: 2, joinedDaysAgo: 112 }),
  generateRealisticPlayer('vp-063', '法甲独行侠', 8, 145, 66.2, { currentStreak: -1, joinedDaysAgo: 89, allowCopyTrade: true }),
  
  // ============ 高频玩家 ============
  generateRealisticPlayer('vp-064', '日夜不停', 2, 678, 59.3, { currentStreak: 1, joinedDaysAgo: 234, todayPredictions: 12 }),
  generateRealisticPlayer('vp-065', 'BetAddicted', 5, 589, 57.6, { currentStreak: -2, joinedDaysAgo: 198, todayPredictions: 9 }),
  generateRealisticPlayer('vp-066', '全勤玩家', 9, 723, 54.8, { currentStreak: 2, joinedDaysAgo: 267, todayPredictions: 11 }),
  
  // ============ 更多多样化玩家 ============
  generateRealisticPlayer('vp-067', 'Lucky_Chen', 4, 189, 63.5, { currentStreak: 2, joinedDaysAgo: 123 }),
  generateRealisticPlayer('vp-068', '大力出奇迹', 7, 234, 58.1, { currentStreak: -3, joinedDaysAgo: 156 }),
  generateRealisticPlayer('vp-069', 'SteadyWin', 3, 145, 67.6, { currentStreak: 4, joinedDaysAgo: 89, allowCopyTrade: true }),
  generateRealisticPlayer('vp-070', '随缘预测', 6, 167, 52.1, { currentStreak: -1, joinedDaysAgo: 98 }),
  generateRealisticPlayer('vp-071', 'DataAnalyst', 1, 298, 65.1, { currentStreak: 3, joinedDaysAgo: 178, isRecommender: true }),
  generateRealisticPlayer('vp-072', '直觉派高手', 8, 212, 61.8, { currentStreak: -2, joinedDaysAgo: 145 }),
  generateRealisticPlayer('vp-073', 'PatternHunter', 2, 178, 59.6, { currentStreak: 1, joinedDaysAgo: 112, allowCopyTrade: true }),
  generateRealisticPlayer('vp-074', '冷门专家', 5, 156, 48.7, { currentStreak: -4, joinedDaysAgo: 89 }),
  generateRealisticPlayer('vp-075', 'RiskTaker', 9, 234, 45.3, { currentStreak: -5, joinedDaysAgo: 167 }),
  generateRealisticPlayer('vp-076', '稳中求胜', 4, 267, 64.4, { currentStreak: 2, joinedDaysAgo: 189, isRecommender: true }),
  generateRealisticPlayer('vp-077', 'ValueBet_Pro', 7, 198, 68.7, { currentStreak: 5, joinedDaysAgo: 134, unlockPrice: 3 }),
  generateRealisticPlayer('vp-078', '大心脏玩家', 3, 145, 55.9, { currentStreak: -2, joinedDaysAgo: 78, allowCopyTrade: true }),
  generateRealisticPlayer('vp-079', 'StatsMaster', 6, 312, 62.5, { currentStreak: 1, joinedDaysAgo: 223 }),
  generateRealisticPlayer('vp-080', '欧冠情报员', 1, 189, 66.1, { currentStreak: 3, joinedDaysAgo: 145, isRecommender: true }),
  
  // ============ 极端案例玩家 ============
  generateRealisticPlayer('vp-081', '神准小哥', 8, 156, 85.3, { currentStreak: 11, joinedDaysAgo: 112, unlockPrice: 10, allowCopyTrade: true, isRecommender: true }),
  generateRealisticPlayer('vp-082', '连胜传奇', 2, 123, 83.7, { currentStreak: 8, joinedDaysAgo: 78, unlockPrice: 8, allowCopyTrade: true }),
  generateRealisticPlayer('vp-083', '超级黑洞', 5, 198, 12.6, { currentStreak: -17, joinedDaysAgo: 156, worstStreak: 21 }),
  generateRealisticPlayer('vp-084', 'InverseGod', 9, 234, 8.5, { currentStreak: -14, joinedDaysAgo: 189, worstStreak: 19 }),
  
  // ============ 中文名玩家补充 ============
  generateRealisticPlayer('vp-085', '足球小将', 4, 167, 61.1, { currentStreak: 2, joinedDaysAgo: 98 }),
  generateRealisticPlayer('vp-086', '绿茵梦想家', 7, 198, 58.6, { currentStreak: -1, joinedDaysAgo: 123, allowCopyTrade: true }),
  generateRealisticPlayer('vp-087', '进球预言师', 3, 234, 64.5, { currentStreak: 3, joinedDaysAgo: 156, isRecommender: true }),
  generateRealisticPlayer('vp-088', '任意球大师', 6, 145, 56.5, { currentStreak: -3, joinedDaysAgo: 78 }),
  generateRealisticPlayer('vp-089', '越位边缘人', 1, 178, 51.7, { currentStreak: 1, joinedDaysAgo: 112 }),
  generateRealisticPlayer('vp-090', '角球统计狂', 8, 212, 59.9, { currentStreak: -2, joinedDaysAgo: 145, allowCopyTrade: true }),
  
  // ============ 英文名玩家补充 ============
  generateRealisticPlayer('vp-091', 'TopScorer_X', 2, 189, 63.0, { currentStreak: 4, joinedDaysAgo: 134 }),
  generateRealisticPlayer('vp-092', 'GoldenBoot', 5, 156, 67.3, { currentStreak: 2, joinedDaysAgo: 89, isRecommender: true }),
  generateRealisticPlayer('vp-093', 'HattrickHero', 9, 267, 60.3, { currentStreak: -1, joinedDaysAgo: 178 }),
  generateRealisticPlayer('vp-094', 'PenaltyKing', 4, 198, 54.5, { currentStreak: -4, joinedDaysAgo: 112, allowCopyTrade: true }),
  generateRealisticPlayer('vp-095', 'FreeKickAce', 7, 145, 62.8, { currentStreak: 3, joinedDaysAgo: 78 }),
  generateRealisticPlayer('vp-096', 'CleanSheet', 3, 223, 58.3, { currentStreak: 1, joinedDaysAgo: 156, isRecommender: true }),
  
  // ============ 特殊状态玩家 ============
  generateRealisticPlayer('vp-097', '沉默的高手', 6, 89, 74.2, { currentStreak: 6, joinedDaysAgo: 45, todayPredictions: 0 }),
  generateRealisticPlayer('vp-098', 'QuietGenius', 1, 67, 71.6, { currentStreak: 4, joinedDaysAgo: 34, todayPredictions: 0 }),
  generateRealisticPlayer('vp-099', '爆发中新星', 8, 45, 77.8, { currentStreak: 7, joinedDaysAgo: 18, allowCopyTrade: true }),
  generateRealisticPlayer('vp-100', 'RisingStar', 2, 56, 73.2, { currentStreak: 5, joinedDaysAgo: 23, isRecommender: true }),
  
  // ============ 更多国际化玩家 ============
  generateRealisticPlayer('vp-101', '东京预测家', 4, 234, 66.8, { currentStreak: 3, joinedDaysAgo: 145, allowCopyTrade: true }),
  generateRealisticPlayer('vp-102', 'SeoulBetKing', 7, 189, 63.5, { currentStreak: -2, joinedDaysAgo: 112 }),
  generateRealisticPlayer('vp-103', '香港马王', 3, 267, 69.4, { currentStreak: 4, joinedDaysAgo: 178, isRecommender: true }),
  generateRealisticPlayer('vp-104', 'SingaporePro', 6, 156, 61.2, { currentStreak: 1, joinedDaysAgo: 89 }),
  generateRealisticPlayer('vp-105', '台北神算', 1, 198, 64.7, { currentStreak: 2, joinedDaysAgo: 134, allowCopyTrade: true }),
  generateRealisticPlayer('vp-106', 'MumbaiMaster', 8, 223, 58.3, { currentStreak: -3, joinedDaysAgo: 156 }),
  generateRealisticPlayer('vp-107', '曼谷高手', 2, 145, 67.1, { currentStreak: 5, joinedDaysAgo: 78, isRecommender: true }),
  generateRealisticPlayer('vp-108', 'DubaiDreamer', 5, 312, 55.6, { currentStreak: -1, joinedDaysAgo: 212 }),
  generateRealisticPlayer('vp-109', '澳门赌神', 9, 178, 71.3, { currentStreak: 6, joinedDaysAgo: 98, unlockPrice: 4, allowCopyTrade: true }),
  generateRealisticPlayer('vp-110', 'LondonLucky', 4, 256, 62.8, { currentStreak: 2, joinedDaysAgo: 167 }),
  
  // ============ 职业风格玩家 ============
  generateRealisticPlayer('vp-111', '数据分析师小王', 7, 345, 65.2, { currentStreak: 1, joinedDaysAgo: 234, isRecommender: true }),
  generateRealisticPlayer('vp-112', 'StatGuru2024', 3, 278, 68.9, { currentStreak: 4, joinedDaysAgo: 189, allowCopyTrade: true }),
  generateRealisticPlayer('vp-113', '概率论玩家', 6, 167, 59.8, { currentStreak: -2, joinedDaysAgo: 112 }),
  generateRealisticPlayer('vp-114', 'OddsCalculator', 1, 234, 63.1, { currentStreak: 3, joinedDaysAgo: 156 }),
  generateRealisticPlayer('vp-115', '期望值猎人', 8, 189, 66.5, { currentStreak: 2, joinedDaysAgo: 134, isRecommender: true }),
  generateRealisticPlayer('vp-116', 'ValueSeeker', 2, 312, 61.7, { currentStreak: -1, joinedDaysAgo: 201 }),
  generateRealisticPlayer('vp-117', '凯利公式爱好者', 5, 145, 57.3, { currentStreak: -4, joinedDaysAgo: 89, allowCopyTrade: true }),
  generateRealisticPlayer('vp-118', 'SharpBettor', 9, 267, 69.2, { currentStreak: 5, joinedDaysAgo: 178, unlockPrice: 3 }),
  
  // ============ 特殊风格玩家 ============
  generateRealisticPlayer('vp-119', '主场专家', 4, 198, 64.4, { currentStreak: 2, joinedDaysAgo: 123 }),
  generateRealisticPlayer('vp-120', 'UnderdogHunter', 7, 234, 52.3, { currentStreak: -3, joinedDaysAgo: 167 }),
  generateRealisticPlayer('vp-121', '大小球玩家', 3, 156, 67.8, { currentStreak: 4, joinedDaysAgo: 89, isRecommender: true }),
  generateRealisticPlayer('vp-122', 'DrawSpecialist', 6, 189, 55.6, { currentStreak: 1, joinedDaysAgo: 112, allowCopyTrade: true }),
  generateRealisticPlayer('vp-123', '让球专家', 1, 278, 63.9, { currentStreak: 3, joinedDaysAgo: 178 }),
  generateRealisticPlayer('vp-124', 'LiveBetKing', 8, 145, 58.9, { currentStreak: -2, joinedDaysAgo: 78 }),
  generateRealisticPlayer('vp-125', '角球分析师', 2, 212, 61.3, { currentStreak: 2, joinedDaysAgo: 145, isRecommender: true }),
  generateRealisticPlayer('vp-126', 'CardCounter', 5, 167, 54.7, { currentStreak: -1, joinedDaysAgo: 98 }),
  
  // ============ 新一批活跃玩家 ============
  generateRealisticPlayer('vp-127', '周末战神', 9, 89, 72.5, { currentStreak: 6, joinedDaysAgo: 45, allowCopyTrade: true }),
  generateRealisticPlayer('vp-128', 'MidweekMaster', 4, 123, 65.8, { currentStreak: 3, joinedDaysAgo: 67 }),
  generateRealisticPlayer('vp-129', '午夜预测人', 7, 156, 59.2, { currentStreak: -2, joinedDaysAgo: 89 }),
  generateRealisticPlayer('vp-130', 'EarlyBird', 3, 178, 63.4, { currentStreak: 4, joinedDaysAgo: 112, isRecommender: true }),
  generateRealisticPlayer('vp-131', '欧洲联赛通', 6, 234, 67.3, { currentStreak: 2, joinedDaysAgo: 156, allowCopyTrade: true }),
  generateRealisticPlayer('vp-132', 'AsianHandicap', 1, 189, 61.8, { currentStreak: 1, joinedDaysAgo: 134 }),
  generateRealisticPlayer('vp-133', '南美专家', 8, 145, 58.5, { currentStreak: -3, joinedDaysAgo: 89 }),
  generateRealisticPlayer('vp-134', 'MLSWatcher', 2, 167, 55.1, { currentStreak: -1, joinedDaysAgo: 98 }),
  
  // ============ 更多胜率极端玩家 ============
  generateRealisticPlayer('vp-135', '常胜将军', 5, 134, 81.2, { currentStreak: 8, joinedDaysAgo: 78, unlockPrice: 7, allowCopyTrade: true, isRecommender: true }),
  generateRealisticPlayer('vp-136', 'PerfectPicks', 9, 98, 79.6, { currentStreak: 7, joinedDaysAgo: 56, unlockPrice: 6 }),
  generateRealisticPlayer('vp-137', '连胜狂魔', 4, 156, 76.9, { currentStreak: 9, joinedDaysAgo: 89, unlockPrice: 5, allowCopyTrade: true }),
  generateRealisticPlayer('vp-138', 'GoldTouch', 7, 112, 74.1, { currentStreak: 5, joinedDaysAgo: 67 }),
  generateRealisticPlayer('vp-139', '永不止损', 3, 234, 33.7, { currentStreak: -8, joinedDaysAgo: 178, worstStreak: 13 }),
  generateRealisticPlayer('vp-140', 'AlwaysLosing', 6, 189, 27.5, { currentStreak: -10, joinedDaysAgo: 145, worstStreak: 15 }),
  
  // ============ 社区活跃玩家 ============
  generateRealisticPlayer('vp-141', '论坛大神', 1, 312, 64.5, { currentStreak: 3, joinedDaysAgo: 234, isRecommender: true }),
  generateRealisticPlayer('vp-142', 'DiscordPro', 8, 267, 62.1, { currentStreak: 2, joinedDaysAgo: 189, allowCopyTrade: true }),
  generateRealisticPlayer('vp-143', '群主推荐', 2, 198, 66.7, { currentStreak: 4, joinedDaysAgo: 156, isRecommender: true }),
  generateRealisticPlayer('vp-144', 'TelegramTips', 5, 145, 59.3, { currentStreak: -1, joinedDaysAgo: 112 }),
  generateRealisticPlayer('vp-145', '直播间常客', 9, 178, 57.8, { currentStreak: 1, joinedDaysAgo: 134 }),
  generateRealisticPlayer('vp-146', 'YouTubeBet', 4, 223, 61.5, { currentStreak: -2, joinedDaysAgo: 167, allowCopyTrade: true }),
  
  // ============ 联赛专项玩家补充 ============
  generateRealisticPlayer('vp-147', '中超观察', 7, 167, 58.2, { currentStreak: 2, joinedDaysAgo: 98 }),
  generateRealisticPlayer('vp-148', 'J联赛通', 3, 189, 63.8, { currentStreak: 3, joinedDaysAgo: 123, isRecommender: true }),
  generateRealisticPlayer('vp-149', 'K联赛专家', 6, 145, 60.4, { currentStreak: -1, joinedDaysAgo: 89 }),
  generateRealisticPlayer('vp-150', '荷甲分析师', 1, 212, 65.9, { currentStreak: 4, joinedDaysAgo: 145, allowCopyTrade: true }),
];

// 导出一些有用的统计函数
export const getTopPlayersByWinRate = (count: number = 10) => 
  [...virtualPlayers].sort((a, b) => b.winRate - a.winRate).slice(0, count);

export const getTopPlayersByProfit = (count: number = 10) => 
  [...virtualPlayers].sort((a, b) => b.profit - a.profit).slice(0, count);

export const getHotStreakPlayers = (count: number = 10) => 
  [...virtualPlayers]
    .filter(p => (p.currentStreak ?? 0) > 0)
    .sort((a, b) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0))
    .slice(0, count);

export const getColdStreakPlayers = (count: number = 10) => 
  [...virtualPlayers]
    .filter(p => (p.currentStreak ?? 0) < 0)
    .sort((a, b) => (a.currentStreak ?? 0) - (b.currentStreak ?? 0))
    .slice(0, count);

export const getWorstStreakPlayers = (count: number = 10) => 
  [...virtualPlayers]
    .sort((a, b) => (b.worstStreak ?? 0) - (a.worstStreak ?? 0))
    .slice(0, count);

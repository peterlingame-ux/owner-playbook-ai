// 跟单者数据 - 这些玩家通过跟单推荐榜的玩家来下注
// 他们的连红/连黑反映跟单的运气好坏

export interface CopyTrader {
  id: string;
  displayName: string;
  avatarUrl: string;
  totalCopyTrades: number; // 总跟单次数
  correctCopyTrades: number; // 跟单正确次数
  winRate: number;
  balance: number;
  profit: number;
  changePercent: number;
  currentStreak: number; // 正数为连红，负数为连黑
  bestStreak: number; // 最佳连红
  worstStreak: number; // 最差连黑
  todayCopyTrades: number; // 今日跟单次数
  todayCorrect: number; // 今日正确次数
  joinedDaysAgo: number;
  followedRecommenders: string[]; // 跟单过的推荐者ID列表
  lastCopyTradeResult?: 'win' | 'loss' | 'pending';
}

// 推荐者ID映射到名称（用于显示）
export const recommenderNames: Record<string, string> = {
  'vp-001': '球王小李',
  'vp-002': 'PredictorMax',
  'vp-003': '足彩老司机',
  'vp-004': 'GoalHunter99',
  'vp-005': '大数据预测王',
  'vp-008': 'BetMaster_CN',
  'vp-011': '五大联赛专家',
  'vp-015': '黄金左脚',
  'vp-020': 'DataDriven',
  'vp-026': 'SmartBet',
  'vp-059': '英超专精',
  'vp-061': '德甲一哥',
  'vp-071': 'DataAnalyst',
  'vp-076': '稳中求胜',
  'vp-080': '欧冠情报员',
  'vp-081': '神准小哥',
  'vp-087': '进球预言师',
  'vp-092': 'GoldenBoot',
  'vp-096': 'CleanSheet',
  'vp-100': 'RisingStar',
};

// 生成跟单者数据
const generateCopyTrader = (
  id: string,
  displayName: string,
  avatarNum: number,
  totalCopyTrades: number,
  winRate: number,
  options: {
    currentStreak: number;
    joinedDaysAgo?: number;
    followedRecommenders?: string[];
    todayCopyTrades?: number;
    worstStreak?: number;
    bestStreak?: number;
  }
): CopyTrader => {
  const correctCopyTrades = Math.round(totalCopyTrades * winRate / 100);
  
  const avgBet = 150 + Math.random() * 350;
  const avgOdds = 1.85;
  const grossWin = correctCopyTrades * avgBet * (avgOdds - 1);
  const grossLoss = (totalCopyTrades - correctCopyTrades) * avgBet;
  const profit = Math.round(grossWin - grossLoss);
  
  const initialBalance = 10000;
  const balance = Math.max(500, initialBalance + profit);
  const changePercent = Math.round((profit / initialBalance) * 1000) / 10;
  
  const bestStreak = options.bestStreak ?? Math.max(2, Math.round(winRate / 12 + Math.random() * 3));
  const worstStreak = options.worstStreak ?? Math.max(2, Math.round((100 - winRate) / 15 + Math.random() * 2));
  
  const todayCopyTrades = options.todayCopyTrades ?? Math.floor(Math.random() * 6);
  const todayCorrect = Math.round(todayCopyTrades * (winRate / 100) * (0.6 + Math.random() * 0.8));
  
  // 随机选择跟单过的推荐者
  const recommenderIds = Object.keys(recommenderNames);
  const followedRecommenders = options.followedRecommenders ?? 
    recommenderIds
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 4));
  
  return {
    id,
    displayName,
    avatarUrl: `/avatars/avatar-${avatarNum}.png`,
    totalCopyTrades,
    correctCopyTrades,
    winRate,
    balance,
    profit,
    changePercent,
    currentStreak: options.currentStreak,
    bestStreak,
    worstStreak,
    todayCopyTrades,
    todayCorrect,
    joinedDaysAgo: options.joinedDaysAgo ?? Math.floor(Math.random() * 120) + 1,
    followedRecommenders,
    lastCopyTradeResult: options.currentStreak > 0 ? 'win' : options.currentStreak < 0 ? 'loss' : 'pending',
  };
};

export const copyTraders: CopyTrader[] = [
  // ============ 连红榜玩家（运气好的跟单者）============
  // 这些玩家通过跟单推荐榜的高手，连续获胜
  generateCopyTrader('ct-001', '跟单小王子', 3, 156, 78.2, { 
    currentStreak: 12, 
    joinedDaysAgo: 45,
    followedRecommenders: ['vp-001', 'vp-081', 'vp-002'],
    todayCopyTrades: 5,
    bestStreak: 12,
  }),
  generateCopyTrader('ct-002', 'CopyMaster', 7, 234, 75.6, { 
    currentStreak: 9, 
    joinedDaysAgo: 78,
    followedRecommenders: ['vp-003', 'vp-005', 'vp-059'],
    todayCopyTrades: 4,
    bestStreak: 11,
  }),
  generateCopyTrader('ct-003', '幸运跟单王', 1, 189, 72.5, { 
    currentStreak: 8, 
    joinedDaysAgo: 56,
    followedRecommenders: ['vp-081', 'vp-001', 'vp-092'],
    todayCopyTrades: 6,
    bestStreak: 9,
  }),
  generateCopyTrader('ct-004', 'LuckyFollower', 5, 167, 71.3, { 
    currentStreak: 7, 
    joinedDaysAgo: 89,
    followedRecommenders: ['vp-002', 'vp-015', 'vp-071'],
    todayCopyTrades: 3,
    bestStreak: 8,
  }),
  generateCopyTrader('ct-005', '神选之人', 9, 145, 69.7, { 
    currentStreak: 6, 
    joinedDaysAgo: 34,
    followedRecommenders: ['vp-005', 'vp-061', 'vp-080'],
    todayCopyTrades: 4,
    bestStreak: 7,
  }),
  generateCopyTrader('ct-006', 'WinStreak_Pro', 2, 198, 68.2, { 
    currentStreak: 6, 
    joinedDaysAgo: 67,
    followedRecommenders: ['vp-059', 'vp-003', 'vp-087'],
    todayCopyTrades: 5,
    bestStreak: 8,
  }),
  generateCopyTrader('ct-007', '连红达人', 4, 178, 67.4, { 
    currentStreak: 5, 
    joinedDaysAgo: 112,
    followedRecommenders: ['vp-008', 'vp-076', 'vp-100'],
    todayCopyTrades: 4,
    bestStreak: 7,
  }),
  generateCopyTrader('ct-008', 'RedHotStreak', 8, 156, 66.7, { 
    currentStreak: 5, 
    joinedDaysAgo: 45,
    followedRecommenders: ['vp-011', 'vp-020', 'vp-096'],
    todayCopyTrades: 3,
    bestStreak: 6,
  }),
  generateCopyTrader('ct-009', '火热跟单', 6, 134, 65.7, { 
    currentStreak: 4, 
    joinedDaysAgo: 78,
    followedRecommenders: ['vp-026', 'vp-001', 'vp-059'],
    todayCopyTrades: 4,
    bestStreak: 6,
  }),
  generateCopyTrader('ct-010', 'FollowTheWin', 3, 189, 64.6, { 
    currentStreak: 4, 
    joinedDaysAgo: 98,
    followedRecommenders: ['vp-071', 'vp-087', 'vp-002'],
    todayCopyTrades: 5,
    bestStreak: 5,
  }),
  
  // ============ 连黑榜玩家（运气差的跟单者）============
  // 这些玩家虽然跟单了推荐榜的人，但运气不好连续失败
  generateCopyTrader('ct-101', '黑到怀疑人生', 2, 178, 32.6, { 
    currentStreak: -11, 
    joinedDaysAgo: 89,
    followedRecommenders: ['vp-026', 'vp-020', 'vp-011'],
    todayCopyTrades: 4,
    worstStreak: 14,
  }),
  generateCopyTrader('ct-102', 'UnluckyTrader', 5, 234, 28.2, { 
    currentStreak: -9, 
    joinedDaysAgo: 134,
    followedRecommenders: ['vp-008', 'vp-076', 'vp-015'],
    todayCopyTrades: 5,
    worstStreak: 12,
  }),
  generateCopyTrader('ct-103', '反向财神', 9, 167, 25.7, { 
    currentStreak: -8, 
    joinedDaysAgo: 67,
    followedRecommenders: ['vp-003', 'vp-061', 'vp-096'],
    todayCopyTrades: 3,
    worstStreak: 11,
  }),
  generateCopyTrader('ct-104', 'DarkLuck', 4, 145, 31.0, { 
    currentStreak: -7, 
    joinedDaysAgo: 112,
    followedRecommenders: ['vp-071', 'vp-092', 'vp-100'],
    todayCopyTrades: 4,
    worstStreak: 9,
  }),
  generateCopyTrader('ct-105', '倒霉跟单侠', 7, 198, 35.4, { 
    currentStreak: -7, 
    joinedDaysAgo: 78,
    followedRecommenders: ['vp-002', 'vp-005', 'vp-087'],
    todayCopyTrades: 6,
    worstStreak: 10,
  }),
  generateCopyTrader('ct-106', 'BadTimingBet', 1, 156, 38.5, { 
    currentStreak: -6, 
    joinedDaysAgo: 45,
    followedRecommenders: ['vp-059', 'vp-080', 'vp-001'],
    todayCopyTrades: 3,
    worstStreak: 8,
  }),
  generateCopyTrader('ct-107', '选择困难症', 8, 189, 41.3, { 
    currentStreak: -6, 
    joinedDaysAgo: 98,
    followedRecommenders: ['vp-011', 'vp-026', 'vp-015'],
    todayCopyTrades: 4,
    worstStreak: 7,
  }),
  generateCopyTrader('ct-108', 'WrongPick', 3, 134, 39.6, { 
    currentStreak: -5, 
    joinedDaysAgo: 56,
    followedRecommenders: ['vp-081', 'vp-003', 'vp-071'],
    todayCopyTrades: 5,
    worstStreak: 8,
  }),
  generateCopyTrader('ct-109', '运气差王', 6, 167, 42.5, { 
    currentStreak: -5, 
    joinedDaysAgo: 123,
    followedRecommenders: ['vp-020', 'vp-076', 'vp-092'],
    todayCopyTrades: 4,
    worstStreak: 6,
  }),
  generateCopyTrader('ct-110', 'MissedOpportunity', 2, 145, 44.1, { 
    currentStreak: -4, 
    joinedDaysAgo: 67,
    followedRecommenders: ['vp-008', 'vp-061', 'vp-100'],
    todayCopyTrades: 3,
    worstStreak: 5,
  }),
  
  // ============ 更多中等跟单者（混合表现）============
  generateCopyTrader('ct-201', '稳健跟单', 4, 212, 58.5, { 
    currentStreak: 3, 
    joinedDaysAgo: 145,
    followedRecommenders: ['vp-001', 'vp-005', 'vp-059'],
    todayCopyTrades: 4,
  }),
  generateCopyTrader('ct-202', 'SmartCopier', 7, 178, 55.6, { 
    currentStreak: -2, 
    joinedDaysAgo: 89,
    followedRecommenders: ['vp-002', 'vp-011', 'vp-076'],
    todayCopyTrades: 3,
  }),
  generateCopyTrader('ct-203', '谨慎投注者', 1, 156, 52.6, { 
    currentStreak: 2, 
    joinedDaysAgo: 67,
    followedRecommenders: ['vp-003', 'vp-081', 'vp-087'],
    todayCopyTrades: 5,
  }),
  generateCopyTrader('ct-204', 'CarefulBetter', 9, 189, 51.3, { 
    currentStreak: -3, 
    joinedDaysAgo: 112,
    followedRecommenders: ['vp-015', 'vp-071', 'vp-092'],
    todayCopyTrades: 4,
  }),
  generateCopyTrader('ct-205', '佛系跟单', 5, 134, 48.5, { 
    currentStreak: 1, 
    joinedDaysAgo: 34,
    followedRecommenders: ['vp-020', 'vp-061', 'vp-096'],
    todayCopyTrades: 2,
  }),
];

// 获取连红榜（按currentStreak正数排序）
export const getHotCopyTraders = (count: number = 10): CopyTrader[] => 
  [...copyTraders]
    .filter(t => t.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, count);

// 获取连黑榜（按currentStreak负数排序）
export const getColdCopyTraders = (count: number = 10): CopyTrader[] => 
  [...copyTraders]
    .filter(t => t.currentStreak < 0)
    .sort((a, b) => a.currentStreak - b.currentStreak)
    .slice(0, count);

// 获取跟单者跟单的推荐者名称
export const getFollowedRecommenderNames = (trader: CopyTrader): string[] => 
  trader.followedRecommenders.map(id => recommenderNames[id] || id);

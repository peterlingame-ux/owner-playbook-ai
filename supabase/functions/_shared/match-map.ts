export interface LeagueMeta {
  english: string[];
  country?: string;
  id?: number;
}

export type LeagueDictionary = Record<string, LeagueMeta>;

export const MATCH_LEAGUE_MAP: LeagueDictionary = {
  // "世界杯欧洲预选赛": {
  //   english: ["WC Qualification Europe"],有问题
  // },
  "欧洲足球锦标赛": {
    english: ["Euro Championship"],
    id: 4,
  },
  "欧洲国家联赛": {
    english: ["UEFA Nations League"],
    id: 5,
  },
  "欧洲冠军联赛": {
    english: ["UEFA Champions League"],
    id: 2,
  },
  "欧足联欧洲联赛": {
    english: ["UEFA Europa League"],
    id: 3,
  },
  "欧足联欧洲协会联赛": {
    english: ["UEFA Europa Conference League"],
    id: 848,
  },
  "欧洲超级杯": {
    english: ["UEFA Super Cup"],
    id: 531,
  },
  "英格兰超级联赛": {
    english: ["Premier League"],
    id: 39,
  },
  "英格兰冠军联赛": {
    english: ["Championship"],
    id: 40,
  },
  "英格兰乙级联赛": {
    english: ["League Two"],
    id: 42,
  },
  "意大利甲级联赛": {
    english: ["Serie A"],
    id: 135,
  },
  "意大利乙级联赛": {
    english: ["Serie B"],
    id: 136,
  },
  "意大利杯": {
    english: ["Coppa Italia"],
    id: 137,
  },
  "葡萄牙超级联赛": {
    english: ["Primeira Liga"],
    id: 94,
  },
  "葡萄牙甲级联赛": {
    english: ["Segunda Liga"],
    id: 95,
  },
  "葡萄牙乙级联赛": {
    english: ["Liga 3"],
    id: 865,
  },
  "德国甲级联赛": {
    english: ["Bundesliga"],
    id: 78,
  },
  "德国乙级联赛": {
    english: ["2. Bundesliga"],
    id: 79,
  },
  "德国杯": {
    english: ["DFB Pokal"],
    id: 81,
  },
  "西班牙甲级联赛": {
    english: ["La Liga"],
    id: 140,
  },
  "西班牙乙级联赛": {
    english: ["Segunda División"],
    id: 141,
  },
  "法国甲级联赛": {
    english: ["Ligue 1"],
    id: 61,
  },
  "法国乙级联赛": {
    english: ["Ligue 2"],
    id: 62,
  },
  "法国杯": {
    english: ["Coupe de France"],
    id: 66,
  },
  "冰岛超级联赛": {
    english: ["Úrvalsdeild"],
    id: 164,
  },
  "苏格兰超级联赛": {
    english: ["Premiership"],
    id: 179,
  },
  "俄罗斯超级联赛": {
    english: ["Premier League"],
    id: 235,
  },
  "比利时甲级联赛": {
    english: ["Jupiler Pro League"],
    id: 144,
  },
  "乌克兰超级联赛": {
    english: ["Premier League"],
    id: 333,
  },
  "土耳其超级联赛": {
    english: ["Süper Lig"],
    id: 203,
  },
  "土耳其甲级联赛": {
    english: ["1. Lig"],
    id: 204,
  },
  "荷兰甲级联赛": {
    english: ["Eredivisie"],
    id: 88,
  },
  "荷兰乙级联赛": {
    english: ["Eerste Divisie"],
    id: 89,
  },
  "奥地利甲级联赛": {
    english: ["Bundesliga"],
    id: 218,
  },
  // "瑞士甲级联赛": {
  //   english: ["Challenge League"],有问题
  // },
  "瑞士超级联赛": {
    english: ["Super League"],
    id: 207,
  },
  "丹麦超级联赛": {
    english: ["Superliga"],
    id: 119,
  },
  "丹麦甲级联赛": {
    english: ["1. Division"],
    id: 120,
  },
  "瑞典超级联赛": {
    english: ["Allsvenskan"],
    id: 113,
  },
  "瑞典超甲联赛": {
    english: ["Superettan"],
    id: 114,
  },
  "波兰甲级联赛": {
    english: ["Ekstraklasa"],
    id: 106,
  },
  "爱尔兰超级联赛": {
    english: ["Premier Division"],
    id: 357,
  },
  "希腊超级联赛": {
    english: ["Super League 1"],
    id: 197,
  },
  "芬兰超级联赛": {
    english: ["Veikkausliiga"],
    id: 244,
  },
  // "芬兰甲级联赛": {
  //   english: ["Ykkonen"],有问题
  // },
  "挪威超级联赛": {
    english: ["Eliteserien"],
    id: 103,
  },
  "罗马尼亚甲级联赛": {
    english: ["Liga I"],
    id: 283,
  },
  "以色列超级联赛": {
    english: ["Ligat Ha'al"],
    id: 383,
  },
  "亚冠二级联赛": {
    english: ["AFC Cup"],
    id: 18,
  },
  "亚足联冠军联赛": {
    english: ["AFC Champions League"],
    id: 17,
  },
  // "世界杯亚洲区预选赛": {
  //   english: ["WC Qualification Asia"],有问题
  // },
  "中国足球超级联赛": {
    english: ["Super League"],
    id: 169,
  },
  "中国足球甲级联赛": {
    english: ["League One"],
    id: 170,
  },
  // "江苏省城市足球联赛": {
  //   english: ["Jiangsu City Football League"],有问题
  // },
  "日本甲级联赛": {
    english: ["J1 League"],
    id: 98,
  },
  "日本乙级联赛": {
    english: ["J2 League"],
    id: 99,
  },
  "日本足球联赛": {
    english: ["Japan Football League"],
    id: 497,
  },
  "澳大利亚足球超级联赛": {
    english: ["A-League"],
    id: 188,
  },
  "韩国职业甲级联赛K1": {
    english: ["K League 1"],
    id: 292,
  },
  "韩国职业乙级联赛K2": {
    english: ["K League 2"],
    id: 293,
  },
  "沙特阿拉伯超级联赛": {
    english: ["Pro League"],
    id: 307,
  },
  // "阿联酋超级联赛": {
  //   english: ["UAE Pro League"],有问题
  // },
  "阿根廷甲级联赛": {
    english: ["Liga Profesional Argentina"],
    id: 128,
  },
  "智利甲级联赛": {
    english: ["Primera División"],
    id: 265,
  },
  "巴西甲级联赛": {
    english: ["Serie A"],
    id: 71,
  },
  "美国职业大联盟联赛": {
    english: ["Major League Soccer"],
    id: 253,
  },
  "墨西哥超级联赛": {
    english: ["Liga MX"],
    id: 262,
  },
  "埃及超级联赛": {
    english: ["Premier League"],
    id: 233,
  },
};

export interface LeagueInfo {
  name: string;
  country?: string;
  id?: number;
}

export const buildLeagueLookup = () => {
  const lookup = new Map<string, LeagueInfo>();
  // 同时创建按ID索引的查找表
  const idLookup = new Map<number, LeagueInfo>();
  // 创建只包含英文名的查找表（用于英文名+ID匹配）
  const englishNameLookup = new Map<string, LeagueInfo>();

  for (const [chineseName, meta] of Object.entries(MATCH_LEAGUE_MAP)) {
    const info: LeagueInfo = {
      name: chineseName,
      country: meta.country,
      id: meta.id,
    };

    // 全量查找表（包含中文名和英文名）
    lookup.set(chineseName.toLowerCase(), info);

    // 英文名查找表（只包含英文名，不包括中文名）
    for (const alias of meta.english) {
      const englishKey = alias.toLowerCase();
      lookup.set(englishKey, info);
      englishNameLookup.set(englishKey, info);
    }

    // 如果有 ID，也添加到 ID 查找表中
    if (meta.id) {
      idLookup.set(meta.id, info);
    }
  }

  return { nameLookup: lookup, idLookup, englishNameLookup };
};


export interface LeagueMeta {
  english: string[];
  country?: string;
}

export type LeagueDictionary = Record<string, LeagueMeta>;

export const MATCH_LEAGUE_MAP: LeagueDictionary = {
  "世界杯欧洲预选赛": {
    english: ["World Cup - Qualification Europe"],
  },
  "欧洲足球锦标赛": {
    english: ["Euro Championship"],
  },
  "欧洲国家联赛": {
    english: ["UEFA Nations League"],
  },
  "欧洲冠军联赛": {
    english: ["UEFA Champions League"],
  },
  "欧足联欧洲联赛": {
    english: ["UEFA Europa League"],
  },
  "欧足联欧洲协会联赛": {
    english: ["UEFA Europa Conference League"],
  },
  "欧洲超级杯": {
    english: ["UEFA Super Cup"],
  },
  "英格兰超级联赛": {
    english: ["Premier League"],
  },
  "英格兰冠军联赛": {
    english: ["Championship"],
  },
  "英格兰乙级联赛": {
    english: ["League One"],
  },
  "意大利甲级联赛": {
    english: ["Serie A"],
  },
  "意大利乙级联赛": {
    english: ["Serie B"],
  },
  "意大利杯": {
    english: ["Coppa Italia"],
  },
  "葡萄牙超级联赛": {
    english: ["Primeira Liga"],
  },
  "葡萄牙甲级联赛": {
    english: ["Liga Portugal 2"],
  },
  "葡萄牙乙级联赛": {
    english: ["Liga 3"],
  },
  "德国甲级联赛": {
    english: ["Bundesliga 1", "Bundesliga"],
  },
  "德国乙级联赛": {
    english: ["Bundesliga 2", "2. Bundesliga"],
  },
  "德国杯": {
    english: ["DFB Pokal"],
  },
  "西班牙甲级联赛": {
    english: ["La Liga", "Spain - Primera Division"],
  },
  "西班牙乙级联赛": {
    english: ["Segunda Division"],
  },
  "法国甲级联赛": {
    english: ["Ligue 1"],
  },
  "法国乙级联赛": {
    english: ["Ligue 2"],
  },
  "法国杯": {
    english: ["Coupe de France"],
  },
  "冰岛超级联赛": {
    english: ["Úrvalsdeild", "Iceland - Premier"],
  },
  "苏格兰超级联赛": {
    english: ["Premiership"],
    country: "Scotland",
  },
  "俄罗斯超级联赛": {
    english: ["Premier League"],
    country: "Russia",
  },
  "比利时甲级联赛": {
    english: ["Jupiler Pro League"],
  },
  "乌克兰超级联赛": {
    english: ["Premier League"],
    country: "Ukraine",
  },
  "土耳其超级联赛": {
    english: ["Süper Lig"],
  },
  "土耳其杯": {
    english: ["Turkish Cup", "Cup"],
    country: "Turkey",
  },
  "荷兰甲级联赛": {
    english: ["Eredivisie"],
  },
  "荷兰乙级联赛": {
    english: ["Eerste Divisie", "Keuken Kampioen Divisie"],
  },
  "奥地利甲级联赛": {
    english: ["Bundesliga"],
    country: "Austria",
  },
  "瑞士甲级联赛": {
    english: ["Challenge League"],
  },
  "瑞士超级联赛": {
    english: ["Super League"],
  },
  "丹麦超级联赛": {
    english: ["Superliga", "Denmark - Superliga"],
  },
  "丹麦甲级联赛": {
    english: ["1st Division", "1. Division"],
  },
  "瑞典超级联赛": {
    english: ["Allsvenskan"],
  },
  "瑞典超甲联赛": {
    english: ["Superettan"],
  },
  "波兰甲级联赛": {
    english: ["Ekstraklasa"],
  },
  "爱尔兰超级联赛": {
    english: ["Premier Division"],
    country: "Ireland",
  },
  "希腊超级联赛": {
    english: ["Super League 1", "Super League Greece"],
  },
  "芬兰超级联赛": {
    english: ["Veikkausliiga"],
  },
  "芬兰甲级联赛": {
    english: ["Ykkonen", "Finland - Ykkonen"],
  },
  "挪威超级联赛": {
    english: ["Eliteserien"],
  },
  "罗马尼亚甲级联赛": {
    english: ["Liga I", "Romania - Liga I"],
  },
  "以色列超级联赛": {
    english: ["Ligat Ha'al"],
  },
  "亚冠二级联赛": {
    english: ["AFC Cup"],
  },
  "亚足联冠军联赛": {
    english: ["AFC Champions League"],
  },
  "世界杯亚洲区预选赛": {
    english: ["World Cup Qualification Asia"],
  },
  "中国足球超级联赛": {
    english: ["Super League"],
    country: "China",
  },
  "中国足球甲级联赛": {
    english: ["League One"],
    country: "China",
  },
  "江苏省城市足球联赛": {
    english: ["Jiangsu City FOOTBALL LEAGUE"],
  },
  "日本甲级联赛": {
    english: ["J1 League"],
  },
  "日本乙级联赛": {
    english: ["J2 League"],
  },
  "日本足球联赛": {
    english: ["Japan Football League", "Japan - Japan Football League"],
  },
  "澳大利亚足球超级联赛": {
    english: ["A-League", "Australia - A-League"],
  },
  "韩国职业甲级联赛K1": {
    english: ["K League 1"],
  },
  "韩国职业乙级联赛K2": {
    english: ["K League 2"],
  },
  "沙特阿拉伯超级联赛": {
    english: ["Pro League", "Saudi Arabia - Pro League"],
  },
  "阿联酋超级联赛": {
    english: ["UAE - Pro League", "United Arab Emirates - Pro League"],
  },
  "阿根廷甲级联赛": {
    english: ["Liga Profesional Argentina"],
  },
  "智利甲级联赛": {
    english: ["Primera División", "Chile - Primera División"],
  },
  "巴西甲级联赛": {
    english: ["Serie A", "Brazil - Serie A"],
  },
  "美国职业大联盟联赛": {
    english: ["Major League Soccer", "USA - Major League Soccer"],
  },
  "墨西哥超级联赛": {
    english: ["Liga MX", "Mexico - Liga MX"],
  },
  "埃及超级联赛": {
    english: ["Egypt - Premier League"],
  },
};

export interface LeagueInfo {
  name: string;
  country?: string;
}

export const buildLeagueLookup = () => {
  const lookup = new Map<string, LeagueInfo>();

  for (const [chineseName, meta] of Object.entries(MATCH_LEAGUE_MAP)) {
    const info: LeagueInfo = {
      name: chineseName,
      country: meta.country,
    };

    lookup.set(chineseName.toLowerCase(), info);

    for (const alias of meta.english) {
      lookup.set(alias.toLowerCase(), info);
    }
  }

  return lookup;
};


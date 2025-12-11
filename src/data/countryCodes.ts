// 常见国家/地区电话区号
export interface CountryCode {
  code: string;
  country: {
    en: string;
    zh: string;
    ko: string;
  };
  flag: string;
}

export const countryCodes: CountryCode[] = [
  // 亚洲
  { code: "+86", country: { en: "China", zh: "中国", ko: "중국" }, flag: "🇨🇳" },
  { code: "+852", country: { en: "Hong Kong", zh: "香港", ko: "홍콩" }, flag: "🇭🇰" },
  { code: "+853", country: { en: "Macau", zh: "澳门", ko: "마카오" }, flag: "🇲🇴" },
  { code: "+886", country: { en: "Taiwan", zh: "台湾", ko: "대만" }, flag: "🇹🇼" },
  { code: "+81", country: { en: "Japan", zh: "日本", ko: "일본" }, flag: "🇯🇵" },
  { code: "+82", country: { en: "South Korea", zh: "韩国", ko: "한국" }, flag: "🇰🇷" },
  { code: "+65", country: { en: "Singapore", zh: "新加坡", ko: "싱가포르" }, flag: "🇸🇬" },
  { code: "+60", country: { en: "Malaysia", zh: "马来西亚", ko: "말레이시아" }, flag: "🇲🇾" },
  { code: "+66", country: { en: "Thailand", zh: "泰国", ko: "태국" }, flag: "🇹🇭" },
  { code: "+84", country: { en: "Vietnam", zh: "越南", ko: "베트남" }, flag: "🇻🇳" },
  { code: "+63", country: { en: "Philippines", zh: "菲律宾", ko: "필리핀" }, flag: "🇵🇭" },
  { code: "+62", country: { en: "Indonesia", zh: "印度尼西亚", ko: "인도네시아" }, flag: "🇮🇩" },
  { code: "+91", country: { en: "India", zh: "印度", ko: "인도" }, flag: "🇮🇳" },
  { code: "+92", country: { en: "Pakistan", zh: "巴基斯坦", ko: "파키스탄" }, flag: "🇵🇰" },
  { code: "+880", country: { en: "Bangladesh", zh: "孟加拉国", ko: "방글라데시" }, flag: "🇧🇩" },
  { code: "+94", country: { en: "Sri Lanka", zh: "斯里兰卡", ko: "스리랑카" }, flag: "🇱🇰" },
  { code: "+95", country: { en: "Myanmar", zh: "缅甸", ko: "미얀마" }, flag: "🇲🇲" },
  { code: "+855", country: { en: "Cambodia", zh: "柬埔寨", ko: "캄보디아" }, flag: "🇰🇭" },
  { code: "+856", country: { en: "Laos", zh: "老挝", ko: "라오스" }, flag: "🇱🇦" },
  { code: "+977", country: { en: "Nepal", zh: "尼泊尔", ko: "네팔" }, flag: "🇳🇵" },
  { code: "+971", country: { en: "UAE", zh: "阿联酋", ko: "아랍에미리트" }, flag: "🇦🇪" },
  { code: "+966", country: { en: "Saudi Arabia", zh: "沙特阿拉伯", ko: "사우디아라비아" }, flag: "🇸🇦" },
  { code: "+972", country: { en: "Israel", zh: "以色列", ko: "이스라엘" }, flag: "🇮🇱" },
  { code: "+90", country: { en: "Turkey", zh: "土耳其", ko: "터키" }, flag: "🇹🇷" },
  { code: "+98", country: { en: "Iran", zh: "伊朗", ko: "이란" }, flag: "🇮🇷" },
  { code: "+964", country: { en: "Iraq", zh: "伊拉克", ko: "이라크" }, flag: "🇮🇶" },
  { code: "+974", country: { en: "Qatar", zh: "卡塔尔", ko: "카타르" }, flag: "🇶🇦" },
  { code: "+973", country: { en: "Bahrain", zh: "巴林", ko: "바레인" }, flag: "🇧🇭" },
  { code: "+965", country: { en: "Kuwait", zh: "科威特", ko: "쿠웨이트" }, flag: "🇰🇼" },
  { code: "+968", country: { en: "Oman", zh: "阿曼", ko: "오만" }, flag: "🇴🇲" },
  
  // 欧洲
  { code: "+44", country: { en: "United Kingdom", zh: "英国", ko: "영국" }, flag: "🇬🇧" },
  { code: "+49", country: { en: "Germany", zh: "德国", ko: "독일" }, flag: "🇩🇪" },
  { code: "+33", country: { en: "France", zh: "法国", ko: "프랑스" }, flag: "🇫🇷" },
  { code: "+39", country: { en: "Italy", zh: "意大利", ko: "이탈리아" }, flag: "🇮🇹" },
  { code: "+34", country: { en: "Spain", zh: "西班牙", ko: "스페인" }, flag: "🇪🇸" },
  { code: "+351", country: { en: "Portugal", zh: "葡萄牙", ko: "포르투갈" }, flag: "🇵🇹" },
  { code: "+31", country: { en: "Netherlands", zh: "荷兰", ko: "네덜란드" }, flag: "🇳🇱" },
  { code: "+32", country: { en: "Belgium", zh: "比利时", ko: "벨기에" }, flag: "🇧🇪" },
  { code: "+41", country: { en: "Switzerland", zh: "瑞士", ko: "스위스" }, flag: "🇨🇭" },
  { code: "+43", country: { en: "Austria", zh: "奥地利", ko: "오스트리아" }, flag: "🇦🇹" },
  { code: "+46", country: { en: "Sweden", zh: "瑞典", ko: "스웨덴" }, flag: "🇸🇪" },
  { code: "+47", country: { en: "Norway", zh: "挪威", ko: "노르웨이" }, flag: "🇳🇴" },
  { code: "+45", country: { en: "Denmark", zh: "丹麦", ko: "덴마크" }, flag: "🇩🇰" },
  { code: "+358", country: { en: "Finland", zh: "芬兰", ko: "핀란드" }, flag: "🇫🇮" },
  { code: "+48", country: { en: "Poland", zh: "波兰", ko: "폴란드" }, flag: "🇵🇱" },
  { code: "+420", country: { en: "Czech Republic", zh: "捷克", ko: "체코" }, flag: "🇨🇿" },
  { code: "+36", country: { en: "Hungary", zh: "匈牙利", ko: "헝가리" }, flag: "🇭🇺" },
  { code: "+30", country: { en: "Greece", zh: "希腊", ko: "그리스" }, flag: "🇬🇷" },
  { code: "+353", country: { en: "Ireland", zh: "爱尔兰", ko: "아일랜드" }, flag: "🇮🇪" },
  { code: "+7", country: { en: "Russia", zh: "俄罗斯", ko: "러시아" }, flag: "🇷🇺" },
  { code: "+380", country: { en: "Ukraine", zh: "乌克兰", ko: "우크라이나" }, flag: "🇺🇦" },
  { code: "+40", country: { en: "Romania", zh: "罗马尼亚", ko: "루마니아" }, flag: "🇷🇴" },
  { code: "+359", country: { en: "Bulgaria", zh: "保加利亚", ko: "불가리아" }, flag: "🇧🇬" },
  { code: "+385", country: { en: "Croatia", zh: "克罗地亚", ko: "크로아티아" }, flag: "🇭🇷" },
  { code: "+386", country: { en: "Slovenia", zh: "斯洛文尼亚", ko: "슬로베니아" }, flag: "🇸🇮" },
  { code: "+421", country: { en: "Slovakia", zh: "斯洛伐克", ko: "슬로바키아" }, flag: "🇸🇰" },
  { code: "+370", country: { en: "Lithuania", zh: "立陶宛", ko: "리투아니아" }, flag: "🇱🇹" },
  { code: "+371", country: { en: "Latvia", zh: "拉脱维亚", ko: "라트비아" }, flag: "🇱🇻" },
  { code: "+372", country: { en: "Estonia", zh: "爱沙尼亚", ko: "에스토니아" }, flag: "🇪🇪" },
  
  // 北美洲
  { code: "+1", country: { en: "United States", zh: "美国", ko: "미국" }, flag: "🇺🇸" },
  { code: "+1", country: { en: "Canada", zh: "加拿大", ko: "캐나다" }, flag: "🇨🇦" },
  { code: "+52", country: { en: "Mexico", zh: "墨西哥", ko: "멕시코" }, flag: "🇲🇽" },
  
  // 南美洲
  { code: "+55", country: { en: "Brazil", zh: "巴西", ko: "브라질" }, flag: "🇧🇷" },
  { code: "+54", country: { en: "Argentina", zh: "阿根廷", ko: "아르헨티나" }, flag: "🇦🇷" },
  { code: "+56", country: { en: "Chile", zh: "智利", ko: "칠레" }, flag: "🇨🇱" },
  { code: "+57", country: { en: "Colombia", zh: "哥伦比亚", ko: "콜롬비아" }, flag: "🇨🇴" },
  { code: "+51", country: { en: "Peru", zh: "秘鲁", ko: "페루" }, flag: "🇵🇪" },
  { code: "+58", country: { en: "Venezuela", zh: "委内瑞拉", ko: "베네수엘라" }, flag: "🇻🇪" },
  { code: "+593", country: { en: "Ecuador", zh: "厄瓜多尔", ko: "에콰도르" }, flag: "🇪🇨" },
  { code: "+598", country: { en: "Uruguay", zh: "乌拉圭", ko: "우루과이" }, flag: "🇺🇾" },
  { code: "+595", country: { en: "Paraguay", zh: "巴拉圭", ko: "파라과이" }, flag: "🇵🇾" },
  { code: "+591", country: { en: "Bolivia", zh: "玻利维亚", ko: "볼리비아" }, flag: "🇧🇴" },
  
  // 大洋洲
  { code: "+61", country: { en: "Australia", zh: "澳大利亚", ko: "호주" }, flag: "🇦🇺" },
  { code: "+64", country: { en: "New Zealand", zh: "新西兰", ko: "뉴질랜드" }, flag: "🇳🇿" },
  { code: "+679", country: { en: "Fiji", zh: "斐济", ko: "피지" }, flag: "🇫🇯" },
  
  // 非洲
  { code: "+20", country: { en: "Egypt", zh: "埃及", ko: "이집트" }, flag: "🇪🇬" },
  { code: "+27", country: { en: "South Africa", zh: "南非", ko: "남아프리카" }, flag: "🇿🇦" },
  { code: "+234", country: { en: "Nigeria", zh: "尼日利亚", ko: "나이지리아" }, flag: "🇳🇬" },
  { code: "+254", country: { en: "Kenya", zh: "肯尼亚", ko: "케냐" }, flag: "🇰🇪" },
  { code: "+212", country: { en: "Morocco", zh: "摩洛哥", ko: "모로코" }, flag: "🇲🇦" },
  { code: "+213", country: { en: "Algeria", zh: "阿尔及利亚", ko: "알제리" }, flag: "🇩🇿" },
  { code: "+216", country: { en: "Tunisia", zh: "突尼斯", ko: "튀니지" }, flag: "🇹🇳" },
  { code: "+233", country: { en: "Ghana", zh: "加纳", ko: "가나" }, flag: "🇬🇭" },
  { code: "+251", country: { en: "Ethiopia", zh: "埃塞俄比亚", ko: "에티오피아" }, flag: "🇪🇹" },
  { code: "+255", country: { en: "Tanzania", zh: "坦桑尼亚", ko: "탄자니아" }, flag: "🇹🇿" },
  { code: "+256", country: { en: "Uganda", zh: "乌干达", ko: "우간다" }, flag: "🇺🇬" },
];

export const getCountryName = (country: CountryCode["country"], lang: string): string => {
  switch (lang) {
    case "zh":
      return country.zh;
    case "ko":
      return country.ko;
    default:
      return country.en;
  }
};

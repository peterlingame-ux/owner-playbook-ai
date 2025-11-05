import { AIModel, PredictionHistory, Match, TeamOwner } from "@/types/prediction";

export const pastMatches: Match[] = [
  {
    id: "past1",
    homeTeam: "Manchester City",
    awayTeam: "Arsenal",
    homeLogo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=100&h=100&fit=crop",
    date: "2025-10-28",
    time: "15:00",
    league: "Premier League",
    status: "finished",
    homeScore: 3,
    awayScore: 1
  },
  {
    id: "past2",
    homeTeam: "Real Madrid",
    awayTeam: "Atletico Madrid",
    homeLogo: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=100&fit=crop",
    date: "2025-10-29",
    time: "20:45",
    league: "La Liga",
    status: "finished",
    homeScore: 2,
    awayScore: 0
  },
  {
    id: "past3",
    homeTeam: "Bayern Munich",
    awayTeam: "RB Leipzig",
    homeLogo: "https://images.unsplash.com/photo-1511204579483-781ef8490a69?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=100&h=100&fit=crop",
    date: "2025-10-30",
    time: "18:30",
    league: "Bundesliga",
    status: "finished",
    homeScore: 1,
    awayScore: 1
  },
  {
    id: "past4",
    homeTeam: "PSG",
    awayTeam: "Lyon",
    homeLogo: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=100&h=100&fit=crop",
    date: "2025-10-31",
    time: "21:00",
    league: "Ligue 1",
    status: "finished",
    homeScore: 4,
    awayScore: 2
  },
  {
    id: "past5",
    homeTeam: "Inter Milan",
    awayTeam: "AC Milan",
    homeLogo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100&h=100&fit=crop",
    date: "2025-11-01",
    time: "20:00",
    league: "Serie A",
    status: "finished",
    homeScore: 0,
    awayScore: 2
  }
];

export const aiModels: AIModel[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    displayName: "DEEPSEEK CHAT V3.1",
    color: "deepseek",
    totalPredictions: 247,
    correctPredictions: 163,
    winRate: 65.99,
    currentValue: "$14,669.79",
    change: "+$1,234.56",
    changePercent: 46.70
  },
  {
    id: "gpt5",
    name: "GPT 5",
    displayName: "GPT 5",
    color: "gpt",
    totalPredictions: 247,
    correctPredictions: 89,
    winRate: 36.03,
    currentValue: "$2,679.46",
    change: "-$987.32",
    changePercent: -73.21
  },
  {
    id: "claude",
    name: "Claude",
    displayName: "CLAUDE 4.5 SONNET",
    color: "claude",
    totalPredictions: 247,
    correctPredictions: 135,
    winRate: 54.66,
    currentValue: "$8,149.51",
    change: "+$456.78",
    changePercent: 12.34
  },
  {
    id: "gemini",
    name: "Gemini",
    displayName: "GEMINI 2.5 PRO",
    color: "gemini",
    totalPredictions: 247,
    correctPredictions: 98,
    winRate: 39.68,
    currentValue: "$2,967.37",
    change: "-$543.21",
    changePercent: -28.45
  },
  {
    id: "grok",
    name: "Grok",
    displayName: "GROK 4",
    color: "grok",
    totalPredictions: 247,
    correctPredictions: 128,
    winRate: 51.82,
    currentValue: "$6,325.53",
    change: "+$234.12",
    changePercent: 8.92
  },
  {
    id: "mystery",
    name: "BOOSPOT PRO",
    displayName: "BOOSPOT PRO",
    color: "mystery",
    totalPredictions: 247,
    correctPredictions: 217,
    winRate: 88.0,
    currentValue: "$32,456.89",
    change: "+$8,765.43",
    changePercent: 125.50,
    locked: true
  }
];

export const upcomingMatches: Match[] = [
  {
    id: "m1",
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    date: "2025-11-05",
    time: "20:00",
    league: "Premier League",
    leagueLogo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100&h=100&fit=crop",
    homeLogo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=100&h=100&fit=crop",
    status: "live",
    homeScore: 2,
    awayScore: 1,
    halfTimeHomeScore: 1,
    halfTimeAwayScore: 0,
    currentMinute: 67,
    matchPeriod: "second_half",
    homeYellowCards: 2,
    awayYellowCards: 3,
    homeRedCards: 0,
    awayRedCards: 1,
    homeCorners: 5,
    awayCorners: 3,
    liveStreamUrl: "#",
    weather: "rainy",
    bettingOdds: [
      { bookmaker: "36*", homeWin: 0.77, draw: 0.0, awayWin: 1.02, homeHandicap: 0.87, awayHandicap: 0.92 },
      { bookmaker: "皇*", homeWin: 0.85, draw: 0.0, awayWin: 0.97, homeHandicap: 0.92, awayHandicap: 0.96 },
      { bookmaker: "威***", homeWin: 1.04, draw: 0.25, awayWin: 0.72, homeHandicap: 0.91, awayHandicap: 0.82 },
      { bookmaker: "易**", homeWin: 0.75, draw: 0.0, awayWin: 1.01, homeHandicap: 0.0, awayHandicap: 0.0 },
      { bookmaker: "澳*", homeWin: 0.72, draw: 0.0, awayWin: 0.98, homeHandicap: 0.94, awayHandicap: 0.76 },
      { bookmaker: "立*", homeWin: 1.25, draw: 0.5, awayWin: 0.57, homeHandicap: 1.2, awayHandicap: 0.6 },
      { bookmaker: "韦*", homeWin: 0.94, draw: 0.25, awayWin: 0.74, homeHandicap: 0.9, awayHandicap: 0.91 },
      { bookmaker: "Inter*", homeWin: 0.95, draw: 0.0, awayWin: 0.75, homeHandicap: 0.6, awayHandicap: 1.2 },
      { bookmaker: "12*", homeWin: 1.01, draw: 0.25, awayWin: 0.79, homeHandicap: 0.91, awayHandicap: 0.94 },
      { bookmaker: "利*", homeWin: 0.89, draw: 0.0, awayWin: 1.01, homeHandicap: 0.93, awayHandicap: 0.99 },
      { bookmaker: "18*", homeWin: 0.86, draw: 0.0, awayWin: 0.98, homeHandicap: 0.0, awayHandicap: 0.0 },
      { bookmaker: "盈*", homeWin: 1.05, draw: 0.0, awayWin: 0.81, homeHandicap: 0.93, awayHandicap: 0.97 },
      { bookmaker: "18**", homeWin: 0.98, draw: 0.0, awayWin: 0.76, homeHandicap: 0.87, awayHandicap: 0.87 }
    ]
  },
  {
    id: "m2",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    date: "2025-11-06",
    time: "21:00",
    league: "La Liga",
    leagueLogo: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=100&h=100&fit=crop",
    homeLogo: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=100&fit=crop",
    status: "upcoming",
    homeYellowCards: 0,
    awayYellowCards: 0,
    homeRedCards: 0,
    awayRedCards: 0,
    homeCorners: 0,
    awayCorners: 0,
    weather: "sunny"
  },
  {
    id: "m3",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    date: "2025-11-07",
    time: "18:30",
    league: "Bundesliga",
    leagueLogo: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=100&h=100&fit=crop",
    homeLogo: "https://images.unsplash.com/photo-1511204579483-781ef8490a69?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=100&h=100&fit=crop",
    status: "live",
    homeScore: 1,
    awayScore: 1,
    currentMinute: 45,
    matchPeriod: "first_half",
    homeYellowCards: 1,
    awayYellowCards: 2,
    homeRedCards: 0,
    awayRedCards: 0,
    homeCorners: 4,
    awayCorners: 6,
    liveStreamUrl: "#",
    weather: "snowy"
  },
  {
    id: "m4",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    date: "2025-11-08",
    time: "21:00",
    league: "Ligue 1",
    leagueLogo: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=100&h=100&fit=crop",
    homeLogo: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=100&h=100&fit=crop",
    awayLogo: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=100&fit=crop",
    status: "upcoming",
    homeYellowCards: 0,
    awayYellowCards: 0,
    homeRedCards: 0,
    awayRedCards: 0,
    homeCorners: 0,
    awayCorners: 0,
    weather: "cloudy"
  }
];

// AI predictions for each match - all 5 AIs predict every match with detailed betting info
export const matchPredictions: Record<string, Array<{ 
  aiId: string; 
  prediction: "HOME_WIN" | "AWAY_WIN" | "DRAW"; 
  confidence: number;
  betType: "moneyline" | "handicap" | "over_under";
  handicapLine?: number;
  overUnderLine?: number;
  overUnderPick?: "over" | "under";
  odds: number;
}>> = {
  "m1": [
    { aiId: "deepseek", prediction: "HOME_WIN", confidence: 68, betType: "handicap", handicapLine: -1.5, odds: 1.92 },
    { aiId: "gpt5", prediction: "AWAY_WIN", confidence: 55, betType: "over_under", overUnderLine: 3.5, overUnderPick: "over", odds: 2.05 },
    { aiId: "claude", prediction: "HOME_WIN", confidence: 62, betType: "moneyline", odds: 1.75 },
    { aiId: "gemini", prediction: "DRAW", confidence: 45, betType: "over_under", overUnderLine: 2.5, overUnderPick: "under", odds: 1.88 },
    { aiId: "grok", prediction: "HOME_WIN", confidence: 71, betType: "handicap", handicapLine: -0.5, odds: 2.10 },
  ],
  "m2": [
    { aiId: "deepseek", prediction: "HOME_WIN", confidence: 72, betType: "handicap", handicapLine: -1, odds: 1.95 },
    { aiId: "gpt5", prediction: "HOME_WIN", confidence: 64, betType: "moneyline", odds: 1.68 },
    { aiId: "claude", prediction: "AWAY_WIN", confidence: 58, betType: "handicap", handicapLine: 1, odds: 2.15 },
    { aiId: "gemini", prediction: "HOME_WIN", confidence: 69, betType: "over_under", overUnderLine: 3.5, overUnderPick: "over", odds: 1.98 },
    { aiId: "grok", prediction: "HOME_WIN", confidence: 65, betType: "handicap", handicapLine: -0.5, odds: 1.85 },
  ],
  "m3": [
    { aiId: "deepseek", prediction: "HOME_WIN", confidence: 61, betType: "moneyline", odds: 1.72 },
    { aiId: "gpt5", prediction: "DRAW", confidence: 51, betType: "over_under", overUnderLine: 2.5, overUnderPick: "under", odds: 1.90 },
    { aiId: "claude", prediction: "AWAY_WIN", confidence: 59, betType: "handicap", handicapLine: 0.5, odds: 2.08 },
    { aiId: "gemini", prediction: "HOME_WIN", confidence: 63, betType: "handicap", handicapLine: -1, odds: 2.12 },
    { aiId: "grok", prediction: "HOME_WIN", confidence: 67, betType: "over_under", overUnderLine: 3.5, overUnderPick: "over", odds: 2.00 },
  ],
  "m4": [
    { aiId: "deepseek", prediction: "HOME_WIN", confidence: 76, betType: "handicap", handicapLine: -1.5, odds: 2.05 },
    { aiId: "gpt5", prediction: "HOME_WIN", confidence: 61, betType: "moneyline", odds: 1.65 },
    { aiId: "claude", prediction: "HOME_WIN", confidence: 70, betType: "over_under", overUnderLine: 3.5, overUnderPick: "over", odds: 1.95 },
    { aiId: "gemini", prediction: "DRAW", confidence: 48, betType: "over_under", overUnderLine: 2.5, overUnderPick: "under", odds: 1.85 },
    { aiId: "grok", prediction: "HOME_WIN", confidence: 73, betType: "handicap", handicapLine: -1, odds: 1.88 },
  ],
};

export const matchOwnersData: Record<string, {
  homeOwner: TeamOwner;
  awayOwner: TeamOwner;
}> = {
  "m1": {
    homeOwner: {
      name: "Sir Jim Ratcliffe",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      netWorth: "$23.5B",
      age: 71,
      healthStatus: "Recently underwent minor surgery but recovering well. Regular health checkups show stable condition.",
      familyStatus: "Married with three children",
      socialActivity: 7,
      recentNews: [
        "Attended charity gala in Monaco",
        "Met with Premier League officials",
        "Announced new stadium investment"
      ],
      scandals: [
        "Controversial tax arrangement scrutiny from UK authorities in 2023",
        "Criticism over delayed stadium renovation plans"
      ],
      familyMembers: [
        { 
          relation: "Wife", 
          name: "Maria Alessandro", 
          age: 58,
          occupation: "Philanthropist & Art Collector",
          netWorth: "$120M",
          influence: "Moderate - Influences charity work and social image"
        },
        { 
          relation: "Son", 
          name: "George Ratcliffe", 
          age: 35,
          occupation: "INEOS Executive Director",
          netWorth: "$450M",
          influence: "High - Involved in business strategy and succession planning"
        },
        { 
          relation: "Daughter", 
          name: "Julia Ratcliffe", 
          age: 32,
          occupation: "Investment Banker at Goldman Sachs",
          netWorth: "$85M",
          influence: "Medium - Provides financial advice on major deals"
        },
        { 
          relation: "Son", 
          name: "Samuel Ratcliffe", 
          age: 28,
          occupation: "Sports Marketing Entrepreneur",
          netWorth: "$42M",
          influence: "Medium - Connects to younger demographics and sports sponsorships"
        }
      ],
      closeFriends: [
        { 
          name: "Sheikh Mansour bin Zayed Al Nahyan", 
          relationship: "Business Partner & Fellow Club Owner",
          influence: "High - Major player in sports investment circles",
          recentInteraction: "Joint meeting at Dubai investment summit last month discussing football business strategies"
        },
        { 
          name: "Bernie Ecclestone", 
          relationship: "Long-time Friend from Formula 1",
          influence: "Medium - Influential in motorsports and business networks",
          recentInteraction: "Attended private yacht gathering in Monaco two weeks ago"
        },
        { 
          name: "Sir Martin Broughton", 
          relationship: "Business Advisor & Former Club Chairman",
          influence: "High - Experienced in football club management",
          recentInteraction: "Regular consultation calls about Manchester United strategy"
        }
      ],
      financialStatus: "Net worth increased by 8% this quarter. INEOS chemical company performing strongly. Recent acquisition of cycling team shows diversification strategy.",
      financialDetails: {
        recentExpenses: [
          {
            item: "Manchester United Stadium Renovation Planning",
            amount: "$45M",
            date: "2025-10-15",
            purpose: "Initial investment in Old Trafford modernization feasibility study and architectural designs"
          },
          {
            item: "INEOS Grenadiers Cycling Team Expansion",
            amount: "$28M",
            date: "2025-10-08",
            purpose: "Strengthening cycling team roster and infrastructure for Tour de France campaign"
          },
          {
            item: "Luxury Yacht 'Hampshire II' Maintenance",
            amount: "$3.2M",
            date: "2025-09-22",
            purpose: "Annual yacht service and upgrades in Monaco harbor"
          }
        ],
        recentInvestments: [
          {
            investment: "Green Hydrogen Technology Startup",
            amount: "$185M",
            date: "2025-10-20",
            expectedReturn: "25% annual ROI over 5 years - Aligns with INEOS sustainability pivot"
          },
          {
            investment: "Swiss Private Bank Stake",
            amount: "$320M",
            date: "2025-09-28",
            expectedReturn: "12-15% annual returns - Diversification into financial services"
          },
          {
            investment: "Premier League Media Rights Fund",
            amount: "$75M",
            date: "2025-10-05",
            expectedReturn: "18% over 3 years - Direct exposure to football commercial growth"
          }
        ],
        cashFlow: "Extremely strong. INEOS generates $2.1B quarterly free cash flow. Regular dividends provide $450M annual personal income. Multiple credit lines totaling $5B remain untouched.",
        debtSituation: "Minimal personal debt. $800M in strategic corporate debt at favorable 2.8% interest rates. Debt-to-equity ratio of 0.3, well below industry average of 1.2."
      },
      socialStatus: "Active in high-society circles. Regular attendee of Formula 1 events and yacht shows. Known for private nature but increasing public presence since club acquisition.",
      recentActivities: [
        "Attended Manchester United board meeting last week",
        "Met with potential sponsorship partners in Dubai",
        "Hosted exclusive dinner for club legends",
        "Visited club training facilities"
      ],
      exclusiveAnalysis: "Ratcliffe's recent increased involvement in day-to-day operations signals a shift in management strategy. His chemical empire's strong performance provides substantial backing for club investments. However, ongoing stadium renovation debates and tax scrutiny may be creating added pressure. The owner's health recovery appears positive, potentially boosting confidence in decision-making. His growing public presence suggests a more hands-on approach compared to previous management style."
    },
    awayOwner: {
      name: "John W. Henry",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      netWorth: "$4.8B",
      age: 75,
      healthStatus: "Excellent health for age. Regular fitness routine maintained. No recent health concerns reported.",
      familyStatus: "Married to Linda Pizzuti Henry",
      socialActivity: 6,
      recentNews: [
        "Expanded FSG sports portfolio",
        "Invested in artificial intelligence startup",
        "Spoke at sports business conference"
      ],
      scandals: [
        "European Super League controversy aftermath still affecting reputation",
        "Ticket pricing disputes with fan groups in 2022"
      ],
      familyMembers: [
        { 
          relation: "Wife", 
          name: "Linda Pizzuti Henry", 
          age: 44,
          occupation: "Boston Globe Managing Director & Investor",
          netWorth: "$280M",
          influence: "Very High - Active business partner in FSG operations and media strategy"
        },
        { 
          relation: "Daughter", 
          name: "Sara Henry", 
          age: 28,
          occupation: "Tech Venture Capitalist",
          netWorth: "$65M",
          influence: "Medium - Introduces modern tech perspectives to sports business"
        },
        { 
          relation: "Son", 
          name: "Silas Henry", 
          age: 25,
          occupation: "Sports Analytics Startup Founder",
          netWorth: "$38M",
          influence: "High - Drives data-driven decision making in FSG portfolio"
        }
      ],
      closeFriends: [
        { 
          name: "LeBron James", 
          relationship: "Business Partner & FSG Investor",
          influence: "Very High - Major sports icon and business mogul",
          recentInteraction: "Video call discussing Liverpool FC strategy and potential NBA-Premier League marketing synergies"
        },
        { 
          name: "Michael Bloomberg", 
          relationship: "Fellow Sports Team Owner & Investor",
          influence: "Very High - Billionaire media mogul with extensive networks",
          recentInteraction: "Met at exclusive New York business dinner discussing sports media rights"
        },
        { 
          name: "Tom Werner", 
          relationship: "FSG Partner & Chairman",
          influence: "High - Close business collaborator in sports ventures",
          recentInteraction: "Weekly FSG board meetings and strategic planning sessions"
        }
      ],
      financialStatus: "Fenway Sports Group valuation up 15% year-over-year. Boston Red Sox and Liverpool FC both profitable. Recent tech investments showing promising returns.",
      financialDetails: {
        recentExpenses: [
          {
            item: "Liverpool FC Training Facility Upgrade",
            amount: "$62M",
            date: "2025-10-12",
            purpose: "State-of-the-art AXA Training Centre expansion with sports science technology"
          },
          {
            item: "FSG Private Equity Partnership",
            amount: "$120M",
            date: "2025-09-30",
            purpose: "Buy-back of minority stake to maintain control while raising capital"
          },
          {
            item: "Fenway Park Renovation",
            amount: "$35M",
            date: "2025-10-01",
            purpose: "Historic ballpark modernization preserving character while improving amenities"
          }
        ],
        recentInvestments: [
          {
            investment: "AI Sports Analytics Platform",
            amount: "$95M",
            date: "2025-10-18",
            expectedReturn: "35% annual ROI over 4 years - Competitive advantage in player recruitment"
          },
          {
            investment: "Pittsburgh Penguins NHL Franchise",
            amount: "$850M",
            date: "2025-09-15",
            expectedReturn: "10-12% annual growth - FSG portfolio expansion into hockey"
          },
          {
            investment: "Sports Betting Technology Startup",
            amount: "$42M",
            date: "2025-10-22",
            expectedReturn: "28% ROI potential - Exposure to growing betting industry"
          }
        ],
        cashFlow: "Strong and diversified. FSG generates $380M annual operating income across multiple franchises. Red Sox broadcasting rights provide $85M annually. Liverpool commercial deals add $120M yearly.",
        debtSituation: "Moderate debt of $1.2B spread across FSG entities. All secured at favorable rates below 3.5%. Recent private equity deal reduced leverage ratio from 2.1 to 1.6."
      },
      socialStatus: "Well-connected in both sports and business worlds. Maintains lower profile than other club owners. Respected in investment circles. Strong relationship with MLB and Premier League officials.",
      recentActivities: [
        "Finalized strategic partnership with private equity firm",
        "Attended FSG annual investor meeting in Boston",
        "Reviewed Liverpool's summer transfer strategy",
        "Met with club manager to discuss long-term vision"
      ],
      exclusiveAnalysis: "Henry's Fenway Sports Group is riding high on successful multi-sport portfolio management. The recent equity partnerships strengthen financial position while maintaining control. His data-driven approach and patient investment strategy have proven successful. However, lingering Super League reputation damage among fans could affect atmosphere. The owner's focus on sustainability and long-term growth over quick wins suggests confidence in current trajectory despite increased competition for Premier League supremacy."
    }
  },
  "m2": {
    homeOwner: {
      name: "Florentino Pérez",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
      netWorth: "$2.1B",
      age: 77,
      healthStatus: "Recently recovered from minor illness. Generally maintains good health through regular medical monitoring.",
      familyStatus: "Widowed, has three children",
      socialActivity: 9,
      recentNews: [
        "Re-elected as Real Madrid president",
        "Announced new Bernabéu renovation phase",
        "Met with Spanish government officials"
      ],
      scandals: [
        "Ongoing legal battles from Super League project",
        "Allegations of favorable media coverage arrangements",
        "Controversy over Bernabéu construction permits"
      ],
      familyMembers: [
        { relation: "Son", name: "Florentino Pérez Jr.", age: 48 },
        { relation: "Daughter", name: "María Ángeles Pérez", age: 46 },
        { relation: "Daughter", name: "Laura Pérez", age: 43 }
      ],
      closeFriends: [
        { 
          name: "Andrea Agnelli", 
          relationship: "Fellow Club President & Super League Ally",
          influence: "Very High - Former Juventus chairman and European football power broker",
          recentInteraction: "Private dinner in Turin discussing European football's future and legal strategies"
        },
        { 
          name: "Nasser Al-Khelaifi", 
          relationship: "PSG President & UEFA Executive",
          influence: "Very High - Major influence in European football governance",
          recentInteraction: "Met at UEFA meeting, maintaining cordial relations despite competitive tensions"
        },
        { 
          name: "Emilio Butragueño", 
          relationship: "Real Madrid Director & Trusted Advisor",
          influence: "High - Internal club legend with deep institutional knowledge",
          recentInteraction: "Daily consultations on club operations and player negotiations"
        }
      ],
      financialStatus: "ACS construction company facing market challenges but remains stable. Real Madrid's finances strongest in club history with record revenues. Bernabéu project slightly over budget but manageable.",
      socialStatus: "One of most powerful figures in Spanish business and sports. Close ties with political establishment. Regular attendee of royal events. Influential voice in European football governance despite Super League controversy.",
      recentActivities: [
        "Hosted meeting with potential galáctico signing",
        "Appeared at Spanish business leaders summit",
        "Oversaw final Bernabéu renovation details",
        "Met with La Liga president regarding media rights"
      ],
      exclusiveAnalysis: "Pérez remains determined to revolutionize European football despite Super League setbacks. His re-election demonstrates strong institutional support, but legal battles are consuming time and resources. The completed Bernabéu transformation provides prestige boost and revenue stream. Construction company challenges create minor financial pressure but unlikely to impact club operations. His age and health may prompt succession planning, potentially affecting long-term strategic decisions. The relentless pursuit of marquee signings continues despite financial fair play considerations."
    },
    awayOwner: {
      name: "Joan Laporta",
      photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
      netWorth: "$50M",
      age: 61,
      healthStatus: "Good overall health. Maintains active lifestyle. No significant health issues reported.",
      familyStatus: "Divorced, has three children",
      socialActivity: 8,
      recentNews: [
        "Announced major sponsorship deal",
        "Defended club's financial decisions",
        "Visited La Masia youth academy"
      ],
      scandals: [
        "Ongoing investigation into Negreira referee payments case",
        "Controversy over salary cap management and player registrations",
        "Disputed financial projections and transparency concerns"
      ],
      familyMembers: [
        { relation: "Son", name: "Pol Laporta", age: 30 },
        { relation: "Daughter", name: "Gianna Laporta", age: 27 },
        { relation: "Son", name: "Guillem Laporta", age: 24 }
      ],
      closeFriends: [
        { 
          name: "Pep Guardiola", 
          relationship: "Club Legend & Former Player",
          influence: "Very High - World-renowned manager with deep Barcelona roots",
          recentInteraction: "Phone conversations about Barcelona's sporting philosophy and youth development"
        },
        { 
          name: "Jordi Cruyff", 
          relationship: "Former Sporting Director & Cruyff Family Connection",
          influence: "High - Son of club legend Johan Cruyff, carries family legacy",
          recentInteraction: "Advisory role on La Masia academy development and club identity"
        },
        { 
          name: "Ferran Reverter", 
          relationship: "Former CEO & Business Advisor",
          influence: "Medium - Finance and management expertise",
          recentInteraction: "Occasional consultations on financial restructuring despite earlier departure"
        }
      ],
      financialStatus: "Barcelona's finances improving but still under severe La Liga salary cap restrictions. New sponsorship deals providing relief. Spotify Camp Nou renovation creating short-term revenue challenges. Personal wealth limited compared to other club presidents.",
      socialStatus: "Popular among Barcelona members and fans despite controversies. Strong political connections in Catalonia. Charismatic public speaker. Faces pressure from club members and sporting results.",
      recentActivities: [
        "Negotiated emergency financial levers for player signings",
        "Met with city officials regarding stadium construction",
        "Addressed club members on financial situation",
        "Attended Catalonian business forum"
      ],
      exclusiveAnalysis: "Laporta is walking a financial tightrope while maintaining competitive ambitions. The Negreira case clouds his presidency and could have severe consequences. His optimistic projections often clash with financial reality, creating credibility concerns. However, his charisma and political skills have kept member support relatively strong. The temporary stadium situation during renovations affects matchday atmosphere and revenues. Personal financial limitations mean complete dependency on club resources. His presidency's success hinges on sporting results while managing unprecedented financial constraints and legal threats."
    }
  },
  "m3": {
    homeOwner: {
      name: "Herbert Hainer",
      photo: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop",
      netWorth: "$180M",
      age: 69,
      healthStatus: "Excellent health. Regular sports activity. No health concerns.",
      familyStatus: "Married with two children",
      socialActivity: 7,
      recentNews: [
        "Spoke at Bundesliga innovation summit",
        "Announced club sustainability initiative",
        "Met with German FA officials"
      ],
      scandals: [
        "Minor criticism over ticket price increases",
        "Debate over club's commercial direction vs tradition"
      ],
      familyMembers: [
        { relation: "Wife", name: "Gabriele Hainer", age: 66 },
        { relation: "Son", name: "Tobias Hainer", age: 38 },
        { relation: "Daughter", name: "Sophie Hainer", age: 35 }
      ],
      closeFriends: [
        { 
          name: "Karl-Heinz Rummenigge", 
          relationship: "Bayern Munich Legend & Former CEO",
          influence: "Very High - Club icon with decades of influence",
          recentInteraction: "Regular informal consultations about club strategy and European football matters"
        },
        { 
          name: "Kasper Rorsted", 
          relationship: "Adidas CEO & Long-time Business Associate",
          influence: "Very High - Major sponsor relationship and personal friendship from Adidas years",
          recentInteraction: "Quarterly business dinners discussing sports sponsorship trends"
        },
        { 
          name: "Oliver Kahn", 
          relationship: "Former Bayern CEO & Club Legend",
          influence: "High - Recently departed but maintains advisory relationship",
          recentInteraction: "Occasional phone calls about club management lessons learned"
        }
      ],
      financialStatus: "Bayern Munich's finances are exceptionally stable with consistent profitability. No debt burden. Strong commercial partnerships including Adidas, Allianz, and Audi. Conservative but successful financial management approach.",
      socialStatus: "Respected in German business circles from Adidas tenure. Low-key personality compared to other club presidents. Strong relationships with Bundesliga officials. Focused on club tradition and fan engagement.",
      recentActivities: [
        "Reviewed club's youth development strategy",
        "Met with potential sponsors in Munich",
        "Attended supervisory board meeting",
        "Visited women's team facilities"
      ],
      exclusiveAnalysis: "Hainer represents stability and Germanic efficiency in football management. His Adidas background brings valuable commercial expertise without compromising club values. The 50+1 ownership rule means fan-owned structure limits his individual power but ensures democratic accountability. Financial conservatism prevents reckless spending but also limits ability to compete with oil-backed clubs in transfer market. His focus on sustainability and youth development aligns with club philosophy. No major scandals or health concerns provide consistent leadership. However, pressure to maintain Bundesliga dominance while competing in Champions League may test conservative approach."
    },
    awayOwner: {
      name: "Hans-Joachim Watzke",
      photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop",
      netWorth: "$90M",
      age: 64,
      healthStatus: "Good health overall. Recently mentioned reducing work stress. No major health issues.",
      familyStatus: "Married with children",
      socialActivity: 6,
      recentNews: [
        "Discussed Bundesliga competitiveness issues",
        "Announced stadium expansion plans",
        "Defended club transfer strategy"
      ],
      scandals: [
        "Criticism over selling key players to rivals",
        "Controversy regarding youth player compensation dispute"
      ],
      familyMembers: [
        { relation: "Wife", name: "Anke Watzke", age: 62 },
        { relation: "Son", name: "Bastian Watzke", age: 34 },
        { relation: "Daughter", name: "Laura Watzke", age: 31 }
      ],
      closeFriends: [
        { 
          name: "Jürgen Klopp", 
          relationship: "Former BVB Manager & Club Legend",
          influence: "Very High - Beloved figure who transformed club, now Liverpool manager",
          recentInteraction: "WhatsApp messages exchanging football insights and maintaining close personal bond"
        },
        { 
          name: "Matthias Sammer", 
          relationship: "Former BVB Sporting Director & Advisor",
          influence: "High - Football expert with deep Bundesliga knowledge",
          recentInteraction: "Phone consultations about player recruitment and sporting strategy"
        },
        { 
          name: "Michael Zorc", 
          relationship: "Long-time Sporting Director & Close Colleague",
          influence: "Very High - Decades of partnership building Dortmund",
          recentInteraction: "Still involved in informal advisory capacity despite official retirement"
        }
      ],
      financialStatus: "Dortmund's finances healthy but more constrained than Bayern. Recent player sales provided significant revenue. Stock market listing creates transparency but also shareholder pressure. Stadium debt largely paid off.",
      socialStatus: "Well-liked by Dortmund fans for saving club from bankruptcy. Outspoken advocate for German football traditions. Regular critic of financial doping in European football. Strong voice in Bundesliga discussions.",
      recentActivities: [
        "Negotiated contract extension with key player",
        "Attended European Club Association meeting",
        "Met with local government about infrastructure",
        "Gave interview about Bundesliga future"
      ],
      exclusiveAnalysis: "Watzke continues balancing act between competitiveness and financial sustainability. His emotional connection to club is genuine asset with fans but may cloud judgment in key decisions. The perennial challenge of retaining star players against richer clubs creates cycle of rebuild rather than sustained excellence. His mentions of reducing stress suggest potential succession planning or delegation. Recent player sales provided financial cushion but weakened squad competitiveness. Stock market pressures demand short-term results conflicting with long-term development strategy. His outspoken nature wins respect but sometimes creates unnecessary controversies. Health and stress comments worth monitoring for leadership stability."
    }
  }
};

export const predictionHistory: PredictionHistory[] = [
  // Match 1 - Manchester City vs Arsenal (3-1)
  {
    id: "1",
    matchId: "past1",
    aiModel: "deepseek",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 87,
    date: "2025-10-28",
    betType: "handicap",
    handicapLine: -1.5,
    odds: 1.92,
    betAmount: 500
  },
  {
    id: "2",
    matchId: "past1",
    aiModel: "gpt5",
    prediction: "AWAY_WIN",
    actualResult: "HOME_WIN",
    correct: false,
    confidence: 65,
    date: "2025-10-28",
    betType: "over_under",
    overUnderLine: 3.5,
    overUnderPick: "over",
    odds: 2.05,
    betAmount: 300
  },
  {
    id: "3",
    matchId: "past1",
    aiModel: "claude",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 79,
    date: "2025-10-28",
    betType: "moneyline",
    odds: 1.75,
    betAmount: 450
  },
  {
    id: "4",
    matchId: "past1",
    aiModel: "gemini",
    prediction: "DRAW",
    actualResult: "HOME_WIN",
    correct: false,
    confidence: 72,
    date: "2025-10-28",
    betType: "over_under",
    overUnderLine: 2.5,
    overUnderPick: "under",
    odds: 1.88,
    betAmount: 350
  },
  {
    id: "5",
    matchId: "past1",
    aiModel: "grok",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 81,
    date: "2025-10-28",
    betType: "handicap",
    handicapLine: -0.5,
    odds: 2.10,
    betAmount: 400
  },
  
  // Match 2 - Real Madrid vs Atletico Madrid (2-0)
  {
    id: "6",
    matchId: "past2",
    aiModel: "deepseek",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 92,
    date: "2025-10-29",
    betType: "handicap",
    handicapLine: -1,
    odds: 1.95,
    betAmount: 600
  },
  {
    id: "7",
    matchId: "past2",
    aiModel: "gpt5",
    prediction: "DRAW",
    actualResult: "HOME_WIN",
    correct: false,
    confidence: 58,
    date: "2025-10-29",
    betType: "over_under",
    overUnderLine: 2.5,
    overUnderPick: "under",
    odds: 1.90,
    betAmount: 250
  },
  {
    id: "8",
    matchId: "past2",
    aiModel: "claude",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 85,
    date: "2025-10-29",
    betType: "moneyline",
    odds: 1.68,
    betAmount: 500
  },
  {
    id: "9",
    matchId: "past2",
    aiModel: "gemini",
    prediction: "AWAY_WIN",
    actualResult: "HOME_WIN",
    correct: false,
    confidence: 68,
    date: "2025-10-29",
    betType: "over_under",
    overUnderLine: 3.5,
    overUnderPick: "over",
    odds: 1.98,
    betAmount: 320
  },
  {
    id: "10",
    matchId: "past2",
    aiModel: "grok",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 76,
    date: "2025-10-29",
    betType: "handicap",
    handicapLine: -0.5,
    odds: 1.85,
    betAmount: 450
  },
  
  // Match 3 - Bayern Munich vs RB Leipzig (1-1)
  {
    id: "11",
    matchId: "past3",
    aiModel: "deepseek",
    prediction: "HOME_WIN",
    actualResult: "DRAW",
    correct: false,
    confidence: 78,
    date: "2025-10-30",
    betType: "moneyline",
    odds: 1.72,
    betAmount: 480
  },
  {
    id: "12",
    matchId: "past3",
    aiModel: "gpt5",
    prediction: "AWAY_WIN",
    actualResult: "DRAW",
    correct: false,
    confidence: 62,
    date: "2025-10-30",
    betType: "over_under",
    overUnderLine: 2.5,
    overUnderPick: "under",
    odds: 1.90,
    betAmount: 280
  },
  {
    id: "13",
    matchId: "past3",
    aiModel: "claude",
    prediction: "DRAW",
    actualResult: "DRAW",
    correct: true,
    confidence: 71,
    date: "2025-10-30",
    betType: "moneyline",
    odds: 3.20,
    betAmount: 350
  },
  {
    id: "14",
    matchId: "past3",
    aiModel: "gemini",
    prediction: "HOME_WIN",
    actualResult: "DRAW",
    correct: false,
    confidence: 69,
    date: "2025-10-30",
    betType: "handicap",
    handicapLine: -1,
    odds: 2.12,
    betAmount: 330
  },
  {
    id: "15",
    matchId: "past3",
    aiModel: "grok",
    prediction: "DRAW",
    actualResult: "DRAW",
    correct: true,
    confidence: 73,
    date: "2025-10-30",
    betType: "over_under",
    overUnderLine: 3.5,
    overUnderPick: "over",
    odds: 2.00,
    betAmount: 380
  },
  
  // Match 4 - PSG vs Lyon (4-2)
  {
    id: "16",
    matchId: "past4",
    aiModel: "deepseek",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 89,
    date: "2025-10-31",
    betType: "handicap",
    handicapLine: -1.5,
    odds: 2.05,
    betAmount: 550
  },
  {
    id: "17",
    matchId: "past4",
    aiModel: "gpt5",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 71,
    date: "2025-10-31",
    betType: "moneyline",
    odds: 1.65,
    betAmount: 320
  },
  {
    id: "18",
    matchId: "past4",
    aiModel: "claude",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 84,
    date: "2025-10-31",
    betType: "over_under",
    overUnderLine: 3.5,
    overUnderPick: "over",
    odds: 1.95,
    betAmount: 480
  },
  {
    id: "19",
    matchId: "past4",
    aiModel: "gemini",
    prediction: "DRAW",
    actualResult: "HOME_WIN",
    correct: false,
    confidence: 66,
    date: "2025-10-31",
    betType: "over_under",
    overUnderLine: 2.5,
    overUnderPick: "under",
    odds: 1.85,
    betAmount: 310
  },
  {
    id: "20",
    matchId: "past4",
    aiModel: "grok",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 79,
    date: "2025-10-31",
    betType: "handicap",
    handicapLine: -1,
    odds: 1.88,
    betAmount: 420
  },
  
  // Match 5 - Inter Milan vs AC Milan (0-2)
  {
    id: "21",
    matchId: "past5",
    aiModel: "deepseek",
    prediction: "DRAW",
    actualResult: "AWAY_WIN",
    correct: false,
    confidence: 75,
    date: "2025-11-01",
    betType: "moneyline",
    odds: 3.10,
    betAmount: 400
  },
  {
    id: "22",
    matchId: "past5",
    aiModel: "gpt5",
    prediction: "HOME_WIN",
    actualResult: "AWAY_WIN",
    correct: false,
    confidence: 64,
    date: "2025-11-01",
    betType: "over_under",
    overUnderLine: 2.5,
    overUnderPick: "over",
    odds: 1.92,
    betAmount: 290
  },
  {
    id: "23",
    matchId: "past5",
    aiModel: "claude",
    prediction: "AWAY_WIN",
    actualResult: "AWAY_WIN",
    correct: true,
    confidence: 77,
    date: "2025-11-01",
    betType: "handicap",
    handicapLine: 0.5,
    odds: 2.15,
    betAmount: 430
  },
  {
    id: "24",
    matchId: "past5",
    aiModel: "gemini",
    prediction: "HOME_WIN",
    actualResult: "AWAY_WIN",
    correct: false,
    confidence: 70,
    date: "2025-11-01",
    betType: "moneyline",
    odds: 1.88,
    betAmount: 340
  },
  {
    id: "25",
    matchId: "past5",
    aiModel: "grok",
    prediction: "DRAW",
    actualResult: "AWAY_WIN",
    correct: false,
    confidence: 68,
    date: "2025-11-01",
    betType: "over_under",
    overUnderLine: 2.5,
    overUnderPick: "under",
    odds: 1.90,
    betAmount: 360
  }
];

export const generateChartData = () => {
  const dataPoints = 50;
  const startWinRate = 50; // Starting win rate around 50%
  const data = [];
  
  for (let i = 0; i < dataPoints; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (dataPoints - i));
    
    data.push({
      date: date.toISOString().split('T')[0],
      deepseek: Math.max(30, Math.min(70, startWinRate + 15 + Math.random() * 10 - 5 + (i * 0.1))),
      gpt5: Math.max(20, Math.min(45, startWinRate - 15 + Math.random() * 10 - 5 - (i * 0.1))),
      claude: Math.max(35, Math.min(60, startWinRate + 5 + Math.random() * 10 - 5)),
      gemini: Math.max(25, Math.min(50, startWinRate - 10 + Math.random() * 10 - 5 - (i * 0.05))),
      grok: Math.max(30, Math.min(60, startWinRate + 2 + Math.random() * 10 - 5 + (i * 0.05)))
    });
  }
  
  return data;
};

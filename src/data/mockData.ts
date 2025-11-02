import { AIModel, PredictionHistory, Match } from "@/types/prediction";

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
  }
];

export const upcomingMatches: Match[] = [
  {
    id: "m1",
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    date: "2025-11-05",
    time: "20:00",
    league: "Premier League"
  },
  {
    id: "m2",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    date: "2025-11-06",
    time: "21:00",
    league: "La Liga"
  },
  {
    id: "m3",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    date: "2025-11-07",
    time: "18:30",
    league: "Bundesliga"
  }
];

export const predictionHistory: PredictionHistory[] = [
  {
    id: "1",
    matchId: "past1",
    aiModel: "deepseek",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 87,
    date: "2025-11-01"
  },
  {
    id: "2",
    matchId: "past1",
    aiModel: "gpt5",
    prediction: "AWAY_WIN",
    actualResult: "HOME_WIN",
    correct: false,
    confidence: 65,
    date: "2025-11-01"
  },
  {
    id: "3",
    matchId: "past1",
    aiModel: "claude",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 79,
    date: "2025-11-01"
  },
  {
    id: "4",
    matchId: "past1",
    aiModel: "gemini",
    prediction: "DRAW",
    actualResult: "HOME_WIN",
    correct: false,
    confidence: 72,
    date: "2025-11-01"
  },
  {
    id: "5",
    matchId: "past1",
    aiModel: "grok",
    prediction: "HOME_WIN",
    actualResult: "HOME_WIN",
    correct: true,
    confidence: 81,
    date: "2025-11-01"
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

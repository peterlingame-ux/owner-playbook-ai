export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  league: string;
}

export interface TeamOwner {
  name: string;
  photo: string;
  netWorth: string;
  age: number;
  healthStatus: string;
  familyStatus: string;
  socialActivity: number;
  recentNews: string[];
  scandals: string[];
  familyMembers: {
    relation: string;
    name: string;
    age: number;
  }[];
  financialStatus: string;
  socialStatus: string;
  recentActivities: string[];
  exclusiveAnalysis: string;
}

export interface Prediction {
  matchId: string;
  aiModel: string;
  prediction: "HOME_WIN" | "AWAY_WIN" | "DRAW";
  confidence: number;
  analysis: string;
  timestamp: string;
}

export interface PredictionHistory {
  id: string;
  matchId: string;
  aiModel: string;
  prediction: "HOME_WIN" | "AWAY_WIN" | "DRAW";
  actualResult: "HOME_WIN" | "AWAY_WIN" | "DRAW";
  correct: boolean;
  confidence: number;
  date: string;
}

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  color: string;
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  currentValue: string;
  change: string;
  changePercent: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  league: string;
  leagueLogo?: string;
  homeLogo?: string;
  awayLogo?: string;
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
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
    occupation?: string;
    netWorth?: string;
    influence?: string;
  }[];
  closeFriends?: {
    name: string;
    relationship: string;
    influence: string;
    recentInteraction: string;
  }[];
  financialStatus: string;
  financialDetails?: {
    recentExpenses: {
      item: string;
      amount: string;
      date: string;
      purpose: string;
    }[];
    recentInvestments: {
      investment: string;
      amount: string;
      date: string;
      expectedReturn: string;
    }[];
    cashFlow: string;
    debtSituation: string;
  };
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

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Header
      "online_users": "ONLINE USERS",
      "users_watching": "users watching now",
      
      // Stats
      "highest_win_rate": "HIGHEST WIN RATE",
      "lowest_win_rate": "LOWEST WIN RATE",
      "correct_predictions": "correct predictions",
      
      // Performance Chart
      "performance_over_time": "PERFORMANCE OVER TIME",
      "win_rate": "Win Rate (%)",
      
      // Live Matches
      "upcoming_matches": "UPCOMING MATCHES",
      "live": "LIVE",
      
      // Tabs
      "leaderboard": "LEADERBOARD",
      "completed_trades": "COMPLETED TRADES",
      "model_chat": "MODEL CHAT",
      "positions": "POSITIONS",
      
      // Leaderboard
      "rank": "RANK",
      "model": "MODEL",
      "predictions": "PREDICTIONS",
      "correct": "CORRECT",
      "wrong": "WRONG",
      "performance": "PERFORMANCE",
      
      // Model Cards
      "the_contestants": "The Contestants",
      "view_details": "VIEW DETAILS",
      "total_predictions": "Total Predictions",
      
      // AI Chat
      "ai_assistant": "BOSSPORT ROBOT",
      "chat_welcome": "Hello! I'm a professional sports bot. You can ask me any questions, such as which platform is most reliable.",
      "chat_placeholder": "Which platform is most reliable? Ask me anything...",
      
      // Crypto Ticker
      "market_overview": "MARKET OVERVIEW",
      
      // Info Section
      "better_benchmark": "A Better Benchmark",
      "better_benchmark_text1": "BOOSPORT ARENA is the first benchmark designed to measure AI's sports prediction abilities. Each model is given $10,000 of real money, in real markets, with identical prompts and input data.",
      "better_benchmark_text2": "Our goal with BOOSPORT ARENA is to make benchmarks more like the real world, and markets are perfect for this. They're dynamic, adversarial, open-ended, and endlessly unpredictable. They challenge AI in ways that static benchmarks cannot.",
      "better_benchmark_text3": "Markets are the ultimate test of intelligence.",
      
      "owner_based_analysis": "Owner-Based Analysis",
      "owner_based_text1": "Unlike traditional sports prediction models that focus on player statistics, our AI models analyze team owners to predict match outcomes.",
      "owner_based_text2": "Each prediction considers:",
      "owner_consideration_1": "Owner's financial status and net worth",
      "owner_consideration_2": "Recent business activities and investments",
      "owner_consideration_3": "Health and personal circumstances",
      "owner_consideration_4": "Family dynamics and social activity",
      "owner_consideration_5": "News sentiment and media presence",
      "owner_based_text3": "So do we need to train models with new architectures for investing, or are LLMs good enough? Let's find out.",
      
      // Empty states
      "completed_trades_empty": "Prediction history and completed matches will appear here",
      "positions_empty": "Active predictions and positions will appear here",
      
      // Match Detail
      "match_not_found": "Match not found",
      "go_back": "Go Back",
      "owner": "Owner",
      "health_status": "Health Status",
      "financial_status": "Financial Status",
      "family_members": "Family Members",
      "social_status": "Social Status",
      "scandals_controversies": "Scandals & Controversies",
      "recent_activities": "Recent Activities",
      "exclusive_owner_analysis": "Exclusive Owner Analysis",
      "years_old": "years old",
      "years": "years",
      "back_to_matches": "Back to Matches",
      "at": "at",
      "vs": "vs",
      "owner_analysis_warning": "⚠️ Focus on team owner analysis, dominate the game",
      "match_outcome_analysis": "Match Outcome Analysis",
      "match_outcome_text": "Based on the comprehensive analysis of both team owners' financial situations, health status, family dynamics, recent scandals, and social activities, our AI models will evaluate which owner's current circumstances may indirectly influence the team's performance. This unique approach considers factors that traditional sports analytics overlook.",
      "close_friends": "Close Friends & Associates",
      "relationship": "Relationship",
      "influence_level": "Influence Level",
      "recent_interaction": "Recent Interaction",
      "financial_details": "Detailed Financial Analysis",
      "recent_expenses": "Recent Major Expenses",
      "recent_investments": "Recent Investments",
      "expense_item": "Item",
      "amount": "Amount",
      "date": "Date",
      "purpose": "Purpose",
      "investment": "Investment",
      "expected_return": "Expected Return",
      "cash_flow": "Cash Flow Analysis",
      "debt_situation": "Debt Situation",
      "occupation": "Occupation",
      "member_net_worth": "Net Worth",
      "member_influence": "Influence on Owner",
      "ai_analyses": "AI Model Analyses",
      "analyze_with_ai": "Analyze with AI",
      "analyzing": "Analyzing...",
      "analysis_error": "Failed to generate analysis. Please try again.",
      "ai_predictions_intro": "Five AI models have analyzed both team owners and predicted the match outcome:",
      "draw": "Draw",
      "win": "Win",
      "confidence": "Confidence",
      "half_time": "Half Time",
      "betting_odds_handicap": "Betting Odds - Handicap",
      "bookmaker": "Bookmaker",
      "home_win": "Home",
      "away_win": "Away",
      "home_handicap": "Home Handicap",
      "away_handicap": "Away Handicap",
      "no_active_predictions": "No active predictions at the moment",
      "upcoming_match": "Upcoming",
      "prediction_summary": "Prediction Summary",
      "click_analyze_to_see_predictions": "Click the 'Analyze with AI' buttons above to generate match predictions from 5 different AI models."
    }
  },
  zh: {
    translation: {
      // Header
      "online_users": "在线用户",
      "users_watching": "位用户正在观看",
      
      // Stats
      "highest_win_rate": "最高胜率",
      "lowest_win_rate": "最低胜率",
      "correct_predictions": "次正确预测",
      
      // Performance Chart
      "performance_over_time": "历史表现",
      "win_rate": "胜率 (%)",
      
      // Live Matches
      "upcoming_matches": "即将开始的比赛",
      "live": "直播中",
      
      // Tabs
      "leaderboard": "排行榜",
      "completed_trades": "已完成交易",
      "model_chat": "模型对话",
      "positions": "持仓",
      
      // Leaderboard
      "rank": "排名",
      "model": "模型",
      "predictions": "预测",
      "correct": "正确",
      "wrong": "错误",
      "performance": "表现",
      
      // Model Cards
      "the_contestants": "参赛选手",
      "view_details": "查看详情",
      "total_predictions": "总预测次数",
      
      // AI Chat
      "ai_assistant": "BOSSPORT ROBOT",
      "chat_welcome": "你好，我是专业的体育机器人，你可以咨询我所有问题，例如哪个平台最靠谱",
      "chat_placeholder": "哪个平台最靠谱？问我任何问题...",
      
      // Crypto Ticker
      "market_overview": "市场概览",
      
      // Info Section
      "better_benchmark": "更好的基准测试",
      "better_benchmark_text1": "BOOSPORT ARENA 是第一个旨在衡量 AI 体育预测能力的基准测试。每个模型都获得 10,000 美元的真实资金，在真实市场中，使用相同的提示和输入数据。",
      "better_benchmark_text2": "我们的目标是让基准测试更接近真实世界，而市场正是完美的选择。它们是动态的、对抗性的、开放式的，并且无限不可预测。它们以静态基准测试无法做到的方式挑战 AI。",
      "better_benchmark_text3": "市场是智能的终极考验。",
      
      "owner_based_analysis": "基于老板的分析",
      "owner_based_text1": "与传统的关注球员统计数据的体育预测模型不同，我们的 AI 模型通过分析球队老板来预测比赛结果。",
      "owner_based_text2": "每次预测都会考虑：",
      "owner_consideration_1": "老板的财务状况和净资产",
      "owner_consideration_2": "近期商业活动和投资",
      "owner_consideration_3": "健康状况和个人情况",
      "owner_consideration_4": "家庭动态和社交活动",
      "owner_consideration_5": "新闻情绪和媒体曝光度",
      "owner_based_text3": "那么我们需要为投资训练具有新架构的模型，还是 LLM 已经足够好了？让我们拭目以待。",
      
      // Empty states
      "completed_trades_empty": "预测历史和已完成的比赛将显示在这里",
      "positions_empty": "活跃的预测和持仓将显示在这里",
      
      // Match Detail
      "match_not_found": "未找到比赛",
      "go_back": "返回",
      "owner": "老板",
      "health_status": "健康状况",
      "financial_status": "财务状况",
      "family_members": "家庭成员",
      "social_status": "社会地位",
      "scandals_controversies": "丑闻与争议",
      "recent_activities": "近期活动",
      "exclusive_owner_analysis": "独家老板分析",
      "years_old": "岁",
      "years": "岁",
      "back_to_matches": "返回比赛",
      "at": "于",
      "vs": "对阵",
      "owner_analysis_warning": "⚠️ 专注球赛老板分析，主宰比赛",
      "match_outcome_analysis": "比赛结果分析",
      "match_outcome_text": "基于对两队老板财务状况、健康状况、家庭动态、近期丑闻和社交活动的综合分析，我们的 AI 模型将评估哪位老板的当前情况可能间接影响球队表现。这种独特的方法考虑了传统体育分析所忽视的因素。",
      "close_friends": "亲密好友与伙伴",
      "relationship": "关系",
      "influence_level": "影响力水平",
      "recent_interaction": "最近互动",
      "financial_details": "详细财务分析",
      "recent_expenses": "近期重大支出",
      "recent_investments": "近期投资",
      "expense_item": "项目",
      "amount": "金额",
      "date": "日期",
      "purpose": "用途",
      "investment": "投资",
      "expected_return": "预期回报",
      "cash_flow": "现金流分析",
      "debt_situation": "债务情况",
      "occupation": "职业",
      "member_net_worth": "净资产",
      "member_influence": "对老板的影响",
      "ai_analyses": "AI 模型分析",
      "analyze_with_ai": "AI 分析",
      "analyzing": "分析中...",
      "analysis_error": "分析失败，请重试。",
      "ai_predictions_intro": "五个AI模型分析了双方老板情况并预测了比赛结果：",
      "draw": "平局",
      "win": "获胜",
      "confidence": "置信度",
      "half_time": "半场",
      "betting_odds_handicap": "博彩赔率 - 让球盘",
      "bookmaker": "博彩公司",
      "home_win": "主胜",
      "away_win": "客胜",
      "home_handicap": "主队让球",
      "away_handicap": "客队让球",
      "no_active_predictions": "当前没有活跃的预测",
      "upcoming_match": "即将开始",
      "prediction_summary": "预测汇总",
      "click_analyze_to_see_predictions": "点击上方的\"AI 分析\"按钮，让5个不同的AI模型生成比赛预测。"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

// 专属模型配置
const PERSONALIZED_MODEL_CONFIG = {
  id: "hunsoccermax",
  displayName: "HUNSOCCER MAX",
  model: "qwen/qwen3-235b-a22b-2507",
};

interface MatchInfo {
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
}

interface MarketOdds {
  overUnder?: Array<{ line: number; over: number; under: number }>;
  handicap?: Array<{ line: number; home: number; away: number }>;
}

// 获取用户的训练数据
const getUserTrainingData = async (userId: string, limit: number = 10): Promise<string[]> => {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('ai_training_history' as any)
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[getUserTrainingData] Error:', error);
      return [];
    }
    
    return (data || []).map((item: any) => item.content);
  } catch (error) {
    console.error('[getUserTrainingData] Unexpected error:', error);
    return [];
  }
};

// 构建系统提示词（带用户训练数据）
const buildSystemPrompt = (userTrainingData?: string[]) => {
  let prompt = `你是一位专业的足球赛事分析专家。请从以下三个维度进行深度分析：

1. **球队老板层面分析**：分析球队投资、战略布局、近期管理层动态
2. **球员技术面拆解**：分析关键球员状态、战术体系、阵容配置
3. **异常赔率监测**：分析赔率波动、市场热度、投注趋势

最后给出综合判断和投注建议。请用专业、简洁的语言，重点突出关键信息。`;

  // 如果有用户训练数据，注入到系统提示词中
  if (userTrainingData && userTrainingData.length > 0) {
    prompt += `\n\n**重要：您的专属分析偏好与知识库**\n`;
    prompt += `以下是从您之前的训练数据中提取的关键观点和分析偏好，请在分析时重点参考这些内容：\n\n`;
    userTrainingData.forEach((data, index) => {
      prompt += `${index + 1}. ${data}\n`;
    });
    prompt += `\n请结合以上您的专属知识，给出更符合您分析风格的预测。这些是您的个人见解，请将它们融入到分析中，让预测更个性化。`;
  }

  return prompt;
};

// 构建用户提示词
const buildUserPrompt = (matchInfo: MatchInfo, marketOdds?: MarketOdds) => {
  const basePrompt = `请分析以下比赛：

**比赛信息**
- 联赛：${matchInfo.league}
- 主队：${matchInfo.homeTeam}
- 客队：${matchInfo.awayTeam}
- 当前比分：${matchInfo.homeScore ?? 0} - ${matchInfo.awayScore ?? 0}
- 比赛状态：${matchInfo.status === "live" ? "进行中" : "即将开始"}`;

  let oddsInfo = '';
  if (marketOdds) {
    oddsInfo = '\n\n**市场赔率信息**\n';
    
    if (marketOdds.overUnder && marketOdds.overUnder.length > 0) {
      oddsInfo += '\n大小球赔率：\n';
      marketOdds.overUnder.forEach(ou => {
        oddsInfo += `- ${ou.line}球：大球 ${ou.over.toFixed(2)} | 小球 ${ou.under.toFixed(2)}\n`;
      });
    }
    
    if (marketOdds.handicap && marketOdds.handicap.length > 0) {
      oddsInfo += '\n让球盘赔率：\n';
      marketOdds.handicap.forEach(h => {
        const lineStr = h.line > 0 ? `+${h.line}` : h.line.toString();
        oddsInfo += `- ${lineStr}：主队 ${h.home.toFixed(2)} | 客队 ${h.away.toFixed(2)}\n`;
      });
    }
  }

  return `${basePrompt}${oddsInfo}

请从老板层面、技术层面、赔率层面进行全面分析，并给出最终投注建议。

IMPORTANT: 在分析的最后，请提供你的预测，格式如下（必须同时提供输赢、大小球和让球盘预测）：

1. 输赢预测：
PREDICTION_MONEYLINE: [HOME_WIN/AWAY_WIN/DRAW] [confidence 0-100]

2. 大小球预测：
PREDICTION_OVER_UNDER: [OVER/UNDER] [line 2.5/3.0/3.5等] [confidence 0-100]
注意：请从上面提供的市场赔率中选择合适的 line 值，确保该 line 在市场赔率中存在。

3. 让球盘预测：
PREDICTION_HANDICAP: [HOME/AWAY] [line -1.5/-0.5/0.5/1.5等] [confidence 0-100]
注意：请从上面提供的市场赔率中选择合适的 line 值，确保该 line 在市场赔率中存在。

例如：
PREDICTION_MONEYLINE: HOME_WIN 75
PREDICTION_OVER_UNDER: OVER 2.5 68
PREDICTION_HANDICAP: HOME 0.5 72

注意：
- 如果对某个投注类型没有信心（置信度低于50），可以不提供该预测
- 输赢预测：HOME_WIN 表示主队获胜，AWAY_WIN 表示客队获胜，DRAW 表示平局
- 大小球的 line 值必须从上面提供的市场赔率中选择
- 让球盘的 line 值必须从上面提供的市场赔率中选择
- HOME 表示主队让球，AWAY 表示客队让球`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 获取用户认证信息
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "未授权，请先登录" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 验证用户
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase?.auth.getUser(token) || { data: { user: null }, error: null };
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "用户认证失败" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY 未配置" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { matchInfo, marketOdds, matchId } = await req.json();

    if (!matchInfo) {
      return new Response(
        JSON.stringify({ error: "缺少比赛信息" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 获取用户的训练数据
    const userTrainingData = await getUserTrainingData(user.id, 10);

    // 构建提示词
    const systemPrompt = buildSystemPrompt(userTrainingData.length > 0 ? userTrainingData : undefined);
    const userPrompt = buildUserPrompt(matchInfo, marketOdds);

    // 调用 OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://owner-playbook.ai",
        "X-Title": "Owner Playbook AI",
      },
      body: JSON.stringify({
        model: PERSONALIZED_MODEL_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-match-personalized] OpenRouter error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI分析服务暂时不可用" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: "AI未能生成分析结果" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        model: PERSONALIZED_MODEL_CONFIG,
        hasTrainingData: userTrainingData.length > 0,
        trainingDataCount: userTrainingData.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[analyze-match-personalized] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "服务器内部错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


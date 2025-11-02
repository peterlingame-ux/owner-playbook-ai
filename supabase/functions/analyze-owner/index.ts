import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const AI_MODELS = [
  {
    id: 'deepseek',
    name: 'DeepSeek Chat V3.1',
    model: 'google/gemini-2.5-flash',
    prompt: 'You are DeepSeek AI, known for deep analysis and pattern recognition. Analyze this team owner with a focus on data-driven insights and statistical patterns.'
  },
  {
    id: 'gpt5',
    name: 'GPT 5',
    model: 'openai/gpt-5-mini',
    prompt: 'You are GPT-5, known for comprehensive reasoning and strategic thinking. Analyze this team owner with a focus on strategic implications and business acumen.'
  },
  {
    id: 'claude',
    name: 'Claude 4.5 Sonnet',
    model: 'google/gemini-2.5-flash',
    prompt: 'You are Claude AI, known for nuanced analysis and ethical considerations. Analyze this team owner with a focus on interpersonal dynamics and leadership qualities.'
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Pro',
    model: 'google/gemini-2.5-pro',
    prompt: 'You are Gemini AI, known for holistic analysis and creative insights. Analyze this team owner with a focus on innovative perspectives and unconventional angles.'
  },
  {
    id: 'grok',
    name: 'Grok 4',
    model: 'google/gemini-2.5-flash',
    prompt: 'You are Grok AI, known for bold predictions and risk assessment. Analyze this team owner with a focus on potential risks and opportunities.'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ownerData } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build comprehensive context from owner data
    const context = `
Team Owner Analysis Request:

Name: ${ownerData.name}
Age: ${ownerData.age}
Net Worth: ${ownerData.netWorth}

Health Status: ${ownerData.healthStatus}

Family Status: ${ownerData.familyStatus}
Family Members:
${ownerData.familyMembers.map((m: any) => 
  `- ${m.name} (${m.relation}, ${m.age} years old)${m.occupation ? ', ' + m.occupation : ''}${m.netWorth ? ', Net Worth: ' + m.netWorth : ''}${m.influence ? ', Influence: ' + m.influence : ''}`
).join('\n')}

Close Friends & Associates:
${ownerData.closeFriends?.map((f: any) => 
  `- ${f.name}: ${f.relationship}, Influence: ${f.influence}, Recent: ${f.recentInteraction}`
).join('\n') || 'None listed'}

Financial Status: ${ownerData.financialStatus}

${ownerData.financialDetails ? `
Recent Major Expenses:
${ownerData.financialDetails.recentExpenses.map((e: any) => 
  `- ${e.item}: ${e.amount} (${e.date}) - ${e.purpose}`
).join('\n')}

Recent Investments:
${ownerData.financialDetails.recentInvestments.map((i: any) => 
  `- ${i.investment}: ${i.amount} (${i.date}) - Expected: ${i.expectedReturn}`
).join('\n')}

Cash Flow: ${ownerData.financialDetails.cashFlow}
Debt Situation: ${ownerData.financialDetails.debtSituation}
` : ''}

Social Status: ${ownerData.socialStatus}

Recent Activities:
${ownerData.recentActivities.map((a: any) => `- ${a}`).join('\n')}

${ownerData.scandals?.length > 0 ? `
Scandals & Controversies:
${ownerData.scandals.map((s: any) => `- ${s}`).join('\n')}
` : ''}

Task: Provide a 3-4 paragraph analysis of this team owner's current situation and how it might impact their team's performance. Focus on your unique analytical perspective and be specific about patterns, risks, or opportunities you identify. Keep your analysis under 300 words.

IMPORTANT: At the end of your analysis, you MUST provide a match outcome prediction in this exact format on a new line:
PREDICTION: [home_win/away_win/draw] [probability as integer 0-100]

For example:
PREDICTION: home_win 65
or
PREDICTION: draw 45
or
PREDICTION: away_win 70
`;

    // Call all AI models in parallel
    const analyses = await Promise.all(
      AI_MODELS.map(async (aiModel) => {
        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiModel.model,
              messages: [
                { role: 'system', content: aiModel.prompt },
                { role: 'user', content: context }
              ],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error from ${aiModel.name}:`, response.status, errorText);
            return {
              id: aiModel.id,
              name: aiModel.name,
              analysis: `Analysis temporarily unavailable. Please try again later.`,
              prediction: null,
              error: true
            };
          }

          const data = await response.json();
          const fullAnalysis = data.choices[0].message.content;
          
          // Extract prediction from analysis
          const predictionMatch = fullAnalysis.match(/PREDICTION:\s*(home_win|away_win|draw)\s*(\d+)/i);
          let prediction = null;
          let analysisText = fullAnalysis;
          
          if (predictionMatch) {
            prediction = {
              outcome: predictionMatch[1].toLowerCase(),
              probability: parseInt(predictionMatch[2])
            };
            // Remove prediction line from analysis text
            analysisText = fullAnalysis.replace(/PREDICTION:.*$/im, '').trim();
          }
          
          return {
            id: aiModel.id,
            name: aiModel.name,
            analysis: analysisText,
            prediction: prediction,
            error: false
          };
        } catch (error) {
          console.error(`Error calling ${aiModel.name}:`, error);
          return {
            id: aiModel.id,
            name: aiModel.name,
            analysis: `Analysis temporarily unavailable due to an error.`,
            prediction: null,
            error: true
          };
        }
      })
    );

    return new Response(
      JSON.stringify({ analyses }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in analyze-owner function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

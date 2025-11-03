import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const ownerSchema = z.object({
  name: z.string().max(200),
  age: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
  netWorth: z.string().max(100),
  healthStatus: z.string().max(500),
  familyStatus: z.string().max(500),
  familyMembers: z.array(z.object({
    name: z.string().max(100),
    relation: z.string().max(50),
    age: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
    occupation: z.string().max(200).optional(),
    netWorth: z.string().max(100).optional(),
    influence: z.string().max(500).optional()
  })).max(20),
  closeFriends: z.array(z.object({
    name: z.string().max(100),
    relationship: z.string().max(200),
    influence: z.string().max(200),
    recentInteraction: z.string().max(500)
  })).max(20).optional(),
  scandals: z.array(z.string().max(500)).max(50).optional(),
  recentActivities: z.array(z.string().max(500)).max(50),
  financialStatus: z.string().max(1000),
  financialDetails: z.object({
    recentExpenses: z.array(z.object({
      item: z.string().max(200),
      amount: z.string().max(100),
      date: z.string().max(50),
      purpose: z.string().max(300)
    })).max(50),
    recentInvestments: z.array(z.object({
      investment: z.string().max(200),
      amount: z.string().max(100),
      date: z.string().max(50),
      expectedReturn: z.string().max(200)
    })).max(50),
    cashFlow: z.string().max(500),
    debtSituation: z.string().max(500)
  }).optional(),
  socialStatus: z.string().max(1000)
});

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
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { ownerData } = requestBody;

    // Validate input data
    let validatedData;
    try {
      validatedData = ownerSchema.parse(ownerData);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
          details: validationError instanceof z.ZodError ? validationError.errors : 'Invalid data format'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build comprehensive context from validated data
    const context = `
Team Owner Analysis Request:

Name: ${validatedData.name}
Age: ${validatedData.age}
Net Worth: ${validatedData.netWorth}

Health Status: ${validatedData.healthStatus}

Family Status: ${validatedData.familyStatus}
Family Members:
${validatedData.familyMembers.map((m) => 
  `- ${m.name} (${m.relation}, ${m.age} years old)${m.occupation ? ', ' + m.occupation : ''}${m.netWorth ? ', Net Worth: ' + m.netWorth : ''}${m.influence ? ', Influence: ' + m.influence : ''}`
).join('\n')}

Close Friends & Associates:
${validatedData.closeFriends?.map((f) => 
  `- ${f.name}: ${f.relationship}, Influence: ${f.influence}, Recent: ${f.recentInteraction}`
).join('\n') || 'None listed'}

Financial Status: ${validatedData.financialStatus}

${validatedData.financialDetails ? `
Recent Major Expenses:
${validatedData.financialDetails.recentExpenses.map((e) => 
  `- ${e.item}: ${e.amount} (${e.date}) - ${e.purpose}`
).join('\n')}

Recent Investments:
${validatedData.financialDetails.recentInvestments.map((i) => 
  `- ${i.investment}: ${i.amount} (${i.date}) - Expected: ${i.expectedReturn}`
).join('\n')}

Cash Flow: ${validatedData.financialDetails.cashFlow}
Debt Situation: ${validatedData.financialDetails.debtSituation}
` : ''}

Social Status: ${validatedData.socialStatus}

Recent Activities:
${validatedData.recentActivities.map((a) => `- ${a}`).join('\n')}

${validatedData.scandals?.length ? `
Scandals & Controversies:
${validatedData.scandals.map((s) => `- ${s}`).join('\n')}
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

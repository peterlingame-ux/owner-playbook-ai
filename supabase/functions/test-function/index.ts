import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[test-function] SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置",
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

/**
 * 调用另一个 Edge Function
 * @param functionName 要调用的函数名称，例如 "match-analysis" 或 "fetch-daily-matches"
 * @param payload 请求体数据
 * @returns 响应结果
 */
async function callEdgeFunction(
  functionName: string,
  payload?: any,
): Promise<{ success: boolean; data?: any; error?: string; status?: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      success: false,
      error: "SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置",
    };
  }

  const functionUrl = `${SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    console.log(`[test-function] 调用函数: ${functionName}`);
    console.log(`[test-function] URL: ${functionUrl}`);
    console.log(`[test-function] Payload: ${JSON.stringify(payload || {})}`);

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const status = response.status;
    let data: any;

    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.warn(`[test-function] 响应解析失败:`, parseError);
      data = { raw: await response.text() };
    }

    if (!response.ok) {
      console.error(
        `[test-function] 函数调用失败: ${functionName}, 状态码: ${status}`,
        data,
      );
      return {
        success: false,
        error: data?.error || data?.message || `HTTP ${status}`,
        status,
        data,
      };
    }

    console.log(`[test-function] 函数调用成功: ${functionName}`);
    return {
      success: true,
      data,
      status,
    };
  } catch (error) {
    console.error(`[test-function] 调用函数时发生错误:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

serve(async (req) => {
  console.log(`[test-function] ========== 测试函数被调用 ==========`);
  console.log(`[test-function] 请求方法: ${req.method}`);
  console.log(`[test-function] 请求URL: ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 解析请求体
    let requestBody: {
      functionName?: string;
      payload?: any;
      testType?: "settle-sim-positions" | "settle-user-bets" | "both" | "all";
      matchIds?: number[]; // 用于 settle-sim-positions
    } = {};

    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.warn("[test-function] 无法解析 JSON，使用默认配置");
      requestBody = {};
    }

    const { functionName, payload, testType = "both", matchIds } = requestBody;

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // 根据 testType 调用不同的函数
    if (testType === "settle-sim-positions" || testType === "both" || testType === "all") {
      const targetFunction = functionName || "settle-sim-positions";
      console.log(`[test-function] 测试 ${targetFunction}...`);
      
      const settlePayload = payload || {
        autoSettle: true,
        ...(matchIds && matchIds.length > 0 ? { matchIds } : {}),
      };
      
      const settleSimResult = await callEdgeFunction(
        targetFunction,
        settlePayload,
      );
      
      results.tests["settle-sim-positions"] = {
        functionName: targetFunction,
        ...settleSimResult,
      };
    }

    if (testType === "settle-user-bets" || testType === "both" || testType === "all") {
      const targetFunction = functionName || "settle-user-bets";
      console.log(`[test-function] 测试 ${targetFunction}...`);
      
      const settleUserPayload = payload || {};
      
      const settleUserResult = await callEdgeFunction(
        targetFunction,
        settleUserPayload,
      );
      
      results.tests["settle-user-bets"] = {
        functionName: targetFunction,
        ...settleUserResult,
      };
    }

    // 如果只指定了 functionName，只测试那个函数
    if (functionName && (testType === "settle-sim-positions" || testType === "settle-user-bets")) {
      const result = await callEdgeFunction(functionName, payload);
      results.tests[functionName] = result;
    }

    // 返回测试结果
    const allSuccess = Object.values(results.tests).every(
      (test: any) => test.success === true,
    );

    return new Response(
      JSON.stringify({
        success: allSuccess,
        message: allSuccess
          ? "所有测试通过"
          : "部分测试失败，请查看详细信息",
        ...results,
      }),
      {
        status: allSuccess ? 200 : 207, // 207 Multi-Status 表示部分成功
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[test-function] 处理请求时发生错误:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

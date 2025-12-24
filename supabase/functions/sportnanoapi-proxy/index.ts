import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPORTNANOAPI_BASE_URL = "https://open.sportnanoapi.com/api/v5";
const SPORTNANOAPI_USER = "nacctsaw";
const SPORTNANOAPI_SECRET = "f0b904438d488e4c3d686b36f69339a6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : undefined;

const CACHE_TABLE = "sportnanoapi_cache";

// 不同 API 端点的缓存时间（秒）
const CACHE_TTL = {
  "match/detail": 60, // 比赛详情：60秒
  "match/live": 2, // 实时数据：2秒
  "odds/live": 3, // 实时指数：3秒
  "match/trend/live": 30, // 实时趋势：30秒
  "match/trend/detail": 300, // 趋势详情：5分钟（历史数据不会变化）
  "match/lineup/detail": 300, // 阵容详情：5分钟（阵容通常不会变化）
};

// 生成缓存键
function getCacheKey(endpoint: string, params: Record<string, string>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join("&");
  return `${endpoint}:${sortedParams}`;
}

// 从缓存获取数据
async function getFromCache(cacheKey: string): Promise<any | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(CACHE_TABLE)
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) return null;

    // 检查是否过期
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // 删除过期缓存
      await supabase.from(CACHE_TABLE).delete().eq("cache_key", cacheKey);
      return null;
    }

    return data.response;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

// 保存到缓存
async function saveToCache(cacheKey: string, response: any, ttl: number): Promise<void> {
  if (!supabase) return;

  try {
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await supabase
      .from(CACHE_TABLE)
      .upsert({
        cache_key: cacheKey,
        response: response,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "cache_key",
      });
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

// 调用 sportnanoapi
async function callSportnanoapi(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${SPORTNANOAPI_BASE_URL}/${endpoint}`);
  
  // 添加认证参数
  url.searchParams.set("user", SPORTNANOAPI_USER);
  url.searchParams.set("secret", SPORTNANOAPI_SECRET);
  
  // 添加其他参数
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // 解析端点路径：/sportnanoapi-proxy/match/detail?id=123
    const endpointMatch = pathname.match(/\/sportnanoapi-proxy\/(.+)/);
    if (!endpointMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = endpointMatch[1];
    const searchParams = url.searchParams;

    // 构建参数对象
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== "user" && key !== "secret") {
        params[key] = value;
      }
    });

    // 生成缓存键
    const cacheKey = getCacheKey(endpoint, params);

    // 获取缓存 TTL
    const ttl = CACHE_TTL[endpoint as keyof typeof CACHE_TTL] || 60;

    // 尝试从缓存获取
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      console.log(`Cache hit: ${cacheKey}`);
      return new Response(
        JSON.stringify(cachedData),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" } }
      );
    }

    // 缓存未命中，调用 API
    console.log(`Cache miss: ${cacheKey}, calling API`);
    const apiResponse = await callSportnanoapi(endpoint, params);

    // 保存到缓存
    await saveToCache(cacheKey, apiResponse, ttl);

    return new Response(
      JSON.stringify(apiResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" } }
    );
  } catch (error) {
    console.error("Error in sportnanoapi-proxy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

